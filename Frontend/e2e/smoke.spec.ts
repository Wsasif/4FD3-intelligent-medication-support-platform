import { expect, test } from '@playwright/test';

test('login page displays the sign-in form', async ({ page }) => {
  await page.goto('/login');

  await expect(page.getByRole('heading', { name: 'Sign in' })).toBeVisible();
  await expect(page.getByRole('textbox', { name: 'Email' })).toBeVisible();
  await expect(page.getByLabel('Password')).toBeVisible();
});

test('test user can sign in and open medications', async ({ page }) => {
  const email = process.env.E2E_TEST_EMAIL;
  const password = process.env.E2E_TEST_PASSWORD;
  test.skip(!email || !password, 'Set E2E_TEST_EMAIL and E2E_TEST_PASSWORD to run this test.');

  await page.goto('/login');
  await page.getByRole('textbox', { name: 'Email' }).fill(email!);
  await page.getByLabel('Password').fill(password!);
  await page.getByRole('button', { name: 'Sign in' }).click();

  await expect(page).toHaveURL(/\/medications$/);
  await expect(page.getByRole('heading', { name: 'My Medications' })).toBeVisible();
  await expect(page.getByText('Backend connected')).toBeVisible();
  await expect(page.getByRole('alert')).toHaveCount(0);
});