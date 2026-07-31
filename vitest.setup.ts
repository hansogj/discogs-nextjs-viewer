// This side-effect import augments vitest's `Assertion` interface with the
// jest-dom matcher types (toBeInTheDocument, toHaveAttribute, ...). Without
// it tsc reports errors on the matcher calls in *.test.tsx files even though
// the runtime works.
import "@testing-library/jest-dom/vitest";

// Same stubs the CI workflow provides — several lib/* modules validate
// env vars at import time and throw otherwise, which breaks test module
// resolution before any test body runs.
process.env.AUTH_SECRET ??= "ci-stub-auth-secret-at-least-32-characters-long";
process.env.DISCOGS_CONSUMER_KEY ??= "ci-stub";
process.env.DISCOGS_CONSUMER_SECRET ??= "ci-stub";
process.env.DISCOGS_CALLBACK_URL ??= "http://localhost:3000/api/oauth/callback";
process.env.REDIS_URL ??= "redis://localhost:6379";
process.env.NEXT_PUBLIC_APP_URL ??= "http://localhost:3000";
