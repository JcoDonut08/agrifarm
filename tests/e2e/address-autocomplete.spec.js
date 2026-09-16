import { expect, test } from '@playwright/test';

test('customer address suggestions can be selected or ignored at each viewport', async ({ page }, testInfo) => {
    await page.route('https://photon.komoot.io/api/**', async route => {
        await route.fulfill({ json: { features: [{ properties: { housenumber: '68', street: 'Dr. Pilapil Street', city: 'Pasig City', state: 'Metro Manila' } }] } });
    });

    await page.goto('/login');
    await page.getByLabel('Email address').fill('customer@agrifarm.test');
    await page.getByLabel('Password', { exact: true }).fill('AgriFarm123!');
    await page.getByRole('button', { name: 'Login' }).click();
    await expect(page).toHaveURL(/\/$/);

    for (const width of [390, 768, 1440]) {
        await page.setViewportSize({ width, height: 900 });
        await page.goto('/customer');
        const address = page.getByRole('combobox', { name: 'Complete address' });
        await address.fill('68 dr pila');
        const suggestion = page.getByRole('option', { name: '68 Dr. Pilapil Street, Pasig City, Metro Manila' });
        await expect(suggestion).toBeVisible();
        await page.screenshot({ path: testInfo.outputPath(`suggestions-${width}.png`), fullPage: true });
        if (width === 390) {
            await address.press('ArrowDown');
            await address.press('Enter');
        } else {
            await suggestion.click();
        }
        await expect(address).toHaveValue('68 Dr. Pilapil Street, Pasig City, Metro Manila');
        await address.fill('My own complete address in Pasig City');
        await address.blur();
        await expect(address).toHaveValue('My own complete address in Pasig City');
        expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBeTruthy();
        await page.screenshot({ path: testInfo.outputPath(`address-${width}.png`), fullPage: true });
    }
});
