import { expect, test } from './fixtures';
import { execFileSync } from 'node:child_process';
import path from 'node:path';

let cancelledEmail;
let deliveryEmail;

test.beforeAll(() => {
    const render = status => execFileSync('php', ['-r', `
        require 'vendor/autoload.php';
        $app = require 'bootstrap/app.php';
        $app->make(Illuminate\\Contracts\\Console\\Kernel::class)->bootstrap();
        Illuminate\\Support\\Facades\\URL::forceRootUrl('https://agrifarm.example');
        Illuminate\\Support\\Facades\\URL::forceScheme('https');
        $order = new App\\Models\\WalkInOrder(['product_name' => 'Cabbage', 'quantity' => 2, 'unit' => 'piece', 'status' => '${status}']);
        $order->id = 42;
        $order->setRelation('checkout', new App\\Models\\CustomerCheckout(['reference_number' => 'AgFrm-TEST123456', 'recipient_name' => 'Jco']));
        $order->cancellation_reason = 'reserved_elsewhere';
        $order->cancellation_note = 'The harvest is already reserved. Please check the shop for other available produce.';
        echo (new App\\Notifications\\OrderStatusUpdated($order))->toMail(new App\\Models\\User(['name' => 'Jco']))->render();
    `], {
        env: { ...process.env, APP_ENV: 'testing', DB_CONNECTION: 'sqlite', DB_DATABASE: path.resolve('database/playwright.sqlite'), MAIL_MAILER: 'log' },
        encoding: 'utf8',
    });
    cancelledEmail = render('cancelled');
    deliveryEmail = render('out_for_delivery');
});

for (const width of [390, 768, 1440]) {
    test(`order update email is readable at ${width}px`, async ({ page }, testInfo) => {
        await page.setViewportSize({ width, height: 1000 });
        for (const [kind, html, heading] of [
            ['cancelled', cancelledEmail, 'Order item cancelled'],
            ['delivery', deliveryEmail, 'Your item is out for delivery'],
        ]) {
            await page.setContent(html);
            await expect(page.getByRole('heading', { name: heading })).toBeVisible();
            await expect(page.getByText('AgFrm-TEST123456', { exact: true })).toBeVisible();
            const action = page.getByRole('link', { name: 'View my orders', exact: true });
            await expect(action).toHaveAttribute('href', 'https://agrifarm.example/customer/orders');
            await action.focus();
            await expect(action).toBeFocused();
            const bounds = await action.boundingBox();
            expect(bounds.height).toBeGreaterThanOrEqual(44);
            expect(bounds.x).toBeGreaterThanOrEqual(0);
            expect(bounds.x + bounds.width).toBeLessThanOrEqual(width);
            expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBeTruthy();
            if (kind === 'cancelled') {
                await expect(page.getByText('Reason for cancellation', { exact: true })).toBeVisible();
                await expect(page.getByText('Message from the seller', { exact: true })).toBeVisible();
            } else {
                await expect(page.getByText('Reason for cancellation', { exact: true })).toHaveCount(0);
            }
            await page.screenshot({ path: testInfo.outputPath(`order-email-${kind}-${width}.png`), fullPage: true });
        }
    });
}
