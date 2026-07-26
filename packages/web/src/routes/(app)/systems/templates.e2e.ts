import { expect, test } from '@playwright/test';

const email = `templates-e2e-${Date.now()}@test.com`;
const password = 'password123';

test('P1 flow: create system from built-in template', async ({ page }) => {
    // 1. Sign up
    await page.goto('/sign-up');
    await page.fill('#name', 'E2E User');
    await page.fill('#email', email);
    await page.fill('#password', password);
    await page.click('button:has-text("Create account")');
    await expect(page.locator('text=Save your recovery codes')).toBeVisible({ timeout: 10000 });
    await page.click('text=I\'ve saved them');
    await expect(page).toHaveURL('/guides');

    // 2. Go to System Creator
    await page.goto('/systems/new');
    await expect(page.locator('h1:has-text("Create System")')).toBeVisible();

    // 3. Expand template picker
    await page.click('summary:has-text("Use a template")');

    // 4. Select Reading System template
    await page.click('button:has-text("Reading System")');

    // 5. Verify floor_action is pre-filled from template
    const floorAction = page.locator('#floor_action');
    await expect(floorAction).toHaveValue(/Open the book/);

    // 6. Edit the floor_action
    await floorAction.fill('Read one page at my desk');

    // 7. Wait for autosave, then confirm
    await page.waitForTimeout(3000);
    await page.click('text=Save System');
    await expect(page.locator('text=Every system needs a floor action')).not.toBeVisible({ timeout: 3000 });

    // 8. Verify the original template is unchanged via API
    const res = await page.request.get('http://localhost:8787/api/templates/tpl_reading_system');
    expect(res.status()).toBe(200);
    const template = await res.json();
    expect(template.default_floor_action).toBe('Open the book and read one paragraph');
});
