# AgriFarm

AgriFarm is an undergraduate thesis project for an agricultural marketplace and decision-support system. This repository currently contains only the shared application foundation; business features and the database schema are intentionally deferred.

## Current stack

- Laravel 12 and PHP 8.2+
- React 19 and Inertia.js 3
- Tailwind CSS 4 and Vite 8
- PostgreSQL as the only application database

The project does not currently include authentication, domain migrations, Filament, charts, report generators, forecasting integration, Docker, or deployment configuration.

## Requirements

- PHP 8.2 or newer with the `pdo_pgsql` extension
- Composer 2
- Node.js 22.12 or newer
- npm
- PostgreSQL

Laravel 12 is used because the current development machine runs PHP 8.2. Upgrade PHP before considering a later Laravel major version.

## Local setup

```powershell
composer install
npm install
Copy-Item .env.example .env
php artisan key:generate
```

Create a local PostgreSQL database named `agrifarm`, then set your own PostgreSQL username and password in `.env`. Never commit `.env`.

No AgriFarm migrations exist yet. Do not run database migrations until the schema has been reviewed and approved.

Start the backend and frontend in separate terminals:

```powershell
php artisan serve
```

```powershell
npm run dev
```

Open `http://127.0.0.1:8000`.

## Quality checks

```powershell
php artisan test
vendor\bin\pint --test
npm run build
```

## Development rules

- Keep controllers small: validate, authorize, delegate substantial work, and return a response.
- Use Eloquent directly for straightforward CRUD; introduce a service only for meaningful business workflows.
- Use Form Requests for non-trivial validation and Policies/Middleware for authorization.
- Use Inertia for normal application pages instead of creating an unnecessary REST API.
- Add folders and packages only when a feature needs them.
- Keep real research data, credentials, `vendor`, and `node_modules` out of Git.

See [docs/architecture.md](docs/architecture.md) for the approved structure and feature boundaries.

## Deferred work

The next design step is the database relationship review. Authentication, marketplace features, role dashboards, reporting, and the independent Python/SARIMA workspace should be implemented only in their corresponding phases.
