import { expect, test } from './fixtures';

const brokenText = /[ÃÂâð�]/;

async function inspectCopy(page, testInfo, name, footer, verifyViewport) {
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
            if (verifyViewport) await verifyViewport(width, theme);
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
    for (const language of ['english', 'filipino']) {
        await page.goto('/');
        await page.evaluate(value => localStorage.setItem('agrifarm-customer-language', value), language);
        await page.reload();
        await expect(page.locator('.store-footer-bottom')).toContainText(`© ${new Date().getFullYear()} AgriFarm`);
        await inspectCopy(page, testInfo, `storefront-${language}`, '.store-footer-bottom', async (width, theme) => {
            await page.evaluate(() => window.scrollTo({ top: 0, behavior: 'instant' }));
            const copy = page.locator('.modern-hero-copy');
            const bounds = await copy.boundingBox();
            expect(bounds.x).toBeGreaterThanOrEqual(20);
            expect(bounds.x + bounds.width).toBeLessThanOrEqual(width - 20);
            const textFits = await copy.evaluate(element => [...element.querySelectorAll('h1, p, span')].every(text => {
                const range = document.createRange();
                range.selectNodeContents(text);
                const bounds = range.getBoundingClientRect();
                return bounds.left >= 0 && bounds.right <= innerWidth;
            }));
            expect(textFits).toBeTruthy();
            if (width === 390) {
                const hero = await page.locator('.modern-hero').boundingBox();
                expect(hero.height).toBeLessThan(500);
                const benefits = await page.locator('.modern-hero-values > div').evaluateAll(elements => elements.map(element => element.getBoundingClientRect().top));
                expect(Math.max(...benefits) - Math.min(...benefits)).toBeLessThan(1);
                const button = page.locator('.modern-hero-btn');
                const buttonBounds = await button.boundingBox();
                expect(buttonBounds.height).toBeGreaterThanOrEqual(44);
            }
            await page.screenshot({ path: testInfo.outputPath(`home-viewport-${language}-${width}-${theme}.png`) });
        });
        await page.setViewportSize({ width: 360, height: 800 });
        await page.evaluate(() => window.scrollTo({ top: 0, behavior: 'instant' }));
        expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBeTruthy();
        await page.screenshot({ path: testInfo.outputPath(`home-viewport-${language}-360.png`) });
        await page.locator('.modern-hero-btn').click();
        await expect(page).toHaveURL(/\?page=marketplace$/);
        await expect(page.getByRole('heading', { level: 1 })).toHaveText('Marketplace');
    }
    for (const language of ['english', 'filipino']) {
        await page.evaluate(value => localStorage.setItem('agrifarm-customer-language', value), language);
        await page.goto('/about');
        await expect(page.getByRole('heading', { name: 'AgriFarm', level: 1, exact: true })).toBeVisible();
        const photo = page.locator('.about-hero-photo');
        await expect(photo).toHaveAttribute('src', '/images/pasig-planting-3.jpg');
        await expect.poll(() => photo.evaluate(image => image.complete && image.naturalWidth > 0)).toBeTruthy();
        await photo.evaluate(image => image.decode());
        await inspectCopy(page, testInfo, `about-${language}`, '.store-footer-bottom', async (width, theme) => {
            await page.evaluate(() => window.scrollTo({ top: 0, behavior: 'instant' }));
            const hero = page.locator('.about-hero');
            const bounds = await hero.boundingBox();
            expect(bounds.height).toBeGreaterThanOrEqual(width === 390 ? 480 : width === 768 ? 540 : 600);
            const copy = await page.locator('.about-hero-copy').boundingBox();
            expect(Math.abs(copy.x + copy.width / 2 - width / 2)).toBeLessThan(1);
            expect(Math.abs(copy.y + copy.height / 2 - bounds.y - bounds.height / 2)).toBeLessThan(1);
            for (const action of await page.locator('.about-hero-actions a').all()) {
                const button = await action.boundingBox();
                expect(button.height).toBeGreaterThanOrEqual(44);
                expect(button.x).toBeGreaterThanOrEqual(0);
                expect(button.x + button.width).toBeLessThanOrEqual(width);
            }
            await hero.screenshot({ path: testInfo.outputPath(`about-hero-${language}-${width}-${theme}.png`) });
        });
        if (language === 'english') {
            await page.setViewportSize({ width: 1877, height: 1000 });
            await page.evaluate(() => window.scrollTo({ top: 0, behavior: 'instant' }));
            for (const theme of ['light', 'dark']) {
                await page.evaluate(value => document.documentElement.classList.toggle('dark', value === 'dark'), theme);
                expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBeTruthy();
                await page.locator('.about-hero').screenshot({ path: testInfo.outputPath(`about-hero-english-1877-${theme}.png`) });
            }
        }
        const faq = page.locator('.faq-question').first();
        await faq.click();
        await expect(faq).toHaveAttribute('aria-expanded', 'true');
        await expect(page.locator('.faq-answer').first()).toBeVisible();
        await faq.click();
        await expect(faq).toHaveAttribute('aria-expanded', 'false');
        await page.locator('.about-hero-actions .store-button').click();
        await expect(page).toHaveURL(/\?page=marketplace$/);
        await page.goBack();
        await page.locator('.about-hero-secondary').click();
        await expect(page).toHaveURL(/\/contact$/);
    }
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
