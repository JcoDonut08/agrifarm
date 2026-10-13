#!/usr/bin/env bash
set -euo pipefail
cd /app

# Railway mounts the volume at startup, after the image has been built.
# Keep reference files outside that mount in the image, then restore them here.
directories=(bootstrap/cache storage/app/forecasting storage/app/private storage/app/public
    storage/framework/cache/data storage/framework/sessions storage/framework/views storage/logs)
mkdir -p "${directories[@]}"
cp /opt/agrifarm/forecasting/*.json storage/app/forecasting/
chown www-data:www-data "${directories[@]}" storage storage/app storage/framework storage/framework/cache

if [ -z "${APP_URL:-}" ] && [ -n "${RAILWAY_PUBLIC_DOMAIN:-}" ]; then
    export APP_URL="https://${RAILWAY_PUBLIC_DOMAIN}"
fi

: "${APP_KEY:?Configure a stable, private hosted APP_KEY before starting the service.}"
: "${APP_URL:?Configure APP_URL with the hosted HTTPS address.}"
: "${DB_HOST:?Configure the private PostgreSQL connection variables.}"

runuser -u www-data -- php artisan config:clear
runuser -u www-data -- php artisan config:cache
runuser -u www-data -- php artisan view:cache

case "${1:-web}" in
    web)
        case "${PORT:-8080}" in
            ''|*[!0-9]*) printf '%s\n' 'PORT must contain a numeric TCP port.' >&2; exit 1 ;;
        esac
        test "$PORT" -gt 0 && test "$PORT" -le 65535
        runuser -u www-data -- php artisan forecast:check
        ln -sfn /app/storage/app/public public/storage
        envsubst '${PORT}' < deploy/railway/nginx.conf.template > /etc/nginx/nginx.conf
        nginx -t
        exec /usr/bin/supervisord -c /app/deploy/railway/supervisord.conf
        ;;
    worker)
        exec runuser -u www-data -- php artisan queue:work database \
            --queue=order-emails --sleep=1 --tries=3 --timeout=60 --memory=192
        ;;
    *) printf '%s\n' 'Use start.sh web or start.sh worker.' >&2; exit 1 ;;
esac
