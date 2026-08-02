import { getCachedData, getSyncInfo } from "./cache";
import {
  getStorageBackend,
  getSyncInfoFromStore,
  getUserData,
  type StoreDataByKey,
  type StoreKey,
} from "./store";
import type { SyncInfo } from "./types";

// Backend-aware read dispatch for the storage-consolidation epic.
// Writers still dispatch locally (worker.ts holds its own writeCache /
// writeSyncInfo — Epic-4 will consolidate). Dual mode prefers Redis and
// falls back to the file cache when the Redis key is missing, so we can
// verify Epic-2's dual-writes are populating Redis without risking stale
// reads if a key hasn't been backfilled yet.

export async function readCache<K extends StoreKey>(
  username: string,
  key: K,
): Promise<StoreDataByKey[K] | null> {
  const backend = getStorageBackend();
  if (backend === "redis") {
    return getUserData(username, key);
  }
  if (backend === "dual") {
    const fromRedis = await getUserData(username, key);
    if (fromRedis !== null) return fromRedis;
  }
  return getCachedData<StoreDataByKey[K]>(username, key);
}

export async function readSyncInfo(username: string): Promise<SyncInfo | null> {
  const backend = getStorageBackend();
  if (backend === "redis") {
    return getSyncInfoFromStore(username);
  }
  if (backend === "dual") {
    const fromRedis = await getSyncInfoFromStore(username);
    if (fromRedis !== null) return fromRedis;
  }
  return getSyncInfo(username);
}
