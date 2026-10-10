import { expect, test } from './fixtures';
import fs from 'node:fs';

async function login(page, email) {
    await page.goto('/login');
    await page.getByLabel('Email address').fill(email);
    await page.getByLabel('Password', { exact: true }).fill('AgriFarm123!');
    await page.getByRole('button', { name: 'Login', exact: true }).click();
    await expect(page).toHaveURL(/\/(seller|admin)\/dashboard$/);
}

test('measured harvest weight can be added to an old non-kg record and exported', async ({ browser }, testInfo) => {
    const sellerContext = await browser.newContext({ viewport: { width: 1440, height: 1000 } });
    const adminContext = await browser.newContext({ viewport: { width: 1440, height: 1000 } });
    const page = await sellerContext.newPage();
    const admin = await adminContext.newPage();
    page.setDefaultTimeout(30_000);
    admin.setDefaultTimeout(30_000);
    const errors = [];
    page.on('pageerror', error => errors.push(error.message));
    admin.on('pageerror', error => errors.push(error.message));
    try {
        await login(page, 'brgymaybunga@gmail.com');
        await page.goto('/seller/dashboard?section=products');
        await page.getByRole('button', { name: 'Add product', exact: true }).click();
        const product = page.getByRole('dialog', { name: 'Add product' });
        await product.getByLabel('Product name', { exact: true }).fill('Kangkong');
        await product.getByLabel('Category', { exact: true }).selectOption('Vegetables');
        await product.getByLabel('Price (PHP)', { exact: true }).fill('35');
        await product.getByLabel('Selling unit', { exact: true }).selectOption('bunch');
        await product.getByLabel('Available stock', { exact: true }).fill('12');
        await product.locator('#product-photo').setInputFiles({ name: 'kangkong.png', mimeType: 'image/png', buffer: Buffer.from('iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAIAAACQd1PeAAAADElEQVR4nGMwanAAAAHaAPMeQxVKAAAAAElFTkSuQmCC', 'base64') });
        await product.getByRole('button', { name: 'Add product', exact: true }).click();
        await expect(product).not.toBeVisible();
        await page.goto('/seller/dashboard?section=harvest-records');

        for (const language of ['english', 'filipino']) {
            await page.evaluate(language => localStorage.setItem('agrifarm-seller-language', language), language);
            await page.reload();
            await page.getByRole('button', { name: language === 'english' ? 'Record Harvest' : 'Itala ang ani', exact: true }).click();
            const form = page.getByRole('dialog', { name: language === 'english' ? 'Record Harvest' : 'Itala ang ani', exact: true });
            const unit = form.getByLabel(language === 'english' ? 'Unit' : 'Yunit', { exact: false });
            const weight = form.getByRole('spinbutton', { name: /Total harvest weight|Kabuuang timbang ng ani/ });
            await expect(unit).toHaveValue('bunch');
            await form.getByRole('spinbutton', { name: language === 'english' ? 'Quantity' : 'Dami', exact: true }).fill('20');
            await weight.fill('0');
            await form.getByRole('button', { name: language === 'english' ? 'Save Harvest Record' : 'I-save ang tala ng ani', exact: true }).click();
            await expect(form.getByRole('alert')).toContainText(language === 'english' ? 'greater than 0 kg' : 'higit sa 0 kg');
            await weight.fill('5.125');
            for (const width of [390, 768, 1440]) {
                await page.setViewportSize({ width, height: 1000 });
                for (const theme of ['light', 'dark']) {
                    await page.evaluate(theme => {
                        localStorage.setItem('agrifarm-theme', theme);
                        document.documentElement.classList.toggle('dark', theme === 'dark');
                        document.documentElement.style.colorScheme = theme;
                    }, theme);
                    await weight.scrollIntoViewIfNeeded();
                    const bounds = await form.boundingBox();
                    expect(bounds.x).toBeGreaterThanOrEqual(0);
                    expect(bounds.x + bounds.width).toBeLessThanOrEqual(width);
                    expect(await form.evaluate(element => element.scrollWidth <= element.clientWidth)).toBeTruthy();
                    await form.screenshot({ path: testInfo.outputPath(`harvest-weight-${language}-${width}-${theme}.png`) });
                    await form.getByRole('button', { name: language === 'english' ? 'Save Harvest Record' : 'I-save ang tala ng ani', exact: true }).scrollIntoViewIfNeeded();
                }
            }
            await unit.selectOption('kg');
            await expect(weight).toHaveCount(0);
            await unit.selectOption('bunch');
            await expect(weight).toHaveValue('');
            await page.keyboard.press('Escape');
            await expect(form).not.toBeVisible();
        }
        await page.evaluate(() => localStorage.setItem('agrifarm-seller-language', 'english'));
        await page.reload();
        await page.getByRole('button', { name: 'Record Harvest', exact: true }).click();
        const form = page.getByRole('dialog', { name: 'Record Harvest', exact: true });
        await form.getByRole('spinbutton', { name: 'Quantity', exact: true }).fill('20');
        await form.getByLabel('Harvest Date', { exact: true }).fill('2025-01-15');
        await form.getByRole('button', { name: 'Save Harvest Record', exact: true }).click();
        await expect(form).not.toBeVisible();
        await page.getByRole('button', { name: 'Dismiss message', exact: true }).click();

        await login(admin, 'pasigcenro@gmail.com');
        await admin.goto('/admin/dashboard?section=reports');
        await admin.locator('.report-range input').first().fill('2025-01-01');
        await admin.locator('.report-range input').last().fill('2025-01-31');
        const panel = admin.locator('.harvest-forecast-export');
        await panel.getByLabel('Barangay', { exact: true }).selectOption('Maybunga');
        await panel.getByRole('button', { name: 'Generate preview', exact: true }).click();
        await expect(panel.getByRole('alert')).toContainText('Add the measured weight in kg');
        await expect(panel.getByRole('button', { name: 'Download forecasting CSV' })).toHaveCount(0);

        await page.locator('.harvest-history-panel').getByRole('button', { name: 'Edit', exact: true }).click();
        const edit = page.getByRole('dialog', { name: 'Edit Harvest Record', exact: true });
        await edit.getByRole('spinbutton', { name: /Total harvest weight/ }).fill('5.125');
        await edit.getByRole('button', { name: 'Save changes', exact: true }).click();
        await expect(edit).not.toBeVisible();
        await page.getByRole('button', { name: 'Dismiss message', exact: true }).click();
        await page.reload();
        await page.locator('.harvest-history-panel').getByRole('button', { name: 'View', exact: true }).click();
        await expect(page.getByRole('dialog', { name: 'Harvest Record', exact: true })).toContainText('5.125 kg');
        await page.keyboard.press('Escape');
        await page.evaluate(() => localStorage.setItem('agrifarm-seller-language', 'filipino'));
        await page.reload();
        for (const width of [390, 768, 1440]) {
            await page.setViewportSize({ width, height: 1000 });
            for (const theme of ['light', 'dark']) {
                await page.evaluate(theme => {
                    localStorage.setItem('agrifarm-theme', theme);
                    document.documentElement.classList.toggle('dark', theme === 'dark');
                }, theme);
                await page.locator('.harvest-history-panel').getByRole('button', { name: 'Tingnan', exact: true }).click();
                const details = page.getByRole('dialog', { name: 'Tala ng ani', exact: true });
                await expect(details).toContainText('5.125 kg');
                await expect(details.locator('dt')).toHaveText(['Produkto', 'Petsa ng ani', 'Dami', 'Kabuuang timbang ng ani', 'Katayuan', 'Mga tala']);
                await details.screenshot({ path: testInfo.outputPath(`harvest-details-filipino-${width}-${theme}.png`) });
                await page.keyboard.press('Escape');
                await page.locator('.harvest-history-panel').getByRole('button', { name: 'Burahin', exact: true }).click();
                const confirmation = page.getByRole('dialog', { name: 'Burahin ang tala ng ani?', exact: true });
                await expect(confirmation.getByRole('button', { name: 'Panatilihin ang tala', exact: true })).toBeFocused();
                await expect(confirmation.getByRole('button', { name: 'Burahin ang tala', exact: true })).toBeVisible();
                await confirmation.screenshot({ path: testInfo.outputPath(`harvest-confirmation-filipino-${width}-${theme}.png`) });
                await confirmation.getByRole('button', { name: 'Panatilihin ang tala', exact: true }).click();
                await expect(confirmation).not.toBeVisible();
            }
        }
        await page.evaluate(() => localStorage.setItem('agrifarm-seller-language', 'english'));
        await page.reload();
        await page.locator('.harvest-history-panel').getByRole('button', { name: 'Edit', exact: true }).click();
        await expect(edit.getByRole('spinbutton', { name: /Total harvest weight/ })).toHaveValue('5.125');
        await expect(edit.getByRole('spinbutton', { name: 'Quantity', exact: true })).toHaveValue('20');
        await expect(edit.getByLabel('Unit', { exact: false })).toHaveValue('bunch');
        await page.keyboard.press('Escape');
        await panel.getByRole('button', { name: 'Generate preview', exact: true }).click();
        await expect(panel.getByRole('radio', { name: 'CSV', exact: true })).toBeEnabled();
        await panel.getByText('CSV', { exact: true }).click();
        await expect(panel.getByRole('radio', { name: 'CSV', exact: true })).toBeChecked();
        const downloadPromise = admin.waitForEvent('download');
        await panel.getByRole('button', { name: 'Download forecasting CSV', exact: true }).click();
        const download = await downloadPromise;
        const csvPath = testInfo.outputPath(download.suggestedFilename());
        await download.saveAs(csvPath);
        expect(fs.readFileSync(csvPath, 'utf8')).toContain('2025-01,Kangkong,5.125,Maybunga');
        await page.goto('/seller/dashboard?section=forecasting');
        await page.getByLabel('Harvest file', { exact: true }).setInputFiles(csvPath);
        await page.getByRole('button', { name: 'Generate', exact: true }).click();
        await expect(page.locator('.forecast-dataset-source')).toContainText('Harvest records: Maybunga', { timeout: 60_000 });
        await expect(page.locator('.forecast-history-note')).toBeVisible();
        expect(errors).toEqual([]);
    } finally {
        await sellerContext.close();
        await adminContext.close();
    }
});
