import { test, expect, Page } from '@playwright/test';
import dotenv from 'dotenv';
import path from 'path';

dotenv.config({ path: path.resolve(process.cwd(), '.env.local') });

async function getSessionCookie(username: string): Promise<string> {
  const { sealData } = await import('iron-session');
  return sealData(
    {
      accessToken: 'test',
      accessTokenSecret: 'test',
      isLoggedIn: true,
      user: {
        id: 1,
        username,
        avatar_url: '',
        resource_url: '',
      },
    },
    { password: process.env.AUTH_SECRET! },
  );
}

const panel = (page: Page) =>
  page
    .getByRole('heading', { name: 'Best buys' })
    .locator('xpath=ancestor::div[1]');

const pricesInPanel = async (p: Page) => {
  const texts = await panel(p)
    .locator('span')
    .filter({ hasText: /^~\d+ NOK$/ })
    .allInnerTexts();
  return texts
    .map((t) => parseInt(t.match(/~(\d+) NOK/)?.[1] ?? '', 10))
    .filter((n) => !isNaN(n));
};

test.describe('Best buys panel', () => {
  // Three tests all hit /wantlist, which Next.js dev mode compiles lazily on
  // first request. Running them serially within this suite avoids racing the
  // initial compile across parallel workers.
  test.describe.configure({ mode: 'serial' });

  test.beforeEach(async ({ page }) => {
    const sealed = await getSessionCookie('hansogj');
    await page.context().addCookies([
      {
        name: 'discogs-viewer-session',
        value: sealed,
        domain: 'localhost',
        path: '/',
      },
    ]);
  });

  test('panel renders with cached prices, deep-link, sort + budget controls', async ({
    page,
  }) => {
    await page.goto('/wantlist');
    const p = panel(page);
    await expect(p).toBeVisible();

    // Mywants deep-link is present and well-formed
    const mywantsLink = p.getByRole('link', {
      name: /Find best seller on Discogs/i,
    });
    await expect(mywantsLink).toBeVisible();
    await expect(mywantsLink).toHaveAttribute(
      'href',
      /discogs\.com\/sell\/mywants/,
    );

    // Sort + filter controls
    for (const label of ['Taste match', 'Value', 'Cheapest']) {
      await expect(p.getByRole('button', { name: label })).toBeVisible();
    }
    await expect(p.getByRole('spinbutton')).toBeVisible();
    await expect(p.getByRole('button', { name: 'Apply' })).toBeVisible();

    // At least one item is showing with a NOK price
    const prices = await pricesInPanel(page);
    expect(prices.length).toBeGreaterThan(0);
  });

  // The panel sets data-hydrated="true" inside a useEffect, so this attribute
  // is missing in server-rendered HTML and only appears after React has
  // attached its onClick handlers. Without this wait, the first click after
  // navigation fires on a stub element and the sortMode state never updates.
  async function waitForPanelHydration(p: ReturnType<typeof panel>) {
    // 15 s — Next.js dev server compiles /wantlist on first hit, which can
    // take 5–10 s before client hydration even starts.
    await expect(p).toHaveAttribute('data-hydrated', 'true', { timeout: 15_000 });
  }

  test('cheapest sort puts the lowest-priced items at the top', async ({
    page,
  }) => {
    await page.goto('/wantlist');
    const p = panel(page);
    await waitForPanelHydration(p);

    const cheapest = p.getByRole('button', { name: 'Cheapest' });
    await cheapest.click();
    await expect(cheapest).toHaveAttribute('aria-pressed', 'true');

    const prices = await pricesInPanel(page);
    expect(prices.length).toBeGreaterThan(1);
    for (let i = 1; i < prices.length; i++) {
      expect(prices[i]).toBeGreaterThanOrEqual(prices[i - 1]);
    }
  });

  test('lowering the budget removes items above the new ceiling', async ({
    page,
  }) => {
    await page.goto('/wantlist');
    const p = panel(page);
    await waitForPanelHydration(p);

    const cheapest = p.getByRole('button', { name: 'Cheapest' });
    await cheapest.click();
    await expect(cheapest).toHaveAttribute('aria-pressed', 'true');

    const initial = await pricesInPanel(page);
    expect(initial.length).toBeGreaterThan(0);

    const ceiling = Math.max(initial[1] ?? initial[0], initial[0] + 1);
    await p.getByRole('spinbutton').fill(String(ceiling));
    await p.getByRole('button', { name: 'Apply' }).click();
    await expect(p).toContainText(`≤ ${ceiling} NOK`);

    const filtered = await pricesInPanel(page);
    expect(filtered.length).toBeGreaterThan(0);
    for (const price of filtered) {
      expect(price).toBeLessThanOrEqual(ceiling);
    }
  });
});
