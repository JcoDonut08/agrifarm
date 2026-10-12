# Upsun deployment and separate thesis dataset plan

Status: planned. No deployment or data transfer has been performed. This document describes the work to complete when deployment is requested.

## Goal

Put AgriFarm online on Upsun with a separate starting dataset for thesis testing. Keep the full existing accounts, products, orders, harvest records, uploaded images, and saved forecasts on localhost for the client demonstration.

The local application and its database stay available on this computer. The hosted database collects new thesis-testing records. Changes on localhost and on Upsun will not automatically synchronize. Deploying code updates does not transfer either dataset.

## What will be deployed or initialized

| Item | Transfer method |
| --- | --- |
| Laravel application, React interface, and public images such as Kuya Ani | Deploy the reviewed code and build its dependencies and frontend assets. |
| Necessary admin and seller accounts | Create hosted accounts or selectively copy the agreed accounts, preserving required relationships. Participants can register new customer accounts. |
| Starting product listings | Create or selectively copy the agreed listings with their seller relationships, units, prices, and reviewed starting quantities. Identify setup or demonstration listings separately from participant activity. |
| Existing orders, reviews, notifications, harvest records, planting plans, and saved forecasts | Retain on localhost by default. New activity is collected on Upsun. |
| Photos and thumbnails for selected accounts and listings | Copy only the matching files, preserving their relative paths. Retain the full upload collection locally. |
| Historical harvest data needed for forecasting | Include only the agreed reference dataset, with its actual source and coverage identified. Keep historical or synthetic data distinct from records collected during thesis testing. |
| Forecasting reference JSON files | Include the three files under `storage/app/forecasting` and ensure they remain accessible after storage mounts are attached. |
| Runtime configuration and secrets | Configure privately in Upsun; keep them out of Git and this document. |

If selected accounts are copied with their existing password hashes, their passwords can be retained. Newly created accounts need their own credentials. Selective setup must preserve relationships and file paths; it is not a full database import. Raw forecasting uploads are currently temporary and removed after processing; they cannot be recovered from saved results.

Browser-only information, such as a cart stored on a device, does not transfer with the database. Opening the new domain may start with an empty cart and require signing in again.

## Access needed when deployment starts

The account owner signs in through the official Upsun login process and selects the organization, project, and target environment. Project access is needed to configure services, environment variables, deployment, and file transfers. Passwords and authentication codes should not be pasted into chat or committed to the repository.

Confirm the trial's available resources, region, live URL, and account terms in the dashboard. The trial is suitable for the planned demonstration only if the measured application workload fits its resources. Decide how hosting will continue after the trial before relying on it for ongoing use.

## 1. Prepare the application

Review the current deployment-readiness branch and include the intended fixes and assets in a deployable release. Run the relevant PHP tests and frontend build before connecting that release to Upsun.

Identify the actual local database engine, version, upload locations, and storage size without exposing credentials. The application defaults to PostgreSQL, but the active database must be confirmed before choosing the hosted service and any selective transfer tools. Record which accounts, listings, photos, and forecasting references form the hosted starting dataset.

Do not copy Windows executables, `node_modules`, `vendor`, the Windows Python virtual environment, or local development settings to Linux. Install dependencies from the project's lock files and Python requirements during the build.

## 2. Configure Upsun

Create the Upsun configuration for Laravel, its database service, HTTPS routes, storage, and the build/deploy steps. Serve only Laravel's `public` directory.

The hosting runtime needs PHP compatible with Laravel 12, the appropriate database extension, GD with WebP support, and Python compatible with `python/requirements.txt`. Verify that PHP can start the Python process. Prefer PHP and Python in the same application runtime to preserve the current forecasting architecture; confirm the supported Upsun image before implementing it.

Build the React assets with Vite and install production Composer dependencies. Install the pinned Python dependencies in a Linux environment, check compatibility, and configure `FORECAST_PYTHON_BIN` with the actual hosted interpreter path.

Configure a supervised background worker for order emails using `php artisan queue:work database --queue=order-emails --sleep=1 --tries=3 --timeout=60`. The web process saves order changes and in-app notifications immediately; the worker sends their emails after the transaction commits. Run the queue-table migration before enabling this release. Restart workers with each release so they load the current code, and verify the worker reconnects after restart. See [Order Email Queue](Order%20Email%20Queue.md) for local operation and retry checks.

Configure persistent storage for the application's upload directories, including `storage/app/private` and any used public uploads. Keep private uploads outside direct web access; public product photos continue to use the application's existing controllers. Uploaded files must use a `storage` mount rather than a temporary mount. [Upsun mounts documentation](https://developer.upsun.com/docs/configure-apps/image-properties/mounts)

Mounting Laravel's storage directory can hide reference files included in the code build. Arrange for the forecasting reference JSON files to be copied from a build-accessible location into the mounted directory, or use a narrower mount layout that keeps them visible.

Set production environment variables privately, including `APP_ENV=production`, `APP_DEBUG=false`, the actual HTTPS `APP_URL`, secure session cookies, database connection, mail settings, and forecasting settings. Configure proxy handling so generated URLs and emails use HTTPS.

Configure a stable hosted application key securely. If selectively copied data depends on Laravel encryption, preserve the compatible key securely. Do not automatically regenerate it on every deployment. Exclude local session and cache contents from the transfer.

## 3. Preserve localhost and initialize the hosted dataset

Before deployment, make a one-time private backup of the full local database and uploaded files, and record their inventory. Store these outside the Git repository. This preserves the client-demo dataset; it is not the previously removed automatic backup feature.

Create a separate empty hosted database and apply Laravel migrations. Initialize only the agreed admin/seller accounts, starting listings, and any forecasting reference data. Review the initialization method before running it so it does not add the full demonstration dataset. Do not run `migrate:fresh` or repeat initialization over a database containing participant activity.

Keep local orders, reviews, notifications, queue work, failed-job history, and other demonstration activity out of the hosted starting dataset. Use the migrated queue table structures for new hosted jobs. If selectively copying local records and their photos, pause changes to those records during the copy and preserve their relationships.

Copy the photos for selected accounts and listings into the matching persistent mounts, preserving filenames and folder structure. Include generated product thumbnails. Database photo paths and copied files must match; copying records alone would leave broken images. Upsun provides mount upload tools for this transfer. [Upsun file-transfer documentation](https://developer.upsun.com/docs/development/file-transfer)

Compare hosted records and files against the agreed starting-data inventory, rather than expecting the full local and hosted databases to match. Verify that orders, reviews, and other participant activity begin empty before verification tests. Confirm that the full local dataset and photos remain intact. Compare selected file counts, sizes, and checksums where practical, then open their product and profile photos through the hosted application.

Existing synthetic samples remain demonstration data. Deployment does not make them actual barangay harvest records or change the source labels on saved forecasts.

## 4. Verify the live system

Use designated test accounts and clearly identified test records for checks that create orders, notifications, or emails. Record these verification fixtures separately so they can be excluded from thesis participant results.

| Check | Required result |
| --- | --- |
| HTTPS and production settings | Valid certificate, HTTP redirects to HTTPS, no mixed content, debug disabled, secure cookies. |
| Hosted accounts | Selected or newly created customer, seller, and admin accounts can sign in with the expected permissions. |
| Password session security | Sign in to one test account in two browsers, change its password in one, and confirm that browser stays signed in while the other returns to login on its next protected request. Confirm the old password fails and the new password works. Repeat through password recovery; both earlier sessions must lose access. |
| Records and images | Hosted setup records match the agreed starting-data inventory; corresponding photos display correctly, and the full local demo dataset remains intact. |
| Uploads and privacy | New uploads work; private files cannot be downloaded directly or accessed by another account. |
| Checkout and order management | Place a test order, confirm stock handling, update its status, and verify cancellation reasons and customer notifications. |
| Email delivery | Receive a real password-reset email and order update; verify their links use the hosted HTTPS domain. |
| Order email worker | Confirm seller actions return before mail delivery, customer in-app notices appear immediately, the worker delivers the email, and a controlled test mail failure retries without repeating the order or stock update. |
| Forecasting | Run `php artisan forecast:check`, then generate through the hosted browser using the one-year and four-year samples. Verify saved results remain available after refresh. |
| Harvest exports | Generate an admin preview, download Excel or CSV, and upload it through the farmer forecasting screen. |
| Mobile and desktop | Check navigation, tables, modals, images, and checkout on both screen sizes. |
| Persistence | Create a test record and upload a test image, restart the application, and redeploy the same release. Both remain available. |

Forecasting currently runs during the request, with a Laravel process timeout of 180 seconds. Check Upsun's PHP, request, and routing limits against the measured forecast duration. If a platform limit prevents completion, resolve that before marking forecasting ready; an asynchronous job would be a separate implementation change.

Measure a representative forecast while checking ordinary navigation and checkout. Choose resources from those results rather than assuming the smallest allocation is sufficient.

See [Deployment Verification](Deployment%20Verification.md), [SARIMA Deployment](SARIMA%20Deployment.md), and [Product Image Optimization](Product%20Image%20Optimization.md) for existing checks and runtime details. The older VPS examples require adaptation for Upsun.

## 5. Start using the hosted system

After verification, share the hosted URL for thesis testing and collect new participant records there. Continue using localhost with its existing data and photos for the client demonstration. Keep both environments clearly identified and maintain the local copy independently.

Do not later overwrite the live database with an older local export. New hosted orders and harvest records would be lost. If a release fails, return to the previous compatible code release while preserving live data; database changes need their own recovery decision.

## Completion record

| Detail | Status |
| --- | --- |
| Upsun project and target environment | Pending |
| Hosted URL and deployed revision | Pending |
| Hosted starting dataset and matching photo setup | Pending |
| Starting-data comparison and local dataset preservation | Pending |
| Verification fixtures distinguished from participant activity | Pending |
| HTTPS, email, privacy, and forecasting checks | Pending |
| Restart and redeploy persistence check | Pending |
| Date verified and remaining limitations | Pending |

Complete these entries with non-sensitive results when deployment is actually performed. A prepared configuration or successful code build alone does not establish that the live system works or retains its uploads.
