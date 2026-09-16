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
    Seller/                  inventory, orders, profile
    StorefrontController     public catalog, search, rankings, reviews, shops
    ProductReviewController  customer review CRUD
    CustomerCheckoutController  COD orders, stock locks, price snapshots
  Models/                    users, products, reviews, walk-in orders
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
- Query-string storefront pages preserve shareable URLs. Review pagination uses `review_page`; marketplace pagination uses `market_page`.
- Cart/favorites remain client-side. COD checkout uses a UUID-keyed header and transactional, locked stock decrements; each seller receives one line in their existing Orders workspace.
- Add directories and abstractions only when a real feature needs them.

## Deferred boundary

Forecasting remains a separate future workspace. Online payments, automatic delivery-fee calculation, and report retention still need design before production integration.
