"""Reproducible synthetic fixtures, never real-world accuracy evidence."""

import argparse
from pathlib import Path

import numpy as np
import pandas as pd

from sarima_forecast import load_reference

SCENARIOS = {
    "realistic": {"noise": 0.15, "failure_rate": 0.05},
    "clean": {"noise": 0.08, "failure_rate": 0.01},
}
BASE_SCALE = {
    "Kangkong": 150, "Pechay": 180, "Mustasa": 160, "Kamatis": 40, "Talong": 50,
    "Okra": 60, "Kalabasa": 100, "Ampalaya": 35, "Sitaw": 45, "Sili": 15,
    "Alugbati": 80, "Lettuce": 120, "Labanos": 70, "Patola": 30, "Gabi": 40,
    "Saluyot": 55, "Spinach": 75, "Kalamansi": 20, "Luya": 10, "Malunggay": 90,
}


def generate_dataset(scenario="realistic", seed=42):
    settings = SCENARIOS[scenario]
    profiles = load_reference("seasonal_profiles.json")
    rng = np.random.default_rng(seed)
    records = []
    for year in range(2022, 2026):
        trend = 1 + (year - 2022) * 0.05
        for month in range(1, 13):
            for crop, profile in profiles.items():
                mean = BASE_SCALE[crop] * profile[month - 1] * trend
                value = max(0, mean + rng.normal(0, mean * settings["noise"]))
                if rng.random() < settings["failure_rate"]:
                    value = 0
                # An explicitly simulated failure is a recorded zero, not a missing row.
                records.append({"Month": pd.Timestamp(year, month, 1).strftime("%B %Y"),
                                "Vegetable Crop": crop, "Harvest (kg)": round(value, 2)})
    return pd.DataFrame(records)


if __name__ == "__main__":
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--scenario", choices=SCENARIOS, default="realistic")
    parser.add_argument("--seed", type=int, default=42)
    parser.add_argument("--output", type=Path, required=True)
    args = parser.parse_args()
    args.output.parent.mkdir(parents=True, exist_ok=True)
    generate_dataset(args.scenario, args.seed).to_csv(args.output, index=False)
    print(f"Generated {args.scenario} synthetic data (seed={args.seed}): {args.output}")
