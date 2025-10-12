import { test, expect } from '@playwright/test';

const DISCOGS_TOKEN = process.env.E2E_DISCOGS_TOKEN;

test.describe('Authentication and Navigation', () => {
  test.beforeEach(async ({ context }) => {
    // Clear cookies before each test to ensure a clean slate
    await context.clearCookies();
  });

  test('should redirect to login page if not authenticated', async ({ page }) => {
    await page.goto('/collection');
    await expect(page).toHaveURL('/');
    await expect(page.getByRole('heading', { name: 'Discogs Viewer' })).toBeVisible();
  });

  test('should show an error for an invalid token', async ({ page }) => {
    await page.goto('/');
    await page.getByLabel('Personal Access Token').fill('invalidtoken123');
    await page.getByRole('button', { name: 'Connect to Discogs' }).click();
    await expect(page.getByText('Error: Authentication failed')).toBeVisible();
  });

  test('should allow a user to log in, navigate, and log out', async ({ page }) => {
    if (!DISCOGS_TOKEN) {
      test.skip(true, 'E2E_DISCOGS_TOKEN is not set. Skipping login test.');
      return;
    }
    
    // 1. Login
    await page.goto('/');
    await page.getByLabel('Personal Access Token').fill(DISCOGS_TOKEN);
    await page.getByRole('button', { name: 'Connect to Discogs' }).click();

    // 2. Verify redirect to collection and see content
    await page.waitForURL('/collection');
    await expect(page).toHaveURL('/collection');
    await expect(page.getByRole('link', { name: /Collection/ })).toHaveClass(/bg-discogs-blue/);
    await expect(page.locator('.group').first()).toBeVisible(); // Check for at least one album card

    // 3. Navigate to Wantlist
    await page.getByRole('link', { name: /Wantlist/ }).click();
    await page.waitForURL('/wantlist');
    await expect(page).toHaveURL('/wantlist');
    await expect(page.getByRole('link', { name: /Wantlist/ })).toHaveClass(/bg-discogs-blue/);
    await expect(page.locator('.group').first()).toBeVisible();

    // 4. Navigate back to Collection
    await page.getByRole('link', { name: /Collection/ }).click();
    await page.waitForURL('/collection');
    await expect(page).toHaveURL('/collection');

    // 5. Logout
    await page.getByRole('button', { name: 'Logout' }).click();
    await page.waitForURL('/');
    await expect(page).toHaveURL('/');
    await expect(page.getByRole('heading', { name: 'Discogs Viewer' })).toBeVisible();

    // 6. Verify logged out state
    await page.goto('/collection');
    await expect(page).toHaveURL('/');
  });
});