import { expect, test } from '@playwright/test';
import { execFileSync } from 'node:child_process';
import fs from 'node:fs/promises';
import path from 'node:path';

test.beforeAll(() => {
    execFileSync('php', ['-r', `
        require 'vendor/autoload.php';
        $app = require 'bootstrap/app.php';
        $app->make(Illuminate\\Contracts\\Console\\Kernel::class)->bootstrap();
        if (config('database.default') !== 'sqlite' || realpath(config('database.connections.sqlite.database')) !== realpath('database/playwright.sqlite')) throw new RuntimeException('Isolated database required');
        Illuminate\\Support\\Facades\\Storage::disk('local')->put('e2e/pagination/pechay.png', file_get_contents('public/images/market-pechay-feature.png'));
        if (App\\Models\\User::where('email', 'pagination1@agrifarm.test')->exists()) return;
        $seller = App\\Models\\User::where('email', 'brgyrosario@gmail.com')->firstOrFail();
        $customer = App\\Models\\User::where('email', 'customer@agrifarm.test')->firstOrFail();
        $admin = App\\Models\\User::where('email', 'pasigcenro@gmail.com')->firstOrFail();
        for ($i = 1; $i <= 23; $i++) {
            $name = 'Pagination Pechay '.str_pad($i, 2, '0', STR_PAD_LEFT);
            $product = new App\\Models\\Product;
            $product->forceFill(['user_id' => $seller->id, 'name' => $name, 'category' => 'Vegetables', 'price' => 35, 'unit' => 'kg', 'stock' => 20, 'expected_yield' => 0, 'threshold' => 5, 'status' => 'active', 'photo_path' => 'e2e/pagination/pechay.png'])->save();
            $record = new App\\Models\\HarvestRecord;
            $record->forceFill(['user_id' => $seller->id, 'product_id' => $product->id, 'product_name' => $name, 'quantity' => 5, 'measured_weight_kg' => 5, 'unit' => 'kg', 'harvest_date' => now()->toDateString()])->save();
            // Match PostgreSQL's DATE column instead of SQLite's model-cast timestamp.
            Illuminate\\Support\\Facades\\DB::table('harvest_records')->where('id', $record->id)->update(['harvest_date' => now()->toDateString()]);
            $checkout = App\\Models\\CustomerCheckout::create(['id' => (string) Illuminate\\Support\\Str::uuid(), 'user_id' => $customer->id, 'recipient_name' => 'Pagination Customer '.$i, 'phone' => '09171234567', 'address' => 'Test farm, Pasig City', 'barangay' => 'Rosario', 'payment_method' => 'cod', 'goods_total' => 70, 'reference_number' => 'PAGINATION-'.$i]);
            $order = new App\\Models\\WalkInOrder;
            $order->forceFill(['user_id' => $seller->id, 'product_id' => $product->id, 'customer_checkout_id' => $checkout->id, 'customer_name' => 'Pagination Customer '.$i, 'product_name' => $name, 'unit' => 'kg', 'quantity' => 2, 'unit_price' => 35, 'total' => 70, 'status' => 'delivered', 'delivered_at' => now()->utc(), 'inventory_source' => 'stock'])->save();
            $farmer = new App\\Models\\User;
            $farmer->forceFill(['name' => 'Pagination Farm '.$i, 'email' => 'pagination'.$i.'@agrifarm.test', 'password' => $seller->password, 'role' => 'seller', 'barangay' => 'Rosario', 'account_status' => 'active', 'email_verified_at' => now()])->save();
            App\\Models\\AuditLog::record($admin, 'Created seller account', 'Created pagination test seller '.$i, $farmer, 'create');
        }
    `], {
        env: { ...process.env, APP_ENV: 'local', DB_CONNECTION: 'sqlite', DB_DATABASE: path.resolve('database/playwright.sqlite'), SCOUT_DRIVER: 'null' },
        stdio: 'pipe',
    });
});

test.afterAll(async () => {
    await fs.rm('storage/app/private/e2e/pagination/pechay.png', { force: true });
});

async function signIn(page, email, width, language = 'english') {
    await page.setViewportSize({ width, height: 1000 });
    await page.addInitScript(language => {
        localStorage.setItem('agrifarm-theme', 'light');
        localStorage.setItem('agrifarm-seller-language', language);
        localStorage.setItem('agrifarm-admin-language', 'english');
    }, language);
    await page.goto('/login');
    await page.getByLabel('Email address').fill(email);
    await page.getByLabel('Password', { exact: true }).fill('AgriFarm123!');
    await page.getByRole('button', { name: 'Login', exact: true }).click();
    await expect(page).toHaveURL(/\/(seller|admin)\/dashboard$/, { timeout: 45000 });
}

async function navigate(page, role, name, width) {
    if (width <= 800) await page.getByRole('button', { name: role === 'seller' ? 'Toggle seller navigation' : 'Open admin navigation' }).click();
    await page.getByRole('navigation', { name: role === 'seller' ? 'Seller navigation' : 'CENRO administration' }).getByRole('button', { name, exact: true }).click();
    await expect(page.getByRole('heading', { name: name === 'Reports' ? 'Generate reports' : name, exact: true }).first()).toBeVisible();
}

async function exercisePagination(page, rows, nav) {
    const size = nav.getByLabel('Rows per page', { exact: true });
    await expect(size).toHaveValue('5');
    await expect(rows).toHaveCount(5);
    const first = await rows.first().textContent();
    await nav.getByRole('button', { name: 'Next page', exact: true }).click();
    await expect(rows).toHaveCount(5);
    expect(await rows.first().textContent()).not.toBe(first);
    await expect(nav).toContainText('Page 2');
    for (const count of [10, 20, 5]) {
        await size.selectOption(String(count));
        await expect(rows).toHaveCount(count);
        await expect(nav).toContainText('Page 1');
        await expect(rows.first()).toHaveText(first);
        await expect(nav.getByRole('button', { name: 'Previous page', exact: true })).toBeDisabled();
    }
    // Last page contains the remainder, and its Next control is disabled.
    while (await nav.getByRole('button', { name: 'Next page', exact: true }).isEnabled()) {
        await nav.getByRole('button', { name: 'Next page', exact: true }).click();
    }
    expect(await rows.count()).toBeGreaterThan(0);
    expect(await rows.count()).toBeLessThanOrEqual(5);
    await expect(nav.getByRole('button', { name: 'Next page', exact: true })).toBeDisabled();
    await size.selectOption('10');
    await expect(nav).toContainText('Page 1');
    await expect(rows).toHaveCount(10);
    await size.selectOption('5');
}

async function inspectThemes(page, nav, name, width, testInfo) {
    await nav.scrollIntoViewIfNeeded();
    for (const theme of ['light', 'dark']) {
        await page.evaluate(theme => document.documentElement.classList.toggle('dark', theme === 'dark'), theme);
        expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBeTruthy();
        for (const element of [nav.getByLabel('Rows per page', { exact: true }), nav.getByRole('button', { name: 'Next page', exact: true })]) {
            const box = await element.boundingBox();
            expect(box.height).toBeGreaterThanOrEqual(44);
            expect(box.x).toBeGreaterThanOrEqual(0);
            expect(box.x + box.width).toBeLessThanOrEqual(width);
        }
        await page.screenshot({ path: testInfo.outputPath(`${name}-${width}-${theme}.png`), fullPage: true, animations: 'disabled' });
        await nav.screenshot({ path: testInfo.outputPath(`${name}-controls-${width}-${theme}.png`), animations: 'disabled' });
    }
    await page.evaluate(() => document.documentElement.classList.remove('dark'));
}

for (const width of [390, 768, 1440]) {
    test(`${width}px: seller tables use consistent page sizes and preserve filters`, async ({ page }, testInfo) => {
        test.setTimeout(300000);
        const errors = [];
        page.on('pageerror', error => errors.push(error.message));
        await signIn(page, 'brgyrosario@gmail.com', width);
        const recentNav = page.getByRole('navigation', { name: 'Recent orders pagination' });
        await exercisePagination(page, page.locator('.seller-recent-order-row'), recentNav);
        await inspectThemes(page, recentNav, 'seller-recent-orders', width, testInfo);
        await navigate(page, 'seller', 'Orders', width);
        const orderNav = page.getByRole('navigation', { name: 'Orders pagination' });
        await exercisePagination(page, page.locator('.orders-table tbody tr'), orderNav);
        await inspectThemes(page, orderNav, 'seller-orders', width, testInfo);
        await navigate(page, 'seller', 'Products', width);
        await exercisePagination(page, page.locator('.seller-product-card'), page.locator('.product-pagination'));
        await navigate(page, 'seller', 'Harvest Records', width);
        const history = page.getByRole('navigation', { name: 'Harvest history pagination' });
        const historyRows = page.locator('.harvest-history-panel tbody tr');
        await exercisePagination(page, historyRows, history);
        await exercisePagination(page, page.locator('.harvest-summary-panel tbody tr'), page.getByRole('navigation', { name: 'Harvest summary pagination' }));
        await inspectThemes(page, history, 'harvest-records', width, testInfo);
        await history.getByRole('button', { name: 'Next page', exact: true }).click();
        await page.getByLabel('Search', { exact: true }).fill('Pagination Pechay 23');
        await expect(historyRows).toHaveCount(1);
        await expect(history).toContainText('Page 1 of 1');
        await expect(historyRows).toContainText('Pagination Pechay 23');
        await page.getByLabel('Search', { exact: true }).fill('no matching crop');
        await expect(history).toHaveCount(0);
        await expect(page.getByText('No matching records', { exact: true })).toBeVisible();
        await page.getByRole('button', { name: 'Clear filters', exact: true }).click();
        await expect(historyRows).toHaveCount(5);
        await navigate(page, 'seller', 'Analytics', width);
        const performanceNav = page.getByRole('navigation', { name: 'Product performance pagination' });
        await exercisePagination(page, page.locator('.analytics-products tbody tr'), performanceNav);
        const beforeScroll = await performanceNav.boundingBox();
        await page.locator('.analytics-products .seller-table-wrap').evaluate(element => { element.scrollLeft = element.scrollWidth; });
        const afterScroll = await performanceNav.boundingBox();
        expect(afterScroll.x).toBe(beforeScroll.x);
        await inspectThemes(page, performanceNav, 'seller-analytics', width, testInfo);
        await navigate(page, 'seller', 'Reports', width);
        await page.locator('.report-option-card--products').getByRole('button', { name: 'Generate preview', exact: true }).click();
        await exercisePagination(page, page.locator('.report-table-wrap tbody tr'), page.locator('.report-pagination'));
        expect(errors).toEqual([]);
    });

    test(`${width}px: admin tables and report previews paginate without truncating downloads`, async ({ page }, testInfo) => {
        test.setTimeout(300000);
        const errors = [];
        page.on('pageerror', error => errors.push(error.message));
        await signIn(page, 'pasigcenro@gmail.com', width);
        await exercisePagination(page, page.locator('.admin-performance-item'), page.getByRole('navigation', { name: 'Barangay performance pagination' }));
        for (const [name, label] of [['Products', 'Products table pagination'], ['Orders', 'Orders table pagination'], ['Farmers & Sellers', 'Sellers table pagination'], ['Audit Logs', 'Audit logs pagination']]) {
            await navigate(page, 'admin', name, width);
            const nav = page.getByRole('navigation', { name: label });
            await exercisePagination(page, page.locator('.admin-seller-row'), nav);
            if (name === 'Products') {
                await inspectThemes(page, nav, 'admin-products', width, testInfo);
                await nav.getByRole('button', { name: 'Next page', exact: true }).click();
                await page.getByPlaceholder('Search name or seller...').fill('Pagination Pechay 23');
                await expect(page.locator('.admin-seller-row')).toHaveCount(1);
                await expect(nav).toContainText('Page 1 of 1');
            }
        }
        await navigate(page, 'admin', 'Barangay Monitoring', width);
        await page.locator('.barangay-monitoring__filter select').selectOption('Rosario');
        await exercisePagination(page, page.locator('.barangay-monitoring__table tbody tr').first().locator('..').locator('tr'), page.getByRole('navigation', { name: 'Product monitoring pagination' }));
        await navigate(page, 'admin', 'Reports', width);
        await page.locator('.report-option-card--harvest').getByRole('button', { name: 'Generate preview', exact: true }).click();
        const reportNav = page.getByRole('navigation', { name: 'Report preview pagination' });
        await exercisePagination(page, page.locator('.report-paper').last().locator('tbody tr'), reportNav);
        await inspectThemes(page, reportNav, 'admin-report', width, testInfo);
        await page.getByLabel('Barangay', { exact: true }).selectOption('Rosario');
        await page.locator('.harvest-export-controls button[type="submit"]').click();
        const monthly = page.locator('.harvest-monthly-report');
        await exercisePagination(page, monthly.locator('tbody tr'), monthly.locator('.report-pagination'));
        if (width === 1440) {
            await page.locator('.harvest-export-formats').getByText('CSV', { exact: true }).click();
            await expect(page.locator('.harvest-export-formats').getByLabel('CSV', { exact: true })).toBeChecked();
            const downloadPromise = page.waitForEvent('download', { timeout: 15000 });
            await monthly.getByRole('button', { name: 'Download forecasting CSV', exact: true }).click();
            const download = await downloadPromise;
            const csv = await fs.readFile(await download.path(), 'utf8');
            expect(csv.trim().split(/\r?\n/)).toHaveLength(24);
            expect(csv).toContain('Pagination Pechay 23');
            expect(csv).toContain('Pagination Pechay 01');
            await expect(monthly.locator('tbody tr')).toHaveCount(5);
            await page.locator('.harvest-export-formats').getByText('Excel', { exact: true }).click();
            const excelDownloadPromise = page.waitForEvent('download', { timeout: 30000 });
            await monthly.getByRole('button', { name: 'Download Excel', exact: true }).click();
            const excelDownload = await excelDownloadPromise;
            const { default: ExcelJS } = await import('exceljs');
            const workbook = new ExcelJS.Workbook();
            await workbook.xlsx.readFile(await excelDownload.path());
            expect(workbook.worksheets[0].rowCount).toBe(24);
            expect(workbook.worksheets[0].getRow(1).values.slice(1)).toEqual(['Month', 'Vegetable Crop', 'Harvest (kg)', 'Barangay']);
            await expect(monthly.locator('tbody tr')).toHaveCount(5);
        }
        expect(errors).toEqual([]);
    });
}

test('390px: Filipino pagination stays readable and works with the keyboard', async ({ page }, testInfo) => {
    await signIn(page, 'brgyrosario@gmail.com', 390, 'filipino');
    const recentNav = page.getByRole('navigation', { name: 'Mga pahina ng kamakailang order' });
    await recentNav.getByLabel('Mga hanay bawat pahina', { exact: true }).selectOption('10');
    await expect(page.locator('.seller-recent-order-row')).toHaveCount(10);
    await recentNav.screenshot({ path: testInfo.outputPath('filipino-recent-orders-pagination.png') });
    await page.goto('/seller/dashboard?section=orders');
    const nav = page.getByRole('navigation', { name: 'Paglipat ng pahina ng mga order' });
    const size = nav.getByLabel('Mga hanay bawat pahina', { exact: true });
    await expect(size).toHaveValue('5');
    await size.focus();
    await page.keyboard.press('Tab');
    await expect(nav.getByRole('button', { name: 'Susunod na pahina', exact: true })).toBeFocused();
    await page.keyboard.press('Enter');
    await expect(nav).toContainText('Pahina 2 sa 5');
    await size.selectOption('20');
    await expect(page.locator('.orders-table tbody tr')).toHaveCount(20);
    await size.selectOption('5');
    for (const theme of ['light', 'dark']) {
        await page.evaluate(theme => document.documentElement.classList.toggle('dark', theme === 'dark'), theme);
        const bounds = await nav.boundingBox();
        for (const button of await nav.getByRole('button').all()) {
            const box = await button.boundingBox();
            expect(box.x + box.width).toBeLessThanOrEqual(bounds.x + bounds.width);
            expect(box.height).toBeGreaterThanOrEqual(44);
        }
        expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBeTruthy();
        await nav.screenshot({ path: testInfo.outputPath(`filipino-pagination-${theme}.png`) });
    }
});
