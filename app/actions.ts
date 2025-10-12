'use server';

import { getSession } from '@/lib/session';
import {
  getFullCollection,
  getFullWantlist,
  processWantlist as processWantlistWithApi,
} from '@/lib/discogs';
import { setCachedData, clearUserCache } from '@/lib/cache';
import { revalidatePath } from 'next/cache';

export async function syncAllData(): Promise<{
  success: boolean;
  message?: string;
}> {
  const session = await getSession();
  if (!session.isLoggedIn || !session.user || !session.token) {
    throw new Error('Not authenticated');
  }
  const { user, token } = session;

  console.log(`[Action] Starting full sync for ${user.username}...`);

  try {
    // Fetch all data from Discogs
    console.log('[Action] Fetching collection...');
    const collection = await getFullCollection(user.username, token);
    console.log(`[Action] Fetched ${collection.length} collection items.`);

    console.log('[Action] Fetching wantlist...');
    const wantlist = await getFullWantlist(user.username, token);
    console.log(`[Action] Fetched ${wantlist.length} wantlist items.`);

    // Process wantlist to get master images
    console.log('[Action] Processing wantlist images...');
    const processedWantlist = await processWantlistWithApi(wantlist, token);
    console.log('[Action] Finished processing wantlist.');

    // Write to cache
    console.log('[Action] Writing data to cache...');
    await setCachedData(user.username, 'collection', collection);
    await setCachedData(user.username, 'wantlist', processedWantlist);
    console.log('[Action] Caching complete.');

    // Invalidate paths to trigger re-fetch from cache on client
    revalidatePath('/', 'layout');

    return { success: true, message: 'Sync completed successfully!' };
  } catch (error) {
    console.error('[Action] Sync failed:', error);
    const errorMessage =
      error instanceof Error ? error.message : 'An unknown error occurred';
    return { success: false, message: `Sync failed: ${errorMessage}` };
  }
}

export async function clearCacheAction() {
  const session = await getSession();
  if (!session.isLoggedIn || !session.user) {
    throw new Error('Not authenticated');
  }
  await clearUserCache(session.user.username);
  revalidatePath('/', 'layout');
  console.log(`[Action] Cache cleared for ${session.user.username}`);
  return { success: true };
}
