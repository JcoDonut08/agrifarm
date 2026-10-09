import { expect, test } from '@playwright/test';
import { execFileSync } from 'node:child_process';
import path from 'node:path';

function isolatedPhp(code) {
    return JSON.parse(execFileSync('php', ['-r', String.raw`
        require 'vendor/autoload.php';
        $app = require 'bootstrap/app.php';
        $app->make(Illuminate\Contracts\Console\Kernel::class)->bootstrap();
        if (config('database.default') !== 'sqlite' || realpath(config('database.connections.sqlite.database')) !== realpath('database/playwright.sqlite')) throw new RuntimeException('Isolated database required');
    ` + code], {
        env: { ...process.env, APP_ENV: 'local', DB_CONNECTION: 'sqlite', DB_DATABASE: path.resolve('database/playwright.sqlite') },
        encoding: 'utf8',
    }));
}

async function sellerRequest(page, method, url, data) {
    const cookie = (await page.context().cookies()).find(cookie => cookie.name === 'XSRF-TOKEN');
    const response = await page.request[method](url, {
        headers: { 'X-XSRF-TOKEN': decodeURIComponent(cookie.value), Accept: 'application/json' }, data,
        maxRedirects: 0,
    });
    // Laravel returns a normal redirect here; an API client would otherwise
    // repeat PATCH against the dashboard instead of navigating with GET.
    expect(response.status()).toBe(302);
}

for (const width of [390, 768, 1440]) {
    for (const filipino of [false, true]) {
        test(`active orders protect single and bulk deletion at ${width}px in ${filipino ? 'Filipino' : 'English'}`, async ({ page }, testInfo) => {
            const preorder = width === 768;
            const fixtures = isolatedPhp(String.raw`
                $seller = App\Models\User::where('email', 'brgyrosario@gmail.com')->firstOrFail();
                $products = [];
                foreach (['Protected Pechay', 'Free Pechay'] as $index => $name) {
                    $photo = 'products/'.Illuminate\Support\Str::uuid().'.jpg';
                    Illuminate\Support\Facades\Storage::disk('local')->put($photo, file_get_contents('public/images/kuya-ani-avatar.jpg'));
                    $product = new App\Models\Product(['name' => $name, 'category' => 'Vegetables', 'price' => 35,
                        'unit' => 'kg', 'stock' => ${preorder ? '($index === 0 ? 0 : 3)' : '3'},
                        'expected_yield' => ${preorder ? '($index === 0 ? 3 : 0)' : '0'}, 'threshold' => 1]);
                    $product->forceFill(['user_id' => $seller->id, 'photo_path' => $photo])->save();
                    $products[] = ['id' => $product->id, 'photo' => $photo];
                }
                echo json_encode($products);
            `);
            const [protectedProduct, freeProduct] = fixtures;
            await page.setViewportSize({ width, height: 1000 });
            await page.goto('/login');
            await page.getByLabel('Email address').fill('brgyrosario@gmail.com');
            await page.getByLabel('Password', { exact: true }).fill('AgriFarm123!');
            await page.getByRole('button', { name: 'Login', exact: true }).click();
            await expect(page).toHaveURL(/\/seller\/dashboard/, { timeout: 45_000 });
            await page.evaluate(language => localStorage.setItem('agrifarm-seller-language', language), filipino ? 'filipino' : 'english');
            await page.goto('/seller/dashboard?section=products');

            const single = page.getByRole('dialog', { name: filipino ? 'Burahin ang produkto?' : 'Delete product?', exact: true });
            const bulk = page.getByRole('dialog', { name: filipino ? 'Burahin ang mga napiling produkto?' : 'Delete selected products?', exact: true });
            const blockedCard = page.locator('.seller-product-card').filter({ has: page.getByRole('heading', { name: 'Protected Pechay', exact: true }) });
            const freeCard = page.locator('.seller-product-card').filter({ has: page.getByRole('heading', { name: 'Free Pechay', exact: true }) });
            const blockedCheck = page.getByRole('checkbox', { name: filipino ? 'Piliin ang Protected Pechay' : 'Select Protected Pechay', exact: true });
            const freeCheck = page.getByRole('checkbox', { name: filipino ? 'Piliin ang Free Pechay' : 'Select Free Pechay', exact: true });
            const bulkButton = page.getByRole('button', { name: filipino ? 'Burahin ang napili' : 'Delete selected', exact: true });

            // An order arriving after the confirmation opened must still block deletion.
            await page.getByRole('button', { name: filipino ? 'Burahin ang Protected Pechay' : 'Delete Protected Pechay', exact: true }).click();
            await expect(single).toBeVisible();
            await sellerRequest(page, 'post', '/seller/orders/walk-in', { product_id: protectedProduct.id, quantity: 3 });
            await single.getByRole('button', { name: filipino ? 'Burahin ang produkto' : 'Delete product', exact: true }).click();
            await expect(single.getByRole('alert')).toHaveText(filipino
                ? 'May hindi pa tapos na mga order o reserbasyon ang produktong ito. Tapusin o kanselahin muna ang mga ito bago burahin ang produkto.'
                : 'This product has unfinished orders or reservations. Finish or cancel them before deleting it.');
            await expect(single).toBeVisible();
            await page.screenshot({ path: testInfo.outputPath('single-blocked-light.png'), fullPage: true });
            await single.getByRole('button', { name: filipino ? 'Huwag burahin' : 'Keep product', exact: true }).click();
            await expect(blockedCard).toBeVisible();
            await expect(freeCard).toBeVisible();
            expect((await page.request.get(await blockedCard.locator('img').getAttribute('src'))).status()).toBe(200);

            await freeCheck.check();
            await blockedCheck.check();
            await bulkButton.click();
            await bulk.getByRole('button', { name: filipino ? 'Burahin ang mga produkto' : 'Delete products', exact: true }).click();
            await expect(bulk.getByRole('alert')).toHaveText(filipino
                ? 'May hindi pa tapos na mga order o reserbasyon ang isa o higit pang napiling produkto. Walang produktong nabura. Tapusin o kanselahin muna ang mga order na iyon, o alisin ang mga produktong iyon sa iyong napili.'
                : 'One or more selected products have unfinished orders or reservations. No products were deleted. Finish or cancel those orders, or remove those products from your selection.');
            expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBeTruthy();
            for (const button of await bulk.getByRole('button').all()) {
                const bounds = await button.boundingBox();
                expect(bounds.height).toBeGreaterThanOrEqual(44);
                expect(bounds.x).toBeGreaterThanOrEqual(0);
                expect(bounds.x + bounds.width).toBeLessThanOrEqual(width);
            }
            await page.screenshot({ path: testInfo.outputPath('bulk-blocked-light.png'), fullPage: true });
            await page.evaluate(() => document.documentElement.classList.add('dark'));
            await page.screenshot({ path: testInfo.outputPath('bulk-blocked-dark.png'), fullPage: true });
            await page.evaluate(() => document.documentElement.classList.remove('dark'));
            await bulk.getByRole('button', { name: filipino ? 'Huwag burahin' : 'Keep products', exact: true }).click();
            await expect(blockedCheck).toBeChecked();
            await expect(freeCheck).toBeChecked();

            const active = isolatedPhp(String.raw`
                $product = App\Models\Product::findOrFail(${protectedProduct.id});
                $order = App\Models\WalkInOrder::where('product_id', $product->id)->sole();
                echo json_encode(['stock' => $product->stock, 'yield' => $product->expected_yield,
                    'order_id' => $order->id, 'status' => $order->status,
                    'free_exists' => App\Models\Product::whereKey(${freeProduct.id})->exists()]);
            `);
            expect(active).toMatchObject({ stock: 0, yield: 0, status: preorder ? 'reservation' : 'pending', free_exists: true });
            await sellerRequest(page, 'patch', `/seller/orders/${active.order_id}/status`, { status: 'cancelled', cancellation_reason: 'out_of_stock' });
            const restored = isolatedPhp(String.raw`
                $product = App\Models\Product::findOrFail(${protectedProduct.id});
                echo json_encode(['stock' => $product->stock, 'yield' => $product->expected_yield]);
            `);
            expect(restored).toEqual({ stock: preorder ? 0 : 3, yield: preorder ? 3 : 0 });

            // The retained selection can be retried after the last order is closed.
            await bulkButton.click();
            await expect(bulk.getByRole('alert')).not.toBeVisible();
            await bulk.getByRole('button', { name: filipino ? 'Burahin ang mga produkto' : 'Delete products', exact: true }).click();
            await expect(bulk).not.toBeVisible();
            await expect(blockedCard).toHaveCount(0);
            await expect(freeCard).toHaveCount(0);
            const deleted = isolatedPhp(String.raw`
                $order = App\Models\WalkInOrder::findOrFail(${active.order_id});
                echo json_encode(['product_id' => $order->product_id, 'name' => $order->product_name,
                    'status' => $order->status, 'photo_exists' => Illuminate\Support\Facades\Storage::disk('local')->exists('${protectedProduct.photo}')]);
            `);
            expect(deleted).toEqual({ product_id: null, name: 'Protected Pechay', status: 'cancelled', photo_exists: false });
        });
    }
}
