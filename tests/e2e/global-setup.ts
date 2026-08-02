// Playwright globalSetup: seed Redis with fixture data so the
// data-dependent E2E tests (stats, duplicates, best-buys) have something
// to render against. Runs once before all specs.
//
// Key layout mirrors what lib/store writes at runtime:
//   discogs-viewer:user:{safeUsername}:{key}
// Both `hansogj` and `murdrejg` are seeded because the specs seal cookies
// for those two users.

import { Redis } from "ioredis";
import {
  sampleCollection,
  sampleCustomFields,
  sampleFolders,
  sampleSyncInfo,
  sampleWantlist,
  sampleWantlistPrices,
} from "../fixtures/sample-collection";

const KEY_PREFIX = "discogs-viewer";

function sanitizeUsername(username: string): string {
  return username.replace(/[^a-z0-9]/gi, "_").toLowerCase();
}

async function seedForUser(redis: Redis, username: string) {
  const safe = sanitizeUsername(username);
  const base = `${KEY_PREFIX}:user:${safe}`;
  await Promise.all([
    redis.set(`${base}:collection`, JSON.stringify(sampleCollection)),
    redis.set(`${base}:wantlist`, JSON.stringify(sampleWantlist)),
    redis.set(`${base}:folders`, JSON.stringify(sampleFolders)),
    redis.set(`${base}:custom_fields`, JSON.stringify(sampleCustomFields)),
    redis.set(`${base}:wantlist_prices`, JSON.stringify(sampleWantlistPrices)),
    redis.set(`${base}:sync_info`, JSON.stringify(sampleSyncInfo)),
  ]);
}

export default async function globalSetup() {
  const url = process.env.REDIS_URL ?? "redis://localhost:6379";
  const redis = new Redis(url, {
    password: process.env.REDIS_PASSWORD,
    maxRetriesPerRequest: null,
  });
  try {
    await seedForUser(redis, "hansogj");
    await seedForUser(redis, "murdrejg");
  } finally {
    await redis.quit();
  }
}
