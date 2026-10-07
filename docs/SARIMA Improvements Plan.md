# SARIMA Improvements Plan

Follow-up to `docs/SARIMA Forecasting Plan.md`. This document lists the fixes and improvements found during the review of the current forecasting feature, with how to implement each one and how to verify it.

**Implementation status (6 October 2026):** Phases 1–7 are implemented locally, with option A (a VPS running Laravel and Python together) selected as the deployment target. Production provisioning and Linux verification remain deployment activities. The sections below preserve the original review and acceptance criteria. See [synthetic evaluation results](SARIMA%20Evaluation%20Results.md) for the recorded baseline comparison and [deployment instructions](SARIMA%20Deployment.md) for runtime setup.

**Farmer UX follow-up:** [Farmer interface flow](SARIMA%20Farmer%20UX%20Plan.md) puts a visual harvest calendar first after uploading, followed by three pictured planting suggestions and the always-visible update-upload section without a collapse arrow. The example download and File help were removed from the page. Scores and model explanations stay available on demand. Forecasting and ranking rules are unchanged; future sales and buyer demand are not predicted. The upload simplification passed the build and two focused browser scenarios, with upload-panel screenshots inspected at all three widths in both themes.

### Implementation notes for phases 1–3

**Selling-activity follow-up (7 October 2026):** Recommendations now use aggregate completed-order activity from the relevant barangay and a bounded ±1-point ranking adjustment. Historical sales in the harvest month take priority when enough history exists; otherwise recent 90-day sales are used. Sparse records stay neutral, and current stock is compared only in matching units. The Python forecast model is unchanged, and future sales/demand remain unpredicted. See [the barangay data plan](SARIMA%20Barangay%20Harvest%20Data%20Plan.md) for the current rules; the earlier 60/40 score is the base before this adjustment.

- Python now returns a versioned result with `forecast_months`, `data_end_month`, and `crops`. Each crop has dated `forecast` points; kg rows include an 80% prediction range, order, seasonal order, AIC, and selection reason. All rows share the twelve months after the upload's latest record. Profile rows keep both their January–December reference (`annual_profile_index`) and their dated, rotated values (`profile_index`). An unknown crop with insufficient history is unavailable rather than an invented zero-yield profile.
- Empty months remain missing; recorded zeros remain zeros. Eligibility uses at least 24 observed months and no more than 20% missing months. Only complete interior gaps of one or two months are interpolated; long or trailing gaps use a profile with a reason. Data for a crop that stops earlier is extended to the upload's latest month before checking missingness.
- `ForecastRecommendationService` calculates the ranking on the server using the Pasig planting month and `round(days_to_harvest / 30)` as a calendar-month planning approximation. The expected harvest date includes its year. A forecast from another year is never reused: recommendations outside its dates use the annual reference with a visible explanation. Scores combine 60% season strength and 40% weather tolerance. At most two new crops appear among the three picks.
- The optional weather weighting is seasonal: each month from planting through expected harvest receives 70% rain / 30% heat in June–November, 30% rain / 70% heat in March–May, and equal weights otherwise; those monthly weights are averaged. This is not a live months-ahead weather forecast. No short-range weather reading is represented as a prediction for a future growing season.
- The 64-order AIC grid ignores failed, unconverged, or non-finite fits. A separate search process can be stopped at the shared 30-second deadline. If the search is incomplete, the default order is used; if no usable default can be fitted, the crop uses a reference profile. **The budget limits additional tuning, not total upload runtime:** default fits and startup still take time. Later crops may therefore use the default order. This distinction is exposed in the result and evaluation.
- The UI explains season strength rather than probability, shows kg and ranges for fitted rows (including zero), labels new crops and reference sources, and explains recommendation reasons. Main cards retain the actual harvest range; broad-range explanations, scores, source details and timing assumptions are available in “Why this crop?”. Technical model details live in the collapsed “Model details and crop references” section.
- `generate_synthetic.py` reproducibly generates both four-year scenarios with seed 42 and preserves explicitly simulated zero harvests. `evaluate_sarima.py` holds out 2025 after training on 2022–2024, reports MAPE on non-zero actuals plus WAPE/MAE/RMSE, and compares the same-month-last-year baseline without using held-out data for model selection. Neither scenario establishes real-world accuracy; the recorded SARIMA averages do not beat the baseline.
- The generated datasets are reproducible, but the number of crops completing the time-bounded grid depends on machine speed. The evaluation records the selected orders and budget outcome per crop so a repeat run can be interpreted correctly.

### Implementation notes for phases 4–7

- Successful uploads create a seller-owned `forecast_runs` record containing the versioned result and source filename. Dashboard props load the latest result on refresh and future sign-ins. Planting recommendations are recalculated for the current Pasig month without refitting the saved forecast. Failed uploads keep the previous result and do not create a run. The migration has been applied to the local development database.
- The upload endpoint enforces seller role, verification, account status and temporary-password middleware, accepts CSV/text CSV and `.xlsx` up to 5 MB, and limits upload attempts to five per seller per minute. Python accepts the four planned date formats, native Excel dates and case-insensitive column aliases. The first Excel sheet is read. Limits are 20,000 rows, 50 uploaded crops, 100 characters per crop name, 0–1,000,000 kg per record, dates in 1900–2100, a 50-year data span and a 64 MB expanded Excel workbook. Invalid headers, dates, values, crop names and unreadable files return structured error codes with column names or row numbers for bilingual UI messages.
- The runner creates UUID upload names preserving their extension, validates the returned contract, applies an outer process timeout and cleans temporary files in `finally`, including failed processes. Laravel invokes Python through `Process` with separate arguments; `.env`/`config/services.php` configure the interpreter, timeout and tuning budget. Windows passes its discovered `SYSTEMROOT` to avoid Python DLL-loading failures in PHP's web process. The batch helper no longer hard-codes a drive or Windows directory.
- English and Filipino copy covers the shorter upload action, errors, card reasons, source labels and calendar labels. The example-download link and File help were removed from the page; the existing authenticated sample route remains available. Model details retain the synthetic-data limitation. Upload selection supports keyboard and drag/drop interaction; the table has a caption, season words and contained horizontal scrolling.
- Saved results show a visual harvest calendar first, with small crop pictures and one full heatmap of every crop and all twelve dated months. Green means Peak season, yellow Okay season and red Off-season; symbols and accessible labels supplement color. Narrow screens scroll horizontally with sticky crop names. Selecting a month displays its dated harvest range or seasonal guide. Three pictured recommendation cards follow, showing weather suitability, harvest-season strength, harvest dates, approximate growing time and kg ranges where a matching farm estimate exists. Uploading moves below results and stays visible after success or failure, with a regular heading and no expand/collapse arrow. The duplicate detailed calendar, best-month list, unit switch, month paging and crop expansion controls have been removed. “How this works” and model details are collapsed below. Crop pictures are generated reference images, not seller product photographs. Theme variables support light and dark mode.
- Deployment targets a local Python runtime on a VPS, with pinned dependencies in `python/requirements.txt`, platform-specific virtual-environment defaults and an explicit interpreter override. `php artisan forecast:check` verifies the PHP/Python bridge using the sample without saving a seller run. [Deployment instructions](SARIMA%20Deployment.md) cover installation, process permissions, web request timeouts, limits and release checks. No server was purchased or deployed; the Linux service account and PHP-FPM setup must be checked on the eventual host.

### Crop timing sources and assumptions

The new `storage/app/forecasting/crop_metadata.json` covers all 20 reference crops. Growing durations are approximate planning inputs, not locally validated cultivar measurements. Direct-sown crops start at sowing; transplant-based estimates assume ready seedlings and exclude nursery time. Each entry records a timing note and an agriculture reference where available. Provisional offsets must be checked with CENRO/local growers before being cited as exact agronomic measurements. Spinach's species/timing is unresolved and it is excluded from the planting shortlist; newly planted calamansi requires more than a year and is also excluded, while both remain in the calendar. The existing seasonal and weather-tolerance profiles are illustrative references, not independently measured Pasig barangay averages.

References for the paper and timing review:

- [DA-ATI lowland vegetables guide](https://ati2.da.gov.ph/ati-4b/content/sites/default/files/2022-12/lowland_vegetables.pdf): field-planting and harvest guidance; ampalaya starts harvesting at about 45 days.
- [DA indigenous vegetables guide](https://hvcdp.da.gov.ph/wp-content/uploads/2022/05/Indigenous-Vegetables-Guide.pdf): alugbati, malunggay, and saluyot; saluyot duration varies over approximately 30–60 days.
- [DA-ATI pechay urban gardening leaflet](https://ati2.da.gov.ph/ati-car/content/sites/default/files/2022-12/pechay_production_for_urban_gardening_leaflet.pdf): approximately 30–40 days after sowing.
- [DA-ATI romaine lettuce field report](https://ati2.da.gov.ph/ati-car/content/features/green-romance-romaine-lettuce-production-cloud-capped-mountains-bauko): reported harvest at 50–60 days after transplanting; this is a Cordillera example, not a Pasig cultivar validation.
- [DA-ATI calamansi guide](https://ati2.da.gov.ph/ati-4b/content/sites/default/files/2022-12/calamansi_final.pdf): tree establishment takes years, unlike an existing productive tree.

Reproduce the recorded evaluation from the repository root:

```powershell
python/.venv/Scripts/python.exe python/evaluate_sarima.py --output "docs/SARIMA Evaluation Results.md"
python/.venv/Scripts/python.exe -m unittest discover -s python/tests -v
php artisan test --filter=SellerForecastTest
npm run test:e2e -- tests/e2e/forecasting.spec.js
```

Verification: Phases 1–7 passed 26 Python regression tests and 20 Laravel forecast tests, dependency checks, the runtime smoke check and scoped Pint checks. The farmer UX follow-up passes the Vite build and six browser scenarios. Browser uploads of both CSV samples are checked at 390px, 768px and 1440px, including calendar-first order and focus after upload, crop image loading, every crop and all twelve months in one calendar, green/yellow/red season colors, sticky crop names, keyboard month selection, dated harvest details, collapsed help, refresh persistence, kg ranges, calendar scrolling, model details and light/dark screenshots. A five-crop upload ending in June verifies shifted dates and new crops. A keyboard-selected Excel upload verifies native dates, Filipino row/column errors and keeping the last saved result after failures; a focused repeat also checks drag/drop selection/removal and final upload styling in both themes at all three widths. An older four-year upload verifies expired forecast dates and an unavailable unknown crop. No Python or Laravel changes were needed for this UX follow-up. The prior full PHP suite retains 18 failures in existing admin, harvest and storefront tests outside this work (115 passed, 1 skipped). Build warnings about existing image paths and large bundles remain.

**Current files involved**

| Layer | File |
|---|---|
| Python engine | `python/sarima_forecast.py`, `python/evaluate_sarima.py`, `python/generate_synthetic.py`, `python/run_sarima.bat` |
| Reference data | `storage/app/forecasting/seasonal_profiles.json`, `storage/app/forecasting/crop_weather_tolerance.json`, `storage/app/forecasting/crop_metadata.json` |
| Laravel | `app/Services/ForecastService.php`, `app/Services/ForecastRecommendationService.php`, seller forecast/dashboard controllers, `app/Http/Requests/Seller/ForecastRequest.php`, `app/Models/ForecastRun.php`, `app/Models/User.php`, `database/migrations/2026_10_06_000000_create_forecast_runs_table.php`, routes and Inertia middleware |
| React | `resources/js/Pages/Seller/Forecasting.jsx`, `resources/css/seller-forecast.css`, `resources/js/Pages/Seller/Dashboard.jsx` |
| Crop pictures | `public/images/forecast-crops.png` (generated reference atlas; prompt recorded in the farmer UX plan) |
| Runtime / deployment | `config/services.php`, `.env.example`, `python/requirements.txt`, `app/Console/Commands/CheckForecastRuntime.php`, `docs/SARIMA Deployment.md` |
| Regression tests | `tests/Feature/SellerForecastTest.php`, `python/tests/test_sarima_forecast.py`, `tests/e2e/forecasting.spec.js` |

**Priority legend:** 🔴 must fix (wrong logic or claim) · 🟠 should fix (robustness / deployment) · 🟡 nice to have (UX polish)

---

## Phase 1: Logic correctness 🔴

### 1.1 Recommend by planting date, not current harvest month

**Problem.** The "Plant Now" cards score each crop on the harvest index of the current month and the next 2. A crop planted today is harvested 30–120 days later, so the recommendation is off by one growing cycle.

**Implementation**
- Add a crop metadata file `storage/app/forecasting/crop_metadata.json`:
  ```json
  {
    "Pechay":  { "days_to_harvest": 30,  "growth_class": "fast" },
    "Kamatis": { "days_to_harvest": 75,  "growth_class": "standard" },
    "Gabi":    { "days_to_harvest": 180, "growth_class": "long" }
  }
  ```
  (fill in all 20 crops; cite a DA / PhilRice / BPI source in the paper)
- Compute the expected harvest month: `harvestMonth = (currentMonth + round(days_to_harvest / 30)) % 12`.
- Score yield using the index at `harvestMonth` (optionally averaged with ±1 month).
- Replace the hard-coded `FAST_GROWING` / `STANDARD_GROWING` arrays in `Forecasting.jsx` with this metadata.

**Done when** the card shows "Plant now → harvest around **Dec**", and the score uses December's index.

### 1.2 Recommend new crops (not only the ones the farmer uploaded)

**Problem.** Only crops in the uploaded CSV are scored. The requirement says the 3 picks can include crops the farmer does not plant yet.

**Implementation**
- In `sarima_forecast.py`, after processing uploaded crops, add every crop from `seasonal_profiles.json` that is missing from the upload, with `"status": "new_crop"` and its regional `profile_index`.
- In the UI, label these cards **"New crop for you"** and use the source text "Based on Pasig area averages".
- Optionally cap new crops to at most 1–2 of the 3 picks so familiar crops still appear.

**Done when** uploading a CSV that has only 5 crops can still produce a recommendation for a crop outside those 5.

### 1.3 Use real forecast dates instead of fixed "Jan–Dec 2026"

**Problem.** `fitted.forecast(steps=12)` predicts the 12 months **after the last row** in the CSV, but the UI always labels the columns Jan–Dec 2026. If the data ends in June, every column is shifted.

**Implementation**
- Python returns the dates with each forecast:
  ```json
  "forecast": [{ "month": "2026-11", "value": 31.2, "lower": 24.0, "upper": 38.5 }, ...]
  ```
- Fallback rows return their profile **re-ordered to the same 12 future months**, so every row lines up.
- The UI builds column headers from the returned months (e.g., "Nov 2026 … Oct 2027").
- Rename the key `forecast_2026` to `forecast`.

**Done when** a CSV ending in June 2025 shows columns starting at Jul 2025, and the current-month logic in 1.1 reads from the matching column.

### 1.4 Treat missing months as missing, not zero

**Problem.** `resample('MS').sum().fillna(0)` turns months the farmer did not record into **0 kg harvested**, which looks like crop failure and distorts SARIMA.

**Implementation**
- Use `resample('MS').sum(min_count=1)` so empty months become `NaN`.
- Count only real (non-NaN) months for the SARIMA threshold: `observed = ts.notna().sum()`.
- Rules:
  - `observed >= 24` and missing ≤ 20% → interpolate the gaps (`ts.interpolate(limit=2)`), then run SARIMA
  - otherwise → fallback profile, with the reason in `method`
- Keep real zeros: if the farmer wrote `0`, it stays 0.

**Done when** deleting 3 random rows from the 4-year CSV no longer creates 0 kg months in the output.

---

## Phase 2: Honest numbers and wording 🔴

### 2.1 Reframe the evaluation results

**Problem.** The synthetic dataset was generated from `seasonal_profiles.json`, the same source used by the fallback, and the noise was lowered to raise the score. The 87% result proves the pipeline works; it does **not** prove real-world accuracy.

**Implementation**
- Update `evaluate_sarima.py` to print both **MAPE** (as used in the paper, on non-zero months, with this rule stated) and the noise level of the dataset used.
- Run and record results for **two datasets**: realistic noise (15%, 5% random failure) and clean noise (8%, 1%).
- Add a **baseline** comparison: "seasonal naïve" (the same month last year). SARIMA is credible if it beats the baseline.
- Panel wording: *"Validated on synthetic data generated from regional seasonal patterns to confirm the pipeline works. Accuracy on real barangay records is future work."*

### 2.2 Fix the meaning of the heatmap percentage

**Problem.** For SARIMA rows, values are divided by the crop's own maximum, so every crop always has a 100% month. It is a **relative seasonal index**, not a likelihood.

**Implementation**
- UI text: *"Season strength compared with this crop's best month (100% = best month)."*
- Show kg as the main value for SARIMA rows (with the range from 3.1), and use % only for profile-based rows.

### 2.3 Remove jargon from farmer-facing text

| Current | Replace with |
|---|---|
| "AI", "SARIMA" in headings | "Harvest Forecast" (keep "SARIMA" only in a small "How this works" note) |
| "Fallback Applied" | "Based on Pasig area averages (not enough of your records yet)" |
| "Seasonality Index" | "Season strength" |
| "Shoulder Season" | "Okay season" |
| Score "8.8 / 10" alone | Show the reasons: "Harvest in Dec: peak · Handles rain well · Ready in ~30 days" |

---

## Phase 3: Model quality 🟠

### 3.1 Choose the SARIMA order per crop

**Problem.** The order `(1,1,1)(1,0,0,12)` is fixed and never tuned.

**Implementation**
- Small AIC grid search per crop: `p,q ∈ {0,1}`, `d ∈ {0,1}`, `P,Q ∈ {0,1}`, `D ∈ {0,1}`, `s=12` (at most 64 fits; skip combinations that fail).
- Return the selected order in the JSON (`"order": [1,1,0], "seasonal_order": [0,1,1,12]`) so it can be shown in a "How this works" tooltip and in the paper.
- Add a 30-second time budget per upload. If it is exceeded, use the default order.

### 3.2 Show uncertainty

- Use `fitted.get_forecast(12)` with `.predicted_mean` and `.conf_int(alpha=0.2)` (80% range).
- UI: "~31 kg (24–38 kg)". A wide range means "use with caution".

### 3.3 Optional: use the live weather in recommendations

- The dashboard already has a weather card. If the next months are rainy-season months (Jun–Nov), give a higher weight to `rain` tolerance; in dry months (Mar–May), give a higher weight to `heat`.
- Keep the formula simple and written down in the paper.

---

## Phase 4: Robustness and security 🟠

| # | Item | Implementation |
|---|---|---|
| 4.1 | **Save results** | Results currently live only in the flash session and disappear on refresh. Store the latest result per seller (`forecast_runs` table: `user_id`, `result` JSON, `source_filename`, `created_at`) and load it in the dashboard props. |
| 4.2 | **Throttle the route** | `->middleware('throttle:5,1')` on `POST /seller/forecasting`, because it starts a CPU-heavy job. |
| 4.3 | **Flexible CSV parsing** | Accept `January 2025`, `Jan 2025`, `2025-01`, and `2025-01-15`. Accept header variations (case-insensitive, `Crop`, `Harvest`, `kg`). Also accept `.xlsx`, as planned originally. |
| 4.4 | **Clear error messages** | Return specific errors: missing column X, unreadable dates on rows 5 and 9, negative harvest values, no crops found. Translate them in the UI. |
| 4.5 | **Unique temp filenames** | `Str::uuid().'.csv'` instead of `time()`. Delete the file in a `finally` block. |
| 4.6 | **Remove hard-coded paths** | `run_sarima.bat` hard-codes `d:\Agrifarm`. Move the Python binary path to `.env` (`FORECAST_PYTHON_BIN`) and `config/services.php`. Use Laravel `Process` with an argument array where possible (no shell string). |
| 4.7 | **Input limits** | Max rows (e.g., 20,000), max crops (e.g., 50), reject harvest values that are negative or unrealistically large. |
| 4.8 | **Fix the missing icon** | The `sync` icon does not exist in `Icon.jsx`. Add it or use an existing icon. |

---

## Phase 5: Farmer UX and translation 🟡

1. **Complete the Filipino translation**: card labels, trait values, table headers, legend, errors, and "CSV up to 5MB". Fix the sidebar label "Taya ng Panahon" (which means *weather forecast*) → **"Pagtataya ng Ani"**.
2. **Simple upload panel**: keep the CSV/Excel picker always visible. The example-download link and File help were removed at the seller’s request; sample files remain in the repository for development.
3. **Full harvest calendar first**: show every crop and all twelve dated months in one heatmap, followed by the three recommendation cards. Narrow screens scroll horizontally with sticky crop names; upload sits below results.
4. **One calendar**: green Peak season, yellow Okay season and red Off-season. Clicking a month reveals its harvest range or seasonal guide; remove the duplicate calendar and unit toggle.
5. **"How this works" note**: 3 short sentences explaining the past-harvest pattern, the area averages, and that the final decision is the farmer's (decision support).
6. **Theme and dark mode**: move inline styles from `Forecasting.jsx` to `seller-forecast.css` and replace hard-coded colors (`#ecfdf5`, `#fee2e2`, …) with theme variables plus `.dark` overrides.
7. **Accessibility**: give the upload zone `role="button"`, `tabIndex=0`, Enter/Space handling, and an `aria-label`. Add a `<caption>` to the heatmap table, and don't rely on color alone (add text such as "Peak/Okay/Low" via `title` or `sr-only`).

---

## Phase 6: Tests 🟠

Required by `GEMINI.md`.

**PHPUnit: `tests/Feature/SellerForecastTest.php`**
- Guests and customers cannot post to `/seller/forecasting` (redirect / 403)
- A suspended seller is blocked
- Validation: missing file, wrong mime type, file larger than 5 MB
- Success path with `ForecastService` mocked → result is saved and returned in props
- Python failure (service returns `null`) → error flash, nothing saved
- The throttle returns 429 after the limit

**Python: `python/tests/test_sarima_forecast.py`**
- ≥24 months → `method: SARIMA`, 12 forecast items with dates
- 12 months → fallback, profile re-ordered to future months
- Missing months are not turned into zeros
- Crops not in the upload appear as `new_crop`
- Invalid headers → JSON error

**Playwright**
- Upload the 1-year sample → 3 cards and the calendar are visible, with the fallback label
- Upload the 4-year sample → kg values are visible, and the cards show the expected harvest month

---

## Phase 7: Deployment decision 🟠 (decide early)

The original batch/shell runner required Windows. The implemented runner calls Python directly using Laravel `Process`. Hosting must allow `proc_open`, a compatible Python interpreter, its dependencies and sufficient request duration; check these capabilities for the actual host before deployment.

| Option | Effort | Notes |
|---|---|---|
| **A. VPS — selected** | Implemented locally | Laravel starts the local Python venv through `Process`. Install and verify the runtime on the target server using the deployment guide. |
| **B. Separate Python micro-API** | Future architecture change | Laravel would post uploads to an authenticated Python endpoint. Relevant if the Laravel host cannot run Python; hosting availability and limits need verification. |
| **C. Precompute** | Low, but limited | Run Python offline, store the results as JSON, and Laravel only reads them. Uploads would no longer be live. Weakest for the "upload your data" story. |

**Decision:** A is the prepared deployment target. B remains an alternative if the final hosting constraints require it. The repository changes do not provision or publish a production server.

---

## Suggested order and estimate

| Order | Work | Estimate |
|---|---|---|
| 1 | Phase 1 (1.1–1.4) logic fixes | ~1 day |
| 2 | Phase 2 wording + evaluation re-run with baseline | ~0.5 day |
| 3 | Phase 4.1–4.5 save results, throttle, parsing, errors | ~0.5 day |
| 4 | Phase 6 tests | ~0.5 day |
| 5 | Phase 5 translation, template, mobile, theme | ~0.5–1 day |
| 6 | Phase 3 order search + confidence ranges | ~0.5 day |
| — | Phase 7 hosting decision | decide before deployment |

## Checklist

- [x] 1.1 Planting-offset recommendations (`crop_metadata.json`; approximate timing inputs documented above)
- [x] 1.2 New-crop recommendations
- [x] 1.3 Real forecast dates in Python output and UI headers
- [x] 1.4 Missing months ≠ zero harvest
- [x] 2.1 Evaluation reframed + seasonal-naïve baseline
- [x] 2.2 Correct percentage explanation
- [x] 2.3 Plain-language labels
- [x] 3.1 Per-crop order selection
- [x] 3.2 Confidence ranges
- [x] 3.3 Seasonal weather-aware weighting (optional; not live weather)
- [x] 4.1–4.8 Robustness and security items
- [x] 5.1–5.7 UX, translation, accessibility
- [x] 6 PHPUnit, Python, and Playwright tests
- [x] 7 Hosting decision: VPS/local Python prepared; production deployment is a separate step
