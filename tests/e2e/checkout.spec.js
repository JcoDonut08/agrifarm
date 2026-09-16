import { expect, test } from '@playwright/test';
import { readFile } from 'node:fs/promises';
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
    await page.goto('/?page=marketplace');
    await page.getByRole('button', { name: `Add ${productName} to cart` }).click();
    await page.goto('/customer');
    await expect(page.getByRole('heading', { name: 'My Profile' })).toBeVisible();
    await expect(page.getByRole('link', { name: 'Shopping cart, 1 items' })).toBeVisible();
    await page.getByLabel('Mobile number').fill('09171234567');
    await page.getByLabel('Complete address').fill('123 Example Street near Rosario hall');
    await page.getByRole('button', { name: 'Save details' }).click();
    await expect(page.locator('.customer-profile-status')).toContainText('Profile saved');
    await page.goto('/?page=cart');
    await expect(page.getByText(productName).first()).toBeVisible();

    let lastReference;
    for (const viewport of viewports) {
        await page.setViewportSize({ width: viewport.width, height: viewport.height });
        await page.goto('/customer');
        await expect(page.getByLabel('Mobile number')).toHaveValue('09171234567');
        await expect(page.locator('.customer-settings-section')).toHaveCount(3);
        await expect(page.locator('.customer-profile-identity')).toContainText('AgriFarm Customer');
        expect(await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth)).toBeTruthy();
        await page.screenshot({ path: testInfo.outputPath(`${viewport.name}-profile.png`), fullPage: true });
        await page.goto('/?page=marketplace');
        if (viewport.width > 1000) {
            const nav = page.getByRole('navigation', { name: 'Main navigation' });
            await expect(nav.getByRole('link', { name: 'Marketplace' })).toHaveAttribute('aria-current', 'page');
            const activeBackground = await nav.getByRole('link', { name: 'Marketplace' }).evaluate(node => getComputedStyle(node).backgroundColor);
            expect(activeBackground).not.toBe('rgba(0, 0, 0, 0)');
            await nav.getByRole('link', { name: 'Home' }).hover();
            await expect.poll(() => nav.getByRole('link', { name: 'Home' }).evaluate(node => getComputedStyle(node).backgroundColor)).not.toBe('rgba(0, 0, 0, 0)');
        } else {
            await page.getByRole('button', { name: 'Open navigation menu' }).click();
            const nav = page.getByRole('navigation', { name: 'Mobile navigation' });
            await expect(nav.getByRole('link', { name: 'Marketplace' })).toHaveAttribute('aria-current', 'page');
            await expect(nav.getByRole('link', { name: 'Marketplace' })).toBeVisible();
            await page.getByRole('button', { name: 'Close navigation menu' }).click();
        }
        await page.getByRole('button', { name: `Add ${productName} to cart` }).click();
        await page.goto('/?page=cart');
        await page.getByRole('link', { name: /Checkout · Cash on Delivery/ }).click();
        await expect(page.getByRole('heading', { name: 'Checkout', exact: true })).toBeVisible();
        const checkoutTypography = await page.evaluate(() => ({
            storefront: getComputedStyle(document.querySelector('.storefront')).fontFamily,
            title: getComputedStyle(document.querySelector('.checkout-heading h1')).fontFamily,
            titleWeight: Number(getComputedStyle(document.querySelector('.checkout-heading h1')).fontWeight),
            panel: getComputedStyle(document.querySelector('.checkout-details h2')).fontFamily,
            panelWeight: Number(getComputedStyle(document.querySelector('.checkout-details h2')).fontWeight),
        }));
        expect(checkoutTypography.title).toBe(checkoutTypography.storefront);
        expect(checkoutTypography.panel).toBe(checkoutTypography.storefront);
        expect(checkoutTypography.titleWeight).toBeGreaterThanOrEqual(700);
        expect(checkoutTypography.panelWeight).toBeGreaterThanOrEqual(700);
        await expect(page.getByLabel('Email address')).toHaveValue('customer@agrifarm.test');
        await expect(page.getByLabel('Contact number')).toHaveValue('09171234567');
        await expect(page.getByLabel('Complete address')).toHaveValue('123 Example Street near Rosario hall');
        await expect(page.getByLabel('Barangay, Pasig City')).toHaveCount(0);
        await page.getByLabel('Email address').fill('delivery@example.com');
        await expect(page.getByLabel('Email address')).toHaveValue('delivery@example.com');
        await expect(page.getByRole('navigation', { name: 'Checkout progress' })).toContainText('Confirm order');
        await expect(page.getByText('Delivery charge').first()).toBeVisible();
        await page.evaluate(() => window.scrollTo(0, 0));
        await page.screenshot({ path: testInfo.outputPath(`${viewport.name}-checkout-shipping.png`), fullPage: true });
        await page.getByRole('button', { name: 'Continue to payment' }).click();
        await expect(page.getByRole('heading', { name: 'Payment method' })).toBeVisible();
        await expect.poll(() => page.evaluate(() => window.scrollY)).toBe(0);
        await expect(page.getByText('Cash on Delivery', { exact: true })).toBeVisible();
        await expect(page.getByRole('button', { name: 'GCash, coming soon' })).toBeDisabled();
        await expect(page.getByRole('button', { name: 'Maya, coming soon' })).toBeDisabled();
        await expect(page.locator('.checkout-review-block .checkout-product-row img')).toBeVisible();
        expect(await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth)).toBeTruthy();
        await page.screenshot({ path: testInfo.outputPath(`${viewport.name}-checkout-payment.png`), fullPage: true });
        await page.getByRole('button', { name: 'Continue to confirmation' }).click();
        await expect(page.getByRole('heading', { name: 'Confirm your order' })).toBeVisible();
        await expect.poll(() => page.evaluate(() => window.scrollY)).toBe(0);
        await expect(page.locator('.checkout-final-details')).toContainText('123 Example Street near Rosario hall');
        await expect(page.locator('.checkout-final-products .checkout-product-row img')).toBeVisible();
        await expect(page.getByText('Payable for goods')).toBeVisible();
        expect(await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth)).toBeTruthy();
        await page.screenshot({ path: testInfo.outputPath(`${viewport.name}-checkout-confirm.png`), fullPage: true });
        await page.getByRole('button', { name: 'Place COD order' }).click();
        await expect(page).toHaveURL((url) => url.searchParams.get('page') === 'order-success' && /^[0-9a-f-]{36}$/.test(url.searchParams.get('order') || ''));
        await expect(page.getByRole('heading', { name: 'Thanks for ordering!' })).toBeVisible();
        const reference = await page.locator('.checkout-reference').textContent();
        expect(reference).toMatch(/^AgFrm-[A-Z][0-9][A-Z0-9]{10}$/);
        lastReference = reference;
        await expect(page.locator('.checkout-confirmation-delivery')).toContainText('123 Example Street near Rosario hall');
        const mascot = page.locator('.checkout-mascot');
        await expect(mascot).toBeVisible();
        await expect.poll(() => mascot.evaluate(image => image.naturalWidth)).toBeGreaterThan(0);
        if (viewport.name === 'mobile-390') {
            await page.emulateMedia({ media: 'print' });
            await expect(page.locator('.checkout-print-receipt')).toBeVisible();
            await expect(page.locator('.checkout-print-receipt')).toContainText(reference);
            await page.emulateMedia({ media: 'screen' });
            await page.evaluate(() => { window.__printCalled = false; window.print = () => { window.__printCalled = true; }; });
            await page.getByRole('button', { name: 'Print receipt' }).click();
            expect(await page.evaluate(() => window.__printCalled)).toBeTruthy();
            const downloadPromise = page.waitForEvent('download');
            await page.getByRole('button', { name: 'Download receipt' }).click();
            const download = await downloadPromise;
            expect(download.suggestedFilename()).toBe(`${reference}-receipt.pdf`);
            expect((await readFile(await download.path())).subarray(0, 5).toString()).toBe('%PDF-');
        }
        expect(await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth)).toBeTruthy();
        await page.evaluate(() => window.scrollTo(0, 0));
        await page.screenshot({ path: testInfo.outputPath(`${viewport.name}-order-success.png`), fullPage: true });
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
    await expect(page.getByRole('dialog', { name: 'Order details' })).toContainText(lastReference);
    await expect(page.getByRole('dialog', { name: 'Order details' })).toContainText('09171234567');
});
