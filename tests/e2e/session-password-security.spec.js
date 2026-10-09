import { expect, test } from '@playwright/test';
import { execFileSync } from 'node:child_process';
import path from 'node:path';

test.beforeAll(() => {
    execFileSync('php', ['-r', String.raw`
        require 'vendor/autoload.php';
        $app = require 'bootstrap/app.php';
        $app->make(Illuminate\Contracts\Console\Kernel::class)->bootstrap();
        if (config('database.default') !== 'sqlite' || realpath(config('database.connections.sqlite.database')) !== realpath('database/playwright.sqlite')) throw new RuntimeException('Isolated database required');
        foreach ([390, 768, 1440] as $width) {
            foreach ([App\Enums\UserRole::Customer, App\Enums\UserRole::Seller] as $role) {
                App\Models\User::factory()->create([
                    'email' => 'session-'.$role->value.'-'.$width.'@example.test',
                    'role' => $role, 'password' => 'OriginalPassword123!',
                ]);
            }
        }
    `], {
        env: { ...process.env, APP_ENV: 'local', DB_CONNECTION: 'sqlite', DB_DATABASE: path.resolve('database/playwright.sqlite') },
        stdio: 'pipe',
    });
});

async function signIn(page, email, password) {
    await page.goto('/login');
    await page.getByLabel('Email address').fill(email);
    await page.getByLabel('Password', { exact: true }).fill(password);
    await page.getByRole('button', { name: 'Login', exact: true }).click();
}

for (const width of [390, 768, 1440]) {
    for (const role of ['customer', 'seller']) {
        test(`${role} password change invalidates another browser at ${width}px`, async ({ browser, baseURL }) => {
            const contexts = await Promise.all([0, 1].map(() => browser.newContext({ baseURL, viewport: { width, height: 1000 } })));
            try {
                const [current, other] = await Promise.all(contexts.map(context => context.newPage()));
                const email = `session-${role}-${width}@example.test`;
                const settings = role === 'seller' ? '/seller/dashboard?section=profile' : '/customer';
                const protectedPage = role === 'seller' ? '/seller/dashboard?section=products' : '/customer/orders';
                await Promise.all([current, other].map(async page => {
                    await signIn(page, email, 'OriginalPassword123!');
                    await expect(page).not.toHaveURL(/\/login/, { timeout: 45_000 });
                    await page.goto(protectedPage);
                    await expect(page).toHaveURL(new RegExp(role === 'seller' ? '/seller/dashboard' : '/customer/orders'));
                }));

                await current.goto(settings);
                await current.getByLabel('Current password', { exact: true }).fill('OriginalPassword123!');
                await current.getByLabel('New password', { exact: true }).fill('ChangedPassword123!');
                await current.getByLabel('Confirm new password', { exact: true }).fill('ChangedPassword123!');
                await current.getByRole('button', { name: 'Update password', exact: true }).click();
                await expect(current.getByLabel('New password', { exact: true })).toHaveValue('');
                await current.reload();
                await expect(current.getByLabel('Current password', { exact: true })).toBeVisible();

                await other.goto(protectedPage);
                await expect(other).toHaveURL(/\/login/);
                await signIn(other, email, 'OriginalPassword123!');
                await expect(other.getByText('These credentials do not match our records.', { exact: true })).toBeVisible();
                await expect(other).toHaveURL(/\/login/);
                await signIn(other, email, 'ChangedPassword123!');
                await expect(other).not.toHaveURL(/\/login/, { timeout: 45_000 });
                await other.goto(protectedPage);
                await expect(other).toHaveURL(new RegExp(role === 'seller' ? '/seller/dashboard' : '/customer/orders'));
            } finally {
                await Promise.all(contexts.map(context => context.close()));
            }
        });
    }
}
