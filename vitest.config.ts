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
      // Vitest 4+ measures every file matched by `include`, not just those
      // imported by tests — an honest picture of coverage gaps.
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
      // Threshold acts as a ratchet: current baseline sits above these
      // numbers, so removing tests fails CI. Bump each time coverage
      // improves; do NOT lower to accommodate new untested files —
      // add tests instead.
      // Re-baselined for vitest 5: untested files now count towards the
      // function/branch totals too, so those numbers dropped without any
      // change in what is actually tested.
      thresholds: {
        lines: 7,
        statements: 7,
        functions: 4,
        branches: 8,
      },
    },
  },
});
