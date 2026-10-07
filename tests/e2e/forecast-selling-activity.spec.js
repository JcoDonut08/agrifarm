import { expect, test } from '@playwright/test';
import { execFileSync } from 'node:child_process';
import path from 'node:path';

function seedSellingActivity() {
    // Fixtures go only to the existing isolated Playwright database.
    execFileSync('php', ['-r', `
        require 'vendor/autoload.php';
        $app = require 'bootstrap/app.php';
        $app->make(Illuminate\\Contracts\\Console\\Kernel::class)->bootstrap();
        if (config('database.default') !== 'sqlite' || realpath(config('database.connections.sqlite.database')) !== realpath('database/playwright.sqlite')) {
            throw new RuntimeException('Expected the isolated browser-test database.');
        }
        $seller = App\\Models\\User::where('email', 'brgyrosario@gmail.com')->firstOrFail();
        foreach (range(1, 20) as $day) {
            $order = new App\\Models\\WalkInOrder(['customer_name' => 'Private test customer', 'product_name' => 'Kangkong', 'quantity' => 2, 'unit' => 'bunch', 'unit_price' => 30, 'total' => 60, 'status' => 'delivered']);
            $order->user_id = $seller->id;
            $order->created_at = Carbon\\CarbonImmutable::now()->subDays($day);
            $order->updated_at = $order->created_at;
            $order->save();
        }
        $product = new App\\Models\\Product(['name' => 'Kangkong', 'category' => 'Vegetables', 'price' => 30, 'unit' => 'bunch', 'stock' => 50, 'threshold' => 2, 'photo_path' => 'browser-test.png']);
        $product->user_id = $seller->id;
        $product->save();
    `], { cwd: process.cwd(), env: { ...process.env, APP_ENV: 'local', DB_CONNECTION: 'sqlite', DB_DATABASE: path.resolve('database/playwright.sqlite'), CACHE_STORE: 'file' } });
}

test('barangay selling activity ranks crops and stays readable in both languages', async ({ page }, testInfo) => {
    seedSellingActivity();
    const errors = [];
    page.on('pageerror', error => errors.push(error.message));
    await page.goto('/login');
    await page.getByLabel('Email address').fill('brgyrosario@gmail.com');
    await page.getByLabel('Password', { exact: true }).fill('AgriFarm123!');
    await page.getByRole('button', { name: 'Login', exact: true }).click();
    await expect(page).toHaveURL(/\/seller\/dashboard$/);
    await page.goto('/seller/dashboard?section=forecasting');
    await page.getByLabel('Harvest file', { exact: true }).setInputFiles({
        name: 'rosario-harvest.csv', mimeType: 'text/csv',
        buffer: Buffer.from('Month,Vegetable Crop,Harvest (kg),Barangay\n2026-01,Kangkong,20,Rosario\n2026-02,Kangkong,25,Rosario\n'),
    });
    await page.getByRole('button', { name: 'Generate', exact: true }).click();
    await expect(page.locator('.forecast-saved')).toContainText('rosario-harvest.csv', { timeout: 60_000 });
    const crop = page.locator('.forecast-rec-card').filter({ has: page.getByRole('heading', { name: 'Kangkong', exact: true }) });
    await expect(crop).toHaveCount(1);
    await expect(crop.locator('.forecast-selling-activity')).toHaveText('Recent sales: Regular');
    await crop.locator('summary').click();
    await expect(crop.locator('.forecast-selling-details')).toContainText('Completed orders: 20');
    await expect(crop.locator('.forecast-selling-details')).toContainText('Quantity sold: 40 bunch');
    await expect(crop.locator('.forecast-selling-details')).toContainText('Current stock: 50 bunch');
    await expect(crop.locator('.forecast-selling-details')).toContainText('Rosario');
    await expect(crop.locator('.forecast-selling-details')).not.toContainText('Private test customer');
    await crop.locator('summary').click();
    await crop.locator('.forecast-plan-button').click();
    await expect(page.locator('.forecast-plan-list')).toContainText('Kangkong');

    for (const language of ['english', 'filipino']) {
        await page.evaluate(language => localStorage.setItem('agrifarm-seller-language', language), language);
        await page.reload();
        await expect(crop.locator('.forecast-selling-activity')).toContainText(language === 'english' ? 'Recent sales' : 'Kamakailang benta');
        await expect(page.locator('.forecast-selling-activity')).toHaveCount(1);
        await expect(page.locator('.forecast-selling-details')).toHaveCount(1);
        for (const card of await page.locator('.forecast-rec-card').all()) {
            await card.locator('summary').click();
            await expect(card).not.toContainText(/Limited selling records|Completed orders: 0|Too few selling records|Past selling activity is a guide|Kulang pa ang tala ng benta/);
            await card.locator('summary').click();
        }
        for (const width of [390, 768, 1440]) {
            await page.setViewportSize({ width, height: 1000 });
            for (const theme of ['light', 'dark']) {
                await page.evaluate(theme => {
                    localStorage.setItem('agrifarm-theme', theme);
                    document.documentElement.classList.toggle('dark', theme === 'dark');
                }, theme);
                expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBeTruthy();
                await expect(page.locator('body')).not.toContainText(/[ÃÂâð�]/);
                if (width > 600) {
                    const tops = await page.locator('.forecast-rec-card').evaluateAll(cards => cards.map(card => card.querySelector('.forecast-plan-button').getBoundingClientRect().top));
                    expect(Math.max(...tops) - Math.min(...tops)).toBeLessThan(1);
                }
                await page.locator('.forecast-recommendations').screenshot({ path: testInfo.outputPath(`selling-${language}-${width}-${theme}.png`) });
                await crop.locator('summary').click();
                await expect(crop.locator('.forecast-selling-details')).toBeVisible();
                await crop.screenshot({ path: testInfo.outputPath(`selling-details-${language}-${width}-${theme}.png`) });
                await crop.locator('summary').click();
            }
        }
    }
    expect(errors).toEqual([]);
});
