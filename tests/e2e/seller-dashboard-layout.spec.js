import { expect, test } from './fixtures';
import { execFileSync } from 'node:child_process';
import fs from 'node:fs/promises';

test.afterAll(async () => {
    await fs.rm('storage/app/private/e2e/dashboard-layout.jpg', { force: true });
});

for (const width of [390, 768, 1440]) {
    test(`seller greeting and weather summary at ${width}px`, async ({ page }, testInfo) => {
        await page.setViewportSize({ width, height: 1000 });
        await page.clock.setFixedTime('2026-10-12T01:00:00Z');
        await page.addInitScript(() => {
            localStorage.setItem('agrifarm-theme', 'light');
            if (!localStorage.getItem('agrifarm-seller-language')) localStorage.setItem('agrifarm-seller-language', 'english');
        });
        await page.goto('/login');
        await page.getByLabel('Email address').fill('brgymaybunga@gmail.com');
        await page.getByLabel('Password', { exact: true }).fill('AgriFarm123!');
        await page.getByRole('button', { name: 'Login', exact: true }).click();
        await expect(page).toHaveURL(/\/seller\/dashboard$/);
        const summary = page.locator('.seller-header-summary');
        const greeting = summary.locator('.seller-greeting');
        const weather = summary.locator('.seller-header-weather');
        await expect(greeting).toHaveText('Good morning, Maybunga');
        await expect(weather).toContainText('Pasig City');
        await expect(weather).toContainText('Weather unavailable');
        await expect(weather.locator('strong')).toHaveCount(0);
        await page.locator('.seller-topbar').screenshot({ path: testInfo.outputPath(`header-unavailable-${width}.png`) });

        // Test-only weather responses exercise the existing Inertia prop contract.
        let fixture = {
            provider: 'open_meteo', location: 'Pasig City', temperature_c: 30.6,
            humidity_percent: 65, rain_chance_percent: 10, wind_kph: 8,
            feels_like_c: 33, condition: 'Clear sky', condition_key: 'clear',
            observed_at: '2026-10-12T09:00:00+08:00', is_stale: false, daily: [], hourly: [],
        };
        await page.route('**/seller/dashboard*', async route => {
            if (!route.request().headers()['x-inertia']) return route.continue();
            const response = await route.fetch();
            const payload = await response.json();
            await route.fulfill({ response, json: { ...payload, props: { ...payload.props, weather: fixture } } });
        });
        const reloadSummary = () => page.locator('.seller-sidebar .seller-brand a').click();
        await reloadSummary();
        await expect(weather.locator('strong')).toHaveText('31°C');
        for (const theme of ['light', 'dark']) {
            await page.evaluate(value => document.documentElement.classList.toggle('dark', value === 'dark'), theme);
            expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBeTruthy();
            const summaryBounds = await summary.boundingBox();
            const greetingBounds = await greeting.boundingBox();
            const weatherBounds = await weather.boundingBox();
            const controls = await page.locator('.seller-navbar-actions').boundingBox();
            expect(greetingBounds.x + greetingBounds.width).toBeLessThanOrEqual(weatherBounds.x);
            expect(weatherBounds.x + weatherBounds.width).toBeLessThanOrEqual(width);
            if (width <= 1000) {
                expect(controls.y + controls.height).toBeLessThanOrEqual(summaryBounds.y);
            } else {
                expect(summaryBounds.x + summaryBounds.width).toBeLessThanOrEqual(controls.x);
            }
            await page.screenshot({ path: testInfo.outputPath(`summary-dashboard-${width}-${theme}.png`), fullPage: true });
            await page.locator('.seller-topbar').screenshot({ path: testInfo.outputPath(`header-weather-${width}-${theme}.png`) });
        }
        for (const [time, expected] of [
            ['2026-10-12T04:00:00Z', 'Good afternoon, Maybunga'],
            ['2026-10-12T10:00:00Z', 'Good evening, Maybunga'],
        ]) {
            await page.clock.setFixedTime(time);
            await page.evaluate(() => document.dispatchEvent(new Event('visibilitychange')));
            await expect(greeting).toHaveText(expected);
        }
        fixture = { ...fixture, temperature_c: 0, is_stale: true };
        await reloadSummary();
        await expect(weather.locator('strong')).toHaveText('0°C');
        await expect(weather).toContainText('Last update');
        fixture = { ...fixture, temperature_c: null };
        await reloadSummary();
        await expect(weather.locator('strong')).toHaveCount(0);
        await expect(weather).toContainText('Weather unavailable');

        fixture = { ...fixture, temperature_c: 30.6, is_stale: false };
        await page.evaluate(() => localStorage.setItem('agrifarm-seller-language', 'filipino'));
        await page.reload();
        await reloadSummary();
        await expect(greeting).toHaveText('Magandang gabi, Maybunga');
        await expect(weather.locator('strong')).toHaveText('31°C');
        expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBeTruthy();
        await page.locator('.seller-topbar').screenshot({ path: testInfo.outputPath(`header-filipino-${width}.png`) });
        await page.getByRole('button', { name: 'Mga abiso', exact: true }).click();
        await expect(page.locator('#seller-notification-panel')).toBeVisible();
        await page.keyboard.press('Escape');
        await expect(page.locator('#seller-notification-panel')).toHaveCount(0);
        await page.locator('.seller-account').click();
        await expect(page).toHaveURL(/section=profile/);
        await expect(greeting).toHaveText('Magandang gabi, Maybunga');
    });
}

test('seller dashboard keeps sales and ratings readable on phones', async ({ page }, testInfo) => {
    execFileSync('php', ['-r', String.raw`
        require 'vendor/autoload.php';
        $app = require 'bootstrap/app.php';
        $app->make(Illuminate\Contracts\Console\Kernel::class)->bootstrap();
        if (config('database.default') !== 'sqlite' || realpath(config('database.connections.sqlite.database')) !== realpath('database/playwright.sqlite')) throw new RuntimeException('Isolated database required');
        $template = App\Models\User::where('email', 'brgymaybunga@gmail.com')->firstOrFail();
        $seller = new App\Models\User;
        $seller->forceFill(['name' => 'Barangay Maybunga', 'email' => 'dashboard-layout@agrifarm.test',
            'password' => $template->password, 'role' => 'seller', 'barangay' => 'Maybunga',
            'account_status' => 'active', 'email_verified_at' => now()])->save();
        Illuminate\Support\Facades\Storage::disk('local')->put('e2e/dashboard-layout.jpg', file_get_contents('public/images/pasig-planting-3.jpg'));
        $product = $seller->products()->create(['name' => 'Dashboard Pechay', 'category' => 'Vegetables',
            'price' => 30, 'unit' => 'piece', 'stock' => 10, 'threshold' => 2, 'photo_path' => 'e2e/dashboard-layout.jpg']);
        foreach ([['delivered', 92000, now()->utc()], ['delivered', 100, null], ['pending', 30, null]] as [$status, $total, $date]) {
            $order = new App\Models\WalkInOrder;
            $order->forceFill(['user_id' => $seller->id, 'product_id' => $product->id,
                'customer_name' => 'Dashboard buyer', 'product_name' => $product->name,
                'unit' => 'piece', 'quantity' => 1, 'unit_price' => $total, 'total' => $total,
                'status' => $status, 'delivered_at' => $date, 'inventory_source' => 'stock'])->save();
        }
        $buyer = App\Models\User::where('email', 'customer@agrifarm.test')->firstOrFail();
        foreach ([4, 5] as $rating) {
            App\Models\ProductReview::create(['user_id' => $buyer->id, 'product_id' => $product->id,
                'product_key' => 'seller-'.$product->id, 'rating' => $rating, 'comment' => 'Fresh produce.']);
        }
    `], { env: process.env, stdio: 'pipe' });

    const errors = [];
    page.on('pageerror', error => errors.push(error.message));
    await page.addInitScript(() => localStorage.setItem('agrifarm-theme', 'light'));
    await page.goto('/login');
    await page.getByLabel('Email address').fill('dashboard-layout@agrifarm.test');
    await page.getByLabel('Password', { exact: true }).fill('AgriFarm123!');
    await page.getByRole('button', { name: 'Login', exact: true }).click();
    await expect(page).toHaveURL(/\/seller\/dashboard$/);

    for (const language of ['english', 'filipino']) {
        await page.evaluate(value => localStorage.setItem('agrifarm-seller-language', value), language);
        await page.reload();
        for (const width of [360, 390, 768, 1440]) {
            await page.setViewportSize({ width, height: 1000 });
            for (const theme of ['light', 'dark']) {
                await page.evaluate(value => document.documentElement.classList.toggle('dark', value === 'dark'), theme);
                const sales = page.locator('.seller-stat--total');
                const rating = page.locator('.seller-stat--rating');
                await expect(sales.locator('.seller-stat-value')).toHaveText('₱92,100.00');
                await expect(rating.locator('.seller-stat-value')).toHaveText('4.5');
                await expect(rating.getByRole('img', { name: '4.5 out of 5 stars' })).toBeVisible();
                expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBeTruthy();
                for (const card of await page.locator('.seller-dashboard-stats .seller-stat').all()) {
                    expect(await card.evaluate(element => {
                        const bounds = element.getBoundingClientRect();
                        return [...element.querySelectorAll('h2, strong, p, .seller-stat-rating-visual')].every(child => {
                            const range = document.createRange();
                            range.selectNodeContents(child);
                            return [...range.getClientRects()].every(rect => rect.left >= bounds.left && rect.right <= bounds.right);
                        });
                    })).toBeTruthy();
                }
                if (width <= 620) {
                    const grid = await page.locator('.seller-dashboard-stats').boundingBox();
                    expect((await sales.boundingBox()).width).toBeCloseTo(grid.width, 0);
                    expect((await rating.boundingBox()).width).toBeCloseTo(grid.width, 0);
                    const number = await rating.locator('.seller-stat-value').boundingBox();
                    const stars = await rating.locator('.seller-stat-rating-visual').boundingBox();
                    expect(Math.abs(number.y + number.height / 2 - stars.y - stars.height / 2)).toBeLessThan(1);
                }
                const overview = page.locator('.seller-sales');
                await overview.getByRole('button', { name: language === 'filipino' ? 'Taon' : 'Year', exact: true }).click();
                await expect(overview.locator('.seller-sales-total')).toHaveText('₱92,000.00');
                await overview.getByRole('button', { name: language === 'filipino' ? 'Linggo' : 'Week', exact: true }).click();
                await expect(overview.locator('.seller-sales-total')).toHaveText('₱92,000.00');
                await expect(overview).not.toContainText(/Based on delivery dates|Batay sa petsa ng paghatid/);
                if (width <= 620) {
                    for (const button of await overview.locator('.seller-sales-periods button').all()) {
                        expect((await button.boundingBox()).height).toBeGreaterThanOrEqual(44);
                    }
                }
                await page.screenshot({ path: testInfo.outputPath(`dashboard-${language}-${width}-${theme}.png`), fullPage: true });
                await page.locator('.seller-dashboard-stats').screenshot({ path: testInfo.outputPath(`stats-${language}-${width}-${theme}.png`) });
            }
        }
    }
    await page.setViewportSize({ width: 390, height: 1000 });
    await page.getByRole('button', { name: 'Buksan o isara ang menu ng seller' }).click();
    await expect(page.getByRole('navigation', { name: 'Menu ng seller' })).toBeVisible();
    await page.getByRole('navigation', { name: 'Menu ng seller' }).getByRole('button', { name: 'Mga Order', exact: true }).click();
    await expect(page).toHaveURL(/section=orders/);
    await expect(page.getByRole('navigation', { name: 'Menu ng seller' })).not.toBeVisible();
    expect(errors).toEqual([]);
});

for (const width of [390, 768, 1440]) {
    test(`seller navigation drawer at ${width}px`, async ({ page }, testInfo) => {
        await page.setViewportSize({ width, height: 844 });
        await page.addInitScript(() => localStorage.setItem('agrifarm-theme', 'light'));
        await page.goto('/login');
        await page.getByLabel('Email address').fill('brgymaybunga@gmail.com');
        await page.getByLabel('Password', { exact: true }).fill('AgriFarm123!');
        await page.getByRole('button', { name: 'Login', exact: true }).click();
        await expect(page).toHaveURL(/\/seller\/dashboard$/);
        const trigger = page.getByRole('button', { name: 'Toggle seller navigation' });
        const drawer = page.getByRole('dialog', { name: 'AgriFarm seller menu' });
        if (width > 800) {
            await expect(trigger).toBeHidden();
            await expect(drawer).toBeHidden();
            await expect(page.getByRole('navigation', { name: 'Seller navigation' })).toBeVisible();
            expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBeTruthy();
            await page.screenshot({ path: testInfo.outputPath('desktop-navigation.png'), fullPage: true });
            return;
        }

        const dashboardPosition = await page.locator('.seller-main').boundingBox();
        for (const theme of ['light', 'dark']) {
            await page.evaluate(value => document.documentElement.classList.toggle('dark', value === 'dark'), theme);
            await trigger.click();
            await expect(drawer).toBeVisible();
            await expect(trigger).toHaveAttribute('aria-expanded', 'true');
            const close = drawer.getByRole('button', { name: 'Close seller navigation' });
            await expect(close).toBeFocused();
            await expect.poll(async () => {
                const bounds = await drawer.boundingBox();
                return Math.round(bounds.x + bounds.width);
            }).toBe(width);
            const bounds = await drawer.boundingBox();
            expect(bounds.width).toBeLessThan(width);
            expect(Math.round(bounds.height)).toBe(844);
            expect((await page.locator('.seller-main').boundingBox()).y).toBe(dashboardPosition.y);
            expect(await page.evaluate(() => document.body.style.overflow)).toBe('hidden');
            await expect(drawer.getByRole('button', { name: 'Dashboard', exact: true })).toHaveAttribute('aria-current', 'page');
            await drawer.locator('a').first().focus();
            await page.keyboard.press('Shift+Tab');
            await expect(drawer.getByRole('button', { name: 'Sign out', exact: true })).toBeFocused();
            await close.focus();
            for (let i = 0; i < 14; i++) {
                await page.keyboard.press('Tab');
                expect(await drawer.evaluate(element => element.contains(document.activeElement))).toBeTruthy();
            }
            await close.focus();
            expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBeTruthy();
            await page.screenshot({ path: testInfo.outputPath(`seller-drawer-${theme}.png`) });
            await page.keyboard.press('Escape');
            await expect(drawer).toBeHidden();
            await expect(trigger).toBeFocused();
            expect(await page.evaluate(() => document.body.style.overflow)).not.toBe('hidden');
        }
        await trigger.click();
        await page.mouse.click(10, 160);
        await expect(drawer).toBeHidden();
        await expect(trigger).toBeFocused();
        await trigger.click();
        await drawer.getByRole('button', { name: 'Close seller navigation' }).click();
        await expect(drawer).toBeHidden();
        await trigger.click();
        await drawer.getByRole('button', { name: 'Orders', exact: true }).click();
        await expect(page).toHaveURL(/section=orders/);
        await expect(drawer).toBeHidden();
        await expect(trigger).toBeFocused();
        await trigger.click();
        await expect(drawer.getByRole('button', { name: 'Orders', exact: true })).toHaveAttribute('aria-current', 'page');
        await page.setViewportSize({ width: 1440, height: 1000 });
        await expect(drawer).toBeHidden();
        expect(await page.evaluate(() => document.body.style.overflow)).not.toBe('hidden');
        await expect(page.getByRole('navigation', { name: 'Seller navigation' })).toBeVisible();

        await page.evaluate(() => localStorage.setItem('agrifarm-seller-language', 'filipino'));
        await page.setViewportSize({ width, height: 560 });
        await page.reload();
        await page.emulateMedia({ reducedMotion: 'reduce' });
        await page.getByRole('button', { name: 'Buksan o isara ang menu ng seller' }).click();
        const translated = page.getByRole('dialog', { name: 'Menu ng AgriFarm seller' });
        await expect(translated.getByRole('button', { name: 'Mga Order', exact: true })).toHaveAttribute('aria-current', 'page');
        expect(await translated.evaluate(element => getComputedStyle(element).animationName)).toBe('none');
        const logout = translated.getByRole('button', { name: 'Mag-sign out', exact: true });
        await logout.scrollIntoViewIfNeeded();
        const logoutBounds = await logout.boundingBox();
        expect(logoutBounds.y + logoutBounds.height).toBeLessThanOrEqual(560);
        await page.screenshot({ path: testInfo.outputPath('seller-drawer-short-filipino.png') });
        await logout.click();
        await expect(page).toHaveURL(/\/login$/);
        expect(await page.evaluate(() => document.body.style.overflow)).not.toBe('hidden');
    });
}
