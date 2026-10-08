import { expect, test } from '@playwright/test';
import { randomUUID } from 'node:crypto';
import path from 'node:path';

test('product edits preserve reserved inventory and allow reviewed corrections including zero stock', async ({ page, browser }, testInfo) => {
    const productName = 'Inventory Edit Pechay';
    await signIn(page, 'brgyrosario@gmail.com');
    await page.goto('/seller/dashboard?section=products');
    await page.getByRole('button', { name: 'Add product', exact: true }).first().click();
    const create = page.getByRole('dialog', { name: 'Add product' });
    await create.getByLabel('Product name').fill(productName);
    await create.getByLabel('Category').selectOption('Vegetables');
    await create.getByLabel('Price (PHP)').fill('35.50');
    await create.getByLabel('Selling unit').selectOption('bunch');
    await create.getByLabel('Available stock').fill('10');
    await create.getByLabel('Expected yield quantity').fill('10');
    await create.locator('#product-photo').setInputFiles(path.resolve('public/images/market-pechay-feature.png'));
    await create.getByRole('button', { name: 'Add product', exact: true }).click();
    await expect(create).not.toBeVisible();
    const photo = page.getByRole('img', { name: productName, exact: true });
    await expect(photo).toHaveAttribute('src', /\/seller\/products\/\d+\/photo/);
    const productId = Number((await photo.getAttribute('src')).match(/\/seller\/products\/(\d+)\/photo/)[1]);
    const customerContext = await browser.newContext({ baseURL: testInfo.project.use.baseURL });
    const customer = await customerContext.newPage();
    await signIn(customer, 'customer@agrifarm.test');
    const order = async quantity => {
        const csrf = (await customerContext.cookies()).find(cookie => cookie.name === 'XSRF-TOKEN');
        const response = await customer.request.post('/checkout', {
            headers: { 'X-XSRF-TOKEN': decodeURIComponent(csrf.value), Accept: 'application/json' },
            data: {
                checkout_id: randomUUID(), recipient_name: 'Test Customer', phone: '09171234567',
                address: '123 Example Street, Rosario', payment_method: 'cod',
                items: [{ product_id: productId, quantity }],
            },
        });
        expect(response.ok()).toBeTruthy();
        expect(response.url()).toContain('page=order-success');
    };

    let expectedYield = 10;
    for (const width of [390, 768, 1440]) {
        await page.setViewportSize({ width, height: 1000 });
        await page.getByRole('button', { name: `Edit ${productName}`, exact: true }).click();
        const edit = page.getByRole('dialog', { name: 'Edit product' });
        await expect(edit.getByLabel('Available stock')).toHaveValue('10');
        await order(2);
        await edit.getByLabel(/Description/).fill(`Description at ${width}px`);
        await edit.getByRole('button', { name: 'Save changes', exact: true }).click();
        await expect(edit).not.toBeVisible();

        await page.getByRole('button', { name: `Edit ${productName}`, exact: true }).click();
        await expect(edit.getByLabel('Available stock')).toHaveValue('8');
        await edit.getByLabel('Available stock').fill('12');
        await edit.getByLabel(/Description/).fill('Keep this draft after the inventory warning');
        await order(8);
        await order(3);
        expectedYield -= 3;
        await edit.getByRole('button', { name: 'Save changes', exact: true }).click();
        await expect(edit.getByText('Available stock changed. Current quantity: 0. Review it before saving.', { exact: true }).first()).toBeVisible();
        await expect(edit.getByLabel('Available stock')).toHaveValue('0');
        await expect(edit.getByLabel('Expected yield quantity')).toHaveValue(String(expectedYield));
        await expect(edit.getByLabel(/Description/)).toHaveValue('Keep this draft after the inventory warning');
        expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBeTruthy();
        await page.screenshot({ path: testInfo.outputPath(`inventory-review-${width}.png`), fullPage: true });
        await edit.getByLabel('Available stock').fill('6');
        await edit.getByRole('button', { name: 'Save changes', exact: true }).click();
        await expect(edit).not.toBeVisible();

        for (const [original, requested] of [['6', '0'], ['0', '10']]) {
            await page.getByRole('button', { name: `Edit ${productName}`, exact: true }).click();
            await expect(edit.getByLabel('Available stock')).toHaveValue(original);
            await expect(edit.getByLabel('Expected yield quantity')).toHaveValue(String(expectedYield));
            await edit.getByLabel('Available stock').fill(requested);
            await edit.getByRole('button', { name: 'Save changes', exact: true }).click();
            await expect(edit).not.toBeVisible();
        }
    }
    await customerContext.close();
});

async function signIn(page, email) {
    await page.goto('/login');
    await page.getByLabel('Email address').fill(email);
    await page.getByLabel('Password', { exact: true }).fill('AgriFarm123!');
    await page.getByRole('button', { name: 'Login' }).click();
    await expect(page).not.toHaveURL(/\/login$/);
}
