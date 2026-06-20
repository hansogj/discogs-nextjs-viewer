import path from "path";
import fs from "fs/promises";
import redis from "./redis";
import type {
  CollectionRelease,
  Folder,
  ProcessedWantlistItem,
  SyncInfo,
  CustomField,
  WantlistPricesMap,
} from "./types";

// Use .next/cache for storing data. This directory is typically available in Next.js environments.
// Fix: Replace `path.join(process.cwd(), ...)` with `path.resolve(...)` to avoid a TypeScript type error
// where `process.cwd` is not found on the `Process` type due to conflicting global type definitions.
// `path.resolve` with a relative path will resolve it against the current working directory, achieving the same result.
const CACHE_DIR = path.resolve("./.next/cache/discogs-data");

// Ensure cache directory exists
async function ensureCacheDir() {
  try {
    await fs.mkdir(CACHE_DIR, { recursive: true });
  } catch (error) {
    // This can fail if multiple requests try to create it at once, which is fine.
    // @ts-ignore
    if ((error as { code?: string }).code !== "EEXIST") {
      console.error("Failed to create cache directory:", error);
    }
  }
}

type CacheKey =
  | "collection"
  | "wantlist"
  | "folders"
  | "custom_fields"
  | "wantlist_prices";

function getCachePath(username: string, key: CacheKey) {
  // Sanitize username to create a valid filename
  const safeUsername = username.replace(/[^a-z0-9]/gi, "_").toLowerCase();
  return path.join(CACHE_DIR, `${safeUsername}-${key}.json`);
}

function getProgressCachePath(username: string) {
  const safeUsername = username.replace(/[^a-z0-9]/gi, "_").toLowerCase();
  return path.join(CACHE_DIR, `${safeUsername}-sync-progress.json`);
}

function getSyncInfoCachePath(username: string) {
  const safeUsername = username.replace(/[^a-z0-9]/gi, "_").toLowerCase();
  return path.join(CACHE_DIR, `${safeUsername}-sync-info.json`);
}

// --- Sync Info ---
export async function getSyncInfo(username: string): Promise<SyncInfo | null> {
  const filePath = getSyncInfoCachePath(username);
  try {
    const fileContent = await fs.readFile(filePath, "utf-8");
    return JSON.parse(fileContent) as SyncInfo;
  } catch (error) {
    // @ts-ignore
    if ((error as { code?: string }).code !== "ENOENT") {
      console.error("Failed to read sync info:", error);
    }
    return null;
  }
}

export async function setSyncInfo(
  username: string,
  info: SyncInfo,
): Promise<void> {
  await ensureCacheDir();
  const filePath = getSyncInfoCachePath(username);
  try {
    await fs.writeFile(filePath, JSON.stringify(info), "utf-8");
  } catch (error) {
    console.error("Failed to write sync info:", error);
  }
}

export async function clearSyncInfo(username: string): Promise<void> {
  const filePath = getSyncInfoCachePath(username);
  try {
    await fs.unlink(filePath);
    console.log(`[Cache] Cleared sync info for ${username}.`);
  } catch (error) {
    // @ts-ignore
    if ((error as { code?: string }).code !== "ENOENT") {
      console.error("Failed to clear sync info file:", error);
    }
  }
}

// --- Sync Progress ---
export interface SyncProgress {
  status: "starting" | "fetching" | "processing" | "caching" | "done" | "error";
  resource?:
    | "collection"
    | "wantlist"
    | "collection_details"
    | "wantlist_details"
    | "collection_masters"
    | "wantlist_prices";
  page?: number;
  pages?: number;
  processed?: number;
  total?: number;
  message?: string;
  progress?: number;
  step?: number;
  totalSteps?: number;
  stepName?: string;
  startedAt?: number;
}

export async function setSyncProgress(
  username: string,
  progress: SyncProgress,
): Promise<void> {
  try {
    await redis.set(
      `sync-progress:${username}`,
      JSON.stringify(progress),
      "EX",
      3600, // expire after 1 hour
    );
  } catch (error) {
    console.error("Failed to write sync progress to Redis:", error);
  }
}

export async function getSyncProgress(
  username: string,
): Promise<SyncProgress | null> {
  try {
    const data = await redis.get(`sync-progress:${username}`);
    if (!data) return null;
    return JSON.parse(data) as SyncProgress;
  } catch (error) {
    console.error("Failed to read sync progress from Redis:", error);
    return null;
  }
}

export async function clearSyncProgress(username: string): Promise<void> {
  try {
    await redis.del(`sync-progress:${username}`);
  } catch (error) {
    console.error("Failed to clear sync progress from Redis:", error);
  }
}

// --- Main Data Cache ---
export async function getCachedData<T>(
  username: string,
  key: CacheKey,
): Promise<T | null> {
  const filePath = getCachePath(username, key);
  try {
    const fileContent = await fs.readFile(filePath, "utf-8");
    return JSON.parse(fileContent) as T;
  } catch (error) {
    // If file doesn't exist (ENOENT), it's a cache miss, which is normal.
    // @ts-ignore
    if ((error as { code?: string }).code !== "ENOENT") {
      console.error(`Failed to read cache for ${key}:`, error);
    }
    return null;
  }
}

export async function setCachedData(
  username: string,
  key: CacheKey,
  data:
    | CollectionRelease[]
    | ProcessedWantlistItem[]
    | Folder[]
    | CustomField[]
    | WantlistPricesMap,
): Promise<void> {
  await ensureCacheDir();
  const filePath = getCachePath(username, key);
  try {
    await fs.writeFile(filePath, JSON.stringify(data, null, 2), "utf-8");
    const itemCount = Array.isArray(data)
      ? data.length
      : Object.keys(data).length;
    console.log(
      `[Cache] Wrote ${itemCount} item(s) to ${key} cache for ${username}.`,
    );
  } catch (error) {
    console.error(`Failed to write cache for ${key}:`, error);
  }
}

export async function clearUserCache(username: string): Promise<void> {
  console.log(`[Cache] Clearing cache for user: ${username}`);
  const collectionPath = getCachePath(username, "collection");
  const wantlistPath = getCachePath(username, "wantlist");
  const foldersPath = getCachePath(username, "folders");
  const customFieldsPath = getCachePath(username, "custom_fields");
  const wantlistPricesPath = getCachePath(username, "wantlist_prices");
  const syncInfoPath = getSyncInfoCachePath(username);

  const unlinkIfExists = (filePath: string, label: string) =>
    fs.unlink(filePath).catch((e) => {
      // @ts-ignore
      if ((e as { code?: string }).code !== "ENOENT")
        console.error(`Failed to clear ${label} cache:`, e);
    });

  await Promise.all([
    unlinkIfExists(collectionPath, "collection"),
    unlinkIfExists(wantlistPath, "wantlist"),
    unlinkIfExists(foldersPath, "folders"),
    unlinkIfExists(customFieldsPath, "custom_fields"),
    unlinkIfExists(wantlistPricesPath, "wantlist_prices"),
    unlinkIfExists(syncInfoPath, "sync info"),
    clearSyncProgress(username),
  ]);
}
