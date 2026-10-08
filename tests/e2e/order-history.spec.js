import { expect, test } from '@playwright/test';
import path from 'node:path';

test('listing corrections preserve order details and receipts while open orders protect the selling unit', async ({ page }, testInfo) => {
    const originalName = 'History Test Pechay';
    let listingName = originalName;
    await page.goto('/login');
    await page.getByLabel('Email address').fill('brgyrosario@gmail.com');
    await page.getByLabel('Password', { exact: true }).fill('AgriFarm123!');
    await page.getByRole('button', { name: 'Login' }).click();
    await expect(page).toHaveURL(/\/seller\/dashboard/);
    await page.goto('/seller/dashboard?section=products');
    await page.getByRole('button', { name: 'Add product', exact: true }).first().click();
    const create = page.getByRole('dialog', { name: 'Add product' });
    await create.getByLabel('Product name').fill(originalName);
    await create.getByLabel('Category').selectOption('Vegetables');
    await create.getByLabel('Price (PHP)').fill('35.50');
    await create.getByLabel('Selling unit').selectOption('bunch');
    await create.getByLabel('Available stock').fill('10');
    await create.locator('#product-photo').setInputFiles(path.resolve('public/images/market-pechay-feature.png'));
    await create.getByRole('button', { name: 'Add product', exact: true }).click();
    await expect(create).not.toBeVisible();
    await page.goto('/seller/dashboard?section=orders');
    await page.getByRole('button', { name: 'Add walk-in order', exact: true }).click();
    const walkIn = page.getByRole('dialog', { name: 'Add walk-in order' });
    await walkIn.getByLabel('Customer name').fill('History Test Buyer');
    await walkIn.getByLabel('Product', { exact: true }).selectOption({ label: `${originalName} · 10 bunch available` });
    await walkIn.getByLabel('Quantity', { exact: true }).fill('2');
    await walkIn.getByRole('button', { name: 'Add order', exact: true }).click();
    await expect(walkIn).not.toBeVisible();

    const edit = page.getByRole('dialog', { name: 'Edit product' });
    const row = page.locator('.order-row').filter({ hasText: 'History Test Buyer' });
    for (const width of [390, 768, 1440]) {
        await page.setViewportSize({ width, height: 1000 });
        await page.goto('/seller/dashboard?section=products');
        await page.getByRole('button', { name: `Edit ${listingName}`, exact: true }).click();
        const renamed = `Updated Pechay ${width}`;
        await edit.getByLabel('Product name').fill(renamed);
        await edit.getByLabel('Price (PHP)').fill('120');
        await edit.getByLabel('Selling unit').selectOption('kg');
        await edit.getByRole('button', { name: 'Save changes', exact: true }).click();
        await expect(edit.getByLabel('Selling unit')).toHaveAttribute('aria-invalid', 'true');
        await expect(edit.getByLabel('Selling unit')).toBeInViewport({ ratio: 1 });
        await expect(edit.locator('#product-unit-error')).toHaveText('Finish or cancel open orders before changing the selling unit.');
        await expect(edit.locator('#product-unit-error')).toBeInViewport({ ratio: 1 });
        await expect.poll(() => edit.evaluate(dialog => {
            const field = dialog.querySelector('#product-unit').getBoundingClientRect();
            const error = dialog.querySelector('#product-unit-error').getBoundingClientRect();
            return field.top >= dialog.querySelector('.product-modal-heading').getBoundingClientRect().bottom
                && error.bottom <= dialog.querySelector('.product-form-footer').getBoundingClientRect().top;
        })).toBeTruthy();
        await expect(edit.getByLabel('Product name')).toHaveValue(renamed);
        expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBeTruthy();
        await page.screenshot({ path: testInfo.outputPath(`unit-protection-${width}.png`) });
        await edit.getByLabel('Selling unit').selectOption('bunch');
        await edit.getByRole('button', { name: 'Save changes', exact: true }).click();
        await expect(edit).not.toBeVisible();
        listingName = renamed;

        await page.goto('/seller/dashboard?section=orders');
        await expect(row).toContainText(originalName);
        await expect(row).not.toContainText(renamed);
        await expect(row).toContainText('2 bunch');
        await expect(row).toContainText('₱35.50');
        await row.getByRole('button', { name: 'View order', exact: true }).click();
        const details = page.getByRole('dialog', { name: 'Order details' });
        await expect(details).toContainText(originalName);
        await expect(details).not.toContainText(renamed);
        await expect(details).toContainText('₱71.00');
        await page.screenshot({ path: testInfo.outputPath(`original-order-${width}.png`) });
        await page.evaluate(() => { window.print = () => { window.orderHistoryPrints = (window.orderHistoryPrints || 0) + 1; }; });
        await details.getByRole('button', { name: 'Print receipt', exact: true }).click();
        await expect(page.locator('.order-receipt')).toContainText(originalName);
        await expect(page.locator('.order-receipt')).not.toContainText(renamed);
        await expect(page.locator('.receipt-items')).toContainText('₱35.50 / bunch');
        await expect.poll(() => page.evaluate(() => window.orderHistoryPrints || 0)).toBe(1);
        await page.evaluate(() => window.dispatchEvent(new Event('afterprint')));
        await details.getByRole('button', { name: 'Close order details', exact: true }).click();
    }

    await row.getByRole('button', { name: 'Cancel order', exact: true }).click();
    await page.getByRole('dialog', { name: 'Cancel order?' }).getByLabel('Reason', { exact: true }).selectOption('out_of_stock');
    await page.getByRole('dialog', { name: 'Cancel order?' }).getByRole('button', { name: 'Cancel order', exact: true }).click();
    await expect(row.locator('.order-status-icon')).toHaveAttribute('aria-label', 'Cancelled');
    await page.goto('/seller/dashboard?section=products');
    await page.getByRole('button', { name: `Edit ${listingName}`, exact: true }).click();
    await expect(edit.getByLabel('Available stock')).toHaveValue('10');
    await edit.getByLabel('Selling unit').selectOption('kg');
    await edit.getByRole('button', { name: 'Save changes', exact: true }).click();
    await expect(edit).not.toBeVisible();
    await page.getByRole('button', { name: `Edit ${listingName}`, exact: true }).click();
    await expect(edit.getByLabel('Selling unit')).toHaveValue('kg');
    await edit.getByRole('button', { name: 'Close edit product', exact: true }).click();
    await page.goto('/seller/dashboard?section=orders');
    await expect(row).toContainText(originalName);
    await expect(row).toContainText('2 bunch');
});
