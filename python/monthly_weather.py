"""Offline ERA5 monthly-weather training, chronological evaluation and release artifact.

Run with --as-of YYYY-MM-DD --download to refresh through the last complete month.
No model is fitted by an application page request. See docs/monthly-weather.md.
"""
import argparse
import calendar
import csv
import hashlib
import json
import math
import os
from pathlib import Path
from datetime import date, datetime, timedelta, timezone
from urllib.parse import urlencode
from urllib.request import urlopen
import warnings

os.environ.setdefault('OPENBLAS_NUM_THREADS', '1')
os.environ.setdefault('OMP_NUM_THREADS', '1')
import numpy as np
import pandas as pd
import statsmodels
from statsmodels.tsa.statespace.sarimax import SARIMAX

ROOT = Path(__file__).resolve().parents[1]
TARGETS = {'temperature_mean_c': 'temperature_2m_mean', 'rainfall_total_mm': 'rain_sum'}
CANDIDATES = [((1, 0, 0), (1, 1, 0, 12)), ((1, 0, 0), (0, 1, 1, 12)),
              ((1, 0, 1), (1, 1, 0, 12)), ((1, 0, 1), (0, 1, 1, 12))]
HORIZON = 3


def write_json(path, value):
    path.parent.mkdir(parents=True, exist_ok=True)
    temporary = path.with_suffix(path.suffix + '.tmp')
    temporary.write_text(json.dumps(value, indent=2, allow_nan=False) + '\n', encoding='utf-8')
    temporary.replace(path)


def write_csv(path, rows):
    path.parent.mkdir(parents=True, exist_ok=True)
    with path.open('w', newline='', encoding='utf-8') as stream:
        writer = csv.DictWriter(stream, fieldnames=list(rows[0]))
        writer.writeheader()
        writer.writerows(rows)


def aggregate(raw, end):
    """Reject incomplete days/months; a missing rainfall value is never a zero."""
    daily = raw['daily']
    dates = pd.date_range('2000-01-01', end, freq='D')
    if raw['timezone'] != 'Asia/Manila' or daily['time'] != dates.strftime('%Y-%m-%d').tolist():
        raise ValueError('Date coverage or timezone mismatch')
    if raw['daily_units']['temperature_2m_mean'] != '°C' or raw['daily_units']['rain_sum'] != 'mm':
        raise ValueError('Unexpected units')
    for field in TARGETS.values():
        values = daily[field]
        if len(values) != len(dates) or any(not isinstance(x, (int, float)) or not math.isfinite(x) for x in values):
            raise ValueError(f'Missing/invalid values: {field}')
    if min(daily['rain_sum']) < 0:
        raise ValueError('Negative rainfall')
    frame = pd.DataFrame({key: daily[field] for key, field in TARGETS.items()}, index=dates)
    monthly = frame.resample('MS').agg({'temperature_mean_c': 'mean', 'rainfall_total_mm': 'sum'})
    for timestamp, count in frame.resample('MS').size().items():
        if count != calendar.monthrange(timestamp.year, timestamp.month)[1]:
            raise ValueError('Incomplete month')
    return monthly


def fit_model(train, specification):
    with warnings.catch_warnings():
        warnings.simplefilter('ignore')
        fitted = SARIMAX(train, order=specification[0], seasonal_order=specification[1], trend='n',
                         enforce_stationarity=True, enforce_invertibility=True).fit(disp=False, maxiter=150)
    if not fitted.mle_retvals.get('converged', False) or not np.isfinite(fitted.params).all():
        raise ValueError('SARIMA did not converge')
    return fitted


def predictions(train, specification, rainfall=False):
    fitted = fit_model(train, specification)
    forecast = fitted.get_forecast(HORIZON)
    values = np.asarray(forecast.predicted_mean, dtype=float)
    intervals = np.asarray(forecast.conf_int(alpha=0.2), dtype=float)
    if rainfall:
        values = np.maximum(0, values)
        intervals = np.maximum(0, intervals)
    if not np.isfinite(values).all() or not np.isfinite(intervals).all():
        raise ValueError('Non-finite forecast')
    return fitted, values, intervals


def benchmarks(train, months):
    return {
        'seasonal_naive': [float(train.loc[month - pd.DateOffset(years=1)]) for month in months],
        'monthly_average': [float(train[train.index.month == month.month].mean()) for month in months],
    }


def evaluate(series, specification, start, end, rainfall=False):
    """Quarterly origins, 1–3-month forecasts; only observations before origin enter each fit."""
    rows = []
    for origin in pd.date_range(start, end, freq='3MS'):
        train = series[series.index < origin]
        months = pd.date_range(origin, periods=HORIZON, freq='MS')
        _, values, intervals = predictions(train, specification, rainfall)
        methods = {'sarima': values, **benchmarks(train, months)}
        for method, estimates in methods.items():
            for index, month in enumerate(months):
                if month > pd.Timestamp(end):
                    continue
                rows.append({'origin': origin.strftime('%Y-%m'), 'month': month.strftime('%Y-%m'),
                             'horizon': index + 1, 'method': method, 'actual': float(series.loc[month]),
                             'prediction': float(estimates[index]),
                             'lower_80': float(intervals[index, 0]) if method == 'sarima' else None,
                             'upper_80': float(intervals[index, 1]) if method == 'sarima' else None})
    return rows


def metrics(rows, rainfall=False):
    actual = np.array([row['actual'] for row in rows])
    predicted = np.array([row['prediction'] for row in rows])
    errors = predicted - actual
    eligible = actual >= 1 if rainfall else np.zeros(len(actual), dtype=bool)
    intervals = all(row['lower_80'] is not None for row in rows)
    return {'n': len(rows), 'mae': float(np.abs(errors).mean()), 'rmse': float(np.sqrt(np.mean(errors ** 2))),
            'bias': float(errors.mean()),
            'mape': float(np.mean(np.abs(errors[eligible] / actual[eligible])) * 100) if eligible.any() else None,
            'mape_n': int(eligible.sum()),
            'interval_80_coverage': float(np.mean([row['lower_80'] <= row['actual'] <= row['upper_80'] for row in rows])) if intervals else None}


def run(args):
    last_day = args.as_of.replace(day=1) - timedelta(days=1)
    raw_path = args.raw_dir / f'pasig_era5_daily_2000_{last_day:%Y%m}.json'
    query = {'latitude': 14.5764, 'longitude': 121.0851, 'start_date': '2000-01-01', 'end_date': last_day.isoformat(),
             'daily': ','.join(TARGETS.values()), 'timezone': 'Asia/Manila', 'models': 'era5'}
    url = 'https://archive-api.open-meteo.com/v1/archive?' + urlencode(query)
    if args.download:
        with urlopen(url, timeout=60) as response:
            payload = response.read()
        json.loads(payload)
        raw_path.parent.mkdir(parents=True, exist_ok=True)
        raw_path.write_bytes(payload)
    raw = json.loads(raw_path.read_text(encoding='utf-8'))
    monthly = aggregate(raw, last_day)
    artifacts = args.artifact_dir
    write_csv(artifacts / 'monthly-history.csv', [dict(month=stamp.strftime('%Y-%m'), **row.to_dict()) for stamp, row in monthly.iterrows()])
    metadata = {'provider': 'Open-Meteo / ECMWF ERA5', 'type': 'historical_reanalysis', 'source_url': url,
                'documentation_url': 'https://open-meteo.com/en/docs/historical-weather-api',
                'requested_location': 'Pasig City', 'requested_latitude': 14.5764, 'requested_longitude': 121.0851,
                'grid_latitude': raw['latitude'], 'grid_longitude': raw['longitude'], 'resolution_degrees': 0.25,
                'timezone': 'Asia/Manila', 'history_start': '2000-01', 'history_end': last_day.strftime('%Y-%m'),
                'daily_records': len(raw['daily']['time']), 'complete_months': len(monthly),
                'raw_sha256': hashlib.sha256(raw_path.read_bytes()).hexdigest(),
                'monthly_csv_sha256': hashlib.sha256((artifacts / 'monthly-history.csv').read_bytes()).hexdigest(),
                'as_of': args.as_of.isoformat(), 'created_at_utc': datetime.now(timezone.utc).isoformat(),
                'software': {'numpy': np.__version__, 'pandas': pd.__version__, 'statsmodels': statsmodels.__version__},
                'attribution': ['https://doi.org/10.5281/zenodo.7970649', 'https://doi.org/10.24381/cds.adbb2d47'],
                'limitations': 'Grid estimates, not independent Pasig station observations. Monthly values do not predict daily extremes or individual garden conditions.'}
    evaluation = {'schema_version': 1, 'source': metadata,
                  'protocol': {'initial_training': '2000-01 to 2021-12', 'validation': '2022-01 to 2023-12',
                               'test': '2024-01 to 2025-12', 'origins': 'Quarterly, expanding past-only training window',
                               'horizons': [1, 2, 3], 'selection': 'Lowest validation RMSE among fully converged SARIMA candidates',
                               'rainfall': 'Raw mm; negative point forecasts and interval bounds clipped at zero before scoring',
                               'mape': 'Temperature MAPE omitted; rainfall MAPE includes actual totals >=1 mm, with count reported',
                               'intervals': 'Conditional Gaussian 80% SARIMA intervals; empirical test coverage is reported. No calibrated range is published in the UI.'},
                  'targets': {}}
    all_test, all_validation, production = [], [], {}
    for target in TARGETS:
        rainfall = target == 'rainfall_total_mm'
        series = monthly[target]
        candidates = []
        for specification in CANDIDATES:
            print(f'Validation {target} {specification}', flush=True)
            try:
                rows = evaluate(series, specification, '2022-01-01', '2023-12-01', rainfall)
                score = metrics([row for row in rows if row['method'] == 'sarima'], rainfall)
                candidates.append({'order': specification[0], 'seasonal_order': specification[1], 'validation_rmse': score['rmse']})
                all_validation.extend([{'target': target, 'candidate': str(specification), **row} for row in rows])
            except (ValueError, np.linalg.LinAlgError) as error:
                candidates.append({'order': specification[0], 'seasonal_order': specification[1], 'error': str(error)})
        available = [candidate for candidate in candidates if 'validation_rmse' in candidate]
        if not available:
            raise ValueError(f'No fully converged candidate for {target}')
        selected = min(available, key=lambda candidate: candidate['validation_rmse'])
        specification = (selected['order'], selected['seasonal_order'])
        print(f'Test and final fit {target} {specification}', flush=True)
        test_rows = evaluate(series, specification, '2024-01-01', '2025-12-01', rainfall)
        all_test.extend([{'target': target, **row} for row in test_rows])
        scores = {method: metrics([row for row in test_rows if row['method'] == method], rainfall)
                  for method in ['sarima', 'seasonal_naive', 'monthly_average']}
        by_horizon = {str(h): {method: metrics([row for row in test_rows if row['method'] == method and row['horizon'] == h], rainfall)
                                  for method in scores} for h in [1, 2, 3]}
        fitted, values, _ = predictions(series, specification, rainfall)
        evaluation['targets'][target] = {'candidates': candidates, 'selected': selected, 'test': scores, 'test_by_horizon': by_horizon,
                                        'final_fit': {'through': last_day.strftime('%Y-%m'), 'order': specification[0],
                                                      'seasonal_order': specification[1], 'trend': 'n', 'converged': True,
                                                      'params': {str(key): float(value) for key, value in fitted.params.items()}}}
        production[target] = {'values': values, 'test': scores, 'order': specification[0], 'seasonal_order': specification[1]}
    write_csv(artifacts / 'validation-predictions.csv', all_validation)
    write_csv(artifacts / 'test-predictions.csv', all_test)
    write_json(artifacts / 'evaluation.json', evaluation)
    write_json(artifacts / 'source.json', metadata)
    future = pd.date_range(monthly.index[-1] + pd.DateOffset(months=1), periods=HORIZON, freq='MS')
    reference = monthly.loc[:'2021-12-01']
    forecast_rows = []
    for i, month in enumerate(future):
        forecast_rows.append({'month': month.strftime('%Y-%m'),
                              **{target: round(float(result['values'][i]), 2) for target, result in production.items()},
                              'reference_rainfall_mm': round(float(reference.loc[reference.index.month == month.month, 'rainfall_total_mm'].mean()), 2)})
    artifact = {'schema_version': 1, 'source': metadata, 'forecast_origin': monthly.index[-1].strftime('%Y-%m'),
                'reference_period': '2000–2021', 'method': 'SARIMA', 'forecast': forecast_rows,
                'evaluation': {target: {'order': result['order'], 'seasonal_order': result['seasonal_order'],
                                        'test': result['test']} for target, result in production.items()},
                'test_period': '2024–2025', 'intervals': None}
    write_json(args.output, artifact)
    print(json.dumps({'forecast': forecast_rows, 'test': artifact['evaluation']}, indent=2), flush=True)


if __name__ == '__main__':
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument('--as-of', type=date.fromisoformat, required=True)
    parser.add_argument('--download', action='store_true')
    parser.add_argument('--raw-dir', type=Path, default=ROOT / 'forecasting/data/raw')
    parser.add_argument('--artifact-dir', type=Path, default=ROOT / 'docs/weather-model')
    parser.add_argument('--output', type=Path, default=ROOT / 'storage/app/forecasting/monthly_weather_outlook.json')
    run(parser.parse_args())
