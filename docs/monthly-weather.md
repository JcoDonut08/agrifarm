# Monthly weather forecasting

The seller Harvest Forecast page displays a Monthly Weather Outlook even without a harvest upload. It offers the three forecast months, mean temperature in °C, total rainfall in mm, the same calendar month's 2000–2021 ERA5 reference mean, and a source/model-error disclosure. Recommended crop cards receive separate weather precautions for their actual planting month. Changing the outlook month does not change the planting month, crop scores, crop order, saved plan dates or harvest estimates. Google Weather/Open-Meteo short-range forecasts and the harvest SARIMA pipeline retain their separate behavior.

The default overview uses plain language: expected rain is more, less, or around the usual amount, and temperature is shown as “Around 28°C,” rounded to the nearest degree with a whole-month-average explanation. A short “Before planting” reminder points to crop preparation and the daily forecast. Millimeters, precise temperature values, historical rainfall averages and model errors are inside the optional “Show weather details” disclosure. No unsupported hot/cold or crop-safety threshold is introduced, and the rainfall comparison uses the same displayed-precision basis as the crop cards.

Crop cards show two plain-language parts: the expected rainfall condition (more, less, or around the usual amount) and “If you plant [crop]” preparation. The condition compares the forecast and historical mean at the displayed 0.1 mm precision; “usual” refers to the same calendar month's 2000–2021 ERA5 mean, not an official rainfall category. No rain-probability percentage is inferred from a point forecast. Every one of the 19 referenced crops has English/Filipino preparation paraphrased from its existing guide, including upland Kangkong even when no numerical precaution triggers. A growing-guide link stays on the card. Detailed weather figures and the historical comparison are available in the Monthly Weather Outlook's Show weather details disclosure. The duplicate Monthly weather basis section has been removed from Why this crop?, which retains the crop-selection explanation and agricultural references. Unknown crops still show the forecast condition and ask the farmer to consult CENRO for planting requirements.

## Data and scope

Historical data come from the [Open-Meteo Historical Weather API](https://open-meteo.com/en/docs/historical-weather-api), explicitly selecting ECMWF ERA5 for a consistent series. The request uses the app's default Pasig coordinates (14.5764, 121.0851), Asia/Manila calendar days, daily mean 2 m temperature and daily rain totals. The API returns the regional grid at 14.5, 121.0, approximately 25 km resolution. This supports shared area guidance; it does not establish separate barangay or garden forecasts.

The October 16, 2026 release uses January 2000–September 2026: 9,770 complete daily records and 321 complete months. The original 2000–2025 download remains in the ignored research workspace. Monthly temperature is the mean of daily means; monthly rainfall is the sum of daily rain totals. Missing days, null/nonfinite values, negative rainfall, wrong units and incomplete months fail processing. Missing rainfall is never filled with zero. Source URL, dates, grid, software versions and SHA-256 hashes are recorded in [source.json](weather-model/source.json). The monthly training history is [monthly-history.csv](weather-model/monthly-history.csv).

ERA5 is historical reanalysis: observations combined with numerical models. Test errors measure agreement with withheld ERA5 values, not independent station observations or measured Pasig garden conditions. Source attribution: [Open-Meteo](https://doi.org/10.5281/zenodo.7970649), [ECMWF/Copernicus ERA5](https://doi.org/10.24381/cds.adbb2d47). The downloaded data are CC BY 4.0; this monthly aggregation is a modification. Open-Meteo's hosted free API is for non-commercial use within its limits; see [terms and pricing](https://open-meteo.com/en/pricing).

## Training and evaluation

`python/monthly_weather.py` fits separate temperature and rainfall SARIMA models with annual season length 12. The four fixed candidates combine nonseasonal orders (1,0,0)/(1,0,1) with seasonal orders (1,1,0,12)/(0,1,1,12), no trend, and enforced stationarity/invertibility. Every fit must converge with finite parameters. Negative rainfall point forecasts and interval bounds are clipped at zero before evaluation; no other outcome-dependent correction is applied.

The initial training period is 2000–2021. Candidate selection uses only 2022–2023 validation RMSE. At quarterly origins, each model forecasts the next three months, then expands its training window with newly available past data. The SARIMA specification is frozen before testing on January 2024–December 2025. At each test origin, only months before that origin enter the fit. Previously observed test months may enter subsequent quarterly fits; future test observations cannot. There are eight test origins, 24 predictions per target, and eight predictions at each lead time. The same origins/horizons are used for both benchmarks: the same month last year and a historical same-calendar-month average computed from the origin's past data. This is a 1–3-month retrospective test, not a 12-month-ahead test or prospective live validation.

After evaluation is completed, the selected SARIMA models are refitted through September 2026 for October–December 2026 forecasts. Using the former test months for this final production fit does not revise the frozen test results.

| Target / method | Test MAE | Test RMSE |
| --- | ---: | ---: |
| Temperature · SARIMA | 0.3694 °C | 0.5029 °C |
| Temperature · Same month last year | 0.5839 °C | 0.7320 °C |
| Temperature · Monthly average | 0.5500 °C | 0.6439 °C |
| Rainfall · SARIMA | 51.8829 mm | 64.8388 mm |
| Rainfall · Same month last year | 63.5167 mm | 84.6331 mm |
| Rainfall · Monthly average | 54.9976 mm | 68.8002 mm |

Both selected SARIMA models had lower RMSE than the two benchmarks on this test period. That does not establish performance on other periods or independent observations. Rainfall SARIMA bias was −31.7830 mm and its MAPE was 215.7789% over 24 eligible months: relative errors in dry months remain substantial. Rainfall MAPE includes actual totals of at least 1 mm, with eligible counts recorded; MAE and RMSE include every month. Celsius temperature MAPE is omitted. No single “accuracy percentage” is reported.

The saved conditional Gaussian 80% SARIMA intervals cover 75% of temperature and 83.33% of rainfall test values. Each lead has only eight test observations. These intervals have not been calibrated for reliable production coverage; the UI publishes point estimates and measured model errors without an invented uncertainty range. Monthly means/totals do not predict daily extremes, storms, flood events, soil moisture or crop survival.

Saved artifacts:

- [Test predictions](weather-model/test-predictions.csv): actual values, forecasts, origins, lead times and model-dependent interval bounds for each method.
- [Validation predictions](weather-model/validation-predictions.csv): each candidate's chronological results.
- [Evaluation and fitted parameters](weather-model/evaluation.json): all candidate validation scores, selected orders, test errors/bias/MAPE/interval coverage, per-horizon scores and final fitted coefficients.
- [Runtime outlook](../storage/app/forecasting/monthly_weather_outlook.json): the compact artifact used by Laravel; no fitting or external download occurs during page requests.

## Crop rules

`crop_monthly_weather_rules.json` explicitly maps canonical crops to the reviewed requirements fields in `crop_growing_requirements.json`. Crop names and aliases resolve through the existing requirements service. Each advice message shows the actual forecast/reference values and links the crop guide.

- A forecast rainfall total higher than the same calendar month's 2000–2021 mean triggers a drainage review only for crops whose selected guide explicitly discusses drainage or flooding avoidance.
- A lower total triggers a water-supply/soil-moisture review only for crops with documented watering or irrigation guidance. Monthly rain does not establish the farmer's actual irrigation need or prove drought.
- These rainfall comparisons are transparent AgriFarm planning rules, not measured crop-damage thresholds, official above/below-normal categories or probabilities. They quote the source guidance without claiming that monthly totals predict heavy rain on particular days.
- Gabi has a numerical comparison against its archived BPI guide's explicit daily-average temperature range (21–27°C, printed pages 4–7). A monthly mean outside that range asks the farmer to verify variety and conditions with CENRO; it is not a heat-damage classification. Other crops have no automated numerical temperature rule: general growing ranges, optimal temperatures and daily maximum thresholds are not silently converted into monthly-average damage thresholds.
- Luya and unknown crops have no numerical monthly weather rule. General source-based planting preparation is separate from numerical suitability checks. The “no_trigger” / “not_assessed” service statuses are retained without presenting a reassuring suitability verdict; the card always provides the available forecast condition and preparation. A rule that does not trigger does not certify suitability. Out-of-horizon, missing, malformed or outdated forecasts cannot generate current advice.

## Refresh and operations

Initial/research regeneration (repository root):

```powershell
python/.venv/Scripts/python.exe python/monthly_weather.py --as-of 2026-10-16 --download
```

Runtime/offline refresh, using the existing configured Python interpreter:

```text
php artisan weather:refresh --isolated
```

This command downloads through the previous complete calendar month, runs validation/testing/refitting offline and atomically publishes the new runtime artifact only after successful processing. The as-of date defaults to today in Asia/Manila; a reproducible date can be supplied with `--as-of=YYYY-MM-DD`. ERA5 has a publication delay, so run after the first several days of the month and check successful completion. The command's raw data, audit files and refreshed outlook are stored under `storage/app/private/monthly_weather` on the persistent Railway volume. Bundled reference JSON remains outside the volume in the image and is restored by the existing startup script. The service chooses the valid runtime/bundled outlook with the latest origin/issue date, so startup cannot replace a newer private refresh with an older bundled artifact.

No scheduler service is added by this change. An operator must run the offline refresh or arrange a scheduled CLI run. The service hides past outlook months and retains the tested second/third-month leads while they still cover the current month, with a refresh notice if newer history is due. After the forecast horizon expires, or if an artifact was issued in the future, it produces an explicit unavailable state. The existing short-range forecast is unaffected.

## Verification

Python tests cover complete/leap-month aggregation, missing/duplicate dates, zero versus missing rain, past-only quarterly backtesting, fixed model specifications, past-only benchmarks and percentage-error exclusions. PHP tests cover independent availability without harvest uploads, aliases and changing forecast-driven advice, limited temperature rules, unsupported crops, horizon/expiry/data validation, preserved crop ranking/harvest values and the offline refresh command. Browser tests cover 390/768/1440 pixels, English/Filipino, light/dark themes, month selection, model-error disclosure, keyboard interactions, source links, explicit failure states and planting-plan saving. Existing save/remove and growing-requirements flows are also checked.
