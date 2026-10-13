import { test, expect } from './fixtures';
import { execFileSync } from 'node:child_process';

function seedListings() {
    execFileSync('php', ['-r', String.raw`
        require 'vendor/autoload.php';
        $app = require 'bootstrap/app.php';
        $app->make(Illuminate\Contracts\Console\Kernel::class)->bootstrap();
        if (config('database.default') !== 'sqlite' || realpath(config('database.connections.sqlite.database')) !== realpath('database/playwright.sqlite')) throw new RuntimeException('Isolated database required');
        $seller = App\Models\User::where('email', 'brgyrosario@gmail.com')->firstOrFail();
        $photo = new Illuminate\Http\UploadedFile(base_path('public/images/market-pechay-feature.png'), 'pechay.png', null, null, true);
        $path = app(App\Services\ProductPhotoService::class)->store($photo, $seller->id);
        foreach (['Vegetables', 'Fruits', 'Herbs'] as $category) {
            $product = new App\Models\Product(['name' => 'Skeleton QA '.$category, 'category' => $category, 'price' => 35, 'unit' => 'kg', 'stock' => 20, 'threshold' => 5, 'photo_path' => $path]);
            $product->user_id = $seller->id;
            $product->save();
        }
    `], { env: process.env, stdio: 'pipe' });
}

async function holdRequests(page, matches) {
    let release;
    const gate = new Promise(resolve => { release = resolve; });
    const pending = [];
    const handler = route => {
        const task = (async () => {
            if (matches(route.request())) await gate;
            await route.continue();
        })();
        pending.push(task);
        return task;
    };
    await page.route('**/*', handler);
    return { release, dispose: async () => { release(); await Promise.all(pending); await page.unroute('**/*', handler); } };
}

const inertiaGet = request => request.method() === 'GET' && request.headers()['x-inertia'] === 'true';

for (const width of [390, 768, 1440]) {
    test(`navigation, filters and product photos load gracefully at ${width}px`, async ({ page }, testInfo) => {
        seedListings();
        const errors = [];
        page.on('pageerror', error => errors.push(error.message));
        await page.setViewportSize({ width, height: 1000 });
        await page.addInitScript(() => localStorage.setItem('agrifarm-chatbot-enabled', 'false'));
        await page.goto('/');
        const navigation = await holdRequests(page, request => inertiaGet(request) && request.url().includes('page=marketplace'));
        try {
            await page.getByRole('link', { name: 'Shop the Harvest', exact: true }).click();
            await expect(page.getByRole('status').filter({ hasText: 'Loading page' })).toBeVisible();
            await expect(page.locator('.store-header')).toBeVisible();
            await expect(page.locator('.skeleton-product-card')).toHaveCount(8);
            await expect(page.locator('#nprogress')).toHaveCount(0);
            expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
            await page.locator('#main-content').screenshot({ path: testInfo.outputPath(`marketplace-loading-${width}.png`), animations: 'disabled' });
            await page.emulateMedia({ reducedMotion: 'reduce' });
            expect(await page.locator('.skeleton-block').first().evaluate(element => getComputedStyle(element).animationName)).toBe('none');
        } finally { await navigation.dispose(); }
        await expect(page.getByRole('heading', { name: 'Marketplace', exact: true })).toBeVisible();
        await expect(page.locator('.skeleton-product-card')).toHaveCount(0);

        const filtering = await holdRequests(page, request => inertiaGet(request) && request.url().includes('category=Fruits'));
        try {
            await page.getByRole('button', { name: 'Fruits', exact: true }).click();
            await expect(page.getByRole('status').filter({ hasText: 'Loading products' })).toBeVisible();
            await expect(page.getByRole('searchbox', { name: 'Search fresh produce' })).toBeVisible();
            await expect(page.getByRole('button', { name: 'Vegetables', exact: true })).toBeEnabled();
            await expect(page.locator('.page-loading-skeleton')).toHaveCount(0);
            await page.locator('.marketplace-page').screenshot({ path: testInfo.outputPath(`filter-loading-${width}.png`), animations: 'disabled' });
        } finally { await filtering.dispose(); }
        await expect(page.locator('.produce-card')).toHaveCount(1);
        await expect(page.locator('.produce-card')).toContainText('Skeleton QA Fruits');
        await expect(page.locator('.skeleton-product-card')).toHaveCount(0);

        const images = await holdRequests(page, request => request.url().includes('/marketplace/products/') && request.url().includes('/photo'));
        try {
            await page.reload({ waitUntil: 'domcontentloaded' });
            const photo = page.locator('.produce-photo').first();
            await expect(photo.locator('.skeleton-image-fill')).toBeVisible();
            const before = await photo.boundingBox();
            images.release();
            await expect.poll(() => photo.locator('img').evaluate(image => image.complete && image.naturalWidth > 0)).toBe(true);
            await expect(photo.locator('.skeleton-image-fill')).toHaveCount(0);
            const after = await photo.boundingBox();
            expect(Math.abs(before.height - after.height)).toBeLessThan(1);
        } finally { await images.dispose(); }
        expect(errors).toEqual([]);
    });
}

test('canceling a slow visit restores content and form submissions keep fields visible', async ({ page }) => {
    await page.setViewportSize({ width: 390, height: 900 });
    await page.goto('/');
    const navigation = await holdRequests(page, request => inertiaGet(request) && request.url().includes('page=marketplace'));
    try {
        await page.getByRole('link', { name: 'Shop the Harvest', exact: true }).click();
        await expect(page.locator('.page-loading-skeleton')).toBeVisible();
        await page.locator('.store-header a[href="/"]').first().click();
        await expect(page.locator('.page-loading-skeleton')).toHaveCount(0);
        await expect(page.getByRole('link', { name: 'Shop the Harvest', exact: true })).toBeVisible();
    } finally { await navigation.dispose(); }
    await page.goto('/login');
    const login = await holdRequests(page, request => request.method() === 'POST' && new URL(request.url()).pathname === '/login');
    try {
        await page.getByLabel('Email address').fill('customer@agrifarm.test');
        await page.getByLabel('Password', { exact: true }).fill('AgriFarm123!');
        await page.getByRole('button', { name: 'Login', exact: true }).click();
        await expect(page.getByLabel('Email address')).toBeVisible();
        await expect(page.getByLabel('Email address')).toHaveValue('customer@agrifarm.test');
        await expect(page.locator('.page-loading-skeleton')).toHaveCount(0);
    } finally { await login.dispose(); }
    await expect(page.getByRole('button', { name: 'Open account menu', exact: true })).toBeVisible();
});

for (const role of ['seller', 'admin']) {
    test(`${role} workspace preserves its navigation while loading`, async ({ page }, testInfo) => {
        await page.goto('/login');
        await page.getByLabel('Email address').fill(role === 'seller' ? 'seller@agrifarm.test' : 'pasigcenro@gmail.com');
        await page.getByLabel('Password', { exact: true }).fill('AgriFarm123!');
        await page.getByRole('button', { name: 'Login', exact: true }).click();
        await expect(page).toHaveURL(new RegExp(`/${role}/dashboard$`));
        const visit = await holdRequests(page, request => inertiaGet(request) && new URL(request.url()).pathname === `/${role}/dashboard`);
        try {
            const brand = page.locator(`.${role}-app a[href="/${role}/dashboard"]`).first();
            await brand.click();
            await expect(page.locator('.page-loading-skeleton')).toBeVisible();
            for (const width of [390, 768, 1440]) {
                await page.setViewportSize({ width, height: 1000 });
                expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
                await page.locator(`.${role}-main`).screenshot({ path: testInfo.outputPath(`${role}-loading-${width}.png`), animations: 'disabled' });
            }
        } finally { await visit.dispose(); }
        await expect(page.locator('.page-loading-skeleton')).toHaveCount(0);
        await expect(page.locator(`.${role}-main`)).toBeVisible();
    });
}
