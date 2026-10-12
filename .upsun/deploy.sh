#!/usr/bin/env bash
set -eu

# Fail before changing schema if the private key or service mapping is missing.
test -n "${APP_KEY:-}"
test -n "${DB_HOST:-}"
test -n "${APP_URL:-}"

mkdir -p bootstrap/cache storage/framework/cache/data storage/framework/views storage/framework/sessions storage/logs
php artisan config:clear
php artisan package:discover --ansi
php artisan migrate --force --no-interaction
php artisan config:cache
php artisan view:cache
php artisan forecast:check
php artisan queue:restart
