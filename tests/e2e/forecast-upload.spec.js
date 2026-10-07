import { expect, test } from '@playwright/test';
import fs from 'node:fs';
import path from 'node:path';

async function captureUploadStates(page, testInfo, state) {
    for (const width of [390, 768, 1440]) {
        await page.setViewportSize({ width, height: 1000 });
        for (const theme of ['light', 'dark']) {
            if (theme === 'dark') await page.getByRole('button', { name: 'Switch to dark mode' }).click();
            expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBeTruthy();
            const zone = await page.locator('.forecast-upload-zone').boundingBox();
            const button = await page.locator('.forecast-generate-button').boundingBox();
            expect(zone.height).toBeGreaterThanOrEqual(160);
            expect(button.y).toBeGreaterThan(zone.y + zone.height);
            expect(Math.abs(button.x + button.width / 2 - (zone.x + zone.width / 2))).toBeLessThan(1);
            await page.locator('.forecast-upload-panel').screenshot({ path: testInfo.outputPath(`upload-${state}-${width}-${theme}.png`) });
            if (theme === 'dark') await page.getByRole('button', { name: 'Switch to light mode' }).click();
        }
    }
}

test('upload states, generation motion and error recovery stay accessible', async ({ page }, testInfo) => {
    await page.setViewportSize({ width: 390, height: 1000 });
    await page.addInitScript(() => {
        localStorage.setItem('agrifarm-theme', 'light');
        localStorage.setItem('agrifarm-seller-language', 'english');
    });
    const errors = [];
    page.on('pageerror', error => errors.push(error.message));
    await page.goto('/login');
    await page.getByLabel('Email address').fill('brgystothomas@gmail.com');
    await page.getByLabel('Password', { exact: true }).fill('AgriFarm123!');
    await page.getByRole('button', { name: 'Login', exact: true }).click();
    await expect(page).toHaveURL(/\/seller\/dashboard$/);
    await page.goto('/seller/dashboard?section=forecasting');
    const picker = page.getByRole('button', { name: 'Choose harvest file', exact: true });
    const generate = page.locator('.forecast-generate-button');
    const input = page.getByLabel('Harvest file', { exact: true });
    const form = page.locator('.forecast-upload-form');
    await expect(generate).toBeDisabled();
    await expect(generate).toHaveText('Generate');
    await expect(page.locator('.forecast-results-reveal')).toHaveCount(0);
    await captureUploadStates(page, testInfo, 'empty');

    const filename = `harvest-records-${'long-filename-'.repeat(10)}2025.csv`;
    const buffer = fs.readFileSync(path.resolve('docs/sample-data/synthetic_harvest_1_year.csv'));
    const chooserPromise = page.waitForEvent('filechooser');
    await picker.focus();
    await page.keyboard.press('Space');
    await (await chooserPromise).setFiles({ name: filename, mimeType: 'text/csv', buffer });
    await expect(page.locator('.forecast-file-badge')).toHaveText(filename);
    await expect(generate).toBeEnabled();
    await picker.focus();
    await page.keyboard.press('Tab');
    await expect(page.getByRole('button', { name: 'Remove selected file', exact: true })).toBeFocused();
    await page.keyboard.press('Tab');
    await expect(generate).toBeFocused();
    await captureUploadStates(page, testInfo, 'selected');
    await page.getByRole('button', { name: 'Remove selected file', exact: true }).click();
    await expect(picker).toBeFocused();
    await expect(generate).toBeDisabled();
    await expect(page.locator('.forecast-file-badge')).toHaveCount(0);
    await input.setInputFiles({ name: filename, mimeType: 'text/csv', buffer });

    let release;
    let requests = 0;
    const gate = new Promise(resolve => { release = resolve; });
    await page.route('**/seller/forecasting', async route => {
        requests++;
        await gate;
        await route.continue();
    });
    try {
        await generate.focus();
        await page.keyboard.press('Enter');
        await expect(form).toHaveAttribute('aria-busy', 'true');
        await expect(page.locator('.forecast-generation-status')).toHaveText('Preparing your planting guide…');
        await expect(generate).toBeDisabled();
        await expect(picker).toBeDisabled();
        await expect(input).toBeDisabled();
        await expect(page.getByRole('button', { name: 'Remove selected file', exact: true })).toBeDisabled();
        await expect.poll(() => requests).toBe(1);
        await form.dispatchEvent('submit');
        await captureUploadStates(page, testInfo, 'preparing');
        expect(requests).toBe(1);
        expect(await page.locator('.forecast-loading-track > span').evaluate(element => element.getAnimations().length)).toBeGreaterThan(0);
        await page.emulateMedia({ reducedMotion: 'reduce' });
        for (const selector of ['.forecast-loading-spinner', '.forecast-loading-track > span']) {
            expect(await page.locator(selector).evaluate(element => getComputedStyle(element).animationName)).toBe('none');
        }
        await expect(page.locator('.forecast-generation-status')).toBeVisible();
        await page.emulateMedia({ reducedMotion: 'no-preference' });
        await page.setViewportSize({ width: 390, height: 1000 });
    } finally {
        release();
    }
    await expect(page.locator('.forecast-saved')).toContainText(filename, { timeout: 60_000 });
    await page.unroute('**/seller/forecasting');
    await expect(form).toHaveAttribute('aria-busy', 'false');
    await expect(page.getByRole('heading', { name: 'Your harvest calendar', exact: true })).toBeFocused();
    await expect(page.locator('.forecast-file-badge')).toHaveCount(0);
    await expect(picker).toBeEnabled();
    await expect(generate).toBeDisabled();
    expect(await page.locator('.forecast-results').evaluate(element => getComputedStyle(element).animationName)).toBe('forecast-results-in');
    await page.emulateMedia({ reducedMotion: 'reduce' });
    expect(await page.locator('.forecast-results').evaluate(element => getComputedStyle(element).animationName)).toBe('none');
    await page.reload();
    await expect(page.locator('.forecast-results-reveal')).toHaveCount(0);
    await expect(page.locator('.forecast-saved')).toContainText(filename);
    await captureUploadStates(page, testInfo, 'saved');

    await input.setInputFiles({ name: 'bad-dates.csv', mimeType: 'text/csv', buffer: Buffer.from('Month,Crop,Harvest\nwrong,Pechay,1\n') });
    await generate.click();
    await expect(page.getByRole('alert')).toContainText('Unreadable dates at rows 2', { timeout: 60_000 });
    await expect(page.getByRole('alert')).toBeFocused();
    await expect(page.getByRole('alert')).toBeInViewport();
    await expect(page.locator('.forecast-saved')).toContainText(filename);
    await expect(page.locator('.forecast-file-badge')).toHaveText('bad-dates.csv');
    await expect(page.locator('.forecast-results-reveal')).toHaveCount(0);
    await expect(generate).toBeEnabled();

    await input.setInputFiles({ name: 'too-large.csv', mimeType: 'text/csv', buffer: Buffer.from('Month,Crop,Harvest\n' + 'January 2025,Pechay,1\n'.repeat(300_000)) });
    await generate.click();
    await expect(page.getByRole('alert')).toContainText('no larger than 5 MB');
    await expect(page.getByRole('alert')).toBeFocused();
    await expect(page.locator('.forecast-file-badge')).toHaveText('too-large.csv');
    await expect(page.locator('.forecast-saved')).toContainText(filename);

    await input.setInputFiles({ name: 'updated-harvest.csv', mimeType: 'text/csv', buffer });
    await generate.click();
    await expect(page.locator('.forecast-saved')).toContainText('updated-harvest.csv', { timeout: 60_000 });
    await expect(page.getByRole('alert')).toHaveCount(0);
    await expect(page.getByRole('heading', { name: 'Your harvest calendar', exact: true })).toBeFocused();
    await expect(page.locator('.forecast-generation-status')).toBeEmpty();
    expect(await page.locator('.forecast-results').evaluate(element => getComputedStyle(element).animationName)).toBe('none');
    expect(errors).toEqual([]);
});
