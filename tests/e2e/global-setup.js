import { execFileSync } from "node:child_process";
import fs from "node:fs";
import path from "node:path";

export default function globalSetup() {
    const databasePath = path.resolve("database/playwright.sqlite");
    const logPath = path.resolve("storage/logs/playwright.log");
    const testEnvironment = {
        ...process.env,
        APP_ENV: "local",
        APP_URL: "http://127.0.0.1:8010",
        BCRYPT_ROUNDS: "4",
        DB_CONNECTION: "sqlite",
        DB_DATABASE: databasePath,
        MAIL_MAILER: "log",
        SESSION_DRIVER: "file",
        CACHE_STORE: "e2e",
        LOG_CHANNEL: "e2e",
        DB_URL: "",
        OPEN_METEO_ENABLED: "false",
        GOOGLE_WEATHER_ENABLED: "false",
        QUEUE_CONNECTION: "sync",
    };

    fs.mkdirSync(path.dirname(databasePath), { recursive: true });
    fs.closeSync(fs.openSync(databasePath, "w"));
    fs.mkdirSync(path.dirname(logPath), { recursive: true });
    fs.writeFileSync(logPath, "");

    execFileSync("php", ["artisan", "optimize:clear"], {
        cwd: process.cwd(),
        env: testEnvironment,
        stdio: "inherit",
    });

    execFileSync("php", ["artisan", "migrate:fresh", "--seed", "--force"], {
        cwd: process.cwd(),
        env: testEnvironment,
        stdio: "inherit",
    });
    fs.copyFileSync(databasePath, path.resolve('database/playwright-baseline.sqlite'));
}
