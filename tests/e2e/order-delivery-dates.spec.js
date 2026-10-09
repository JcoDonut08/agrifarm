import { expect, test } from '@playwright/test';
import { execFileSync } from 'node:child_process';
import fs from 'node:fs/promises';
import path from 'node:path';
import ExcelJS from 'exceljs';

test.use({ timezoneId: 'UTC' });
let dates;

test.beforeAll(() => {
    dates = JSON.parse(execFileSync('php', ['-r', String.raw`
        require 'vendor/autoload.php';
        $app = require 'bootstrap/app.php';
        $app->make(Illuminate\Contracts\Console\Kernel::class)->bootstrap();
        if (config('database.default') !== 'sqlite' || realpath(config('database.connections.sqlite.database')) !== realpath('database/playwright.sqlite')) throw new RuntimeException('Isolated database required');
        $template = App\Models\User::where('email', 'brgyrosario@gmail.com')->firstOrFail();
        $seller = new App\Models\User;
        $seller->forceFill(['name' => 'Delivery Test Seller', 'email' => 'delivery-seller@agrifarm.test',
            'password' => $template->password, 'role' => 'seller', 'barangay' => 'Maybunga',
            'account_status' => 'active', 'email_verified_at' => now()])->save();
        $month = Carbon\CarbonImmutable::now('Asia/Manila')->startOfMonth();
        $photo = 'e2e/delivery-dates/photo.jpg';
        Illuminate\Support\Facades\Storage::disk('local')->put($photo, file_get_contents('public/images/kuya-ani-avatar.jpg'));
        $product = new App\Models\Product(['name' => 'Delivery Pechay', 'category' => 'Vegetables', 'price' => 35,
            'unit' => 'kg', 'stock' => 10, 'threshold' => 2]);
        $product->forceFill(['user_id' => $seller->id, 'photo_path' => $photo])->save();
        foreach ([['Known buyer', 4, $month->addMinutes(30), 'delivered'], ['Undated buyer', 2, null, 'delivered'],
            ['Previous buyer', 1, $month->subMonth()->addDays(2), 'delivered'], ['Pending buyer', 1, null, 'pending']] as [$name, $quantity, $delivered, $status]) {
            $order = new App\Models\WalkInOrder(['customer_name' => $name, 'product_name' => $product->name,
                'unit' => 'kg', 'quantity' => $quantity, 'unit_price' => 35, 'total' => 35 * $quantity, 'status' => $status]);
            $order->forceFill(['user_id' => $seller->id, 'product_id' => $product->id, 'inventory_source' => 'stock',
                'created_at' => $month->subMonths(2)->addDays(14)->utc(), 'delivered_at' => $delivered?->utc()])->save();
        }
        echo json_encode(['from' => $month->toDateString(), 'to' => Carbon\CarbonImmutable::now('Asia/Manila')->toDateString(),
            'previous_from' => $month->subMonth()->toDateString(), 'previous_to' => $month->subDay()->toDateString(),
            'delivered' => $month->addMinutes(30)->utc()->toJSON()]);
    `], {
        env: { ...process.env, APP_ENV: 'local', DB_CONNECTION: 'sqlite', DB_DATABASE: path.resolve('database/playwright.sqlite') },
        encoding: 'utf8',
    }));
});

test.afterAll(async () => {
    await fs.rm('storage/app/private/e2e/delivery-dates/photo.jpg', { force: true });
});

async function signIn(page, admin, filipino, width) {
    await page.setViewportSize({ width, height: 1000 });
    await page.addInitScript(filipino => {
        localStorage.setItem('agrifarm-theme', 'light');
        localStorage.setItem('agrifarm-seller-language', filipino ? 'filipino' : 'english');
        localStorage.setItem('agrifarm-admin-preferences', JSON.stringify({ language: filipino ? 'filipino' : 'english' }));
    }, filipino);
    await page.goto('/login');
    await page.getByLabel('Email address').fill(admin ? 'pasigcenro@gmail.com' : 'delivery-seller@agrifarm.test');
    await page.getByLabel('Password', { exact: true }).fill('AgriFarm123!');
    await page.getByRole('button', { name: 'Login', exact: true }).click();
    await expect(page).toHaveURL(/\/(seller|admin)\/dashboard/, { timeout: 45_000 });
}

for (const [width, filipino] of [[390, false], [768, true], [1440, false]]) {
    test(`seller charts and downloads use delivery dates at ${width}px`, async ({ page }, testInfo) => {
        await signIn(page, false, filipino, width);
        const sales = page.locator('.seller-sales');
        await sales.getByRole('button', { name: filipino ? 'Buwan' : 'Month', exact: true }).click();
        await expect(sales.locator('.seller-sales-total')).toHaveText('₱140.00');
        await expect(sales).toContainText(filipino ? 'petsa ng paghatid' : 'delivery dates');

        await page.goto('/seller/dashboard?section=analytics');
        const metric = page.locator('.analytics-metric').first();
        await expect(metric.getByText('₱140.00', { exact: true })).toBeVisible();
        await page.getByRole('button', { name: filipino ? 'Lahat' : 'All time', exact: true }).click();
        await expect(metric.getByText('₱245.00', { exact: true })).toBeVisible();
        await expect(page.locator('.analytics-data-note')).toContainText(filipino ? 'walang petsa ng paghatid' : 'without a delivery date');
        await page.getByRole('button', { name: filipino ? 'Piliin' : 'Custom', exact: true }).click();
        await page.getByLabel(filipino ? 'Mula' : 'From', { exact: true }).fill(dates.previous_from);
        await page.getByLabel(filipino ? 'Hanggang' : 'To', { exact: true }).fill(dates.previous_to);
        await expect(metric.getByText('₱35.00', { exact: true })).toBeVisible();

        await page.goto('/seller/dashboard?section=reports');
        const card = page.locator('.report-option-card--sales');
        await card.getByRole('button', { name: filipino ? 'Gumawa ng preview' : 'Generate preview', exact: true }).click();
        const paper = page.locator('.report-paper');
        await expect(paper.locator('tbody tr')).toHaveCount(1);
        await expect(paper.getByRole('columnheader', { name: filipino ? 'Petsa ng paghatid' : 'Delivered on', exact: true })).toBeVisible();
        const deliveredLabel = new Intl.DateTimeFormat(filipino ? 'fil-PH' : 'en-PH', { dateStyle: 'medium', timeZone: 'Asia/Manila' }).format(new Date(dates.delivered));
        await expect(paper.locator('tbody')).toContainText(deliveredLabel);
        await expect(paper.locator('tbody')).toContainText('₱140.00');
        await expect(paper.locator('tbody')).not.toContainText('Undated buyer');
        await expect(paper.locator('footer')).toContainText(filipino ? 'walang petsa ng paghatid' : 'without a delivery date');
        expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBeTruthy();
        await page.screenshot({ path: testInfo.outputPath('seller-delivery-report-light.png'), fullPage: true });
        await page.evaluate(() => document.documentElement.classList.add('dark'));
        await page.screenshot({ path: testInfo.outputPath('seller-delivery-report-dark.png'), fullPage: true });
        await page.evaluate(() => document.documentElement.classList.remove('dark'));

        await card.getByText('CSV', { exact: true }).click();
        await expect(card.getByLabel('CSV', { exact: true })).toBeChecked();
        const csvPromise = page.waitForEvent('download');
        await page.getByRole('button', { name: filipino ? 'I-download ang CSV' : 'Download CSV', exact: true }).click();
        const csv = await fs.readFile(await (await csvPromise).path(), 'utf8');
        expect(csv).toContain(deliveredLabel);
        expect(csv).toContain('₱140.00');
        expect(csv).not.toContain('Undated buyer');
        expect(csv).not.toContain('Previous buyer');
        if (width === 1440) {
            await card.getByText('Excel', { exact: true }).click();
            await expect(card.getByLabel('Excel', { exact: true })).toBeChecked();
            const excelPromise = page.waitForEvent('download');
            await page.getByRole('button', { name: 'Download Excel', exact: true }).click();
            const workbook = new ExcelJS.Workbook();
            await workbook.xlsx.readFile(await (await excelPromise).path());
            const cells = JSON.stringify(workbook.worksheets[0].getSheetValues());
            expect(cells).toContain('Delivered on');
            expect(cells).toContain(deliveredLabel);
            expect(cells).toContain('₱140.00');
            expect(cells).not.toContain('Undated buyer');
        }
    });
}

for (const [width, filipino] of [[1440, false], [390, true]]) {
    test(`admin reports use delivery periods at ${width}px`, async ({ page }, testInfo) => {
        await signIn(page, true, filipino, width);
        const panel = page.locator('.admin-sales-panel');
        await expect(panel).toContainText(filipino ? 'buwan ng paghatid' : 'delivery month');
        await expect(panel).toContainText(filipino ? 'walang petsa ng paghatid' : 'without a delivery date');
        await page.goto('/admin/dashboard?section=reports');
        const card = page.locator('.report-option-card--barangay');
        await card.getByRole('button', { name: filipino ? 'Gumawa ng preview' : 'Generate preview', exact: true }).click();
        const paper = page.locator('.report-paper');
        const row = paper.locator('tbody tr').filter({ hasText: 'Maybunga' });
        await expect(row).toHaveCount(1);
        await expect(row).toContainText('₱140.00');
        await expect(paper.locator('footer')).toContainText(filipino ? 'petsa ng paghatid' : 'delivery dates');
        expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBeTruthy();
        await page.screenshot({ path: testInfo.outputPath('admin-delivery-report.png'), fullPage: true });
        await card.getByText('CSV', { exact: true }).click();
        await expect(card.getByLabel('CSV', { exact: true })).toBeChecked();
        const csvPromise = page.waitForEvent('download');
        await page.getByRole('button', { name: filipino ? 'I-download ang CSV' : 'Download CSV', exact: true }).click();
        expect(await fs.readFile(await (await csvPromise).path(), 'utf8')).toContain('₱140.00');
        await page.getByLabel(filipino ? 'Mula' : 'From', { exact: true }).fill(dates.previous_from);
        await page.getByLabel(filipino ? 'Hanggang' : 'To', { exact: true }).fill(dates.previous_to);
        await expect(row).toContainText('₱35.00');
        await expect(row).not.toContainText('₱140.00');
    });
}
