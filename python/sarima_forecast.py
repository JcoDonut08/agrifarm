"""Monthly harvest forecasts. Helpers are shared with evaluation and tests."""

import argparse
import itertools
import json
import multiprocessing as mp
from pathlib import Path
from queue import Empty
import sys
import time
import warnings
from datetime import datetime
from zipfile import ZipFile, BadZipFile
from xml.etree.ElementTree import ParseError
from openpyxl.utils.exceptions import InvalidFileException

import numpy as np
import pandas as pd
from statsmodels.tsa.statespace.sarimax import SARIMAX

REFERENCE_DIR = Path(__file__).resolve().parents[1] / "storage/app/forecasting"
DEFAULT_ORDER = (1, 1, 1)
DEFAULT_SEASONAL_ORDER = (1, 0, 0, 12)
TUNING_SECONDS = 30


def load_reference(filename):
    with (REFERENCE_DIR / filename).open(encoding="utf-8") as source:
        return json.load(source)


class UploadError(ValueError):
    def __init__(self, code, message, **details):
        super().__init__(message)
        self.code, self.details = code, details

    def payload(self):
        return {"error": str(self), "error_code": self.code, "details": self.details}


def parse_month(value):
    if isinstance(value, (datetime, pd.Timestamp)):
        return pd.Timestamp(value).to_period("M").to_timestamp()
    for pattern in ("%B %Y", "%b %Y", "%Y-%m", "%Y-%m-%d"):
        try:
            return pd.Timestamp(datetime.strptime(str(value).strip(), pattern)).to_period("M").to_timestamp()
        except (ValueError, OverflowError):
            pass
    return pd.NaT


def parse_data(csv_path):
    max_rows = 20000
    filename = str(getattr(csv_path, "name", csv_path)).lower()
    try:
        if filename.endswith(".xlsx"):
            with ZipFile(csv_path) as workbook:
                if sum(item.file_size for item in workbook.infolist()) > 64 * 1024 * 1024:
                    raise UploadError("workbook_too_large", "Excel workbook expands beyond the 64 MB limit.")
            if hasattr(csv_path, "seek"):
                csv_path.seek(0)
            df = pd.read_excel(csv_path, engine="openpyxl", nrows=max_rows + 1)
        else:
            df = pd.read_csv(csv_path, nrows=max_rows + 1, encoding="utf-8-sig")
    except (pd.errors.ParserError, pd.errors.EmptyDataError, UnicodeError, BadZipFile,
            InvalidFileException, ParseError, KeyError, EOFError, OSError, ValueError) as error:
        if isinstance(error, UploadError):
            raise
        raise UploadError("unreadable_file", "Cannot read this CSV or Excel file. Save a UTF-8 CSV or a valid .xlsx workbook.") from error
    if len(df) > max_rows:
        raise UploadError("too_many_rows", "Upload exceeds the 20,000-row limit.")
    aliases = {"month": "Month", "date": "Month", "vegetable crop": "Vegetable Crop",
               "crop": "Vegetable Crop", "harvest (kg)": "Harvest (kg)", "harvest": "Harvest (kg)", "kg": "Harvest (kg)",
               "barangay": "Barangay"}
    df = df.rename(columns=lambda name: aliases.get(" ".join(str(name).strip().lower().split()), name))
    required = {"Month", "Vegetable Crop", "Harvest (kg)"}
    missing = sorted(required - set(df.columns))
    if missing:
        raise UploadError("missing_columns", "Missing required columns: " + ", ".join(missing), columns=missing)
    if df.columns.duplicated().any():
        raise UploadError("duplicate_columns", "Use only one column for each of Month, Vegetable Crop and Harvest (kg).")
    if df.empty:
        raise UploadError("no_crops", "No crops found. Add at least one harvest record.")
    if "Barangay" in df.columns:
        barangays = df["Barangay"].astype("string").str.strip()
        invalid = barangays.isna() | barangays.eq("") | (barangays.str.len() > 100)
        if invalid.any():
            rows = (df.index[invalid] + 2).tolist()[:10]
            raise UploadError("invalid_barangay", "Every row must name a barangay (up to 100 characters).", rows=rows)
        if barangays.nunique() != 1:
            raise UploadError("mixed_barangays", "Upload records for only one barangay at a time.")
        df["Barangay"] = barangays
    df["Date"] = pd.to_datetime(df["Month"].map(parse_month), errors="coerce")
    invalid = df["Date"].isna() | (df["Date"].dt.year < 1900) | (df["Date"].dt.year > 2100)
    if invalid.any():
        rows = (df.index[invalid] + 2).tolist()[:10]
        raise UploadError("invalid_dates", "Unreadable dates at rows " + ", ".join(map(str, rows)) + ". Use January 2025, Jan 2025, 2025-01 or 2025-01-15.", rows=rows)
    harvest = pd.to_numeric(df["Harvest (kg)"], errors="coerce")
    invalid = ~np.isfinite(harvest) | (harvest < 0) | (harvest > 1000000)
    if invalid.any():
        rows = (df.index[invalid] + 2).tolist()[:10]
        raise UploadError("invalid_harvest", "Harvest must contain finite, non-negative numbers no greater than 1,000,000 kg. Check rows " + ", ".join(map(str, rows)) + ".", rows=rows)
    df["Harvest (kg)"] = harvest
    crops = df["Vegetable Crop"].astype("string").str.strip()
    invalid = crops.isna() | crops.eq("") | (crops.str.len() > 100)
    if invalid.any():
        rows = (df.index[invalid] + 2).tolist()[:10]
        raise UploadError("invalid_crops", "Every row must name a crop (up to 100 characters). Check rows " + ", ".join(map(str, rows)) + ".", rows=rows)
    df["Vegetable Crop"] = crops
    if crops.nunique() > 50:
        raise UploadError("too_many_crops", "Upload exceeds the 50-crop limit.")
    span = (df["Date"].max().year - df["Date"].min().year) * 12 + df["Date"].max().month - df["Date"].min().month + 1
    if span > 600:
        raise UploadError("date_span", "Harvest records must span no more than 50 years.")
    return df.sort_values("Date")


def monthly_series(crop_data, end_date=None):
    ts = crop_data.set_index("Date")["Harvest (kg)"].resample("MS").sum(min_count=1)
    if end_date is not None:
        ts = ts.reindex(pd.date_range(ts.index.min(), end_date, freq="MS"))
    return ts


def prepare_series(ts):
    observed = int(ts.notna().sum())
    missing = int(ts.isna().sum())
    if observed < 24:
        return None, "Insufficient Data"
    if missing / len(ts) > 0.2:
        return None, "Too Many Missing Months"
    # Fill only complete interior gaps of at most two months.
    gaps = ts.isna()
    run_lengths = gaps.groupby(gaps.ne(gaps.shift()).cumsum()).transform("sum")
    interpolated = ts.interpolate(limit_area="inside")
    prepared = ts.where(~gaps | (run_lengths > 2), interpolated)
    if prepared.isna().any():
        return None, "Unfilled Missing Months"
    return prepared, None


def fit_candidate(ts, order, seasonal_order):
    with warnings.catch_warnings():
        warnings.simplefilter("ignore")
        model = SARIMAX(ts, order=order, seasonal_order=seasonal_order,
                        enforce_stationarity=False, enforce_invertibility=False)
        fitted = model.fit(disp=False, maxiter=50)
        if not fitted.mle_retvals.get("converged", False) or not np.isfinite(fitted.aic):
            raise ValueError("Model did not converge.")
        prediction = fitted.get_forecast(steps=12)
        means = np.asarray(prediction.predicted_mean, dtype=float)
        bounds = np.asarray(prediction.conf_int(alpha=0.2), dtype=float)
    if not np.isfinite(means).all() or not np.isfinite(bounds).all():
        raise ValueError("Non-finite forecast.")
    means = np.maximum(means, 0)
    lower = np.minimum(np.maximum(bounds[:, 0], 0), means)
    upper = np.maximum(np.maximum(bounds[:, 1], 0), means)
    return {"values": means.tolist(), "lower": lower.tolist(), "upper": upper.tolist(),
            "aic": float(fitted.aic), "order": list(order), "seasonal_order": list(seasonal_order)}


def order_candidates():
    return [((p, d, q), (P, D, Q, 12))
            for p, d, q, P, D, Q in itertools.product((0, 1), repeat=6)]


def _search_worker(ts, output, deadline):
    # A process can be stopped even while statsmodels is inside a fit.
    for order, seasonal_order in order_candidates():
        if time.monotonic() >= deadline:
            output.put({'complete': False})
            return
        if order == DEFAULT_ORDER and seasonal_order == DEFAULT_SEASONAL_ORDER:
            continue
        try:
            output.put(fit_candidate(ts, order, seasonal_order))
        except (ValueError, np.linalg.LinAlgError, RuntimeError):
            continue
    output.put({'complete': True})


def select_forecast(ts, deadline):
    default = None
    try:
        default = fit_candidate(ts, DEFAULT_ORDER, DEFAULT_SEASONAL_ORDER)
    except (ValueError, np.linalg.LinAlgError, RuntimeError):
        pass
    if deadline <= time.monotonic():
        if default is None:
            raise ValueError("Default model could not be fitted.")
        return {**default, "selection": "default_budget", "candidates_fitted": 1}

    context = mp.get_context("spawn")
    output = context.Queue()
    worker = context.Process(target=_search_worker, args=(ts, output, deadline))
    worker.start()
    best = default
    fitted_count = int(default is not None)
    timed_out = False
    try:
        while True:
            remaining = deadline - time.monotonic()
            if remaining <= 0:
                timed_out = True
                break
            try:
                candidate = output.get(timeout=min(0.1, remaining))
            except Empty:
                if not worker.is_alive():
                    timed_out = True
                    break
                continue
            if 'complete' in candidate:
                timed_out = not candidate['complete']
                break
            fitted_count += 1
            if best is None or candidate["aic"] < best["aic"]:
                best = candidate
    finally:
        if worker.is_alive():
            worker.terminate()
        worker.join()
        output.close()
    # A partial grid has not compared all candidates: use the specified default.
    if timed_out:
        best = default
    if best is None:
        raise ValueError("No converged model within the search budget.")
    return {**best, "selection": "default_budget" if timed_out else "aic_grid",
            "candidates_fitted": fitted_count}


def profile_row(profile, dates, status, reason, observed=0, missing=0):
    aligned = [profile[date.month - 1] for date in dates] if profile else []
    return {"method": f"Seasonal Profile Fallback ({reason})", "status": status,
            "reason": reason, "data_points_used": observed, "missing_months": missing,
            "annual_profile_index": profile, "profile_index": aligned,
            "forecast": [{"month": date.strftime("%Y-%m"), "value": value,
                          "lower": None, "upper": None} for date, value in zip(dates, aligned)],
            "unit": "season_strength" if profile else "unavailable"}


def generate_forecast(csv_path, tuning_seconds=TUNING_SECONDS):
    df = parse_data(csv_path)
    profiles = load_reference("seasonal_profiles.json")
    end_date = df["Date"].max().to_period("M").to_timestamp()
    dates = pd.date_range(end_date + pd.offsets.MonthBegin(1), periods=12, freq="MS")
    deadline = time.monotonic() + max(0, tuning_seconds)
    results = {}
    for crop, crop_data in df.groupby("Vegetable Crop", sort=False):
        ts = monthly_series(crop_data, end_date)
        observed, missing = int(ts.notna().sum()), int(ts.isna().sum())
        prepared, reason = prepare_series(ts)
        if prepared is not None:
            try:
                selected = select_forecast(prepared, deadline)
                results[crop] = {"method": "SARIMA", "status": "success", "unit": "kg",
                    "data_points_used": observed, "missing_months": missing,
                    "interpolated_months": missing, "annual_profile_index": profiles.get(crop, []),
                    "order": selected["order"], "seasonal_order": selected["seasonal_order"],
                    "aic": selected["aic"], "selection": selected["selection"],
                    "candidates_fitted": selected["candidates_fitted"], "interval_level": 0.8,
                    "forecast": [{"month": date.strftime("%Y-%m"), "value": value,
                                  "lower": lower, "upper": upper}
                                 for date, value, lower, upper in zip(dates, selected["values"], selected["lower"], selected["upper"])]}
                continue
            except (ValueError, np.linalg.LinAlgError, RuntimeError):
                reason = "Model Fit Failed"
        results[crop] = profile_row(profiles.get(crop, []), dates, "fallback", reason, observed, missing)
    for crop, profile in profiles.items():
        if crop not in results:
            results[crop] = profile_row(profile, dates, "new_crop", "New Crop")
    dataset = {"scope": "barangay" if "Barangay" in df.columns else "personal",
               "barangay": str(df["Barangay"].iloc[0]) if "Barangay" in df.columns else None,
               "record_start_month": df["Date"].min().strftime("%Y-%m"),
               "record_end_month": end_date.strftime("%Y-%m")}
    return {"schema_version": 2, "data_end_month": end_date.strftime("%Y-%m"), "dataset": dataset,
            "forecast_months": [date.strftime("%Y-%m") for date in dates], "crops": results,
            "tuning_budget_seconds": tuning_seconds}


if __name__ == "__main__":
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("csv_path", nargs="?", default=str(Path(__file__).resolve().parents[1] / "docs/sample-data/synthetic_harvest_4_years.csv"))
    parser.add_argument("--tuning-seconds", type=float, default=TUNING_SECONDS)
    args = parser.parse_args()
    try:
        print(json.dumps(generate_forecast(args.csv_path, args.tuning_seconds), allow_nan=False))
    except UploadError as error:
        print(json.dumps(error.payload(), allow_nan=False))
        sys.exit(1)
    except (ValueError, OSError, pd.errors.ParserError) as error:
        print(json.dumps({"error": "Unable to read harvest data.", "error_code": "unreadable_file", "details": {}}))
        sys.exit(1)
