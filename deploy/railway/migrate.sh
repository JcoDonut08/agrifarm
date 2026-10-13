#!/usr/bin/env bash
set -euo pipefail
cd /app

# Pre-deploy commands have database access, but no mounted upload volume.
: "${APP_KEY:?Configure the private hosted APP_KEY before migrating.}"
: "${DB_HOST:?Configure the private PostgreSQL connection variables.}"
mkdir -p bootstrap/cache storage/framework/cache/data storage/framework/sessions storage/framework/views storage/logs
php artisan config:clear
php artisan migrate --force --no-interaction
