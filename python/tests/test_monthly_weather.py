import sys
import unittest
from pathlib import Path
from unittest.mock import patch
from datetime import date

import numpy as np
import pandas as pd

sys.path.insert(0, str(Path(__file__).resolve().parents[1]))
from monthly_weather import aggregate, benchmarks, evaluate, metrics


class MonthlyWeatherTests(unittest.TestCase):
    def daily(self):
        days = pd.date_range('2000-01-01', '2000-02-29', freq='D')
        return {'timezone': 'Asia/Manila', 'daily_units': {'temperature_2m_mean': '°C', 'rain_sum': 'mm'},
                'daily': {'time': days.strftime('%Y-%m-%d').tolist(),
                          'temperature_2m_mean': [20.] * 31 + [30.] * 29, 'rain_sum': [1.] * len(days)}}

    def test_aggregation_preserves_leap_month_and_zero_rain_without_imputing_missing_values(self):
        raw = self.daily()
        raw['daily']['rain_sum'][0] = 0
        result = aggregate(raw, date(2000, 2, 29))
        self.assertEqual(result['temperature_mean_c'].tolist(), [20, 30])
        self.assertEqual(result['rainfall_total_mm'].tolist(), [30, 29])
        raw['daily']['rain_sum'][0] = None
        with self.assertRaisesRegex(ValueError, 'Missing/invalid'):
            aggregate(raw, date(2000, 2, 29))

    def test_aggregation_rejects_duplicate_days_and_incomplete_months(self):
        raw = self.daily()
        raw['daily']['time'][1] = raw['daily']['time'][0]
        with self.assertRaisesRegex(ValueError, 'Date coverage'):
            aggregate(raw, date(2000, 2, 29))
        raw = self.daily()
        for field in raw['daily']:
            raw['daily'][field] = raw['daily'][field][:-1]
        with self.assertRaisesRegex(ValueError, 'Incomplete month'):
            aggregate(raw, date(2000, 2, 28))

    def test_backtest_only_fits_past_observations_and_holds_specification_fixed(self):
        series = pd.Series(np.arange(48.), index=pd.date_range('2021-01-01', periods=48, freq='MS'))
        fitted_through = []
        def fake_prediction(train, specification, rainfall):
            fitted_through.append(train.index[-1].strftime('%Y-%m'))
            self.assertEqual(specification, ((1, 0, 0), (0, 1, 1, 12)))
            return None, np.array([1., 2., 3.]), np.array([[0., 4.]] * 3)
        with patch('monthly_weather.predictions', side_effect=fake_prediction):
            result = evaluate(series, ((1, 0, 0), (0, 1, 1, 12)), '2024-01-01', '2024-12-01')
        self.assertEqual(fitted_through, ['2023-12', '2024-03', '2024-06', '2024-09'])
        self.assertEqual(len([row for row in result if row['method'] == 'sarima']), 12)
        self.assertEqual({row['horizon'] for row in result}, {1, 2, 3})

    def test_benchmarks_do_not_use_future_months(self):
        series = pd.Series(np.arange(36.), index=pd.date_range('2021-01-01', periods=36, freq='MS'))
        result = benchmarks(series, pd.date_range('2024-01-01', periods=3, freq='MS'))
        self.assertEqual(result['seasonal_naive'], [24, 25, 26])
        self.assertEqual(result['monthly_average'], [12, 13, 14])

    def test_percentage_error_excludes_zero_and_near_zero_rain_and_celsius(self):
        rows = [{'actual': actual, 'prediction': predicted, 'lower_80': 0, 'upper_80': 4}
                for actual, predicted in [(0, 1), (.5, 1), (2, 3)]]
        rain = metrics(rows, rainfall=True)
        self.assertEqual(rain['mape_n'], 1)
        self.assertEqual(rain['mape'], 50)
        self.assertEqual(rain['n'], 3)
        self.assertIsNone(metrics(rows)['mape'])
        self.assertEqual(metrics(rows)['interval_80_coverage'], 1)


if __name__ == '__main__':
    unittest.main()
