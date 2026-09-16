import { expect, test } from '@playwright/test';
import path from 'node:path';

test('seller product photo picker accepts 10 MB and explains the limit', async ({ page }) => {
    await page.goto('/login');
    await page.getByLabel('Email address').fill('brgyrosario@gmail.com');
    await page.getByLabel('Password', { exact: true }).fill('AgriFarm123!');
    await page.getByRole('button', { name: 'Login' }).click();
    await expect(page).not.toHaveURL(/\/login$/);
    await page.goto('/seller/dashboard?section=products');
    await page.getByRole('button', { name: 'Add product', exact: true }).first().click();

    const dialog = page.getByRole('dialog', { name: 'Add product' });
    const picker = dialog.locator('#product-photo');
    await expect(dialog.getByText('Up to 10 MB')).toBeVisible();
    await picker.setInputFiles({ name: 'at-limit.png', mimeType: 'image/png', buffer: Buffer.alloc(10 * 1024 * 1024) });
    await expect(dialog.locator('#photo-error')).toHaveCount(0);
    await picker.setInputFiles({ name: 'over-limit.png', mimeType: 'image/png', buffer: Buffer.alloc(10 * 1024 * 1024 + 1) });
    await expect(dialog.locator('#photo-error')).toHaveText('Choose a JPG, PNG or WebP image up to 10 MB.');
});

test('seller can paste a product photo from the clipboard and save it', async ({ page }) => {
    await page.goto('/login');
    await page.getByLabel('Email address').fill('brgyrosario@gmail.com');
    await page.getByLabel('Password', { exact: true }).fill('AgriFarm123!');
    await page.getByRole('button', { name: 'Login' }).click();
    await expect(page).not.toHaveURL(/\/login$/);
    await page.goto('/seller/dashboard?section=products');
    await page.getByRole('button', { name: 'Add product', exact: true }).first().click();

    const dialog = page.getByRole('dialog', { name: 'Add product' });
    await expect(dialog.getByText('Paste with Ctrl+V', { exact: false })).toBeVisible();
    await dialog.getByLabel('Product name').fill('Clipboard Pechay');
    await dialog.getByLabel('Category').selectOption('Vegetables');
    await dialog.getByLabel('Price (PHP)').fill('45');
    await dialog.getByLabel('Available stock').fill('8');

    const textPastePrevented = await dialog.locator('#product-name').evaluate(input => {
        const data = new DataTransfer();
        data.setData('text/plain', ' pasted text');
        return !input.dispatchEvent(new ClipboardEvent('paste', { bubbles: true, cancelable: true, clipboardData: data }));
    });
    expect(textPastePrevented).toBe(false);

    await dialog.locator('#product-name').evaluate(input => {
        const bytes = Uint8Array.from(atob('iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mP8/x8AAwMCAO+aXioAAAAASUVORK5CYII='), character => character.charCodeAt(0));
        const data = new DataTransfer();
        data.items.add(new File([bytes], 'clipboard.png', { type: 'image/png' }));
        input.dispatchEvent(new ClipboardEvent('paste', { bubbles: true, cancelable: true, clipboardData: data }));
    });

    await expect(dialog.locator('.product-upload.has-photo img')).toBeVisible();
    await expect(dialog.locator('#photo-error')).toHaveCount(0);
    await dialog.getByRole('button', { name: 'Add product', exact: true }).click();
    await expect(dialog).not.toBeVisible();
    await expect(page.getByRole('heading', { name: 'Clipboard Pechay' })).toBeVisible();
    await expect(page.getByRole('img', { name: 'Clipboard Pechay' })).toHaveAttribute('src', /\/seller\/products\/\d+\/photo/);
});

test('replacing a product photo updates the displayed image', async ({ page }) => {
    await page.goto('/login');
    await page.getByLabel('Email address').fill('brgyrosario@gmail.com');
    await page.getByLabel('Password', { exact: true }).fill('AgriFarm123!');
    await page.getByRole('button', { name: 'Login' }).click();
    await expect(page).not.toHaveURL(/\/login$/);
    await page.goto('/seller/dashboard?section=products');
    await page.getByRole('button', { name: 'Add product', exact: true }).first().click();

    const addDialog = page.getByRole('dialog', { name: 'Add product' });
    await addDialog.getByLabel('Product name').fill('Photo Update Pechay');
    await addDialog.getByLabel('Category').selectOption('Vegetables');
    await addDialog.getByLabel('Price (PHP)').fill('45');
    await addDialog.getByLabel('Available stock').fill('8');
    await addDialog.locator('#product-photo').setInputFiles({ name: 'first.png', mimeType: 'image/png', buffer: Buffer.from('iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mP8/x8AAwMCAO+aXioAAAAASUVORK5CYII=', 'base64') });
    await addDialog.getByRole('button', { name: 'Add product', exact: true }).click();
    await expect(addDialog).not.toBeVisible();

    const card = page.locator('.seller-product-card').filter({ hasText: 'Photo Update Pechay' });
    const image = card.getByRole('img', { name: 'Photo Update Pechay' });
    const originalUrl = await image.getAttribute('src');
    await expect.poll(() => image.evaluate(element => element.naturalWidth)).toBe(1);

    await card.getByRole('button', { name: 'Edit Photo Update Pechay' }).click();
    const editDialog = page.getByRole('dialog', { name: 'Edit product' });
    await editDialog.locator('#product-photo').setInputFiles(path.resolve('public/images/market-pechay-feature.png'));
    await expect(editDialog.locator('.product-preview-image img')).toHaveAttribute('src', /^blob:/);
    await editDialog.getByRole('button', { name: 'Save changes' }).click();
    await expect(editDialog).not.toBeVisible();
    await expect(image).not.toHaveAttribute('src', originalUrl);
    await expect.poll(() => image.evaluate(element => element.naturalWidth)).toBeGreaterThan(1);
});
