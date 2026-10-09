import { expect, test } from '@playwright/test';
import { execFileSync } from 'node:child_process';
import path from 'node:path';

test.beforeAll(() => {
    execFileSync('php', ['-r', String.raw`
        require 'vendor/autoload.php';
        $app = require 'bootstrap/app.php';
        $app->make(Illuminate\Contracts\Console\Kernel::class)->bootstrap();
        if (config('database.default') !== 'sqlite' || realpath(config('database.connections.sqlite.database')) !== realpath('database/playwright.sqlite')) throw new RuntimeException('Isolated database required');
        $seller = App\Models\User::where('email', 'brgyrosario@gmail.com')->firstOrFail();
        $photo = 'products/'.Illuminate\Support\Str::uuid().'.jpg';
        Illuminate\Support\Facades\Storage::disk('local')->put($photo, file_get_contents('public/images/kuya-ani-avatar.jpg'));
        $product = new App\Models\Product(['name' => 'Unsaved Test Pechay', 'category' => 'Vegetables',
            'description' => 'Original harvest description.', 'price' => 35, 'unit' => 'kg',
            'stock' => 10, 'threshold' => 5, 'expected_yield' => 0]);
        $product->forceFill(['user_id' => $seller->id, 'photo_path' => $photo])->save();
    `], {
        env: { ...process.env, APP_ENV: 'local', DB_CONNECTION: 'sqlite', DB_DATABASE: path.resolve('database/playwright.sqlite') },
        stdio: 'pipe',
    });
});

for (const width of [390, 768, 1440]) {
    for (const filipino of [false, true]) {
        test(`product edits require discard confirmation at ${width}px in ${filipino ? 'Filipino' : 'English'}`, async ({ page }, testInfo) => {
            await page.setViewportSize({ width, height: 1000 });
            await page.goto('/login');
            await page.getByLabel('Email address').fill('brgyrosario@gmail.com');
            await page.getByLabel('Password', { exact: true }).fill('AgriFarm123!');
            await page.getByRole('button', { name: 'Login' }).click();
            await expect(page).toHaveURL(/\/seller\/dashboard/, { timeout: 45_000 });
            await page.evaluate(language => localStorage.setItem('agrifarm-seller-language', language), filipino ? 'filipino' : 'english');
            await page.goto('/seller/dashboard?section=products');

            const create = page.getByRole('button', { name: filipino ? 'Magdagdag ng produkto' : 'Add product', exact: true }).first();
            const edit = page.getByRole('button', { name: filipino ? 'I-edit ang Unsaved Test Pechay' : 'Edit Unsaved Test Pechay', exact: true });
            const editor = page.locator('dialog.product-modal');
            const confirmation = page.getByRole('dialog', { name: filipino ? 'Itapon ang mga pagbabago?' : 'Discard your changes?' });
            const keep = confirmation.getByRole('button', { name: filipino ? 'Ituloy ang pag-edit' : 'Keep editing', exact: true });
            const discard = confirmation.getByRole('button', { name: filipino ? 'Itapon ang mga pagbabago' : 'Discard changes', exact: true });
            const closeEdit = () => editor.getByRole('button', { name: filipino ? 'Isara ang pag-edit ng produkto' : 'Close edit product', exact: true });
            const closeCreate = () => editor.getByRole('button', { name: filipino ? 'Isara ang pagdagdag ng produkto' : 'Close add product', exact: true });
            const description = () => editor.locator('#product-description');
            const assertUnlocked = async () => expect.poll(() => page.evaluate(() => document.body.style.overflow)).not.toBe('hidden');

            // Untouched forms and equivalent numeric values do not interrupt closing.
            await create.click();
            await closeCreate().click();
            await expect(editor).not.toBeVisible();
            await expect(confirmation).not.toBeVisible();
            await assertUnlocked();
            await edit.click();
            await editor.locator('#product-price').fill('35.0');
            await closeEdit().click();
            await expect(editor).not.toBeVisible();
            await expect(confirmation).not.toBeVisible();

            await edit.click();
            const original = await description().inputValue();
            const draft = `Unsaved description ${width} ${filipino}`;
            await description().fill(draft);
            await editor.getByRole('button', { name: filipino ? 'Kanselahin' : 'Cancel', exact: true }).click();
            await expect(confirmation).toBeVisible();
            await expect(confirmation).toContainText(filipino ? 'Hindi pa nase-save ang iyong mga pagbabago.' : 'Your changes haven’t been saved.');
            await expect(keep).toBeFocused();
            expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBeTruthy();
            for (const button of [keep, discard]) {
                const bounds = await button.boundingBox();
                expect(bounds.height).toBeGreaterThanOrEqual(44);
                expect(bounds.x).toBeGreaterThanOrEqual(0);
                expect(bounds.x + bounds.width).toBeLessThanOrEqual(width);
            }
            await page.screenshot({ path: testInfo.outputPath('discard-light.png'), fullPage: true });
            await page.evaluate(() => document.documentElement.classList.add('dark'));
            await page.screenshot({ path: testInfo.outputPath('discard-dark.png'), fullPage: true });
            await page.evaluate(() => document.documentElement.classList.remove('dark'));
            await keep.click();
            await expect(confirmation).not.toBeVisible();
            await expect(description()).toHaveValue(draft);
            expect(await page.evaluate(() => document.body.style.overflow)).toBe('hidden');

            // Escape and outside clicks also protect the editor. Dismissing the
            // confirmation itself always chooses the safe "keep editing" action.
            await page.keyboard.press('Escape');
            await expect(confirmation).toBeVisible();
            await page.keyboard.press('Escape');
            await expect(confirmation).not.toBeVisible();
            await expect(description()).toHaveValue(draft);
            await page.mouse.click(3, 3);
            await expect(confirmation).toBeVisible();
            await page.mouse.click(3, 3);
            await expect(confirmation).not.toBeVisible();
            await expect(description()).toHaveValue(draft);

            if (width === 390 && !filipino) {
                const warning = page.waitForEvent('dialog');
                // Dismissed beforeunload navigation may remain pending in Chrome.
                const reload = page.reload({ timeout: 5000 }).catch(() => {});
                const dialog = await warning;
                expect(dialog.type()).toBe('beforeunload');
                await dialog.dismiss();
                await reload;
                await expect(description()).toHaveValue(draft);
            }

            await closeEdit().click();
            await discard.click();
            await expect(editor).not.toBeVisible();
            await expect(confirmation).not.toBeVisible();
            await assertUnlocked();
            await edit.click();
            await expect(description()).toHaveValue(original);
            // Returning all fields to their initial values also restores clean state.
            await description().fill(draft);
            await description().fill(original);
            await page.keyboard.press('Escape');
            await expect(editor).not.toBeVisible();
            await expect(confirmation).not.toBeVisible();

            // A successful save closes normally and becomes the new baseline.
            await edit.click();
            const saved = `Saved description ${width} ${filipino}`;
            await description().fill(saved);
            await editor.getByRole('button', { name: filipino ? 'I-save ang mga pagbabago' : 'Save changes', exact: true }).click();
            await expect(editor).not.toBeVisible();
            await expect(confirmation).not.toBeVisible();
            await assertUnlocked();
            await edit.click();
            await expect(description()).toHaveValue(saved);
            await closeEdit().click();
            await expect(editor).not.toBeVisible();

            // Uploaded photos are unsaved changes too, even with untouched text.
            await create.click();
            await editor.locator('#product-photo').setInputFiles(path.resolve('public/images/kuya-ani-avatar.jpg'));
            await page.keyboard.press('Escape');
            await expect(confirmation).toBeVisible();
            await keep.click();
            await expect(editor.locator('.product-upload img')).toHaveAttribute('src', /^blob:/);
            await editor.getByRole('button', { name: filipino ? 'Alisin ang larawan' : 'Remove photo', exact: true }).click();
            await closeCreate().click();
            await expect(editor).not.toBeVisible();
            await expect(confirmation).not.toBeVisible();

            // Failed validation and its draft survive choosing to keep editing.
            await create.click();
            await editor.locator('#product-name').fill('Draft harvest');
            await editor.getByRole('button', { name: filipino ? 'Idagdag ang produkto' : 'Add product', exact: true }).click();
            await expect(editor.locator('#product-price')).toHaveAttribute('aria-invalid', 'true');
            await closeCreate().click();
            await keep.click();
            await expect(editor.locator('#product-name')).toHaveValue('Draft harvest');
            await expect(editor.locator('#product-price')).toHaveAttribute('aria-invalid', 'true');
            await closeCreate().click();
            await discard.click();
            await expect(editor).not.toBeVisible();
            await assertUnlocked();
            await create.click();
            await expect(editor.locator('#product-name')).toHaveValue('');
            await expect(editor.locator('#product-photo')).toHaveValue('');
            await expect(editor.locator('[aria-invalid="true"]')).toHaveCount(0);
            await closeCreate().click();
            await assertUnlocked();
        });
    }
}
