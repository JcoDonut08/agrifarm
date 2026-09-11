# Barangay seller accounts

The local development database contains these partner seller accounts:

| Barangay | Email |
| --- | --- |
| Rosario | brgyrosario@gmail.com |
| Maybunga | brgymaybunga@gmail.com |
| Sto. Thomas | brgystothomas@gmail.com |

Initial local development password: `AgriFarm123!`.
Sign in at `/login`; seller accounts are redirected to `/seller/dashboard`.
These are application accounts, not newly created Gmail mailboxes.

To create missing accounts in another development database, run:

```sh
php artisan db:seed --class=BarangaySellerSeeder
```

The seeder skips production and preserves any existing accounts and passwords.
It also runs as part of the normal database seed.

The seller center uses the signed-in account's barangay name and email. It omits
the Add product button, Seller Dashboard heading, and personal greeting from the
reference. Orders, analytics, and forecasting currently show empty or
unavailable states because those backend features do not yet exist. Sales and rating values remain empty states. Product counts and low-stock entries use saved products.

Validation: `php artisan test --filter=BarangaySellerTest`, `npm run build`, and
`npx playwright test tests/e2e/seller.spec.js`. Browser tests use the existing
isolated Playwright database and cover all three accounts at 390, 768, and 1440px.

Store Profile also supports profile photo upload, replacement, and removal (JPG,
PNG, WebP; up to 2 MB). Photos are stored on the local private disk and served
through an authenticated seller route. The current photo appears in the navbar,
sidebar, and profile. Replaced or removed uploaded photos are deleted.

The seller navbar includes a notifications panel with an empty state until order
and store notifications are connected. The light/dark toggle uses the existing
`agrifarm-theme` preference and persists across page reloads.

The Products section includes a centered Add Product modal. Its Add product
button saves the validated details and photo through Laravel to the configured
database and private local disk. The Products list, product count and inventory
watch use the signed-in seller's records. Photos are served only to their owner.
Products persist across refreshes. The customer marketplace still uses its
existing design fixtures and is not yet connected to these seller products.

Run `php artisan migrate` when setting up another environment.
Product tests: `php artisan test --filter=SellerProductTest`.
