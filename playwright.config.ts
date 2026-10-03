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
    // In CI use a pre-built production server to avoid slow on-demand webpack
    // compilation under Node 24 (which caused the dev-mode E2E suite to exceed
    // the 20-minute job timeout after the pnpm 12 / Node 24 migration).
    command: process.env.CI ? "pnpm build && pnpm start" : "pnpm dev",
    url: "http://localhost:3000",
    reuseExistingServer: !process.env.CI,
    timeout: 120_000,
  },
});
