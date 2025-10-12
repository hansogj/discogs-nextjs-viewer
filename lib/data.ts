/// <reference types="node" />

import 'server-only';
import { getSession } from './session';
import {
  getCollectionPage,
  getWantlistPage,
  processWantlist as processWantlistWithApi,
} from './discogs';
import type {
  CollectionRelease,
  ProcessedWantlistItem,
  Pagination,
  DiscogsUser,
} from './types';
import path from 'path';
import fs from 'fs/promises';

const ITEMS_PER_PAGE = 48; // Should match the client-side constant

async function getAuthenticatedUser() {
  const session = await getSession();
  if (!session.isLoggedIn || !session.user || !session.token) {
    throw new Error('Not authenticated');
  }
  return { user: session.user, token: session.token };
}

// Fetches all data needed for the header, regardless of page
export async function getHeaderData() {
  const { user, token } = await getAuthenticatedUser();

  // Fetch the full lists just for the counts.
  // Note: This could be optimized if Discogs API provided counts without fetching everything.
  // For now, this maintains the accuracy of the counts in the header.
  // These calls will be cached by Next.js's fetch.
  const collectionPromise = getCollectionPage(
    user.username,
    token,
    1,
    1,
    'added',
    'desc',
  );
  const wantlistPromise = getWantlistPage(
    user.username,
    token,
    1,
    1,
    'added',
    'desc',
  );

  const [collectionResponse, wantlistResponse] = await Promise.all([
    collectionPromise,
    wantlistPromise,
  ]);

  // For duplicates, we still need the full collection.
  const fullCollection = await getFullCollection(user, token);
  const duplicates = getCollectionDuplicates(fullCollection);

  return {
    user,
    collectionCount: collectionResponse.pagination.items,
    wantlistCount: wantlistResponse.pagination.items,
    duplicatesCount: duplicates.length,
    fullCollectionForDuplicates: fullCollection,
  };
}

// A helper to get the full collection, used for duplicates page and count
async function getFullCollection(
  user: DiscogsUser,
  token: string,
): Promise<CollectionRelease[]> {
  let allReleases: CollectionRelease[] = [];
  let page = 1;
  let totalPages = 1;

  do {
    const { data, pagination } = await getCollectionPage(
      user.username,
      token,
      page,
      100,
      'added',
      'desc',
    );
    allReleases = allReleases.concat(data);
    totalPages = pagination.pages;
    page++;
  } while (page <= totalPages);

  return allReleases;
}

export async function getInitialCollection(): Promise<{
  data: CollectionRelease[];
  pagination: Pagination;
}> {
  const { user, token } = await getAuthenticatedUser();
  console.log(`[Data] Fetching initial collection page for ${user.username}`);
  return getCollectionPage(user.username, token, 1, ITEMS_PER_PAGE, 'added', 'desc');
}

export async function getInitialWantlist(): Promise<{
  data: ProcessedWantlistItem[];
  pagination: Pagination;
}> {
  const { user, token } = await getAuthenticatedUser();
  console.log(`[Data] Fetching initial wantlist page for ${user.username}`);

  const { data: rawWantlist, pagination } = await getWantlistPage(
    user.username,
    token,
    1,
    ITEMS_PER_PAGE,
    'added',
    'desc',
  );
  const processedData = await processWantlistWithApi(rawWantlist, token);

  return { data: processedData, pagination };
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
