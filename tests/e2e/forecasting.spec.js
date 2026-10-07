import { expect, test } from '@playwright/test';
import path from 'node:path';
import fs from 'node:fs';

for (const width of [390, 768, 1440]) {
    test(`harvest forecasts at ${width}px`, async ({ page }, testInfo) => {
        await page.setViewportSize({ width, height: 1000 });
        await page.addInitScript(() => {
            localStorage.setItem('agrifarm-theme', 'light');
            localStorage.setItem('agrifarm-seller-language', 'english');
        });
        const errors = [];
        page.on('pageerror', error => errors.push(error.message));
        await page.goto('/login');
        await page.getByLabel('Email address').fill({ 390: 'seller@agrifarm.test', 768: 'brgyrosario@gmail.com', 1440: 'brgymaybunga@gmail.com' }[width]);
        await page.getByLabel('Password', { exact: true }).fill('AgriFarm123!');
        await page.getByRole('button', { name: 'Login', exact: true }).click();
        await expect(page).toHaveURL(/\/seller\/dashboard$/);
        await page.goto('/seller/dashboard?section=forecasting');
        await expect(page.getByRole('heading', { name: 'Harvest Forecast', exact: true })).toBeVisible();
        await expect(page.getByRole('button', { name: 'Generate', exact: true })).toBeDisabled();
        await expect(page.getByRole('heading', { name: 'Upload harvest records', exact: true })).toBeVisible();
        await expect(page.locator('.forecast-file-help, .forecast-sample-link, .forecast-upload-panel summary')).toHaveCount(0);
        await page.screenshot({ path: testInfo.outputPath(`forecast-upload-${width}.png`), fullPage: true });

        const upload = page.getByLabel('Harvest file', { exact: true });
        await upload.setInputFiles(path.resolve('docs/sample-data/synthetic_harvest_1_year.csv'));
        await expect(page.locator('.forecast-file-badge')).toContainText('synthetic_harvest_1_year.csv');
        const cropImageResponse = page.waitForResponse(response => response.url().endsWith('/images/forecast-crops.png'));
        await page.getByRole('button', { name: 'Generate', exact: true }).click();
        await expect(page.locator('.forecast-saved')).toContainText('synthetic_harvest_1_year.csv', { timeout: 60_000 });
        expect((await cropImageResponse).ok()).toBeTruthy();
        const visualCalendar = page.getByRole('region', { name: 'Visual harvest calendar', exact: true });
        await expect(visualCalendar).toBeVisible();
        await expect(page.getByRole('heading', { name: 'Your harvest calendar', exact: true })).toBeFocused();
        await expect(page.locator('.forecast-history-note')).toHaveText('Some crops have fewer than 24 recorded months. Their guide uses seasonal references.');
        if (width === 390) {
            for (const noteWidth of [390, 768, 1440]) {
                await page.setViewportSize({ width: noteWidth, height: 1000 });
                for (const theme of ['light', 'dark']) {
                    if (theme === 'dark') await page.getByRole('button', { name: 'Switch to dark mode' }).click();
                    expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBeTruthy();
                    await page.locator('.forecast-visual-calendar').screenshot({ path: testInfo.outputPath(`forecast-history-note-${noteWidth}-${theme}.png`) });
                    if (theme === 'dark') await page.getByRole('button', { name: 'Switch to light mode' }).click();
                }
            }
            await page.setViewportSize({ width, height: 1000 });
        }
        const calendarBounds = await page.locator('.forecast-visual-calendar').boundingBox();
        const recommendationBounds = await page.locator('.forecast-recommendations').boundingBox();
        const uploadBounds = await page.locator('.forecast-upload-panel').boundingBox();
        expect(calendarBounds.y + calendarBounds.height).toBeLessThanOrEqual(recommendationBounds.y);
        expect(recommendationBounds.y + recommendationBounds.height).toBeLessThanOrEqual(uploadBounds.y);
        await expect(visualCalendar.locator('tbody tr')).toHaveCount(20);
        await expect(page.locator('.forecast-rec-card [role="img"]')).toHaveCount(3);
        await expect(page.locator('.forecast-rec-summary').first()).toContainText(/rain|heat/i);
        await expect(page.locator('.seller-forecast table')).toHaveCount(1);
        await expect(visualCalendar.getByRole('columnheader')).toHaveCount(13);
        await expect(visualCalendar.locator('tbody tr').first().getByRole('button')).toHaveCount(12);
        await expect(page.getByRole('button', { name: /Next months|Previous months|Show all .* crops|Show full calendar/ })).toHaveCount(0);
        await expect(page.locator('.forecast-season-legend')).toHaveText('Peak seasonOkay seasonOff-season');
        const seasonColors = await visualCalendar.evaluate(element => ['best', 'good', 'quiet'].map(level => getComputedStyle(element.querySelector('.is-' + level)).backgroundColor));
        expect(seasonColors).toEqual(['rgb(21, 128, 61)', 'rgb(254, 240, 138)', 'rgb(254, 202, 202)']);
        await visualCalendar.evaluate(element => { element.scrollLeft = element.scrollWidth; });
        await expect(visualCalendar.getByRole('columnheader', { name: 'Dec 2026' })).toBeVisible();
        const stickyCrop = await visualCalendar.locator('tbody th').first().boundingBox();
        const gridBounds = await visualCalendar.boundingBox();
        expect(Math.abs(stickyCrop.x - gridBounds.x)).toBeLessThan(6);
        await page.screenshot({ path: testInfo.outputPath(`forecast-scroll-right-${width}.png`) });
        await visualCalendar.evaluate(element => { element.scrollLeft = 0; });
        await visualCalendar.locator('tbody tr').last().getByRole('button').first().click();
        await expect(page.locator('.forecast-month-detail')).toBeInViewport({ ratio: 1 });
        await visualCalendar.locator('button').first().focus();
        await page.keyboard.press('Enter');
        await expect(page.locator('.forecast-month-detail')).toContainText('Seasonal planting guide');
        await expect(page.locator('.forecast-rec-card')).toHaveCount(3);
        await expect(page.locator('.forecast-upload-zone')).toBeVisible();
        await expect(page.locator('.forecast-crop-details')).toHaveCount(0);
        await expect(page.locator('.forecast-card-details[open]')).toHaveCount(0);
        await expect(page.getByRole('group', { name: 'Forecast display unit' })).not.toBeVisible();
        await expect(page.locator('.forecast-updated')).toBeVisible();
        await expect(page.locator('.forecast-rec-card').first()).toContainText('Harvest around');
        await expect(page.locator('.forecast-rec-card').first()).toContainText('About');
        await expect(page.locator('.forecast-expected-harvest').first()).toHaveText('Seasonal planting guide');
        await expect(page.locator('.forecast-card-details li').first()).not.toBeVisible();
        await page.evaluate(() => window.scrollTo(0, 0));
        await page.screenshot({ path: testInfo.outputPath(`forecast-profile-${width}.png`), fullPage: true });
        const why = page.locator('.forecast-card-details summary').first();
        await why.focus();
        await page.keyboard.press('Enter');
        await expect(page.locator('.forecast-card-details').first()).toContainText('illustrative seasonal references');
        await expect(page.locator('.forecast-card-details li').first()).toBeVisible();
        await page.keyboard.press('Enter');
        const overflow = await page.evaluate(() => ({
            width: innerWidth,
            documentWidth: document.documentElement.scrollWidth,
            elements: [...document.querySelectorAll('.seller-main, .seller-forecast, .forecast-panel, .forecast-results, .forecast-card-grid, .forecast-season-grid, .forecast-season-grid table, .forecast-season-legend')].map(element => ({
                classes: element.className, width: element.getBoundingClientRect().width,
                display: getComputedStyle(element).display, columns: getComputedStyle(element).gridTemplateColumns,
                overflow: getComputedStyle(element).overflowX,
            })),
            overflowing: [...document.querySelectorAll('.seller-forecast *')].filter(element => element.getBoundingClientRect().right > innerWidth).slice(0, 6).map(element => ({ classes: element.className, tag: element.tagName, right: element.getBoundingClientRect().right, overflow: getComputedStyle(element).overflowX })),
        }));
        if (overflow.documentWidth > overflow.width) await testInfo.attach('overflow', { body: JSON.stringify(overflow, null, 2), contentType: 'application/json' });
        expect(overflow.documentWidth).toBeLessThanOrEqual(overflow.width);
        await visualCalendar.screenshot({ path: testInfo.outputPath(`forecast-calendar-${width}.png`) });

        await expect(page.locator('.forecast-month-detail')).not.toContainText('kg');
        await expect(page.locator('.forecast-saved')).toBeVisible();
        await upload.setInputFiles(path.resolve('docs/sample-data/synthetic_harvest_4_years.csv'));
        await page.getByRole('button', { name: 'Generate', exact: true }).click();
        const farmRow = page.locator('.forecast-season-grid tbody tr').filter({ hasText: 'Your records' }).first();
        await expect(farmRow).toBeVisible({ timeout: 120_000 });
        await expect(page.locator('.forecast-history-note')).toHaveCount(0);
        await expect(page.locator('.forecast-month-detail')).toHaveCount(0);
        await expect(page.locator('.forecast-upload-zone')).toBeVisible();
        await expect(page.locator('.forecast-expected-harvest').filter({ hasText: 'Estimated harvest:' }).first()).toHaveText(/Estimated harvest: \d+–\d+ kg/);
        await farmRow.getByRole('button').first().click();
        await expect(page.locator('.forecast-month-detail')).toContainText(/Estimated harvest: \d+–\d+ kg/);
        const estimatedCard = page.locator('.forecast-rec-card').filter({ hasText: 'Estimated harvest:' }).first();
        await estimatedCard.locator('summary').click();
        await expect(estimatedCard.getByText('The harvest range is an 80%', { exact: false })).toBeVisible();
        await estimatedCard.locator('summary').click();
        await page.locator('.forecast-how-it-works summary').click();
        await expect(page.locator('.forecast-how-it-works').getByText('At least 24 recorded months', { exact: false })).toBeVisible();
        await page.locator('.forecast-how-it-works summary').click();
        await page.getByText('Model details and crop references', { exact: true }).click();
        await expect(page.locator('.forecast-explanation')).toContainText('Accuracy on real barangay records is future work');
        await expect(page.locator('.forecast-explanation')).toContainText('SARIMA (');
        const calendar = visualCalendar;
        await calendar.evaluate(element => { element.scrollLeft = element.scrollWidth; });
        await expect(page.getByRole('columnheader', { name: 'Dec 2026' })).toBeVisible();
        expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBeTruthy();
        await calendar.evaluate(element => { element.scrollLeft = 0; });
        await page.getByText('Model details and crop references', { exact: true }).click();
        await page.reload();
        await expect(page.locator('.forecast-rec-card')).toHaveCount(3);
        await expect(page.locator('.forecast-crop-details')).toHaveCount(0);
        await expect(page.locator('.forecast-upload-zone')).toBeVisible();
        await expect(page.locator('.forecast-saved')).toBeVisible();
        await expect(page.locator('.forecast-saved')).toContainText('synthetic_harvest_4_years.csv');
        await expect(visualCalendar.getByRole('columnheader')).toHaveCount(13);
        await expect(visualCalendar.locator('tbody tr')).toHaveCount(20);
        await page.evaluate(() => window.scrollTo(0, 0));
        await page.screenshot({ path: testInfo.outputPath(`forecast-farm-${width}.png`), fullPage: true });
        await page.getByRole('button', { name: 'Switch to dark mode' }).click();
        const darkColors = await visualCalendar.evaluate(element => ['best', 'good', 'quiet'].map(level => getComputedStyle(element.querySelector('.is-' + level)).backgroundColor));
        expect(darkColors).toEqual(['rgb(20, 83, 45)', 'rgb(250, 204, 21)', 'rgb(127, 29, 29)']);
        await page.screenshot({ path: testInfo.outputPath(`forecast-dark-${width}.png`), fullPage: true });
        expect(errors).toEqual([]);
    });
}

test('partial crop upload uses shifted dates and recommends new crops', async ({ page }) => {
    await page.setViewportSize({ width: 1440, height: 1000 });
    await page.addInitScript(() => localStorage.setItem('agrifarm-seller-language', 'english'));
    await page.goto('/login');
    await page.getByLabel('Email address').fill('brgystothomas@gmail.com');
    await page.getByLabel('Password', { exact: true }).fill('AgriFarm123!');
    await page.getByRole('button', { name: 'Login', exact: true }).click();
    await expect(page).toHaveURL(/\/seller\/dashboard$/);
    await page.goto('/seller/dashboard?section=forecasting');

    const crops = new Set(['Pechay', 'Kamatis', 'Talong', 'Okra', 'Mustasa']);
    const lines = fs.readFileSync(path.resolve('docs/sample-data/synthetic_harvest_1_year.csv'), 'utf8').trim().split(/\r?\n/);
    const rows = lines.slice(1).filter(line => crops.has(line.split(',')[1])).map(line => {
        const month = line.split(',')[0].split(' ')[0];
        return ['July', 'August', 'September', 'October', 'November', 'December'].includes(month)
            ? line.replace('2025', '2024') : line;
    });
    await page.getByLabel('Harvest file', { exact: true }).setInputFiles({ name: 'five-crops-through-june.csv', mimeType: 'text/csv', buffer: Buffer.from([lines[0], ...rows].join('\n')) });
    await page.getByRole('button', { name: 'Generate', exact: true }).click();
    await expect(page.locator('.forecast-saved')).toContainText('five-crops-through-june.csv', { timeout: 60_000 });
    await expect(page.locator('.forecast-visual-calendar .forecast-results-heading')).toContainText('Jul 2025 – Jun 2026');
    await expect(page.locator('.forecast-season-grid thead th')).toHaveCount(13);
    await expect(page.locator('.forecast-season-grid tbody tr')).toHaveCount(20);
    await expect(page.locator('.forecast-season-grid thead')).toContainText('Jul 2025');
    await expect(page.locator('.forecast-season-grid thead')).toContainText('Jun 2026');
    await expect(page.locator('.forecast-rec-card')).toHaveCount(3);
    await expect(page.locator('.forecast-rec-card .forecast-new-crop').first()).toHaveText('New crop for you');
    await expect(page.locator('.forecast-rec-card').filter({ hasText: 'New crop for you' }).first().locator('.forecast-expected-harvest')).toHaveText('Seasonal planting guide');
});

test('Filipino Excel upload and row errors keep the saved result', async ({ page }, testInfo) => {
    await page.setViewportSize({ width: 390, height: 1000 });
    await page.addInitScript(() => {
        localStorage.setItem('agrifarm-theme', 'light');
        localStorage.setItem('agrifarm-seller-language', 'filipino');
    });
    const errors = [];
    page.on('pageerror', error => errors.push(error.message));
    await page.goto('/login');
    await page.getByLabel('Email address').fill('seller@agrifarm.test');
    await page.getByLabel('Password', { exact: true }).fill('AgriFarm123!');
    await page.getByRole('button', { name: 'Login', exact: true }).click();
    await expect(page).toHaveURL(/\/seller\/dashboard$/);
    await page.goto('/seller/dashboard?section=forecasting');
    await expect(page.getByRole('heading', { name: 'Pagtataya ng Ani', exact: true })).toBeVisible();
    await expect(page.locator('.forecast-file-help, .forecast-sample-link, .forecast-upload-panel summary')).toHaveCount(0);

    for (const width of [390, 768, 1440]) {
        await page.setViewportSize({ width, height: 1000 });
        await page.locator('.forecast-upload-panel').screenshot({ path: testInfo.outputPath(`forecast-filipino-upload-light-${width}.png`) });
        await page.getByRole('button', { name: 'Lumipat sa madilim na tema' }).click();
        expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBeTruthy();
        await page.locator('.forecast-upload-panel').screenshot({ path: testInfo.outputPath(`forecast-filipino-upload-dark-${width}.png`) });
        await page.getByRole('button', { name: 'Lumipat sa maliwanag na tema' }).click();
    }
    await page.setViewportSize({ width: 390, height: 1000 });
    const droppedFile = await page.evaluateHandle(() => {
        const transfer = new DataTransfer();
        transfer.items.add(new File(['Month,Crop,Harvest\nJanuary 2025,Pechay,0\n'], 'dropped.csv', { type: 'text/csv' }));
        return transfer;
    });
    await page.locator('.forecast-upload-zone').dispatchEvent('drop', { dataTransfer: droppedFile });
    await expect(page.locator('.forecast-file-badge')).toContainText('dropped.csv');
    await page.getByRole('button', { name: 'Alisin ang napiling file' }).click();
    await expect(page.locator('.forecast-file-badge')).toHaveCount(0);
    await expect(page.getByRole('button', { name: 'Bumuo', exact: true })).toBeDisabled();
    await droppedFile.dispose();

    const { default: ExcelJS } = await import('exceljs');
    const workbook = new ExcelJS.Workbook();
    workbook.addWorksheet('Harvest').addRows([
        ['Date', 'Crop', 'kg'], [new Date('2025-01-15T00:00:00Z'), 'Pechay', 0], ['Feb 2025', 'Pechay', 15],
    ]);
    const chooserPromise = page.waitForEvent('filechooser');
    await page.getByRole('button', { name: 'Pumili ng file ng ani', exact: true }).focus();
    await page.keyboard.press('Enter');
    const chooser = await chooserPromise;
    await chooser.setFiles({ name: 'harvest.xlsx', mimeType: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet', buffer: Buffer.from(await workbook.xlsx.writeBuffer()) });
    await page.getByRole('button', { name: 'Bumuo', exact: true }).click();
    await expect(page.locator('.forecast-saved')).toContainText('harvest.xlsx', { timeout: 60_000 });
    await expect(page.locator('.forecast-history-note')).toHaveText('May ilang pananim na kulang sa 24 buwang tala. Gabay batay sa panahon ang ginagamit para sa mga ito.');
    await expect(page.locator('.forecast-rec-card')).toHaveCount(3);
    await expect(page.locator('.forecast-upload-zone')).toBeVisible();
    await expect(page.locator('.forecast-expected-harvest').first()).toHaveText('Gabay batay sa panahon');
    await expect(page.getByRole('heading', { name: 'Kalendaryo ng iyong ani', exact: true })).toBeVisible();
    await expect(page.locator('.forecast-rec-card [role="img"]')).toHaveCount(3);
    await expect(page.locator('.forecast-card-details summary').first()).toHaveText('Bakit ito?');
    await expect(page.locator('.seller-forecast table')).toHaveCount(1);
    await expect(page.locator('.forecast-season-grid thead th')).toHaveCount(13);
    await expect(page.locator('.forecast-season-grid tbody tr')).toHaveCount(20);
    await page.locator('.forecast-season-grid tbody tr').filter({ hasText: 'Pechay' }).getByRole('button').first().click();
    await expect(page.locator('.forecast-month-detail')).toContainText('Gabay batay sa panahon');
    await expect(page.locator('.forecast-month-detail')).not.toContainText('kg');

    const upload = page.getByLabel('File ng ani', { exact: true });
    await upload.setInputFiles({ name: 'bad-dates.csv', mimeType: 'text/csv', buffer: Buffer.from('Month,Crop,Harvest\nwrong,Pechay,1\n') });
    await page.getByRole('button', { name: 'Bumuo', exact: true }).click();
    await expect(page.getByRole('alert')).toContainText('Hindi mabasa ang petsa sa mga hanay 2', { timeout: 60_000 });
    await expect(page.locator('.forecast-upload-zone')).toBeVisible();
    await expect(page.locator('.forecast-rec-card')).toHaveCount(3);
    await expect(page.locator('.forecast-saved')).toBeVisible();
    await expect(page.locator('.forecast-saved')).toContainText('harvest.xlsx');
    await expect(page.locator('.forecast-file-badge')).toContainText('bad-dates.csv');
    await upload.setInputFiles({ name: 'missing-columns.csv', mimeType: 'text/csv', buffer: Buffer.from('Crop\nPechay\n') });
    await page.getByRole('button', { name: 'Bumuo', exact: true }).click();
    await expect(page.getByRole('alert')).toContainText('Kulang ang mga column: Harvest (kg), Month', { timeout: 60_000 });
    await expect(page.locator('.forecast-saved')).toContainText('harvest.xlsx');
    expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBeTruthy();
    await page.screenshot({ path: testInfo.outputPath('forecast-filipino-errors.png'), fullPage: true });
    await page.reload();
    await expect(page.locator('.forecast-rec-card')).toHaveCount(3);
    await expect(page.locator('.forecast-saved')).toBeVisible();
    await expect(page.locator('.forecast-saved')).toContainText('harvest.xlsx');
    expect(errors).toEqual([]);
});

test('old farm forecasts keep future suggestions seasonal and unknown crops unavailable', async ({ page }) => {
    await page.setViewportSize({ width: 768, height: 1000 });
    await page.addInitScript(() => localStorage.setItem('agrifarm-seller-language', 'english'));
    await page.goto('/login');
    await page.getByLabel('Email address').fill('brgystothomas@gmail.com');
    await page.getByLabel('Password', { exact: true }).fill('AgriFarm123!');
    await page.getByRole('button', { name: 'Login', exact: true }).click();
    await expect(page).toHaveURL(/\/seller\/dashboard$/);
    await page.goto('/seller/dashboard?section=forecasting');
    const historical = fs.readFileSync(path.resolve('docs/sample-data/synthetic_harvest_4_years.csv'), 'utf8')
        .trim().replace(/202[2-5]/g, year => String(Number(year) - 4));
    await page.getByLabel('Harvest file', { exact: true }).setInputFiles({
        name: 'historical-with-unknown.csv', mimeType: 'text/csv',
        buffer: Buffer.from(`${historical}\nDecember 2021,Unknown vegetable,0\n`),
    });
    await page.getByRole('button', { name: 'Generate', exact: true }).click();
    await expect(page.locator('.forecast-saved')).toContainText('historical-with-unknown.csv', { timeout: 120_000 });
    await expect(page.locator('.forecast-expected-harvest')).toHaveText([
        'Seasonal planting guide', 'Seasonal planting guide', 'Seasonal planting guide',
    ]);
    await expect(page.locator('.forecast-season-grid tbody tr')).toHaveCount(21);
    const visualUnknown = page.locator('.forecast-season-grid tbody tr').filter({ hasText: 'Unknown vegetable' });
    await expect(visualUnknown).toContainText('No forecast');
    await visualUnknown.getByRole('button').first().click();
    await expect(page.locator('.forecast-month-detail')).toContainText('No harvest estimate for this month');
    const visualFarm = page.locator('.forecast-season-grid tbody tr').filter({ hasText: 'Your records' }).first();
    await visualFarm.getByRole('button').first().click();
    await expect(page.locator('.forecast-month-detail')).toContainText(/Estimated harvest: \d+–\d+ kg/);
    await page.locator('.forecast-card-details summary').first().click();
    await expect(page.locator('.forecast-card-details').first()).toContainText('This harvest date is outside your saved forecast');
    await expect(page.locator('.forecast-card-details').first().getByText('This harvest date is outside', { exact: false })).toBeVisible();
    await expect(visualUnknown.locator('.is-unavailable')).toHaveCount(12);
    await expect(visualUnknown.locator('.is-quiet')).toHaveCount(0);
    await visualUnknown.getByRole('button').first().click();
    await expect(page.locator('.forecast-month-detail')).not.toContainText('kg');
    await expect(page.locator('.seller-forecast table')).toHaveCount(1);
});
