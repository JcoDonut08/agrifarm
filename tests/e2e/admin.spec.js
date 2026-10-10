import { expect, test } from "./fixtures";

const viewports = [
    { name: "mobile-390", width: 390, height: 844 },
    { name: "tablet-768", width: 768, height: 1024 },
    { name: "desktop-1440", width: 1440, height: 1000 },
];

for (const viewport of viewports) {
    test(`${viewport.name}: CENRO admin dashboard workspace`, async ({
        page,
    }, testInfo) => {
        await page.setViewportSize({
            width: viewport.width,
            height: viewport.height,
        });
        await page.addInitScript(() =>
            localStorage.setItem("agrifarm-theme", "light"),
        );

        await loginAsAdmin(page);
        await expect(
            page.getByRole("heading", { name: "Dashboard" }),
        ).toBeVisible();
        await expect(page.getByText("pasigcenro@gmail.com")).toBeAttached();
        await expect(
            page.locator(".admin-performance-item").first(),
        ).toBeVisible();
        await expect(
            page
                .locator(".admin-performance-title strong")
                .filter({ hasText: "Rosario" })
                .first(),
        ).toBeVisible();
        await expect(
            page.locator(".admin-activity-list article").first(),
        ).toBeVisible();
        await expect(
            page.getByText("Verified seller account").first(),
        ).toBeVisible();
        await expect(
            page.getByRole("heading", { name: "Weather & barangay outlook" }),
        ).toBeVisible();
        await expect(
            page.getByRole("heading", { name: "Total sales", exact: true }),
        ).toBeVisible();
        await expect(
            page.getByText("Leading barangay", { exact: true }),
        ).toBeVisible();
        const chartPoint = page.locator(".admin-chart-hit-area").first();
        if (await chartPoint.count()) {
            await chartPoint.hover();
            await expect(page.locator(".admin-chart-tooltip")).toBeVisible();
        }
        await assertNoHorizontalOverflow(page);

        await page.getByRole("button", { name: "Notifications" }).click();
        const notificationPanel = page.getByRole("region", {
            name: "Administration notifications",
        });
        await expect(notificationPanel).toBeVisible();
        await expect(
            notificationPanel.getByText("Partner seller activity"),
        ).toBeVisible();
        await notificationPanel
            .getByRole("button", { name: "Close notifications" })
            .click();

        const taskTitle = `Review ${viewport.name} barangay report`;
        await page
            .getByRole("button", { name: "Add task", exact: true })
            .click();
        await page.getByLabel("Task", { exact: true }).fill(taskTitle);
        await page
            .locator(".admin-task-form")
            .getByRole("button", { name: "Add task", exact: true })
            .click();
        await expect(page.getByText(taskTitle)).toBeVisible();
        await page.screenshot({
            path: testInfo.outputPath(`${viewport.name}-admin-dashboard.png`),
            fullPage: true,
        });
        await page
            .getByRole("button", { name: `Complete ${taskTitle}` })
            .click();
        await expect(
            page.getByRole("button", { name: `Reopen ${taskTitle}` }),
        ).toBeVisible();
        await page.getByRole("button", { name: `Delete ${taskTitle}` }).click();
        await page.getByRole('dialog', { name: 'Delete task?' }).getByRole('button', { name: 'Delete task', exact: true }).click();
        await expect(page.getByText(taskTitle)).toHaveCount(0);

        const forecastDays = page.locator(".seller-weather-days button");
        if ((await forecastDays.count()) > 1) {
            await forecastDays.nth(1).click();
            await expect(forecastDays.nth(1)).toHaveAttribute(
                "aria-pressed",
                "true",
            );
        }

        await page
            .getByRole("button", { name: "Open administrator account" })
            .click();
        await expect(page).toHaveURL(/section=profile/);
        await expect(
            page.getByRole("heading", { name: "Profile", exact: true }),
        ).toBeVisible();
        await expect(
            page
                .locator(".admin-profile-details dd")
                .filter({ hasText: "pasigcenro@gmail.com" }),
        ).toBeVisible();
        await expect(
            page.getByText("Account access is protected"),
        ).toBeVisible();
        await assertNoHorizontalOverflow(page);
        await page.screenshot({
            path: testInfo.outputPath(`${viewport.name}-admin-profile.png`),
            fullPage: true,
        });

        if (viewport.width <= 800)
            await page
                .getByRole("button", { name: "Open admin navigation" })
                .click();
        await page
            .getByRole("button", { name: "Settings", exact: true })
            .click();
        await expect(
            page.getByRole("heading", { name: "Administration settings" }),
        ).toBeVisible();
        await expect(
            page.locator(".appearance-options").getByRole("button"),
        ).toHaveCount(3);
        await expect(page.getByRole("switch")).toHaveCount(6);
        await page.getByRole("button", { name: "Dark", exact: true }).click();
        await expect(page.locator("html")).toHaveClass(/dark/);
        await page.getByRole("button", { name: "Light", exact: true }).click();
        await expect(page.locator("html")).not.toHaveClass(/dark/);
        await page.getByRole("switch", { name: "Weather outlook" }).click();
        await page.getByRole("switch", { name: "Recent activity" }).click();
        await page
            .getByRole("switch", { name: "Partner seller activity" })
            .click();
        await page.reload();
        await expect(
            page.getByRole("heading", { name: "Administration settings" }),
        ).toBeVisible();
        await expect(
            page.getByRole("switch", { name: "Weather outlook" }),
        ).toHaveAttribute("aria-checked", "false");
        await expect(
            page.getByRole("switch", { name: "Recent activity" }),
        ).toHaveAttribute("aria-checked", "false");
        await expect(
            page.getByRole("switch", { name: "Partner seller activity" }),
        ).toHaveAttribute("aria-checked", "false");
        await page.getByRole("button", { name: "Notifications" }).click();
        await expect(
            notificationPanel.getByText("Partner seller activity"),
        ).toHaveCount(0);
        await notificationPanel
            .getByRole("button", { name: "Close notifications" })
            .click();
        await assertNoHorizontalOverflow(page);
        await page.screenshot({
            path: testInfo.outputPath(`${viewport.name}-admin-settings.png`),
            fullPage: true,
        });

        if (viewport.width <= 800)
            await page
                .getByRole("button", { name: "Open admin navigation" })
                .click();
        await page.getByRole("button", { name: "Dashboard" }).click();
        await expect(
            page.locator(".admin-performance-item").first(),
        ).toBeVisible();
        await expect(
            page.getByRole("heading", { name: "Weather & barangay outlook" }),
        ).toHaveCount(0);
        await expect(
            page.getByRole("heading", { name: "Recent activity" }),
        ).toHaveCount(0);

        if (viewport.width <= 800)
            await page
                .getByRole("button", { name: "Open admin navigation" })
                .click();
        await page
            .getByRole("button", { name: "Settings", exact: true })
            .click();
        await page.getByRole("switch", { name: "Weather outlook" }).click();
        await page.getByRole("switch", { name: "Recent activity" }).click();
        await page
            .getByRole("switch", { name: "Partner seller activity" })
            .click();

        if (viewport.width <= 800)
            await page
                .getByRole("button", { name: "Open admin navigation" })
                .click();
        await page.getByRole("button", { name: "Dashboard" }).click();
        await expect(
            page.getByRole("heading", { name: "Weather & barangay outlook" }),
        ).toBeVisible();
        await expect(
            page.locator(".admin-activity-list article").first(),
        ).toBeVisible();

        if (viewport.width <= 800) {
            await expect(
                page.getByRole("navigation", { name: "CENRO administration" }),
            ).not.toBeInViewport();
            await page
                .getByRole("button", { name: "Open admin navigation" })
                .click();
            await expect(
                page.getByRole("navigation", { name: "CENRO administration" }),
            ).toBeInViewport();
        }

        await page.getByRole("button", { name: "Barangay Monitoring" }).click();
        await expect(page).toHaveURL(/section=barangay-monitoring/);
        await expect(
            page.getByRole("heading", {
                name: "Barangay Monitoring",
                exact: true,
            }),
        ).toBeVisible();
        await expect(
            page.getByRole("heading", {
                name: "Barangay Agricultural Status",
                exact: true,
            }),
        ).toBeVisible();
        await expect(
            page.getByText(
                "No reports have been recorded yet. They will appear when CENRO reporting records are connected.",
            ),
        ).toBeVisible();
        await page.locator(".barangay-monitoring__filter select").selectOption("Rosario");
        await expect(
            page.getByRole("heading", {
                name: "Product & Harvest Monitoring",
                exact: true,
            }),
        ).toBeVisible();
        await page.locator(".barangay-monitoring__filter select").selectOption("all");
        await page.getByLabel("Compare by").selectOption("demand");
        await expect(page.getByText("Demand uses quantity from actual recorded orders.")).toBeVisible();
        await assertNoHorizontalOverflow(page);
        await page.screenshot({
            path: testInfo.outputPath(`${viewport.name}-admin-empty-state.png`),
            fullPage: true,
        });

        if (viewport.width <= 800)
            await page
                .getByRole("button", { name: "Open admin navigation" })
                .click();
        await page.getByRole("button", { name: "Farmers & Sellers" }).click();
        await expect(page.getByText("Total Sellers")).toBeVisible();
        await expect(
            page.getByRole("heading", {
                name: "Farmers & Sellers",
                exact: true,
            }),
        ).toBeVisible();
        await expect(
            page.getByRole("button", { name: "Add seller" }),
        ).toBeVisible();
        await page.getByRole("button", { name: "Add seller" }).click();
        await page
            .getByLabel("Farm or store name")
            .fill(`Farm ${viewport.name}`);
        await page
            .getByLabel("Email address")
            .fill(`farm-${viewport.name}@example.test`);
        await page.getByLabel("Assigned barangay").selectOption("Rosario");
        await page
            .getByLabel("Temporary password", { exact: true })
            .fill("Starter123");
        await page.getByLabel("Confirm temporary password").fill("Starter123");
        await page.getByRole("button", { name: "Create seller" }).click();
        await expect(page.getByText(`Farm ${viewport.name}`, { exact: true })).toBeVisible();
        await expect(
            page.getByText(`farm-${viewport.name}@example.test`),
        ).toBeVisible();

        await page
            .getByPlaceholder("Search name, email, or barangay...")
            .fill(`Farm ${viewport.name}`);
        await expect(page.getByText(`Farm ${viewport.name}`, { exact: true })).toBeVisible();
        await page.getByLabel("Clear search input").click();

        await page
            .getByRole("button", { name: `View Farm ${viewport.name}` })
            .click();
        await expect(
            page.getByRole("heading", { name: "Seller profile" }),
        ).toBeVisible();
        await page.getByRole("button", { name: "Close dialog" }).click();

        await page
            .getByRole("button", { name: `Suspend Farm ${viewport.name}` })
            .click();
        await expect(
            page.getByRole("heading", { name: "Suspend seller account" }),
        ).toBeVisible();
        await expect(page.getByText("Suspension impact notice")).toBeVisible();
        await page
            .getByLabel("Reason for suspension")
            .selectOption({ index: 1 });
        await page.getByRole("button", { name: "Suspend account" }).click();
        await expect(
            page.getByRole("button", { name: `Reinstate Farm ${viewport.name}` }),
        ).toBeVisible();
        await page
            .getByRole("button", { name: `Reinstate Farm ${viewport.name}` })
            .click();
        await expect(
            page.getByRole("heading", { name: "Reinstate seller account" }),
        ).toBeVisible();
        await page.getByRole("button", { name: "Reinstate account" }).click();
        await expect(
            page.getByRole("button", { name: `Suspend Farm ${viewport.name}` }),
        ).toBeVisible();
        await assertNoHorizontalOverflow(page);

        if (viewport.width <= 800)
            await page
                .getByRole("button", { name: "Open admin navigation" })
                .click();
        await page.getByRole("button", { name: "Audit Logs" }).click();
        await expect(page).toHaveURL(/section=audit-logs/);
        await expect(
            page.getByRole("heading", { name: "Audit Logs", exact: true }),
        ).toBeVisible();
        await expect(
            page.getByText("Created seller account").first(),
        ).toBeVisible();
        await expect(
            page.getByText(`Farm ${viewport.name}`).first(),
        ).toBeVisible();
        await assertNoHorizontalOverflow(page);
    });
}

async function loginAsAdmin(page) {
    await page.goto("/login");
    await page.getByLabel("Email address").fill("pasigcenro@gmail.com");
    await page.getByLabel("Password", { exact: true }).fill("AgriFarm123!");
    await page.getByRole("button", { name: "Login" }).click();
    await expect(page).toHaveURL(/\/admin\/dashboard$/);
}

async function assertNoHorizontalOverflow(page) {
    expect(
        await page.evaluate(
            () => document.documentElement.scrollWidth <= window.innerWidth,
        ),
    ).toBeTruthy();
}
