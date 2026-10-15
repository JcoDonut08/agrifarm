import { expect, test } from './fixtures';
import { readFileSync } from 'node:fs';

const image = readFileSync('public/images/market-pechay-feature.png');
const maxBytes = 10 * 1024 * 1024;
function photo(bytes) {
    return { name: 'profile.png', mimeType: 'image/png', buffer: Buffer.concat([image, Buffer.alloc(bytes - image.length)]) };
}

for (const width of [390, 768, 1440]) {
    for (const role of ['customer', 'seller']) {
        test(`${role} ${width}px: profile accepts a real 10 MB upload and rejects larger files`, async ({ page }, testInfo) => {
            await page.setViewportSize({ width, height: 1000 });
            const errors = [];
            page.on('pageerror', error => errors.push(error.message));
            await page.goto('/login');
            await page.getByLabel('Email address').fill(`${role}@agrifarm.test`);
            await page.getByLabel('Password', { exact: true }).fill('AgriFarm123!');
            await page.getByRole('button', { name: 'Login', exact: true }).click();
            await expect(page).toHaveURL(role === 'customer' ? '/' : /seller\/dashboard/);
            const path = role === 'customer' ? '/customer' : '/seller/dashboard?section=profile';
            await page.goto(path);
            const input = page.getByLabel('Choose profile photo', { exact: true });
            const form = input.locator('xpath=ancestor::form');
            await expect(page.getByText('JPG, PNG or WebP. Up to 10 MB.', { exact: true })).toBeVisible();
            await expect(form.getByRole('button', { name: 'Save photo', exact: true })).toBeDisabled();
            await input.setInputFiles(photo(maxBytes));
            await form.getByRole('button', { name: 'Save photo', exact: true }).click();
            await expect(input).toHaveValue('');
            const avatar = form.locator('img').first();
            await expect.poll(() => avatar.evaluate(image => image.complete && image.naturalWidth > 0)).toBeTruthy();
            const savedUrl = await avatar.getAttribute('src');
            expect(savedUrl).toContain('/profile/photo?image=');
            await page.reload();
            await expect(avatar).toHaveAttribute('src', savedUrl);
            await input.setInputFiles(photo(maxBytes + 1));
            await form.getByRole('button', { name: 'Save photo', exact: true }).click();
            await expect(input).toHaveAttribute('aria-invalid', 'true');
            await expect(form.getByRole('alert')).toBeVisible();
            await form.getByRole('button', { name: 'Cancel', exact: true }).click();
            await expect(form.getByRole('alert')).toHaveCount(0);
            await expect(input).toHaveAttribute('aria-invalid', 'false');
            await expect(avatar).toHaveAttribute('src', savedUrl);
            await form.scrollIntoViewIfNeeded();
            await page.screenshot({ path: testInfo.outputPath('profile-photo-limit.png') });
            expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBeTruthy();
            await page.reload();
            await expect(avatar).toHaveAttribute('src', savedUrl);
            expect(errors).toEqual([]);
        });
    }
}
