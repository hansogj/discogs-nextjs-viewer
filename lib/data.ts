import 'server-only';
import { getSession } from './session';
import { getCollection, getWantlist, processWantlist as processWantlistWithApi } from './discogs';
import type { CollectionRelease, ProcessedWantlistItem } from './types';

const CACHE_TTL_SECONDS = 60 * 60; // 1 hour

// --- Simple In-Memory Cache ---
// This cache is not persistent and will be cleared when the server restarts.
// It's perfect for development and exploratory phases to avoid external dependencies.
interface CacheEntry<T> {
    data: T;
    expiresAt: number;
}
const memoryCache = new Map<string, CacheEntry<any>>();

function getFromCache<T>(key: string): T | null {
    const entry = memoryCache.get(key);
    if (!entry) {
        return null;
    }
    // Check if the cache entry has expired
    if (Date.now() > entry.expiresAt) {
        memoryCache.delete(key);
        return null;
    }
    return entry.data as T;
}

function setInCache<T>(key: string, data: T, ttlSeconds: number): void {
    const expiresAt = Date.now() + ttlSeconds * 1000;
    memoryCache.set(key, { data, expiresAt });
}
// --- End In-Memory Cache ---

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
    
    const cachedData = getFromCache<CollectionRelease[]>(cacheKey);
    if (cachedData) {
        console.log(`[Cache] HIT: ${cacheKey}`);
        return cachedData;
    }
    console.log(`[Cache] MISS: ${cacheKey}`);

    const freshData = await getCollection(user.username, token);
    setInCache(cacheKey, freshData, CACHE_TTL_SECONDS);
    return freshData;
}

export async function getWantlistWithCache(): Promise<ProcessedWantlistItem[]> {
    const { user, token } = await getAuthenticatedUser();
    const cacheKey = `wantlist:${user.id}`;
    
    const cachedData = getFromCache<ProcessedWantlistItem[]>(cacheKey);
    if (cachedData) {
        console.log(`[Cache] HIT: ${cacheKey}`);
        return cachedData;
    }
    console.log(`[Cache] MISS: ${cacheKey}`);


    const rawWantlist = await getWantlist(user.username, token);
    const freshData = await processWantlistWithApi(rawWantlist, token);
    setInCache(cacheKey, freshData, CACHE_TTL_SECONDS);
    return freshData;
}