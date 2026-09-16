import { expect, test } from '@playwright/test';
import AxeBuilder from '@axe-core/playwright';

const viewports = [
    { name: 'mobile', width: 390, height: 844 },
    { name: 'tablet', width: 768, height: 1024 },
    { name: 'desktop', width: 1440, height: 1000 },
];

async function expectAccessible(page, label) {
    const results = await new AxeBuilder({ page })
        .withTags(['wcag2a', 'wcag2aa', 'wcag21a', 'wcag21aa'])
        .analyze();
    const violations = results.violations.map((violation) => ({
        rule: violation.id,
        impact: violation.impact,
        elements: violation.nodes.map((node) => node.target.join(' ')),
    }));
    expect(violations, `${label} accessibility violations`).toEqual([]);
}

for (const viewport of viewports) {
    test(`${viewport.name}: login, marketplace, and review form accessibility`, async ({ page }) => {
        await page.setViewportSize({ width: viewport.width, height: viewport.height });
        await page.addInitScript(() => localStorage.setItem('agrifarm-theme', 'light'));

        await page.goto('/login');
        await expect(page.getByLabel('Email address')).toBeVisible();
        await expectAccessible(page, 'Login');

        await page.goto('/?page=marketplace');
        await expect(page.getByRole('heading', { name: 'Marketplace' })).toBeVisible();
        await expectAccessible(page, 'Marketplace');
        await page.goto('/?page=marketplace&sort=best-selling');
        await page.getByRole('button', { name: 'Reset filters' }).click();
        await expect(page).toHaveURL(/\?page=marketplace$/);

        await page.goto('/login');
        await page.getByLabel('Email address').fill('customer@agrifarm.test');
        await page.getByLabel('Password', { exact: true }).fill('AgriFarm123!');
        await page.getByRole('button', { name: 'Login' }).click();
        await expect(page.getByRole('button', { name: 'Open account menu' })).toBeVisible();
        await page.goto('/?page=product&product=pechay');
        await expect(page.getByRole('heading', { name: 'Write a review' })).toBeVisible();
        await expectAccessible(page, 'Product reviews');
    });
}
