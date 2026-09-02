# AgriFarm architecture

## Goal

Keep AgriFarm understandable, testable, and easy for a small thesis team to maintain. The application is a Laravel monolith with a React interface connected by Inertia. Python forecasting remains an independent workspace until integration is explicitly required.

## Request flow

```text
Browser
  -> Laravel route
  -> Controller
  -> Service when the workflow needs one
  -> Eloquent model
  -> PostgreSQL
  -> Inertia response
  -> React page
```

React owns display and interface state. Laravel owns validation, authorization, business rules, and database access.

## Current foundation

```text
app/
  Http/
    Controllers/
    Middleware/HandleInertiaRequests.php
  Models/User.php
  Providers/
database/
  factories/
  seeders/
resources/
  css/app.css
  js/
    Layouts/GuestLayout.jsx
    Pages/Welcome.jsx
    app.jsx
  views/app.blade.php
routes/
  console.php
  web.php
tests/
  Feature/FoundationTest.php
```

The default Laravel domain migrations were removed. PostgreSQL is configured as the default database, but no application tables have been defined or migrated.

## Add only when needed

- `app/Enums`: first approved role or status enum
- `app/Http/Requests/<Feature>`: first non-trivial validated request for that feature
- `app/Policies`: first resource ownership or authorization policy
- `app/Services`: workflows involving reusable rules, multiple models, or database transactions
- `resources/js/Components`: first genuinely reusable interface component
- Customer, Seller, and Admin controller/page/layout folders: first page for each role
- `routes/auth.php`: official authentication implementation
- `forecasting`: independent SARIMA development phase

Do not create placeholder directories. Git does not track empty folders, and speculative structure makes the codebase harder to navigate.

## Service rule

A service is not required merely because a model exists. Simple Eloquent CRUD can remain in a small controller. Use a service for operations such as placing an order, reserving inventory, processing a payment once, or calculating analytics. Laravel database transactions belong around multi-write workflows that must succeed together.

No repository layer is planned. Eloquent is the project's data-access layer.

## Database design gate

Before migrations are created, review and approve:

- user roles and profile ownership
- product-to-inventory cardinality
- order and payment status transitions
- order-item price snapshots
- inventory concurrency and prevention of negative stock
- idempotency for transaction/payment processing
- forecast values and metric relationships
- whether generated reports need persistent records

Use decimal columns for money, foreign keys and indexes for relationships, and constraints for important invariants. Store relational data in columns and related tables unless JSON has a specific justified use.

## Forecasting boundary

When forecasting work begins, create a root `forecasting/` workspace with `src/`, `tests/`, and isolated data directories. Laravel-to-Python integration and FastAPI remain deferred. Raw research data, processed data, and generated outputs must not be committed.

## Naming and organization

- Use `Admin` consistently for CENRO administrative code and `cenro_admin` for the eventual role value.
- Use `resources/js/Layouts` for page shells; do not create a duplicate `Components/Layout` folder.
- Keep models flat in `app/Models` until their number genuinely makes grouping helpful.
- Clarify whether the proposed `Transaction` entity represents a payment, ledger entry, or both before naming its model and table.
- Add a `Report` model only if report files or report-generation history must be stored.
