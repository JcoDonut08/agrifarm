# Barangay seller accounts

Development partner accounts use password `AgriFarm123!` and sign in at `/login`:

| Barangay | Email |
| --- | --- |
| Rosario | `brgyrosario@gmail.com` |
| Maybunga | `brgymaybunga@gmail.com` |
| Sto. Thomas | `brgystothomas@gmail.com` |

Create missing accounts outside production with:

```powershell
php artisan db:seed --class=BarangaySellerSeeder
```

The seeder preserves existing accounts/passwords and also runs with the normal development seed.

## Current seller behavior

- Seller Center uses the authenticated seller's mapped barangay identity.
- Store Profile supports JPG/PNG/WebP photos up to 2 MB. Originals are private; the customer storefront uses `/marketplace/sellers/{seller}/photo` for the safe public response.
- Products and photos persist in the database/private disk. JPG/PNG/WebP product photos up to 10 MB can be chosen, dropped, or pasted with Ctrl+V. Replacing a photo refreshes it in seller and customer listings. Seller-created listings appear in the customer marketplace and public seller shop.
- Public shop URL: `/?page=seller&seller={id}`. It shows the seller's real name, avatar, barangay, and live listings.
- A database-backed product detail shows the same seller identity below the product image with a `View shop` link.
- Notifications, forecasting, and unsupported metrics remain honest empty states until their backends exist.

## Verification

```powershell
php artisan test --filter=BarangaySellerTest
php artisan test --filter=SellerProductTest
npm run build
npx playwright test tests/e2e/seller.spec.js tests/e2e/seller-storefront.spec.js
```

Run `php artisan migrate` when setting up another environment.
