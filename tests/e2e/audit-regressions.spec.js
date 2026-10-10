import { test, expect } from './fixtures';
import { execFileSync } from 'node:child_process';

let productId;
test.beforeEach(() => {
    productId = Number(execFileSync('php', ['-r', String.raw`
        require 'vendor/autoload.php';
        $app = require 'bootstrap/app.php';
        $app->make(Illuminate\Contracts\Console\Kernel::class)->bootstrap();
        if (config('database.default') !== 'sqlite' || realpath(config('database.connections.sqlite.database')) !== realpath('database/playwright.sqlite')) throw new RuntimeException('Isolated database required');
        $buyer = App\Models\User::where('email', 'customer@agrifarm.test')->firstOrFail();
        $seller = App\Models\User::where('email', 'brgyrosario@gmail.com')->firstOrFail();
        Illuminate\Support\Facades\Storage::disk('local')->put('e2e/audit-pechay.png', file_get_contents('public/images/market-pechay-feature.png'));
        $product = $seller->products()->create(['name' => 'Verified Audit Pechay', 'category' => 'Vegetables',
            'price' => 35, 'unit' => 'kg', 'stock' => 10, 'threshold' => 2, 'photo_path' => 'e2e/audit-pechay.png']);
        $checkout = App\Models\CustomerCheckout::create(['id' => (string) Illuminate\Support\Str::uuid(),
            'user_id' => $buyer->id, 'reference_number' => 'AUDIT-COMPLETED', 'recipient_name' => $buyer->name,
            'phone' => '09171234567', 'address' => '123 Test Street, Rosario', 'barangay' => 'Rosario', 'payment_method' => 'cod', 'goods_total' => 70]);
        foreach (['delivered', 'cancelled'] as $status) {
            $checkout->items()->save((new App\Models\WalkInOrder)->forceFill(['user_id' => $seller->id,
                'product_id' => $product->id, 'product_name' => $product->name, 'customer_name' => $buyer->name,
                'unit' => 'kg', 'quantity' => 1, 'unit_price' => 35, 'total' => 35, 'status' => $status,
                'delivered_at' => $status === 'delivered' ? now()->utc() : null, 'inventory_source' => 'stock']));
        }
        echo $product->id;
    `], { env: process.env, encoding: 'utf8' }));
});

async function login(page, email) {
    await page.goto('/login');
    await page.getByLabel('Email address').fill(email);
    await page.getByLabel('Password', { exact: true }).fill('AgriFarm123!');
    await page.getByRole('button', { name: 'Login', exact: true }).click();
    await expect(page).not.toHaveURL(/\/login$/);
}

for (const width of [390, 768, 1440]) {
    test(`${width}px: customer settings, order links, rate-limit feedback and admin report review`, async ({ page }, testInfo) => {
        await page.setViewportSize({ width, height: 1000 });
        await login(page, 'customer@agrifarm.test');
        await page.goto('/customer/settings');
        const emails = page.getByRole('switch', { name: 'Order update emails' });
        await expect(emails).toHaveAttribute('aria-checked', 'true');
        await emails.click();
        await expect(page.getByRole('status').filter({ hasText: 'Notification preference saved.' })).toBeVisible();
        await page.reload();
        await expect(emails).toHaveAttribute('aria-checked', 'false');
        expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBeTruthy();
        await page.screenshot({ path: testInfo.outputPath(`customer-settings-${width}.png`), fullPage: true });

        await page.goto('/customer/orders');
        await page.getByRole('button', { name: /^Delivered/ }).click();
        const productLink = page.getByRole('link', { name: 'Verified Audit Pechay', exact: true }).first();
        await expect(productLink).toHaveAttribute('href', `/?page=product&product=seller-${productId}`);
        await productLink.click();
        await expect(page.getByRole('heading', { name: 'Verified Audit Pechay', exact: true })).toBeVisible();
        await page.getByRole('button', { name: 'Report this product or seller', exact: true }).click();
        const report = page.getByRole('dialog', { name: 'Report an issue' });
        await report.getByLabel('Reason for reporting').selectOption('Product quality issue');
        await report.locator('#report-description').fill('The delivered leaves were damaged.');
        await report.getByRole('button', { name: 'Submit report' }).click();
        await expect(report).not.toBeVisible();

        await page.goto('/customer');
        const lookups = await page.evaluate(async () => {
            const statuses = [];
            for (let i = 0; i < 6; i++) statuses.push((await fetch('/api/chatbot/latest-order', { headers: { Accept: 'application/json' } })).status);
            return statuses;
        });
        expect(lookups).toEqual([200, 200, 200, 200, 200, 200]);
        await page.getByLabel('Full name', { exact: true }).fill('Audit Buyer Updated');
        await page.getByRole('button', { name: 'Save details', exact: true }).click();
        await expect(page.getByRole('status').filter({ hasText: 'Profile saved.' })).toBeVisible();
        for (let i = 0; i < 5; i++) {
            await page.getByLabel('Full name', { exact: true }).fill(`Audit Buyer ${i}`);
            await page.getByRole('button', { name: 'Save details', exact: true }).click();
            await expect(page.getByRole('button', { name: 'Save details', exact: true })).toBeEnabled();
        }
        await page.getByLabel('Full name', { exact: true }).fill('Retained unsaved name');
        await page.getByRole('button', { name: 'Save details', exact: true }).click();
        await expect(page.getByRole('alert')).toContainText(/Please wait \d+ seconds/);
        await expect(page.getByLabel('Full name', { exact: true })).toHaveValue('Retained unsaved name');
        await expect(page.locator('iframe')).toHaveCount(0);
        await page.screenshot({ path: testInfo.outputPath(`customer-rate-limit-${width}.png`), fullPage: true });

        await page.getByRole('button', { name: /Open account menu/ }).click();
        await page.getByRole('button', { name: 'Sign out', exact: true }).click();
        await login(page, 'pasigcenro@gmail.com');
        await page.goto('/admin/dashboard?section=orders');
        await expect(page.locator('.admin-status').filter({ hasText: 'Completed (partly cancelled)' })).toBeVisible();
        await page.goto('/admin/dashboard?section=products');
        await page.getByRole('button', { name: 'Review reports (1)' }).click();
        const review = page.getByRole('dialog', { name: 'Dismiss reports?' });
        await expect(review).toContainText('The delivered leaves were damaged.');
        expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBeTruthy();
        await page.screenshot({ path: testInfo.outputPath(`admin-report-review-${width}.png`), fullPage: true });
        await review.getByRole('button', { name: 'Dismiss reports', exact: true }).click();
        await expect(review).not.toBeVisible();
        await expect(page.getByRole('button', { name: 'Review reports (1)' })).toHaveCount(0);
    });
}
