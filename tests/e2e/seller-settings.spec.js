import { expect, test } from '@playwright/test';

const accounts = [
    ['brgyrosario@gmail.com', 390],
    ['brgymaybunga@gmail.com', 768],
    ['brgystothomas@gmail.com', 1440],
];

for (const [email, width] of accounts) {
    test(`seller settings at ${width}px`, async ({ page }, testInfo) => {
        await page.setViewportSize({ width, height: 1000 });
        await page.addInitScript(() => {
            if (!localStorage.getItem('agrifarm-theme')) localStorage.setItem('agrifarm-theme', 'light');
            if (!localStorage.getItem('agrifarm-seller-language')) localStorage.setItem('agrifarm-seller-language', 'english');
            if (!localStorage.getItem('agrifarm-seller-notifications')) localStorage.setItem('agrifarm-seller-notifications', JSON.stringify({ newOrders: true, lowStock: true, weatherAlerts: true }));
        });

        const errors = [];
        page.on('pageerror', error => errors.push(error.message));
        await page.goto('/login');
        await page.getByLabel('Email address').fill(email);
        await page.getByLabel('Password', { exact: true }).fill('AgriFarm123!');
        await page.getByRole('button', { name: 'Login', exact: true }).click();
        await expect(page).toHaveURL(/\/seller\/dashboard$/);

        if (width <= 800) await page.getByRole('button', { name: 'Toggle seller navigation' }).click();
        await page.getByRole('navigation', { name: 'Seller navigation' }).getByRole('button', { name: 'Settings', exact: true }).click();
        await expect(page.getByRole('heading', { name: 'Settings', exact: true })).toBeVisible();
        await expect(page.locator('.appearance-options').getByRole('button')).toHaveCount(3);
        await expect(page.getByRole('switch')).toHaveCount(3);

        await page.getByRole('button', { name: 'Dark', exact: true }).click();
        await expect(page.locator('html')).toHaveClass(/dark/);
        await page.getByRole('button', { name: 'System', exact: true }).click();
        await expect(page.getByRole('button', { name: 'System', exact: true })).toHaveAttribute('aria-pressed', 'true');
        await page.emulateMedia({ colorScheme: 'dark' });
        await expect(page.locator('html')).toHaveClass(/dark/);
        await page.emulateMedia({ colorScheme: 'light' });
        await expect(page.locator('html')).not.toHaveClass(/dark/);
        await page.getByRole('button', { name: /Filipino/ }).click();
        await expect(page.getByRole('heading', { name: 'Mga Setting', exact: true })).toBeVisible();
        await expect(page.locator('html')).toHaveAttribute('lang', 'fil');
        await page.getByRole('switch', { name: 'Kaunti na ang stock' }).click();
        await expect(page.getByRole('switch', { name: 'Kaunti na ang stock' })).toHaveAttribute('aria-checked', 'false');

        await page.reload();
        await expect(page.getByRole('heading', { name: 'Mga Setting', exact: true })).toBeVisible();
        await expect(page.getByRole('button', { name: 'Ayon sa system', exact: true })).toHaveAttribute('aria-pressed', 'true');
        await expect(page.getByRole('switch', { name: 'Kaunti na ang stock' })).toHaveAttribute('aria-checked', 'false');
        await expect(page.locator('html')).toHaveAttribute('lang', 'fil');
        expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBeTruthy();
        await page.screenshot({ path: testInfo.outputPath(`settings-${width}.png`), fullPage: true });

        const openFilipinoSection = async (name) => {
            if (width <= 800) await page.getByRole('button', { name: 'Buksan o isara ang menu ng seller' }).click();
            await page.getByRole('navigation', { name: 'Menu ng seller' }).getByRole('button', { name, exact: true }).click();
        };

        await openFilipinoSection('Dashboard');
        await expect(page.getByText('Kabuuang benta', { exact: true })).toBeVisible();
        await expect(page.getByRole('heading', { name: 'Buod ng benta', exact: true })).toBeVisible();
        await expect(page.getByRole('heading', { name: 'Panahon at lagay ng sakahan', exact: true })).toBeVisible();
        await page.screenshot({ path: testInfo.outputPath(`dashboard-filipino-${width}.png`), fullPage: true });

        await openFilipinoSection('Mga Produkto');
        await expect(page.getByRole('heading', { name: 'Mga Produkto', exact: true })).toBeVisible();
        await page.getByRole('button', { name: 'Magdagdag ng produkto', exact: true }).click();
        const productModal = page.getByRole('dialog', { name: 'Magdagdag ng produkto' });
        await expect(productModal).toBeVisible();
        await expect(productModal.getByText('Detalye ng produkto', { exact: true })).toBeVisible();
        const productName = `QA Pechay ${width}`;
        await productModal.getByLabel('Pangalan ng produkto', { exact: true }).fill(productName);
        await productModal.getByLabel('Kategorya', { exact: true }).selectOption('Vegetables');
        await productModal.getByLabel('Presyo (PHP)', { exact: true }).fill('35');
        await productModal.getByLabel('Unit ng bentahan', { exact: true }).selectOption('kg');
        await productModal.getByLabel('Available na stock', { exact: true }).fill('10');
        await productModal.locator('#product-photo').setInputFiles({ name: 'pechay.png', mimeType: 'image/png', buffer: Buffer.from('iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mP8/x8AAwMCAO+aXioAAAAASUVORK5CYII=', 'base64') });
        await productModal.getByRole('button', { name: 'Idagdag ang produkto', exact: true }).click();
        await expect(productModal).not.toBeVisible();
        const productCard = page.locator('.seller-product-card').filter({ hasText: productName });
        await expect(productCard).toBeVisible();
        await productCard.getByRole('button', { name: `Burahin ang ${productName}`, exact: true }).click();
        const confirmation = page.getByRole('dialog', { name: 'Burahin ang produkto?' });
        await expect(confirmation).toBeVisible();
        await expect(confirmation).toContainText(`Sigurado ka bang buburahin ang “${productName}”?`);
        await expect(confirmation.getByRole('button', { name: 'Huwag burahin', exact: true })).toBeFocused();
        expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBeTruthy();
        await page.screenshot({ path: testInfo.outputPath(`confirmation-filipino-${width}.png`), fullPage: true });
        await confirmation.getByRole('button', { name: 'Huwag burahin', exact: true }).click();
        await expect(confirmation).not.toBeVisible();
        await expect(productCard).toBeVisible();

        await openFilipinoSection('Mga Order');
        await expect(page.getByRole('heading', { name: 'Mga Order', exact: true })).toBeVisible();
        await expect(page.getByRole('heading', { name: 'Mga order ng customer', exact: true })).toBeVisible();
        await page.getByRole('button', { name: 'Magdagdag ng walk-in order', exact: true }).click();
        const orderModal = page.getByRole('dialog', { name: 'Magdagdag ng walk-in order' });
        await expect(orderModal).toBeVisible();
        await orderModal.getByLabel('Produkto', { exact: true }).selectOption({ index: 1 });
        await orderModal.getByLabel('Dami', { exact: true }).fill('1');
        await orderModal.getByRole('button', { name: 'Idagdag ang order', exact: true }).click();
        await expect(orderModal).not.toBeVisible();
        const orderRow = page.locator('.order-row').filter({ hasText: productName });
        await expect(orderRow).toBeVisible();
        await orderRow.getByRole('button', { name: 'Kanselahin ang order', exact: true }).click();
        const cancelOrderConfirmation = page.getByRole('dialog', { name: 'Kanselahin ang order?' });
        await expect(cancelOrderConfirmation).toBeVisible();
        await expect(cancelOrderConfirmation).toContainText('Ibabalik sa imbentaryo ang nakalaang stock.');
        await expect(cancelOrderConfirmation.getByRole('button', { name: 'Panatilihin ang order', exact: true })).toBeFocused();
        await page.keyboard.press('Escape');
        await expect(cancelOrderConfirmation).not.toBeVisible();
        await expect(orderRow).toBeVisible();

        await openFilipinoSection('Profile ng Tindahan');
        await expect(page.getByRole('heading', { name: 'Larawan sa profile', exact: true })).toBeVisible();
        await expect(page.getByRole('heading', { name: 'Palitan ang password', exact: true })).toBeVisible();

        await openFilipinoSection('Mga Setting');
        await page.getByRole('button', { name: 'English', exact: true }).click();
        await page.getByRole('button', { name: 'Light', exact: true }).click();
        await page.getByRole('switch', { name: 'Low stock' }).click();
        expect(errors).toEqual([]);
    });
}
