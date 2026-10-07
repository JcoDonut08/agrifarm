# SARIMA Forecasting Plan (Seller)

Branch: `feature/sarima-seller-forecast`
Status: Original design record; implementation and later UX revisions are documented in [SARIMA Improvements Plan](SARIMA%20Improvements%20Plan.md) and [SARIMA Farmer UX Plan](SARIMA%20Farmer%20UX%20Plan.md).

Current recommendations show a planting month and prominent approximate growing time. Sellers can add a crop to a saved planting plan containing its planting and harvest months, then remove it if needed. Laravel validates and stores these choices per seller; saved dates survive refreshes, new uploads and later months. Future sales, buyer demand and survival probability are not predicted by the current implementation.

Admin Reports can now export actual monthly kilogram harvest totals for one barangay as a CSV that farmers upload directly. Dataset scope and actual record months persist with the result. Barangay kilogram estimates are labeled separately from illustrative seasonal guidance; the 24-recorded-month threshold is unchanged. See the implemented [SARIMA Barangay Harvest Data Plan](SARIMA%20Barangay%20Harvest%20Data%20Plan.md).

## 1. Goal

Give sellers a seasonal planning tool. A seller uploads a CSV or XLSX file of harvest/sales history. AgriFarm then shows:

1. A **seasonality heatmap or bar graph** of every product in the file across the whole year, marking in-season, shoulder, and off-season months.
2. Below it, **three recommendation cards** with the best products to plant or sell, based on:
   - seasonal demand
   - weather survivability
   - possible sales
   - overall demand

## 2. Constraints

| Constraint | Impact |
|---|---|
| About 4-5 days to build | Scope must stay small. Cut features before cutting reliability. |
| About 2 years of real data, which is not enough on its own | Mix with synthetic data modeled on the user's sample file. |
| Seller uploads may be short (a few months) | SARIMA cannot learn seasonality from short series. Needs a fallback. |
| Upload flow stays as is | Upload remains the entry point. The back end adapts to it. |

## 3. Key design decision: train ahead, personalize on upload

SARIMA needs roughly 24-36 monthly points per product (2-3 full yearly cycles) to estimate seasonality. A single seller's upload often will not have that. Asking each upload to teach the model from scratch makes the feature fragile.

Instead:

1. **Offline (once):** train and build a **seasonal profile per crop**, a 12-month index from 0 to 1, from the real data plus synthetic data. This ships with the app.
2. **On upload:** the seller's file **personalizes** the result (their volumes, crops, and recent trend). It does not need to teach seasonality.
3. **Method selection per product:**

| Product history in upload | Method used | UI label |
|---|---|---|
| 24+ monthly points | SARIMA fit on the seller's own data | "Forecast from your data" |
| Fewer than 24 points | Pre-trained seasonal profile, scaled to the seller's volumes | "Based on seasonal profile" |
| No usable data for the product | Seasonal profile only | "Seasonal estimate" |

The page never breaks or shows meaningless output on thin data, and it states which method produced each result.

## 4. Synthetic data policy

- Generate synthetic series from the **sample file the user provides**, matching its columns, units, scale, and crops.
- Include yearly seasonality, a mild trend, random noise, and typhoon/rainy-season dips.
- Keep real and synthetic data in separate files and **label synthetic data clearly** in documentation and any thesis write-up.
- Accuracy measured on synthetic data only shows the pipeline works. It is not evidence of real-world accuracy. Where possible, hold out real data for validation.
- Do not commit the sample file or any real research data to git (see `GEMINI.md`).

## 5. Architecture

```
Seller uploads CSV/XLSX
  -> Laravel validates (type, size, columns, row limit)
  -> Normalize to monthly series per product
  -> Preview: "found N months, M products, method per product"
  -> Python script (statsmodels) -> 12-month forecast + season index
  -> JSON returned to Laravel
  -> Inertia props
  -> React: heatmap + 3 recommendation cards
```

### Back end (Laravel)

- Route, controller, and Form Request under the seller area, with role and ownership enforcement on the server.
- **Parsing:** CSV with built-in PHP. XLSX with `phpoffice/phpspreadsheet` (new dependency).
- **Validation:** allowed extensions and MIME types, max file size, max rows, required columns, numeric and date checks, and a clear error message for each failure.
- **Python bridge:** call `python/sarima_forecast.py` through Laravel's `Process`. Pass normalized data as JSON through stdin or a temp file, read JSON from stdout, apply a timeout, and handle non-zero exit codes.
- **Service class:** `ForecastService` wraps the multi-step workflow (parse, normalize, run, merge with profiles, score). Plain CRUD stays in the controller.
- **Storage:** process the upload and discard the file, or store it only if the seller needs history. Decide in the first day. Never expose raw paths.

### Python component

- `statsmodels` SARIMAX with seasonal period 12 and a small fixed set of orders. Pick the best by AIC and do not tune exhaustively per product.
- Guard clauses: fewer than 24 points, constant series, or a failed fit all fall back to the seasonal profile.
- Output per product: 12-month forecast, season index (0-1), and the method used.
- Runs offline-safe with no network calls.

### Data files

- `storage/app/forecasting/seasonal_profiles.json`: 12-month index per crop.
- `storage/app/forecasting/crop_weather_tolerance.json`: monthly survivability per crop (heat, heavy rain, typhoon season).
- Both are editable by hand and versioned in the repo (these are reference tables, not research data).

### Front end (React/Inertia)

- New seller page, **Forecasting**, linked from the sidebar and from the weather card's "View forecasting" link.
- Reuse existing seller layout, `Icon`, and CSS organization. Add a dedicated stylesheet such as `resources/css/seller-forecast.css`.
- Sections:
  1. Upload (existing style) with a template download link and a preview step.
  2. Heatmap: products as rows, Jan-Dec as columns, colored by season index.
  3. Three recommendation cards, each with a score breakdown.
- Support light and dark themes, responsive layout, accessible labels, and Filipino/English strings via the existing `filipino` prop.

## 6. Recommendation scoring

Each product gets a score from weighted factors, each normalized to 0-1:

| Factor | Source |
|---|---|
| Seasonal demand | Forecast or seasonal profile for upcoming months |
| Weather survivability | Crop tolerance table against the expected season, plus rainy-season/typhoon risk |
| Possible sales | Seller's own uploaded volumes and trend |
| Market demand | AgriFarm order data where available |

- Initial weights are configurable (suggested start: 35 / 25 / 20 / 20).
- The top three scoring products fill the three cards.
- Each card shows the score breakdown so the result is explainable.

## 7. Upload improvements

The upload style stays as is. These are additive:

| Item | Priority |
|---|---|
| Downloadable CSV template (`date, product, quantity, unit`) | Do |
| Upload preview and validation ("found 14 months, 6 products, method per product") | Do |
| "Use my AgriFarm harvest records" button, using the existing `HarvestRecord` data | Do if time allows |
| Manual monthly entry form | Skip unless time is left |

## 8. Timeline (4-5 days)

| Day | Work |
|---|---|
| 1 | Review the sample file, generate synthetic data, define the CSV template, build seasonal profile and tolerance tables |
| 2 | Python SARIMA script with fallback logic, tested against synthetic data |
| 3 | Laravel upload endpoint, validation, Python bridge, `ForecastService`, feature tests |
| 4 | React page: upload, preview, heatmap, three cards, English/Filipino |
| 5 | Polish, edge cases, documentation, full test and build run |

**If time runs short, cut in this order:** manual entry, XLSX support, "use my records" button, dark-mode polish. Do **not** cut the seasonal-profile fallback.

## 9. Testing

- **Feature tests (PHPUnit):** auth and role checks, file type and size rejection, missing columns, malformed rows, short-series fallback, valid upload returns expected Inertia props, one seller cannot see another seller's results.
- **Python:** unit tests for fit, fallback on short or constant series, and output shape.
- **Playwright:** upload a valid file and see the heatmap and three cards; upload an invalid file and see the error.
- **Checks to run:** `php artisan test`, `vendor\bin\pint --test`, `npm run build`, `npm run test:e2e`.

## 10. Risks

| Risk | Mitigation |
|---|---|
| Short or messy uploads | Seasonal-profile fallback, preview step, template |
| Synthetic data overstates accuracy | Label it clearly, validate on held-out real data |
| Python missing or failing on the server | Check at startup, timeout, clear error, fallback to profiles |
| XLSX parsing edge cases | Ship CSV first, add XLSX second |
| Large files | Row and size limits, reject early |
| Scope creep | Follow the cut order in section 8 |

## 11. Open items (needed from the user)

1. The **sample data file** (place in `docs/sample-data/`, do not commit).
2. The **in-scope crop list** (about 10-20 crops).
3. Whether this is a thesis or capstone with a panel, which changes how synthetic data must be documented.
4. Final placement: new "Forecasting" sidebar page or inside the weather card's forecasting view.

## 12. Working rules

- All work stays local on `feature/sarima-seller-forecast`.
- **No `git commit` or `git push` until the user explicitly says so.**
- Follow `GEMINI.md`: Laravel owns validation and authorization, Eloquent directly, no repository layers, Filipino translations inline with English fallback.
