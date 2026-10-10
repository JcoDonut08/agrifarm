import { expect, test } from './fixtures';

const brokenText = /[ÃÂâð�]/;

async function inspectCopy(page, testInfo, name, footer) {
    await expect(page.locator('body')).not.toContainText(brokenText);
    expect(await page.title()).not.toMatch(brokenText);
    for (const width of [390, 768, 1440]) {
        await page.setViewportSize({ width, height: 1000 });
        for (const theme of ['light', 'dark']) {
            await page.evaluate(theme => {
                localStorage.setItem('agrifarm-theme', theme);
                document.documentElement.classList.toggle('dark', theme === 'dark');
                document.documentElement.style.colorScheme = theme;
            }, theme);
            expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBeTruthy();
            await page.screenshot({ path: testInfo.outputPath(`${name}-${width}-${theme}.png`), fullPage: true });
            await page.locator(footer).screenshot({ path: testInfo.outputPath(`${name}-footer-${width}-${theme}.png`) });
        }
    }
}

async function login(page, email, role) {
    await page.goto('/login');
    await page.getByLabel('Email address').fill(email);
    await page.getByLabel('Password', { exact: true }).fill('AgriFarm123!');
    await page.getByRole('button', { name: 'Login', exact: true }).click();
    await expect(page).toHaveURL(new RegExp(`/${role}/dashboard$`));
}

test('storefront and Filipino about text use readable characters', async ({ page }, testInfo) => {
    await page.goto('/');
    await expect(page.locator('.store-footer-bottom')).toContainText(`© ${new Date().getFullYear()} AgriFarm`);
    await inspectCopy(page, testInfo, 'storefront', '.store-footer-bottom');
    await page.evaluate(() => localStorage.setItem('agrifarm-customer-language', 'filipino'));
    await page.goto('/about');
    await expect(page.getByRole('heading', { name: 'Sariwang Ani Mula Sa Kapwa Mo Pasigueño' })).toBeVisible();
    await inspectCopy(page, testInfo, 'about-filipino', '.store-footer-bottom');
});

test('admin reports preview and dashboard keep readable footer and currency text', async ({ page }, testInfo) => {
    await login(page, 'pasigcenro@gmail.com', 'admin');
    await inspectCopy(page, testInfo, 'admin-dashboard', '.admin-footer');
    for (const language of ['english', 'filipino']) {
        await page.evaluate(language => localStorage.setItem('agrifarm-admin-preferences', JSON.stringify({ language })), language);
        await page.goto('/admin/dashboard?section=reports');
        await page.locator('.report-option-card--harvest').getByRole('button', { name: language === 'english' ? 'Generate preview' : 'Gumawa ng preview', exact: true }).click();
        await expect(page.locator('.report-preview-section .report-paper')).toBeVisible();
        await expect(page.locator('.report-preview-toolbar > div > span')).toHaveText(language === 'english' ? 'Live preview' : 'Preview ng ulat');
        await expect(page.locator('.report-paper footer')).toContainText(language === 'english' ? 'Official AgriFarm report' : 'Opisyal na ulat ng AgriFarm');
        const message = page.locator('.report-empty-message');
        if (await message.count()) {
            await page.setViewportSize({ width: 390, height: 1000 });
            const fits = await message.evaluate(element => {
                const text = document.createRange();
                text.selectNodeContents(element);
                const bounds = text.getBoundingClientRect();
                return bounds.left >= 0 && bounds.right <= innerWidth;
            });
            expect(fits).toBeTruthy();
        }
        await expect(page.locator('.admin-footer')).toHaveText('AgriFarm · Pasig City CENRO Administration');
        await inspectCopy(page, testInfo, `reports-${language}`, '.admin-footer');
    }
});

test('seller analytics date ranges and harvest empty states keep readable text', async ({ page }, testInfo) => {
    await login(page, 'seller@agrifarm.test', 'seller');
    for (const language of ['english', 'filipino']) {
        await page.evaluate(language => localStorage.setItem('agrifarm-seller-language', language), language);
        await page.goto('/seller/dashboard?section=analytics');
        await expect(page.locator('.analytics-filters')).toBeVisible();
        await page.locator('.analytics-periods button').nth(1).click();
        await expect(page.locator('.analytics-periods button').nth(1)).toHaveAttribute('aria-pressed', 'true');
        await inspectCopy(page, testInfo, `analytics-${language}`, '.seller-footer');
        await page.goto('/seller/dashboard?section=harvest-records');
        await expect(page.locator('.harvest-history-panel')).toBeVisible();
        await inspectCopy(page, testInfo, `harvest-${language}`, '.seller-footer');
    }
});
