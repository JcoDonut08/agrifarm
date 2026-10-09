import { expect, test } from '@playwright/test';
import { execFileSync } from 'node:child_process';
import path from 'node:path';

test.beforeAll(() => {
    execFileSync('php', ['-r', String.raw`
        require 'vendor/autoload.php';
        $app = require 'bootstrap/app.php';
        $app->make(Illuminate\Contracts\Console\Kernel::class)->bootstrap();
        if (config('database.default') !== 'sqlite' || realpath(config('database.connections.sqlite.database')) !== realpath('database/playwright.sqlite')) {
            throw new RuntimeException('Expected the isolated browser-test database.');
        }
        $seller = App\Models\User::where('email', 'seller@agrifarm.test')->firstOrFail();
        $file = new Illuminate\Http\UploadedFile(base_path('docs/sample-data/synthetic_harvest_1_year.csv'),
            'synthetic_harvest_1_year.csv', 'text/csv', null, true);
        $result = app(App\Services\ForecastService::class)->generateForecast($file);
        if (!$result || isset($result['error'])) {
            throw new RuntimeException('The original full sample must generate successfully.');
        }
        $seller->forecastRuns()->create(['source_filename' => 'synthetic_harvest_1_year.csv', 'result' => $result]);
    `], { cwd: process.cwd(), env: { ...process.env, APP_ENV: 'local', DB_CONNECTION: 'sqlite',
        DB_DATABASE: path.resolve('database/playwright.sqlite'), CACHE_STORE: 'file' } });
});

for (const width of [390, 768, 1440]) {
    test(`new crop recommendation and planting plan at ${width}px`, async ({ page }, testInfo) => {
        const errors = [];
        page.on('pageerror', error => errors.push(error.message));
        await page.setViewportSize({ width, height: 1000 });
        await page.addInitScript(() => {
            if (!localStorage.getItem('agrifarm-seller-language')) localStorage.setItem('agrifarm-seller-language', 'english');
            if (!localStorage.getItem('agrifarm-theme')) localStorage.setItem('agrifarm-theme', 'light');
        });
        await page.goto('/login');
        await page.getByLabel('Email address').fill('seller@agrifarm.test');
        await page.getByLabel('Password', { exact: true }).fill('AgriFarm123!');
        await page.getByRole('button', { name: 'Login', exact: true }).click();
        await expect(page).toHaveURL(/\/seller\/dashboard$/);
        await page.goto('/seller/dashboard?section=forecasting');
        const cards = page.locator('.forecast-rec-card');
        const newCrop = cards.filter({ has: page.getByRole('heading', { name: 'Pipino', exact: true }) });
        await expect(cards).toHaveCount(3);
        await expect(cards.locator('h4')).toHaveText(['Malunggay', 'Kangkong', 'Pipino']);
        await expect(page.locator('.forecast-saved')).toContainText('synthetic_harvest_1_year.csv');
        await expect(newCrop).toHaveCount(1);
        for (const language of ['english', 'filipino']) {
            await page.evaluate(language => localStorage.setItem('agrifarm-seller-language', language), language);
            await page.reload();
            await expect(newCrop.locator('.forecast-new-crop')).toHaveText(language === 'english'
                ? 'New crop to consider' : 'Bagong pananim na maaaring subukan');
            await expect(newCrop.locator('.forecast-expected-harvest')).toHaveText(language === 'english'
                ? 'Based on an agricultural guide' : 'Batay sa gabay sa pagsasaka');
            const picture = newCrop.locator('img.forecast-crop-picture');
            await expect(picture).toBeVisible();
            await expect(picture).toHaveAttribute('src', '/images/forecast-pipino.webp');
            await expect.poll(() => picture.evaluate(image => image.complete && image.naturalWidth === 256)).toBeTruthy();
            await expect(newCrop.locator('.forecast-rec-summary li').first()).toHaveText(language === 'english'
                ? 'Suited to warm weather; needs drainage in rain' : 'Angkop sa mainit na panahon; kailangan ng daluyan ng tubig kapag umuulan');
            await expect(newCrop.locator('.forecast-strong-months')).toHaveText(language === 'english'
                ? 'Strong harvest months: Jan, Feb, Mar, Apr, May, Dec' : 'Mga buwang malakas ang ani: Ene, Peb, Mar, Abr, May, Dis');
            await newCrop.locator('summary').click();
            await expect(newCrop.locator('details')).toContainText(language === 'english'
                ? 'not in your uploaded harvest records' : 'Wala ang pananim na ito');
            const guide = newCrop.getByRole('link', { name: /DA–ATI MIMAROPA/ });
            await expect(guide).toHaveAttribute('href', 'https://ati2.da.gov.ph/ati-4b/content/sites/default/files/2024-12/GABAY%20SA%20PRODUKSYON%20NG%20PIPINO.pdf');
            await expect(guide).toHaveAttribute('target', '_blank');
            await expect(newCrop.getByRole('link', { name: /DA Regional Field Office 02/ }))
                .toHaveAttribute('href', 'https://cagayanvalley.da.gov.ph/wp-content/uploads/2018/02/Cucumber-Production-Guide.pdf');
            await expect(newCrop).not.toContainText(/Estimated harvest|Tantyang ani| kg/);
            await newCrop.locator('summary').click();
            for (const theme of ['light', 'dark']) {
                await page.evaluate(theme => {
                    localStorage.setItem('agrifarm-theme', theme);
                    document.documentElement.classList.toggle('dark', theme === 'dark');
                }, theme);
                expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBeTruthy();
                if (width > 600) {
                    const tops = await cards.evaluateAll(cards => cards.map(card => card.querySelector('.forecast-plan-button').getBoundingClientRect().top));
                    expect(Math.max(...tops) - Math.min(...tops)).toBeLessThan(1);
                }
                await page.locator('.forecast-recommendations').screenshot({ path: testInfo.outputPath(`new-crop-${language}-${theme}.png`) });
            }
        }
        const planButton = newCrop.locator('.forecast-plan-button');
        if (await planButton.isEnabled()) await planButton.click();
        await expect(planButton).toBeDisabled();
        await expect(page.locator('.forecast-plan-list')).toContainText('Pipino');
        const plan = page.locator('.forecast-plan-list li').filter({ hasText: 'Pipino' });
        await plan.getByRole('button').click();
        const confirmation = page.getByRole('dialog');
        await confirmation.getByRole('button', { name: 'Alisin ang plano', exact: true }).click();
        await expect(plan).toHaveCount(0);
        await expect(planButton).toBeEnabled();
        expect(errors).toEqual([]);
    });
}
