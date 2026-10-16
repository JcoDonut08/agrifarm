import { expect, test } from './fixtures';
import { execFileSync } from 'node:child_process';
import fs from 'node:fs/promises';

test.beforeEach(() => {
    execFileSync('php', ['-r', String.raw`
        require 'vendor/autoload.php';
        $app = require 'bootstrap/app.php';
        $app->make(Illuminate\Contracts\Console\Kernel::class)->bootstrap();
        if (config('database.default') !== 'sqlite' || realpath(config('database.connections.sqlite.database')) !== realpath('database/playwright.sqlite')) throw new RuntimeException('Isolated database required');
        $seller = App\Models\User::where('email', 'brgyrosario@gmail.com')->firstOrFail();
        Illuminate\Support\Facades\Storage::disk('local')->put('e2e/admin-best-product.png', file_get_contents('public/images/market-pechay-feature.png'));
        $product = new App\Models\Product(['name' => 'Fresh Rosario Pechay', 'category' => 'Vegetables', 'price' => 25, 'unit' => 'bundle', 'stock' => 20, 'threshold' => 3, 'photo_path' => 'e2e/admin-best-product.png']);
        $product->user_id = $seller->id;
        $product->save();
        foreach (range(1, 2) as $index) {
            $order = new App\Models\WalkInOrder(['customer_name' => 'Test customer', 'product_name' => $product->name, 'unit' => 'bundle', 'quantity' => 1, 'unit_price' => 25, 'total' => 25, 'status' => 'delivered']);
            $order->user_id = $seller->id;
            $order->product_id = $product->id;
            $order->delivered_at = now();
            $order->save();
        }
    `], { env: process.env, stdio: 'pipe' });
});

test.afterAll(async () => {
    await fs.rm('storage/app/private/e2e/admin-best-product.png', { force: true });
});

for (const width of [390, 550, 768, 1200, 1440]) {
    test(`${width}px: barangay best product displays its photo and handles missing images`, async ({ page }, testInfo) => {
        await page.setViewportSize({ width, height: 1000 });
        await page.addInitScript(() => localStorage.setItem('agrifarm-theme', 'light'));
        const errors = [];
        page.on('pageerror', error => errors.push(error.message));
        await page.goto('/login');
        await page.getByLabel('Email address').fill('pasigcenro@gmail.com');
        await page.getByLabel('Password', { exact: true }).fill('AgriFarm123!');
        await page.getByRole('button', { name: 'Login', exact: true }).click();
        await expect(page).toHaveURL(/\/admin\/dashboard$/);

        const row = page.locator('.admin-performance-item').filter({ hasText: 'Fresh Rosario Pechay' });
        await row.scrollIntoViewIfNeeded();
        await expect(row.locator('.admin-performance-product strong')).toHaveText('Fresh Rosario Pechay');
        const image = row.locator('.admin-performance-product img');
        await expect.poll(() => image.evaluate(img => img.complete && img.naturalWidth > 0)).toBe(true);
        await expect(page.locator('.admin-performance-product-empty').first()).toHaveText('No completed sales yet');
        if (width > 500) {
            await expect(page.locator('.admin-performance-header > span')).toHaveText(['Barangay', 'Best product', 'Total sales', 'Orders']);
        }
        const pagination = page.getByRole('navigation', { name: 'Barangay performance pagination' });
        await pagination.getByLabel('Rows per page', { exact: true }).selectOption('10');
        await expect(row).toBeVisible();
        await expect(pagination.getByRole('button', { name: 'Next page', exact: true })).toBeDisabled();

        for (const theme of ['light', 'dark']) {
            await page.evaluate(theme => document.documentElement.classList.toggle('dark', theme === 'dark'), theme);
            expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth + 1)).toBe(true);
            const rowBox = await row.boundingBox();
            for (const cell of await row.locator(':scope > div').all()) {
                const box = await cell.boundingBox();
                expect(box.x).toBeGreaterThanOrEqual(rowBox.x);
                expect(box.x + box.width).toBeLessThanOrEqual(rowBox.x + rowBox.width + 1);
            }
            await page.screenshot({ path: testInfo.outputPath(`${width}-${theme}.png`), fullPage: true });
        }

        await page.route('**/marketplace/products/*/photo?*', route => route.abort());
        await page.reload();
        await row.scrollIntoViewIfNeeded();
        await expect(row.locator('.admin-performance-product-image svg')).toBeVisible();
        await expect(row.locator('.admin-performance-product strong')).toHaveText('Fresh Rosario Pechay');
        expect(errors).toEqual([]);
    });
}
