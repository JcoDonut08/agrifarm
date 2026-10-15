import { test, expect } from './fixtures';
import { execFileSync } from 'node:child_process';
import AxeBuilder from '@axe-core/playwright';

function prepareSeller(requirePassword = true) {
    execFileSync('php', ['-r', String.raw`
        require 'vendor/autoload.php';
        $app = require 'bootstrap/app.php';
        $app->make(Illuminate\Contracts\Console\Kernel::class)->bootstrap();
        if (config('database.default') !== 'sqlite' || realpath(config('database.connections.sqlite.database')) !== realpath('database/playwright.sqlite')) throw new RuntimeException('Isolated database required');
        App\Models\User::where('email', 'seller@agrifarm.test')->firstOrFail()->forceFill(['seller_guide_pending' => $argv[1] === 'true', 'seller_guide_dismissed_at' => null, 'password_must_be_changed' => $argv[1] === 'true'])->save();
    `, String(requirePassword)], { env: process.env, stdio: 'pipe' });
}

test('Filipino automatic guide can be skipped and stays dismissed in a fresh browser session', async ({ page, browser }, testInfo) => {
    prepareSeller(false);
    await page.setViewportSize({ width: 390, height: 900 });
    await page.addInitScript(() => localStorage.setItem('agrifarm-seller-language', 'filipino'));
    async function signIn(tab) {
        await tab.goto('/login');
        await tab.getByLabel('Email address').fill('seller@agrifarm.test');
        await tab.getByLabel('Password', { exact: true }).fill('AgriFarm123!');
        await tab.getByRole('button', { name: 'Login', exact: true }).click();
        await expect(tab).toHaveURL(/seller\/dashboard/);
    }
    await signIn(page);
    const panel = page.locator('.seller-guide');
    await expect(panel).toContainText('Ako si Kuya Ani!');
    for (let step = 0; step < 6; step++) {
        if (step === 5) await expect(panel).toContainText('dito sa Mga Setting');
        await panel.getByRole('button', { name: 'Susunod', exact: true }).click();
    }
    await expect(panel.getByRole('heading', { name: 'Handa ka nang magsimula!', exact: true })).toBeVisible();
    await page.screenshot({ path: testInfo.outputPath('filipino-finished.png'), animations: 'disabled' });
    await panel.getByRole('button', { name: 'Laktawan', exact: true }).click();
    await expect(panel).toHaveCount(0);
    const fresh = await browser.newContext({ baseURL: testInfo.project.use.baseURL });
    try {
        const tab = await fresh.newPage();
        await signIn(tab);
        await expect(tab.locator('.seller-guide')).toHaveCount(0);
        await expect(tab.locator('.seller-navbar-actions .seller-guide-launch')).toHaveCount(0);
        await tab.goto('/seller/dashboard?section=settings');
        await expect(tab.getByRole('button', { name: 'Replay seller guide', exact: true })).toBeVisible();
    } finally { await fresh.close(); }
});

for (const width of [390, 768, 1024, 1440]) {
    test(`${width}px: first-login seller guide, every feature, completion and replay`, async ({ page }, testInfo) => {
        prepareSeller();
        const errors = [];
        page.on('pageerror', error => errors.push(error.message));
        await page.setViewportSize({ width, height: 900 });
        await page.goto('/login');
        await page.getByLabel('Email address').fill('seller@agrifarm.test');
        await page.getByLabel('Password', { exact: true }).fill('AgriFarm123!');
        await page.getByRole('button', { name: 'Login', exact: true }).click();
        await expect(page).toHaveURL(/\/seller\/temporary-password$/);
        await expect(page.locator('.seller-guide')).toHaveCount(0);
        await page.getByLabel('Temporary password', { exact: true }).fill('AgriFarm123!');
        await page.getByLabel('New password', { exact: true }).fill('Personal123!');
        await page.getByLabel('Confirm new password', { exact: true }).fill('Personal123!');
        await page.getByRole('button', { name: /Save|Update|Change/ }).click();
        const guide = page.getByRole('dialog', { name: 'Welcome to your store!', exact: true });
        await expect(guide).toBeVisible();
        const panel = page.locator('.seller-guide');
        const headings = ['Welcome to your store!', 'Add your products', 'Keep orders moving', 'Plan with harvest forecasts', 'Create and download reports', 'Make the workspace yours', 'You’re ready to get started!'];
        const images = new Set();
        const positions = [];
        for (let step = 0; step < headings.length; step++) {
            await expect(panel.getByRole('heading', { name: headings[step], exact: true })).toBeFocused();
            await expect(panel).toContainText(`${step + 1} / 7`);
            await expect.poll(() => panel.locator('img').evaluate(image => image.complete && image.naturalWidth > 0)).toBeTruthy();
            images.add(await panel.locator('img').getAttribute('src'));
            await expect(panel.locator('.seller-guide-spotlight')).toBeVisible();
            if (step === 1) {
                await page.setViewportSize({ width, height: 420 });
                await panel.getByRole('button', { name: 'Next', exact: true }).scrollIntoViewIfNeeded();
                await expect(panel.getByRole('button', { name: 'Next', exact: true })).toBeInViewport();
                await page.screenshot({ path: testInfo.outputPath('short-screen.png'), animations: 'disabled' });
                await page.setViewportSize({ width, height: 900 });
            }
            for (const theme of ['light', 'dark']) {
                await page.evaluate(theme => document.documentElement.classList.toggle('dark', theme === 'dark'), theme);
                await page.screenshot({ path: testInfo.outputPath(`${step}-${theme}.png`), animations: 'disabled' });
                const bounds = await panel.locator('.seller-guide-bubble').boundingBox();
                expect(bounds.x).toBeGreaterThanOrEqual(0);
                expect(bounds.x + bounds.width).toBeLessThanOrEqual(width);
                expect(bounds.y).toBeGreaterThanOrEqual(0);
                expect(bounds.y + bounds.height).toBeLessThanOrEqual(900);
                if (width > 800) {
                    await expect(panel.locator('.seller-guide-card')).toHaveClass(/is-positioned/);
                    const card = await panel.locator('.seller-guide-card').boundingBox();
                    const target = await panel.locator('.seller-guide-spotlight').boundingBox();
                    const overlaps = card.x < target.x + target.width && card.x + card.width > target.x && card.y < target.y + target.height && card.y + card.height > target.y;
                    expect(overlaps).toBe(false);
                    if (theme === 'light') positions.push(`${Math.round(card.x)},${Math.round(card.y)}`);
                }
            }
            if (step === 5) {
                await expect(page).toHaveURL(/section=settings/);
                await expect(panel).toContainText('Replay seller guide here in Settings');
                await expect(panel).toContainText('low-stock');
            }
            if (step === 3 || step === 5) {
                const audit = await new AxeBuilder({ page }).include('.seller-guide').withTags(['wcag2a', 'wcag2aa', 'wcag21aa']).analyze();
                expect(audit.violations).toEqual([]);
            }
            if (step === 3) {
                await expect(panel).toContainText('CSV or Excel');
                await panel.getByRole('button', { name: 'Back', exact: true }).click();
                await expect(panel.getByRole('heading', { name: headings[2], exact: true })).toBeVisible();
                await panel.getByRole('button', { name: 'Next', exact: true }).click();
            }
            if (step < headings.length - 1) await panel.getByRole('button', { name: 'Next', exact: true }).click();
        }
        expect(images.size).toBe(7);
        if (width > 800) expect(new Set(positions).size).toBeGreaterThanOrEqual(3);
        await panel.getByRole('button', { name: 'Go to products', exact: true }).click();
        await expect(panel).toHaveCount(0);
        await expect(page).toHaveURL(/section=products/);
        await expect(page.getByRole('button', { name: 'Add product', exact: true })).toBeVisible();
        await page.reload();
        await expect(panel).toHaveCount(0);
        await expect(page.locator('.seller-navbar-actions .seller-guide-launch')).toHaveCount(0);
        await page.goto('/seller/dashboard?section=settings');
        await page.getByRole('button', { name: 'Replay seller guide', exact: true }).click();
        await expect(guide).toBeVisible();
        await page.keyboard.press('Escape');
        await expect(panel).toHaveCount(0);
        await expect(page.locator('.seller-main h1').first()).toBeFocused();
        await page.goto('/seller/dashboard?section=settings');
        await page.getByRole('button', { name: 'Filipino', exact: false }).click();
        await page.getByRole('button', { name: 'Ulitin ang gabay', exact: true }).click();
        await expect(panel).toContainText('Ako si Kuya Ani!');
        await panel.getByRole('button', { name: 'Laktawan', exact: true }).click();
        await expect(panel).toHaveCount(0);
        await page.reload();
        await expect(panel).toHaveCount(0);
        expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBeTruthy();
        expect(errors).toEqual([]);
    });
}
