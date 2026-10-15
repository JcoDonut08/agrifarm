import { expect, test } from './fixtures';
import { execFileSync } from 'node:child_process';

function createListings() {
    execFileSync('php', ['-r', String.raw`
        require 'vendor/autoload.php';
        $app = require 'bootstrap/app.php';
        $app->make(Illuminate\Contracts\Console\Kernel::class)->bootstrap();
        if (config('database.default') !== 'sqlite' || realpath(config('database.connections.sqlite.database')) !== realpath('database/playwright.sqlite')) throw new RuntimeException('Isolated database required');
        $seller = App\Models\User::where('email', 'seller@agrifarm.test')->firstOrFail();
        Illuminate\Support\Facades\Storage::disk('local')->put('e2e/pagination.png', file_get_contents('public/images/market-pechay-feature.png'));
        for ($i = 1; $i <= 33; $i++) {
            $product = new App\Models\Product(['name' => 'Pagination Harvest '.str_pad($i, 2, '0', STR_PAD_LEFT), 'category' => $i <= 17 ? 'Herbs' : 'Vegetables', 'price' => 25, 'unit' => 'bunch', 'stock' => 10, 'threshold' => 1, 'photo_path' => 'e2e/pagination.png']);
            $product->user_id = $seller->id;
            $product->save();
        }
    `], { env: process.env, stdio: 'pipe' });
}

const savedState = page => page.evaluate(() => JSON.parse(localStorage.getItem('agrifarm-marketplace-preview-v1')));
const names = (start, end) => Array.from({ length: end - start + 1 }, (_, i) => `Pagination Harvest ${String(start + i).padStart(2, '0')}`);

for (const width of [390, 768, 1440]) {
    test(`${width}px: marketplace pages, filters and saved items survive navigation`, async ({ page }, testInfo) => {
        createListings();
        const errors = [];
        page.on('pageerror', error => errors.push(error.message));
        await page.setViewportSize({ width, height: 1000 });
        if (width === 1440) {
            await page.goto('/login');
            await page.getByLabel('Email address').fill('customer@agrifarm.test');
            await page.getByLabel('Password', { exact: true }).fill('AgriFarm123!');
            await page.getByRole('button', { name: 'Login', exact: true }).click();
            await expect(page).toHaveURL('/');
        }
        await page.goto('/?page=marketplace&sort=name');
        const cards = page.locator('.market-product-grid .produce-card');
        const headings = cards.getByRole('heading');
        const pager = page.getByRole('navigation', { name: 'Product pages' });
        await expect(headings).toHaveText(names(1, 16));
        await expect(pager).toContainText('Showing 1–16 of 33 products');
        await expect(pager.getByRole('button', { name: 'Previous', exact: true })).toBeDisabled();
        const geometry = await cards.evaluateAll(elements => elements.map(el => ({ x: Math.round(el.getBoundingClientRect().left), y: Math.round(el.getBoundingClientRect().top) })));
        expect(new Set(geometry.map(rect => rect.x)).size).toBe(width === 1440 ? 4 : 2);
        if (width === 1440) expect(new Set(geometry.map(rect => rect.y)).size).toBe(4);
        await cards.first().getByRole('button', { name: 'Add Pagination Harvest 01 to cart', exact: true }).click();
        await cards.first().getByRole('button', { name: 'Save Pagination Harvest 01 to favorites', exact: true }).click();
        const before = await savedState(page);
        await expect.poll(() => cards.first().locator('img').evaluate(image => image.complete && image.naturalWidth > 0)).toBeTruthy();
        await page.screenshot({ path: testInfo.outputPath('marketplace-first-page.png') });
        await pager.scrollIntoViewIfNeeded();
        await expect.poll(() => cards.last().locator('img').evaluate(image => image.complete && image.naturalWidth > 0)).toBeTruthy();
        await page.screenshot({ path: testInfo.outputPath('marketplace-pagination.png') });
        await pager.getByRole('button', { name: 'Next', exact: true }).click();
        await expect(headings).toHaveText(names(17, 32));
        await expect(pager).toContainText('Showing 17–32 of 33 products');
        await expect(page).toHaveURL(/market_page=2/);
        await expect.poll(() => page.evaluate(() => scrollY)).toBe(0);
        await expect.poll(() => savedState(page)).toEqual(before);
        await page.reload();
        await expect(headings).toHaveText(names(17, 32));
        await expect.poll(() => savedState(page)).toEqual(before);
        await pager.getByRole('button', { name: 'Next', exact: true }).click();
        await expect(headings).toHaveText(names(33, 33));
        await expect(pager).toContainText('Showing 33–33 of 33 products');
        await expect(pager.getByRole('button', { name: 'Next', exact: true })).toBeDisabled();
        await page.goBack();
        await expect(headings).toHaveText(names(17, 32));
        await pager.getByRole('button', { name: 'Previous', exact: true }).click();
        await expect(headings).toHaveText(names(1, 16));
        await expect(cards.first().getByRole('button', { name: 'Remove Pagination Harvest 01 from favorites', exact: true })).toHaveAttribute('aria-pressed', 'true');

        await pager.getByRole('button', { name: 'Next', exact: true }).click();
        await expect(headings).toHaveText(names(17, 32));
        await page.getByRole('button', { name: 'Herbs', exact: true }).click();
        await expect(headings).toHaveText(names(1, 16));
        expect(new URL(page.url()).searchParams.has('market_page')).toBe(false);
        await page.getByLabel('Price', { exact: true }).selectOption('under50');
        await expect(page).toHaveURL(/price=under50/);
        await page.getByLabel('Barangay', { exact: true }).selectOption('Rosario');
        await expect(page).toHaveURL(/barangay=Rosario/);
        await page.getByLabel('Search fresh produce', { exact: true }).fill('Pagination');
        await expect(page).toHaveURL(/q=Pagination/);
        await pager.getByRole('button', { name: 'Next', exact: true }).click();
        await expect(headings).toHaveText(names(17, 17));
        await expect(pager).toContainText('Showing 17–17 of 17 products');
        const query = new URL(page.url()).searchParams;
        for (const [key, value] of Object.entries({ category: 'Herbs', barangay: 'Rosario', price: 'under50', q: 'Pagination', sort: 'name', market_page: '2' })) expect(query.get(key)).toBe(value);
        await page.getByLabel('Search fresh produce', { exact: true }).fill('Pagination Harvest 17');
        await expect(pager).toHaveCount(0);
        await expect(headings).toHaveText(names(17, 17));
        await page.getByLabel('Search fresh produce', { exact: true }).fill('Missing harvest');
        await expect(page.getByRole('heading', { name: 'No produce found', exact: true })).toBeVisible();
        await page.getByRole('button', { name: 'Clear filters', exact: true }).click();
        await expect(cards).toHaveCount(16);
        await expect(pager).toContainText('Showing 1–16 of 33 products');
        await page.getByRole('button', { name: 'Vegetables', exact: true }).click();
        await expect(cards).toHaveCount(16);
        await expect(pager).toHaveCount(0);
        expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBeTruthy();
        await expect.poll(() => savedState(page)).toEqual(before);
        await page.evaluate(() => localStorage.setItem('agrifarm-theme', 'dark'));
        await page.goto('/?page=marketplace&sort=name');
        await expect(page.locator('html')).toHaveClass(/dark/);
        await expect(cards).toHaveCount(16);
        await pager.scrollIntoViewIfNeeded();
        await expect.poll(() => cards.last().locator('img').evaluate(image => image.complete && image.naturalWidth > 0)).toBeTruthy();
        await page.screenshot({ path: testInfo.outputPath('marketplace-pagination-dark.png') });
        expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBeTruthy();
        await page.goto('/?page=cart');
        await expect(page.getByRole('heading', { name: 'Pagination Harvest 01', exact: true })).toBeVisible();
        await page.goto('/?page=favorites');
        await expect(page.getByRole('heading', { name: 'Pagination Harvest 01', exact: true })).toBeVisible();
        expect(errors).toEqual([]);
    });
}
