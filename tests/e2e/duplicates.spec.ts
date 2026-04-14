import { test, expect } from '@playwright/test';
import dotenv from 'dotenv';
import path from 'path';

dotenv.config({ path: path.resolve(process.cwd(), '.env.local') });

/**
 * Helper: creates a sealed iron-session cookie so we can access
 * protected pages without going through the full OAuth flow.
 */
async function getSessionCookie(): Promise<string> {
  const { sealData } = await import('iron-session');
  const sealed = await sealData(
    {
      accessToken: 'test',
      accessTokenSecret: 'test',
      user: {
        id: 1,
        username: 'murdrejg',
        avatar_url: '',
        resource_url: '',
      },
    },
    { password: process.env.AUTH_SECRET! },
  );
  return `discogs-viewer-session=${sealed}`;
}

test.describe('Duplicates page', () => {
  test('collection items sharing the same master (or release id) appear as duplicates', async ({
    page,
  }) => {
    // Inject session cookie to bypass OAuth
    const cookie = await getSessionCookie();
    await page.context().addCookies([
      {
        name: 'discogs-viewer-session',
        value: cookie.split('=').slice(1).join('='),
        domain: 'localhost',
        path: '/',
      },
    ]);

    // Load the collection page first to confirm data is available
    await page.goto('/collection');
    await expect(page).toHaveURL(/\/collection/);

    // Navigate to duplicates
    await page.goto('/duplicates');
    await expect(page).toHaveURL(/\/duplicates/);

    // The heading should be present
    await expect(
      page.getByRole('heading', { name: /duplicate releases/i }),
    ).toBeVisible();

    // Should NOT show the "no duplicates" message
    await expect(
      page.getByText(/no duplicate releases found/i),
    ).not.toBeVisible();

    // There should be at least one duplicate group section
    const groups = page.locator('section');
    await expect(groups).not.toHaveCount(0);

    // Each group should contain more than one album entry (the duplicates)
    const firstGroup = groups.first();
    const items = firstGroup.locator('ul > *');
    const count = await items.count();
    expect(count).toBeGreaterThan(1);
  });
});
