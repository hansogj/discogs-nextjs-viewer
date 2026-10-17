import { defineConfig, devices } from "@playwright/test";
import dotenv from "dotenv";
import path from "path";

// Read from default ".env" file.
dotenv.config({ path: path.resolve(".", ".env") });

export default defineConfig({
  testDir: "./tests/e2e",
  // Seed Redis with synthetic fixture data before any spec runs
  // (see tests/e2e/global-setup.ts).
  globalSetup: "./tests/e2e/global-setup.ts",
  fullyParallel: true,
  forbidOnly: !!process.env.CI,
  retries: process.env.CI ? 2 : 0,
  workers: process.env.CI ? 1 : undefined,
  reporter: "html",
  use: {
    baseURL: "http://localhost:3000",
    trace: "on-first-retry",
  },

  projects: [
    {
      name: "chromium",
      use: { ...devices["Desktop Chrome"] },
    },
  ],

  webServer: {
    // In CI the server is pre-started by the e2e workflow before Playwright
    // runs (see .github/workflows/e2e.yml), so Playwright just reuses it.
    // Locally, Playwright starts the dev server itself.
    command: process.env.CI ? "pnpm start" : "pnpm dev",
    url: "http://localhost:3000",
    reuseExistingServer: true,
    timeout: 60_000,
  },
});
