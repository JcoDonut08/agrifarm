import { expect, test } from '@playwright/test';
import path from 'node:path';

async function expectStrongMonthsToMatchCalendar(page, filipino = false) {
    const calendarMonths = await page.locator('.forecast-season-grid').evaluate(calendar => {
        const labels = [...calendar.querySelectorAll('thead th')].slice(1).map(th => th.textContent.trim().replace(/\s+\d{4}$/, ''));
        return Object.fromEntries([...calendar.querySelectorAll('tbody tr')].map(row => [
            row.querySelector('.forecast-calendar-crop > span:last-child').firstChild.textContent,
            [...row.querySelectorAll('td button')].flatMap((button, index) => button.classList.contains('is-best') ? [labels[index]] : []),
        ]));
    });
    for (const card of await page.locator('.forecast-rec-card').all()) {
        const crop = (await card.locator('h4').textContent()).trim();
        const months = calendarMonths[crop];
        expect(months.length).toBeGreaterThan(0);
        await expect(card.locator('.forecast-strong-months')).toHaveText(
            `${filipino ? 'Mga buwang malakas ang ani' : 'Strong harvest months'}: ${months.join(', ')}`,
        );
    }
}

async function expectRecommendationAlignment(page) {
    if (page.viewportSize().width <= 600) return;
    const cards = await page.locator('.forecast-rec-card').evaluateAll(elements => elements.map(card => ({
        height: card.getBoundingClientRect().height,
        rows: ['.forecast-rec-header', '.forecast-rec-summary', '.forecast-growing-time', '.forecast-planting-date', '.forecast-harvest-date', '.forecast-expected-harvest', '.forecast-plan-button', '.forecast-card-details summary']
            .map(selector => card.querySelector(selector).getBoundingClientRect().top),
    })));
    for (const card of cards.slice(1)) {
        expect(Math.abs(card.height - cards[0].height)).toBeLessThan(1);
        for (const [index, top] of card.rows.entries()) {
            expect(Math.abs(top - cards[0].rows[index])).toBeLessThan(1);
        }
    }
}

test('seller saves and removes planting choices with dated cards in both languages', async ({ page }, testInfo) => {
    await page.setViewportSize({ width: 390, height: 1000 });
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
    await page.getByLabel('Harvest file', { exact: true }).setInputFiles(path.resolve('docs/sample-data/synthetic_harvest_1_year.csv'));
    await page.getByRole('button', { name: 'Generate', exact: true }).click();
    await expect(page.locator('.forecast-saved')).toContainText('synthetic_harvest_1_year.csv', { timeout: 60_000 });
    await expect(page.locator('.forecast-planting-date')).toHaveCount(3);
    await expect(page.locator('.forecast-growing-time strong').first()).toHaveText(/\d+ days/);
    await expectStrongMonthsToMatchCalendar(page);
    await expect(page.locator('.forecast-planting-plan')).toHaveCount(0);

    const firstCard = page.locator('.forecast-rec-card').first();
    const firstCrop = (await firstCard.locator('h4').textContent()).trim();
    const plantingMonth = await firstCard.locator('.forecast-planting-date strong').textContent();
    const harvestMonth = await firstCard.locator('.forecast-harvest-date strong').textContent();
    await firstCard.locator('.forecast-plan-button').focus();
    await page.keyboard.press('Enter');
    await expect(page.locator('.forecast-plan-list li')).toHaveCount(1);
    await expect(page.getByRole('heading', { name: 'Your planting plan', exact: true })).toBeFocused();
    await expect(page.locator('.forecast-plan-list li').first()).toContainText(firstCrop);
    await expect(page.locator('.forecast-plan-list dd')).toHaveText([plantingMonth, harvestMonth]);
    await expect(firstCard.locator('.forecast-plan-button')).toHaveText('Saved to planting plan');
    await expect(firstCard.locator('.forecast-plan-button')).toBeDisabled();
    await page.reload();
    await expect(page.locator('.forecast-plan-list li')).toHaveCount(1);
    await expect(firstCard.locator('.forecast-plan-button')).toBeDisabled();
    await expect(page.locator('.forecast-plan-list dd')).toHaveText([plantingMonth, harvestMonth]);

    await page.locator('.forecast-rec-card').nth(1).locator('.forecast-plan-button').click();
    await expect(page.locator('.forecast-plan-list li')).toHaveCount(2);
    for (const width of [390, 768, 1440]) {
        await page.setViewportSize({ width, height: 1000 });
        for (const theme of ['light', 'dark']) {
            if (theme === 'dark') await page.getByRole('button', { name: 'Switch to dark mode' }).click();
            expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBeTruthy();
            await expectRecommendationAlignment(page);
            await page.locator('.forecast-recommendations').screenshot({ path: testInfo.outputPath(`recommendations-${width}-${theme}.png`) });
            await page.locator('.forecast-planting-plan').screenshot({ path: testInfo.outputPath(`planting-plan-${width}-${theme}.png`) });
            if (width === 1440) {
                await page.evaluate(() => window.scrollTo(0, 0));
                await page.screenshot({ path: testInfo.outputPath(`forecast-page-${theme}.png`), fullPage: true });
            }
            if (theme === 'dark') await page.getByRole('button', { name: 'Switch to light mode' }).click();
        }
    }

    await firstCard.locator('.forecast-card-details summary').focus();
    await page.keyboard.press('Enter');
    await expect(firstCard.locator('.forecast-card-details')).toHaveAttribute('open', '');
    await expect(firstCard.getByText('Based on illustrative seasonal references for Pasig.', { exact: true })).toBeVisible();
    await expectRecommendationAlignment(page);
    await page.keyboard.press('Enter');
    await expect(firstCard.locator('.forecast-card-details')).not.toHaveAttribute('open', '');

    await page.getByRole('button', { name: `Remove ${firstCrop} from planting plan`, exact: true }).focus();
    await page.keyboard.press('Enter');
    await expect(page.locator('.forecast-plan-list li')).toHaveCount(1);
    await expect(firstCard.locator('.forecast-plan-button')).toBeEnabled();
    await page.reload();
    await expect(page.locator('.forecast-plan-list li')).toHaveCount(1);
    await expect(page.locator('.forecast-plan-list li').filter({ hasText: firstCrop })).toHaveCount(0);

    await page.evaluate(() => localStorage.setItem('agrifarm-seller-language', 'filipino'));
    await page.reload();
    await expect(page.getByRole('heading', { name: 'Iyong plano sa pagtatanim', exact: true })).toBeVisible();
    await expect(page.locator('.forecast-planting-date').first()).toContainText('Itanim sa');
    await expect(page.locator('.forecast-growing-time').first()).toContainText('araw');
    await expectStrongMonthsToMatchCalendar(page, true);
    await firstCard.locator('.forecast-plan-button').focus();
    await page.keyboard.press('Enter');
    await expect(page.locator('.forecast-plan-list li')).toHaveCount(2);
    await expect(page.getByRole('status').filter({ hasText: 'Na-save sa iyong plano sa pagtatanim.' })).toBeVisible();
    await expect(firstCard.locator('.forecast-plan-button')).toHaveText('Na-save sa plano');
    for (const width of [390, 768, 1440]) {
        await page.setViewportSize({ width, height: 1000 });
        expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBeTruthy();
        await expectRecommendationAlignment(page);
        await page.locator('.forecast-recommendations').screenshot({ path: testInfo.outputPath(`recommendations-filipino-${width}.png`) });
        await page.locator('.forecast-planting-plan').screenshot({ path: testInfo.outputPath(`planting-plan-filipino-${width}.png`) });
    }
    await page.locator('.forecast-plan-remove').first().click();
    await expect(page.locator('.forecast-plan-list li')).toHaveCount(1);
    await page.locator('.forecast-plan-remove').first().click();
    await expect(page.locator('.forecast-planting-plan')).toHaveCount(0);
    await page.reload();
    await expect(page.locator('.forecast-planting-plan')).toHaveCount(0);
    await expect(page.locator('.forecast-plan-button:disabled')).toHaveCount(0);
    await page.route('**/seller/planting-plans', route => route.continue({
        postData: JSON.stringify({ ...JSON.parse(route.request().postData()), planting_month: '2000-01' }),
    }));
    await firstCard.locator('.forecast-plan-button').click();
    await expect(page.getByRole('alert')).toContainText('Nagbago na ang buwan ng pagtatanim');
    await expect(page.locator('.forecast-planting-plan')).toHaveCount(0);
    await expect(firstCard.locator('.forecast-plan-button')).toBeEnabled();
    await page.unroute('**/seller/planting-plans');
    await firstCard.locator('.forecast-plan-button').click();
    await expect(page.locator('.forecast-plan-list li')).toHaveCount(1);
    await expect(page.getByRole('alert')).toHaveCount(0);
    await page.locator('.forecast-plan-remove').click();
    await expect(page.locator('.forecast-planting-plan')).toHaveCount(0);
    expect(errors).toEqual([]);
});
