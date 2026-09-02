# AgriFarm

AgriFarm is an undergraduate thesis project for an agricultural marketplace and decision-support system. The current implementation provides the complete account and role-access foundation; marketplace, inventory, profile editing, forecasting integration, and deployment remain deferred.

## Current stack

- Laravel 12 and PHP 8.2+
- React 19 and Inertia.js 3
- Tailwind CSS 4 and Vite 8
- PostgreSQL as the application database
- Eloquent models and Laravel session authentication

## Authentication foundation

- Customer-only public registration with recorded Terms and Privacy acceptance
- Six-digit customer email verification after registration
- Shared credential form for Customer, Seller, and CENRO Admin accounts
- Hashed, single-use six-digit email OTP before the authenticated session is created
- OTP expiration, attempt limits, resend cooldown, hourly resend limit, and previous-code invalidation
- Server-side role middleware and role-specific redirects
- Email OTP verification before password reset for every role
- Session invalidation and CSRF-token renewal on logout
- Public Terms of Use and Privacy Notice

## Requirements

- PHP 8.2 or newer with the `pdo_pgsql` extension
- Composer 2
- Node.js 22.12 or newer
- npm
- PostgreSQL

Laravel 12 is used because the current development machine runs PHP 8.2.

## Local setup

```powershell
composer install
npm install
Copy-Item .env.example .env
php artisan key:generate
```

Create a local PostgreSQL database named `agrifarm`, then set `DB_HOST`, `DB_PORT`, `DB_DATABASE`, `DB_USERNAME`, and `DB_PASSWORD` in `.env`. Never commit `.env`. On the current Windows development machine PostgreSQL listens on port `5433`, so the local `DB_PORT` must match that service.

Run the schema and create development-only accounts:

```powershell
php artisan migrate --seed
```

If the Windows PHP installation has PostgreSQL available but disabled in `php.ini`, enable `pdo_pgsql` before running the command. A one-command local check can also be run with `php -d extension=pdo_pgsql artisan migrate --seed`.

Start the backend and frontend in separate terminals:

```powershell
php artisan serve
```

```powershell
npm run dev
```

Open `http://127.0.0.1:8000`.

## Gmail OTP delivery

AgriFarm sends registration, sign-in, and password-reset OTPs with Laravel Notifications and the built-in SMTP mailer. To deliver them to real Gmail inboxes, turn on 2-Step Verification for the sending Google account, create a Google App Password, and set these values in `.env`:

```dotenv
MAIL_MAILER=smtp
MAIL_SCHEME=smtp
MAIL_HOST=smtp.gmail.com
MAIL_PORT=587
MAIL_USERNAME="your-agri-email@gmail.com"
MAIL_PASSWORD="your-16-character-google-app-password"
MAIL_FROM_ADDRESS="your-agri-email@gmail.com"
MAIL_FROM_NAME="AgriFarm Marketplace"
```

Use the Google App Password, not the normal Gmail account password. After changing `.env`, run `php artisan config:clear`. Never commit the real email address or App Password.

For offline development, set `MAIL_MAILER=log`; OTP messages will then be written to `storage/logs/laravel.log` instead of being delivered.

## Development accounts

The seeder creates these accounts only outside production:

| Role | Email | Password | Destination |
| --- | --- | --- | --- |
| Customer | `customer@agrifarm.test` | `AgriFarm123!` | `/customer` |
| Seller | `seller@agrifarm.test` | `AgriFarm123!` | `/seller/dashboard` |
| CENRO Admin | `admin@agrifarm.test` | `AgriFarm123!` | `/admin/dashboard` |

Seller and CENRO Admin accounts cannot be created through public registration.

## Quality checks

```powershell
php artisan test
vendor\bin\pint --test
npm run build
npm run test:e2e
```

PHP feature tests use an isolated in-memory SQLite database and never touch the configured PostgreSQL database. Playwright creates a disposable ignored SQLite file, seeds the three development accounts, starts Laravel locally, and tests the full browser flow in installed Google Chrome at 390px, 768px, and 1440px.

## Development rules

- Laravel owns validation, authorization, authentication, and database access.
- React owns presentation and transient interface state through Inertia.
- Public registration must always assign `customer` on the server; never add a role selector.
- Keep controllers small and use services for multi-step security or business workflows.
- Use Eloquent directly rather than adding a repository layer.
- Keep real research data, credentials, `vendor`, `node_modules`, and generated QA artifacts out of Git.

See [docs/architecture.md](docs/architecture.md) for the approved structure and feature boundaries.

## Deferred work

Profile editing, customer and seller profiles, seller store setup, marketplace features, orders, inventory, forecasting integration, reporting, and deployment are not part of this authentication phase.
