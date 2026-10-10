import { expect, test } from './fixtures';
import fs from 'node:fs';
import ExcelJS from 'exceljs';

async function login(page, email) {
    await page.goto('/login');
    await page.getByLabel('Email address').fill(email);
    await page.getByLabel('Password', { exact: true }).fill('AgriFarm123!');
    await page.getByRole('button', { name: 'Login', exact: true }).click();
    await expect(page).toHaveURL(/\/(seller|admin)\/dashboard$/);
}

async function setAppearance(page, theme) {
    await page.evaluate(theme => {
        localStorage.setItem('agrifarm-theme', theme);
        document.documentElement.classList.toggle('dark', theme === 'dark');
        document.documentElement.style.colorScheme = theme;
    }, theme);
}

async function harvest(page, productId, date, quantity, unit = 'kg') {
    const result = await page.evaluate(async ({ productId, date, quantity, unit }) => {
        const token = decodeURIComponent(document.cookie.split('; ').find(value => value.startsWith('XSRF-TOKEN=')).slice(11));
        const response = await fetch('/seller/crop-yields', {
            method: 'POST', headers: { 'Content-Type': 'application/json', Accept: 'application/json', 'X-XSRF-TOKEN': token },
            body: JSON.stringify({ product_id: productId, harvest_date: date, quantity, unit }),
        });
        return { status: response.status, body: await response.text() };
    }, { productId, date, quantity, unit });
    expect(result.status, result.body).toBe(200);
}

test('admin Excel and CSV previews reach farmer forecasting with persistent barangay scope', async ({ browser }, testInfo) => {
    test.setTimeout(240_000);
    const sellerContext = await browser.newContext({ viewport: { width: 1440, height: 1000 } });
    const adminContext = await browser.newContext({ viewport: { width: 1440, height: 1000 } });
    const seller = await sellerContext.newPage();
    const admin = await adminContext.newPage();
    seller.setDefaultTimeout(30_000);
    admin.setDefaultTimeout(30_000);
    const errors = [];
    seller.on('pageerror', error => errors.push(error.message));
    admin.on('pageerror', error => errors.push(error.message));
    try {
        await login(seller, 'brgyrosario@gmail.com');
        await seller.goto('/seller/dashboard?section=products');
        await seller.getByRole('button', { name: 'Add product', exact: true }).click();
        const product = seller.getByRole('dialog', { name: 'Add product' });
        await product.getByLabel('Product name', { exact: true }).fill('Kangkong');
        await product.getByLabel('Category', { exact: true }).selectOption('Vegetables');
        await product.getByLabel('Price (PHP)', { exact: true }).fill('35');
        await product.getByLabel('Selling unit', { exact: true }).selectOption('kg');
        await product.getByLabel('Available stock', { exact: true }).fill('12');
        await product.locator('#product-photo').setInputFiles({ name: 'kangkong.png', mimeType: 'image/png', buffer: Buffer.from('iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAIAAACQd1PeAAAADElEQVR4nGMwanAAAAHaAPMeQxVKAAAAAElFTkSuQmCC', 'base64') });
        await product.getByRole('button', { name: 'Add product', exact: true }).click();
        await expect(product).not.toBeVisible();
        await seller.goto('/seller/dashboard?section=harvest-records');
        await seller.getByRole('button', { name: 'Record Harvest', exact: true }).click();
        const productId = await seller.getByRole('dialog', { name: 'Record Harvest' }).locator('#harvest-product').inputValue();
        await seller.keyboard.press('Escape');
        for (let index = 0; index < 24; index++) {
            const date = new Date(Date.UTC(2024, 9 + index, 15)).toISOString().slice(0, 10);
            const month = Number(date.slice(5, 7));
            await harvest(seller, productId, date, month < 3 ? 65 : 100);
        }
        await harvest(seller, productId, '2026-10-01', 5, 'bunch');

        await login(admin, 'pasigcenro@gmail.com');
        await admin.goto('/admin/dashboard?section=reports');
        const panel = admin.locator('.harvest-forecast-export');
        const from = admin.locator('.report-range input').first();
        const to = admin.locator('.report-range input').last();
        await from.fill('2025-01-01');
        await to.fill('2025-12-31');
        await panel.getByLabel('Barangay', { exact: true }).selectOption('Maybunga');
        await panel.getByRole('button', { name: 'Generate preview', exact: true }).click();
        await expect(panel.getByRole('alert')).toContainText('No harvest records');
        await expect(panel.getByRole('button', { name: 'Download forecasting CSV' })).toHaveCount(0);
        await expect(panel.getByRole('button', { name: 'Download Excel' })).toHaveCount(0);
        await panel.getByLabel('Barangay', { exact: true }).selectOption('Rosario');
        await panel.getByRole('button', { name: 'Generate preview', exact: true }).click();
        await expect(panel.locator('.harvest-export-preview')).toContainText('12 harvest records · 12 monthly crop totals');
        await expect(panel.locator('.report-paper')).toContainText('Rosario');
        await expect(panel.locator('.report-table-wrap tbody tr')).toHaveCount(5);
        await expect(panel.getByRole('combobox', { name: 'Rows per page' })).toHaveValue('5');
        const downloadPromise = admin.waitForEvent('download');
        await panel.getByRole('button', { name: 'Download Excel', exact: true }).click();
        const shortDownload = await downloadPromise;
        const shortFile = testInfo.outputPath(shortDownload.suggestedFilename());
        await shortDownload.saveAs(shortFile);
        expect(shortDownload.suggestedFilename()).toMatch(/\.xlsx$/);
        const workbook = new ExcelJS.Workbook();
        await workbook.xlsx.readFile(shortFile);
        const sheet = workbook.worksheets[0];
        expect(sheet.getRow(1).values.slice(1)).toEqual(['Month', 'Vegetable Crop', 'Harvest (kg)', 'Barangay']);
        expect(sheet.rowCount).toBe(13);
        expect(sheet.getRow(2).values.slice(1)).toEqual(['2025-01', 'Kangkong', 65, 'Rosario']);

        await to.fill('2026-10-06');
        await expect(panel.locator('.harvest-export-preview')).toHaveCount(0);
        await panel.getByRole('button', { name: 'Generate preview', exact: true }).click();
        await expect(panel.getByRole('alert')).toContainText('bunch');
        await expect(panel.getByRole('button', { name: 'Download forecasting CSV' })).toHaveCount(0);
        await expect(panel.getByRole('button', { name: 'Download Excel' })).toHaveCount(0);
        await from.fill('2024-10-01');
        await to.fill('2026-09-30');
        await panel.getByRole('button', { name: 'Generate preview', exact: true }).click();
        await expect(panel.locator('.harvest-export-preview')).toContainText('24 harvest records · 24 monthly crop totals');
        await panel.getByRole('button', { name: 'Next page', exact: true }).click();
        await expect(panel.locator('tbody tr').first()).toContainText('2025-03');
        await panel.getByRole('button', { name: 'Previous page', exact: true }).click();
        await expect(panel.locator('tbody tr').first()).toContainText('2024-10');
        await panel.getByText('CSV', { exact: true }).click();
        await expect(panel.getByRole('radio', { name: 'CSV', exact: true })).toBeChecked();
        const longDownloadPromise = admin.waitForEvent('download');
        await panel.getByRole('button', { name: 'Download forecasting CSV', exact: true }).click();
        const longDownload = await longDownloadPromise;
        const longFile = testInfo.outputPath(longDownload.suggestedFilename());
        await longDownload.saveAs(longFile);
        expect(fs.readFileSync(longFile, 'utf8').trim().split('\n')).toHaveLength(25);

        for (const language of ['english', 'filipino']) {
            await admin.evaluate(language => localStorage.setItem('agrifarm-admin-preferences', JSON.stringify({ language })), language);
            await admin.reload();
            await from.fill('2024-10-15');
            await to.fill('2026-09-30');
            await panel.getByLabel('Barangay', { exact: true }).selectOption('Rosario');
            await panel.getByRole('button', { name: language === 'english' ? 'Generate preview' : 'Gumawa ng preview', exact: true }).click();
            await expect(panel.locator('.harvest-export-warning')).toContainText('2024-10');
            for (const width of [390, 768, 1440]) {
                await admin.setViewportSize({ width, height: 1000 });
                for (const theme of ['light', 'dark']) {
                    await setAppearance(admin, theme);
                    expect(await admin.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBeTruthy();
                    const controls = panel.locator('.seller-pagination__controls');
                    expect(await controls.evaluate(element => element.scrollWidth <= element.clientWidth)).toBeTruthy();
                    if (width === 390) {
                        await expect(panel.getByRole('columnheader', { name: language === 'english' ? 'Harvest (kg)' : 'Ani (kg)', exact: true })).toBeVisible();
                        const table = panel.locator('.report-table-wrap');
                        expect(await table.evaluate(element => element.scrollWidth <= element.clientWidth)).toBeTruthy();
                    }
                    await panel.screenshot({ path: testInfo.outputPath(`admin-export-${language}-${width}-${theme}.png`) });
                }
            }
        }

        await seller.goto('/seller/dashboard?section=forecasting');
        await seller.getByLabel('Harvest file', { exact: true }).setInputFiles(shortFile);
        await seller.getByRole('button', { name: 'Generate', exact: true }).click();
        await expect(seller.locator('.forecast-dataset-source')).toContainText('Harvest records: Rosario', { timeout: 60_000 });
        await expect(seller.locator('.forecast-history-note')).toBeVisible();
        await expect(seller.locator('.forecast-calendar-crop').filter({ hasText: 'Kangkong' })).toContainText('Seasonal guide');
        await seller.reload();
        await expect(seller.locator('.forecast-dataset-source')).toContainText('Rosario');
        await seller.getByLabel('Harvest file', { exact: true }).setInputFiles(longFile);
        await seller.getByRole('button', { name: 'Generate', exact: true }).click();
        await expect(seller.locator('.forecast-saved')).toContainText(longDownload.suggestedFilename(), { timeout: 90_000 });
        await expect(seller.locator('.forecast-history-note')).toHaveCount(0);
        const cropRow = seller.locator('.forecast-season-grid tbody tr').filter({ hasText: 'Kangkong' });
        await expect(cropRow).toContainText('Barangay records');
        await cropRow.getByRole('button').first().click();
        await expect(seller.locator('.forecast-month-detail')).toContainText('Estimated harvest for Rosario');
        const recordCard = seller.locator('.forecast-rec-card').filter({ hasText: 'Estimated harvest for Rosario' });
        await expect(recordCard).toHaveCount(1);
        await recordCard.locator('summary').click();
        await expect(recordCard).toContainText('Based on Rosario harvest records.');
        for (const card of await seller.locator('.forecast-rec-card').filter({ hasText: 'Seasonal planting guide' }).all()) {
            await card.locator('summary').click();
            await expect(card).toContainText('Based on illustrative seasonal references for Pasig.');
        }

        const mixed = { name: 'mixed.csv', mimeType: 'text/csv', buffer: Buffer.from('Month,Crop,Harvest,Barangay\n2025-01,Kangkong,20,Rosario\n2025-02,Kangkong,30,Maybunga\n') };
        await seller.getByLabel('Harvest file', { exact: true }).setInputFiles(mixed);
        await seller.getByRole('button', { name: 'Generate', exact: true }).click();
        await expect(seller.locator('.forecast-error')).toContainText('only one barangay', { timeout: 60_000 });
        await expect(seller.locator('.forecast-saved')).toContainText(longDownload.suggestedFilename());
        await expect(seller.locator('.forecast-file-badge')).toContainText('mixed.csv');
        for (const language of ['english', 'filipino']) {
            await seller.evaluate(language => localStorage.setItem('agrifarm-seller-language', language), language);
            await seller.reload();
            await expect(seller.locator('.forecast-dataset-source')).toContainText(language === 'english' ? 'Harvest records: Rosario' : 'Mga tala ng ani: Rosario');
            for (const width of [390, 768, 1440]) {
                await seller.setViewportSize({ width, height: 1000 });
                for (const theme of ['light', 'dark']) {
                    await setAppearance(seller, theme);
                    expect(await seller.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBeTruthy();
                    await seller.locator('.forecast-visual-calendar').screenshot({ path: testInfo.outputPath(`farmer-source-${language}-${width}-${theme}.png`) });
                    await seller.locator('.forecast-recommendations').screenshot({ path: testInfo.outputPath(`farmer-cards-${language}-${width}-${theme}.png`) });
                }
            }
        }
        expect(errors).toEqual([]);
    } finally {
        await sellerContext.close();
        await adminContext.close();
    }
});
