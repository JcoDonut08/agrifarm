"""Compare SARIMA with seasonal naive on a held-out synthetic year."""

import argparse
import json
from pathlib import Path
import time

import numpy as np
import pandas as pd

from generate_synthetic import generate_dataset, SCENARIOS
from sarima_forecast import monthly_series, prepare_series, select_forecast


def metrics(actual, predicted):
    actual = np.asarray(actual, dtype=float)
    predicted = np.asarray(predicted, dtype=float)
    errors = np.abs(actual - predicted)
    nonzero = actual != 0
    return {
        "mae": float(errors.mean()),
        "rmse": float(np.sqrt(np.mean(errors ** 2))),
        "mape": float(np.mean(errors[nonzero] / np.abs(actual[nonzero])) * 100) if nonzero.any() else None,
        "mape_months": int(nonzero.sum()),
        "wape": float(errors.sum() / np.abs(actual).sum() * 100) if np.abs(actual).sum() else None,
    }


def evaluate_scenario(scenario, seed=42, tuning_seconds=30):
    df = generate_dataset(scenario, seed)
    df["Date"] = pd.to_datetime(df["Month"], format="%B %Y")
    deadline = time.monotonic() + tuning_seconds
    rows = []
    for crop, records in df.groupby("Vegetable Crop", sort=False):
        ts = monthly_series(records)
        train, test = ts.iloc[:-12], ts.iloc[-12:]
        prepared, reason = prepare_series(train)
        baseline = train.iloc[-12:].to_numpy()
        row = {"crop": crop, "baseline": metrics(test.to_numpy(), baseline)}
        try:
            if prepared is None:
                raise ValueError(reason)
            selected = select_forecast(prepared, deadline)
            row.update({"sarima": metrics(test.to_numpy(), selected["values"]),
                        "order": selected["order"], "seasonal_order": selected["seasonal_order"],
                        "selection": selected["selection"]})
        except (ValueError, RuntimeError, np.linalg.LinAlgError) as error:
            row["error"] = str(error)
        rows.append(row)
    return {"scenario": scenario, **SCENARIOS[scenario], "seed": seed,
            "training": "Jan 2022–Dec 2024 (36 months)", "holdout": "Jan–Dec 2025 (12 months)",
            "tuning_seconds": tuning_seconds, "crops": rows}


def display(value):
    return "undefined" if value is None else f"{value:.2f}"


def report_markdown(results):
    lines = [
        "# SARIMA synthetic evaluation",
        "",
        "Validated on synthetic data generated from regional seasonal patterns to confirm the pipeline works. Accuracy on real barangay records is future work.",
        "",
        "The generator uses the same reference profiles as the fallback. This is a pipeline check, not independent validation of the reference profiles or real farm performance. No real-world accuracy percentage is claimed.",
        "",
        "Train on January 2022–December 2024; hold out January–December 2025. Selection uses training data only. The seasonal-naïve baseline predicts each holdout month using the same month in 2024. A 5% yearly scale trend is included.",
        "",
        "MAPE excludes months with actual harvest 0; the number of included months is shown per crop. WAPE, MAE, and RMSE include all 12 months, including recorded crop failures. MAPE/WAPE are undefined if their respective denominators are zero. Lower error is better.",
        "",
        "Each scenario has one shared tuning budget. A complete grid selects the lowest finite AIC among converged models; a timed-out grid uses the default (1,1,1)(1,0,0,12). These are model-dependent 80% prediction intervals, not guarantees.",
        "",
    ]
    for result in results:
        rows = result["crops"]
        comparable = [row for row in rows if "sarima" in row]
        lines.extend([
            f"## {result['scenario'].capitalize()} scenario",
            "",
            f"Noise standard deviation: {result['noise'] * 100:.0f}% of the seasonal mean. Random recorded zero-harvest probability: {result['failure_rate'] * 100:.0f}%. Seed: {result['seed']}. Four years, 20 crops, 960 records. Shared tuning budget: {result['tuning_seconds']:g}s.",
            "",
            "| Crop | SARIMA MAPE % | Naïve MAPE % | MAPE months | SARIMA WAPE % | Naïve WAPE % | SARIMA MAE kg | SARIMA RMSE kg | Order; seasonal order | Selection |",
            "|---|---:|---:|---:|---:|---:|---:|---:|---|---|",
        ])
        for row in rows:
            if "sarima" not in row:
                lines.append(f"| {row['crop']} | failed: {row['error']} | {display(row['baseline']['mape'])} | — | — | {display(row['baseline']['wape'])} | — | — | — | failed |")
                continue
            model, base = row["sarima"], row["baseline"]
            lines.append(f"| {row['crop']} | {display(model['mape'])} | {display(base['mape'])} | {model['mape_months']}/12 | {display(model['wape'])} | {display(base['wape'])} | {display(model['mae'])} | {display(model['rmse'])} | {row['order']}; {row['seasonal_order']} | {row['selection']} |")
        if comparable:
            sarima_wape = np.mean([row["sarima"]["wape"] for row in comparable])
            naive_wape = np.mean([row["baseline"]["wape"] for row in comparable])
            wins = sum(row["sarima"]["wape"] < row["baseline"]["wape"] for row in comparable)
            lines.extend(["", f"Mean per-crop WAPE on {len(comparable)} successfully fitted crops: SARIMA **{sarima_wape:.2f}%**, seasonal-naïve **{naive_wape:.2f}%**. SARIMA has lower WAPE on **{wins}/{len(comparable)}** crops. Failed crops: {len(rows) - len(comparable)}. This is an unweighted crop average.",
                          "", "Model selection does not ensure that SARIMA beats the baseline. Use the measured comparison above when discussing this synthetic experiment.", ""])
    return "\n".join(lines)


if __name__ == "__main__":
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--seed", type=int, default=42)
    parser.add_argument("--tuning-seconds", type=float, default=30)
    parser.add_argument("--output", type=Path)
    parser.add_argument("--json-output", type=Path)
    args = parser.parse_args()
    results = [evaluate_scenario(scenario, args.seed, args.tuning_seconds) for scenario in SCENARIOS]
    report = report_markdown(results)
    print(report)
    if args.output:
        args.output.parent.mkdir(parents=True, exist_ok=True)
        args.output.write_text(report + "\n", encoding="utf-8")
    if args.json_output:
        args.json_output.parent.mkdir(parents=True, exist_ok=True)
        args.json_output.write_text(json.dumps(results, indent=2, allow_nan=False) + "\n", encoding="utf-8")
