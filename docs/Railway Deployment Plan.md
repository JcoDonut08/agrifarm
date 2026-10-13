# Railway deployment for the AgriFarm trial

Status: deployed on October 13, 2026 with Railway CLI 5.66.0. The project is `AgriFarm` (renamed from `alert-playfulness`), environment `production`, application service `Agrifarm`; its `Postgres` database is online. The public site is `https://agrifarm-production-6bdb.up.railway.app`. The volume is verified at `/app/storage`, and the hosted application key is configured privately. All 35 schema migrations ran. The selected starting dataset of 4 accounts, 5 products, and 13 photos was transferred; photo checksums matched at initialization. A live 20-crop forecast passed in 31.7 seconds after restarting the service, with starting records and forecasting references intact. Brevo test-email delivery is confirmed by the provider; Google credentials and the authorized callback are configured. The order-email worker is deployed and passed a queue-processing probe. Complete user-flow checks remain pending. The localhost environment and its full database have not been changed.

## First dashboard steps

The repository's public website URL is `https://agrifarm-production-6bdb.up.railway.app`. GitHub can display this CLI-managed deployment under `AgriFarm / production` using a deployment record whose environment URL points to the site and whose log URL points to the verified Railway deployment. Record success only after the web service and worker are running and the website health endpoint responds successfully. This records an existing deployment; it does not enable GitHub autodeployments. The unused `wholesome-encouragement` project's repository source was disconnected after it produced cancelled deployment checks. Its existing GitHub deployment entries are historical.

1. Open the existing **AgriFarm** project and **production** environment.
2. Keep its existing **Postgres** database service.
3. Keep the existing **Agrifarm** service and **agrifarm-volume**. Confirm the volume's mount path is **`/app/storage`**. Use one web replica. Below, "web" refers to this application service.
4. Generate a Railway domain in the web service's networking settings, with target port **8080**. Set `APP_URL` to that domain with `https://`.
5. Configure the web variables below, authenticate the local Railway CLI, and upload the reviewed release to this service.

Creating services consumes the trial credits. Stay on the trial while testing; monitor Railway's Usage page. Its $5 credit expires after 30 days or when used up. The subsequent Free plan provides $1/month of usage credit, which is not a promise that this complete application, database, and worker will run continuously at no cost. Trial services have up to 1 GB RAM; the later Free plan has a lower 0.5 GB limit. [Railway trial](https://docs.railway.com/pricing/free-trial), [resource limits](https://docs.railway.com/pricing/plans)

This setup uses two volumes: PostgreSQL data and application uploads. The Trial plan allows three volumes per project; the later Free plan allows only one. Keeping both volumes requires a different plan or storage arrangement after the trial. [Volume limits](https://docs.railway.com/volumes/reference)

If the account has a Limited Trial, connect GitHub through Railway's verification page. Limited accounts have outbound network restrictions; verify access to the email API, weather API, and Google OAuth on the actual deployment. Account verification is automated and may not succeed for every account. [Railway verification](https://docs.railway.com/pricing/free-trial)

## Runtime and configuration

`deploy/railway/Dockerfile` builds React with Node 24 and runs Laravel with PHP 8.4, Python 3.13, the pinned scientific dependencies, GD/WebP, nginx, and PHP-FPM. PHP starts Python directly for forecasting. `railway.toml` selects this Dockerfile, migrates the database before deployment, starts the web server, and checks `/up`.

The hosted service also has the Dockerfile path, migration command, web start command, and health check set explicitly. Railway's current service API accepts `RAILPACK` as the builder selector; the Dockerfile path makes the resulting deployment use `DOCKERFILE`. The first automatic PHP build was replaced with this configuration because it omitted Python. The CLI warns that legacy `railway.toml` support ends on December 1, 2026; migrate to Railway's current infrastructure configuration before relying on these files beyond the trial. [Current configuration guidance](https://docs.railway.com/infrastructure-as-code)

The image contains application source, public application assets, four forecasting reference JSON files, and synthetic runtime-check CSV fixtures. `.dockerignore` and `.railwayignore` exclude local environment files, keys, recovery data, database dumps, dependencies, uploaded photos, and development artifacts. Product and profile photos are transferred separately into persistent storage. Review the CLI upload inventory before transferring the release. [Railway CLI uploads](https://docs.railway.com/cli/up)

Set secrets privately in the Railway Variables panel. The following table contains names and references only. If the database service has a different name from `Postgres`, select that service through Railway's reference-variable UI.

| Web variable | Value or source |
| --- | --- |
| `APP_NAME` | `AgriFarm` |
| `APP_ENV` | `production` |
| `APP_DEBUG` | `false` |
| `APP_KEY` | Stable hosted key from the private prepared environment bundle; do not regenerate it on each release. |
| `APP_URL` | The generated HTTPS web domain. |
| `RAILWAY_DOCKERFILE_PATH` | `deploy/railway/Dockerfile`; explicitly selects the tested container. |
| `DB_CONNECTION` | `pgsql` |
| `DB_HOST` | `${{Postgres.PGHOST}}` using the private host. |
| `DB_PORT` | `${{Postgres.PGPORT}}` |
| `DB_DATABASE` | `${{Postgres.PGDATABASE}}` |
| `DB_USERNAME` | `${{Postgres.PGUSER}}` |
| `DB_PASSWORD` | `${{Postgres.PGPASSWORD}}` |
| `MAIL_MAILER` | `brevo` after the sender/API setup below. |
| `BREVO_API_KEY` | Private Brevo API key, not an SMTP password. |
| `MAIL_FROM_ADDRESS` | Gmail address verified in Brevo. |
| `MAIL_FROM_NAME` | `AgriFarm Marketplace` |
| `MAIL_REPLY_TO_ADDRESS` | The same Gmail inbox. |
| `MAIL_REPLY_TO_NAME` | `AgriFarm Marketplace` |
| `MAIL_TIMEOUT` | `20` seconds. |
| `GOOGLE_CLIENT_ID`, `GOOGLE_CLIENT_SECRET` | Existing OAuth application's server-side credentials if Google login is enabled. |
| `GOOGLE_REDIRECT_URI` | `https://YOUR-RAILWAY-DOMAIN/auth/google/callback` |
| `CONTACT_EMAIL` | Optional Gmail contact inbox. |

The image supplies `PORT=8080`, file sessions/cache, secure cookies, the database queue, and `FORECAST_PYTHON_BIN=/opt/venv/bin/python`. Railway injects `RAILWAY_ENVIRONMENT_ID`; Laravel then trusts the hosting proxy so its links use HTTPS. Startup can derive `APP_URL` from `RAILWAY_PUBLIC_DOMAIN`, but explicitly setting it also keeps worker email links consistent.

Add the hosted Google callback URL to the allowed redirects in Google Cloud while retaining the localhost redirect. Weather can use the existing noncommercial Open-Meteo configuration; paid weather credentials are optional.

Schema migrations execute in the pre-deploy container. Volumes are unavailable there. Startup creates writable storage directories and restores forecasting references after the volume is attached. Private photos remain under `storage/app/private` and are served by the application's existing controllers. Public image files can use `public/storage`; arbitrary files there are not exposed. [Pre-deploy behavior](https://docs.railway.com/deployments/pre-deploy-command)

## HTTPS email with Gmail only

The user verified the AgriFarm sender `agrifarm629@gmail.com` in Brevo on October 13, 2026 and privately saved `BREVO_API_KEY` in Railway. The web-service variables select `MAIL_MAILER=brevo`, that sender and reply address, and `AgriFarm` as the sender/reply name. Deployment `ac8efdfb-cb10-4f2d-b067-002845cc0b3c` succeeded. Read-only checks from the running application confirmed that the key is loaded and the Brevo API transport is selected; `/v3/account` and `/v3/senders` returned HTTP 200, transactional sending is enabled, and the configured sender is active. No key values or full account responses were displayed. There were no pending `order-emails` jobs at configuration time. With the user's explicit approval, exactly one real email titled `AgriFarm email setup test` was sent from the running application's Laravel mailer to `agrifarm629@gmail.com`. Brevo accepted it and its event API reported `delivered` at `2026-10-13T15:49:26+08:00`; the visible sender was rewritten to a `brevosend.com` address. Inbox versus spam placement still requires recipient confirmation. Registration/password-recovery flows remain to be verified. The order-email worker was subsequently deployed and passed its queue-processing probe, as recorded below. The Gmail DKIM/DMARC warnings remain expected; sender verification does not authenticate Gmail's domain. Temporary diagnostic/test scripts were removed after use.

1. Create a free Brevo account and finish its account/transactional-email activation requirements.
2. Add the Gmail address as a sender and verify the code sent to that inbox.
3. Create a Brevo **API key**, then put it directly in `BREVO_API_KEY` in Railway. Set the mail variables above on both web and worker.
4. Verify delivery of a login/registration code and an order update to designated test recipients once the live deployment is ready.

The free plan currently includes 300 emails/day with no card required. Brevo documents temporary rewriting of Gmail senders to its own compliant domain, including transactional mail. Recipients will see that replacement address. `MAIL_REPLY_TO_ADDRESS` preserves the Gmail inbox for replies. This is a demo option subject to account approval and delivery verification; Brevo recommends an authenticated domain for long-term use. Do not promise permanent domain-free delivery. [Brevo free plan](https://help.brevo.com/hc/en-us/articles/208589409-About-Brevo-s-pricing-plans), [sender verification](https://help.brevo.com/hc/en-us/articles/208836149-Create-a-new-sender-From-name-and-From-email), [temporary sender replacement](https://help.brevo.com/hc/en-us/articles/14925263522578-Comply-with-Gmail-Yahoo-and-Microsoft-s-requirements-for-email-senders)

`MAIL_MAILER=log` is suitable only while checking startup. It does not deliver verification codes to users and may put message contents in server logs. Enable the API mailer before opening registrations. The local `.env` still uses its existing mail settings; adding the Brevo driver does not change them.

## Order-email worker

The third service **order-email-worker** is deployed: service ID `abc22544-973b-45cc-9b62-1fc0a9ee0b52`, deployment `52a144ad-9eb8-40ae-ac82-cb12301e9798`. It runs one replica using the same application source and Dockerfile. Its settings explicitly select `deploy/railway/Dockerfile` and `bash deploy/railway/start.sh worker`, with no HTTP health check or pre-deploy migration command and no public domain or upload volume. Railway rejected setting the legacy custom configuration-file path on this new service; the worker therefore uses these service settings and a separate reviewed source bundle without the web service's root `railway.toml`.

Give the worker the same database, mail, `APP_KEY`, and HTTPS `APP_URL` variables. A public domain and upload volume are unnecessary: jobs are in PostgreSQL and the worker sends links to the web application. The worker command is:

```sh
php artisan queue:work database --queue=order-emails --sleep=1 --tries=3 --timeout=60 --memory=192
```

The deployed worker's secrets and database settings reference the `Agrifarm` service rather than storing another manually maintained copy. Ten reference variables were checked for matching resolved values without printing secrets. A harmless job placed on `order-emails` by the web application was processed by the new worker in 4.94 ms; it wrote a temporary marker and sent no email. Inspection confirmed a running queue process, database connectivity, the Brevo key and sender configuration, zero pending order-email jobs, and zero failed jobs. Test helpers and markers were removed, and the CLI's default linked service was restored to `Agrifarm`. Actual order-status email content and delivery should still be exercised with approved test recipients through the application's normal order flow.

Deploy the worker after the web migrations have succeeded. Keep it running while testing order emails. Redeploy it whenever the application code changes. Registration and password-recovery OTP notifications use Laravel's deferred connection after the HTTP response and do not depend on the order-email worker; order-status mail uses the database queue. Existing-account email/password login does not require an OTP.

## Upload the code and initialize the hosted records

Install the [official Railway CLI](https://docs.railway.com/cli) if the `railway` command is unavailable. Use its login flow, then link this folder to the **AgriFarm** project, **production** environment, and **Agrifarm** service. Never paste account passwords, authentication codes, or API keys into chat. Review `railway status` before an upload so it targets the intended project/environment/service.

```powershell
railway login
railway link
railway status
railway up --service Agrifarm
```

For the worker, update the separate reviewed release at `tmp/railway-release-worker-20261013` from the same source as the web release. Keep the worker release's root free of the web `railway.toml`, so it uses the worker's explicit service settings. The reusable source bundle contains no local credentials or uploaded participant data. Upload to the existing worker explicitly:

```powershell
railway up tmp/railway-release-worker-20261013 --path-as-root --project 34716a6b-0981-4d08-a018-6952f127efdc --service order-email-worker --environment production
```

The agreed separate thesis dataset was prepared before Railway was selected. Its existing private bundle remains at `D:\AgrifarmBackups\upsun-starting-data-20261012-162115`; the full private localhost backup remains at `D:\AgrifarmBackups\20261012-161226`. Removing unused hosting configuration does not remove or rename either backup.

After the hosted schema is migrated and verified empty, import **only** the bundle's selected starting records and corresponding photo files: **4 accounts (1 admin, 3 sellers), 5 products, 13 files totaling about 5.11 MiB**. Copy `private` photo paths into `storage/app/private` on the web volume and set their owner to `www-data`. Keep `hosted-environment.json` and `hosted-temporary-credentials.json` private; they are configuration/access records, not application data to upload. Review the prepared SQL against the migrated schema before import. Initialize once, then preserve newly collected participant records.

The complete localhost dataset remains local. Existing orders, reviews, notifications, harvests, saved forecasts, sessions, queue contents, and client-demo photos are excluded from the hosted starting set. Do not run a full local database restore, `migrate:fresh`, or development seeders against the hosted database. Hosted participant activity and localhost demonstration records remain separate; deploying code does not synchronize them. Preserve selected account/product IDs, relationships, and private photo paths when restoring the starting bundle. Browser-local carts are not part of a database transfer.

Email/password login for existing hosted accounts does not use a login OTP. Only the selected admin/seller accounts exist online initially; localhost customer accounts are not included. Accounts using the published development password received hosted-only temporary passwords during bundle preparation. Use the matching entry in the private `hosted-temporary-credentials.json` bundle file for initial access, rather than assuming the localhost password remains valid. Seller password replacement is required on first sign-in. Registration verification and password recovery still need the email provider.

The missing Brevo API key was confirmed on the live service. The user requested Google login first and Brevo last, and explicitly authorized the Google credential configuration on October 13, 2026. `GOOGLE_CLIENT_ID` and `GOOGLE_CLIENT_SECRET` were transferred privately from the local `.env` to this Railway application service through stdin; their values were not displayed. `GOOGLE_REDIRECT_URI` is set to `https://agrifarm-production-6bdb.up.railway.app/auth/google/callback`. Redeployment `f59844c8-a6ab-4b81-b980-058560240eae` succeeded. The user found the existing AgriFarm Web application OAuth client and saved the authorized redirect URI. The hosted Google redirect returns HTTP 302 with the correct callback and PKCE enabled. Google now redirects to `/v3/signin/identifier` without an authorization error; the earlier `redirect_uri_mismatch` is resolved. Actual user sign-in, token exchange, and arrival at the application dashboard remain to be confirmed. The local `.env` remains unchanged.

## Verification and remaining work

The shared 401, 403, 404, 500, and 503 error screen now uses the application's branding and responsive action controls. Buttons stack at mobile widths, remain side by side from the small-screen breakpoint upward, have a minimum 48-pixel height, retain single-line labels, and prevent icon shrinking. The card and branding no longer compete for space on short screens, and dark-theme colors are supported. The frontend build and isolated browser checks passed at 390, 768, and 1440 pixels for all five states, including overflow, label/icon dimensions, branding separation, Go Back navigation, Return Home navigation, and dark mode. The 401/500/503 presentations were exercised with browser-only page fixtures; no production server failure was triggered.

A read-only backend audit on October 13, 2026 compared 163 Laravel application, route, configuration, migration, dependency-manifest, and Python source files with the running deployment: none were missing or different. Runtime checks confirmed production mode with debug disabled, a connected PostgreSQL database with 35 applied migrations, the database queue driver, Brevo mailer, loaded Google and Brevo credentials, enabled Open-Meteo, an executable forecast interpreter, all four forecast reference files, and the private-upload directory. There were zero pending order-email jobs and zero failed jobs at the time of inspection. Railway had only the `Agrifarm` and `Postgres` services; the separate order-email worker was not running. These checks establish deployed source and configuration, not successful end-to-end execution of every feature.

On October 13, 2026, the seller's first-login password form appeared unstyled because `Seller/TemporaryPassword.jsx` did not import the existing `seller.css` stylesheet. The standalone page now imports it directly. The production frontend build passed. Browser checks using an isolated SQLite test account passed at 390, 768, and 1440 pixels, including the centered card, no horizontal overflow, required-field validation, disabled submit state, and successful password replacement. No hosted account passwords were changed by these checks. Railway deployment `a8dc65c5-d380-4665-b453-ec8e0eb33bcf` succeeded; the live `/up`, page JavaScript, and seller stylesheet returned HTTP 200, and the live build manifest includes the stylesheet for this page.

Local validation: the container builds the frontend and runs all 30 Python tests; all 312 PHP tests pass, including HTTPS mail requests using a fake provider response. Compatible Laravel/CommonMark security patches were applied, and Composer reported no known advisories at preparation time.

The seller first-login page was subsequently updated to reuse the login page's `AuthLayout`, `PasswordField`, and `SubmitButton` components, including the existing produce background and AgriFarm branding. It no longer needs the standalone seller stylesheet. The production build and isolated browser checks passed at 390, 768, and 1440 pixels: background delivery, matching input typography, no horizontal overflow, required-field and confirmation errors, password visibility controls, disabled saving state, and successful replacement. Deployment `e010f64c-d859-431c-8dff-67d613c9b953` succeeded; the live health endpoint, page and shared component assets, and background image returned HTTP 200.

The final image is about 404 MiB. With a separate PostgreSQL 18 test database and a mounted upload volume, the web container passed `/up`, login, built JavaScript delivery, HTTPS asset links, secure session cookies, private-file protection, and a PHP-to-Python four-year forecast for 20 crops (31.84 seconds). This ran with a 1 GiB memory cap and two CPU cores; it establishes one local test workload, not hosted concurrency or later Free-plan capacity. The separate order-email worker started successfully. A database record, private upload, public image, and all four reference JSON files survived web-container replacement using the same volume/database. Isolated test resources were removed after verification; no real email was sent.

Before admitting thesis participants, verify the deployed `/up`, login/registration/OTP flow, Google callback, selected account/product photos, order emails and worker retry behavior, weather access, a full forecast upload, and saved forecasts. Restart/redeploy the web service and confirm stored photos and records remain. Real Brevo delivery and Railway network behavior cannot be established by local fake-provider tests.

Monitor the volume capacity and resource use during the demo. Export newly collected records and photos before relying on trial expiration: Railway documents deletion of trial volumes 30 days after credits expire. [Trial data retention](https://docs.railway.com/pricing/free-trial)
