import { expect, test } from '@playwright/test';
import path from 'node:path';

const productName = 'Rosario Garden Pechay';
const viewports = [
    { name: 'mobile-390', width: 390, height: 844 },
    { name: 'tablet-768', width: 768, height: 1024 },
    { name: 'desktop-1440', width: 1440, height: 1000 },
];

test('seller listing appears in customer homepage, marketplace, detail, and cart', async ({ page }, testInfo) => {
    await signIn(page, 'brgyrosario@gmail.com');
    await page.goto('/seller/dashboard?section=products');
    await page.getByRole('button', { name: 'Add product', exact: true }).first().click();
    const dialog = page.getByRole('dialog', { name: 'Add product' });
    await dialog.getByLabel('Product name').fill(productName);
    await dialog.getByLabel('Category').selectOption('Vegetables');
    await dialog.getByLabel(/Description/).fill('Fresh pechay grown and listed by a local seller.');
    await dialog.getByLabel('Price (PHP)').fill('48.50');
    await dialog.getByLabel('Selling unit').selectOption('bunch');
    await dialog.getByLabel('Available stock').fill('12');
    await dialog.locator('#product-photo').setInputFiles(path.resolve('public/images/market-pechay-feature.png'));
    await dialog.getByRole('button', { name: 'Add product', exact: true }).click();
    await expect(dialog).not.toBeVisible();
    await expect(page.getByRole('heading', { name: productName })).toBeVisible();

    await page.goto('/seller/dashboard?section=orders');
    await page.getByRole('button', { name: 'Add walk-in order' }).click();
    const orderDialog = page.getByRole('dialog', { name: 'Add walk-in order' });
    const productOption = orderDialog.locator('#walk-in-product option').filter({ hasText: productName });
    await orderDialog.getByLabel('Product').selectOption(await productOption.getAttribute('value'));
    await orderDialog.getByLabel('Quantity').fill('2');
    await orderDialog.getByRole('button', { name: 'Add order' }).click();
    await expect(orderDialog).not.toBeVisible();
    await page.goto('/');
    await expect(page.getByRole('heading', { name: 'No best sellers yet' })).toBeVisible();
    await expect(page.getByText('BEST BARANGAY · RANKING PENDING')).toBeVisible();
    await page.screenshot({ path: testInfo.outputPath('ranking-pending-desktop.png'), fullPage: true });
    await page.goto('/seller/dashboard?section=orders');
    await page.getByRole('button', { name: 'Accept order' }).click();
    await page.getByRole('button', { name: 'Mark for delivery' }).click();
    await page.getByRole('button', { name: 'Confirm delivery' }).click();
    await page.getByRole('button', { name: 'Add walk-in order' }).click();
    const secondOrderDialog = page.getByRole('dialog', { name: 'Add walk-in order' });
    const secondProductOption = secondOrderDialog.locator('#walk-in-product option').filter({ hasText: productName });
    await secondOrderDialog.getByLabel('Product').selectOption(await secondProductOption.getAttribute('value'));
    await secondOrderDialog.getByLabel('Quantity').fill('1');
    await secondOrderDialog.getByRole('button', { name: 'Add order' }).click();
    await expect(secondOrderDialog).not.toBeVisible();
    await page.getByRole('button', { name: 'Accept order' }).click();
    await page.getByRole('button', { name: 'Mark for delivery' }).click();
    await page.getByRole('button', { name: 'Confirm delivery' }).click();

    await page.getByRole('button', { name: 'Sign out' }).click();
    await signIn(page, 'customer@agrifarm.test');

    for (const viewport of viewports) {
        await page.setViewportSize({ width: viewport.width, height: viewport.height });
        await page.goto('/');
        await expect(page.getByRole('heading', { name: 'Fresh from local sellers' })).toBeVisible();
        await expect(page.getByRole('heading', { name: productName }).first()).toBeVisible();
        await expect(page.getByRole('img', { name: productName }).first()).toBeVisible();
        await expect(page.getByText('Barangay Rosario').first()).toBeVisible();
        await expect(page.getByRole('heading', { name: 'Featured Barangays' })).toBeVisible();
        await expect(page.locator('.community-card.is-unavailable')).toHaveCount(2);
        await expect(page.getByRole('heading', { name: 'Best-selling plants' })).toBeVisible();
        await expect(page.locator('.top-selling-section .produce-card')).toHaveCount(1);
        await expect(page.locator('.top-selling-section .produce-card')).toContainText(productName);
        await expect(page.locator('.top-selling-section .product-badge')).toHaveCount(1);
        await expect(page.locator('.top-selling-section .product-badge')).toHaveText('Best Seller');
        await expect(page.locator('.featured-banner')).toContainText('Barangay Rosario');
        await expect(page.locator('.featured-banner')).toContainText('₱145.50 from 2 delivered walk-in orders');
        await expect(page.locator('.featured-stage-copy')).toContainText(productName);
        await expect(page.locator('.featured-stage-copy')).toContainText('2 delivered walk-in orders');
        await expect(page.locator('.featured-stage-image')).toBeVisible();
        await expect(page.locator('.featured-product-photo img')).toHaveAttribute('src', /\/marketplace\/products\/\d+\/photo/);
        expect(await page.locator('.featured-product-photo').evaluate((photo) => getComputedStyle(photo).position)).toBe('relative');
        expect(await page.locator('.featured-product-photo img').evaluate((photo) => getComputedStyle(photo).objectFit)).toBe('cover');
        expect(await page.locator('.featured-product-stage').evaluate((stage) => getComputedStyle(stage).backgroundColor))
            .toBe(await page.locator('.featured-banner').evaluate((banner) => getComputedStyle(banner).backgroundColor));
        expect(await page.locator('.featured-banner').evaluate((banner) => banner.getBoundingClientRect().height)).toBeLessThan(viewport.width === 390 ? 650 : 450);
        expect(await page.locator('.featured-product-photo img').evaluate((img) => img.naturalWidth)).toBeGreaterThan(0);
        await expect(page.getByRole('link', { name: 'View featured product' })).toHaveAttribute('href', /\?page=product&product=seller-\d+/);
        await assertNoHorizontalOverflow(page);
        await page.screenshot({ path: testInfo.outputPath(`${viewport.name}-seller-home.png`), fullPage: true });

        await page.locator('.top-selling-section .section-link').click();
        await expect(page).toHaveURL(/\?page=marketplace&sort=best-selling$/);
        await expect(page.getByLabel('Sort products')).toHaveValue('best-selling');
        await page.getByRole('button', { name: 'Reset filters' }).click();
        await expect(page).toHaveURL(/\?page=marketplace$/);
        await expect(page.getByLabel('Sort products')).toHaveValue('recommended');

        await page.goto('/?page=marketplace');
        await expect(page.getByRole('heading', { name: productName })).toBeVisible();
        await expect(page.getByRole('status').filter({ hasText: '1 product' }).first()).toBeVisible();
        await expect(page.getByLabel('Barangay')).toBeVisible();
        await expect(page.getByLabel('Sort products').locator('option[value="best-selling"]')).toHaveText('Best Selling');
        await page.getByLabel('Barangay').selectOption('Rosario');
        await expect(page.getByRole('heading', { name: productName })).toBeVisible();
        await page.getByLabel('Barangay').selectOption('Maybunga');
        await expect(page.getByRole('heading', { name: 'No produce found' })).toBeVisible();
        await page.getByLabel('Barangay').selectOption('');
        await page.getByRole('searchbox', { name: 'Search fresh produce' }).fill('not a product');
        await expect(page.getByRole('heading', { name: 'No produce found' })).toBeVisible();
        await page.getByRole('button', { name: 'Clear filters' }).click();
        await expect(page.getByRole('heading', { name: productName })).toBeVisible();
        await assertNoHorizontalOverflow(page);
        await page.screenshot({ path: testInfo.outputPath(`${viewport.name}-seller-marketplace.png`), fullPage: true });

        await page.getByRole('link', { name: `View ${productName} details` }).click();
        await expect(page).toHaveURL(/\?page=product&product=seller-\d+$/);
        await expect(page.getByRole('heading', { name: productName, level: 1 })).toBeVisible();
        await expect(page.locator('.product-detail-badge')).toHaveCount(1);
        await expect(page.locator('.product-detail-badge')).toHaveText('Best Seller');
        await expect(page.getByRole('img', { name: productName })).toBeVisible();
        await expect(page.getByText('Fresh pechay grown and listed by a local seller.')).toBeVisible();
        await expect(page.getByRole('heading', { name: 'Write a review' })).toBeVisible();
        await expect(page.getByRole('img', { name: productName }).evaluate((img) => img.naturalWidth > 0)).toBeTruthy();
        await page.getByRole('link', { name: 'View Barangay Rosario shop' }).click();
        await expect(page).toHaveURL(/\?page=seller&seller=\d+$/);
        await expect(page.getByRole('heading', { name: 'Barangay Rosario', level: 1 })).toBeVisible();
        await expect(page.getByRole('heading', { name: 'Products from this seller' })).toBeVisible();
        await expect(page.getByRole('heading', { name: productName })).toBeVisible();
        await page.screenshot({ path: testInfo.outputPath(`${viewport.name}-seller-profile.png`), fullPage: true });
        await page.goBack();
        await expect(page.getByRole('heading', { name: productName, level: 1 })).toBeVisible();
        await assertNoHorizontalOverflow(page);
        await page.screenshot({ path: testInfo.outputPath(`${viewport.name}-seller-product-detail.png`), fullPage: true });
        await page.getByRole('button', { name: 'Add to cart', exact: true }).click();
        await page.goto('/?page=cart');
        await expect(page.getByRole('heading', { name: productName })).toBeVisible();
        await expect(page.getByText('Barangay Rosario').first()).toBeVisible();
        await assertNoHorizontalOverflow(page);
    }

    for (const viewport of [viewports[2], viewports[0]]) {
        await page.setViewportSize({ width: viewport.width, height: viewport.height });
        await page.goto('/');
        await page.evaluate(() => document.documentElement.classList.add('dark'));
        await expect(page.locator('.top-selling-section .product-badge')).toHaveCount(1);
        await assertNoHorizontalOverflow(page);
        await page.screenshot({ path: testInfo.outputPath(`${viewport.name}-dark-seller-home.png`), fullPage: true });
    }
});

async function signIn(page, email) {
    await page.goto('/login');
    await page.getByLabel('Email address').fill(email);
    await page.getByLabel('Password', { exact: true }).fill('AgriFarm123!');
    await page.getByRole('button', { name: 'Login' }).click();
    await expect(page).not.toHaveURL(/\/login$/);
}

async function assertNoHorizontalOverflow(page) {
    expect(await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth)).toBeTruthy();
}
