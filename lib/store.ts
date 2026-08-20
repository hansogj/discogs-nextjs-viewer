import redis from "./redis";
import type {
  CollectionRelease,
  Folder,
  ProcessedWantlistItem,
  SyncInfo,
  CustomField,
  WantlistPricesMap,
} from "./types";

// Redis-backed store for per-user Discogs data. Sole persistence layer
// for the app's cached collection/wantlist/etc since Epic-4 retired the
// on-disk JSON cache. Sync progress state still lives in lib/cache.ts
// (also Redis, but ephemeral with a 1h TTL).

const KEY_PREFIX = "discogs-viewer";

// User data is kept for this long after the last sync. Any write (including
// incremental price writes) resets the clock. Data for users who stop using
// the app will vanish on its own after this window without needing a cron.
const USER_DATA_TTL_S = 90 * 24 * 60 * 60; // 90 days

export type StoreKey =
  "collection" | "wantlist" | "folders" | "custom_fields" | "wantlist_prices";

export type StoreDataByKey = {
  collection: CollectionRelease[];
  wantlist: ProcessedWantlistItem[];
  folders: Folder[];
  custom_fields: CustomField[];
  wantlist_prices: WantlistPricesMap;
};

// Strip any character that can't appear in a safe key fragment (anything
// outside [A-Za-z0-9]). Returns a deterministic slug derived from the
// session-provided username, matching the sanitiser the previous
// file-cache backend used so key names stay stable across the migration.
export function sanitizeUsername(username: string): string {
  return username.replace(/[^a-z0-9]/gi, "_").toLowerCase();
}

export function userKey(username: string, key: StoreKey): string {
  return `${KEY_PREFIX}:user:${sanitizeUsername(username)}:${key}`;
}

export function syncInfoKey(username: string): string {
  return `${KEY_PREFIX}:user:${sanitizeUsername(username)}:sync_info`;
}

function userKeyPattern(username: string): string {
  return `${KEY_PREFIX}:user:${sanitizeUsername(username)}:*`;
}

export async function getUserData<K extends StoreKey>(
  username: string,
  key: K,
): Promise<StoreDataByKey[K] | null> {
  try {
    const data = await redis.get(userKey(username, key));
    if (!data) return null;
    return JSON.parse(data) as StoreDataByKey[K];
  } catch (error) {
    console.error(`[Store] Failed to read ${key} for ${username}:`, error);
    return null;
  }
}

export async function setUserData<K extends StoreKey>(
  username: string,
  key: K,
  data: StoreDataByKey[K],
): Promise<void> {
  try {
    await redis.set(
      userKey(username, key),
      JSON.stringify(data),
      "EX",
      USER_DATA_TTL_S,
    );
    const itemCount = Array.isArray(data)
      ? data.length
      : Object.keys(data).length;
    console.log(
      `[Store] Wrote ${itemCount} item(s) to ${key} for ${username}.`,
    );
  } catch (error) {
    console.error(`[Store] Failed to write ${key} for ${username}:`, error);
  }
}

export async function deleteUserData(
  username: string,
  key: StoreKey,
): Promise<void> {
  try {
    await redis.del(userKey(username, key));
  } catch (error) {
    console.error(`[Store] Failed to delete ${key} for ${username}:`, error);
  }
}

export async function getSyncInfoFromStore(
  username: string,
): Promise<SyncInfo | null> {
  try {
    const data = await redis.get(syncInfoKey(username));
    if (!data) return null;
    return JSON.parse(data) as SyncInfo;
  } catch (error) {
    console.error(`[Store] Failed to read sync info for ${username}:`, error);
    return null;
  }
}

export async function setSyncInfoInStore(
  username: string,
  info: SyncInfo,
): Promise<void> {
  try {
    await redis.set(
      syncInfoKey(username),
      JSON.stringify(info),
      "EX",
      USER_DATA_TTL_S,
    );
  } catch (error) {
    console.error(`[Store] Failed to write sync info for ${username}:`, error);
  }
}

const PARTIAL_DATA_TTL_S = 2 * 60 * 60; // 2 hours

function partialKey(
  username: string,
  resource: "collection" | "wantlist",
): string {
  return `${KEY_PREFIX}:user:${sanitizeUsername(username)}:${resource}_partial`;
}

export async function setPartialItems(
  username: string,
  resource: "collection" | "wantlist",
  items: CollectionRelease[] | ProcessedWantlistItem[],
): Promise<void> {
  try {
    await redis.set(
      partialKey(username, resource),
      JSON.stringify(items),
      "EX",
      PARTIAL_DATA_TTL_S,
    );
  } catch (error) {
    console.error(
      `[Store] Failed to write partial ${resource} for ${username}:`,
      error,
    );
  }
}

export async function getPartialItems(
  username: string,
  resource: "collection" | "wantlist",
): Promise<CollectionRelease[] | ProcessedWantlistItem[] | null> {
  try {
    const data = await redis.get(partialKey(username, resource));
    if (!data) return null;
    return JSON.parse(data);
  } catch (error) {
    console.error(
      `[Store] Failed to read partial ${resource} for ${username}:`,
      error,
    );
    return null;
  }
}

export async function clearPartialItems(
  username: string,
  resource: "collection" | "wantlist",
): Promise<void> {
  try {
    await redis.del(partialKey(username, resource));
  } catch (error) {
    console.error(
      `[Store] Failed to clear partial ${resource} for ${username}:`,
      error,
    );
  }
}

// Wipe every key belonging to a user in one shot. Uses SCAN rather than
// KEYS so a runaway keyspace can't block the Redis event loop.
export async function deleteAllUserData(username: string): Promise<number> {
  const pattern = userKeyPattern(username);
  let cursor = "0";
  let deleted = 0;
  try {
    do {
      const [next, batch] = await redis.scan(
        cursor,
        "MATCH",
        pattern,
        "COUNT",
        100,
      );
      cursor = next;
      if (batch.length > 0) {
        deleted += await redis.del(...batch);
      }
    } while (cursor !== "0");
    console.log(
      `[Store] Deleted ${deleted} key(s) for ${username} (pattern ${pattern}).`,
    );
  } catch (error) {
    console.error(`[Store] Failed to delete all data for ${username}:`, error);
  }
  return deleted;
}
