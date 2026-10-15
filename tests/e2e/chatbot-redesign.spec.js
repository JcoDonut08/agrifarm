import { expect, test } from './fixtures';
import AxeBuilder from '@axe-core/playwright';

for (const width of [390, 768, 1440]) {
    test(`${width}px: Kuya Ani welcome, typed help, fixed composer and navigation`, async ({ page }, testInfo) => {
        await page.setViewportSize({ width, height: 900 });
        const errors = [];
        const lookups = [];
        page.on('pageerror', error => errors.push(error.message));
        page.on('request', request => { if (request.url().includes('/api/chatbot/')) lookups.push(request.url()); });
        await page.goto('/');
        const launcher = page.getByRole('button', { name: 'Open Help Assistant', exact: true });
        await launcher.click();
        const assistant = page.getByRole('region', { name: 'Kuya Ani assistant', exact: true });
        const input = assistant.getByRole('textbox', { name: 'Message Kuya Ani', exact: true });
        const close = assistant.getByRole('button', { name: 'Close assistant', exact: true });
        const reset = assistant.locator('.help-widget-menu');
        const send = assistant.getByRole('button', { name: 'Send', exact: true });
        await expect(close).toBeFocused();
        await expect(assistant.getByText('AgriFarm assistant', { exact: true })).toBeVisible();
        await expect(assistant.getByText('Online', { exact: true })).toHaveCount(0);
        await expect(assistant.locator('.chat-welcome-action')).toHaveCount(4);
        await expect(input).toHaveAttribute('placeholder', 'Ask Kuya Ani…');
        await expect(send).toBeDisabled();
        for (const theme of ['light', 'dark']) {
            await page.evaluate(theme => document.documentElement.classList.toggle('dark', theme === 'dark'), theme);
            await expect.poll(() => assistant.locator('img').evaluate(image => image.complete && image.naturalWidth > 0)).toBeTruthy();
            await assistant.screenshot({ path: testInfo.outputPath(`welcome-${theme}.png`), animations: 'disabled' });
            const audit = await new AxeBuilder({ page }).include('#kuya-ani-assistant').withTags(['wcag2a', 'wcag2aa', 'wcag21aa']).analyze();
            expect(audit.violations).toEqual([]);
        }
        await input.fill('How do I pay?');
        await input.press('Enter');
        await expect(assistant.locator('.chat-message.bot').last()).toContainText('Cash on delivery (COD)');
        expect(lookups).toEqual([]);
        await input.fill('How can I become a seller?');
        await send.click();
        await expect(assistant.locator('.chat-message.bot').last()).toContainText('Contact page');
        await input.fill('Tell me tomorrow’s weather');
        await send.click();
        await expect(assistant.locator('.chat-message.bot').last()).toContainText('I can help with order checks');
        await reset.click();
        await expect(assistant.locator('.chat-welcome')).toBeVisible();
        await input.fill('Paano po mag-order?');
        await send.click();
        await expect(assistant.locator('.chat-message.bot').last()).toContainText('continue to checkout');
        await input.fill('Where is my order?');
        await send.click();
        await expect(assistant.locator('.chat-message.bot').last()).toContainText('Sign in to check your orders.');
        expect(lookups).toEqual([]);
        await reset.click();

        await page.setViewportSize({ width, height: 420 });
        await input.focus();
        const bounds = await assistant.boundingBox();
        const composer = await assistant.locator('.chat-input-form').boundingBox();
        const closeBounds = await close.boundingBox();
        expect(bounds.y).toBeGreaterThanOrEqual(0);
        expect(bounds.y + bounds.height).toBeLessThanOrEqual(420);
        expect(composer.y + composer.height).toBeLessThanOrEqual(bounds.y + bounds.height);
        expect(closeBounds.height).toBeGreaterThanOrEqual(44);
        expect((await send.boundingBox()).height).toBeGreaterThanOrEqual(44);
        await assistant.screenshot({ path: testInfo.outputPath('short-screen-composer.png'), animations: 'disabled' });
        await input.press('Escape');
        await expect(assistant).toHaveCount(0);
        await expect(launcher).toBeFocused();
        await page.setViewportSize({ width, height: 900 });
        await launcher.click();
        await assistant.getByRole('link', { name: 'Browse products', exact: true }).click();
        await expect(page).toHaveURL(/page=marketplace/);
        await launcher.click();
        await input.fill('Contact support');
        await send.click();
        await assistant.getByRole('link', { name: 'Contact AgriFarm', exact: true }).click();
        await expect(page).toHaveURL('/contact');
        expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBeTruthy();

        await page.addInitScript(() => localStorage.setItem('agrifarm-customer-language', 'filipino'));
        await page.goto('/');
        await launcher.click();
        const filipinoInput = assistant.getByRole('textbox', { name: 'Mensahe para kay Kuya Ani', exact: true });
        await expect(assistant).toContainText('Ako si Kuya Ani.');
        await filipinoInput.fill('Paano ako magbabayad?');
        await send.click();
        await expect(assistant.locator('.chat-message.bot').last()).toContainText('cash on delivery (COD)');
        expect(errors).toEqual([]);
    });
}
