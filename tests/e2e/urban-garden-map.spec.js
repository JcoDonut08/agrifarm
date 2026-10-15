import { test, expect } from './fixtures';
import AxeBuilder from '@axe-core/playwright';

for (const width of [390, 768, 1440]) {
    test(`${width}px: partner gardens, embedded map, directory, language and themes`, async ({ page }, testInfo) => {
        await page.setViewportSize({ width, height: 900 });
        const errors = [];
        page.on('pageerror', error => errors.push(error.message));
        // Exercise AgriFarm's frame and directory; external Google pin placement is reviewed on the real public map.
        await page.route('https://www.google.com/maps/d/embed?**', route => route.fulfill({ contentType: 'text/html', body: '<!doctype html><html lang="en"><title>External map fixture</title><body style="margin:0;background:#e7ece8;font:16px sans-serif;padding:24px;color:#304b3a">External map frame</body></html>' }));
        await page.goto('/about');
        const section = page.getByRole('region', { name: 'Gardens in our partner barangays', exact: true });
        await section.scrollIntoViewIfNeeded();
        await expect(section).toContainText('12 CENRO-listed gardens');
        await expect(page.locator('.about-banner-break')).toHaveCount(0);
        const map = section.locator('iframe');
        await expect(map).toHaveAttribute('src', 'https://www.google.com/maps/d/embed?mid=e2e-garden-map-12345');
        await expect(section.getByRole('link', { name: 'Open full map', exact: true })).toHaveAttribute('href', 'https://www.google.com/maps/d/viewer?mid=e2e-garden-map-12345');
        const groups = section.locator('details');
        await expect(groups).toHaveCount(3);
        const expected = [6, 4, 2];
        for (let index = 0; index < 3; index++) {
            const group = groups.nth(index);
            if (await group.getAttribute('open') === null) await group.locator('summary').click();
            await expect(group.locator('li')).toHaveCount(expected[index]);
            for (const link of await group.locator('li a').all()) {
                const url = new URL(await link.getAttribute('href'));
                expect(url.origin).toBe('https://www.google.com');
                expect(url.searchParams.get('query')).toContain('Pasig City, Philippines');
                expect(await link.getAttribute('target')).toBe('_blank');
            }
        }
        for (const theme of ['light', 'dark']) {
            await page.evaluate(theme => document.documentElement.classList.toggle('dark', theme === 'dark'), theme);
            await section.scrollIntoViewIfNeeded();
            await section.screenshot({ path: testInfo.outputPath(`${theme}.png`), animations: 'disabled' });
            const bounds = await map.boundingBox();
            expect(bounds.width).toBeGreaterThan(200);
            expect((await section.locator('.urban-gardens-map').boundingBox()).height).toBeGreaterThanOrEqual(360);
            expect(bounds.x).toBeGreaterThanOrEqual(0);
            expect(bounds.x + bounds.width).toBeLessThanOrEqual(width);
            const audit = await new AxeBuilder({ page }).include('.urban-gardens').withTags(['wcag2a', 'wcag2aa', 'wcag21aa']).analyze();
            expect(audit.violations).toEqual([]);
        }
        await page.addInitScript(() => localStorage.setItem('agrifarm-customer-language', 'filipino'));
        await page.reload();
        await expect(page.getByRole('heading', { name: 'Mga hardin sa ating mga katuwang na barangay', exact: true })).toBeVisible();
        await expect(page.getByRole('link', { name: 'Buksan ang buong mapa', exact: true })).toBeVisible();
        expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBeTruthy();
        expect(errors).toEqual([]);
    });
}
