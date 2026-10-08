import { expect, test } from '@playwright/test';
import { randomUUID } from 'node:crypto';
import path from 'node:path';

test('accepted preorder cancellation restores future harvest at mobile tablet and desktop widths', async ({ page, browser }, testInfo) => {
    const productName = 'Cancellation Test Pechay';
    await page.goto('/login');
    await page.getByLabel('Email address').fill('brgyrosario@gmail.com');
    await page.getByLabel('Password', { exact: true }).fill('AgriFarm123!');
    await page.getByRole('button', { name: 'Login' }).click();
    await expect(page).toHaveURL(/\/seller\/dashboard/);
    await page.goto('/seller/dashboard?section=products');
    await page.getByRole('button', { name: 'Add product', exact: true }).first().click();
    const productDialog = page.getByRole('dialog', { name: 'Add product' });
    await productDialog.getByLabel('Product name').fill(productName);
    await productDialog.getByLabel('Category').selectOption('Vegetables');
    await productDialog.getByLabel('Price (PHP)').fill('35.50');
    await productDialog.getByLabel('Selling unit').selectOption('bunch');
    await productDialog.getByLabel('Available stock').fill('0');
    await productDialog.getByLabel('Expected yield quantity').fill('10');
    const harvestDate = new Date();
    harvestDate.setDate(harvestDate.getDate() + 30);
    await productDialog.getByLabel('Expected Harvest Date').fill(harvestDate.toISOString().slice(0, 10));
    await productDialog.locator('#product-photo').setInputFiles(path.resolve('public/images/market-pechay-feature.png'));
    await productDialog.getByRole('button', { name: 'Add product', exact: true }).click();
    await expect(productDialog).not.toBeVisible();

    const photo = page.getByRole('img', { name: productName, exact: true });
    await expect(photo).toHaveAttribute('src', /\/seller\/products\/\d+\/photo/);
    const productId = Number((await photo.getAttribute('src')).match(/\/seller\/products\/(\d+)\/photo/)[1]);
    const customerContext = await browser.newContext({ baseURL: testInfo.project.use.baseURL });
    const customer = await customerContext.newPage();
    await customer.goto('/login');
    await customer.getByLabel('Email address').fill('customer@agrifarm.test');
    await customer.getByLabel('Password', { exact: true }).fill('AgriFarm123!');
    await customer.getByRole('button', { name: 'Login' }).click();
    await expect(customer).not.toHaveURL(/\/login$/);

    for (const width of [390, 768, 1440]) {
        await page.setViewportSize({ width, height: 1000 });
        const csrf = (await customerContext.cookies()).find(cookie => cookie.name === 'XSRF-TOKEN');
        expect(csrf).toBeTruthy();
        // Use the customer's authenticated checkout endpoint to reserve a future harvest.
        const checkout = await customer.request.post('/checkout', {
            headers: { 'X-XSRF-TOKEN': decodeURIComponent(csrf.value), Accept: 'application/json' },
            data: {
                checkout_id: randomUUID(), recipient_name: 'Test Customer', phone: '09171234567',
                address: '123 Example Street, Rosario', payment_method: 'cod',
                items: [{ product_id: productId, quantity: 3 }],
            },
        });
        expect(checkout.ok()).toBeTruthy();
        expect(checkout.url()).toContain('page=order-success');
        await page.goto('/seller/dashboard?section=orders');
        const row = page.locator('.order-row').filter({ hasText: productName }).first();
        await row.getByRole('button', { name: 'Accept order', exact: true }).click();
        await expect(row.getByRole('button', { name: 'Mark for delivery', exact: true })).toBeVisible();
        await row.getByRole('button', { name: 'Cancel order', exact: true }).click();
        const confirmation = page.getByRole('dialog', { name: 'Cancel order?' });
        await expect(confirmation).toContainText('The quantity reserved for this order will be restored.');
        if (width === 390) {
            await confirmation.getByRole('button', { name: 'Cancel order', exact: true }).click();
            await expect(confirmation.getByText('Choose a reason for cancelling this order.')).toBeVisible();
            await confirmation.getByRole('button', { name: 'Keep order' }).click();
            await expect(confirmation).not.toBeVisible();
            await expect(row.locator('.order-status-icon')).toHaveAttribute('aria-label', 'Preparing');
            await row.getByRole('button', { name: 'Cancel order', exact: true }).click();
            await expect(confirmation.getByLabel('Reason', { exact: true })).toHaveValue('');
        }
        const reason = width === 390 ? 'reserved_elsewhere' : width === 768 ? 'out_of_stock' : 'other';
        await confirmation.getByLabel('Reason', { exact: true }).selectOption(reason);
        if (reason === 'other') {
            await confirmation.getByRole('button', { name: 'Cancel order', exact: true }).click();
            await expect(confirmation.getByText('Explain why you are cancelling this order.')).toBeVisible();
            await confirmation.getByLabel('Explanation').fill('The harvest was damaged by heavy rain.');
        }
        expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBeTruthy();
        await page.screenshot({ path: testInfo.outputPath(`cancel-preorder-${width}.png`), fullPage: true });
        await page.evaluate(() => document.documentElement.classList.add('dark'));
        await page.screenshot({ path: testInfo.outputPath(`cancel-preorder-${width}-dark.png`), fullPage: true, animations: 'disabled' });
        await page.evaluate(() => document.documentElement.classList.remove('dark'));
        await confirmation.getByRole('button', { name: 'Cancel order', exact: true }).click();
        await expect(confirmation).not.toBeVisible();
        await expect(row.locator('.order-status-icon')).toHaveAttribute('aria-label', 'Cancelled');
        await row.getByRole('button', { name: 'View order', exact: true }).click();
        await expect(page.getByRole('dialog', { name: 'Order details' }).locator('.order-cancellation-reason')).toBeVisible();
        await page.getByRole('dialog', { name: 'Order details' }).getByRole('button', { name: 'Close', exact: true }).click();
        await customer.setViewportSize({ width, height: 1000 });
        await customer.goto('/customer/orders');
        await customer.getByRole('button', { name: 'Cancelled', exact: true }).click();
        const reasonText = reason === 'reserved_elsewhere' ? 'Already allocated to another customer' : reason === 'out_of_stock' ? 'Out of stock' : 'The harvest was damaged by heavy rain.';
        await expect(customer.locator('.order-cancellation-reason').filter({ hasText: reasonText })).toBeVisible();
        await customer.screenshot({ path: testInfo.outputPath(`customer-cancellation-${width}.png`), fullPage: true });
        await customer.goto('/?page=notifications');
        await expect(customer.locator('.customer-notification').filter({ hasText: reasonText })).toBeVisible();
        await customer.screenshot({ path: testInfo.outputPath(`customer-cancellation-notification-${width}.png`), fullPage: true });
        if (width === 768) {
            await customer.evaluate(() => localStorage.setItem('agrifarm-customer-language', 'filipino'));
            await customer.goto('/customer/orders');
            await customer.getByRole('button', { name: 'Nakansela', exact: true }).click();
            await expect(customer.locator('.order-cancellation-reason').filter({ hasText: 'Ubos na ang stock' })).toBeVisible();
            await customer.screenshot({ path: testInfo.outputPath('customer-cancellation-filipino.png'), fullPage: true });
            await customer.evaluate(() => localStorage.setItem('agrifarm-customer-language', 'english'));
        }

        await page.goto('/seller/dashboard?section=products');
        await page.getByRole('button', { name: `Edit ${productName}`, exact: true }).click();
        const editDialog = page.getByRole('dialog', { name: 'Edit product' });
        await expect(editDialog.getByLabel('Available stock')).toHaveValue('0');
        await expect(editDialog.getByLabel('Expected yield quantity')).toHaveValue('10');
        await editDialog.getByRole('button', { name: 'Close edit product', exact: true }).click();
    }
    await customerContext.close();
});
