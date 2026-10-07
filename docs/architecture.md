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
- Seller accounts persist their barangay and current account status. CENRO-only routes create/edit seller accounts and append immutable suspension/reinstatement history records.
- Active-account middleware rejects suspended seller sessions and hides their marketplace presence. A separate seller middleware directs administrator-created accounts to replace their temporary password before seller-dashboard access.
- Query-string storefront pages preserve shareable URLs. Review pagination uses `review_page`; marketplace pagination uses `market_page`.
- Cart/favorites remain client-side. COD checkout uses a UUID-keyed header and transactional, locked stock decrements; each seller receives one line in their existing Orders workspace.
- Add directories and abstractions only when a real feature needs them.

## Deferred boundary

`ForecastSellingActivityService` aggregates delivered orders from the forecast's barangay (or the seller's current barangay for personal uploads), without exposing customer/order details. Past harvest-month activity takes priority when two years and enough completed orders are available; otherwise it uses recent 90-day activity. Stock is kept separate by unit and compared only with matching recent sold quantities. The existing season/weather rank receives a bounded one-point adjustment; sparse history stays neutral. The dashboard and planting-plan controller recompute the same selling evidence, while saved Python harvest forecasts remain unchanged. This is an observed-activity heuristic, not a future-demand forecast.

Admin Reports has a separate admin-only forecasting Excel/CSV workflow and paginated monthly report preview. `BarangayHarvestExportService` queries harvest records by the seller's current barangay and selected harvest dates, checks units/names/import limits, and aggregates monthly crop totals. Preview and download recompute the selection separately. CSV is streamed by Laravel; the Excel option receives freshly validated aggregates and uses the existing browser ExcelJS library to create a first-worksheet table whose first row contains the importer headers. Preview branding and summaries are excluded from both files. The Python importer validates the optional Barangay column and adds dataset scope/coverage to the saved result JSON. Reference-based suggestions retain their source; fitted barangay suggestions use `barangay_history`. No historical barangay snapshot or unit conversion is inferred.

Harvest forecasting now uses a seller-only upload endpoint, a bounded local Python process, and seller-owned `forecast_runs`. The dashboard loads the latest saved result and refreshes planting recommendations for the current Pasig month. CSV/Excel parsing produces a versioned result or structured error; React renders one full harvest calendar and collects planting choices. Seller-owned `planting_plans` persist the chosen crop, planting/harvest months and growing time. Laravel derives those values from current recommendations, rejects stale selections, prevents duplicate crop/month entries and enforces owner-only removal; later forecasts do not change saved dates. See [SARIMA deployment](SARIMA%20Deployment.md) for runtime configuration. Online payments, automatic delivery-fee calculation, and report retention still need design before production integration.
