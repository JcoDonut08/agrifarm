import { expect, test } from './fixtures';
import { execFileSync } from 'node:child_process';
import path from 'node:path';

test.use({ actionTimeout: 15000 });

function seedProduct() {
    return execFileSync('php', ['-r', `
        require 'vendor/autoload.php';
        $app = require 'bootstrap/app.php';
        $app->make(Illuminate\\Contracts\\Console\\Kernel::class)->bootstrap();
        if (config('database.default') !== 'sqlite' || realpath(config('database.connections.sqlite.database')) !== realpath('database/playwright.sqlite')) {
            throw new RuntimeException('Expected the isolated browser-test database.');
        }
        $seller = App\\Models\\User::where('email', 'brgyrosario@gmail.com')->firstOrFail();
        $photo = 'products/feedback-browser-test.png';
        Illuminate\\Support\\Facades\\Storage::disk('local')->put($photo, file_get_contents('public/images/market-pechay-feature.png'));
        $product = new App\\Models\\Product(['name' => 'Feedback Test Pechay', 'category' => 'Vegetables', 'price' => 30,
            'unit' => 'bunch', 'stock' => 8, 'expected_yield' => 0, 'threshold' => 2, 'photo_path' => $photo]);
        $product->user_id = $seller->id;
        $product->save();
        echo $product->id;
    `], { encoding: 'utf8', cwd: process.cwd(), env: { ...process.env, APP_ENV: 'local', DB_CONNECTION: 'sqlite', DB_DATABASE: path.resolve('database/playwright.sqlite'), CACHE_STORE: 'e2e' } }).trim();
}

async function signIn(page, email) {
    await page.goto('/login');
    await page.getByLabel('Email address').fill(email);
    await page.getByLabel('Password', { exact: true }).fill('AgriFarm123!');
    await page.getByRole('button', { name: 'Login', exact: true }).click();
    await expect(page).not.toHaveURL(/\/login$/, { timeout: 45000 });
}

async function screenshots(page, testInfo, label) {
    const toast = page.locator('.app-form-status--toast');
    if (await toast.count()) await toast.hover();
    for (const theme of ['light', 'dark']) {
        await page.evaluate(theme => document.documentElement.classList.toggle('dark', theme === 'dark'), theme);
        expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBeTruthy();
        await page.screenshot({ path: testInfo.outputPath(`${label}-${theme}.png`), fullPage: true, animations: 'disabled' });
    }
    await page.evaluate(() => document.documentElement.classList.remove('dark'));
}

test('customer reports and admin moderation use inline errors, confirmations, and small success notifications', async ({ browser }, testInfo) => {
    const productId = seedProduct();
    const customerContext = await browser.newContext({ baseURL: testInfo.project.use.baseURL });
    const adminContext = await browser.newContext({ baseURL: testInfo.project.use.baseURL });
    const customer = await customerContext.newPage();
    const admin = await adminContext.newPage();
    const errors = [];
    customer.on('pageerror', error => errors.push(error.message));
    admin.on('pageerror', error => errors.push(error.message));
    await signIn(customer, 'customer@agrifarm.test');
    await signIn(admin, 'pasigcenro@gmail.com');

    for (const width of [390, 768, 1440]) {
        await customer.setViewportSize({ width, height: 1000 });
        await admin.setViewportSize({ width, height: 1000 });
        await customer.goto(`/?page=product&product=seller-${productId}`);
        await customer.getByRole('button', { name: 'Report this product or seller' }).click();
        const report = customer.getByRole('dialog', { name: 'Report an issue' });
        await report.getByRole('button', { name: 'Submit report' }).click();
        await expect(report.locator('#report-type-error')).toHaveText('Choose a reason.');
        await expect(report.locator('#report-description-error')).toHaveText('Describe what happened.');
        await expect(report.locator('#report-type')).toBeFocused();
        await screenshots(customer, testInfo, `customer-report-errors-${width}`);
        await report.getByLabel('Reason for reporting', { exact: true }).selectOption('Other');
        await report.getByLabel('Description', { exact: true }).fill(`Feedback test report at ${width}px.`);
        await report.getByRole('button', { name: 'Submit report' }).click();
        await expect(report).not.toBeVisible();
        await expect(customer.locator('.app-form-status--toast')).toContainText('Report sent to CENRO for review.');
        await screenshots(customer, testInfo, `customer-report-success-${width}`);

        // One complete review lifecycle keeps this shared account below the real submission rate limit.
        if (width === 390) {
            const reviewForm = customer.locator('.review-form-panel');
            await reviewForm.getByRole('button', { name: 'Rate 5 stars', exact: true }).click();
            await reviewForm.getByLabel('Your review', { exact: true }).fill(`Fresh produce feedback at ${width}px.`);
            await reviewForm.getByRole('button', { name: 'Post review', exact: true }).click();
            await expect(customer.locator('.app-form-status--toast')).toContainText('Review posted.');
            const review = customer.locator('.review-item').filter({ hasText: `Fresh produce feedback at ${width}px.` });
            await review.getByRole('button', { name: 'Edit this review', exact: true }).click();
            const editReview = customer.locator('.review-form-panel.is-editing');
            await editReview.getByLabel('Your review', { exact: true }).fill(`Updated produce feedback at ${width}px.`);
            await editReview.getByRole('button', { name: 'Save changes', exact: true }).click();
            await expect(customer.locator('.app-form-status--toast')).toContainText('Review updated.');
            await customer.locator('.review-item').filter({ hasText: `Updated produce feedback at ${width}px.` }).getByRole('button', { name: 'Delete this review', exact: true }).click();
            const reviewDeletion = customer.getByRole('dialog', { name: 'Delete review?' });
            await expect(reviewDeletion).toBeVisible();
            await reviewDeletion.getByRole('button', { name: 'Delete review', exact: true }).click();
            await expect(reviewDeletion).not.toBeVisible();
            await expect(customer.locator('.app-form-status--toast')).toContainText('Review deleted.');
            await screenshots(customer, testInfo, `customer-review-success-${width}`);
        }

        await admin.goto('/admin/dashboard?section=products');
        expect(errors).toEqual([]);
        const product = admin.locator('.admin-product-row').filter({ hasText: 'Feedback Test Pechay' });
        await expect(product).toBeVisible();
        if (width === 390) expect((await admin.locator('.admin-directory-toolbar').boundingBox()).height).toBeLessThan(250);
        await product.getByRole('button', { name: 'Hide', exact: true }).click();
        const hide = admin.getByRole('dialog', { name: 'Hide product?' });
        await hide.getByRole('button', { name: 'Cancel', exact: true }).click();
        await expect(product.getByRole('button', { name: 'Hide', exact: true })).toBeVisible();
        await product.getByRole('button', { name: 'Hide', exact: true }).click();
        await screenshots(admin, testInfo, `admin-hide-confirmation-${width}`);
        await hide.getByRole('button', { name: 'Hide product', exact: true }).click();
        await expect(hide).not.toBeVisible();
        await expect(admin.locator('.app-form-status--toast')).toContainText('Product hidden from the marketplace.');
        await screenshots(admin, testInfo, `admin-product-success-${width}`);
        await product.getByRole('button', { name: 'Restore', exact: true }).click();
        await expect(admin.locator('.app-form-status--toast')).toContainText('Product restored to the marketplace.');
        await expect(admin.getByRole('dialog')).not.toBeVisible();

        await admin.goto('/admin/dashboard?section=barangay-monitoring');
        const row = admin.locator('.barangay-monitoring__reports tbody tr').filter({ hasText: 'Other' }).first();
        await row.getByRole('button', { name: 'Delete report', exact: true }).click();
        const deletion = admin.getByRole('dialog', { name: 'Delete report?' });
        await deletion.getByRole('button', { name: 'Delete report', exact: true }).click();
        await expect(deletion).not.toBeVisible();
        await expect(admin.locator('.app-form-status--toast')).toContainText('Report deleted.');
        await screenshots(admin, testInfo, `admin-report-success-${width}`);
    }
    expect(errors).toEqual([]);
    await customerContext.close();
    await adminContext.close();
});

test('review rate and connection failures keep the input and show a retry message', async ({ page }) => {
    const productId = seedProduct();
    await page.setViewportSize({ width: 390, height: 1000 });
    await signIn(page, 'customer@agrifarm.test');
    await page.goto(`/?page=product&product=seller-${productId}`);
    const form = page.locator('.review-form-panel');
    const comment = 'Fresh produce with a careful review.';
    await form.getByRole('button', { name: 'Rate 5 stars', exact: true }).click();
    await form.getByLabel('Your review', { exact: true }).fill(comment);
    await page.route('**/product-reviews', route => route.fulfill({ status: 429, contentType: 'application/json', body: '{"message":"Too many attempts."}' }));
    await form.getByRole('button', { name: 'Post review', exact: true }).click();
    await expect(form.getByRole('alert')).toHaveText('Please wait a minute before trying again.');
    await expect(form.getByLabel('Your review', { exact: true })).toHaveValue(comment);
    await expect(page.getByRole('dialog')).not.toBeVisible();
    await expect(form.getByRole('button', { name: 'Post review', exact: true })).toBeEnabled();
    await page.unroute('**/product-reviews');
    await page.route('**/product-reviews', route => route.abort());
    await form.getByRole('button', { name: 'Post review', exact: true }).click();
    await expect(form.getByRole('alert')).toHaveText('The review could not be saved. Please try again.');
    await expect(form.getByLabel('Your review', { exact: true })).toHaveValue(comment);
    await expect(form.getByRole('button', { name: 'Post review', exact: true })).toBeEnabled();
    await page.unroute('**/product-reviews');
    await form.getByRole('button', { name: 'Post review', exact: true }).click();
    await expect(page.locator('.app-form-status--toast')).toContainText('Review posted.');
    await expect(form.getByRole('alert')).toHaveCount(0);
    await expect(page.locator('.review-item')).toContainText(comment);
});
