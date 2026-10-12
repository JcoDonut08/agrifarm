import { expect, test } from './fixtures';

for (const width of [390, 768, 1440]) {
    test(`admin header greeting and weather at ${width}px`, async ({ page }, testInfo) => {
        const errors = [];
        page.on('pageerror', error => errors.push(error.message));
        await page.setViewportSize({ width, height: 1000 });
        await page.clock.setFixedTime('2026-10-12T01:00:00Z');
        await page.addInitScript(() => {
            if (!localStorage.getItem('agrifarm-theme')) localStorage.setItem('agrifarm-theme', 'light');
        });
        await page.goto('/login');
        await page.getByLabel('Email address').fill('pasigcenro@gmail.com');
        await page.getByLabel('Password', { exact: true }).fill('AgriFarm123!');
        await page.getByRole('button', { name: 'Login', exact: true }).click();
        await expect(page).toHaveURL(/\/admin\/dashboard$/);

        const header = page.locator('.admin-topbar');
        const summary = header.locator('.seller-header-summary');
        const greeting = summary.locator('.seller-greeting');
        const weather = summary.locator('.seller-header-weather');
        await expect(greeting).toHaveText('Good morning, Pasig CENRO Administrator');
        await expect(weather).toContainText('Pasig City');
        await expect(weather).toContainText('Weather unavailable');
        await expect(weather.locator('strong')).toHaveCount(0);
        await header.screenshot({ path: testInfo.outputPath('header-unavailable.png') });

        // Only this browser's test responses receive a weather fixture.
        const fixture = {
            provider: 'open_meteo', location: 'Pasig City', temperature_c: 30.6,
            humidity_percent: 65, rain_chance_percent: 10, wind_kph: 8,
            feels_like_c: 33, condition: 'Clear sky', condition_key: 'clear',
            observed_at: '2026-10-12T09:00:00+08:00', is_stale: false, daily: [], hourly: [],
        };
        await page.route('**/admin/dashboard*', async route => {
            if (!route.request().headers()['x-inertia']) return route.continue();
            const response = await route.fetch();
            const payload = await response.json();
            await route.fulfill({ response, json: { ...payload, props: { ...payload.props, weather: fixture } } });
        });
        await page.locator('.admin-brand a').click();
        await expect(weather.locator('strong')).toHaveText('31°C');
        for (const theme of ['light', 'dark']) {
            if (theme === 'dark') await header.getByRole('button', { name: 'Switch to dark mode' }).click();
            expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBeTruthy();
            const bounds = await summary.boundingBox();
            const greetingBounds = await greeting.boundingBox();
            const weatherBounds = await weather.boundingBox();
            const controls = await header.locator('.admin-topbar-actions').boundingBox();
            expect(greetingBounds.x + greetingBounds.width).toBeLessThanOrEqual(weatherBounds.x);
            expect(weatherBounds.x + weatherBounds.width).toBeLessThanOrEqual(width);
            if (width <= 1000) expect(controls.y + controls.height).toBeLessThanOrEqual(bounds.y);
            else expect(bounds.x + bounds.width).toBeLessThanOrEqual(controls.x);
            await header.screenshot({ path: testInfo.outputPath(`header-${theme}.png`) });
            await page.screenshot({ path: testInfo.outputPath(`dashboard-${theme}.png`), fullPage: true });
        }
        await expect(page.locator('html')).toHaveClass(/dark/);
        await page.reload();
        await expect(page.locator('html')).toHaveClass(/dark/);
        await header.getByRole('button', { name: 'Switch to light mode' }).click();
        await expect(page.locator('html')).not.toHaveClass(/dark/);
        for (const [time, text] of [
            ['2026-10-12T04:00:00Z', 'Good afternoon, Pasig CENRO Administrator'],
            ['2026-10-12T10:00:00Z', 'Good evening, Pasig CENRO Administrator'],
        ]) {
            await page.clock.setFixedTime(time);
            // The multi-hour jump also triggers the existing weather refresh.
            // Wait for that Inertia visit before testing client-side section navigation.
            await page.evaluate(() => new Promise(resolve => {
                document.addEventListener('inertia:finish', resolve, { once: true });
                document.dispatchEvent(new Event('visibilitychange'));
            }));
            await expect(greeting).toHaveText(text);
        }

        await header.getByRole('button', { name: 'Notifications', exact: true }).click();
        const panel = page.getByRole('region', { name: 'Administration notifications' });
        await expect(panel).toBeVisible();
        const panelBounds = await panel.boundingBox();
        expect(panelBounds.x).toBeGreaterThanOrEqual(0);
        expect(panelBounds.x + panelBounds.width).toBeLessThanOrEqual(width);
        expect(panelBounds.y + panelBounds.height).toBeLessThanOrEqual(1000);
        if (width <= 500) {
            const controls = await header.locator('.admin-topbar-actions').boundingBox();
            expect(panelBounds.y).toBeGreaterThanOrEqual(controls.y + controls.height);
        }
        await page.screenshot({ path: testInfo.outputPath('notifications.png') });
        await page.keyboard.press('Escape');
        await expect(panel).toHaveCount(0);
        await expect(header.getByRole('button', { name: 'Notifications', exact: true })).toBeFocused();
        await header.getByRole('button', { name: 'Open administrator account' }).click();
        await expect(page).toHaveURL(/section=profile/);
        await expect(page.getByRole('heading', { name: 'Profile', exact: true })).toBeVisible();
        await expect(greeting).toHaveText('Good evening, Pasig CENRO Administrator');

        await page.evaluate(() => {
            const key = 'agrifarm-admin-preferences';
            const current = JSON.parse(localStorage.getItem(key) || '{}');
            localStorage.setItem(key, JSON.stringify({ ...current, language: 'filipino' }));
        });
        await page.reload();
        await page.locator('.admin-brand a').click();
        await expect(greeting).toHaveText('Magandang gabi, Pasig CENRO Administrator');
        await expect(weather.locator('strong')).toHaveText('31°C');
        await header.getByRole('button', { name: 'Lumipat sa madilim na tema' }).click();
        await expect(page.locator('html')).toHaveClass(/dark/);
        expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBeTruthy();
        await header.screenshot({ path: testInfo.outputPath('header-filipino-dark.png') });
        if (width <= 800) {
            await page.getByRole('button', { name: 'Buksan ang navigation' }).click();
            await expect(page.getByRole('navigation', { name: 'Administrasyon ng CENRO' })).toBeVisible();
            await page.getByRole('button', { name: 'Mga Order', exact: true }).click();
            await expect(page).toHaveURL(/section=orders/);
            await expect(page.getByRole('navigation', { name: 'Administrasyon ng CENRO' })).toBeHidden();
        }
        expect(errors).toEqual([]);
    });
}
