import { expect, test } from './fixtures';
import { execFileSync } from 'node:child_process';

function createRecommendationFixtures() {
    execFileSync('php', ['-r', String.raw`
        require 'vendor/autoload.php';
        $app = require 'bootstrap/app.php';
        $app->make(Illuminate\Contracts\Console\Kernel::class)->bootstrap();
        if (config('database.default') !== 'sqlite' || realpath(config('database.connections.sqlite.database')) !== realpath('database/playwright.sqlite')) throw new RuntimeException('Isolated database required');
        $seller = App\Models\User::where('email', 'seller@agrifarm.test')->firstOrFail();
        $customer = App\Models\User::where('email', 'customer@agrifarm.test')->firstOrFail();
        $other = App\Models\User::factory()->create();
        App\Models\User::factory()->create(['email' => 'new-recommendations@agrifarm.test', 'password' => 'AgriFarm123!']);
        Illuminate\Support\Facades\Storage::disk('local')->put('e2e/recommendations.png', file_get_contents('public/images/market-pechay-feature.png'));
        $products = [];
        foreach ([['Garden Basil', 'Herbs', 12, 'active'], ['Fresh Mint', 'Herbs', 10, 'active'], ['Garden Pechay', 'Vegetables', 10, 'active'], ['Sweet Calamansi', 'Fruits', 10, 'active'], ['Rosario Beans', 'Beans', 10, 'active'], ['Sold-out Herbs', 'Herbs', 0, 'active'], ['Hidden Mint', 'Herbs', 10, 'hidden']] as [$name, $category, $stock, $status]) {
            $product = new App\Models\Product(['name' => $name, 'category' => $category, 'price' => 30, 'unit' => 'bunch', 'stock' => $stock, 'threshold' => 1, 'photo_path' => 'e2e/recommendations.png']);
            $product->forceFill(['user_id' => $seller->id, 'status' => $status])->save();
            $products[$name] = $product;
        }
        foreach ([['Garden Basil', $customer, 'delivered'], ['Garden Basil', $customer, 'delivered'], ['Sweet Calamansi', $customer, 'cancelled'], ['Sweet Calamansi', $other, 'delivered'], ['Sweet Calamansi', $other, 'delivered'], ['Sweet Calamansi', $other, 'delivered'], ['Garden Pechay', null, 'delivered']] as [$name, $buyer, $status]) {
            $product = $products[$name];
            $checkout = $buyer ? App\Models\CustomerCheckout::create(['id' => (string) Illuminate\Support\Str::uuid(), 'user_id' => $buyer->id, 'recipient_name' => 'Test customer', 'phone' => '09170000000', 'address' => 'Test garden', 'payment_method' => 'cod', 'goods_total' => 30]) : null;
            $order = new App\Models\WalkInOrder(['product_name' => $name, 'unit' => 'bunch', 'quantity' => 1, 'unit_price' => 30, 'total' => 30, 'status' => $status]);
            $order->forceFill(['user_id' => $seller->id, 'product_id' => $product->id, 'customer_checkout_id' => $checkout?->id])->save();
        }
    `], { env: process.env, stdio: 'pipe' });
}

for (const width of [390, 768, 1440]) {
    test(`${width}px: personalized and fallback product recommendations`, async ({ browser }, testInfo) => {
        createRecommendationFixtures();
        for (const scenario of ['guest', 'new-customer', 'returning-customer']) {
            const context = await browser.newContext({ viewport: { width, height: 1000 }, baseURL: testInfo.project.use.baseURL });
            const page = await context.newPage();
            if (scenario !== 'guest') {
                await page.goto('/login');
                await page.getByLabel('Email address').fill(scenario === 'new-customer' ? 'new-recommendations@agrifarm.test' : 'customer@agrifarm.test');
                await page.getByLabel('Password', { exact: true }).fill('AgriFarm123!');
                await page.getByRole('button', { name: 'Login', exact: true }).click();
                await expect(page).toHaveURL('/');
            } else {
                await page.goto('/');
            }
            const personalized = scenario === 'returning-customer';
            const expected = personalized ? ['Garden Basil', 'Fresh Mint', 'Sweet Calamansi', 'Garden Pechay'] : ['Sweet Calamansi', 'Garden Basil', 'Garden Pechay', 'Rosario Beans'];
            const section = page.locator('section[aria-labelledby="recommended-heading"]');
            await expect(section.getByRole('heading', { name: personalized ? 'Recommended for you' : 'Recommended products', exact: true })).toBeVisible();
            await expect(section.locator('.produce-card h3')).toHaveText(expected);
            await expect(section).not.toContainText('Sold-out Herbs');
            await expect(section).not.toContainText('Hidden Mint');
            await expect(page.getByRole('heading', { name: 'More to explore', exact: true })).toHaveCount(0);
            await section.scrollIntoViewIfNeeded();
            for (const image of await section.locator('.produce-photo img').all()) {
                await image.scrollIntoViewIfNeeded();
                await expect.poll(() => image.evaluate(element => element.complete && element.naturalWidth > 0)).toBeTruthy();
            }
            for (const theme of ['light', 'dark']) {
                await page.evaluate(theme => document.documentElement.classList.toggle('dark', theme === 'dark'), theme);
                expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBeTruthy();
                await section.screenshot({ path: testInfo.outputPath(`${scenario}-${theme}.png`) });
            }
            const card = section.locator('.produce-card').first();
            const name = expected[0];
            await card.getByRole('button', { name: `Add ${name} to cart`, exact: true }).click();
            await card.getByRole('button', { name: `Save ${name} to favorites`, exact: true }).click();
            await expect(page.getByRole('link', { name: 'Shopping cart, 1 items', exact: true })).toBeVisible();
            await expect(card.getByRole('button', { name: `Remove ${name} from favorites`, exact: true })).toHaveAttribute('aria-pressed', 'true');
            await page.goto('/about');
            await expect(page.getByRole('link', { name: 'Shopping cart, 1 items', exact: true })).toBeVisible();
            await page.goto('/');
            await expect(section.locator('.produce-card h3')).toHaveText(expected);
            await expect(card.getByRole('button', { name: `Remove ${name} from favorites`, exact: true })).toHaveAttribute('aria-pressed', 'true');
            await page.evaluate(() => localStorage.setItem('agrifarm-customer-language', 'filipino'));
            await page.reload();
            await expect(section.getByRole('heading', { name: personalized ? 'Mga rekomendasyon para sa iyo' : 'Mga inirerekomendang produkto', exact: true })).toBeVisible();
            expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBeTruthy();
            await section.getByRole('link', { name: 'Mamili', exact: true }).click();
            await expect(page).toHaveURL(/page=marketplace/);
            await expect(page.locator('.market-product-grid .produce-card')).toHaveCount(6);
            await context.close();
        }
    });
}
