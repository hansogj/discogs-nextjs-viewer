
'use server';

import { getSession } from '@/lib/session';
import {
  fetchAndAddDetailsToReleases,
  getFolders,
  getFullCollection,
  getFullWantlist,
  processWantlist as processWantlistWithApi,
} from '@/lib/discogs';
import {
  setCachedData,
  clearUserCache,
  setSyncProgress,
  clearSyncProgress,
  getSyncInfo,
  setSyncInfo,
  getCachedData,
} from '@/lib/cache';
import { revalidatePath } from 'next/cache';
import type {
  CollectionRelease,
  ProcessedWantlistItem,
  SyncInfo,
} from '@/lib/types';

export async function syncAllData(): Promise<{
  success: boolean;
  message?: string;
}> {
  const session = await getSession();
  if (!session.isLoggedIn || !session.user || !session.token) {
    throw new Error('Not authenticated');
  }
  const { user, token } = session;

  console.log(`[Action] Starting sync for ${user.username}...`);

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

    const syncInfo = await getSyncInfo(user.username);
    console.log('[Action] Previous sync info:', syncInfo);

    console.log('[Action] Fetching collection...');
    await setSyncProgress(user.username, {
      status: 'fetching',
      resource: 'collection',
      page: 0,
      pages: 1,
      message: 'Fetching your collection...',
    });
    const { items: newCollectionItems, fullFetch: collectionFullFetch } =
      await getFullCollection(
        user.username,
        token,
        progressCallback,
        syncInfo?.collectionLastAdded,
      );
    console.log(
      `[Action] Fetched ${newCollectionItems.length} new collection items. Full fetch: ${collectionFullFetch}`,
    );

    console.log('[Action] Fetching wantlist...');
    await setSyncProgress(user.username, {
      status: 'fetching',
      resource: 'wantlist',
      page: 0,
      pages: 1,
      message: 'Fetching your wantlist...',
    });
    const { items: newWantlistItems, fullFetch: wantlistFullFetch } =
      await getFullWantlist(
        user.username,
        token,
        progressCallback,
        syncInfo?.wantlistLastAdded,
      );
    console.log(
      `[Action] Fetched ${newWantlistItems.length} new wantlist items. Full fetch: ${wantlistFullFetch}`,
    );

    console.log('[Action] Fetching folders...');
    const folders = await getFolders(user.username, token);
    console.log(`[Action] Fetched ${folders.length} folders.`);

    // --- Fetch Details for NEW items only ---
    console.log('[Action] Fetching details for new collection items...');
    const collectionWithDetails = await fetchAndAddDetailsToReleases(
      newCollectionItems,
      token,
      'collection_details',
      detailsProgressCallback,
    );

    console.log('[Action] Fetching details for new wantlist items...');
    const wantlistWithDetails = await fetchAndAddDetailsToReleases(
      newWantlistItems,
      token,
      'wantlist_details',
      detailsProgressCallback,
    );

    // --- Process NEW wantlist items only ---
    console.log('[Action] Processing new wantlist images...');
    await setSyncProgress(user.username, {
      status: 'processing',
      message: 'Processing wantlist images...',
    });
    const processedNewWantlist = await processWantlistWithApi(
      wantlistWithDetails,
      token,
    );

    // --- Combine with old data ---
    console.log('[Action] Combining new data with cached data...');
    const oldCollection = collectionFullFetch
      ? []
      : (await getCachedData<CollectionRelease[]>(
          user.username,
          'collection',
        )) ?? [];
    const finalCollection = [...collectionWithDetails, ...oldCollection];

    const oldWantlist = wantlistFullFetch
      ? []
      : (await getCachedData<ProcessedWantlistItem[]>(
          user.username,
          'wantlist',
        )) ?? [];
    const finalWantlist = [...processedNewWantlist, ...oldWantlist];

    // --- Cache data ---
    console.log('[Action] Writing data to cache...');
    await setSyncProgress(user.username, {
      status: 'caching',
      message: 'Saving data locally...',
    });
    await setCachedData(user.username, 'collection', finalCollection);
    await setCachedData(user.username, 'wantlist', finalWantlist);
    await setCachedData(user.username, 'folders', folders);

    // --- Update sync info for next time ---
    const newSyncInfo: SyncInfo = {};
    if (finalCollection.length > 0) {
      newSyncInfo.collectionLastAdded = finalCollection[0].date_added;
    }
    if (finalWantlist.length > 0) {
      newSyncInfo.wantlistLastAdded = finalWantlist[0].date_added;
    }
    await setSyncInfo(user.username, newSyncInfo);
    console.log('[Action] Caching complete. New sync info:', newSyncInfo);

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
