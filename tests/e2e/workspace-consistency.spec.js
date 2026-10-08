import { expect, test } from '@playwright/test';

const photo = { name: 'consistency.png', mimeType: 'image/png', buffer: Buffer.from('iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mP8/x8AAwMCAO+aXioAAAAASUVORK5CYII=', 'base64') };
const roles = [
    { name: 'customer', email: 'customer@agrifarm.test', profile: '/customer', input: '#customer-photo', form: '.customer-profile-page' },
    { name: 'seller', email: 'seller@agrifarm.test', profile: '/seller/dashboard?section=profile', input: '#profile-photo', form: '.seller-profile-form' },
    { name: 'admin', email: 'pasigcenro@gmail.com', profile: '/admin/dashboard?section=profile', input: '#admin-profile-photo-input', form: '.admin-profile-form' },
];

for (const width of [390, 768, 1440]) {
    test(`${width}px: consistent workspace actions, save feedback, and photo confirmation`, async ({ browser }, testInfo) => {
        const actionStyles = [];
        for (const role of roles) {
            const context = await browser.newContext({ viewport: { width, height: 1000 }, reducedMotion: 'reduce' });
            const page = await context.newPage();
            try {
                await page.addInitScript(() => {
                    localStorage.setItem('agrifarm-theme', 'light');
                    localStorage.setItem('agrifarm-customer-language', 'english');
                    localStorage.setItem('agrifarm-seller-language', 'english');
                    localStorage.setItem('agrifarm-admin-preferences', JSON.stringify({ language: 'english' }));
                });
                await page.goto('/login');
                await page.getByLabel('Email address').fill(role.email);
                await page.getByLabel('Password', { exact: true }).fill('AgriFarm123!');
                await page.getByRole('button', { name: 'Login', exact: true }).click();
                await expect(page).toHaveURL(role.name === 'customer' ? /\/$/ : new RegExp(`/${role.name}/dashboard$`));
                await page.goto(role.profile);
                await expect(page.locator(role.form)).toBeVisible();
                if (role.name === 'customer') await page.clock.install();
                if (role.name === 'customer') {
                    const updatePassword = page.getByRole('button', { name: 'Update password', exact: true });
                    expect((await updatePassword.boundingBox()).height).toBeGreaterThanOrEqual(44);
                    await updatePassword.click();
                    await expect(page.locator('.customer-field small[role=alert]').first()).toBeVisible();
                }
                await page.locator(role.input).setInputFiles(photo);
                const save = page.getByRole('button', { name: 'Save photo', exact: true });
                await expect(save).toBeEnabled();
                await page.mouse.move(0, 0);
                actionStyles.push(await save.evaluate(element => {
                    const styles = getComputedStyle(element);
                    return { font: styles.fontSize, weight: styles.fontWeight, radius: styles.borderRadius, color: styles.backgroundColor };
                }));
                expect((await save.boundingBox()).height).toBeGreaterThanOrEqual(44);
                await save.click();
                const status = page.locator('.app-form-status');
                await expect(status).toContainText('Profile photo updated');
                await status.hover();
                for (const theme of ['light', 'dark']) {
                    await page.evaluate(theme => document.documentElement.classList.toggle('dark', theme === 'dark'), theme);
                    await page.evaluate(() => window.scrollTo(0, 0));
                    expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBeTruthy();
                    await page.screenshot({ path: testInfo.outputPath(`${role.name}-${width}-${theme}.png`), fullPage: true, animations: 'disabled' });
                }
                if (role.name === 'customer') {
                    await page.clock.fastForward(7000);
                    await expect(status).toBeVisible();
                    await status.getByRole('button', { name: 'Dismiss message' }).focus();
                    await page.mouse.move(0, 0);
                    await page.clock.fastForward(7000);
                    await expect(status).toBeVisible();
                    await page.locator(role.form).getByRole('heading').first().click();
                    await page.clock.fastForward(6500);
                    await expect(status).toHaveCount(0);
                    // The same success message should appear again for a new save.
                    await page.locator(role.input).setInputFiles(photo);
                    await save.click();
                    await expect(status).toContainText('Profile photo updated');
                }
                await page.getByRole('button', { name: 'Dismiss message' }).click();
                await expect(status).toHaveCount(0);
                await page.getByRole('button', { name: 'Remove photo', exact: true }).click();
                const dialog = page.getByRole('dialog', { name: 'Remove profile photo?' });
                await expect(dialog).toBeVisible();
                await expect(dialog.getByRole('button', { name: 'Cancel', exact: true })).toBeFocused();
                await page.keyboard.press('Escape');
                await expect(dialog).not.toBeVisible();
                await page.getByRole('button', { name: 'Remove photo', exact: true }).click();
                const bounds = await dialog.boundingBox();
                expect(bounds.x).toBeGreaterThanOrEqual(0);
                expect(bounds.x + bounds.width).toBeLessThanOrEqual(width);
                await dialog.screenshot({ path: testInfo.outputPath(`${role.name}-${width}-confirmation.png`) });
                await dialog.getByRole('button', { name: 'Remove photo', exact: true }).click();
                await expect(dialog).not.toBeVisible();
                await expect(status).toContainText('Profile photo removed.');
                await expect(page.getByRole('button', { name: 'Remove photo', exact: true })).toHaveCount(0);
                if (role.name === 'seller') {
                    await page.goto('/seller/dashboard?section=orders');
                    const panel = page.locator('.orders-table-wrap');
                    const empty = page.locator('.orders-empty');
                    await expect(empty.getByText('No orders yet', { exact: true })).toBeVisible();
                    await page.getByRole('button', { name: /Reservations 0/ }).click();
                    await expect(empty.getByText('No reservations yet', { exact: true })).toBeVisible();
                    const panelBounds = await panel.boundingBox();
                    const emptyBounds = await empty.boundingBox();
                    expect(emptyBounds.x).toBeGreaterThanOrEqual(panelBounds.x);
                    expect(emptyBounds.x + emptyBounds.width).toBeLessThanOrEqual(panelBounds.x + panelBounds.width + 1);
                    await page.screenshot({ path: testInfo.outputPath(`seller-${width}-empty-orders.png`), fullPage: true, animations: 'disabled' });
                }
            } finally {
                await context.close();
            }
        }
        expect(actionStyles[1]).toEqual(actionStyles[0]);
        expect(actionStyles[2]).toEqual(actionStyles[0]);
    });
}
