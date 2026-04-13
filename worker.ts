import { Job, Worker } from 'bullmq';
import {
  addMasterInfoToCollection,
  fetchAndAddDetailsToReleases,
  getFolders,
  getFullCollection,
  getFullWantlist,
  processWantlist as processWantlistWithApi,
  getCustomFields,
} from './lib/discogs';
import {
  clearSyncProgress,
  getCachedData,
  getSyncInfo,
  setCachedData,
  setSyncInfo,
  setSyncProgress,
} from './lib/cache';
import type {
  CollectionRelease,
  ProcessedWantlistItem,
  SyncInfo,
} from './lib/types';
import connection from './lib/redis';

// --- ADDED LOGGING ---
console.log('[Worker Init] Starting worker.ts execution.');
console.log(`[Worker Init] REDIS_URL: ${process.env.REDIS_URL ? 'SET' : 'NOT SET'}`); // Log if REDIS_URL is present
console.log('[Worker Init] Attempting to create BullMQ Worker instance.');

type DetailResourceType = 'collection_details' | 'wantlist_details' | 'collection_masters';

const worker = new Worker(
  'sync',
  async (job: Job) => {
    const { user, token } = job.data;

    console.log(`[Worker] Starting sync for ${user.username}...`);

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
        resource: progress.resource as DetailResourceType,
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
      console.log('[Worker] Previous sync info:', syncInfo);

      console.log('[Worker] Fetching folders...');
      const folders = await getFolders(user.username, token);
      console.log(`[Worker] Fetched ${folders.length} folders.`);

      console.log('[Worker] Fetching custom fields...');
      const customFields = await getCustomFields(user.username, token);
      console.log(`[Worker] Fetched ${customFields.fields.length} custom fields.`);

      console.log('[Worker] Fetching collection...');
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
        `[Worker] Fetched ${newCollectionItems.length} new collection items. Full fetch: ${collectionFullFetch}`,
      );

      console.log('[Worker] Fetching wantlist...');
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
        `[Worker] Fetched ${newWantlistItems.length} new wantlist items. Full fetch: ${wantlistFullFetch}`,
      );

      // --- Fetch Details for NEW items only ---
      console.log('[Worker] Fetching details for new collection items...');
      const collectionWithDetails = await fetchAndAddDetailsToReleases(
        newCollectionItems,
        token,
        'collection_details',
        detailsProgressCallback,
      );

      // Fetch master release year for new collection items
      console.log(
        '[Worker] Fetching master release year for new collection items...',
      );
      const collectionWithMasterInfo = await addMasterInfoToCollection(
        collectionWithDetails,
        token,
        detailsProgressCallback,
      );

      console.log('[Worker] Fetching details for new wantlist items...');
      const wantlistWithDetails = await fetchAndAddDetailsToReleases(
        newWantlistItems,
        token,
        'wantlist_details',
        detailsProgressCallback,
      );

      // --- Process NEW wantlist items only ---
      console.log('[Worker] Processing new wantlist images...');
      await setSyncProgress(user.username, {
        status: 'processing',
        message: 'Processing wantlist images...',
      });
      const processedNewWantlist = await processWantlistWithApi(
        wantlistWithDetails,
        token,
      );

      // --- Combine with old data ---
      console.log('[Worker] Combining new data with cached data...');
      const oldCollection = collectionFullFetch
        ? []
        : (await getCachedData<CollectionRelease[]>(
            user.username,
            'collection',
          )) ?? [];
      const finalCollection = collectionFullFetch ? collectionWithMasterInfo : [...collectionWithMasterInfo, ...oldCollection];

      const oldWantlist = wantlistFullFetch
        ? []
        : (await getCachedData<ProcessedWantlistItem[]>(
            user.username,
            'wantlist',
          )) ?? [];
      const finalWantlist = wantlistFullFetch ? processedNewWantlist : [...processedNewWantlist, ...oldWantlist];

      // --- Cache data ---
      console.log('[Worker] Writing data to cache...');
      await setSyncProgress(user.username, {
        status: 'caching',
        message: 'Saving data locally...',
      });
      await setCachedData(user.username, 'collection', finalCollection);
      await setCachedData(user.username, 'wantlist', finalWantlist);
      await setCachedData(user.username, 'folders', folders);
      await setCachedData(user.username, 'custom_fields', customFields.fields);

      // --- Update sync info for next time ---
      const newSyncInfo: SyncInfo = {};
      if (finalCollection.length > 0) {
        const latestCollectionDate = new Date(finalCollection[0].date_added);
        if (!isNaN(latestCollectionDate.getTime()) && latestCollectionDate < new Date()) {
          newSyncInfo.collectionLastAdded = finalCollection[0].date_added;
        }
      }
      if (finalWantlist.length > 0) {
        const latestWantlistDate = new Date(finalWantlist[0].date_added);
        if (!isNaN(latestWantlistDate.getTime()) && latestWantlistDate < new Date()) {
          newSyncInfo.wantlistLastAdded = finalWantlist[0].date_added;
        }
      }
      await setSyncInfo(user.username, newSyncInfo);
      console.log('[Worker] Caching complete. New sync info:', newSyncInfo);

      await setSyncProgress(user.username, {
        status: 'done',
        message: 'Sync complete!',
      });
      await clearSyncProgress(user.username);
    } catch (error) {
      console.error('[Worker] Sync failed:', error);
      const errorMessage =
        error instanceof Error ? error.message : 'An unknown error occurred';
      await setSyncProgress(user.username, {
        status: 'error',
        message: `Sync failed: ${errorMessage}`,
      });
    }
  },
  { connection, lockDuration: 60 * 1000 * 30 }, // Keep job lock for 30 minutes
);
console.log('[Worker Init] BullMQ Worker instance created.');

// --- ADDED EVENT LISTENERS ---
worker.on('ready', () => {
  console.log('[Worker Event] BullMQ Worker is ready to process jobs!');
});

worker.on('active', (job: Job) => {
  console.log(`[Worker Event] Job ${job.id} is now active (name: ${job.name}).`);
});

worker.on('completed', (job: Job) => {
  console.log(`[Worker Event] Job ${job.id} completed successfully (name: ${job.name}).`);
});

worker.on('failed', (job: Job | undefined, err: Error, prev: string) => {
  if (job) {
    console.error(`[Worker Event] Job ${job.id} failed (name: ${job.name}):`, err);
  } else {
    console.error(`[Worker Event] An undefined job failed:`, err);
  }
});

worker.on('error', (err: Error) => {
  // Called if there is an error in the worker's connection to Redis
  console.error('[Worker Event] BullMQ Worker encountered an error:', err);
});

console.log('Worker started');