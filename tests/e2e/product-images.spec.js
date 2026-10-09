import { expect, test } from '@playwright/test';
import { execFileSync } from 'node:child_process';
import path from 'node:path';

test.beforeAll(() => {
    execFileSync('php', ['-r', String.raw`
        require 'vendor/autoload.php';
        $app = require 'bootstrap/app.php';
        $app->make(Illuminate\Contracts\Console\Kernel::class)->bootstrap();
        if (config('database.default') !== 'sqlite' || realpath(config('database.connections.sqlite.database')) !== realpath('database/playwright.sqlite')) throw new RuntimeException('Isolated database required');
        $seed = App\Models\User::where('email', 'brgyrosario@gmail.com')->firstOrFail();
        $seller = $seed->replicate();
        $seller->email = 'product-images@agrifarm.test';
        $seller->username = 'product-images-qa';
        $seller->save();
        $photo = new Illuminate\Http\UploadedFile(base_path('public/images/market-pechay-feature.png'), 'pechay.png', null, null, true);
        $imagePath = app(App\Services\ProductPhotoService::class)->store($photo, $seller->id);
        for ($i = 1; $i <= 20; $i++) {
            $product = new App\Models\Product(['name' => 'Image QA Pechay '.str_pad($i, 2, '0', STR_PAD_LEFT), 'category' => 'Vegetables', 'price' => 35, 'unit' => 'kg', 'stock' => 20, 'threshold' => 5, 'photo_path' => $imagePath]);
            $product->user_id = $seller->id;
            $product->save();
        }
    `], { env: { ...process.env, DB_CONNECTION: 'sqlite', DB_DATABASE: path.resolve('database/playwright.sqlite'), MAIL_MAILER: 'log', CACHE_STORE: 'file', SESSION_DRIVER: 'file' } });
});

for (const width of [390, 768, 1440]) {
    test(`${width}px product thumbnails preserve card layout and load after scrolling`, async ({ page }, testInfo) => {
        await page.setViewportSize({ width, height: 900 });
        await page.addInitScript(() => {
            localStorage.setItem('agrifarm-theme', 'light');
            localStorage.setItem('agrifarm-seller-language', 'english');
        });
        const errors = [];
        page.on('pageerror', error => errors.push(error.message));
        await page.goto('/login');
        await page.getByLabel('Email address').fill('product-images@agrifarm.test');
        await page.getByLabel('Password', { exact: true }).fill('AgriFarm123!');
        await page.getByRole('button', { name: 'Login', exact: true }).click();
        await expect(page).toHaveURL(/\/seller\/dashboard$/, { timeout: 45000 });

        let releaseImages;
        const gate = new Promise(resolve => { releaseImages = resolve; });
        await page.route('**/seller/products/*/photo?*', async route => {
            await gate;
            await route.continue();
        });
        await page.goto('/seller/dashboard?section=products', { waitUntil: 'domcontentloaded' });
        const cards = page.locator('.seller-product-card');
        await expect(cards).toHaveCount(5);
        const frame = cards.first().locator('.seller-product-image');
        const before = await frame.boundingBox();
        expect(before.height).toBeGreaterThan(100);
        releaseImages();
        await expect.poll(() => cards.first().locator('img').evaluate(img => img.complete && img.naturalWidth > 0)).toBe(true);
        const after = await frame.boundingBox();
        expect(Math.abs(before.width - after.width)).toBeLessThan(1);
        expect(Math.abs(before.height - after.height)).toBeLessThan(1);
        await page.unroute('**/seller/products/*/photo?*');
        const pagination = page.getByRole('navigation', { name: 'Products pagination' });
        await pagination.getByLabel('Rows per page', { exact: true }).selectOption('20');
        await expect(cards).toHaveCount(20);
        const images = cards.locator('.seller-product-image img');
        await expect(images.first()).toHaveAttribute('loading', 'eager');
        await expect(images.nth(4)).toHaveAttribute('loading', 'lazy');
        // Visit each card: native lazy loading intentionally leaves distant rows unloaded.
        for (let index = 0; index < await images.count(); index++) {
            await images.nth(index).scrollIntoViewIfNeeded();
            await expect.poll(() => images.nth(index).evaluate(img => img.complete && img.naturalWidth > 0)).toBe(true);
        }
        for (const theme of ['light', 'dark']) {
            await page.evaluate(theme => document.documentElement.classList.toggle('dark', theme === 'dark'), theme);
            await cards.first().scrollIntoViewIfNeeded();
            await page.screenshot({ path: testInfo.outputPath(`seller-${theme}.png`) });
            await cards.last().scrollIntoViewIfNeeded();
            await expect.poll(() => images.last().evaluate(img => img.complete && img.naturalWidth > 0)).toBe(true);
            await page.screenshot({ path: testInfo.outputPath(`seller-bottom-${theme}.png`) });
        }
        const sources = await images.evaluateAll(imgs => imgs.map(img => ({ src: img.currentSrc, width: img.naturalWidth })));
        expect(sources.every(img => img.src.includes('size=card'))).toBe(true);
        expect(sources.every(img => img.width <= 800 && img.width > 0)).toBe(true);
        expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth + 1)).toBe(true);

        // The storefront intentionally redirects signed-in sellers to their workspace.
        await page.context().clearCookies();
        await page.goto('/?page=marketplace&q=Image%20QA');
        const marketCards = page.locator('.produce-card');
        await expect(marketCards.first()).toBeVisible();
        const marketImages = marketCards.locator('.produce-photo img');
        await expect(marketImages.first()).toHaveAttribute('loading', 'eager');
        await expect(marketImages.nth(4)).toHaveAttribute('loading', 'lazy');
        await expect(marketImages.first()).toHaveAttribute('src', /size=card/);
        await expect.poll(() => marketImages.first().evaluate(img => img.complete && img.naturalWidth > 0)).toBe(true);
        for (let index = 0; index < await marketImages.count(); index++) {
            await marketImages.nth(index).scrollIntoViewIfNeeded();
            await expect.poll(() => marketImages.nth(index).evaluate(img => img.complete && img.naturalWidth > 0 && img.naturalWidth <= 800)).toBe(true);
        }
        await marketCards.first().scrollIntoViewIfNeeded();
        await page.screenshot({ path: testInfo.outputPath('marketplace.png') });
        await marketCards.first().locator('.produce-card-link').click();
        await expect(page.locator('.product-detail-photo img')).toHaveAttribute('loading', 'eager');
        await expect(page.locator('.product-detail-photo img')).not.toHaveAttribute('src', /size=card/);
        await expect.poll(() => page.locator('.product-detail-photo img').evaluate(img => img.complete && img.naturalWidth > 800)).toBe(true);
        expect(errors).toEqual([]);
    });
}
