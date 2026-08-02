import redis from "./redis";
import type {
  CollectionRelease,
  Folder,
  ProcessedWantlistItem,
  SyncInfo,
  CustomField,
  WantlistPricesMap,
} from "./types";

// Redis-backed store for per-user Discogs data. Introduced alongside the
// file cache in lib/cache.ts as the first step of a migration away from
// .next/cache/discogs-data JSON files. Not yet wired into worker.ts or
// lib/data.ts — see TODO.md "Storage consolidation epic".

const KEY_PREFIX = "discogs-viewer";

export type StoreKey =
  "collection" | "wantlist" | "folders" | "custom_fields" | "wantlist_prices";

type StoreDataByKey = {
  collection: CollectionRelease[];
  wantlist: ProcessedWantlistItem[];
  folders: Folder[];
  custom_fields: CustomField[];
  wantlist_prices: WantlistPricesMap;
};

export type StorageBackend = "file" | "redis" | "dual";

// Same slug rule as safeCachePath in lib/cache.ts. Kept in sync so a
// username maps to the same identifier in both backends during the
// dual-write migration window.
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

export function getStorageBackend(): StorageBackend {
  const raw = process.env.STORAGE_BACKEND?.toLowerCase();
  if (raw === "redis" || raw === "dual") return raw;
  return "file";
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
    await redis.set(userKey(username, key), JSON.stringify(data));
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
    await redis.set(syncInfoKey(username), JSON.stringify(info));
  } catch (error) {
    console.error(`[Store] Failed to write sync info for ${username}:`, error);
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
