import { expect, test } from './fixtures';
import { execFileSync } from 'node:child_process';

const storageKey = 'agrifarm-marketplace-preview-v1';
const productName = 'Navigation Pechay';

function createSellerListing() {
    execFileSync('php', ['-r', String.raw`
        require 'vendor/autoload.php';
        $app = require 'bootstrap/app.php';
        $app->make(Illuminate\Contracts\Console\Kernel::class)->bootstrap();
        if (config('database.default') !== 'sqlite' || realpath(config('database.connections.sqlite.database')) !== realpath('database/playwright.sqlite')) throw new RuntimeException('Isolated database required');
        $seller = App\Models\User::where('email', 'seller@agrifarm.test')->firstOrFail();
        Illuminate\Support\Facades\Storage::disk('local')->put('e2e/navigation-pechay.png', file_get_contents('public/images/market-pechay-feature.png'));
        $product = new App\Models\Product(['name' => 'Navigation Pechay', 'category' => 'Vegetables', 'price' => 35, 'unit' => 'bunch', 'stock' => 8, 'threshold' => 1, 'photo_path' => 'e2e/navigation-pechay.png']);
        $product->user_id = $seller->id;
        $product->save();
    `], { env: process.env, stdio: 'pipe' });
}

async function navigate(page, name, path) {
    const menu = page.getByRole('button', { name: 'Open navigation menu', exact: true });
    if (await menu.isVisible()) {
        await menu.click();
        await page.getByRole('dialog', { name: 'AgriFarm menu' }).getByRole('link', { name, exact: true }).click();
    } else {
        await page.getByRole('navigation', { name: 'Main navigation' }).getByRole('link', { name, exact: true }).click();
    }
    await expect(page).toHaveURL(path);
}

async function savedState(page) {
    return page.evaluate(key => JSON.parse(localStorage.getItem(key)), storageKey);
}

for (const account of ['guest', 'customer']) {
    for (const width of [390, 768, 1440]) {
        test(`${account} ${width}px: cart and favorites survive About and Contact navigation`, async ({ page }, testInfo) => {
            createSellerListing();
            await page.setViewportSize({ width, height: 1000 });
            if (account === 'customer') {
                await page.goto('/login');
                await page.getByLabel('Email address').fill('customer@agrifarm.test');
                await page.getByLabel('Password', { exact: true }).fill('AgriFarm123!');
                await page.getByRole('button', { name: 'Login', exact: true }).click();
                await expect(page).toHaveURL('/');
            }
            await page.goto('/?page=marketplace');
            const card = page.locator('.produce-card').filter({ has: page.getByRole('heading', { name: productName, exact: true }) });
            await card.getByRole('button', { name: `Add ${productName} to cart`, exact: true }).click();
            await expect(page.getByRole('link', { name: 'Shopping cart, 1 items', exact: true })).toBeVisible();
            await card.getByRole('button', { name: `Add ${productName} to cart`, exact: true }).click();
            await card.getByRole('button', { name: `Save ${productName} to favorites`, exact: true }).click();
            await expect(card.getByRole('button', { name: `Remove ${productName} from favorites`, exact: true })).toHaveAttribute('aria-pressed', 'true');
            const before = await savedState(page);
            expect(before.favorites).toHaveLength(1);
            expect(Object.values(before.cart)).toEqual([2]);

            for (const [name, path] of [['About', '/about'], ['Contact', '/contact']]) {
                await navigate(page, name, path);
                await expect(page.getByRole('link', { name: 'Shopping cart, 2 items', exact: true })).toBeVisible();
                await expect.poll(() => savedState(page)).toEqual(before);
                expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBeTruthy();
                await page.locator('.store-header').screenshot({ path: testInfo.outputPath(`${name.toLowerCase()}-header.png`) });
                await page.reload();
                await expect(page.getByRole('link', { name: 'Shopping cart, 2 items', exact: true })).toBeVisible();
                await expect.poll(() => savedState(page)).toEqual(before);
            }

            await navigate(page, 'Marketplace', /page=marketplace/);
            await expect(card.getByRole('button', { name: `Remove ${productName} from favorites`, exact: true })).toHaveAttribute('aria-pressed', 'true');
            await page.getByRole('link', { name: 'Shopping cart, 2 items', exact: true }).click();
            await expect(page.getByRole('heading', { name: productName, exact: true })).toBeVisible();
            await expect(page.getByLabel(`${productName} quantity`, { exact: true })).toHaveText('2');
            await page.goto('/?page=favorites');
            await expect(page.getByRole('heading', { name: productName, exact: true })).toBeVisible();
            await page.getByRole('button', { name: `Remove ${productName} from favorites`, exact: true }).click();
            await expect.poll(async () => (await savedState(page)).favorites).toEqual([]);
            await page.reload();
            await expect(page.getByRole('heading', { name: 'A place for your favorites', exact: true })).toBeVisible();
            await page.goto('/?page=cart');
            await page.getByRole('button', { name: `Decrease ${productName} quantity`, exact: true }).click();
            await expect(page.getByLabel(`${productName} quantity`, { exact: true })).toHaveText('1');
            await expect.poll(async () => Object.values((await savedState(page)).cart)).toEqual([1]);
            await page.reload();
            await expect(page.getByLabel(`${productName} quantity`, { exact: true })).toHaveText('1');
        });
    }
}
