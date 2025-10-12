import 'server-only';
import path from 'path';
import fs from 'fs/promises';
// FIX: Add explicit import for 'process' to resolve TypeScript error about 'cwd'.
import process from 'process';
import type { CollectionRelease, ProcessedWantlistItem } from './types';

// Use .next/cache for storing data. This directory is typically available in Next.js environments.
const CACHE_DIR = path.join(process.cwd(), '.next', 'cache', 'discogs-data');

// Ensure cache directory exists
async function ensureCacheDir() {
  try {
    await fs.mkdir(CACHE_DE_DIR, { recursive: true });
  } catch (error) {
    // This can fail if multiple requests try to create it at once, which is fine.
    if (error.code !== 'EEXIST') {
      console.error('Failed to create cache directory:', error);
    }
  }
}

function getCachePath(username: string, key: 'collection' | 'wantlist') {
  // Sanitize username to create a valid filename
  const safeUsername = username.replace(/[^a-z0-9]/gi, '_').toLowerCase();
  return path.join(CACHE_DIR, `${safeUsername}-${key}.json`);
}

export async function getCachedData<T>(
  username: string,
  key: 'collection' | 'wantlist',
): Promise<T | null> {
  const filePath = getCachePath(username, key);
  try {
    const fileContent = await fs.readFile(filePath, 'utf-8');
    return JSON.parse(fileContent) as T;
  } catch (error) {
    // If file doesn't exist (ENOENT), it's a cache miss, which is normal.
    if (error.code !== 'ENOENT') {
      console.error(`Failed to read cache for ${key}:`, error);
    }
    return null;
  }
}

export async function setCachedData(
  username: string,
  key: 'collection' | 'wantlist',
  data: CollectionRelease[] | ProcessedWantlistItem[],
): Promise<void> {
  await ensureCacheDir();
  const filePath = getCachePath(username, key);
  try {
    await fs.writeFile(filePath, JSON.stringify(data, null, 2), 'utf-8');
    console.log(`[Cache] Wrote ${data.length} items to ${key} cache for ${username}.`);
  } catch (error) {
    console.error(`Failed to write cache for ${key}:`, error);
  }
}

export async function clearUserCache(username: string): Promise<void> {
  console.log(`[Cache] Clearing cache for user: ${username}`);
  try {
    await fs.unlink(getCachePath(username, 'collection'));
  } catch (error) {
    if (error.code !== 'ENOENT') console.error('Failed to clear collection cache:', error);
  }
  try {
    await fs.unlink(getCachePath(username, 'wantlist'));
  } catch (error) {
    if (error.code !== 'ENOENT') console.error('Failed to clear wantlist cache:', error);
  }
}