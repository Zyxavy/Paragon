import { expect, test } from '@playwright/test';

test('debug auth', async ({ page }) => {
  page.on('console', msg => console.log('PAGE LOG:', msg.type(), msg.text()));
  page.on('request', req => console.log('REQ:', req.method(), req.url()));
  page.on('response', res => console.log('RES:', res.status(), res.url()));
  page.on('requestfailed', req => console.log('REQ_FAILED:', req.url(), req.failure()?.errorText));

  const email = `debug-${Date.now()}@test.com`;
  const password = 'password123';

  // Sign up
  await page.goto('/sign-up');
  await page.fill('#name', 'Debug User');
  await page.fill('#email', email);
  await page.fill('#password', password);
  await page.click('button:has-text("Create account")');

  // Recovery codes
  await expect(page.locator('text=Save your recovery codes')).toBeVisible({ timeout: 15000 });
  await page.click('text=I\'ve saved them');
  await expect(page).toHaveURL('/guides');

  // Sign out
  await page.request.post('http://localhost:8787/api/auth/sign-out');
  await page.context().clearCookies();

  // Sign in
  await page.goto('/sign-in');
  await page.fill('#email', email);
  await page.fill('#password', password);
  await page.click('button:has-text("Sign in")');

  await page.waitForTimeout(3000);
  console.log('AFTER SIGNIN URL:', page.url());
  console.log('AFTER SIGNIN HTML:', await page.content().then(h => h.substring(0, 3000)));
});
