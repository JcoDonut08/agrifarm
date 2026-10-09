# SARIMA barangay harvest data plan

**Status:** Implemented locally. Admin export and barangay-aware import are available; production deployment and accuracy evaluation on independent real records remain outstanding.
**Date:** 6 October 2026.

## Goal

Let CENRO provide farmers with a forecasting-ready file made from actual harvest records already stored in AgriFarm. Farmers can upload that file through the existing forecasting interface instead of preparing a spreadsheet themselves.

The forecast represents the selected barangay's recorded harvest production. It must retain that scope throughout the calendar, recommendations and estimated kilogram ranges.

## Agreed flow

1. **Admin selects a barangay and date range.** Export its actual harvest records as monthly totals per crop.
2. **Preview and download a clean Excel or CSV file:** `Month`, `Vegetable Crop`, `Harvest (kg)`, and `Barangay`. Use recorded kilogram quantities or measured harvest weights and keep missing months distinct from confirmed zero harvests.
3. **Admin gives the file to the farmers.** They upload it through the existing large box and click **Generate**.
4. **Show the correct source:** “Based on Rosario harvest records,” for example. The harvest estimates describe the barangay's recorded production.

Initial delivery uses manual file sharing by the admin. Direct generation from a farmer's barangay records can be considered later.

## Current implementation

- Sellers enter dated harvest records linked to their products. Records include product name, quantity, unit and an optional measured total weight in kg for non-kg harvests.
- Admin reports can export CSV/Excel, but their current harvest report combines quantities across the selected period. Its presentation headings, formatted quantities and period totals are unsuitable for the forecasting importer.
- Forecasting accepts CSV/Excel files with monthly crop quantities and stores each seller's result privately.
- Admin Reports now has a separate forecasting export with a report-style monthly preview and Excel/CSV downloads. Existing presentation reports remain available.
- The parser validates the optional Barangay column and saves dataset scope and actual month coverage with the result. Existing personal uploads remain supported.
- The farmer interface already supports the large upload box, centered Generate button, generation animation, full calendar, pictured recommendations and saved planting choices.
- A short-history note is already implemented for uploaded crops using seasonal references because they have fewer than 24 recorded months.

## Admin export

Add a dedicated **Export for forecasting** action in Admin Reports. Keep the existing presentation reports available.

The admin chooses one barangay, a start date and an end date. Before downloading, show the selected scope, available record dates, crops and any unit problems. An empty selection should show a useful message instead of downloading an empty file.

Laravel must authorize the admin and query the harvest records directly. Aggregate by barangay, calendar month and consistent crop name, then order by month and crop. Use harvest dates rather than sale dates. Include records within the selected range and identify partial first/last months when the range does not cover complete months.

The file contains only the header and data rows. Do not add a report title, generated-date preamble, totals row or merged cells. A suitable filename is `agrifarm-rosario-harvest-2025-01-to-2026-12.csv`.

## CSV and Excel contract

```csv
Month,Vegetable Crop,Harvest (kg),Barangay
```

| Column | Requirement |
| --- | --- |
| Month | `YYYY-MM`, derived from the actual harvest date. |
| Vegetable Crop | Consistent crop name. Combine matching crop records within the month; avoid silent guesses when product names differ. |
| Harvest (kg) | Plain numeric monthly total in kilograms, without currency, a unit suffix or thousands separators. |
| Barangay | One non-empty barangay value, consistent across the entire file. |

- Export actual recorded quantities. Synthetic sample files remain testing fixtures.
- The harvest form supports kg, bunch, piece, head and pack. For non-kg units, farmers can enter **Total harvest weight (kg)**, measured for the whole harvest, in Record Harvest or Edit. The exporter uses that measured weight; kg records use their quantity. Never assume a weight per piece/bunch or add different units together. Non-kg records without a measured weight still block export.
- A month with no entries is unknown; omit it rather than creating a zero. The current harvest form accepts positive quantities only, so it does not yet establish confirmed zero-harvest months. A separate recording decision is needed before the exporter can create such rows.
- Validate the generated file against the existing upload limits: 5 MB, 20,000 rows, 50 crops and numeric values from 0 to 1,000,000 kg per row. If a monthly total exceeds a limit, explain it rather than clipping the value.
- Include aggregate crop/month data, without farmer names, contact details, prices or sales totals.
- CSV and Excel use the same four headers in the first row. Excel's first worksheet contains plain monthly rows with numeric kilogram cells; report branding and summaries appear only in the on-screen preview so the file can be uploaded directly.
- A reporting range ending in December does not establish records for future or unrecorded months. The forecast starts after the latest actual record month.

## Farmer import and source labels

Preserve the existing upload workflow and personal harvest-file support.

For files containing Barangay:

- Validate every row's barangay and reject empty or mixed barangay values. The current crop grouping would otherwise merge different barangays into one series.
- Preserve the barangay and actual record coverage in the saved forecast result. Source labels must survive refresh and later visits.
- Show a concise scope label such as **Harvest records: Rosario** and make dated kilogram estimates clearly refer to Rosario's recorded production.
- Use **Based on Rosario harvest records** for estimates derived from that uploaded history. Keep **Seasonal planting guide** for reference-based results and label their reference source correctly.
- Do not describe reference-only new crops or suggestions outside the saved forecast dates as estimates learned from the barangay upload.
- Treat a CSV's barangay value as uploaded data. Its filename or column does not prove that CENRO issued or independently verified the file.
- Store imported results under the signed-in seller, preserving the existing ownership rules for forecasts and planting plans. Importing a file must not grant access to another seller's records.

Keep English and Filipino labels short. Place additional source explanations in the existing details sections rather than adding another calendar or expanding the cards with technical text.

## Minimum history

The SARIMA eligibility rule remains **at least 24 recorded months per crop**, subject to the existing missing-data and fitting checks.

- A complete single-year file has only 12 monthly observations per crop, even when it combines many farms in the barangay.
- Short histories are accepted and use the existing seasonal references where available. Retain the note: **Some crops have fewer than 24 recorded months. Their guide uses seasonal references.**
- Having 24 months does not guarantee a successful fit. Missing records or fitting failures can still require reference guidance.
- The seasonal references are currently illustrative. This plan does not introduce a new mode that learns a reliable annual forecast from one year of observations.
- Unknown crops without enough history or a reference remain unavailable.

## Selling-activity follow-up — 7 October 2026

Planting recommendations now consider combined selling activity from the barangay, as requested. The uploaded barangay selects the market scope; personal uploads use the seller's current barangay. A seller without a barangay uses their own selling records. Only aggregate counts and quantities appear in recommendations, without other sellers' orders, customer details, prices or revenue.

- Keep the current SARIMA engine and seasonal-guide rules. Automatic comparison with the same-month-last-year forecasting method remains future work.
- Use `delivered` orders with a recorded `delivered_at` within the last 24 months plus the current month; exclude future delivery dates. Marketplace and walk-in orders share this table. Delivery confirmation records server time in UTC; monthly and daily activity use Philippine time. Older deliveries with an unknown date remain in all-time sales totals but cannot establish recent or seasonal selling activity.
- Prefer sales in the expected harvest month when at least three completed orders occur across two prior years. Exclude the current, incomplete month from that historical comparison. Otherwise use the last 90 days and label them recent sales.
- Count distinct seller/checkout receipts, or individual walk-in orders. Repeated crop lines within a checkout do not inflate frequency. At least three orders on two dates are required for an adjustment. Sparse or absent records leave the rank unchanged; cards omit the selling summary when evidence is insufficient.
- The selling score is a heuristic: `min(10, 2 × completed orders ÷ period months)`, with two observed harvest-month periods or three recent months. Five orders per month reaches 10. These thresholds are planning choices, not validated measures of demand.
- Show current stock separately from past sales. For recent activity only, subtract two selling-score points if current stock exceeds sales in any matching unit. Keep separate kg/bunch/piece/head/pack quantities; normalize singular/plural unit spellings without converting weights. Units without recorded sales provide no stock penalty. Historical offered-stock snapshots are unavailable, so no historical sell-through percentage is claimed.
- Start with the existing season/weather score, then add `(selling score − 5) ÷ 5`, bounded to ±1 point. Clamp the final rank to 0–10. Off-season crops (strength below 0.4) cannot receive a selling bonus. This is an adjustment to planning rules, without predicting future sales or profitability.
- Match crop names by case and whitespace only; do not guess English/Filipino aliases. Existing product editing can change order names/units, so historical product snapshots and canonical crop mapping remain separate improvements.
- Cards show one concise selling-activity line when evidence is sufficient. **Why this crop?** shows actual completed-order counts, the barangay, delivery periods, quantities sold and current stock in both languages. Crops without completed orders omit the selling section entirely. General limitations and ranking rules stay in the shared help sections, instead of repeating on every card. Evidence is recalculated on page load and when validating a planting-plan save, without refitting or changing saved harvest estimates.

Implementation: `ForecastSellingActivityService`, `ForecastRecommendationService`, seller dashboard/planting-plan controllers, and the recommendation cards. No new database columns or dependencies are required.

Verification on 7 October: **52 focused Laravel tests passed (523 assertions)**, including seven selling-activity tests for scope, ranking changes, sparse data, harvest-month history, order status/date filtering, receipt deduplication, units, stock and planting-plan validation. **Two browser flows passed**: selling-activity explanations and existing planting-plan saving/removal. Cards and expanded explanations were checked at 390/768/1440 px in both languages and themes, including button alignment, aggregate privacy and refresh persistence. Build, scoped Pint and whitespace checks passed. Python and the unrelated repository suites were not rerun; the forecast engine is unchanged.

UI cleanup on 7 October: removed repetitive empty-selling messages and card-level limitations; kept actual sales evidence and shared explanations. Corrected broken characters in seller/admin footers, dates, currency and storefront text. Made report preview labels and harvest view/delete dialogs consistent with the selected language, and fixed clipped empty-report text on mobile. Six distinct browser flows passed across the two focused runs: selling activity, planting plans, harvest weights/dialogs, storefront/about, admin reports and seller analytics/harvest empty states. Relevant pages were checked at 390/768/1440 px in light/dark themes, with English/Filipino coverage. The production build and whitespace checks passed; no backend or forecast-engine changes were needed for this cleanup.

## Implementation checklist

- [x] Add the admin barangay/date selection and forecasting export action.
- [x] Implement authorized Laravel aggregation and a plain CSV response.
- [x] Handle empty selections, partial periods, inconsistent names and non-kg quantities clearly.
- [x] Validate the optional Barangay column without breaking existing personal uploads.
- [x] Preserve dataset scope and record coverage in saved forecast results.
- [x] Update calendar, recommendation and kilogram-estimate source labels for barangay datasets.
- [x] Retain the short-history note, current forecast rules and existing upload animations.
- [x] Add focused export/import tests and browser coverage.
- [x] Update deployment and UX documentation after implementation.

## Implementation details

- Admin Reports uses the shared From/To dates and a separate barangay selector. Generate preview shows coverage and blocking issues. A valid selection also displays the existing report-paper layout with barangay, reporting period, generation date, crop/month counts, total harvest weight and a paginated monthly table. Excel is the default format; CSV remains available. Downloads include every row, regardless of the preview page.
- Admin-only GET routes are `/admin/reports/harvest-forecast/preview` and `/admin/reports/harvest-forecast/download`. Both validate the selection and recompute from stored records; a successful preview cannot bypass later changes or export checks.
- The download route defaults to a streamed CSV. With `format=xlsx`, it returns freshly validated aggregate data and the filename to the existing browser ExcelJS exporter, which creates the workbook. Missing weights or other export failures block both formats. No spreadsheet dependency or database migration is added for this feature.
- Monthly quantities are summed as integer grams to preserve the records' three-decimal kilogram precision. Case/spacing variants, empty/oversized names and spreadsheet formula prefixes are blocked; distinct crop names are kept separate rather than guessed to be aliases.
- Export attribution uses the seller's currently stored barangay, because harvest records have no historical barangay snapshot. If an account moves barangays, historical attribution changes. A future snapshot migration needs a separate data decision.
- The result JSON adds `dataset` with `scope`, `barangay`, `record_start_month` and `record_end_month`. Existing saved results without this metadata remain compatible. Dataset metadata needs no new table; measured harvest weights require the additive `2026_10_06_000002_add_measured_weight_to_harvest_records` migration.
- Record-based suggestions have source `barangay_history`; personal estimates keep `farm_history`; references and dates outside the fitted horizon keep `area_profile`.
- Forecast uploads use a named five-attempt-per-minute counter per seller, so recording harvests does not consume the forecast allowance.
- The export uses quantities recorded with unit `kg`, or `measured_weight_kg` for non-kg records. This is a farmer-entered measurement, not an independent approval or automatic conversion. The nullable three-decimal field leaves old records unchanged; farmers can add a known measured weight through Edit. Clearing the field makes a non-kg record unavailable for export again. Selling units, inventory, sales and kilogram upload rules remain separate.

## Acceptance checks

- An authorized admin exports the correct monthly crop totals for one selected barangay and date range; customer/seller accounts cannot call the admin export.
- Different barangays remain separate. Non-kg quantities, missing months and inconsistent crop names never silently produce misleading totals.
- Both exported CSV and Excel files upload through the farmer interface without spreadsheet editing.
- A one-year export generates eligible reference guidance with the short-history note. A suitable two-or-more-year dataset can produce SARIMA estimates.
- Barangay source labels persist after refresh and remain distinct from seasonal references and personal uploads.
- Failed imports preserve the previous forecast and selected file. Successful imports retain the existing focus, loading animation and reduced-motion behavior.
- Existing CSV/Excel uploads and planting-plan saving/removal continue to work.
- Inspect admin export and farmer import at 390px, 768px and 1440px, in both themes and languages.

## Local verification — 6 October 2026

- Focused Laravel harvest weight, export, forecast and planting-plan tests: **45 passed, 480 assertions**. Covers measured-weight saving/editing/clearing, retained selling units and inventory, legacy unit correction, admin authorization, exact monthly quantities and preview summaries, fresh Excel export data, gaps, unit/name/limit failures, metadata persistence, independent upload throttling and personal-file compatibility.
- Python forecast/import tests: **30 passed**. Includes CSV/Excel barangay validation, short-history guidance, retained zeros/missing months, fitted barangay histories and legacy personal data.
- Browser checks: **3 passed** — the complete admin-to-farmer CSV flow, existing Filipino Excel/error flow, and seller planting-plan saving/removal. Admin export and barangay calendar/cards were checked at **390, 768 and 1440 px**, in English/Filipino and light/dark themes.
- Frontend build, scoped Pint and `git diff --check` passed. The build retains existing public-image resolution and bundle-size warnings.
- Measured-weight follow-up: **2 browser checks passed**, covering the new form at 390/768/1440 px in both languages/themes, adding weight to an old non-kg record, CSV quantities, upload compatibility, and the existing barangay forecasting flow. The nullable weight migration was applied to the local database. Unweighed historical records were not converted or backfilled.

- Excel/preview follow-up: **2 browser checks passed**, covering a real downloaded workbook's first-sheet headers and numeric kg cells, direct farmer Excel upload, CSV exports containing all rows, preview pagination, missing-weight blocking and the measured-weight edit flow. The monthly preview was inspected at 390/768/1440 px in both languages/themes. Mobile shows Month, Crop and Harvest (kg); the barangay stays in the report heading and all download rows.

The browser flow creates harvest records in the isolated Playwright database and uploads the actual admin-exported Excel/CSV files. This verifies the workflow, not the accuracy of forecasts on independently collected farm measurements. The complete unrelated repository test suite was not run.

## Related documents

- [SARIMA Improvements Plan](SARIMA%20Improvements%20Plan.md): current forecast rules and safeguards.
- [SARIMA Farmer UX Plan](SARIMA%20Farmer%20UX%20Plan.md): current farmer interface and short-history note.
- [SARIMA Deployment](SARIMA%20Deployment.md): runtime setup and upload limits.
