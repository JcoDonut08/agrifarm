import { expect, test } from '@playwright/test';

const viewports = [
    { name: 'mobile-390', width: 390, height: 844 },
    { name: 'tablet-768', width: 768, height: 1024 },
    { name: 'desktop-1440', width: 1440, height: 1000 },
];

for (const viewport of viewports) {
    test(`${viewport.name}: product detail browsing and cart`, async ({ page }, testInfo) => {
        await page.setViewportSize({ width: viewport.width, height: viewport.height });
        await page.addInitScript(() => {
            if (!localStorage.getItem('agrifarm-theme')) localStorage.setItem('agrifarm-theme', 'light');
        });
        await page.goto('/?page=marketplace');

        await page.getByRole('link', { name: 'View Fresh Pechay details' }).click();
        await expect(page).toHaveURL(/\?page=product&product=pechay$/);
        await expect(page.getByRole('heading', { name: 'Fresh Pechay', level: 1 })).toBeVisible();
        await expect(page.getByRole('navigation', { name: 'Breadcrumb' })).toHaveCount(0);
        await expect(page.locator('.product-detail-facts').getByText('Barangay Rosario', { exact: true })).toBeVisible();
        await expect(page.getByRole('img', { name: 'Fresh Pechay' })).toBeVisible();
        await expect(page.getByRole('heading', { name: 'Product ratings', level: 2 })).toBeVisible();
        await expect(page.getByRole('link', { name: 'View cart' })).toHaveCount(0);
        await expect(page.getByText('Your cart is saved on this device')).toHaveCount(0);
        await expect(page.getByRole('link', { name: 'Log in to write a review' })).toBeVisible();
        await expectReviewsBeforePosting(page);
        await assertNoHorizontalOverflow(page);
        await page.screenshot({ path: testInfo.outputPath(`${viewport.name}-product-detail.png`), fullPage: true });
        await page.evaluate(() => localStorage.setItem('agrifarm-theme', 'dark'));
        await page.reload();
        await expect(page.locator('html')).toHaveClass(/dark/);
        await assertNoHorizontalOverflow(page);
        await page.screenshot({ path: testInfo.outputPath(`${viewport.name}-product-detail-dark.png`), fullPage: true });
        await page.evaluate(() => localStorage.setItem('agrifarm-theme', 'light'));
        await page.reload();
        await page.getByRole('link', { name: 'View ratings and reviews for Fresh Pechay' }).click();
        await expect(page.getByRole('heading', { name: 'Product ratings', level: 2 })).toBeVisible();
        await expect(page.getByRole('heading', { name: 'No customer reviews yet' })).toBeVisible();
        await page.getByRole('button', { name: '5 Star (0)' }).click();
        await expect(page.getByRole('heading', { name: 'No 5-star reviews yet' })).toBeVisible();
        await page.getByRole('button', { name: 'All (0)' }).click();
        expect(await page.evaluate(() => window.location.hash)).toBe('#product-reviews');

        await page.getByRole('button', { name: 'Increase quantity' }).click();
        await page.getByRole('button', { name: 'Increase quantity' }).click();
        await expect(page.getByLabel('Selected quantity')).toHaveText('3');
        await page.getByRole('button', { name: 'Add to cart', exact: true }).click();
        await expect(page.getByRole('link', { name: 'Shopping cart, 3 items' })).toBeVisible();
        await expect(page.getByRole('status').filter({ hasText: '3 units of Fresh Pechay added' })).toBeVisible();
        await page.getByRole('button', { name: 'Save Fresh Pechay to favorites' }).click();
        await expect(page.getByRole('button', { name: 'Remove Fresh Pechay from favorites' })).toHaveAttribute('aria-pressed', 'true');

        await page.getByRole('link', { name: 'View Crisp Cucumber details' }).click();
        await expect(page).toHaveURL(/\?page=product&product=cucumber$/);
        await expect(page.getByRole('heading', { name: 'Crisp Cucumber', level: 1 })).toBeVisible();
        await expect(page.getByLabel('Selected quantity')).toHaveText('1');
        await assertNoHorizontalOverflow(page);

        await page.goto('/?page=marketplace');
        await page.getByRole('button', { name: 'Add Native Tomatoes to cart' }).click();
        await expect(page).toHaveURL(/\?page=marketplace$/);
        await page.getByRole('button', { name: 'Save Native Tomatoes to favorites' }).click();
        await expect(page).toHaveURL(/\?page=marketplace$/);

        await page.goto('/?page=product&product=missing');
        await expect(page.getByRole('heading', { name: 'Product not found', level: 1 })).toBeVisible();
    });
}

test('customer can post multiple reviews, then edit and delete individual reviews', async ({ page }, testInfo) => {
    await page.setViewportSize({ width: 390, height: 844 });
    await page.goto('/login');
    await page.getByLabel('Email address').fill('customer@agrifarm.test');
    await page.getByLabel('Password', { exact: true }).fill('AgriFarm123!');
    await page.getByRole('button', { name: 'Login' }).click();
    await expect(page).toHaveURL(/\/$/);
    await page.goto('/?page=product&product=pechay');
    await expect(page.getByRole('heading', { name: 'Write a review' })).toBeVisible();
    await expectReviewsBeforePosting(page);
    await page.screenshot({ path: testInfo.outputPath('mobile-390-review-form.png'), fullPage: true });
    await page.getByRole('button', { name: 'Rate 4 stars' }).click();
    await page.getByRole('textbox', { name: 'Your review' }).fill('These leaves were crisp and fresh from the garden.');
    await page.getByRole('checkbox', { name: /Post anonymously/ }).check();
    await page.getByRole('button', { name: 'Post review' }).click();
    await expect(page.getByText('These leaves were crisp and fresh from the garden.')).toBeVisible();
    await expect(page.locator('.review-item-top strong')).toHaveText('Anonymous customer');
    await page.screenshot({ path: testInfo.outputPath('mobile-390-anonymous-review.png'), fullPage: true });

    await page.getByRole('button', { name: 'Rate 5 stars' }).click();
    await page.getByRole('textbox', { name: 'Your review' }).fill('A second visit was just as fresh and enjoyable.');
    await page.getByRole('checkbox', { name: /Post anonymously/ }).uncheck();
    await page.getByRole('button', { name: 'Post review' }).click();
    await expect(page.locator('.review-item')).toHaveCount(2);

    const secondReview = page.locator('.review-item').filter({ hasText: 'A second visit was just as fresh and enjoyable.' });
    await secondReview.getByRole('button', { name: 'Edit this review' }).click();
    await expect(page.getByRole('heading', { name: 'Edit review' })).toBeVisible();
    await page.getByRole('button', { name: 'Rate 5 stars' }).click();
    await page.getByRole('textbox', { name: 'Your review' }).fill('The pechay was wonderful and very fresh.');
    await page.getByRole('button', { name: 'Save changes' }).click();
    await expect(page.getByRole('heading', { name: 'Write a review' })).toBeVisible();
    await expect(page.locator('.review-item')).toHaveCount(2);

    const firstReview = page.locator('.review-item').filter({ hasText: 'These leaves were crisp and fresh from the garden.' });
    await firstReview.getByRole('button', { name: 'Delete this review' }).click();
    const confirmation = page.getByRole('dialog', { name: 'Delete review?' });
    await expect(confirmation).toBeVisible();
    await page.screenshot({ path: testInfo.outputPath('mobile-390-review-delete-confirmation.png'), fullPage: true });
    await confirmation.getByRole('button', { name: 'Keep review' }).click();
    await expect(confirmation).toBeHidden();
    await expect(page.locator('.review-item')).toHaveCount(2);
    await firstReview.getByRole('button', { name: 'Delete this review' }).click();
    await confirmation.getByRole('button', { name: 'Delete review' }).click();
    await expect(page.locator('.review-item')).toHaveCount(1);
    await page.getByRole('button', { name: '5 Star (1)' }).click();
    await expect(page.locator('.review-item')).toHaveCount(1);
    await expect(page.getByText('The pechay was wonderful and very fresh.')).toBeVisible();

    await page.getByRole('button', { name: 'All (1)' }).click();
    for (let index = 1; index <= 5; index += 1) {
        const comment = `Pagination review ${index} confirms the produce stayed fresh.`;
        await page.getByRole('button', { name: 'Rate 5 stars' }).click();
        await page.getByRole('textbox', { name: 'Your review' }).fill(comment);
        await Promise.all([
            page.waitForResponse((response) => response.url().includes('/product-reviews') && response.request().method() === 'POST'),
            page.getByRole('button', { name: 'Post review' }).click(),
        ]);
        await expect(page.getByText(comment)).toBeVisible();
        await expect(page.getByRole('textbox', { name: 'Your review' })).toHaveValue('');
    }
    await expect(page.locator('.review-item')).toHaveCount(5);
    await expect(page.getByRole('navigation', { name: 'Review pages' })).toContainText('Page 1 of 2');
    await page.getByRole('button', { name: 'Next' }).click();
    await expect(page.getByRole('navigation', { name: 'Review pages' })).toContainText('Page 2 of 2');
    await expect(page.locator('.review-item')).toHaveCount(1);
    await assertNoHorizontalOverflow(page);
});

async function assertNoHorizontalOverflow(page) {
    expect(await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth)).toBeTruthy();
}

async function expectReviewsBeforePosting(page) {
    expect(await page.evaluate(() => {
        const reviews = document.querySelector('.review-list');
        const posting = document.querySelector('.review-form-panel, .review-signin');
        return Boolean(reviews && posting && reviews.compareDocumentPosition(posting) & Node.DOCUMENT_POSITION_FOLLOWING);
    })).toBeTruthy();
}
