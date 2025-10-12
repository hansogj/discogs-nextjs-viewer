import 'server-only';
import { getSession } from './session';
import { getCachedData } from './cache';
import type {
  CollectionRelease,
  ProcessedWantlistItem,
  DiscogsUser,
} from './types';

async function getAuthenticatedUser(): Promise<{
  user: DiscogsUser;
  token: string;
}> {
  const session = await getSession();
  if (!session.isLoggedIn || !session.user || !session.token) {
    throw new Error('Not authenticated');
  }
  return { user: session.user, token: session.token };
}

export async function getCachedCollection(): Promise<CollectionRelease[]> {
  const { user } = await getAuthenticatedUser();
  const data = await getCachedData<CollectionRelease[]>(
    user.username,
    'collection',
  );
  return data ?? [];
}

export async function getCachedWantlist(): Promise<ProcessedWantlistItem[]> {
  const { user } = await getAuthenticatedUser();
  const data = await getCachedData<ProcessedWantlistItem[]>(
    user.username,
    'wantlist',
  );
  return data ?? [];
}

// Fetches all data needed for the header from the cache
export async function getHeaderData() {
  const { user } = await getAuthenticatedUser();
  const [collection, wantlist] = await Promise.all([
    getCachedCollection(),
    getCachedWantlist(),
  ]);

  // Deduplicate wantlist by master_id for an accurate count
  const uniqueWantlistMasterIds = new Set<number>();
  wantlist.forEach((item) => {
    if (item.basic_information.master_id > 0) {
      uniqueWantlistMasterIds.add(item.basic_information.master_id);
    }
  });

  const duplicates = getCollectionDuplicates(collection);

  return {
    user,
    collectionCount: collection.length,
    wantlistCount: uniqueWantlistMasterIds.size,
    duplicatesCount: duplicates.length,
  };
}

export function getCollectionDuplicates(
  collection: CollectionRelease[],
): CollectionRelease[][] {
  const masters = new Map<number, CollectionRelease[]>();
  for (const release of collection) {
    const masterId = release.basic_information.master_id;
    if (masterId > 0) {
      if (!masters.has(masterId)) {
        masters.set(masterId, []);
      }
      masters.get(masterId)!.push(release);
    }
  }

  const duplicates: CollectionRelease[][] = [];
  for (const releases of masters.values()) {
    if (releases.length > 1) {
      duplicates.push(releases);
    }
  }
  return duplicates;
}
