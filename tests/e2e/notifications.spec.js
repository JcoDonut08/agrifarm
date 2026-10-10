import { expect, test } from './fixtures';
import { execFileSync } from 'node:child_process';
import path from 'node:path';

test.beforeEach(() => {
    execFileSync('php', ['-r', String.raw`
        require 'vendor/autoload.php';
        $app = require 'bootstrap/app.php';
        $app->make(Illuminate\Contracts\Console\Kernel::class)->bootstrap();
        if (config('database.default') !== 'sqlite' || realpath(config('database.connections.sqlite.database')) !== realpath('database/playwright.sqlite')) throw new RuntimeException('Isolated database required');
        $seedOwner = App\Models\User::where('email', 'customer@agrifarm.test')->firstOrFail();
        $owner = App\Models\User::factory()->create(['email' => 'notifications-feed@agrifarm.test', 'password' => $seedOwner->password]);
        $empty = App\Models\User::factory()->create(['email' => 'notifications-empty@agrifarm.test', 'password' => $owner->password]);
        $deliveryOnly = App\Models\User::factory()->create(['email' => 'notifications-delivery@agrifarm.test', 'password' => $owner->password]);
        $foreign = App\Models\User::factory()->create();
        $seller = App\Models\User::where('email', 'brgyrosario@gmail.com')->firstOrFail();
        $avatar = Illuminate\Support\Str::lower(Illuminate\Support\Str::random(16)).'.jpg';
        Illuminate\Support\Facades\Storage::disk('local')->put('seller-avatars/'.$seller->id.'/'.$avatar, file_get_contents('public/images/kuya-ani-avatar.jpg'));
        $seller->forceFill(['avatar_url' => '/seller/profile/photo?image='.$avatar])->save();
        $photoUrl = '/marketplace/sellers/'.$seller->id.'/photo?v='.$avatar;
        $add = function ($user, $crop, $status, $date, $reason = null, $note = null) use ($seller, $photoUrl) {
            $identity = $crop === 'Kamatis' ? [] : ['seller_id' => $seller->id, 'seller_name' => $seller->name,
                'seller_avatar_url' => $crop === 'Pechay' ? null : ($crop === 'Talong' ? '/marketplace/sellers/999999/photo' : $photoUrl)];
            $user->notifications()->create([
                'id' => (string) Illuminate\Support\Str::uuid(), 'type' => App\Notifications\OrderStatusUpdated::class,
                'data' => [...$identity, 'title' => 'Order updated', 'message' => 'Your order has an update.', 'status' => $status,
                    'product_name' => $crop, 'reference' => 'AgFrm-NOTIF123456', 'url' => '/customer/orders',
                    'cancellation_reason' => $reason, 'cancellation_note' => $note],
                'created_at' => $date, 'updated_at' => $date,
            ]);
        };
        $add($owner, 'Cabbage', 'cancelled', now()->subMinutes(10), 'out_of_stock', 'The remaining cabbage was damaged during harvest. <script>seller note</script>');
        $add($owner, 'Pechay', 'preparing', now()->subHours(1));
        $add($owner, 'Talong', 'out_for_delivery', now()->subDay());
        $add($owner, 'Kangkong', 'delivered', now()->subDays(4));
        $add($owner, 'Kamatis', 'cancelled', now()->subDays(5));
        $add($deliveryOnly, 'Lettuce', 'out_for_delivery', now());
        $add($foreign, 'Private customer crop', 'cancelled', now(), 'other', 'Private customer note');
    `], {
        env: { ...process.env, APP_ENV: 'testing', DB_CONNECTION: 'sqlite', DB_DATABASE: path.resolve('database/playwright.sqlite'), SCOUT_DRIVER: 'null' },
        stdio: 'pipe',
    });
});

async function signIn(page, email, width, filipino = false) {
    await page.setViewportSize({ width, height: 1000 });
    await page.addInitScript(filipino => {
        localStorage.setItem('agrifarm-theme', 'light');
        localStorage.setItem('agrifarm-customer-language', filipino ? 'filipino' : 'english');
    }, filipino);
    await page.goto('/login');
    await page.getByLabel('Email address').fill(email);
    await page.getByLabel('Password', { exact: true }).fill('AgriFarm123!');
    await page.getByRole('button', { name: 'Login', exact: true }).click();
    await expect(page.getByRole('button', { name: 'Open account menu' })).toBeVisible();
    await page.goto('/?page=notifications');
}

for (const width of [390, 768, 1440]) {
    for (const filipino of [false, true]) {
        test(`${width}px ${filipino ? 'Filipino' : 'English'} notification feed`, async ({ page }, testInfo) => {
            const errors = [];
            page.on('pageerror', error => errors.push(error.message));
            await signIn(page, 'notifications-feed@agrifarm.test', width, filipino);
            const feed = page.locator('.notification-page');
            await expect(feed.getByRole('heading', { name: filipino ? 'Mga notipikasyon' : 'Notifications', exact: true })).toBeVisible();
            await expect(page.locator('.customer-notification')).toHaveCount(5);
            await expect(page.locator('.notification-group')).toHaveCount(3);
            await expect(feed).not.toContainText('Private customer');
            await expect(page.locator('.notification-cancellation-details[open]')).toHaveCount(0);
            const cabbage = page.locator('.customer-notification').filter({ hasText: 'Cabbage' });
            await expect(cabbage.getByRole('heading', { name: 'Barangay Rosario', exact: true })).toBeVisible();
            await expect(cabbage.locator('.notification-description')).toHaveText(filipino ? 'Ang order mo na Cabbage ay kinansela.' : 'Your order for Cabbage was cancelled.');
            await expect.poll(() => cabbage.locator('.notification-seller-profile > img').evaluate(img => img.complete && img.naturalWidth > 0)).toBe(true);
            const pechay = page.locator('.customer-notification').filter({ hasText: 'Pechay' });
            await expect(pechay.locator('.notification-seller-initials')).toHaveText('BR');
            const talong = page.locator('.customer-notification').filter({ hasText: 'Talong' });
            await expect(talong.locator('.notification-seller-initials')).toHaveText('BR');
            await expect(talong.locator('.notification-seller-profile > img')).toHaveCount(0);
            const details = cabbage.locator('summary');
            for (const theme of ['light', 'dark']) {
                await page.evaluate(theme => document.documentElement.classList.toggle('dark', theme === 'dark'), theme);
                await page.evaluate(() => window.scrollTo(0, 0));
                await page.screenshot({ path: testInfo.outputPath(`notifications-${theme}.png`), fullPage: true, animations: 'disabled' });
                await details.focus();
                await page.keyboard.press('Enter');
                await expect(cabbage.locator('.order-cancellation-reason')).toBeVisible();
                await expect(cabbage).toContainText(filipino ? 'Ubos na ang stock' : 'Out of stock');
                await expect(cabbage).toContainText('<script>seller note</script>');
                await expect(cabbage.locator('script')).toHaveCount(0);
                await cabbage.screenshot({ path: testInfo.outputPath(`cancellation-${theme}.png`), animations: 'disabled' });
                expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBeTruthy();
                for (const control of await page.locator('.notifications-filters button, .notifications-orders-link, .notification-order-link, .notification-cancellation-details summary').all()) {
                    const bounds = await control.boundingBox();
                    expect(bounds.height).toBeGreaterThanOrEqual(44);
                    expect(bounds.x).toBeGreaterThanOrEqual(0);
                    expect(bounds.x + bounds.width).toBeLessThanOrEqual(width);
                }
                await page.keyboard.press('Enter');
                await expect(cabbage.locator('details')).not.toHaveAttribute('open');
            }
            await page.locator('.notifications-filters button').nth(1).click();
            await expect(page.locator('.customer-notification')).toHaveCount(2);
            await expect(page.locator('.notifications-filters button').nth(1)).toHaveAttribute('aria-pressed', 'true');
            const legacy = page.locator('.customer-notification').filter({ hasText: 'Kamatis' });
            await legacy.locator('summary').click();
            await expect(legacy).toContainText(filipino ? 'Walang naitalang dahilan.' : 'No reason recorded.');
            await page.locator('.notifications-filters button').first().click();
            await expect(page.locator('.customer-notification')).toHaveCount(5);
            await cabbage.locator('.notification-order-link').click();
            await expect(page).toHaveURL(/\/customer\/orders$/);
            expect(errors).toEqual([]);
        });
    }
}

test('notification empty states and cancellation filter use actual account activity', async ({ page }, testInfo) => {
    await signIn(page, 'notifications-empty@agrifarm.test', 390);
    await expect(page.locator('.customer-notification')).toHaveCount(0);
    await expect(page.getByRole('heading', { name: 'You’re all caught up' })).toBeVisible();
    await page.locator('.notification-page').screenshot({ path: testInfo.outputPath('notifications-empty.png') });
    await page.context().clearCookies();
    await signIn(page, 'notifications-delivery@agrifarm.test', 390);
    await expect(page.locator('.customer-notification')).toHaveCount(1);
    await page.locator('.notifications-filters button').nth(1).click();
    await expect(page.getByRole('heading', { name: 'No cancelled items' })).toBeVisible();
    await page.getByRole('button', { name: 'Show all notifications' }).click();
    await expect(page.locator('.customer-notification')).toHaveCount(1);
});
