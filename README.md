# AgriFarm

AgriFarm is a Laravel 12 + React 19/Inertia marketplace for Pasig barangay sellers. It includes role-based authentication, seller inventory and order tools, a database-backed customer storefront, public seller shops, customer reviews, and Cash on Delivery orders. Online payments remain deferred.

## Stack

- PHP 8.2+, Laravel 12, Eloquent, PostgreSQL
- React 19, Inertia.js 3, Tailwind CSS 4, Vite 8
- PHPUnit feature tests and Playwright browser tests

## UI Library Attribution

This project uses shadcn/ui as an open-source component library for reusable interface components.

shadcn/ui is released under the MIT License.

Official Repository:
[https://github.com/shadcn-ui/ui](https://github.com/shadcn-ui/ui)

License:
[https://github.com/shadcn-ui/ui/blob/main/LICENSE.md](https://github.com/shadcn-ui/ui/blob/main/LICENSE.md)

shadcn/ui components used in AgriFarm are customized through Tailwind CSS and the project's design system to support its agricultural visual identity, responsive layouts, accessibility requirements, and consistent interaction patterns.

## Implemented behavior

- Order updates save in-app customer notifications immediately and send email through a database-backed background worker, with three attempts and delayed retries. Run `php artisan migrate` and `composer run queue:orders` for local delivery. See [Order Email Queue](docs/Order%20Email%20Queue.md).

- Consistent action feedback: destructive actions ask for confirmation; saves, uploads, product moderation, harvest records, reviews, and reports show small success notifications. Notifications close after six seconds and pause on hover/focus. Validation errors stay with their fields.

- Product add/edit forms protect unsaved field and photo changes when closed with Cancel, the close button, Escape, or the backdrop. Keep editing preserves the draft and validation errors; Discard changes closes it. Untouched forms and successful saves close normally.

- Sellers must choose a cancellation reason for orders and reservations; "Other reason" requires an explanation. Customers see it in order history, in-app notifications, and order-update emails. Existing cancelled orders without a reason show "No reason recorded." Run `php artisan migrate` to add the cancellation fields.
  Older accepted orders with an unknown reservation source ask the seller to confirm available stock or future harvest before returning the quantity. New orders use their recorded source automatically.

- Customer registration, email verification, password recovery, and role-aware login for customers, sellers, and CENRO admins
- Password changes keep the current browser signed in and invalidate other tracked sessions on their next request. Password resets invalidate earlier sessions and verified reset grants. See [Account Session Security](docs/Account%20Session%20Security.md) for rollout and verification.
- CENRO Farmers & Sellers administration: create individual farmer-seller accounts, assign barangays, edit store details, and review account status/history
- Admin-created sellers begin active with a temporary password that must be replaced before seller-dashboard access; suspended sellers cannot sign in and their public shop/listings are hidden
- Seller profiles, private product/photo management (JPG/PNG/WebP up to 10 MB, including clipboard paste), inventory, walk-in orders, and public-safe image routes
- Customer profile photo, contact and delivery details, and password management; saved details can prefill checkout
- Customer marketplace search/filter/sort, product detail, favorites, and a device-local cart
- Public seller shop at `/?page=seller&seller={id}` using the seller's real name, photo, barangay, and live listings
- Multiple customer reviews per product, with owner-only edit/delete, anonymous display, rating filters, and five reviews per page
- Three pre-submit COD steps for real seller listings: shipping details with optional address suggestions, payment method (GCash/Maya shown as coming soon), and full order confirmation with product photos. Placing the order opens a separate mascot-led success page with a random alphanumeric `AgFrm-` reference and icon actions for printable/downloadable unpaid order slips. Prices and stock are verified and reserved server-side; sellers receive the order in their Orders workspace.
- Light/dark themes; light mode uses a `#f5f5f5` page canvas with white cards

- Interactive Storefront Features: An overhauled, bilingual (English/Filipino) About page featuring a 2.5D custom mascot (Kuya Ani) who acts as an interactive frontend chatbot. The chatbot includes dynamic conversational flows, FAQs, and securely hooks into the Laravel backend (/api/chatbot/latest-order) to actively scan and summarize the real-time status of all pending products in the user's active checkouts.

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
| CENRO Admin | `pasigcenro@gmail.com` | `/admin/dashboard` |

Barangay partner accounts are listed in [docs/barangay-sellers.md](docs/barangay-sellers.md).

## Quality checks

```powershell
php artisan test
vendor\bin\pint --test
npm run build
npm run test:e2e
```

PHP tests use isolated SQLite. Playwright uses `database/playwright.sqlite`, seeds development users, starts Laravel on port 8010, and checks responsive behavior in Chrome.

The photo resizing test requires PHP GD. Enable GD in your PHP configuration, or run `php -d extension=gd vendor/bin/phpunit` to include it for one test run. Passing the flag to `artisan test` does not enable it in the separate PHPUnit process.

After pulling database changes, run `php artisan migrate`. The product status repair migration adds the missing column on older databases and preserves existing hidden products. Its rollback deliberately retains the column and moderation history.

New customer and walk-in orders remember whether they reserve available stock or expected harvest yield. Cancellation restores that original quantity once. The inventory source migration identifies older pending orders and reservations. Older accepted orders cannot be identified reliably; an administrator must verify and set their `inventory_source` to `stock` or `expected_yield` before cancellation. Do not infer it from current inventory. New checkouts reject admin-hidden products, including those in an older cart.

Product edits preserve inventory fields that were not changed in the form. To update `stock` or `expected_yield`, include the quantity seen when opening the editor as `original_stock` or `original_expected_yield`. The server checks deliberate inventory changes while locking the product; outdated changes are rejected, and the editor shows current quantities for review. Zero stock and manual restocking remain available. Metadata-only requests can omit both inventory fields.

Single and bulk product deletion are blocked while any selected product has pending orders, reservations, orders being prepared, or deliveries in progress. Blocked bulk deletion preserves every selected product and its photos. After all orders are delivered or cancelled, deletion is allowed, including products with zero stock; historical order details remain available.

Delivery confirmation saves `delivered_at` using the server's UTC time. Seller/admin sales charts, report downloads, barangay trends, and forecast selling activity use the delivery date in Philippine time. An order placed in September and delivered in October counts toward October's completed sales. Older delivered orders have no verified delivery date: they remain in all-time totals but are excluded from date-filtered sales reports, charts, and seasonal selling evidence. Run `php artisan migrate` on each deployment to add the nullable indexed field; no historical delivery dates are guessed.

Existing orders and receipts retain their original product name, selling unit, quantity, price, and total when a listing is edited. Selling-unit changes are blocked while the product has pending, reserved, preparing, or out-for-delivery orders; name, price, and other listing corrections remain available. After orders are delivered or cancelled, the unit can be changed and new orders use the updated listing. Previously overwritten order details cannot be reconstructed automatically.

## Development boundaries

- Laravel owns validation, authorization, business rules, and persistence.
- React owns presentation and transient UI state through Inertia.
- Use Eloquent directly; add a service only for multi-step workflows or transactions.
- Public registration always creates a customer; seller/admin accounts are seeded or administered.
- Harvest forecasting uses a local Python runtime and saves each seller's latest result. Recommendation cards show planting and harvest months, approximate growing times, and an action to save/remove crops in a seller-owned planting plan. See [SARIMA setup and deployment](docs/SARIMA%20Deployment.md) for Python installation, limits, and `php artisan forecast:check`.
- New-crop options also use reviewed online agricultural guides, starting with Pipino (cucumber) from DA–ATI MIMAROPA. They can appear with the full sample CSV or a saved forecast, without a second upload. Cards link to the growing guide and distinguish reference guidance from recorded harvest estimates; the app's seasonal scores are planning rules rather than measured local yields.
- Admin Reports previews actual monthly kilogram totals for one barangay and downloads forecasting-ready Excel or CSV files. For harvests in pieces/bunches, farmers can enter the measured total weight in kg in Record Harvest or Edit. Farmers upload either file through Generate; saved results retain the barangay and record coverage. See the [SARIMA Barangay Harvest Data Plan](docs/SARIMA%20Barangay%20Harvest%20Data%20Plan.md).
- Deferred work: online payment processing, automated delivery-fee calculation, production reporting, and deployment.
- Planting recommendations use aggregate completed sales from the relevant barangay, preferring past harvest-month sales when available and recent activity otherwise. Current stock stays separate by unit; sparse selling records leave ranks unchanged. This adds planning context without predicting future sales or profit.

See [architecture](docs/architecture.md), [storefront behavior](docs/storefront-preview.md), and the [design system](docs/design-system.md) before changing those areas.
