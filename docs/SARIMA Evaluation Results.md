# SARIMA synthetic evaluation

Validated on synthetic data generated from regional seasonal patterns to confirm the pipeline works. Accuracy on real barangay records is future work.

The generator uses the same reference profiles as the fallback. This is a pipeline check, not independent validation of the reference profiles or real farm performance. No real-world accuracy percentage is claimed.

Train on January 2022–December 2024; hold out January–December 2025. Selection uses training data only. The seasonal-naïve baseline predicts each holdout month using the same month in 2024. A 5% yearly scale trend is included.

MAPE excludes months with actual harvest 0; the number of included months is shown per crop. WAPE, MAE, and RMSE include all 12 months, including recorded crop failures. MAPE/WAPE are undefined if their respective denominators are zero. Lower error is better.

Each scenario has one shared tuning budget. A complete grid selects the lowest finite AIC among converged models; a timed-out grid uses the default (1,1,1)(1,0,0,12). These are model-dependent 80% prediction intervals, not guarantees.

## Realistic scenario

Noise standard deviation: 15% of the seasonal mean. Random recorded zero-harvest probability: 5%. Seed: 42. Four years, 20 crops, 960 records. Shared tuning budget: 30s.

| Crop | SARIMA MAPE % | Naïve MAPE % | MAPE months | SARIMA WAPE % | Naïve WAPE % | SARIMA MAE kg | SARIMA RMSE kg | Order; seasonal order | Selection |
|---|---:|---:|---:|---:|---:|---:|---:|---|---|
| Kamatis | 18.99 | 11.05 | 11/12 | 31.41 | 25.54 | 7.84 | 13.96 | [0, 1, 1]; [0, 1, 1, 12] | aic_grid |
| Talong | 68.30 | 26.66 | 12/12 | 65.43 | 27.88 | 27.59 | 30.00 | [0, 1, 1]; [0, 1, 1, 12] | aic_grid |
| Okra | 60.04 | 46.81 | 12/12 | 59.00 | 49.13 | 32.36 | 33.99 | [0, 1, 1]; [0, 1, 1, 12] | aic_grid |
| Kangkong | 32.47 | 34.61 | 12/12 | 33.34 | 35.14 | 45.63 | 55.20 | [0, 1, 1]; [0, 1, 1, 12] | aic_grid |
| Pechay | 18.25 | 21.22 | 12/12 | 18.08 | 20.69 | 24.55 | 29.07 | [0, 1, 1]; [0, 1, 1, 12] | aic_grid |
| Mustasa | 25.69 | 23.36 | 12/12 | 31.35 | 28.57 | 37.96 | 56.04 | [1, 1, 1]; [1, 0, 0, 12] | default_budget |
| Kalabasa | 21.75 | 29.79 | 12/12 | 24.00 | 31.94 | 19.21 | 29.93 | [1, 1, 1]; [1, 0, 0, 12] | default_budget |
| Ampalaya | 31.28 | 15.82 | 12/12 | 24.17 | 14.08 | 6.29 | 7.89 | [1, 1, 1]; [1, 0, 0, 12] | default_budget |
| Sitaw | 17.19 | 29.64 | 12/12 | 14.96 | 27.13 | 5.58 | 6.78 | [1, 1, 1]; [1, 0, 0, 12] | default_budget |
| Sili | 18.53 | 18.19 | 12/12 | 17.97 | 16.30 | 2.39 | 3.05 | [1, 1, 1]; [1, 0, 0, 12] | default_budget |
| Alugbati | 16.30 | 14.46 | 11/12 | 26.01 | 24.28 | 16.66 | 23.85 | [1, 1, 1]; [1, 0, 0, 12] | default_budget |
| Lettuce | 23.62 | 21.56 | 12/12 | 22.50 | 22.88 | 17.52 | 24.70 | [1, 1, 1]; [1, 0, 0, 12] | default_budget |
| Labanos | 32.64 | 38.18 | 11/12 | 42.18 | 45.70 | 19.34 | 25.89 | [1, 1, 1]; [1, 0, 0, 12] | default_budget |
| Patola | 13.39 | 14.00 | 12/12 | 15.19 | 15.00 | 3.91 | 5.71 | [1, 1, 1]; [1, 0, 0, 12] | default_budget |
| Gabi | 20.38 | 31.44 | 11/12 | 29.16 | 39.36 | 10.05 | 12.67 | [1, 1, 1]; [1, 0, 0, 12] | default_budget |
| Saluyot | 26.69 | 20.01 | 12/12 | 24.58 | 17.91 | 10.90 | 12.10 | [1, 1, 1]; [1, 0, 0, 12] | default_budget |
| Spinach | 15.33 | 15.36 | 11/12 | 28.04 | 28.42 | 13.15 | 25.40 | [1, 1, 1]; [1, 0, 0, 12] | default_budget |
| Kalamansi | 24.20 | 14.58 | 12/12 | 27.53 | 14.85 | 4.99 | 6.42 | [1, 1, 1]; [1, 0, 0, 12] | default_budget |
| Luya | 17.09 | 17.25 | 11/12 | 26.34 | 27.14 | 2.08 | 3.53 | [1, 1, 1]; [1, 0, 0, 12] | default_budget |
| Malunggay | 13.91 | 19.96 | 11/12 | 22.98 | 28.93 | 18.69 | 28.25 | [1, 1, 1]; [1, 0, 0, 12] | default_budget |

Mean per-crop WAPE on 20 successfully fitted crops: SARIMA **29.21%**, seasonal-naïve **27.04%**. SARIMA has lower WAPE on **10/20** crops. Failed crops: 0. This is an unweighted crop average.

Model selection does not ensure that SARIMA beats the baseline. Use the measured comparison above when discussing this synthetic experiment.

## Clean scenario

Noise standard deviation: 8% of the seasonal mean. Random recorded zero-harvest probability: 1%. Seed: 42. Four years, 20 crops, 960 records. Shared tuning budget: 30s.

| Crop | SARIMA MAPE % | Naïve MAPE % | MAPE months | SARIMA WAPE % | Naïve WAPE % | SARIMA MAE kg | SARIMA RMSE kg | Order; seasonal order | Selection |
|---|---:|---:|---:|---:|---:|---:|---:|---|---|
| Kamatis | 14.70 | 7.40 | 12/12 | 11.95 | 7.56 | 3.30 | 4.13 | [0, 1, 1]; [0, 1, 1, 12] | aic_grid |
| Talong | 10.07 | 10.84 | 12/12 | 10.22 | 10.88 | 4.24 | 5.88 | [0, 1, 1]; [0, 1, 1, 12] | aic_grid |
| Okra | 31.88 | 25.56 | 12/12 | 32.18 | 29.06 | 17.36 | 19.20 | [0, 1, 1]; [0, 1, 1, 12] | aic_grid |
| Kangkong | 13.35 | 13.88 | 12/12 | 13.55 | 14.18 | 18.98 | 21.61 | [1, 1, 1]; [1, 0, 0, 12] | default_budget |
| Pechay | 11.41 | 12.05 | 12/12 | 11.12 | 11.75 | 14.94 | 17.23 | [1, 1, 1]; [1, 0, 0, 12] | default_budget |
| Mustasa | 54.34 | 9.49 | 12/12 | 35.19 | 11.08 | 42.11 | 53.80 | [1, 1, 1]; [1, 0, 0, 12] | default_budget |
| Kalabasa | 12.19 | 6.78 | 12/12 | 10.71 | 6.31 | 8.65 | 10.27 | [1, 1, 1]; [1, 0, 0, 12] | default_budget |
| Ampalaya | 18.04 | 6.62 | 12/12 | 14.39 | 6.45 | 3.98 | 5.25 | [1, 1, 1]; [1, 0, 0, 12] | default_budget |
| Sitaw | 11.22 | 7.52 | 12/12 | 11.09 | 7.34 | 4.15 | 5.26 | [1, 1, 1]; [1, 0, 0, 12] | default_budget |
| Sili | 9.90 | 8.71 | 12/12 | 9.84 | 8.73 | 1.31 | 1.53 | [1, 1, 1]; [1, 0, 0, 12] | default_budget |
| Alugbati | 9.64 | 7.94 | 12/12 | 10.69 | 8.53 | 7.60 | 10.13 | [1, 1, 1]; [1, 0, 0, 12] | default_budget |
| Lettuce | 11.06 | 11.58 | 12/12 | 12.02 | 13.24 | 9.31 | 13.15 | [1, 1, 1]; [1, 0, 0, 12] | default_budget |
| Labanos | 16.61 | 15.65 | 12/12 | 14.97 | 14.12 | 7.82 | 12.63 | [1, 1, 1]; [1, 0, 0, 12] | default_budget |
| Patola | 9.89 | 8.19 | 12/12 | 11.41 | 8.71 | 2.91 | 4.44 | [1, 1, 1]; [1, 0, 0, 12] | default_budget |
| Gabi | 9.46 | 9.48 | 12/12 | 8.67 | 9.50 | 3.34 | 4.36 | [1, 1, 1]; [1, 0, 0, 12] | default_budget |
| Saluyot | 11.51 | 10.50 | 12/12 | 11.10 | 10.09 | 5.08 | 5.76 | [1, 1, 1]; [1, 0, 0, 12] | default_budget |
| Spinach | 9.35 | 9.58 | 12/12 | 9.33 | 9.46 | 4.79 | 7.10 | [1, 1, 1]; [1, 0, 0, 12] | default_budget |
| Kalamansi | 12.70 | 9.17 | 12/12 | 13.81 | 9.21 | 2.51 | 3.08 | [1, 1, 1]; [1, 0, 0, 12] | default_budget |
| Luya | 14.23 | 7.77 | 11/12 | 26.32 | 18.41 | 2.17 | 3.80 | [1, 1, 1]; [1, 0, 0, 12] | default_budget |
| Malunggay | 12.02 | 12.08 | 12/12 | 12.78 | 11.89 | 11.11 | 14.72 | [1, 1, 1]; [1, 0, 0, 12] | default_budget |

Mean per-crop WAPE on 20 successfully fitted crops: SARIMA **14.57%**, seasonal-naïve **11.32%**. SARIMA has lower WAPE on **6/20** crops. Failed crops: 0. This is an unweighted crop average.

Model selection does not ensure that SARIMA beats the baseline. Use the measured comparison above when discussing this synthetic experiment.
