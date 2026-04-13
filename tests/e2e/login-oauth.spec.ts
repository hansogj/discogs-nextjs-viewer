import { test, expect, type Response } from '@playwright/test';
import dotenv from 'dotenv';
import path from 'path';

dotenv.config({ path: path.resolve(process.cwd(), '.env.local') });

const DISCOGS_USERNAME = process.env.TEST_DISCOGS_USERNAME;
const DISCOGS_PASSWORD = process.env.TEST_DISCOGS_PASSWORD;

test.describe('OAuth Login Flow', () => {
  /**
   * Automated: verifies the OAuth request endpoint redirects to Discogs
   * and sets the session cookie with request tokens.
   */
  test('request endpoint should redirect to Discogs with session cookie', async ({
    request,
  }) => {
    const resp = await request.get('/api/oauth/request', {
      maxRedirects: 0,
    });

    expect(resp.status()).toBe(307);

    const location = resp.headers()['location'] ?? '';
    expect(location).toContain('discogs.com/oauth/authorize');
    expect(location).toContain('oauth_token=');

    const setCookie = resp.headers()['set-cookie'] ?? '';
    expect(setCookie).toContain('discogs-viewer-session=');
  });

  /**
   * Automated: verifies that the middleware protects /collection and
   * allows access when a valid session cookie is present.
   */
  test('middleware should protect /collection and allow with session', async ({
    request,
  }) => {
    // Without auth → redirect to /
    const noAuth = await request.get('/collection', { maxRedirects: 0 });
    expect(noAuth.status()).toBe(307);
    expect(noAuth.headers()['location']).toBe('/');

    // With a programmatically sealed session → 200
    const { sealData } = await import('iron-session');
    const sealed = await sealData(
      {
        accessToken: 'test',
        accessTokenSecret: 'test',
        user: {
          id: 1,
          username: 'testuser',
          avatar_url: '',
          resource_url: '',
        },
      },
      { password: process.env.AUTH_SECRET! },
    );

    const withAuth = await request.get('/collection', {
      maxRedirects: 0,
      headers: { cookie: `discogs-viewer-session=${sealed}` },
    });
    expect(withAuth.status()).toBe(200);
  });

  /**
   * Full E2E against real Discogs (headed mode only).
   *
   * Discogs uses reCAPTCHA + MFA so this MUST be run interactively:
   *
   *   pnpm exec playwright test tests/e2e/login-oauth.spec.ts \
   *     --headed --grep "full OAuth"
   *
   * You will need to:
   *   1. Solve the reCAPTCHA
   *   2. Click "Continue"
   *   3. Enter your MFA/OTP code (if enabled)
   *   4. Click "Authorize" (if prompted)
   */
  test('full OAuth flow should redirect to /collection', async ({
    page,
  }) => {
    test.setTimeout(180_000);

    if (!DISCOGS_USERNAME || !DISCOGS_PASSWORD) {
      test.skip(
        true,
        'Missing TEST_DISCOGS_USERNAME or TEST_DISCOGS_PASSWORD',
      );
      return;
    }

    // ── Diagnostics ──────────────────────────────────────────────
    page.on('response', async (resp: Response) => {
      const url = resp.url();
      if (url.includes('localhost')) {
        console.log(`  [${resp.status()}] ${url}`);
      }
    });

    // ── Home page → click Login ──────────────────────────────────
    await page.goto('/');
    const loginBtn = page.getByRole('button', { name: /login/i });
    await expect(loginBtn).toBeVisible();
    await loginBtn.click();

    // ── Discogs login page ───────────────────────────────────────
    await page.waitForURL(/discogs\.com/, { timeout: 20_000 });
    await page.waitForLoadState('domcontentloaded');

    const usernameInput = page.locator(
      'input[name="username"], input#username',
    );
    if (await usernameInput.isVisible({ timeout: 5_000 }).catch(() => false)) {
      console.log('  Filling Discogs credentials');
      await usernameInput.fill(DISCOGS_USERNAME);
      await page
        .locator('input[name="password"], input#password')
        .fill(DISCOGS_PASSWORD);

      // Discogs uses Auth0 with reCAPTCHA that cannot be automated.
      // The user must: check the reCAPTCHA → click Continue in the browser.
      console.log(
        '\n>>> In the browser: check "I\'m not a robot", then click Continue <<<\n',
      );
    }

    // ── Wait for user to complete CAPTCHA + login + Authorize ────
    const deadline = Date.now() + 160_000;
    let clickedAuthorize = false;
    while (Date.now() < deadline) {
      const url = page.url();

      if (url.includes('localhost')) break;

      if (url.includes('mfa') || url.includes('otp')) {
        console.log('\n>>> Enter your MFA/OTP code <<<\n');
        await page
          .waitForURL((u) => !u.toString().includes('mfa'), {
            timeout: Math.min(deadline - Date.now(), 60_000),
          })
          .catch(() => {});
        continue;
      }

      const authBtn = page.locator(
        'button[name="action"][value="authorize"], button:has-text("Authorize")',
      );
      if (
        await authBtn.first().isVisible({ timeout: 2_000 }).catch(() => false)
      ) {
        console.log('  Authorize page reached — clicking');
        await page.screenshot({ path: 'test-results/authorize-page.png' });
        await authBtn.first().click();
        clickedAuthorize = true;
        break;
      }

      await page
        .waitForURL((u) => u.toString() !== url, {
          timeout: Math.min(deadline - Date.now(), 5_000),
        })
        .catch(() => {});
    }

    // ── Wait for callback redirect to /collection ────────────────
    console.log(
      `  After authorize: clickedAuthorize=${clickedAuthorize}, url=${page.url()}`,
    );

    // Give time for the callback redirect chain to settle
    await page.waitForURL(/localhost/, { timeout: 30_000 });
    console.log(`  Back on localhost: ${page.url()}`);
    await page.screenshot({ path: 'test-results/after-callback.png' });

    // ── Should land on /collection ───────────────────────────────
    await page.waitForURL(/\/collection/, { timeout: 15_000 });
    console.log(`  Final URL: ${page.url()}`);
    await expect(page).toHaveURL(/\/collection/);
  });
});
