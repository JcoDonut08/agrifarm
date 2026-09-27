import { expect, test } from '@playwright/test';

const sellers = [
    ['brgyrosario@gmail.com', 390],
    ['brgymaybunga@gmail.com', 768],
    ['brgystothomas@gmail.com', 1440],
];

for (const [email, width] of sellers) {
    test(`seller harvest records at ${width}px`, async ({ page }, testInfo) => {
        await page.setViewportSize({ width, height: 1000 });
        await page.addInitScript(() => localStorage.setItem('agrifarm-theme', 'light'));
        const errors = [];
        page.on('pageerror', error => errors.push(error.message));

        await page.goto('/login');
        await page.getByLabel('Email address').fill(email);
        await page.getByLabel('Password', { exact: true }).fill('AgriFarm123!');
        await page.getByRole('button', { name: 'Login', exact: true }).click();

        if (width <= 800) await page.getByRole('button', { name: 'Toggle seller navigation' }).click();
        await page.getByRole('navigation', { name: 'Seller navigation' }).getByRole('button', { name: 'Products', exact: true }).click();
        await page.getByRole('button', { name: 'Add product', exact: true }).click();
        const productModal = page.getByRole('dialog', { name: 'Add product' });
        await productModal.getByLabel('Product name', { exact: true }).fill('Fresh Pechay');
        await productModal.getByLabel('Category', { exact: true }).selectOption('Vegetables');
        await productModal.getByLabel('Price (PHP)', { exact: true }).fill('35');
        await productModal.getByLabel('Selling unit', { exact: true }).selectOption('kg');
        await productModal.getByLabel('Available stock', { exact: true }).fill('12');
        await productModal.locator('#product-photo').setInputFiles({ name: 'pechay.png', mimeType: 'image/png', buffer: Buffer.from('iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mP8/x8AAwMCAO+aXioAAAAASUVORK5CYII=', 'base64') });
        await productModal.getByRole('button', { name: 'Add product', exact: true }).click();
        await expect(productModal).not.toBeVisible();

        if (width <= 800) await page.getByRole('button', { name: 'Toggle seller navigation' }).click();
        await page.getByRole('navigation', { name: 'Seller navigation' }).getByRole('button', { name: 'Harvest Records', exact: true }).click();
        await expect(page.getByRole('heading', { name: 'Harvest Records', exact: true })).toBeVisible();
        await expect(page.getByText('No harvest records yet')).toBeVisible();
        if (width === 1440) await page.getByRole('button', { name: 'Switch to dark mode' }).click();
        await page.getByRole('button', { name: 'Record Harvest', exact: true }).click();
        const recordModal = page.getByRole('dialog', { name: 'Record Harvest' });
        await expect(recordModal).toBeVisible();
        await expect(recordModal.getByLabel('Unit')).toHaveValue('kg');
        if (width === 1440) {
            const bounds = await recordModal.boundingBox();
            expect(bounds).not.toBeNull();
            expect(Math.abs((bounds.x + (bounds.width / 2)) - (width / 2))).toBeLessThan(2);
            expect(Math.abs((bounds.y + (bounds.height / 2)) - 500)).toBeLessThan(2);
            await expect.poll(() => recordModal.locator('#harvest-product').evaluate(element => getComputedStyle(element).color)).toBe('rgb(255, 255, 255)');
            await page.screenshot({ path: testInfo.outputPath('harvest-record-form-dark-1440.png'), fullPage: true });
        }
        if (width === 390) await page.screenshot({ path: testInfo.outputPath('harvest-record-form-390.png'), fullPage: true });
        await recordModal.getByRole('button', { name: 'Save Harvest Record', exact: true }).click();
        await expect(recordModal.getByText('Enter a harvested quantity greater than zero.')).toBeVisible();
        await recordModal.getByRole('spinbutton', { name: /Quantity/ }).fill('7.5');
        await recordModal.getByLabel('Notes', { exact: false }).fill('Morning garden harvest.');
        await recordModal.getByRole('button', { name: 'Save Harvest Record', exact: true }).click();
        await expect(recordModal).not.toBeVisible();
        await expect(page.getByRole('status')).toHaveText(/Harvest recorded successfully\. 7\.5 kg of Fresh Pechay were recorded for/);
        await expect(page.locator('.harvest-history-panel')).toContainText('Fresh Pechay');
        await expect(page.locator('.harvest-history-panel .harvest-product-thumb img')).toBeVisible();
        await expect.poll(() => page.locator('.harvest-history-panel .harvest-product-thumb img').evaluate(image => image.complete && image.naturalWidth > 0)).toBeTruthy();
        await expect(page.locator('.harvest-summary-panel')).toContainText('7.5');
        await page.getByPlaceholder('Product, unit, or notes').fill('Morning garden');
        await expect(page.locator('.harvest-history-panel')).toContainText('Fresh Pechay');
        await page.getByRole('button', { name: 'View', exact: true }).click();
        await expect(page.getByRole('dialog', { name: 'Harvest Record' })).toContainText('Morning garden harvest.');
        await page.keyboard.press('Escape');
        await expect(page.getByRole('dialog', { name: 'Harvest Record' })).not.toBeVisible();
        await page.getByRole('button', { name: 'Edit', exact: true }).click();
        const editModal = page.getByRole('dialog', { name: 'Edit Harvest Record' });
        await expect(editModal.getByRole('spinbutton', { name: /Quantity/ })).toHaveValue('7.5');
        await editModal.getByRole('spinbutton', { name: /Quantity/ }).fill('0.5');
        await editModal.getByRole('button', { name: 'Save changes', exact: true }).click();
        await expect(editModal).not.toBeVisible();
        await expect(page.getByRole('status')).toHaveText('Harvest record updated successfully.');
        await expect(page.locator('.harvest-summary-panel')).toContainText('0.5');
        await page.getByRole('button', { name: 'Delete', exact: true }).click();
        const deleteDialog = page.getByRole('dialog', { name: 'Delete harvest record?' });
        await expect(deleteDialog).toContainText('0.5 kg record for Fresh Pechay');
        await deleteDialog.getByRole('button', { name: 'Delete record', exact: true }).click();
        await expect(deleteDialog).not.toBeVisible();
        await expect(page.getByRole('status')).toHaveText('Harvest record for Fresh Pechay deleted successfully.');
        await expect(page.getByText('No harvest records yet')).toBeVisible();
        expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBeTruthy();
        await page.screenshot({ path: testInfo.outputPath(`harvest-records-${width}.png`), fullPage: true });
        if (width === 1440) await page.screenshot({ path: testInfo.outputPath('harvest-records-dark-1440.png'), fullPage: true });
        expect(errors).toEqual([]);
    });
}
