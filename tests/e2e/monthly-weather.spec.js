import { expect, test } from './fixtures';
import { execFileSync } from 'node:child_process';
import fs from 'node:fs';

const artifact = JSON.parse(fs.readFileSync('storage/app/forecasting/monthly_weather_outlook.json', 'utf8'));
const display = value => new Intl.NumberFormat('en-PH', { minimumFractionDigits: 1, maximumFractionDigits: 1 }).format(value);

async function login(page) {
    await page.addInitScript(() => {
        localStorage.setItem('agrifarm-theme', 'light');
        if (!localStorage.getItem('agrifarm-seller-language')) localStorage.setItem('agrifarm-seller-language', 'english');
    });
    await page.goto('/login');
    await page.getByLabel('Email address').fill('seller@agrifarm.test');
    await page.getByLabel('Password', { exact: true }).fill('AgriFarm123!');
    await page.getByRole('button', { name: 'Login', exact: true }).click();
    await expect(page).toHaveURL(/\/seller\/dashboard$/);
    await page.goto('/seller/dashboard?section=forecasting');
}

function seedHarvest() {
    execFileSync('php', ['-r', String.raw`
        require 'vendor/autoload.php';
        $app = require 'bootstrap/app.php';
        $app->make(Illuminate\Contracts\Console\Kernel::class)->bootstrap();
        if (config('database.default') !== 'sqlite' || realpath(config('database.connections.sqlite.database')) !== realpath('database/playwright.sqlite')) throw new RuntimeException('Isolated database required');
        $seller = App\Models\User::where('email', 'seller@agrifarm.test')->firstOrFail();
        $month = Carbon\CarbonImmutable::now('Asia/Manila')->startOfMonth();
        $months = array_map(fn ($offset) => $month->addMonths($offset)->format('Y-m'), range(1, 12));
        $crops = [];
        foreach (['Kangkong', 'Malunggay'] as $crop) {
            $crops[$crop] = ['status' => 'fallback', 'unit' => 'season_strength', 'annual_profile_index' => array_fill(0, 12, .8),
                'forecast' => array_map(fn ($date) => ['month' => $date, 'value' => .8], $months)];
        }
        $seller->forecastRuns()->create(['source_filename' => 'browser-harvest.csv', 'result' => ['schema_version' => 2,
            'forecast_months' => $months, 'data_end_month' => $month->format('Y-m'), 'crops' => $crops]]);
    `], { env: process.env, stdio: 'pipe' });
}

for (const width of [390, 768, 1440]) {
    test(`${width}px: monthly outlook, model errors and crop advice work in both themes and languages`, async ({ page }, testInfo) => {
        seedHarvest();
        await page.setViewportSize({ width, height: 1000 });
        const errors = [];
        page.on('pageerror', error => errors.push(error.message));
        await login(page);
        const panel = page.locator('.forecast-monthly-weather');
        await expect(panel).toHaveCount(1);
        await expect(panel.getByRole('heading', { name: 'Monthly Weather Outlook', exact: true })).toBeVisible();
        await expect(panel.locator('.forecast-monthly-temperature-summary')).toHaveText(`Around ${Math.round(artifact.forecast[0].temperature_mean_c)}°C`);
        await expect(panel.locator('.forecast-monthly-rain-summary')).toHaveText('More rain than usual');
        await expect(panel.locator('.forecast-monthly-figures')).not.toBeVisible();
        await expect(panel.locator('.forecast-monthly-note').first()).toContainText('Before planting:');
        const collapsedText = await panel.evaluate(element => element.innerText);
        expect(collapsedText).not.toMatch(/\bmm\b|reference average|MAE|RMSE|ERA5/);
        await panel.screenshot({ path: testInfo.outputPath(`monthly-${width}-simple.png`) });
        const pipino = page.locator('.forecast-rec-card').filter({ has: page.getByRole('heading', { name: 'Pipino', exact: true }) });
        await expect(pipino.locator('.forecast-monthly-advice')).toContainText('More rain than usual is expected this month.');
        await expect(pipino.locator('.forecast-monthly-advice')).toContainText('If you plant Pipino:');
        await expect(pipino.locator('.forecast-monthly-advice')).toContainText('excess water can drain away');
        await expect(pipino.locator('.forecast-monthly-advice')).not.toContainText('reference average');
        const kangkong = page.locator('.forecast-rec-card').filter({ has: page.getByRole('heading', { name: 'Kangkong', exact: true }) });
        await expect(kangkong.locator('.forecast-monthly-advice')).toContainText('More rain than usual');
        await expect(kangkong.locator('.forecast-monthly-advice')).toContainText('keep the soil moist');
        await expect(kangkong.locator('.forecast-monthly-advice a')).toHaveAttribute('href', /urban_agriculture_for_upland/);
        await expect(kangkong.locator('.forecast-monthly-advice')).not.toContainText('No precaution');
        await pipino.locator('.forecast-card-details summary').click();
        await expect(pipino.locator('.forecast-card-details')).not.toContainText('Monthly weather basis');
        await expect(pipino.locator('.forecast-card-details')).toContainText('Based on published agricultural guidance.');
        await pipino.screenshot({ path: testInfo.outputPath(`crop-details-${width}.png`) });
        await pipino.locator('.forecast-card-details summary').click();
        await expect(pipino.locator('.forecast-monthly-advice a')).toHaveAttribute('href', /ati2\.da\.gov\.ph/);
        const adviceBefore = await pipino.locator('.forecast-monthly-advice').textContent();
        await panel.getByLabel('Forecast month').selectOption(artifact.forecast[2].month);
        await expect(panel.locator('.forecast-monthly-temperature-summary')).toHaveText(`Around ${Math.round(artifact.forecast[2].temperature_mean_c)}°C`);
        await expect(pipino.locator('.forecast-monthly-advice')).toHaveText(adviceBefore);
        await expect(panel).toContainText('Planting advice below is for');
        const details = panel.locator('details');
        await details.locator('summary').focus();
        await page.keyboard.press('Enter');
        await expect(details).toHaveAttribute('open', '');
        await expect(panel.locator('.forecast-monthly-figures')).toBeVisible();
        await expect(panel.locator('.forecast-monthly-figures dd').first()).toContainText(display(artifact.forecast[2].temperature_mean_c));
        await expect(details).toContainText('withheld ERA5');
        await expect(details.locator('tbody tr')).toHaveCount(6);
        await expect(details.locator('tbody tr').first()).toContainText(display(artifact.evaluation.temperature_mean_c.test.sarima.rmse));
        for (const theme of ['light', 'dark']) {
            await page.evaluate(theme => document.documentElement.classList.toggle('dark', theme === 'dark'), theme);
            expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth + 1)).toBe(true);
            await panel.scrollIntoViewIfNeeded();
            await panel.screenshot({ path: testInfo.outputPath(`monthly-${width}-${theme}.png`) });
            await page.locator('.forecast-card-grid').screenshot({ path: testInfo.outputPath(`crop-advice-${width}-${theme}.png`) });
        }
        await details.locator('summary').focus();
        await page.keyboard.press('Space');
        await expect(details).not.toHaveAttribute('open', '');
        await pipino.locator('.forecast-plan-button').click();
        await expect(pipino.locator('.forecast-plan-button')).toBeDisabled();
        await expect(page.locator('.forecast-plan-list')).toContainText('Pipino');
        await page.evaluate(() => localStorage.setItem('agrifarm-seller-language', 'filipino'));
        await page.reload();
        await expect(panel.getByRole('heading')).toHaveText('Buwanang Pagtataya ng Panahon');
        await expect(panel.getByLabel('Buwan ng pagtataya')).toBeVisible();
        await expect(panel.locator('.forecast-monthly-rain-summary')).toContainText('Mas maraming ulan kaysa karaniwan');
        await expect(panel.locator('.forecast-monthly-temperature-summary')).toHaveText(`Mga ${Math.round(artifact.forecast[0].temperature_mean_c)}°C`);
        await expect(pipino.locator('.forecast-monthly-advice')).toContainText('Mas maraming ulan kaysa karaniwan');
        await expect(pipino.locator('.forecast-monthly-advice')).toContainText('Kung magtatanim ng Pipino:');
        await expect(kangkong.locator('.forecast-monthly-advice')).toContainText('mamasa-masa');
        await expect(pipino.locator('.forecast-plan-button')).toBeDisabled();
        await panel.screenshot({ path: testInfo.outputPath(`monthly-${width}-filipino.png`) });
        expect(errors).toEqual([]);
    });
}

test('monthly outlook works without a harvest upload and handles missing or outdated results', async ({ page }) => {
    await login(page);
    const panel = page.locator('.forecast-monthly-weather');
    await expect(panel.getByLabel('Forecast month')).toBeVisible();
    await expect(page.locator('.forecast-rec-card')).toHaveCount(0);
    // Browser-only failure presentations; the real catalog and model files are untouched.
    let state = 'outdated';
    await page.route('**/seller/dashboard*', async route => {
        const response = await route.fetch();
        const type = response.headers()['content-type'] || '';
        if (type.includes('application/json')) {
            const data = await response.json();
            data.props.monthlyWeather = { ...data.props.monthlyWeather, status: state };
            await route.fulfill({ response, json: data });
        } else {
            const body = await response.text();
            const modified = body.replace(/(&quot;monthlyWeather&quot;:\{.*?&quot;status&quot;:&quot;)ready(&quot;)/s, `$1${state}$2`)
                .replace(/("monthlyWeather":\{.*?"status":")ready(")/s, `$1${state}$2`);
            await route.fulfill({ response, body: modified });
        }
    });
    await page.reload();
    await expect(panel).toContainText('needs an update');
    state = 'unavailable';
    await page.reload();
    await expect(panel).toContainText('currently unavailable');
});
