import { expect, test } from '@playwright/test';
import path from 'node:path';

const productName = 'Rosario COD Pechay';
const viewports = [
    { name: 'mobile-390', width: 390, height: 844 },
    { name: 'tablet-768', width: 768, height: 1024 },
    { name: 'desktop-1440', width: 1440, height: 1000 },
];

async function signIn(page, email) {
    await page.goto('/login');
    await page.getByLabel('Email address').fill(email);
    await page.getByLabel('Password', { exact: true }).fill('AgriFarm123!');
    await page.getByRole('button', { name: 'Login' }).click();
    await expect(page).not.toHaveURL(/\/login$/);
}

test('customer checks out with COD across mobile tablet and desktop; seller receives delivery details', async ({ page }, testInfo) => {
    await signIn(page, 'brgyrosario@gmail.com');
    await page.goto('/seller/dashboard?section=products');
    await page.getByRole('button', { name: 'Add product', exact: true }).first().click();
    const dialog = page.getByRole('dialog', { name: 'Add product' });
    await dialog.getByLabel('Product name').fill(productName);
    await dialog.getByLabel('Category').selectOption('Vegetables');
    await dialog.getByLabel('Price (PHP)').fill('48.50');
    await dialog.getByLabel('Selling unit').selectOption('bunch');
    await dialog.getByLabel('Available stock').fill('8');
    await dialog.locator('#product-photo').setInputFiles(path.resolve('public/images/market-pechay-feature.png'));
    await dialog.getByRole('button', { name: 'Add product', exact: true }).click();
    await expect(dialog).toBeHidden();
    await page.getByRole('button', { name: 'Sign out' }).click();
    await signIn(page, 'customer@agrifarm.test');

    for (const viewport of viewports) {
        await page.setViewportSize({ width: viewport.width, height: viewport.height });
        await page.goto('/?page=marketplace');
        await page.getByRole('button', { name: `Add ${productName} to cart` }).click();
        await page.goto('/?page=cart');
        await page.getByRole('link', { name: /Checkout · Cash on Delivery/ }).click();
        await expect(page.getByRole('heading', { name: 'Checkout', exact: true })).toBeVisible();
        await expect(page.getByRole('navigation', { name: 'Checkout progress' })).toContainText('Delivery details');
        await expect(page.getByText('Delivery charge: not set.')).toBeVisible();
        await page.getByRole('button', { name: 'Continue to review' }).click();
        await expect(page.getByRole('alert')).toContainText('Enter your name');
        await page.getByLabel('Mobile number').fill('09171234567');
        await page.getByLabel('Complete delivery address').fill('123 Example Street near Rosario hall');
        await page.getByLabel('Barangay, Pasig City').fill('Rosario');
        await page.getByRole('button', { name: 'Continue to review' }).click();
        await expect(page.getByRole('heading', { name: 'Review your order' })).toBeVisible();
        await expect(page.getByText('Cash on Delivery', { exact: true })).toBeVisible();
        expect(await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth)).toBeTruthy();
        await page.screenshot({ path: testInfo.outputPath(`${viewport.name}-checkout-review.png`), fullPage: true });
        await page.getByRole('button', { name: 'Place COD order' }).click();
        await expect(page).toHaveURL((url) => url.searchParams.get('page') === 'checkout' && /^[0-9a-f-]{36}$/.test(url.searchParams.get('order') || ''));
        await expect(page.getByRole('heading', { name: 'Your order has been sent to the seller' })).toBeVisible();
        await expect(page.getByText('123 Example Street near Rosario hall, Barangay Rosario, Pasig City')).toBeVisible();
        expect(await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth)).toBeTruthy();
        await page.screenshot({ path: testInfo.outputPath(`${viewport.name}-checkout-confirmation.png`), fullPage: true });
        await page.goto('/?page=cart');
        await expect(page.getByRole('heading', { name: 'Your basket is waiting' })).toBeVisible();
    }

    await page.getByRole('button', { name: 'Open account menu' }).click();
    await page.getByRole('button', { name: 'Sign out' }).click();
    await signIn(page, 'brgyrosario@gmail.com');
    await page.goto('/seller/dashboard?section=orders');
    await expect(page.getByText(productName).first()).toBeVisible();
    await page.getByRole('button', { name: 'View order' }).first().click();
    await expect(page.getByRole('dialog', { name: 'Order details' })).toContainText('Cash on Delivery');
    await expect(page.getByRole('dialog', { name: 'Order details' })).toContainText('09171234567');
});
