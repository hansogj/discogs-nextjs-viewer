import "server-only";
import { cache } from "react";
import { getIronSession } from "iron-session";
import { getCachedData } from "./cache";
import type {
  CollectionRelease,
  ProcessedWantlistItem,
  DiscogsUser,
  DiscogsUserProfile,
  Folder,
  CustomField,
  SessionData,
  WantlistPricesMap,
} from "./types";
import { cookies } from "next/headers";
import { sessionOptions } from "./session-options";

import { DiscogsAuth } from "./discogs";
// Pure aggregation helpers live in lib/stats so they can be unit tested
// without dragging in the server-only auth/cache modules. Re-exported so
// existing call sites (`import { getCollectionDuplicates } from
// "@/lib/data"`) keep working.
import { computeCollectionStats, getCollectionDuplicates } from "./stats";
export {
  computeCollectionStats,
  getCollectionDuplicates,
  type StatsPayload,
} from "./stats";

// React's cache() dedupes within a single request. Auth pulls a cookie,
// which is dynamic — memoising it ensures that layout + page + downstream
// helpers all resolve the same session in one shot.
const getAuthenticatedUser = cache(
  async (): Promise<{
    user: DiscogsUser;
    token: DiscogsAuth;
    userProfile: DiscogsUserProfile | null;
  }> => {
    const session = await getIronSession<SessionData>(
      await cookies(),
      sessionOptions,
    );

    const isTokenLoggedIn = !!session.token && !!session.user;
    const isOAuthLoggedIn =
      !!session.accessToken && !!session.accessTokenSecret && !!session.user;

    if (!isTokenLoggedIn && !isOAuthLoggedIn) {
      throw new Error("Not authenticated");
    }

    const auth: DiscogsAuth = isOAuthLoggedIn
      ? {
          oauth_token: session.accessToken!,
          oauth_token_secret: session.accessTokenSecret!,
        }
      : session.token!;

    return {
      user: session.user!,
      token: auth,
      userProfile: session.userProfile ?? null,
    };
  },
);

// Strip fields no client component reads. Cuts collection payload roughly
// in half (extraartists alone was ~50% of the file). The parsed original
// stays memoised in cache.ts, so this only pays the walk cost on cache
// miss.
function trimCollectionForClient(
  items: CollectionRelease[],
): CollectionRelease[] {
  return items.map((item) => {
    const info = item.basic_information;
    return {
      id: item.id,
      instance_id: item.instance_id,
      date_added: item.date_added,
      rating: item.rating,
      folder_id: item.folder_id,
      master_year: item.master_year,
      notes: item.notes,
      basic_information: {
        id: info.id,
        master_id: info.master_id,
        master_url: "",
        resource_url: "",
        thumb: info.thumb,
        cover_image: info.cover_image,
        title: info.title,
        year: info.year,
        formats:
          info.formats?.map((f) => ({
            name: f.name,
            qty: "",
            descriptions: f.descriptions ?? [],
          })) ?? [],
        labels:
          info.labels?.map((l) => ({
            name: l.name,
            catno: l.catno,
            entity_type: "",
            id: 0,
            resource_url: "",
          })) ?? [],
        artists:
          info.artists?.map((a) => ({
            name: a.name,
            anv: "",
            join: "",
            role: "",
            tracks: "",
            id: 0,
            resource_url: "",
          })) ?? [],
      },
      details: item.details
        ? {
            styles: item.details.styles,
            genres: item.details.genres,
            notes: item.details.notes,
            extraartists: item.details.extraartists?.map((a) => ({
              name: a.name,
              role: a.role,
            })),
          }
        : undefined,
    };
  });
}

function trimWantlistForClient(
  items: ProcessedWantlistItem[],
): ProcessedWantlistItem[] {
  return items.map((item) => {
    const info = item.basic_information;
    return {
      id: item.id,
      resource_url: "",
      rating: item.rating,
      date_added: item.date_added,
      master_cover_image: item.master_cover_image,
      master_year: item.master_year,
      basic_information: {
        id: info.id,
        master_id: info.master_id,
        master_url: "",
        resource_url: "",
        thumb: info.thumb,
        cover_image: info.cover_image,
        title: info.title,
        year: info.year,
        formats:
          info.formats?.map((f) => ({
            name: f.name,
            qty: "",
            descriptions: f.descriptions ?? [],
          })) ?? [],
        labels:
          info.labels?.map((l) => ({
            name: l.name,
            catno: l.catno,
            entity_type: "",
            id: 0,
            resource_url: "",
          })) ?? [],
        artists:
          info.artists?.map((a) => ({
            name: a.name,
            anv: "",
            join: "",
            role: "",
            tracks: "",
            id: 0,
            resource_url: "",
          })) ?? [],
      },
      details: item.details
        ? {
            styles: item.details.styles,
            genres: item.details.genres,
            notes: item.details.notes,
            extraartists: item.details.extraartists?.map((a) => ({
              name: a.name,
              role: a.role,
            })),
          }
        : undefined,
    };
  });
}

export const getCachedCollection = cache(
  async (): Promise<CollectionRelease[]> => {
    const { user } = await getAuthenticatedUser();
    const data = await getCachedData<CollectionRelease[]>(
      user.username,
      "collection",
    );
    return data ? trimCollectionForClient(data) : [];
  },
);

export const getCachedWantlist = cache(
  async (): Promise<ProcessedWantlistItem[]> => {
    const { user } = await getAuthenticatedUser();
    const data = await getCachedData<ProcessedWantlistItem[]>(
      user.username,
      "wantlist",
    );
    return data ? trimWantlistForClient(data) : [];
  },
);

export const getUserProfile = cache(
  async (): Promise<DiscogsUserProfile | null> => {
    const session = await getIronSession<SessionData>(
      await cookies(),
      sessionOptions,
    );
    return session.userProfile ?? null;
  },
);

export const getCachedFolders = cache(async (): Promise<Folder[]> => {
  const { user } = await getAuthenticatedUser();
  const data = await getCachedData<Folder[]>(user.username, "folders");
  return data ?? [];
});

export const getCachedCustomFields = cache(async (): Promise<CustomField[]> => {
  const { user } = await getAuthenticatedUser();
  const data = await getCachedData<CustomField[]>(
    user.username,
    "custom_fields",
  );
  return data ?? [];
});

export const getCachedWantlistPrices = cache(
  async (): Promise<WantlistPricesMap> => {
    const { user } = await getAuthenticatedUser();
    const data = await getCachedData<WantlistPricesMap>(
      user.username,
      "wantlist_prices",
    );
    return data ?? {};
  },
);

// Fetches all data needed for the header
export const getHeaderData = cache(async () => {
  // Now fetches userProfile as well
  const { user, userProfile } = await getAuthenticatedUser();
  const [collection, wantlist] = await Promise.all([
    getCachedCollection(),
    getCachedWantlist(),
  ]);

  // Use the detailed user profile for the header if it exists, ensuring consistency.
  const headerUser: DiscogsUser = userProfile
    ? {
        id: userProfile.id,
        username: userProfile.username,
        avatar_url: userProfile.avatar_url,
        resource_url: userProfile.resource_url,
      }
    : user;

  // Deduplicate wantlist by master_id for an accurate count
  const uniqueWantlistMasterIds = new Set<number>();
  wantlist.forEach((item) => {
    if (item.basic_information.master_id > 0) {
      uniqueWantlistMasterIds.add(item.basic_information.master_id);
    }
  });

  const duplicates = getCollectionDuplicates(collection);

  return {
    user: headerUser,
    collectionCount: collection.length,
    wantlistCount: uniqueWantlistMasterIds.size,
    duplicatesCount: duplicates.length,
  };
});

export const getCollectionStats = cache(async () => {
  const collection = await getCachedCollection();
  return computeCollectionStats(collection);
});
