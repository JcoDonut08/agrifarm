import { defineConfig } from '@playwright/test';
import path from 'node:path';

const databasePath = path.resolve('database/playwright.sqlite');

export default defineConfig({
    testDir: './tests/e2e',
    fullyParallel: false,
    workers: 1,
    timeout: 180_000,
    preserveOutput: 'always',
    expect: { timeout: 15_000 },
    reporter: [['list'], ['html', { open: 'never' }]],
    globalSetup: './tests/e2e/global-setup.js',
    use: {
        baseURL: 'http://127.0.0.1:8010',
        channel: 'chrome',
        screenshot: 'only-on-failure',
        trace: 'retain-on-failure',
    },
    webServer: {
        command: 'php artisan serve --host=127.0.0.1 --port=8010',
        url: 'http://127.0.0.1:8010',
        reuseExistingServer: false,
        timeout: 120_000,
        env: {
            ...process.env,
            APP_ENV: 'local',
            APP_URL: 'http://127.0.0.1:8010',
            BCRYPT_ROUNDS: '4',
            DB_CONNECTION: 'sqlite',
            DB_DATABASE: databasePath,
            MAIL_MAILER: 'log',
            SESSION_DRIVER: 'file',
            CACHE_STORE: 'file',
            QUEUE_CONNECTION: 'sync',
        },
    },
});
