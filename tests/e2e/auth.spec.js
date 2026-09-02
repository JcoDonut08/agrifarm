import { expect, test } from '@playwright/test';
import fs from 'node:fs';
import path from 'node:path';

const logPath = path.resolve('storage/logs/laravel.log');
const developmentPassword = 'AgriFarm123!';
const viewports = [
    { name: 'mobile-390', width: 390, height: 844 },
    { name: 'tablet-768', width: 768, height: 1024 },
    { name: 'desktop-1440', width: 1440, height: 1000 },
];

for (const viewport of viewports) {
    test(`${viewport.name}: complete authentication and legal-page QA`, async ({ page }, testInfo) => {
        await page.setViewportSize({ width: viewport.width, height: viewport.height });

        await page.goto('/terms');
        await expect(page.getByRole('heading', { name: 'Terms of Use', level: 1 })).toBeVisible();
        await expect(page.getByText('do not guarantee weather conditions')).toBeVisible();
        await assertNoHorizontalOverflow(page);

        await page.goto('/privacy');
        await expect(page.getByRole('heading', { name: 'Privacy Notice', level: 1 })).toBeVisible();
        await expect(page.getByText('Philippine Data Privacy Act of 2012')).toBeVisible();
        await assertNoHorizontalOverflow(page);

        await page.goto('/register');
        await expect(page.getByRole('heading', { name: 'Create your AgriFarm customer account' })).toBeVisible();
        await page.getByLabel('Full name').fill(`QA Customer ${viewport.width}`);
        await page.getByLabel('Email address').fill(`qa-${viewport.width}@example.test`);
        await page.getByLabel('Password', { exact: true }).fill(developmentPassword);
        await page.getByLabel('Confirm password').fill(developmentPassword);
        await page.getByLabel(/I have read and accept the Terms/).check();
        await page.getByLabel(/I have read and accept the Privacy/).check();
        await page.getByRole('button', { name: 'Create customer account' }).click();
        await expect(page).toHaveURL(/\/email\/verify$/);
        await expect(page.getByRole('heading', { name: 'Confirm your customer email' })).toBeVisible();
        await assertNoHorizontalOverflow(page);
        await page.screenshot({ path: testInfo.outputPath(`${viewport.name}-verify-email.png`), fullPage: true });

        await completeLogin(page, 'customer@agrifarm.test', '/customer');
        await expect(page.getByRole('heading', { name: 'Customer area' })).toBeVisible();
        await assertNoHorizontalOverflow(page);
        await page.getByRole('button', { name: 'Sign out' }).click();
        await expect(page).toHaveURL(/\/login$/);

        await completeLogin(page, 'seller@agrifarm.test', '/seller/dashboard');
        await expect(page.getByRole('heading', { name: 'Seller dashboard' })).toBeVisible();
        await page.screenshot({ path: testInfo.outputPath(`${viewport.name}-seller.png`), fullPage: true });
        await page.getByRole('button', { name: 'Sign out' }).click();

        await completeLogin(page, 'admin@agrifarm.test', '/admin/dashboard');
        await expect(page.getByRole('heading', { name: 'CENRO admin dashboard' })).toBeVisible();
        await page.getByRole('button', { name: 'Sign out' }).click();

        await page.goto('/forgot-password');
        await expect(page.getByRole('heading', { name: 'Reset your AgriFarm password' })).toBeVisible();
        const resetLogOffset = currentLogSize();
        await page.getByLabel('Email address').fill('customer@agrifarm.test');
        await page.getByRole('button', { name: 'Email password-reset link' }).click();
        await expect(page.getByRole('status')).toContainText('password reset link');
        const resetUrl = await waitForLogMatch(resetLogOffset, /http:\/\/127\.0\.0\.1:8010\/reset-password\/[^\s]+/);
        await page.goto(decodeLogUrl(resetUrl));
        await expect(page.getByRole('heading', { name: 'Complete your password reset' })).toBeVisible();
        await page.getByLabel('New password', { exact: true }).fill(developmentPassword);
        await page.getByLabel('Confirm new password').fill(developmentPassword);
        await page.getByRole('button', { name: 'Reset password', exact: true }).click();
        await expect(page).toHaveURL(/\/login$/);
        await expect(page.getByRole('status')).toContainText('reset');

        await completeLogin(page, 'customer@agrifarm.test', '/customer');
        await page.getByRole('button', { name: 'Sign out' }).click();
        await expect(page).toHaveURL(/\/login$/);
    });
}

async function completeLogin(page, email, expectedPath) {
    await page.goto('/login');
    await expect(page.getByRole('heading', { name: 'Sign in to your AgriFarm account' })).toBeVisible();
    const logOffset = currentLogSize();
    await page.getByLabel('Email address').fill(email);
    await page.getByLabel('Password').fill(developmentPassword);
    await page.getByLabel('Remember me').check();
    await page.getByRole('button', { name: 'Continue to email code' }).click();
    await expect(page).toHaveURL(/\/login\/otp$/);
    await expect(page.getByRole('heading', { name: 'Enter your email security code' })).toBeVisible();
    const code = await waitForLogMatch(logOffset, /Login code: (\d{6})/, 1);
    await page.getByLabel('Six-digit code').fill(code);
    await page.getByRole('button', { name: 'Verify and sign in' }).click();
    await expect(page).toHaveURL(new RegExp(`${escapeRegExp(expectedPath)}$`));
}

function currentLogSize() {
    return fs.existsSync(logPath) ? fs.statSync(logPath).size : 0;
}

async function waitForLogMatch(offset, pattern, group = 0) {
    await expect.poll(() => {
        const contents = fs.readFileSync(logPath, 'utf8').slice(offset);
        return contents.match(pattern)?.[group] ?? '';
    }, { timeout: 10_000 }).not.toBe('');

    return fs.readFileSync(logPath, 'utf8').slice(offset).match(pattern)[group];
}

function decodeLogUrl(url) {
    return url.replaceAll('&amp;', '&').replace(/[)>.]+$/, '');
}

function escapeRegExp(value) {
    return value.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

async function assertNoHorizontalOverflow(page) {
    expect(await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth)).toBeTruthy();
}
