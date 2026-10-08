import { expect, test } from '@playwright/test';

const sellers = [
    ['brgyrosario@gmail.com', 390],
    ['brgymaybunga@gmail.com', 768],
    ['brgystothomas@gmail.com', 1440],
];

async function navigate(page, name, width) {
    if (width <= 800) await page.getByRole('button', { name: 'Toggle seller navigation' }).click();
    await page.getByRole('navigation', { name: 'Seller navigation' }).getByRole('button', { name, exact: true }).click();
    await expect(page.getByRole('heading', { name, exact: true }).first()).toBeVisible();
}

for (const [email, width] of sellers) {
    test(`${width}px: action feedback clears between seller sections and new actions still show`, async ({ page }, testInfo) => {
        await page.setViewportSize({ width, height: 1000 });
        await page.addInitScript(() => {
            localStorage.setItem('agrifarm-theme', 'light');
            localStorage.setItem('agrifarm-seller-language', 'english');
        });
        const errors = [];
        page.on('pageerror', error => errors.push(error.message));
        await page.goto('/login');
        await page.getByLabel('Email address').fill(email);
        await page.getByLabel('Password', { exact: true }).fill('AgriFarm123!');
        await page.getByRole('button', { name: 'Login', exact: true }).click();
        await expect(page).toHaveURL(/\/seller\/dashboard$/, { timeout: 45000 });
        await navigate(page, 'Products', width);
        const name = `Notification Test Pechay ${width}`;
        await page.getByRole('button', { name: 'Add product', exact: true }).first().click();
        const form = page.getByRole('dialog', { name: 'Add product' });
        await form.getByLabel('Product name', { exact: true }).fill(name);
        await form.getByLabel('Category', { exact: true }).selectOption('Vegetables');
        await form.getByLabel('Price (PHP)', { exact: true }).fill('35');
        await form.getByLabel('Selling unit', { exact: true }).selectOption('kg');
        await form.getByLabel('Available stock', { exact: true }).fill('12');
        await form.locator('#product-photo').setInputFiles('public/images/market-pechay-feature.png');
        await form.getByRole('button', { name: 'Add product', exact: true }).click();
        await expect(form).not.toBeVisible();
        const toast = page.locator('.app-form-status--toast');
        await expect(toast).toHaveText('Product added.');
        await toast.hover();
        const image = page.locator('.seller-product-card').filter({ hasText: name }).getByRole('img', { name, exact: true });
        await expect.poll(() => image.evaluate(element => element.complete && element.naturalWidth > 0)).toBeTruthy();
        for (const theme of ['light', 'dark']) {
            await page.evaluate(theme => document.documentElement.classList.toggle('dark', theme === 'dark'), theme);
            expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBeTruthy();
            const bounds = await toast.boundingBox();
            expect(bounds.x).toBeGreaterThanOrEqual(16);
            expect(bounds.x + bounds.width).toBeLessThanOrEqual(width - 16);
            expect(1000 - bounds.y - bounds.height).toBeLessThanOrEqual(25);
            expect((await toast.getByRole('button', { name: 'Dismiss message' }).boundingBox()).height).toBeGreaterThanOrEqual(44);
            await page.screenshot({ path: testInfo.outputPath(`products-${width}-${theme}.png`), fullPage: true, animations: 'disabled' });
        }
        await navigate(page, 'Orders', width);
        await expect(toast).toHaveCount(0);
        await navigate(page, 'Products', width);
        await expect(toast).toHaveCount(0);
        const product = page.locator('.seller-product-card').filter({ hasText: name });
        await product.getByRole('button', { name: /Edit/ }).click();
        const editing = page.getByRole('dialog', { name: 'Edit product' });
        await editing.getByLabel('Price (PHP)', { exact: true }).fill('37');
        await editing.getByRole('button', { name: 'Save changes', exact: true }).click();
        await expect(editing).not.toBeVisible();
        await expect(toast).toHaveText('Product updated.');
        if (width === 1440) {
            // Exercise the browser's hidden-tab event without relying on headless tab focus.
            await page.evaluate(() => {
                Object.defineProperty(document, 'hidden', { configurable: true, value: true });
                document.dispatchEvent(new Event('visibilitychange'));
                delete document.hidden;
            });
            await expect(toast).toHaveCount(0);
        }
        await navigate(page, 'Orders', width);
        await expect(toast).toHaveCount(0);
        await navigate(page, 'Products', width);
        await expect(toast).toHaveCount(0);
        expect(errors).toEqual([]);
    });
}
