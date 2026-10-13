import { test, expect } from './fixtures';

for (const width of [390, 768, 1440]) {
    test(`chatbot visibility survives navigation and reload at ${width}px`, async ({ page }, testInfo) => {
        await page.setViewportSize({ width, height: 900 });
        const errors = [];
        const accountUpdates = [];
        page.on('pageerror', error => errors.push(error.message));
        page.on('request', request => {
            if (request.method() === 'PATCH' && request.url().endsWith('/customer/settings')) accountUpdates.push(request.url());
        });

        await page.goto('/login');
        await page.getByLabel('Email address').fill('customer@agrifarm.test');
        await page.getByLabel('Password', { exact: true }).fill('AgriFarm123!');
        await page.getByRole('button', { name: 'Login', exact: true }).click();
        await expect(page.getByRole('button', { name: 'Open account menu' })).toBeVisible();
        await page.goto('/?page=marketplace');
        const launcher = page.getByRole('button', { name: 'Open Help Assistant', exact: true });
        await expect(launcher).toBeVisible();
        const launcherBounds = await launcher.boundingBox();
        expect(launcherBounds.width).toBe(width <= 768 ? 48 : 70);
        expect(launcherBounds.height).toBeGreaterThanOrEqual(44);
        await launcher.click();
        await expect(page.getByRole('region', { name: 'Kuya Ani assistant', exact: true })).toBeVisible();
        if (width === 390) {
            await page.setViewportSize({ width, height: 500 });
            const bounds = await page.locator('.help-widget-window').boundingBox();
            expect(bounds.y).toBeGreaterThanOrEqual(0);
            expect(bounds.y + bounds.height).toBeLessThanOrEqual(500);
            await page.screenshot({ path: testInfo.outputPath('short-mobile-chat.png'), fullPage: true, animations: 'disabled' });
            await page.setViewportSize({ width, height: 900 });
        }
        await page.getByRole('button', { name: 'Close assistant', exact: true }).click();

        await page.getByRole('button', { name: 'Open account menu' }).click();
        await page.getByRole('link', { name: 'Settings', exact: true }).click();
        await expect(page).toHaveURL(/\/customer\/settings$/);
        const preference = page.getByRole('switch', { name: 'Show Kuya Ani', exact: true });
        const emailPreference = page.getByRole('switch', { name: 'Order update emails', exact: true });
        const emailState = await emailPreference.getAttribute('aria-checked');
        await expect(preference).toHaveAttribute('aria-checked', 'true');
        expect((await preference.boundingBox()).height).toBeGreaterThanOrEqual(44);
        await preference.click();
        await expect(preference).toHaveAttribute('aria-checked', 'false');
        await expect(emailPreference).toHaveAttribute('aria-checked', emailState);
        expect(await page.evaluate(() => localStorage.getItem('agrifarm-chatbot-enabled'))).toBe('false');
        expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
        await page.screenshot({ path: testInfo.outputPath('settings-off.png'), fullPage: true });
        await page.reload();
        await expect(preference).toHaveAttribute('aria-checked', 'false');
        await page.getByRole('link', { name: 'Marketplace', exact: true }).first().click();
        await expect(launcher).toHaveCount(0);
        await page.reload();
        await expect(launcher).toHaveCount(0);
        await page.screenshot({ path: testInfo.outputPath('marketplace-hidden.png'), fullPage: true });

        await page.goto('/customer/settings');
        await page.getByRole('button', { name: 'Filipino', exact: false }).click();
        const filipinoPreference = page.getByRole('switch', { name: 'Ipakita si Kuya Ani', exact: true });
        await expect(filipinoPreference).toHaveAttribute('aria-checked', 'false');
        await filipinoPreference.click();
        await expect(filipinoPreference).toHaveAttribute('aria-checked', 'true');
        await page.goto('/?page=marketplace');
        await expect(launcher).toBeVisible();
        await launcher.click();
        await expect(page.getByRole('region', { name: 'Kuya Ani assistant', exact: true })).toContainText('Ako ang Kuya Ani.');
        await page.getByRole('button', { name: 'Close assistant', exact: true }).click();
        expect(accountUpdates).toEqual([]);
        expect(errors).toEqual([]);
    });
}
