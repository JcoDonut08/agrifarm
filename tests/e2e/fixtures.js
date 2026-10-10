import { test as base, expect } from '@playwright/test';
import { execFileSync } from 'node:child_process';
import fs from 'node:fs';
import path from 'node:path';

Object.assign(process.env, {
    APP_ENV: 'local', DB_CONNECTION: 'sqlite', DB_DATABASE: path.resolve('database/playwright.sqlite'), DB_URL: '',
    CACHE_STORE: 'e2e', LOG_CHANNEL: 'e2e', MAIL_MAILER: 'log', BCRYPT_ROUNDS: '4',
    OPEN_METEO_ENABLED: 'false', GOOGLE_WEATHER_ENABLED: 'false', SCOUT_DRIVER: 'null',
});

// Each test starts with the same seeded accounts, never another test's orders or forecasts.
// The single-worker server closes its SQLite connection after each request.
export const test = base.extend({
    isolatedData: [async ({}, use) => {
        const database = path.resolve('database/playwright.sqlite');
        const baseline = path.resolve('database/playwright-baseline.sqlite');
        if (!fs.existsSync(baseline) || !fs.readFileSync(baseline).subarray(0, 16).equals(Buffer.from('SQLite format 3\0'))) {
            throw new Error('Run Playwright global setup to create the isolated baseline.');
        }
        fs.copyFileSync(baseline, database);
        execFileSync('php', ['-r', String.raw`
            require 'vendor/autoload.php';
            $app = require 'bootstrap/app.php';
            $app->make(Illuminate\Contracts\Console\Kernel::class)->bootstrap();
            if (config('database.default') !== 'sqlite' || realpath(config('database.connections.sqlite.database')) !== realpath('database/playwright.sqlite')) throw new RuntimeException('Isolated database required');
            Illuminate\Support\Facades\Cache::store('e2e')->flush();
        `], { env: { ...process.env, APP_ENV: 'local', DB_CONNECTION: 'sqlite', DB_DATABASE: database, DB_URL: '', CACHE_STORE: 'e2e', LOG_CHANNEL: 'e2e' }, stdio: 'pipe' });
        await use();
    }, { auto: true }],
});

export { expect };
