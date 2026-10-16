FROM node:24-bookworm-slim AS frontend
WORKDIR /app
COPY package.json package-lock.json vite.config.js jsconfig.json ./
RUN npm ci --no-audit --no-fund
COPY resources ./resources
COPY public ./public
RUN npm run build

FROM php:8.4-fpm-trixie AS application
WORKDIR /app

RUN apt-get update \
    && apt-get install -y --no-install-recommends \
        ca-certificates gettext-base git unzip nginx supervisor util-linux \
        python3 python3-venv libstdc++6 \
        libfreetype6-dev libjpeg62-turbo-dev libpng-dev libwebp-dev \
        libicu-dev libpq-dev libzip-dev \
    && docker-php-ext-configure gd --with-freetype --with-jpeg --with-webp \
    && docker-php-ext-install -j4 bcmath gd intl opcache pcntl pdo_pgsql zip \
    && rm -rf /var/lib/apt/lists/*

COPY --from=composer:2 /usr/bin/composer /usr/local/bin/composer
COPY python/requirements.txt /opt/agrifarm/python-requirements.txt
RUN python3 -m venv /opt/venv \
    && /opt/venv/bin/python -m pip install --only-binary=:all: --no-cache-dir -r /opt/agrifarm/python-requirements.txt \
    && /opt/venv/bin/python -m pip check

COPY composer.json composer.lock ./
RUN composer install --no-dev --prefer-dist --no-interaction --no-scripts --no-autoloader

# .dockerignore limits this copy to release source and synthetic fixtures.
COPY . ./
COPY storage/app/forecasting/*.json /opt/agrifarm/forecasting/

ENV APP_ENV=production \
    APP_DEBUG=false \
    LOG_CHANNEL=stderr \
    LOG_LEVEL=warning \
    DB_CONNECTION=pgsql \
    SESSION_DRIVER=file \
    SESSION_SECURE_COOKIE=true \
    CACHE_STORE=file \
    FILESYSTEM_DISK=local \
    QUEUE_CONNECTION=database \
    MAIL_MAILER=log \
    FORECAST_PYTHON_BIN=/opt/venv/bin/python \
    FORECAST_TIMEOUT=180 \
    FORECAST_TUNING_SECONDS=30 \
    OPENBLAS_NUM_THREADS=1 \
    OMP_NUM_THREADS=1 \
    PYTHONUNBUFFERED=1 \
    PORT=8080

RUN mkdir -p bootstrap/cache storage/app/forecasting storage/app/private storage/app/public \
        storage/framework/cache/data storage/framework/sessions storage/framework/views storage/logs \
    && cp /opt/agrifarm/forecasting/*.json storage/app/forecasting/ \
    && composer dump-autoload --no-dev --optimize --no-interaction \
    && /opt/venv/bin/python -m unittest discover -s python/tests -v \
    && chown -R www-data:www-data bootstrap/cache storage

COPY --from=frontend /app/public/build ./public/build
COPY deploy/railway/php.ini /usr/local/etc/php/conf.d/agrifarm.ini
COPY deploy/railway/php-fpm.conf /usr/local/etc/php-fpm.d/zz-agrifarm.conf

EXPOSE 8080
CMD ["bash", "deploy/railway/start.sh", "web"]
