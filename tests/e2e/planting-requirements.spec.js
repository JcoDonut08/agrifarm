import { expect, test } from './fixtures';
import { execFileSync } from 'node:child_process';

test.beforeEach(() => {
    execFileSync('php', ['-r', String.raw`
        require 'vendor/autoload.php';
        $app = require 'bootstrap/app.php';
        $app->make(Illuminate\Contracts\Console\Kernel::class)->bootstrap();
        if (config('database.default') !== 'sqlite' || realpath(config('database.connections.sqlite.database')) !== realpath('database/playwright.sqlite')) throw new RuntimeException('Isolated database required');
        $seller = App\Models\User::where('email', 'seller@agrifarm.test')->firstOrFail();
        foreach (['Kangkong', 'Cucumber', 'Unknown crop'] as $crop) {
            $seller->plantingPlans()->create(['crop' => $crop, 'planting_month' => '2026-10-01', 'harvest_month' => '2026-11-01', 'days_to_harvest' => 30]);
        }
    `], { env: process.env, stdio: 'pipe' });
});

for (const width of [390, 768, 1440]) {
    test(`${width}px: saved plans show sourced growing requirements in both languages and themes`, async ({ page }, testInfo) => {
        await page.setViewportSize({ width, height: 1000 });
        await page.addInitScript(() => {
            localStorage.setItem('agrifarm-theme', 'light');
            if (!localStorage.getItem('agrifarm-seller-language')) localStorage.setItem('agrifarm-seller-language', 'english');
        });
        const errors = [];
        page.on('pageerror', error => errors.push(error.message));
        await page.goto('/login');
        await page.getByLabel('Email address').fill('seller@agrifarm.test');
        await page.getByLabel('Password', { exact: true }).fill('AgriFarm123!');
        await page.getByRole('button', { name: 'Login', exact: true }).click();
        await expect(page).toHaveURL(/\/seller\/dashboard$/);
        await page.goto('/seller/dashboard?section=forecasting');
        const panel = page.locator('.forecast-planting-plan');
        const kangkong = panel.locator('li').filter({ has: page.locator('.forecast-plan-crop strong', { hasText: /^Kangkong$/ }) });
        const guide = kangkong.locator('.forecast-plan-requirements');
        await expect(panel.locator('li')).toHaveCount(3);
        await expect(guide).not.toHaveAttribute('open', '');
        await guide.locator('summary').focus();
        await page.keyboard.press('Enter');
        await expect(guide).toHaveAttribute('open', '');
        await expect(guide.locator('.forecast-requirements-scope')).toContainText('upland kangkong');
        await expect(guide.locator('.forecast-requirements-grid')).toContainText('pH 5.5–6.5');
        await expect(guide.locator('.forecast-requirements-grid dd').first()).toHaveText('Not specified in this reference.');
        const source = guide.locator('.forecast-requirements-source a');
        await expect(source).toHaveAttribute('href', 'https://ati2.da.gov.ph/ati-car/content/sites/default/files/2022-12/urban_agriculture_for_upland.pdf');
        await expect(source).toHaveAttribute('target', '_blank');
        await expect(guide.locator('.forecast-requirements-source time')).toHaveAttribute('datetime', '2026-10-16');

        const cucumber = panel.locator('li').filter({ has: page.locator('.forecast-plan-crop strong', { hasText: /^Cucumber$/ }) });
        await cucumber.locator('summary').click();
        await expect(cucumber.locator('.forecast-requirements-source a')).toContainText('Pipino');
        const unknown = panel.locator('li').filter({ hasText: 'Unknown crop' });
        await unknown.locator('summary').click();
        await expect(unknown.locator('.forecast-requirements-unavailable')).toContainText('not available');

        for (const theme of ['light', 'dark']) {
            await page.evaluate(theme => document.documentElement.classList.toggle('dark', theme === 'dark'), theme);
            expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth + 1)).toBe(true);
            await kangkong.scrollIntoViewIfNeeded();
            const bounds = await panel.boundingBox();
            for (const field of await guide.locator('.forecast-requirements-grid > div').all()) {
                const box = await field.boundingBox();
                expect(box.x).toBeGreaterThanOrEqual(bounds.x);
                expect(box.x + box.width).toBeLessThanOrEqual(bounds.x + bounds.width);
            }
            await panel.screenshot({ path: testInfo.outputPath(`requirements-${width}-${theme}.png`) });
            await page.screenshot({ path: testInfo.outputPath(`forecast-${width}-${theme}.png`), fullPage: true });
        }
        await guide.locator('summary').focus();
        await page.keyboard.press('Space');
        await expect(guide).not.toHaveAttribute('open', '');

        // Preserve saved plans, and translate the guide without requiring a forecast run.
        await page.evaluate(() => localStorage.setItem('agrifarm-seller-language', 'filipino'));
        await page.reload();
        await expect(panel.locator('li')).toHaveCount(3);
        await expect(guide).not.toHaveAttribute('open', '');
        await guide.locator('summary').click();
        await expect(guide.locator('summary')).toContainText('Mga pangangailangan sa pagtatanim');
        await expect(guide.locator('.forecast-requirements-grid')).toContainText('Tubig at daluyan');
        await expect(guide.locator('.forecast-requirements-grid dd').first()).toHaveText('Hindi tinukoy sa sangguniang ito.');
        await expect(guide.locator('.forecast-requirements-source')).toContainText('Sinuri ang sanggunian');
        await panel.screenshot({ path: testInfo.outputPath(`requirements-${width}-filipino.png`) });
        expect(errors).toEqual([]);
    });
}
