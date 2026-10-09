# Background order emails

Seller order updates save the order and the customer's in-app notification in the same database transaction. Email delivery uses a separate database queue after the transaction commits. An unavailable mail server no longer delays the seller's response or reverses the saved order change.

Each email captures the subject and template data when its status changes. A delayed preparing email continues to describe that preparing update, even if the seller has already marked the item for delivery. Cancellation emails retain the original reason and seller note. Email retries do not rerun inventory changes or create another in-app notification.

Only these order-update emails use the `order-emails` queue. Password-reset and sign-in emails keep their existing delivery behavior. The order email notification explicitly uses the database queue, including when the application's general `QUEUE_CONNECTION` is `sync`.

## First setup

Apply the queue-table migration before using the new order actions:

```powershell
php artisan migrate
```

This adds `jobs` and `failed_jobs`. It does not modify existing orders or inventory.

Start the local worker in a separate development terminal:

```powershell
composer run queue:orders
```

The equivalent command, also used by the hosting supervisor, is:

```bash
php artisan queue:work database --queue=order-emails --sleep=1 --tries=3 --timeout=60
```

The worker must remain running to send pending order emails. Restart it after restarting the computer or closing its terminal. When no worker is running, order updates and in-app notifications still work, and emails stay pending in the database until a worker processes them.

This feature does not install a Windows scheduled task or a recurring PowerShell launcher. A worker started with `Start-Process -WindowStyle Hidden` runs without a visible window for the current session; it still needs to be restarted after a reboot.

## Retries and maintenance

Order emails allow three attempts, waiting 30 seconds after the first failure and 120 seconds after the second. Exhausted failures are recorded in `failed_jobs`. The worker has a 60-second job timeout; the database queue's default 90-second retry interval must remain longer than that timeout. SMTP operations use `MAIL_TIMEOUT`, defaulting to 20 seconds, to avoid an unlimited network wait, including on local Windows workers.

After changing code or runtime configuration, ask existing workers to stop gracefully:

```bash
php artisan queue:restart
```

Start the local worker again, or let the hosting supervisor restart it. Refresh cached configuration when applicable. Workers are long-running processes and do not pick up every change automatically.

Inspect exhausted jobs with:

```bash
php artisan queue:failed
```

After resolving the mail problem, retry the specific order email job by its failed-job UUID:

```bash
php artisan queue:retry <failed-job-uuid>
```

Restrict failed-job output and worker logs to operators; failures can include customer or message information. Do not clear all queued jobs as a routine fix.

## Verification

The feature tests exercise the real database queue and serialized mail payload with an in-memory mail transport. They cover immediate in-app notices, delayed status snapshots, transaction rollback, temporary failures and successful retry, exhausted retries, authorization, and walk-in orders without an online customer.

```powershell
php artisan test tests/Feature/OrderStatusQueueTest.php tests/Feature/OrderCancellationReasonTest.php tests/Feature/OrderStatusMailTest.php
```

These tests do not send real customer email. On the live host, use a designated test customer, update a test order, and confirm its in-app notice and delivered email. Verify that a supervised worker starts again after a deployment and service restart before calling hosted email delivery ready.

See [Upsun Deployment Plan](Upsun%20Deployment%20Plan.md) for the hosting setup. Laravel documents queued notification delivery and transaction handling in its [notification guide](https://laravel.com/docs/12.x/notifications).
