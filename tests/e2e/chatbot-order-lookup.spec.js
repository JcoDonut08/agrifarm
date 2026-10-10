import { expect, test } from './fixtures';
import { execFileSync } from 'node:child_process';
import path from 'node:path';

const ownReference = 'AgFrm-A1ABCDEFGHIJ';
const otherReference = 'AgFrm-B2ABCDEFGHIJ';

test.beforeEach(() => {
    // Seed only the isolated Playwright database, never the application database.
    execFileSync('php', ['-r', String.raw`
        require 'vendor/autoload.php';
        $app = require 'bootstrap/app.php';
        $app->make(Illuminate\Contracts\Console\Kernel::class)->bootstrap();
        if (config('database.default') !== 'sqlite' || realpath(config('database.connections.sqlite.database')) !== realpath('database/playwright.sqlite')) {
            throw new RuntimeException('Chatbot fixtures require the isolated Playwright database.');
        }
        $customer = App\Models\User::where('email', 'customer@agrifarm.test')->firstOrFail();
        $other = App\Models\User::factory()->create(['email' => 'chatbot-other@agrifarm.test']);
        $seller = App\Models\User::where('email', 'seller@agrifarm.test')->firstOrFail();
        foreach ([[$customer, 'AgFrm-A1ABCDEFGHIJ', 'Chatbot Pechay'], [$other, 'AgFrm-B2ABCDEFGHIJ', 'Private customer crop']] as [$owner, $reference, $crop]) {
            $checkout = App\Models\CustomerCheckout::create([
                'id' => (string) Illuminate\Support\Str::uuid(), 'user_id' => $owner->id,
                'reference_number' => $reference, 'recipient_name' => 'Private recipient',
                'phone' => '09171234567', 'address' => 'Private delivery address',
                'payment_method' => 'cod', 'goods_total' => 70,
            ]);
            $item = new App\Models\WalkInOrder([
                'customer_name' => 'Private recipient', 'product_name' => $crop,
                'unit' => 'kg', 'quantity' => 2, 'unit_price' => 35, 'total' => 70, 'status' => 'delivered',
            ]);
            $item->user_id = $seller->id;
            $checkout->items()->save($item);
        }
    `], {
        env: { ...process.env, DB_CONNECTION: 'sqlite', DB_DATABASE: path.resolve('database/playwright.sqlite'), SCOUT_DRIVER: 'null' },
        stdio: 'pipe',
    });
});

for (const width of [390, 768, 1440]) {
    for (const language of ['english', 'filipino']) {
        test(`${width}px ${language}: chatbot requires sign-in and hides other customers' orders`, async ({ page }, testInfo) => {
            const filipino = language === 'filipino';
            await page.setViewportSize({ width, height: 1000 });
            await page.addInitScript(language => {
                localStorage.setItem('agrifarm-customer-language', language);
                localStorage.setItem('agrifarm-theme', 'light');
            }, language);
            const errors = [];
            page.on('pageerror', error => errors.push(error.message));
            await page.goto('/');
            for (const endpoint of ['/api/chatbot/latest-order', `/api/chatbot/order-status?reference=${ownReference}`]) {
                const response = await page.request.get(endpoint, { headers: { Accept: 'application/json' } });
                expect(response.status()).toBe(401);
            }
            await page.getByRole('button', { name: 'Open Help Assistant', exact: true }).click();
            const assistant = page.locator('.help-widget-window');
            await assistant.getByRole('button', { name: filipino ? 'Suriin ang Order' : 'Check my order', exact: true }).click();
            await expect(assistant).toContainText(filipino ? 'Mag-sign in para makita ang iyong mga order.' : 'Sign in to check your orders.');
            await expect(assistant.getByRole('textbox')).toHaveCount(0);
            for (const theme of ['light', 'dark']) {
                await page.evaluate(theme => document.documentElement.classList.toggle('dark', theme === 'dark'), theme);
                const bounds = await assistant.boundingBox();
                expect(bounds.x).toBeGreaterThanOrEqual(0);
                expect(bounds.x + bounds.width).toBeLessThanOrEqual(width);
                await assistant.screenshot({ path: testInfo.outputPath(`sign-in-${theme}.png`), animations: 'disabled' });
            }
            await assistant.getByRole('link', { name: filipino ? 'Mag-sign in' : 'Sign in', exact: true }).click();
            await expect(page).toHaveURL(/\/login$/);
            await page.getByLabel('Email address').fill('customer@agrifarm.test');
            await page.getByLabel('Password', { exact: true }).fill('AgriFarm123!');
            await page.getByRole('button', { name: 'Login', exact: true }).click();
            await expect(page.getByRole('button', { name: 'Open account menu' })).toBeVisible();
            await page.getByRole('button', { name: 'Open Help Assistant', exact: true }).click();
            await assistant.getByRole('button', { name: filipino ? 'Suriin ang Order' : 'Check my order', exact: true }).click();
            await expect(assistant).toContainText(ownReference);
            await expect(assistant).toContainText('Chatbot Pechay');
            const another = filipino ? 'Tingnan ang ibang order' : 'Check another order';
            await assistant.getByRole('button', { name: another, exact: true }).last().click();
            await assistant.getByRole('textbox', { name: 'Order ID', exact: true }).fill(ownReference);
            await assistant.getByRole('button', { name: 'Send', exact: true }).click();
            await expect(assistant.locator('.chat-message.bot').last()).toContainText('Chatbot Pechay');
            await assistant.getByRole('button', { name: another, exact: true }).last().click();
            const input = assistant.getByRole('textbox', { name: 'Order ID', exact: true });
            for (const theme of ['light', 'dark']) {
                await page.evaluate(theme => document.documentElement.classList.toggle('dark', theme === 'dark'), theme);
                const bounds = await assistant.boundingBox();
                const send = await assistant.getByRole('button', { name: 'Send', exact: true }).boundingBox();
                expect(send.x + send.width).toBeLessThanOrEqual(bounds.x + bounds.width);
                expect(await assistant.evaluate(element => element.scrollWidth <= element.clientWidth)).toBeTruthy();
                await assistant.screenshot({ path: testInfo.outputPath(`reference-${theme}.png`), animations: 'disabled' });
            }
            await input.fill(otherReference);
            await assistant.getByRole('button', { name: 'Send', exact: true }).click();
            await expect(assistant.locator('.chat-message.bot').last()).toContainText(filipino ? 'wala akong mahanap na order' : 'could not find any order');
            await expect(assistant).not.toContainText('Private customer crop');
            const forbiddenOrder = await page.request.get(`/api/chatbot/order-status?reference=${otherReference}`, { headers: { Accept: 'application/json' } });
            expect(await forbiddenOrder.json()).toEqual({ status: 'not_found' });
            if (width === 1440 && !filipino) {
                for (const status of [429, 401]) {
                    await page.route('**/api/chatbot/latest-order', route => route.fulfill({ status, contentType: 'application/json', body: '{}' }));
                    await assistant.getByRole('button', { name: 'Check my order', exact: true }).first().click();
                    await expect(assistant.locator('.chat-message.bot').last()).toContainText(status === 429 ? 'Too many requests.' : 'Sign in to check your orders.');
                    await page.unroute('**/api/chatbot/latest-order');
                }
            }
            await page.getByRole('button', { name: 'Close assistant', exact: true }).click();
            await page.getByRole('button', { name: 'Open account menu' }).click();
            await page.getByRole('button', { name: filipino ? 'Mag-sign out' : 'Sign out', exact: true }).click();
            await expect(page).toHaveURL(/\/login$/);
            await page.getByRole('link', { name: 'Back to homepage', exact: true }).click();
            await expect(page.getByRole('link', { name: 'Log in', exact: true })).toBeVisible();
            await page.getByRole('button', { name: 'Open Help Assistant', exact: true }).click();
            await expect(assistant).not.toContainText('Chatbot Pechay');
            await expect(assistant).not.toContainText(ownReference);
            await assistant.getByRole('button', { name: filipino ? 'Suriin ang Order' : 'Check my order', exact: true }).click();
            await expect(assistant).toContainText(filipino ? 'Mag-sign in para makita ang iyong mga order.' : 'Sign in to check your orders.');
            expect(errors).toEqual([]);
        });
    }
}
