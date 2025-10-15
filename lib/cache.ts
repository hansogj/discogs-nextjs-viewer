
import 'server-only';
import path from 'path';
import fs from 'fs/promises';
import type {
  CollectionRelease,
  Folder,
  ProcessedWantlistItem,
  SyncInfo,
} from './types';

// Use .next/cache for storing data. This directory is typically available in Next.js environments.
// Fix: Replace `path.join(process.cwd(), ...)` with `path.resolve(...)` to avoid a TypeScript type error
// where `process.cwd` is not found on the `Process` type due to conflicting global type definitions.
// `path.resolve` with a relative path will resolve it against the current working directory, achieving the same result.
const CACHE_DIR = path.resolve('./.next/cache/discogs-data');

// Ensure cache directory exists
async function ensureCacheDir() {
  try {
    await fs.mkdir(CACHE_DIR, { recursive: true });
  } catch (error) {
    // This can fail if multiple requests try to create it at once, which is fine.
    // @ts-ignore
    if ((error as { code?: string }).code !== 'EEXIST') {
      console.error('Failed to create cache directory:', error);
    }
  }
}

type CacheKey = 'collection' | 'wantlist' | 'folders';

function getCachePath(username: string, key: CacheKey) {
  // Sanitize username to create a valid filename
  const safeUsername = username.replace(/[^a-z0-9]/gi, '_').toLowerCase();
  return path.join(CACHE_DIR, `${safeUsername}-${key}.json`);
}

function getProgressCachePath(username: string) {
  const safeUsername = username.replace(/[^a-z0-9]/gi, '_').toLowerCase();
  return path.join(CACHE_DIR, `${safeUsername}-sync-progress.json`);
}

function getSyncInfoCachePath(username: string) {
  const safeUsername = username.replace(/[^a-z0-9]/gi, '_').toLowerCase();
  return path.join(CACHE_DIR, `${safeUsername}-sync-info.json`);
}

// --- Sync Info ---
export async function getSyncInfo(
  username: string,
): Promise<SyncInfo | null> {
  const filePath = getSyncInfoCachePath(username);
  try {
    const fileContent = await fs.readFile(filePath, 'utf-8');
    return JSON.parse(fileContent) as SyncInfo;
  } catch (error) {
    // @ts-ignore
    if ((error as { code?: string }).code !== 'ENOENT') {
      console.error('Failed to read sync info:', error);
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
    await fs.writeFile(filePath, JSON.stringify(info), 'utf-8');
  } catch (error) {
    console.error('Failed to write sync info:', error);
  }
}

// --- Sync Progress ---
export interface SyncProgress {
  status: 'starting' | 'fetching' | 'processing' | 'caching' | 'done' | 'error';
  resource?:
    | 'collection'
    | 'wantlist'
    | 'collection_details'
    | 'wantlist_details'
    | 'collection_masters';
  page?: number;
  pages?: number;
  processed?: number;
  total?: number;
  message?: string;
}

export async function setSyncProgress(
  username: string,
  progress: SyncProgress,
): Promise<void> {
  await ensureCacheDir();
  const filePath = getProgressCachePath(username);
  try {
    await fs.writeFile(filePath, JSON.stringify(progress), 'utf-8');
  } catch (error) {
    console.error('Failed to write sync progress:', error);
  }
}

export async function getSyncProgress(
  username: string,
): Promise<SyncProgress | null> {
  const filePath = getProgressCachePath(username);
  try {
    const fileContent = await fs.readFile(filePath, 'utf-8');
    return JSON.parse(fileContent) as SyncProgress;
  } catch (error) {
    // @ts-ignore
    if ((error as { code?: string }).code !== 'ENOENT') {
      console.error('Failed to read sync progress:', error);
    }
    return null;
  }
}

export async function clearSyncProgress(username: string): Promise<void> {
  const filePath = getProgressCachePath(username);
  try {
    await fs.unlink(filePath);
  } catch (error) {
    // @ts-ignore
    if ((error as { code?: string }).code !== 'ENOENT') {
      console.error('Failed to clear sync progress file:', error);
    }
  }
}

// --- Main Data Cache ---
export async function getCachedData<T>(
  username: string,
  key: CacheKey,
): Promise<T | null> {
  const filePath = getCachePath(username, key);
  try {
    const fileContent = await fs.readFile(filePath, 'utf-8');
    return JSON.parse(fileContent) as T;
  } catch (error) {
    // If file doesn't exist (ENOENT), it's a cache miss, which is normal.
    // @ts-ignore
    if ((error as { code?: string }).code !== 'ENOENT') {
      console.error(`Failed to read cache for ${key}:`, error);
    }
    return null;
  }
}

export async function setCachedData(
  username: string,
  key: CacheKey,
  data: CollectionRelease[] | ProcessedWantlistItem[] | Folder[],
): Promise<void> {
  await ensureCacheDir();
  const filePath = getCachePath(username, key);
  try {
    await fs.writeFile(filePath, JSON.stringify(data, null, 2), 'utf-8');
    const itemCount = Array.isArray(data) ? data.length : 1;
    console.log(
      `[Cache] Wrote ${itemCount} item(s) to ${key} cache for ${username}.`,
    );
  } catch (error) {
    console.error(`Failed to write cache for ${key}:`, error);
  }
}

export async function clearUserCache(username: string): Promise<void> {
  console.log(`[Cache] Clearing cache for user: ${username}`);
  const collectionPath = getCachePath(username, 'collection');
  const wantlistPath = getCachePath(username, 'wantlist');
  const foldersPath = getCachePath(username, 'folders');
  const syncInfoPath = getSyncInfoCachePath(username);

  await Promise.all([
    fs.unlink(collectionPath).catch((e) => {
      // @ts-ignore
      if ((e as { code?: string }).code !== 'ENOENT')
        console.error('Failed to clear collection cache:', e);
    }),
    fs.unlink(wantlistPath).catch((e) => {
      // @ts-ignore
      if ((e as { code?: string }).code !== 'ENOENT')
        console.error('Failed to clear wantlist cache:', e);
    }),
    fs.unlink(foldersPath).catch((e) => {
      // @ts-ignore
      if ((e as { code?: string }).code !== 'ENOENT')
        console.error('Failed to clear folders cache:', e);
    }),
    fs.unlink(syncInfoPath).catch((e) => {
      // @ts-ignore
      if ((e as { code?: string }).code !== 'ENOENT')
        console.error('Failed to clear sync info cache:', e);
    }),
    clearSyncProgress(username),
  ]);
}
