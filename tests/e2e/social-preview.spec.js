import { test, expect } from './fixtures';

for (const width of [390, 768, 1440]) {
    test(`share metadata survives hydration and navigation at ${width}px`, async ({ page }, testInfo) => {
        await page.setViewportSize({ width, height: 1000 });
        await page.goto('/');
        await expect(page.getByRole('link', { name: 'Shop the Harvest', exact: true })).toBeVisible();
        for (const path of ['/', '/?page=marketplace', '/about', '/contact']) {
            if (path !== '/') {
                // Follow actual Inertia links so client navigation also retains the server metadata.
                const link = page.locator(`.store-footer a[href="${path}"]`).first();
                if (await link.count()) await link.click();
                else await page.goto(path);
            }
            await expect(page).toHaveURL(new URL(path, 'http://127.0.0.1:8010').href);
            const image = page.locator('head meta[property="og:image"]');
            await expect(image).toHaveCount(1);
            await expect(image).toHaveAttribute('content', /^http.*\/images\/agrifarm-homepage-share-v1\.jpg$/);
            await expect(page.locator('head meta[name="twitter:card"]')).toHaveAttribute('content', 'summary_large_image');
            await expect(page.locator('head meta[name="twitter:image"]')).toHaveAttribute('content', await image.getAttribute('content'));
            await expect(page.locator('head meta[property="og:url"]')).toHaveAttribute('content', new URL(path, 'http://127.0.0.1:8010').href);
            expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
        }
        await page.screenshot({ path: testInfo.outputPath(`social-preview-page-${width}.png`), fullPage: true, animations: 'disabled' });
    });
}
