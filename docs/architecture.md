# AgriFarm architecture

AgriFarm is a Laravel monolith with a React/Inertia interface. Laravel owns validation, authorization, persistence, and business rules; React owns rendering and transient interaction state.

```text
Browser -> route -> controller/request -> Eloquent -> PostgreSQL
        <- Inertia page props <- React page/components
```

## Current feature areas

```text
app/
  Http/Controllers/
    Auth/                    registration, login OTP, password reset
    Admin/                   dashboard, seller account management, tasks
    Seller/                  inventory, orders, profile
    StorefrontController     public catalog, search, rankings, reviews, shops
    ProductReviewController  customer review CRUD
    CustomerCheckoutController  COD orders, stock locks, price snapshots
  Models/                    users, products, reviews, walk-in orders, account-status history
  Services/                  dashboard analytics and admin seller serialization
  Services/Auth/             multi-step authentication workflows
resources/js/
  Components/Storefront/     shared storefront controls and product/review UI
  Layouts/                   storefront and role workspace shells
  Pages/                     customer, seller, admin, legal, product/shop pages
resources/css/
  storefront.css             customer storefront and public seller shops
  seller.css                 seller workspace
tests/
  Feature/                   authorization, validation, persistence, page props
  e2e/                       responsive browser interactions and accessibility
```

## Rules

- Use Eloquent as the data-access layer; do not add repositories.
- Keep simple CRUD in controllers. Use services and database transactions for multi-write workflows such as order placement, payment, stock reservation, or analytics generation.
- Protect seller-owned resources server-side. Public routes expose only intentionally mapped storefront fields and safe image responses.
- Product-card photos use pre-generated WebP copies through the existing authorized image routes. Full images remain available for details; image requests never perform thumbnail generation. See [Product Image Optimization](Product%20Image%20Optimization.md) for PHP setup and existing-image generation.
- Seller accounts persist their barangay and current account status. CENRO-only routes create/edit seller accounts and append immutable suspension/reinstatement history records.
- Active-account middleware rejects suspended seller sessions and hides their marketplace presence. A separate seller middleware directs administrator-created accounts to replace their temporary password before seller-dashboard access.
- Web requests use Laravel's `AuthenticateSession` middleware. A login listener records the password fingerprint immediately; password changes invalidate other tracked sessions on their next request while the editing session receives the updated fingerprint. Verified password-reset grants are tied to the password they verified and checked again under the user-row lock before writing. See [Account Session Security](Account%20Session%20Security.md) for legacy-session rollout behavior.
- Query-string storefront pages preserve shareable URLs. Review pagination uses `review_page`; marketplace pagination uses `market_page`.
- Cart/favorites remain client-side. COD checkout uses a UUID-keyed header and transactional, locked stock decrements; each seller receives one line in their existing Orders workspace.
- Seller product deletion locks the selected products and rejects any pending, reserved, preparing, or out-for-delivery order. Bulk deletion checks the entire selection before deleting anything. Photos are removed after the transaction succeeds; delivered/cancelled orders retain their historical snapshots when a product is deleted.
- Delivery confirmation records a server-controlled UTC `walk_in_orders.delivered_at` inside the status transaction. Completed-sales charts, date-filtered reports, downloads, and forecast selling evidence use this timestamp in Philippine time. Older delivered orders retain a null date; all-time totals include them, while dated reports/charts and seasonal activity exclude them with a visible explanation. Order-placement dates remain available separately.
- Kuya Ani order lookup uses `Customer/ChatbotOrderController`. Both chatbot endpoints require an authenticated customer and share a 30-request-per-minute limit. Queries are scoped to that customer's checkout ownership; another customer's reference returns the same `not_found` result as an unknown reference. Responses contain order references, item summaries, and statuses without delivery/contact details. Guests receive a sign-in prompt in the assistant.
- Add directories and abstractions only when a real feature needs them.

## Deferred boundary

`ForecastSellingActivityService` aggregates delivered orders from the forecast's barangay (or the seller's current barangay for personal uploads), without exposing customer/order details. Past harvest-month activity takes priority when two years and enough completed orders are available; otherwise it uses recent 90-day activity. Stock is kept separate by unit and compared only with matching recent sold quantities. The existing season/weather rank receives a bounded one-point adjustment; sparse history stays neutral. The dashboard and planting-plan controller recompute the same selling evidence, while saved Python harvest forecasts remain unchanged. This is an observed-activity heuristic, not a future-demand forecast.

The three-crop shortlist makes room for a reference crop outside the uploaded records when a suitable option is available. If no new crop is already visible, the highest-ranked new crop with harvest-season strength of at least 0.4 and seasonal weather score of at least 5/10 replaces the third pick; otherwise the usual ranking stays unchanged. Existing timing/recommendability restrictions and the cap of two reference crops still apply. Case and whitespace variants of recorded names do not qualify as new. The card says “New crop to consider” and “Based on seasonal references”; it offers a trial planting, without claiming the crop has never been grown locally, a SARIMA yield estimate, or guaranteed sales. These suitability thresholds are planning heuristics. The dashboard and planting-plan saves use the same server selection.

`storage/app/forecasting/online_crop_references.json` extends that catalog with reviewed online agricultural guides. The first entry is Pipino (cucumber), using DA–ATI MIMAROPA's production guide for a 40-day planning estimate within its 38–45-day slicing-cucumber range and advice on drainage/trellising during rainy weather. Laravel adds these options when rendering recommendations, including for previously saved full 20-crop sample uploads; farmers do not need another CSV or to regenerate. Published guidance is stored with its source URL and review date, and linked in “Why this crop?”. There is no live scraping or network request during page loads. The seasonal indices and numerical weather/ranking scores are AgriFarm planning heuristics, not measurements supplied by DA–ATI. These reference suggestions are not fitted SARIMA production or sales forecasts. Recorded aliases suppress duplicate new-crop suggestions, fitted crop forecasts remain intact, and the original saved Python result is not rewritten.

Admin Reports has a separate admin-only forecasting Excel/CSV workflow and paginated monthly report preview. `BarangayHarvestExportService` queries harvest records by the seller's current barangay and selected harvest dates, checks units/names/import limits, and aggregates monthly crop totals. Preview and download recompute the selection separately. CSV is streamed by Laravel; the Excel option receives freshly validated aggregates and uses the existing browser ExcelJS library to create a first-worksheet table whose first row contains the importer headers. Preview branding and summaries are excluded from both files. The Python importer validates the optional Barangay column and adds dataset scope/coverage to the saved result JSON. Reference-based suggestions retain their source; fitted barangay suggestions use `barangay_history`. No historical barangay snapshot or unit conversion is inferred.

Harvest forecasting now uses a seller-only upload endpoint, a bounded local Python process, and seller-owned `forecast_runs`. The dashboard loads the latest saved result and refreshes planting recommendations for the current Pasig month. CSV/Excel parsing produces a versioned result or structured error; React renders one full harvest calendar and collects planting choices. Seller-owned `planting_plans` persist the chosen crop, planting/harvest months and growing time. Laravel derives those values from current recommendations, rejects stale selections, prevents duplicate crop/month entries and enforces owner-only removal; later forecasts do not change saved dates. See [SARIMA deployment](SARIMA%20Deployment.md) for runtime configuration. Online payments, automatic delivery-fee calculation, and report retention still need design before production integration.
