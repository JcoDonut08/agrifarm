# Admin audit logs

The local and Railway databases have separate audit histories. Local history is not automatically copied to production.

## Recorded activity

- Existing administrator actions: seller creation, edits, suspension/status changes, and reinstatement.
- Seller product actions: successful creation, actual edits, single deletion, and bulk deletion. Bulk deletion records each product separately.
- Product entries include the product ID and name; edits list the changed fields. Actor and seller names are stored as snapshots. Private photo paths, passwords, and request bodies are not included.
- Seller events use the seller as the actor and leave `admin_id` empty. Administrator actions retain their administrator identity. Older entries without actor fields remain supported.
- Product writes and their audit entries share a database transaction. Invalid, unauthorized, stale-inventory, blocked-deletion, and unchanged edit requests do not create activity entries. Automatic inventory deductions from orders are not seller product edits.
- Product and account deletion do not remove seller product history. Stored names remain available if the seller account is removed; private seller avatars are omitted when the account no longer exists.

## Viewing and testing

Open `/admin/dashboard?section=audit-logs`. Product-created, product-updated, and product-deleted filters sit alongside the existing account filters. Each entry shows its actor and role. The page refreshes every 30 seconds; a browser refresh retrieves current records immediately.

On Railway, make a genuine seller product addition or edit after deployment, then open the admin audit page and refresh it. Actions performed before tracking was added cannot be reconstructed from an audit table that did not record them.

The migration `2026_10_15_000000_add_actor_to_audit_logs_table.php` adds actor fields and permits seller events without attributing them to an administrator. Existing audit rows are retained. Apply migrations before running the updated application.

```powershell
php artisan test tests/Feature/SellerProductAuditTest.php tests/Feature/AdminAuditLogTest.php tests/Feature/SellerProductTest.php tests/Feature/ProductInventoryEditTest.php tests/Feature/ProductDeletionSafetyTest.php
npm run build
npx playwright test tests/e2e/seller-product-audit.spec.js
```

Browser checks use separate seller/admin sessions and the isolated SQLite database. Do not create fake production products or manipulate production inventory to demonstrate logging.
