// Playwright globalSetup: seed the file cache that lib/data reads from so
// the data-dependent E2E tests (stats, duplicates, best-buys) have
// something to render against. Runs once before all specs.
//
// Cache layout mirrors what lib/cache.setCachedData writes at runtime:
//   .next/cache/discogs-data/{safeUsername}-{key}.json
// Both `hansogj` and `murdrejg` are seeded because the specs seal cookies
// for those two users.

import fs from "fs/promises";
import path from "path";
import {
  sampleCollection,
  sampleCustomFields,
  sampleFolders,
  sampleSyncInfo,
  sampleWantlist,
  sampleWantlistPrices,
} from "../fixtures/sample-collection";

const CACHE_DIR = path.resolve("./.next/cache/discogs-data");

async function writeJSON(file: string, data: unknown) {
  await fs.writeFile(
    path.join(CACHE_DIR, file),
    JSON.stringify(data, null, 2),
    "utf-8",
  );
}

async function seedForUser(username: string) {
  const safe = username.replace(/[^a-z0-9]/gi, "_").toLowerCase();
  await Promise.all([
    writeJSON(`${safe}-collection.json`, sampleCollection),
    writeJSON(`${safe}-wantlist.json`, sampleWantlist),
    writeJSON(`${safe}-folders.json`, sampleFolders),
    writeJSON(`${safe}-custom_fields.json`, sampleCustomFields),
    writeJSON(`${safe}-wantlist_prices.json`, sampleWantlistPrices),
    writeJSON(`${safe}-sync-info.json`, sampleSyncInfo),
  ]);
}

export default async function globalSetup() {
  await fs.mkdir(CACHE_DIR, { recursive: true });
  await seedForUser("hansogj");
  await seedForUser("murdrejg");
}
