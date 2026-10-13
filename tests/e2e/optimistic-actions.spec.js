import { test, expect } from './fixtures';
import { execFileSync } from 'node:child_process';

function seedActions() {
    return JSON.parse(execFileSync('php', ['-r', String.raw`
        require 'vendor/autoload.php';
        $app = require 'bootstrap/app.php';
        $app->make(Illuminate\Contracts\Console\Kernel::class)->bootstrap();
        if (config('database.default') !== 'sqlite' || realpath(config('database.connections.sqlite.database')) !== realpath('database/playwright.sqlite')) throw new RuntimeException('Isolated database required');
        $customer = App\Models\User::where('email', 'customer@agrifarm.test')->firstOrFail();
        $admin = App\Models\User::where('email', 'pasigcenro@gmail.com')->firstOrFail();
        $reviews = $tasks = [];
        foreach (['one', 'two'] as $suffix) {
            $reviews[] = App\Models\ProductReview::create(['product_key' => 'pechay', 'user_id' => $customer->id, 'rating' => 5, 'comment' => 'Optimistic reaction '.$suffix, 'anonymous' => false])->id;
            $task = new App\Models\AdminTask(['title' => 'Optimistic task '.$suffix, 'completed' => false]);
            $task->user_id = $admin->id;
            $task->save();
            $tasks[] = $task->id;
        }
        echo json_encode(compact('reviews', 'tasks'));
    `], { env: process.env, encoding: 'utf8', stdio: ['pipe', 'pipe', 'pipe'] }));
}

async function login(page, role) {
    await page.goto('/login');
    await page.getByLabel('Email address').fill(role === 'admin' ? 'pasigcenro@gmail.com' : 'customer@agrifarm.test');
    await page.getByLabel('Password', { exact: true }).fill('AgriFarm123!');
    await page.getByRole('button', { name: 'Login', exact: true }).click();
    if (role === 'admin') await expect(page).toHaveURL(/\/admin\/dashboard$/);
    else await expect(page.getByRole('button', { name: 'Open account menu', exact: true })).toBeVisible();
}

async function delayedActions(page, pattern, ids, outcome = 'success') {
    const gates = new Map(ids.map(id => {
        let release;
        const gate = new Promise(resolve => { release = resolve; });
        return [String(id), { gate, release, requests: 0 }];
    }));
    const pending = [];
    const handler = route => {
        const task = (async () => {
            const id = new URL(route.request().url()).pathname.match(/\/(\d+)(?:\/react)?$/)?.[1];
            const entry = gates.get(id);
            if (!entry) return route.continue();
            entry.requests++;
            await entry.gate;
            if (outcome === 'http') return route.fulfill({ status: 503, contentType: 'text/plain', body: 'Temporarily unavailable' });
            if (outcome === 'network') return route.abort('failed');
            if (outcome === 'lost-response') {
                await route.fetch();
                return route.abort('failed');
            }
            if (outcome === 'validation') return route.continue({ postData: JSON.stringify(route.request().method() === 'PATCH' ? { completed: 'invalid' } : { type: 'invalid' }) });
            return route.continue();
        })();
        pending.push(task);
        return task;
    };
    await page.route(pattern, handler);
    return {
        release: id => gates.get(String(id)).release(),
        requests: id => gates.get(String(id)).requests,
        dispose: async () => { gates.forEach(entry => entry.release()); await Promise.all(pending); await page.unroute(pattern, handler); },
    };
}

for (const width of [390, 768, 1440]) {
    test(`review reactions update before confirmation and survive out-of-order responses at ${width}px`, async ({ page }, testInfo) => {
        const { reviews } = seedActions();
        await page.setViewportSize({ width, height: 1000 });
        await login(page, 'customer');
        await page.goto('/?page=product&product=pechay');
        const first = page.locator('.review-item').filter({ hasText: 'Optimistic reaction one' });
        const second = page.locator('.review-item').filter({ hasText: 'Optimistic reaction two' });
        const firstLike = first.getByRole('button', { name: /^Like review,/ });
        const secondLike = second.getByRole('button', { name: /^Like review,/ });
        const held = await delayedActions(page, '**/product-reviews/*/react', reviews);
        try {
            await firstLike.click();
            await expect(firstLike).toHaveAttribute('aria-pressed', 'true');
            await expect(firstLike).toHaveText('1');
            await expect(firstLike).toBeDisabled();
            expect((await firstLike.boundingBox()).height).toBeGreaterThanOrEqual(44);
            await secondLike.click();
            await expect(secondLike).toHaveText('1');
            await expect.poll(() => held.requests(reviews[0])).toBe(1);
            await expect.poll(() => held.requests(reviews[1])).toBe(1);
            held.release(reviews[1]);
            await expect(secondLike).toBeEnabled();
            await expect(firstLike).toHaveText('1');
            await expect(firstLike).toBeDisabled();
            await first.screenshot({ path: testInfo.outputPath(`optimistic-review-${width}.png`), animations: 'disabled' });
            expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
        } finally { await held.dispose(); }
        await expect(firstLike).toBeEnabled();
        await page.reload();
        await expect(firstLike).toHaveAttribute('aria-pressed', 'true');
        await expect(secondLike).toHaveAttribute('aria-pressed', 'true');
        await first.getByRole('button', { name: /^Dislike review,/ }).click();
        await expect(first.getByRole('button', { name: /^Dislike review,/ })).toBeEnabled();
        await expect(firstLike).toHaveText('0');
        await expect(first.getByRole('button', { name: /^Dislike review,/ })).toHaveText('1');
        await first.getByRole('button', { name: /^Dislike review,/ }).click();
        await expect(first.getByRole('button', { name: /^Dislike review,/ })).toBeEnabled();
        await expect(first.getByRole('button', { name: /^Dislike review,/ })).toHaveText('0');
    });

    test(`task completion and progress update instantly at ${width}px`, async ({ page }, testInfo) => {
        const { tasks } = seedActions();
        await page.setViewportSize({ width, height: 1000 });
        await login(page, 'admin');
        const first = page.locator('.admin-todo-list article').filter({ hasText: 'Optimistic task one' });
        const second = page.locator('.admin-todo-list article').filter({ hasText: 'Optimistic task two' });
        const check = first.locator('.admin-task-check');
        const held = await delayedActions(page, '**/admin/tasks/*', tasks);
        try {
            await check.click();
            await expect(check).toHaveAttribute('aria-pressed', 'true');
            await expect(first).toHaveClass('is-complete');
            await expect(first).toContainText('Completed');
            await expect(page.getByRole('progressbar')).toHaveAttribute('aria-valuenow', '50');
            await expect(check).toBeDisabled();
            await expect(first.getByRole('button', { name: 'Delete Optimistic task one' })).toBeDisabled();
            await second.locator('.admin-task-check').click();
            await expect(page.getByRole('progressbar')).toHaveAttribute('aria-valuenow', '100');
            held.release(tasks[1]);
            await expect(second.locator('.admin-task-check')).toBeEnabled();
            await expect(check).toHaveAttribute('aria-pressed', 'true');
            await expect(check).toBeDisabled();
            await page.locator('.admin-todo-panel').screenshot({ path: testInfo.outputPath(`optimistic-tasks-${width}.png`), animations: 'disabled' });
            expect((await check.boundingBox()).height).toBeGreaterThanOrEqual(44);
            expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
        } finally { await held.dispose(); }
        await expect(check).toBeEnabled();
        await page.reload();
        await expect(page.getByRole('progressbar')).toHaveAttribute('aria-valuenow', '100');
        await check.click();
        await expect(check).toBeEnabled();
        await expect(check).toHaveAttribute('aria-pressed', 'false');
    });
}

for (const outcome of ['http', 'network', 'validation', 'lost-response']) {
    test(`review reactions roll back after ${outcome} failures`, async ({ page }) => {
        const { reviews } = seedActions();
        await login(page, 'customer');
        await page.goto('/?page=product&product=pechay');
        const review = page.locator('.review-item').filter({ hasText: 'Optimistic reaction one' });
        const like = review.getByRole('button', { name: /^Like review,/ });
        const held = await delayedActions(page, '**/product-reviews/*/react', [reviews[0]], outcome);
        try {
            await like.click();
            await expect(like).toHaveText('1');
            held.release(reviews[0]);
            await expect(like).toBeEnabled();
            await expect(like).toHaveAttribute('aria-pressed', 'false');
            await expect(like).toHaveText('0');
            await expect(page.getByRole('alert')).toContainText('Could not save your reaction');
        } finally { await held.dispose(); }
        await like.click();
        await expect(like).toBeEnabled();
        await page.reload();
        await expect(like).toHaveText('1');
    });

    test(`task completion rolls back after ${outcome} failures`, async ({ page }) => {
        const { tasks } = seedActions();
        await login(page, 'admin');
        const task = page.locator('.admin-todo-list article').filter({ hasText: 'Optimistic task one' });
        const check = task.locator('.admin-task-check');
        const held = await delayedActions(page, '**/admin/tasks/*', [tasks[0]], outcome);
        try {
            await check.click();
            await expect(check).toHaveAttribute('aria-pressed', 'true');
            held.release(tasks[0]);
            await expect(check).toBeEnabled();
            await expect(check).toHaveAttribute('aria-pressed', 'false');
            await expect(page.getByRole('progressbar')).toHaveAttribute('aria-valuenow', '0');
            await expect(page.getByRole('alert')).toContainText('Could not save the task');
        } finally { await held.dispose(); }
        await check.click();
        await expect(check).toBeEnabled();
        await page.reload();
        await expect(check).toHaveAttribute('aria-pressed', 'true');
    });
}
