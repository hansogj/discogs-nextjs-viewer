import 'server-only';
import { kv } from '@vercel/kv';
import { getSession } from './session';
import { getCollection, getWantlist, processWantlist as processWantlistWithApi } from './discogs';
import type { CollectionRelease, ProcessedWantlistItem } from './types';

const CACHE_TTL_SECONDS = 60 * 60; // 1 hour

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
    
    let cachedData = await kv.get<CollectionRelease[]>(cacheKey);
    if (cachedData) {
        return cachedData;
    }

    const freshData = await getCollection(user.username, token);
    await kv.set(cacheKey, freshData, { ex: CACHE_TTL_SECONDS });
    return freshData;
}

export async function getWantlistWithCache(): Promise<ProcessedWantlistItem[]> {
    const { user, token } = await getAuthenticatedUser();
    const cacheKey = `wantlist:${user.id}`;
    
    let cachedData = await kv.get<ProcessedWantlistItem[]>(cacheKey);
    if (cachedData) {
        return cachedData;
    }

    const rawWantlist = await getWantlist(user.username, token);
    const freshData = await processWantlistWithApi(rawWantlist, token);
    await kv.set(cacheKey, freshData, { ex: CACHE_TTL_SECONDS });
    return freshData;
}
