import { expect, test } from '@playwright/test';
import { execFileSync } from 'node:child_process';
import path from 'node:path';

function seedLegacyOrders() {
    execFileSync('php', ['-r', `
        require 'vendor/autoload.php';
        $app = require 'bootstrap/app.php';
        $app->make(Illuminate\\Contracts\\Console\\Kernel::class)->bootstrap();
        if (config('database.default') !== 'sqlite' || realpath(config('database.connections.sqlite.database')) !== realpath('database/playwright.sqlite')) {
            throw new RuntimeException('Expected the isolated browser-test database.');
        }
        $seller = App\\Models\\User::where('email', 'brgyrosario@gmail.com')->firstOrFail();
        foreach ([390, 768, 1440] as $width) {
            $product = new App\\Models\\Product(['name' => 'Legacy Pechay '.$width, 'category' => 'Vegetables', 'price' => 30,
                'unit' => 'bunch', 'stock' => 4, 'expected_yield' => 7, 'threshold' => 2, 'photo_path' => 'browser-test.png']);
            $product->user_id = $seller->id;
            $product->save();
            $order = new App\\Models\\WalkInOrder(['customer_name' => 'Legacy test customer', 'product_name' => $product->name,
                'quantity' => 3, 'unit' => 'bunch', 'unit_price' => 30, 'total' => 90, 'status' => 'preparing']);
            $order->user_id = $seller->id;
            $order->product_id = $product->id;
            $order->save();
        }
    `], { cwd: process.cwd(), env: { ...process.env, APP_ENV: 'local', DB_CONNECTION: 'sqlite', DB_DATABASE: path.resolve('database/playwright.sqlite'), CACHE_STORE: 'file' } });
}

test('older orders can be cancelled after confirming stock or future harvest', async ({ page }, testInfo) => {
    seedLegacyOrders();
    await page.goto('/login');
    await page.getByLabel('Email address').fill('brgyrosario@gmail.com');
    await page.getByLabel('Password', { exact: true }).fill('AgriFarm123!');
    await page.getByRole('button', { name: 'Login', exact: true }).click();
    await expect(page).toHaveURL(/\/seller\/dashboard/);

    for (const width of [390, 768, 1440]) {
        await page.setViewportSize({ width, height: 1000 });
        await page.goto('/seller/dashboard?section=orders');
        const row = page.locator('.order-row').filter({ hasText: `Legacy Pechay ${width}` });
        await row.getByRole('button', { name: 'Cancel order', exact: true }).click();
        const dialog = page.getByRole('dialog', { name: 'Cancel order?' });
        await dialog.getByLabel('Reason', { exact: true }).selectOption('out_of_stock');
        await dialog.getByLabel('Additional details (optional)').fill('The crop is no longer available.');
        await dialog.getByRole('button', { name: 'Cancel order', exact: true }).click();
        await expect(dialog.getByText('Choose where this order originally reserved its quantity.')).toBeVisible();
        const source = width === 768 ? 'expected_yield' : 'stock';
        await dialog.getByLabel('Return reserved quantity to').selectOption(source);
        expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBeTruthy();
        const bounds = await dialog.boundingBox();
        expect(bounds.y).toBeGreaterThanOrEqual(0);
        expect(bounds.y + bounds.height).toBeLessThanOrEqual(1000);
        await page.screenshot({ path: testInfo.outputPath(`legacy-cancellation-${width}.png`), fullPage: true });
        await page.evaluate(() => document.documentElement.classList.add('dark'));
        await page.screenshot({ path: testInfo.outputPath(`legacy-cancellation-${width}-dark.png`), fullPage: true, animations: 'disabled' });
        await page.evaluate(() => document.documentElement.classList.remove('dark'));
        await dialog.getByRole('button', { name: 'Cancel order', exact: true }).click();
        await expect(dialog).not.toBeVisible();
        await expect(row.locator('.order-status-icon')).toHaveAttribute('aria-label', 'Cancelled');

        await page.goto('/seller/dashboard?section=products');
        await page.getByRole('button', { name: `Edit Legacy Pechay ${width}`, exact: true }).click();
        const editDialog = page.getByRole('dialog', { name: 'Edit product' });
        await expect(editDialog.getByLabel('Available stock')).toHaveValue(source === 'stock' ? '7' : '4');
        await expect(editDialog.getByLabel('Expected yield quantity')).toHaveValue(source === 'expected_yield' ? '10' : '7');
        await editDialog.getByRole('button', { name: 'Close edit product', exact: true }).click();
    }
});
