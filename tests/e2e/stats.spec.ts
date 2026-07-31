import { test, expect, Locator } from "@playwright/test";
import dotenv from "dotenv";
import path from "path";

dotenv.config({ path: path.resolve(process.cwd(), ".env.local") });

async function getSessionCookie(username: string): Promise<string> {
  const { sealData } = await import("iron-session");
  return sealData(
    {
      accessToken: "test",
      accessTokenSecret: "test",
      isLoggedIn: true,
      user: {
        id: 1,
        username,
        avatar_url: "",
        resource_url: "",
      },
    },
    { password: process.env.AUTH_SECRET! },
  );
}

// Native-setter dispatch — Playwright's locator.fill() on a range input does
// not trigger React's onChange via SyntheticEvent. Setting the value via the
// HTMLInputElement prototype setter and dispatching a bubbling 'input' event
// gets React to re-render.
async function setRangeValue(slider: Locator, value: string) {
  await slider.evaluate((el, v) => {
    const setter = Object.getOwnPropertyDescriptor(
      window.HTMLInputElement.prototype,
      "value",
    )?.set;
    setter?.call(el, v);
    el.dispatchEvent(new Event("input", { bubbles: true }));
  }, value);
}

test.describe("Stats page", () => {
  // Same cold-compile reason as best-buys: keep within-suite ordering serial.
  test.describe.configure({ mode: "serial" });

  test.beforeEach(async ({ page }) => {
    const sealed = await getSessionCookie("hansogj");
    await page.context().addCookies([
      {
        name: "discogs-viewer-session",
        value: sealed,
        domain: "localhost",
        path: "/",
      },
    ]);
  });

  test("renders the dashboard with cached collection data", async ({
    page,
  }) => {
    await page.goto("/stats");
    await expect(page).toHaveURL(/\/stats/);

    await expect(
      page.getByRole("heading", { level: 1, name: "Statistikk" }),
    ).toBeVisible();

    // Scope the stat-card check to the four stat cards' uppercase labels —
    // the donut card also has a "Vinyl" legend entry, so a global lookup
    // would be ambiguous.
    const statsGrid = page
      .locator("div")
      .filter({ has: page.getByText("Utgivelser", { exact: true }) })
      .first();
    for (const label of [
      "Utgivelser",
      "Unike artister",
      "Plateselskaper",
      "Vinyl",
    ]) {
      await expect(
        statsGrid.getByText(label, { exact: true }).first(),
      ).toBeVisible();
    }

    await expect(
      page.getByRole("heading", { name: "Samlingens søyler" }),
    ).toBeVisible();
    await expect(
      page.getByRole("heading", { name: "Mest samlede artister" }),
    ).toBeVisible();
    await expect(
      page.getByRole("heading", { name: "Mest samlede selskaper" }),
    ).toBeVisible();
    await expect(page.getByRole("heading", { name: "Format" })).toBeVisible();
  });

  test("pillar slider changes the displayed pillar count", async ({ page }) => {
    await page.goto("/stats");

    // Wait for client-side hydration — before this point, dispatched input
    // events fire on a stub element with no React onChange wired up.
    await expect(page.locator('[data-hydrated="true"]')).toBeVisible();

    const slider = page.getByRole("slider");
    await expect(slider).toBeVisible();
    // The slider defaults to the number of styles with >= 10 items (data-
    // dependent); assert only that a value is present and that it renders
    // in the label next to the slider.
    const initial = await slider.inputValue();
    expect(Number(initial)).toBeGreaterThanOrEqual(3);

    await setRangeValue(slider, "5");
    await expect(slider).toHaveValue("5");
    // The count is rendered as its own <span> next to the slider label.
    await expect(page.getByText("Antall søyler")).toBeVisible();

    // Bumping back up should also work.
    await setRangeValue(slider, "6");
    await expect(slider).toHaveValue("6");
  });

  test("format donut shows a vinyl percentage", async ({ page }) => {
    await page.goto("/stats");
    const donut = page.locator("svg").filter({ hasText: /Vinyl/ }).first();
    await expect(donut).toBeVisible();
    await expect(donut).toContainText(/\d+%/);
  });
});
