# AgriFarm

AgriFarm is a Laravel 12 + React 19/Inertia marketplace for Pasig barangay sellers. It includes role-based authentication, seller inventory and order tools, a database-backed customer storefront, public seller shops, customer reviews, and Cash on Delivery orders. Online payments and forecasting remain deferred.

## Stack

- PHP 8.2+, Laravel 12, Eloquent, PostgreSQL
- React 19, Inertia.js 3, Tailwind CSS 4, Vite 8
- PHPUnit feature tests and Playwright browser tests

## Implemented behavior

- Customer registration, email verification, password recovery, and role-aware login for customers, sellers, and CENRO admins
- Seller profiles, private product/photo management, inventory, walk-in orders, and public-safe image routes
- Customer marketplace search/filter/sort, product detail, favorites, and a device-local cart
- Public seller shop at `/?page=seller&seller={id}` using the seller's real name, photo, barangay, and live listings
- Multiple customer reviews per product, with owner-only edit/delete, anonymous display, rating filters, and five reviews per page
- Three-step COD checkout for real seller listings: delivery details, order review, confirmation. Prices and stock are verified and reserved server-side; sellers receive the order in their Orders workspace.
- Light/dark themes; light mode uses a `#f5f5f5` page canvas with white cards

The cart itself is stored on the device and does not reserve stock. Only real seller listings can be submitted as COD orders; sample catalog products remain previews. Delivery charges are not configured and must be agreed with the seller before fulfillment.

## Local setup

```powershell
composer install
npm install
Copy-Item .env.example .env
php artisan key:generate
php artisan migrate --seed
```

Set the PostgreSQL connection and mail settings in `.env`, then run the backend and frontend separately:

```powershell
php artisan serve
npm run dev
```

Open `http://127.0.0.1:8000`. Never commit `.env`, credentials, research data, or generated test artifacts.

For local mail-free development use `MAIL_MAILER=log`. Gmail delivery requires SMTP on port 587 and a Google App Password; run `php artisan config:clear` after changing mail configuration.

## Development accounts

These non-production accounts use `AgriFarm123!`:

| Role | Email | Destination |
| --- | --- | --- |
| Customer | `customer@agrifarm.test` | `/` |
| Seller | `seller@agrifarm.test` | `/seller/dashboard` |
| CENRO Admin | `admin@agrifarm.test` | `/admin/dashboard` |

Barangay partner accounts are listed in [docs/barangay-sellers.md](docs/barangay-sellers.md).

## Quality checks

```powershell
php artisan test
vendor\bin\pint --test
npm run build
npm run test:e2e
```

PHP tests use isolated SQLite. Playwright uses `database/playwright.sqlite`, seeds development users, starts Laravel on port 8010, and checks responsive behavior in Chrome.

## Development boundaries

- Laravel owns validation, authorization, business rules, and persistence.
- React owns presentation and transient UI state through Inertia.
- Use Eloquent directly; add a service only for multi-step workflows or transactions.
- Public registration always creates a customer; seller/admin accounts are seeded or administered.
- Deferred work: online payment processing, automated delivery-fee calculation, forecasting-service integration, production reporting, and deployment.

See [architecture](docs/architecture.md), [storefront behavior](docs/storefront-preview.md), and the [design system](docs/design-system.md) before changing those areas.
