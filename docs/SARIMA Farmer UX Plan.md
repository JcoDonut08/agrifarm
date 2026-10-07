# SARIMA farmer interface flow

**Status:** Full calendar, simplified upload and saved planting choices implemented and verified locally on 6 October 2026.

## Accepted flow

1. **Seller uploads harvest records.** Show a large CSV/Excel drop area with centered file details and one centered primary action underneath.
2. **The upload section moves below the results and stays visible.** Focus and scroll to the harvest calendar after success. Use a regular heading with no collapse arrow. Keep failed selections and retain the last saved result after an error.
3. **Show the visual harvest calendar first.** Put a small crop picture next to each crop. Show every crop and all twelve dated months immediately. Use green for Peak season, yellow for Okay season and red for Off-season. Avoid percentages and model jargon in the default chart.
4. **Show three recommended crops below the calendar.** Each recommendation has a crop picture, seasonal weather suitability, harvest-month strength, planting month, expected harvest date, prominent approximate growing time and a kg range when a dated farm estimate exists.
5. **Save chosen crops to Your planting plan.** Each card has an Add to my planting plan button. Show the saved crop pictures and planting/harvest months below recommendations, with a Remove action.
6. **Put updating records and explanations below.** Keep month harvest details, Why this crop, How this works and model references available on demand.

This supersedes the earlier compact calendar with month paging, hidden crops and a separate detailed calendar.

## Upload and generation feedback

- Use a large, full-width dashed upload box with its icon, file details and Choose/Change file control centered. Center the Generate action (Bumuo in Filipino) below the box on every screen size. Show the selected filename and size directly in the picker, with an accessible Remove action in the upper-right corner. Keep long filenames readable without horizontal overflow.
- Use a native keyboard-accessible file button, preserve drag/drop and show upload errors beside the file. Removing a selection returns focus to the picker; failed submissions retain the selected file and the last saved calendar.
- While the request is running, disable file changes and generation, announce Preparing your planting guide and show a small spinner with a subtle moving loading line. The line is indeterminate, with no invented percentage or simulated processing steps.
- After a successful generation, reveal the calendar and recommendations with a short fade and upward movement, focus the calendar heading and scroll smoothly to it. Ordinary page loads, saves and failed generations do not replay the reveal.
- Honor reduced-motion preferences: disable spinning, gliding and the result reveal, and use immediate scrolling. Keep the loading message and a static line visible.

The restored large-box layout passed the Vite build and dedicated upload browser scenario. Empty, selected, preparing and saved states were checked at all three widths in both themes; browser assertions verify a large upload area and a centered action below it. The existing generation animation, reduced-motion behavior, keyboard access and error recovery continue to pass.

Verified locally on 6 October 2026: the Vite build, existing English CSV forecast, Filipino Excel/error persistence and planting-plan browser scenarios passed. The dedicated upload scenario passed after correcting focus timing for rendered results and validation errors. It checks keyboard file choice and tab order, removing/changing files, long filenames, duplicate-submit prevention, disabled controls, loading motion, reduced motion, success-only reveal, refresh, both server error paths and a successful retry. Empty, selected, preparing and saved upload states were inspected at 390px, 768px and 1440px in light/dark themes. Laravel and Python behavior was unchanged; their test suites were not repeated.

## Visual calendar

- Show one complete heatmap: every uploaded/reference crop and all twelve forecast months. Remove paging, crop expansion and the second calendar.
- Fit the whole year on desktop; use contained horizontal scrolling on narrower screens. Keep crop names and pictures sticky while scrolling sideways.
- List uploaded crops before reference-only new crops. Keep sources short: Your records, Seasonal guide or No forecast.
- If an uploaded crop uses a seasonal reference because it has fewer than 24 recorded months, show one short note under the calendar introduction: Some crops have fewer than 24 recorded months. Their guide uses seasonal references. Translate the note in Filipino. Use the backend's Insufficient Data reason; reference-only new crops, unavailable crops and other fallback reasons must not trigger this note by themselves.
- Use consistent crop pictures and distinguish Peak season (green), Okay season (yellow) and Off-season (red) with plain color cells, a labeled legend and accessible season labels. These categories retain the existing relative harvest-strength thresholds; they do not measure survival probability.
- A month button shows that crop's dated harvest details above the heatmap, staying visible as the seller scrolls through crops. Farm estimates retain their range, including zero bounds and broad intervals. Reference guides show seasonal guidance without invented kilos.
- Unknown crops use a neutral plant placeholder and dashed cells with a question mark. Missing estimates remain distinct from red Off-season cells.
- Keep crop names, month/year dates, keyboard access, captions and text alternatives to color readable at 390px, 768px and 1440px.

The short-history note passed the Vite build and two forecast browser scenarios. The English CSV flow verifies that a one-year upload shows the note and a four-year upload removes it, while reference-only new crops do not trigger it. The Filipino Excel flow verifies the translated note and retained results after upload errors. The calendar note was visually inspected at all three widths in both themes. PHP and Python were unchanged and their suites were not repeated.

## Recommended crops

Default card:

- Crop picture and name; New crop for you only where applicable.
- Plain weather suitability, such as Handles rain well or Better suited to heat.
- Strong harvest months: [month names], listing all green peak-season months for that crop in the displayed calendar. Use the same 0.7 threshold and farm/reference values as the calendar; if none qualify, say no strong months are shown. Month names follow the calendar's date order and language.
- About **[number] days**, shown more prominently for comparison.
- Plant in [month/year].
- Harvest around [month/year].
- Estimated harvest: [lower–upper] kg when a matching farm forecast exists; otherwise Seasonal planting guide.
- Add to my planting plan; after saving, show Saved to planting plan and prevent a duplicate selection for that crop/month.
- Collapsed Why this crop with source, ranking, weather breakdown, approximate growing-time assumptions and explanations of wide ranges or dates outside the saved forecast.

Side-by-side recommendation cards share content rows and equal heights. Wrapped month lists or translated labels must keep growing times, dates, planting-plan buttons and Why this crop summaries aligned. On phones, each stacked card uses its own natural row heights.

The uniform-card layout passed the Vite build and the planting-plan browser scenario. Browser checks verify equal card heights and aligned content rows at tablet and desktop widths in both languages, including an expanded Why this crop disclosure. Screenshots were inspected at 390px, 768px and 1440px in light and dark themes. PHP and Python were unchanged and their tests were not repeated for this CSS change.

Retain Laravel's ranking: 60% harvest-season strength and 40% seasonal rain/heat suitability, with at most two new crops among three recommendations. These are seasonal reference factors, not a live months-ahead weather prediction or a survival probability.

The month-list revision passed the Vite build and the planting-plan browser scenario. The browser assertions compare each card's month list with that crop's green calendar cells in English and Filipino; screenshots were inspected at 390px, 768px and 1440px, including light and dark themes. PHP and Python were unchanged and their tests were not repeated for this presentation change.

## Saved planting choices

- Save the chosen crop, planting month, harvest month and approximate growing time in seller-owned `planting_plans`.
- Laravel derives dates from the seller's latest saved forecast and current recommendations. Ignore submitted ownership, harvest dates and growing times; reject outdated planting months or crops no longer recommended.
- Keep one entry per seller/crop/planting month. A later month can have a separate entry for the same crop.
- Focus and scroll to Your planting plan after saving. Keep the list available after refresh or a new upload; existing dates remain as saved when the current month changes.
- Show crop pictures and dates in a simple list, with owner-only removal. Hide the section when empty.
- Keep buttons, notices, errors and saved dates in English and Filipino. This records a choice; it does not mark the crop as planted or harvested.

## Sales and demand boundary

The current SARIMA model forecasts monthly harvest patterns. It does not predict future sales, price or buyer demand. Crop suggestions therefore use supported harvest and weather factors; they must not claim High sales, High demand or guaranteed profit.

As of 7 October 2026, cards also show observed selling activity from the relevant barangay when evidence is sufficient, with one short line and actual completed-order counts, periods and per-unit stock inside Why this crop. Crops without completed orders omit the selling section. Sparse records leave the rank unchanged without repeated insufficient-data messages. Enough recorded activity can adjust the planting rank by at most one point. General explanations stay in the shared help sections. This is a planning heuristic, not a forecast of future demand. A future demand forecast still requires separate validation. Marketplace demonstration scores are not used as forecasting data. See the [barangay data plan](SARIMA%20Barangay%20Harvest%20Data%20Plan.md) for the exact thresholds and scope.

## Upload and help

- Preserve CSV/text CSV and Excel uploads up to 5 MB, keyboard selection, drag/drop, removal and processing feedback.
- Remove the example-download link and File help from the page. Keep the upload/update section permanently visible with no expand/collapse control.
- Show specific validation errors when needed.
- Show a short update date near the results and the full saved filename in Update harvest records.
- Keep English and Filipino labels, validation messages and accessible names in sync.
- Preserve scientific limitations and agriculture references inside collapsed help.
- For barangay files, show Harvest records: [barangay] and the actual record months above the calendar. Record-based crop rows say Barangay records; their kilogram ranges name the barangay. Why this crop? distinguishes barangay history from illustrative seasonal references, including suggestions outside the saved forecast dates.
- Reject empty or mixed barangays with translated errors while preserving the previous result. Keep the existing short-history note for crops using references with fewer than 24 recorded months.

## Implementation checklist

- [x] Put the visual calendar before recommendations and move upload below results.
- [x] Add crop pictures to calendar rows and recommendations.
- [x] Show all crops and twelve months in one heatmap with sticky crop names and month details.
- [x] Show weather suitability, harvest-season strength and harvest timing directly on recommendations.
- [x] Preserve quantities, sources, saved results, upload interactions and translations; keep upload visible without a toggle.
- [x] Add per-card planting months and prominent growing times.
- [x] Save/remove seller-owned planting choices with fixed dates, duplicate protection and translated controls.
- [x] Update browser coverage and documentation.
- [x] Build and inspect all three widths in light/dark themes; verify uploads, full-calendar scrolling, errors and persistence.

Files: `resources/js/Pages/Seller/Forecasting.jsx`, `resources/css/seller-forecast.css`, `public/images/forecast-crops.png`, `tests/e2e/forecasting.spec.js`, `tests/e2e/forecast-upload.spec.js`, `tests/e2e/planting-plans.spec.js`, `tests/Feature/SellerPlantingPlanTest.php`, the planting-plan model/request/controller/migration, dashboard props and the SARIMA documentation.

The saved-plan feature adds a Laravel model, migration, request, controller and routes, plus the dashboard plantingPlans prop. Forecasting and ranking rules are unchanged; Python needs no changes.

## Verification

The full-calendar revision passed the Vite build and all six forecasting browser scenarios. The rendered page was inspected at 390px, 768px and 1440px in light and dark themes, including content below the fold. Browser checks verify that successful uploads focus the calendar, the calendar precedes recommendations, and uploading sits below them; crop images load successfully; all twelve months and every crop are present immediately in one table; green/yellow/red colors match the legend in both themes; crop names stay visible during horizontal scrolling; keyboard month selection displays the correct details; fresh uploads clear old selections; and CSV/Excel uploads, Filipino errors, drag/drop and saved-result refresh continue working. Expired forecasts never supply old quantities to future recommendations, and unknown crops remain unavailable.

A final visual check after the dark-mode yellow adjustment passed at all three widths in both themes. It also verified that the whole year fits at 1440px and that selecting a crop at the bottom keeps its month details visible.

The subsequent upload simplification passed the build and two focused browser scenarios: English CSV uploads at 390px and Filipino Excel uploads with row/column errors and refresh persistence. The upload panel was inspected at 390px, 768px and 1440px in both themes. The example-download link, File help and upload collapse arrow are absent; file selection remains visible after success, failure and refresh.

Python was not repeated for these changes because the forecasting engine is unchanged. Existing Vite image-path/bundle warnings remain; the crop atlas was verified through a successful browser image response.

The saved-plan feature passed all 29 focused forecast/planting-plan Laravel tests, the Vite build and scoped Pint checks. Three browser scenarios covered English CSV forecasts, Filipino Excel/error persistence and the new planting-plan flow. Cards and saved plans were inspected at 390px, 768px and 1440px in both themes, including English and Filipino labels. Checks verified keyboard saving, focus on the saved plan, fixed dates after refresh, duplicate prevention, removal, the empty state and recovery from a stale planting-month error. A focused repeat confirmed the final Filipino growing-time layout and error recovery. The new migration was applied locally; Python and the broader unrelated PHP suite were not repeated.

## Crop picture asset

`public/images/forecast-crops.png` is a single generated crop-reference atlas, made with the built-in image generation tool. These are illustrative crop pictures, not seller product photographs or evidence about yield. Four columns and five rows follow the crop order recorded in `picturedCrops` in the component.

Final generation prompt:

```text
Use case: product-mockup. Asset type: a single crop thumbnail atlas for an agricultural web app. Create ONE contact sheet laid out in EXACTLY four columns and five rows, 20 equal square tiles, no gaps, no dividers, no text, no numbers. Each tile is a close-up studio photograph of the specified fresh harvested vegetable centered on an identical warm off-white background, soft daylight, detailed realistic texture, recognizable silhouette, isolated produce fills 75 percent of tile with breathing room, no baskets, no people. Exact row-major order: Row 1: red tomatoes (Kamatis), long purple Asian eggplants (Talong), green okra pods, water spinach bundle with narrow leaves and hollow green stems (Kangkong). Row 2: bok choy heads with broad green leaves and white stalks (Pechay), broad ruffled mustard greens (Mustasa), orange-fleshed squash wedge and small whole squash (Kalabasa), green knobbly bitter melon (Ampalaya). Row 3: long yardlong beans (Sitaw), small red and green chili peppers (Sili), Malabar spinach with thick round green leaves and reddish stems (Alugbati), frilly green lettuce head. Row 4: white daikon radish with green tops (Labanos), ridged green sponge gourd (Patola), brown taro corms with a white cut corm (Gabi), jute mallow leaves on slender stems with pointed serrated leaves (Saluyot). Row 5: spinach leaves, small green calamansi citrus and one cut half, beige ginger rhizomes (Luya), moringa branches with many small oval leaflets (Malunggay). Four columns, five rows is mandatory. All crops must stay entirely inside their own equal tile. Style must remain consistent across the atlas. No lettering or watermarks. Tall 4:5 canvas to make all tiles square.
```
