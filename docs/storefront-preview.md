# Storefront behavior reference

This is the short source of truth for the customer storefront. Use it to avoid re-auditing established behavior.

## Routes and data

- `/` renders the Inertia `Welcome` shell and selects a page with query parameters.
- Marketplace: `/?page=marketplace`
- Product detail: `/?page=product&product={catalog-key}`
- Seller shop: `/?page=seller&seller={user-id}`
- Checkout: `/?page=checkout`; private placed-order page: `/?page=order-success&order={uuid}`
- Seller-created products come from PostgreSQL; fallback preview products remain available for the designed demo catalog.
- Public product and seller photos use controlled marketplace image routes. Original seller uploads remain private.
- Favorites and cart quantities are stored in `localStorage`. Stock is reserved only by a successful server-side COD checkout.
- Customer profiles can save a photo, name, username, mobile number, delivery address, and password. Saved contact and address details can prefill checkout.

## Cash on Delivery checkout

- Three steps before submission: delivery details → payment method → confirm order. The final step reviews delivery, payment, product photos, and goods total; only then can the customer place the order.
- Cash on Delivery is the only enabled option. GCash and Maya are visibly disabled and labeled “Coming soon”; no online payment is taken.
- Address fields in the customer profile and checkout offer Photon/OpenStreetMap suggestions as the customer types. Customers can enter an address manually when no suggestion fits or the service is unavailable.
- Only real seller products are orderable; sample catalog items remain in the cart and are not sent.
- Laravel validates delivery information, payment method (`cod` only), each product, stock, and live prices. It locks products and records orders atomically; repeated checkout UUIDs cannot reserve stock twice.
- Each line is visible in its seller’s Orders workspace with the buyer’s delivery details; cancelling restores stock.
- New checkouts receive a random uppercase alphanumeric `AgFrm-` reference shared by the placed-order page, customer PDF/print order slip, and seller Orders. Older issued references remain unchanged. The UUID remains the private URL and retry key. Order slips are marked unpaid until Cash on Delivery is collected.
- Delivery charges are not configured. Show only the goods subtotal, disclose that any charge must be confirmed by the seller before fulfillment, and never claim a final delivered total or online payment.

## Product reviews

- Only authenticated customers can post; seller/admin accounts can read reviews.
- A customer may post multiple reviews for the same product.
- Owners can edit or delete each review using icon buttons.
- Deletion always opens the shared confirmation dialog before the request is sent.
- Reviews are shown before the write/edit form and are sorted newest first.
- The backend paginates at five reviews per page using `review_page`.
- Rating filters use `review_rating=1..5`; anonymous reviews hide the name publicly but retain ownership.

## Seller identity

- A database-backed product shows a full-width seller summary immediately below its product/image detail row (directly after the image on mobile).
- The summary uses the seller's real name, public-safe avatar, mapped barangay, and a `View shop` link.
- The seller shop shows that seller's live listings only. Do not invent chat, activity, follower, or response metrics.

## UI rules

- Light mode uses a light-gray `#f5f5f5` canvas and white content cards; dark mode uses the existing charcoal tokens.
- Shared navigation stays sticky. Account/theme controls remain available to guests.
- Product cards and product facts must use real stock, units, seller identity, ratings, and backend ranking fields when available.
- Keep keyboard focus visible and honor `prefers-reduced-motion`.
- Avoid invented delivery prices, online payment, notifications, discounts, or analytics.

## Key files

- `app/Http/Controllers/StorefrontController.php`
- `app/Http/Controllers/ProductReviewController.php`
- `app/Http/Controllers/CustomerCheckoutController.php`
- `resources/js/Pages/Checkout.jsx`
- `resources/js/Pages/ProductDetail.jsx`
- `resources/js/Pages/SellerStorefront.jsx`
- `resources/js/Components/Storefront/ProductReviews.jsx`
- `resources/css/storefront.css`

## Verification

```powershell
php artisan test tests/Feature/ProductReviewTest.php tests/Feature/StorefrontSellerProductTest.php tests/Feature/CustomerCheckoutTest.php
npm run build
npx playwright test tests/e2e/product-detail.spec.js tests/e2e/seller-storefront.spec.js tests/e2e/accessibility.spec.js
```
