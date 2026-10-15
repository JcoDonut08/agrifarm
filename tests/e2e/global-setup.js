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
    // General seller scenarios start after onboarding; guide tests clear this marker.
    execFileSync('php', ['-r', String.raw`
        require 'vendor/autoload.php';
        $app = require 'bootstrap/app.php';
        $app->make(Illuminate\Contracts\Console\Kernel::class)->bootstrap();
        if (config('database.default') !== 'sqlite' || realpath(config('database.connections.sqlite.database')) !== realpath('database/playwright.sqlite')) throw new RuntimeException('Isolated database required');
        App\Models\User::where('role', 'seller')->update(['seller_guide_dismissed_at' => now()]);
    `], { cwd: process.cwd(), env: testEnvironment, stdio: 'pipe' });
    fs.copyFileSync(databasePath, path.resolve('database/playwright-baseline.sqlite'));
}
