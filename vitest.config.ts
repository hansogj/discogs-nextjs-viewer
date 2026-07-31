import { defineConfig } from "vitest/config";
import react from "@vitejs/plugin-react";
import path from "path";

export default defineConfig({
  plugins: [react()],
  resolve: {
    // Mirror the `@/*` -> `./*` alias from tsconfig.json so unit tests can
    // use the same import style as the app code. Also stub `server-only`
    // — it throws on load in a client/test context, but the pure functions
    // we test (computeCollectionStats, getCollectionDuplicates) don't
    // actually touch server-only APIs.
    alias: {
      "@": path.resolve(__dirname, "."),
      "server-only": path.resolve(__dirname, "./tests/stubs/server-only.ts"),
    },
  },
  test: {
    environment: "jsdom",
    globals: true,
    setupFiles: "./vitest.setup.ts",
    exclude: ["**/tests/e2e/**", "**/node_modules/**"],
    coverage: {
      provider: "v8",
      reporter: ["text", "html", "json-summary", "lcov"],
      reportsDirectory: "./coverage",
      // Measure all source files, not just those imported by tests — gives
      // an honest picture of coverage gaps rather than 100% of "what's tested".
      all: true,
      include: [
        "app/**/*.{ts,tsx}",
        "components/**/*.{ts,tsx}",
        "hooks/**/*.{ts,tsx}",
        "lib/**/*.{ts,tsx}",
        "services/**/*.{ts,tsx}",
        "worker.ts",
        "middleware.ts",
      ],
      exclude: [
        "**/*.test.{ts,tsx}",
        "**/*.spec.{ts,tsx}",
        "**/*.d.ts",
        "**/types.ts",
        "**/loading.tsx",
        "**/not-found.tsx",
        "app/**/page.tsx",
        "app/**/layout.tsx",
      ],
      // No thresholds yet — measure first, gate later.
    },
  },
});
