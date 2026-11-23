import { randomUUID } from 'node:crypto';
import { createClient } from '@supabase/supabase-js';
import { expect, test } from '@playwright/test';
import { loadEnv } from 'vite';

test('new user can sign up', async ({ page }) => {
  const env = loadEnv('development', process.cwd(), '');
  const projectUrl = env.VITE_SUPABASE_URL;
  const serviceRoleKey = env.E2E_SUPABASE_SERVICE_ROLE_KEY;

  test.skip(
    !projectUrl || !serviceRoleKey,
    'Add E2E_SUPABASE_SERVICE_ROLE_KEY to the local Frontend/.env.',
  );

  const supabaseAdmin = createClient(projectUrl!, serviceRoleKey!, {
    auth: { autoRefreshToken: false, persistSession: false },
  });
  const email = `playwright-${randomUUID()}@example.com`;
  const password = `${randomUUID()}A1!`;
  let createdUserId: string | undefined;

  try {
    await page.goto('/login');
    await page.getByRole('button', { name: 'Need an account? Sign up' }).click();
    await expect(page.getByRole('heading', { name: 'Create your account' })).toBeVisible();

    const signUpResponsePromise = page.waitForResponse(response =>
      response.url().includes('/auth/v1/signup') && response.request().method() === 'POST',
    );

    await page.getByRole('textbox', { name: 'Email' }).fill(email);
    await page.getByLabel('Password').fill(password);
    await page.getByRole('button', { name: 'Create account' }).click();

    const signUpResponse = await signUpResponsePromise;
    const responseBody = await signUpResponse.json().catch(() => ({})) as {
      id?: string;
      user?: { id?: string };
    };
    createdUserId = responseBody.user?.id ?? responseBody.id;

    expect(signUpResponse.ok()).toBe(true);
    expect(createdUserId).toBeTruthy();
    await expect(
      page.getByRole('heading', { name: 'My Medications' })
        .or(page.getByRole('status').filter({ hasText: 'Account created.' })),
    ).toBeVisible();
  } finally {
    if (createdUserId) {
      const { error } = await supabaseAdmin.auth.admin.deleteUser(createdUserId);
      expect(error).toBeNull();
    }
  }
});