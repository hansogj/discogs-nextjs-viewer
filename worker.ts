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

const TOTAL_STEPS = 10;

const worker = new Worker(
  'sync',
  async (job: Job) => {
    const { user, token } = job.data;
    const startedAt = Date.now();

    console.log(`[Worker] Starting sync for ${user.username}...`);

    const setProgress = (progress: Omit<Parameters<typeof setSyncProgress>[1], 'totalSteps' | 'startedAt'>) => {
      return setSyncProgress(user.username, {
        ...progress,
        totalSteps: TOTAL_STEPS,
        startedAt,
      });
    };

    const progressCallback = (progress: {
      page: number;
      pages: number;
      resource: string;
    }) => {
      const step = progress.resource === 'collection' ? 3 : 4;
      setProgress({
        status: 'fetching',
        resource: progress.resource as 'collection' | 'wantlist',
        page: progress.page,
        pages: progress.pages,
        step,
        stepName: `Fetching ${progress.resource}`,
      });
    };

    const detailsProgressCallback = (progress: {
      processed: number;
      total: number;
      resource: string;
    }) => {
      const stepMap: Record<string, { step: number; stepName: string }> = {
        collection_details: { step: 6, stepName: 'Collection details' },
        collection_masters: { step: 7, stepName: 'Collection master info' },
        wantlist_details: { step: 8, stepName: 'Wantlist details' },
      };
      const info = stepMap[progress.resource] ?? { step: 6, stepName: progress.resource };
      setProgress({
        status: 'processing',
        resource: progress.resource as DetailResourceType,
        processed: progress.processed,
        total: progress.total,
        step: info.step,
        stepName: info.stepName,
      });
    };

    try {
      await setProgress({
        status: 'starting',
        message: 'Starting sync...',
        step: 1,
        stepName: 'Fetching folders',
      });

      console.log('[Worker] Fetching folders...');
      const folders = await getFolders(user.username, token);
      console.log(`[Worker] Fetched ${folders.length} folders.`);

      await setProgress({
        status: 'fetching',
        step: 2,
        stepName: 'Fetching custom fields',
      });
      console.log('[Worker] Fetching custom fields...');
      const customFields = await getCustomFields(user.username, token);
      console.log(`[Worker] Fetched ${customFields.fields.length} custom fields.`);

      // --- Fetch full lists (basic info only, no detail calls) ---
      console.log('[Worker] Fetching full collection list...');
      await setProgress({
        status: 'fetching',
        resource: 'collection',
        page: 0,
        pages: 1,
        step: 3,
        stepName: 'Fetching collection',
      });
      const { items: allCollectionItems } = await getFullCollection(
        user.username,
        token,
        progressCallback,
      );
      console.log(
        `[Worker] Fetched ${allCollectionItems.length} collection items.`,
      );

      console.log('[Worker] Fetching full wantlist...');
      await setProgress({
        status: 'fetching',
        resource: 'wantlist',
        page: 0,
        pages: 1,
        step: 4,
        stepName: 'Fetching wantlist',
      });
      const { items: allWantlistItems } = await getFullWantlist(
        user.username,
        token,
        progressCallback,
      );
      console.log(
        `[Worker] Fetched ${allWantlistItems.length} wantlist items.`,
      );

      // --- Compare with cached data to find new/removed items ---
      console.log('[Worker] Comparing with cached data...');
      await setProgress({
        status: 'processing',
        step: 5,
        stepName: 'Comparing',
        message: 'Comparing with cached data...',
      });

      const oldCollection =
        (await getCachedData<CollectionRelease[]>(user.username, 'collection')) ?? [];
      const oldWantlist =
        (await getCachedData<ProcessedWantlistItem[]>(user.username, 'wantlist')) ?? [];

      // Build lookup maps from cached data (keyed by unique identifiers)
      const cachedCollectionMap = new Map<number, CollectionRelease>();
      for (const item of oldCollection) {
        cachedCollectionMap.set(item.instance_id, item);
      }
      const cachedWantlistMap = new Map<number, ProcessedWantlistItem>();
      for (const item of oldWantlist) {
        cachedWantlistMap.set(item.id, item);
      }

      // Items in API but not in cache (or missing details) → need detail fetching
      const newCollectionItems = allCollectionItems.filter((item) => {
        const cached = cachedCollectionMap.get(item.instance_id);
        return !cached || !cached.details;
      });
      const newWantlistItems = allWantlistItems.filter(
        (item) => !cachedWantlistMap.has(item.id),
      );

      // Log the diff
      const apiCollectionIds = new Set(allCollectionItems.map((i) => i.instance_id));
      const apiWantlistIds = new Set(allWantlistItems.map((i) => i.id));
      const removedCollectionCount = oldCollection.filter(
        (item) => !apiCollectionIds.has(item.instance_id),
      ).length;
      const removedWantlistCount = oldWantlist.filter(
        (item) => !apiWantlistIds.has(item.id),
      ).length;

      console.log(
        `[Worker] Collection: ${newCollectionItems.length} new, ${allCollectionItems.length - newCollectionItems.length} unchanged, ${removedCollectionCount} removed`,
      );
      console.log(
        `[Worker] Wantlist: ${newWantlistItems.length} new, ${allWantlistItems.length - newWantlistItems.length} unchanged, ${removedWantlistCount} removed`,
      );

      // --- Fetch details for NEW collection items only ---
      console.log(`[Worker] Fetching details for ${newCollectionItems.length} new collection items...`);
      await setProgress({
        status: 'processing',
        resource: 'collection_details',
        processed: 0,
        total: newCollectionItems.length,
        step: 6,
        stepName: 'Collection details',
      });
      const collectionWithDetails = await fetchAndAddDetailsToReleases(
        newCollectionItems,
        token,
        'collection_details',
        detailsProgressCallback,
      );

      console.log(
        `[Worker] Fetching master info for ${collectionWithDetails.length} new collection items...`,
      );
      await setProgress({
        status: 'processing',
        resource: 'collection_masters',
        processed: 0,
        total: collectionWithDetails.length,
        step: 7,
        stepName: 'Collection master info',
      });
      const collectionWithMasterInfo = await addMasterInfoToCollection(
        collectionWithDetails,
        token,
        detailsProgressCallback,
      );

      // --- Fetch details for NEW wantlist items only ---
      console.log(`[Worker] Fetching details for ${newWantlistItems.length} new wantlist items...`);
      await setProgress({
        status: 'processing',
        resource: 'wantlist_details',
        processed: 0,
        total: newWantlistItems.length,
        step: 8,
        stepName: 'Wantlist details',
      });
      const wantlistWithDetails = await fetchAndAddDetailsToReleases(
        newWantlistItems,
        token,
        'wantlist_details',
        detailsProgressCallback,
      );

      console.log(`[Worker] Processing ${wantlistWithDetails.length} new wantlist images...`);
      await setProgress({
        status: 'processing',
        step: 9,
        stepName: 'Wantlist images',
        message: `Processing ${wantlistWithDetails.length} new wantlist images...`,
      });
      const processedNewWantlist = await processWantlistWithApi(
        wantlistWithDetails,
        token,
      );

      // --- Build final results in API order, reusing cached details ---
      console.log('[Worker] Merging results...');
      const enrichedNewCollectionMap = new Map<number, CollectionRelease>();
      for (const item of collectionWithMasterInfo) {
        enrichedNewCollectionMap.set(item.instance_id, item);
      }
      const finalCollection = allCollectionItems.map((item) =>
        enrichedNewCollectionMap.get(item.instance_id)
        ?? cachedCollectionMap.get(item.instance_id)
        ?? item,
      );

      const processedNewWantlistMap = new Map<number, ProcessedWantlistItem>();
      for (const item of processedNewWantlist) {
        processedNewWantlistMap.set(item.id, item);
      }
      const finalWantlist: ProcessedWantlistItem[] = allWantlistItems.map((item) =>
        processedNewWantlistMap.get(item.id)
        ?? cachedWantlistMap.get(item.id)
        ?? { ...item, master_cover_image: item.basic_information.cover_image },
      );

      // --- Cache data ---
      console.log('[Worker] Writing data to cache...');
      await setProgress({
        status: 'caching',
        step: 10,
        stepName: 'Saving data',
        message: 'Saving data locally...',
      });
      await setCachedData(user.username, 'collection', finalCollection);
      await setCachedData(user.username, 'wantlist', finalWantlist);
      await setCachedData(user.username, 'folders', folders);
      await setCachedData(user.username, 'custom_fields', customFields.fields);

      // --- Update sync info ---
      const newSyncInfo: SyncInfo = {};
      if (finalCollection.length > 0) {
        newSyncInfo.collectionLastAdded = finalCollection[0].date_added;
      }
      if (finalWantlist.length > 0) {
        newSyncInfo.wantlistLastAdded = finalWantlist[0].date_added;
      }
      await setSyncInfo(user.username, newSyncInfo);
      console.log('[Worker] Sync complete.', {
        collection: { total: finalCollection.length, new: newCollectionItems.length, removed: removedCollectionCount },
        wantlist: { total: finalWantlist.length, new: newWantlistItems.length, removed: removedWantlistCount },
      });

      await setProgress({
        status: 'done',
        step: TOTAL_STEPS,
        stepName: 'Complete',
        message: 'Sync complete!',
      });
      await clearSyncProgress(user.username);
    } catch (error) {
      console.error('[Worker] Sync failed:', error);
      const errorMessage =
        error instanceof Error ? error.message : 'An unknown error occurred';
      await setProgress({
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