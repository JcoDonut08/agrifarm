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
    test(`${viewport.name}: marketplace account experience`, async ({ page }, testInfo) => {
        await page.setViewportSize({ width: viewport.width, height: viewport.height });
        await page.addInitScript(() => {
            if (! localStorage.getItem('agrifarm-theme')) localStorage.setItem('agrifarm-theme', 'light');
        });

        await page.goto('/');
        await expect(page.getByRole('heading', { level: 1 })).toContainText('Fresh from');
        await expect(page.getByRole('link', { name: 'Create account', exact: true }).first()).toBeVisible();
        await page.getByRole('button', { name: 'Open account menu' }).click();
        await page.getByRole('button', { name: 'Settings', exact: true }).click();
        await page.getByRole('button', { name: 'Dark', exact: true }).click();
        await expect(page.locator('html')).toHaveClass(/dark/);
        expect(await page.evaluate(() => localStorage.getItem('agrifarm-theme'))).toBe('dark');
        await page.reload();
        await expect(page.locator('html')).toHaveClass(/dark/);
        await page.screenshot({ path: testInfo.outputPath(`${viewport.name}-home-dark.png`), fullPage: true });
        await page.getByRole('button', { name: 'Open account menu' }).click();
        await page.getByRole('button', { name: 'Settings', exact: true }).click();
        await page.getByRole('button', { name: 'Light', exact: true }).click();
        await page.keyboard.press('Escape');
        await expect(page.locator('html')).not.toHaveClass(/dark/);
        if (viewport.width <= 1000) {
            await page.getByRole('button', { name: 'Open navigation menu' }).click();
            await expect(page.getByRole('navigation', { name: 'Mobile navigation' })).toBeVisible();
            await page.getByRole('navigation', { name: 'Mobile navigation' }).getByRole('link', { name: 'Marketplace', exact: true }).click();
            await expect(page).toHaveURL(/\?page=marketplace$/);
            await page.goto('/');
        }
        await assertNoHorizontalOverflow(page);
        await page.screenshot({ path: testInfo.outputPath(`${viewport.name}-home.png`), fullPage: true });

        await page.goto('/terms');
        await expect(page.getByRole('heading', { name: 'Terms of Use', level: 1 })).toBeVisible();
        await expect(page.getByText('do not guarantee weather conditions')).toBeVisible();
        await assertNoHorizontalOverflow(page);

        await page.goto('/privacy');
        await expect(page.getByRole('heading', { name: 'Privacy Notice', level: 1 })).toBeVisible();
        await expect(page.getByText('Philippine Data Privacy Act of 2012')).toBeVisible();
        await assertNoHorizontalOverflow(page);

        await page.goto('/register');
        await expect(page.getByRole('heading', { name: 'Create your AgriFarm account.' })).toBeVisible();
        await expect(page.getByLabel('Full name')).toBeFocused();
        await expect(page.getByRole('button', { name: 'Continue with Google' })).toBeVisible();
        await expect(page.getByText('Public registration creates a customer account.')).toHaveCount(0);
        await page.getByRole('button', { name: 'Continue with Google' }).click();
        await expect(page.getByRole('alert')).toContainText('Accept the Terms of Use');
        const registrationLogOffset = currentLogSize();
        await page.getByLabel('Full name').fill(`QA Customer ${viewport.width}`);
        await page.getByLabel('Email address').fill(`qa-${viewport.width}@example.test`);
        await page.getByLabel('Password', { exact: true }).fill(developmentPassword);
        await page.getByRole('button', { name: 'Show password', exact: true }).click();
        await expect(page.getByLabel('Password', { exact: true })).toHaveAttribute('type', 'text');
        await page.getByRole('button', { name: 'Hide password', exact: true }).click();
        await page.getByLabel(/I agree to the Terms of Use and Privacy Notice/).check();
        await expect(page.getByRole('alert')).toHaveCount(0);
        await assertNoHorizontalOverflow(page);
        await page.screenshot({ path: testInfo.outputPath(`${viewport.name}-register.png`), fullPage: true });
        await page.getByRole('button', { name: 'Create account' }).click();
        await expect(page).toHaveURL(/\/email\/verify$/);
        await expect(page.getByRole('heading', { name: 'Verify your account.' })).toBeVisible();
        await assertNoHorizontalOverflow(page);
        await page.screenshot({ path: testInfo.outputPath(`${viewport.name}-verify-email.png`), fullPage: true });
        const registrationCode = await waitForLogMatch(registrationLogOffset, /Account verification code: (\d{6})/, 1);
        await pasteOtp(page, registrationCode);
        await page.getByRole('button', { name: 'Verify & create account' }).click();
        await expect(page).toHaveURL(/\/login$/);

        await completeLogin(page, 'customer@agrifarm.test', '/', {
            exerciseControls: true,
            loginScreenshotPath: testInfo.outputPath(`${viewport.name}-login.png`),
        });
        await expect(page.getByRole('heading', { level: 1 })).toContainText('Fresh from');
        await expect(page.getByRole('button', { name: 'Open account menu' })).toBeVisible();
        await assertNoHorizontalOverflow(page);
        await page.screenshot({ path: testInfo.outputPath(`${viewport.name}-customer.png`), fullPage: true });
        await openCustomerProfile(page);
        await expect(page).toHaveURL(/\/customer$/);
        await page.getByRole('button', { name: 'Sign out' }).click();
        await expect(page).toHaveURL(/\/login$/);

        await completeLogin(page, 'seller@agrifarm.test', '/seller/dashboard');
        await expect(page.getByRole('heading', { name: 'Barangay store overview', exact: true })).toBeVisible();
        await expect(page.getByRole('heading', { name: 'Sales overview' })).toBeVisible();
        if (viewport.width <= 800) await page.getByRole('button', { name: 'Toggle seller navigation' }).click();
        await page.getByRole('button', { name: 'Sign out' }).click();

        await completeLogin(page, 'admin@agrifarm.test', '/admin/dashboard');
        await expect(page.getByRole('heading', { name: 'CENRO admin workspace' })).toBeVisible();
        await expect(page.getByText('Your administrator workspace is ready')).toBeVisible();
        await page.getByRole('button', { name: 'Sign out' }).click();

        await page.goto('/forgot-password');
        await expect(page.getByRole('heading', { name: 'Forgot your password?' })).toBeVisible();
        await page.screenshot({ path: testInfo.outputPath(`${viewport.name}-forgot-password.png`), fullPage: true });
        const resetLogOffset = currentLogSize();
        await page.getByLabel('Email address').fill('customer@agrifarm.test');
        await page.getByRole('button', { name: 'Send verification code' }).click();
        await expect(page).toHaveURL(/\/forgot-password\/otp$/);
        expect(await page.evaluate(() => window.scrollY)).toBe(0);
        await expect(page.getByRole('heading', { name: 'Check your email.' })).toBeVisible();
        await expect(page.getByRole('status')).toContainText('six-digit code');
        const resetCode = await waitForLogMatch(resetLogOffset, /Password reset code: (\d{6})/, 1);
        await pasteOtp(page, resetCode);
        await page.screenshot({ path: testInfo.outputPath(`${viewport.name}-password-reset-otp.png`), fullPage: true });
        await page.getByRole('button', { name: 'Verify code' }).click();
        await expect(page).toHaveURL(/\/reset-password$/);
        await expect(page.getByRole('heading', { name: 'Create a new password.' })).toBeVisible();
        await page.screenshot({ path: testInfo.outputPath(`${viewport.name}-reset-password.png`), fullPage: true });
        await page.getByLabel('New password', { exact: true }).fill(developmentPassword);
        await page.getByRole('button', { name: 'Show new password' }).click();
        await expect(page.getByLabel('New password', { exact: true })).toHaveAttribute('type', 'text');
        await page.getByLabel('Confirm new password', { exact: true }).fill(developmentPassword);
        await page.getByRole('button', { name: 'Update password', exact: true }).click();
        await expect(page).toHaveURL(/\/login$/);
        await expect(page.getByRole('status')).toContainText('reset');

        await completeLogin(page, 'customer@agrifarm.test', '/');
        await openCustomerProfile(page);
        await page.getByRole('button', { name: 'Sign out' }).click();
        await expect(page).toHaveURL(/\/login$/);
    });
}

async function completeLogin(page, email, expectedPath, options = {}) {
    await page.goto('/login');
    await expect(page.getByRole('heading', { name: 'Sign in to AgriFarm.' })).toBeVisible();
    await expect(page.getByLabel('Email address')).toBeFocused();
    await expect(page.getByRole('link', { name: 'Continue with Google' })).toBeVisible();
    if (options.loginScreenshotPath) await page.screenshot({ path: options.loginScreenshotPath, fullPage: true });
    await page.getByLabel('Email address').fill(email);
    await page.getByLabel('Password', { exact: true }).fill(developmentPassword);

    if (options.exerciseControls) {
        await page.getByRole('button', { name: 'Show password' }).click();
        await expect(page.getByLabel('Password', { exact: true })).toHaveAttribute('type', 'text');
        await page.getByRole('button', { name: 'Hide password' }).click();
    }

    await page.getByLabel('Remember me').check();
    await page.getByRole('button', { name: 'Login' }).click();
    await expect(page).toHaveURL(new RegExp(`${escapeRegExp(expectedPath)}$`));
}

async function openCustomerProfile(page) {
    await page.getByRole('button', { name: 'Open account menu' }).click();
    await page.getByRole('link', { name: 'My profile', exact: true }).click();
}

async function pasteOtp(page, code) {
    await page.getByLabel('Code digit 1 of 6').evaluate((element, value) => {
        const data = new DataTransfer();
        data.setData('text/plain', value);
        element.dispatchEvent(new ClipboardEvent('paste', { bubbles: true, clipboardData: data }));
    }, code);
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

function escapeRegExp(value) {
    return value.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

async function assertNoHorizontalOverflow(page) {
    expect(await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth)).toBeTruthy();
}
