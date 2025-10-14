
'use server';

import { getSession } from '@/lib/session';
import {
  fetchAndAddDetailsToReleases,
  getFullCollection,
  getFullWantlist,
  processWantlist as processWantlistWithApi,
} from '@/lib/discogs';
import {
  setCachedData,
  clearUserCache,
  setSyncProgress,
  clearSyncProgress,
} from '@/lib/cache';
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

  const progressCallback = (progress: {
    page: number;
    pages: number;
    resource: string;
  }) => {
    // Fire-and-forget update
    setSyncProgress(user.username, {
      status: 'fetching',
      resource: progress.resource as 'collection' | 'wantlist',
      page: progress.page,
      pages: progress.pages,
    });
  };

  const detailsProgressCallback = (progress: {
    processed: number;
    total: number;
    resource: string;
  }) => {
    setSyncProgress(user.username, {
      status: 'processing',
      resource:
        progress.resource as 'collection_details' | 'wantlist_details',
      processed: progress.processed,
      total: progress.total,
    });
  };

  try {
    await setSyncProgress(user.username, {
      status: 'starting',
      message: 'Starting sync...',
    });

    console.log('[Action] Fetching collection...');
    await setSyncProgress(user.username, {
      status: 'fetching',
      resource: 'collection',
      page: 0,
      pages: 1,
      message: 'Fetching your collection...',
    });
    const collection = await getFullCollection(
      user.username,
      token,
      progressCallback,
    );
    console.log(`[Action] Fetched ${collection.length} collection items.`);

    console.log('[Action] Fetching wantlist...');
    await setSyncProgress(user.username, {
      status: 'fetching',
      resource: 'wantlist',
      page: 0,
      pages: 1,
      message: 'Fetching your wantlist...',
    });
    const wantlist = await getFullWantlist(
      user.username,
      token,
      progressCallback,
    );
    console.log(`[Action] Fetched ${wantlist.length} wantlist items.`);

    // --- Fetch Details ---
    console.log('[Action] Fetching details for collection...');
    const collectionWithDetails = await fetchAndAddDetailsToReleases(
      collection,
      token,
      'collection_details',
      detailsProgressCallback,
    );
    console.log('[Action] Finished fetching collection details.');

    console.log('[Action] Fetching details for wantlist...');
    const wantlistWithDetails = await fetchAndAddDetailsToReleases(
      wantlist,
      token,
      'wantlist_details',
      detailsProgressCallback,
    );
    console.log('[Action] Finished fetching wantlist details.');
    // --- End Fetch Details ---

    console.log('[Action] Processing wantlist images...');
    await setSyncProgress(user.username, {
      status: 'processing',
      message: 'Processing wantlist images...',
    });
    const processedWantlist = await processWantlistWithApi(
      wantlistWithDetails,
      token,
    );
    console.log('[Action] Finished processing wantlist.');

    console.log('[Action] Writing data to cache...');
    await setSyncProgress(user.username, {
      status: 'caching',
      message: 'Saving data locally...',
    });
    await setCachedData(user.username, 'collection', collectionWithDetails);
    await setCachedData(user.username, 'wantlist', processedWantlist);
    console.log('[Action] Caching complete.');

    await clearSyncProgress(user.username); // Clean up progress file
    revalidatePath('/', 'layout');

    return { success: true, message: 'Sync completed successfully!' };
  } catch (error) {
    console.error('[Action] Sync failed:', error);
    const errorMessage =
      error instanceof Error ? error.message : 'An unknown error occurred';
    await setSyncProgress(user.username, {
      status: 'error',
      message: `Sync failed: ${errorMessage}`,
    });
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
