// FIX: Add a triple-slash directive to include Node.js types. This resolves the
// error on 'process.cwd()' by correctly typing the global 'process' object.
/// <reference types="node" />

import 'server-only';
import { getSession } from './session';
import { getCollection, getWantlist, processWantlist as processWantlistWithApi } from './discogs';
import type { CollectionRelease, ProcessedWantlistItem } from './types';
import path from 'path';
import fs from 'fs/promises';

const CACHE_DIR = path.join(process.cwd(), '.next', 'cache', 'discogs');
const CACHE_TTL_SECONDS = 60 * 60; // 1 hour

// --- Simple File-based Cache ---
// This cache is persistent across server restarts, storing data in the local filesystem.
// It's designed to prevent hitting API rate limits on subsequent app loads.
// NOTE: This may not work in serverless environments with read-only filesystems.
interface CacheEntry<T> {
    data: T;
    expiresAt: number;
}

// Ensure the cache directory exists. This runs once when the module is loaded.
fs.mkdir(CACHE_DIR, { recursive: true }).catch(err => {
    console.error("Failed to create cache directory:", err);
});

function getCacheFilePath(key: string): string {
    // Sanitize the key to create a safe filename
    const safeKey = key.replace(/[^a-z0-9-]/gi, '_').toLowerCase();
    return path.join(CACHE_DIR, `${safeKey}.json`);
}

async function getFromCache<T>(key: string): Promise<T | null> {
    const filePath = getCacheFilePath(key);
    try {
        const fileContents = await fs.readFile(filePath, 'utf-8');
        const entry = JSON.parse(fileContents) as CacheEntry<T>;
        
        if (Date.now() > entry.expiresAt) {
            // Cache is expired, delete the file asynchronously and return null
            fs.unlink(filePath).catch(err => console.error(`Failed to delete expired cache file: ${filePath}`, err));
            return null;
        }
        return entry.data;
    } catch (error) {
        // File doesn't exist or is invalid JSON, treat as a cache miss
        return null;
    }
}

async function setInCache<T>(key: string, data: T, ttlSeconds: number): Promise<void> {
    const filePath = getCacheFilePath(key);
    const expiresAt = Date.now() + ttlSeconds * 1000;
    const entry: CacheEntry<T> = { data, expiresAt };

    try {
        await fs.writeFile(filePath, JSON.stringify(entry), 'utf-8');
    } catch (error) {
        console.error(`Failed to write to cache file: ${filePath}`, error);
    }
}
// --- End File-based Cache ---

async function getAuthenticatedUser() {
    const session = await getSession();
    if (!session.isLoggedIn || !session.user || !session.token) {
        throw new Error('Not authenticated');
    }
    return { user: session.user, token: session.token };
}

export async function getCollectionWithCache(): Promise<CollectionRelease[]> {
    const { user, token } = await getAuthenticatedUser();
    const cacheKey = `collection:${user.id}`;
    
    const cachedData = await getFromCache<CollectionRelease[]>(cacheKey);
    if (cachedData) {
        console.log(`[Cache] HIT: ${cacheKey}`);
        return cachedData;
    }
    console.log(`[Cache] MISS: ${cacheKey}`);

    const freshData = await getCollection(user.username, token);
    await setInCache(cacheKey, freshData, CACHE_TTL_SECONDS);
    return freshData;
}

export async function getWantlistWithCache(): Promise<ProcessedWantlistItem[]> {
    const { user, token } = await getAuthenticatedUser();
    const cacheKey = `wantlist:${user.id}`;
    
    const cachedData = await getFromCache<ProcessedWantlistItem[]>(cacheKey);
    if (cachedData) {
        console.log(`[Cache] HIT: ${cacheKey}`);
        return cachedData;
    }
    console.log(`[Cache] MISS: ${cacheKey}`);

    const rawWantlist = await getWantlist(user.username, token);
    const freshData = await processWantlistWithApi(rawWantlist, token);
    await setInCache(cacheKey, freshData, CACHE_TTL_SECONDS);
    return freshData;
}

export function getCollectionDuplicates(collection: CollectionRelease[]): CollectionRelease[][] {
    const masters = new Map<number, CollectionRelease[]>();
    // Group releases by master_id
    for (const release of collection) {
        const masterId = release.basic_information.master_id;
        // master_id is 0 if it's not part of a master release, so we ignore those
        if (masterId > 0) {
            if (!masters.has(masterId)) {
                masters.set(masterId, []);
            }
            masters.get(masterId)!.push(release);
        }
    }

    const duplicates: CollectionRelease[][] = [];
    // Filter for groups with more than one release
    for (const releases of masters.values()) {
        if (releases.length > 1) {
            duplicates.push(releases);
        }
    }
    return duplicates;
}
