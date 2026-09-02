import { execFileSync } from 'node:child_process';
import fs from 'node:fs';
import path from 'node:path';

export default function globalSetup() {
    const databasePath = path.resolve('database/playwright.sqlite');
    const logPath = path.resolve('storage/logs/laravel.log');

    fs.mkdirSync(path.dirname(databasePath), { recursive: true });
    fs.closeSync(fs.openSync(databasePath, 'w'));
    fs.mkdirSync(path.dirname(logPath), { recursive: true });
    fs.writeFileSync(logPath, '');

    execFileSync('php', ['artisan', 'migrate:fresh', '--seed', '--force'], {
        cwd: process.cwd(),
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
        stdio: 'inherit',
    });
}
