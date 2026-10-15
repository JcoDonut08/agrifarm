import { expect, test } from './fixtures';

async function signIn(page, email, path) {
    await page.goto('/login');
    await page.getByLabel('Email address').fill(email);
    await page.getByLabel('Password', { exact: true }).fill('AgriFarm123!');
    await page.getByRole('button', { name: 'Login', exact: true }).click();
    await expect(page).toHaveURL(path);
}

for (const width of [390, 768, 1440]) {
    test(`${width}px: seller product changes reach admin audit logs with correct attribution`, async ({ page: seller, browser }, testInfo) => {
        await seller.setViewportSize({ width, height: 1000 });
        const adminContext = await browser.newContext({ baseURL: testInfo.project.use.baseURL, viewport: { width, height: 1000 } });
        const admin = await adminContext.newPage();
        const errors = [];
        for (const page of [seller, admin]) page.on('pageerror', error => errors.push(error.message));
        try {
            await signIn(admin, 'pasigcenro@gmail.com', /admin\/dashboard/);
            await admin.goto('/admin/dashboard?section=audit-logs');
            await expect(admin.getByText('No audit activity recorded yet', { exact: true })).toBeVisible();
            await signIn(seller, 'seller@agrifarm.test', /seller\/dashboard/);
            await seller.goto('/seller/dashboard?section=products');
            await seller.getByRole('button', { name: 'Add product', exact: true }).click();
            const add = seller.getByRole('dialog', { name: 'Add product', exact: true });
            await add.getByLabel('Product name', { exact: true }).fill('Audit Harvest');
            await add.getByLabel('Category', { exact: true }).selectOption('Vegetables');
            await add.getByLabel('Price (PHP)', { exact: true }).fill('25');
            await add.getByLabel('Selling unit', { exact: true }).selectOption('bunch');
            await add.getByLabel('Available stock', { exact: true }).fill('10');
            await seller.locator('#product-photo').setInputFiles('public/images/market-pechay-feature.png');
            await add.getByRole('button', { name: 'Add product', exact: true }).click();
            await expect(add).not.toBeVisible();
            // Exercise the real 30-second partial reload with an independent admin session.
            await expect(admin.locator('.admin-audit-row')).toHaveCount(1, { timeout: 45000 });
            const rows = admin.locator('.admin-audit-row');
            await expect(rows.first()).toContainText('Created product');
            await expect(rows.first()).toContainText('Audit Harvest');
            await expect(rows.first().locator('.admin-audit-actor')).toContainText('Seller');
            await expect(rows.first().locator('.admin-audit-actor')).not.toContainText('Administrator');

            await seller.getByRole('button', { name: 'Edit Audit Harvest', exact: true }).click();
            const edit = seller.getByRole('dialog', { name: 'Edit product', exact: true });
            await edit.getByLabel('Price (PHP)', { exact: true }).fill('30');
            await edit.getByLabel('Available stock', { exact: true }).fill('12');
            await edit.getByRole('button', { name: 'Save changes', exact: true }).click();
            await expect(edit).not.toBeVisible();
            await admin.reload();
            await expect(rows).toHaveCount(2);
            await expect(rows.first()).toContainText('Updated product');
            await expect(rows.first()).toContainText('price, available stock');
            await admin.getByLabel('Filter by action type').selectOption('product_create');
            await expect(rows).toHaveCount(1);
            await expect(rows.first()).toContainText('Created product');
            await admin.getByLabel('Filter by action type').selectOption('product_update');
            await expect(rows).toHaveCount(1);
            await expect(rows.first()).toContainText('Updated product');

            await seller.getByRole('button', { name: 'Delete Audit Harvest', exact: true }).click();
            await seller.getByRole('dialog', { name: 'Delete product?', exact: true }).getByRole('button', { name: 'Delete product', exact: true }).click();
            await expect(seller.locator('.seller-product-card')).toHaveCount(0);
            await admin.reload();
            await admin.getByLabel('Filter by action type').selectOption('product_delete');
            await expect(rows).toHaveCount(1);
            await expect(rows.first()).toContainText('Deleted product');
            await expect(rows.first()).toContainText('Audit Harvest');
            await admin.getByLabel('Filter by action type').selectOption('all');
            await expect(rows).toHaveCount(3);
            await admin.getByLabel('Search audit logs').fill('missing product');
            await expect(admin.getByText('No matching audit log records', { exact: true })).toBeVisible();
            await admin.getByLabel('Search audit logs').fill('Audit Harvest');
            await expect(rows).toHaveCount(3);
            expect(await rows.locator('.admin-audit-actor').evaluateAll(elements => elements.every(element => element.scrollWidth <= element.clientWidth))).toBeTruthy();
            await admin.screenshot({ path: testInfo.outputPath('seller-product-audit-light.png'), fullPage: true });
            expect(await admin.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBeTruthy();
            await admin.evaluate(() => localStorage.setItem('agrifarm-theme', 'dark'));
            await admin.reload();
            await expect(rows).toHaveCount(3);
            await expect(admin.locator('html')).toHaveClass(/dark/);
            expect(await rows.locator('.admin-audit-actor').evaluateAll(elements => elements.every(element => element.scrollWidth <= element.clientWidth))).toBeTruthy();
            await admin.screenshot({ path: testInfo.outputPath('seller-product-audit-dark.png'), fullPage: true });
            expect(await admin.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBeTruthy();
            expect(errors).toEqual([]);
        } finally {
            await adminContext.close();
        }
    });
}
