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

export function getCollectionDuplicates(
  collection: CollectionRelease[],
): CollectionRelease[][] {
  const masters = new Map<number, CollectionRelease[]>();
  for (const release of collection) {
    // Use master_id when available; fall back to release id
    // (a release with no master is effectively its own master)
    const groupKey =
      release.basic_information.master_id > 0
        ? release.basic_information.master_id
        : release.basic_information.id;
    if (!masters.has(groupKey)) {
      masters.set(groupKey, []);
    }
    masters.get(groupKey)!.push(release);
  }

  const duplicates: CollectionRelease[][] = [];
  for (const releases of masters.values()) {
    if (releases.length > 1) {
      duplicates.push(releases);
    }
  }
  return duplicates;
}

// Server-computed stats for the /stats page. Aggregating on the server
// means the browser never has to receive or parse the full 24 MB
// collection JSON for a view that only renders bar counts.
export type StatsPayload = {
  totalReleases: number;
  uniqueArtists: number;
  uniqueLabels: number;
  vinylPct: number;
  artistCounts: [string, number][];
  labelCounts: [string, number][];
  styleCounts: [string, number][];
  decadeCounts: [string, number][];
  formatCounts: [string, number][];
  conditionCounts: [string, number][];
  // dominantStyleByArtist[artistName] = style name (only when it's in the
  // pillar set — see components/StatsDashboard for the tinting rule)
  artistDominantStyle: [string, string][];
};

const COND_LABELS_SET = new Set([
  "Mint (M)",
  "Near Mint (NM or M-)",
  "Very Good Plus (VG+)",
  "Very Good (VG)",
  "Good Plus (G+)",
  "Good (G)",
  "Fair (F)",
  "Poor (P)",
]);
const VINYL_FORMATS = new Set(["Vinyl", "LP", '12"', '7"', '10"']);
const CD_FORMATS = new Set(["CD", "CDr", "SACD"]);
const formatFamily = (name: string | undefined): string => {
  if (!name) return "Annet";
  if (VINYL_FORMATS.has(name)) return "Vinyl";
  if (CD_FORMATS.has(name)) return "CD";
  return "Annet";
};

export const getCollectionStats = cache(async (): Promise<StatsPayload> => {
  const collection = await getCachedCollection();

  const artistCounts = new Map<string, number>();
  const labelCounts = new Map<string, number>();
  const styleCounts = new Map<string, number>();
  const decadeCounts = new Map<string, number>();
  const formatCounts = new Map<string, number>();
  const conditionCounts = new Map<string, number>();
  const artistStyles = new Map<string, Map<string, number>>();

  for (const item of collection) {
    const info = item.basic_information;

    const primaryArtist = info.artists?.[0]?.name;
    if (primaryArtist && primaryArtist !== "Various") {
      artistCounts.set(
        primaryArtist,
        (artistCounts.get(primaryArtist) ?? 0) + 1,
      );
    }

    const primaryLabel = info.labels?.[0]?.name;
    if (primaryLabel) {
      labelCounts.set(primaryLabel, (labelCounts.get(primaryLabel) ?? 0) + 1);
    }

    const styles = item.details?.styles ?? [];
    for (const s of styles) {
      styleCounts.set(s, (styleCounts.get(s) ?? 0) + 1);
      if (primaryArtist && primaryArtist !== "Various") {
        if (!artistStyles.has(primaryArtist)) {
          artistStyles.set(primaryArtist, new Map());
        }
        const m = artistStyles.get(primaryArtist)!;
        m.set(s, (m.get(s) ?? 0) + 1);
      }
    }

    const year = info.year;
    if (year && year > 1900) {
      const decade = `${Math.floor(year / 10) * 10}s`;
      decadeCounts.set(decade, (decadeCounts.get(decade) ?? 0) + 1);
    }

    const fmt = formatFamily(info.formats?.[0]?.name);
    formatCounts.set(fmt, (formatCounts.get(fmt) ?? 0) + 1);

    for (const n of item.notes ?? []) {
      if (COND_LABELS_SET.has(n.value)) {
        conditionCounts.set(n.value, (conditionCounts.get(n.value) ?? 0) + 1);
        break;
      }
    }
  }

  const sortedDesc = <K>(m: Map<K, number>) =>
    Array.from(m.entries()).sort((a, b) => b[1] - a[1]);

  // Precompute each artist's most-collected style; the client can decide
  // whether to tint (only when the style is in the pillar set for the
  // current slider position).
  const artistDominantStyle: [string, string][] = [];
  for (const [artist, styles] of artistStyles) {
    let best: { name: string; count: number } | null = null;
    for (const [s, c] of styles) {
      if (!best || c > best.count) best = { name: s, count: c };
    }
    if (best) artistDominantStyle.push([artist, best.name]);
  }

  const total = collection.length;
  const vinylPct =
    total > 0
      ? Math.round(((formatCounts.get("Vinyl") ?? 0) / total) * 100)
      : 0;

  return {
    totalReleases: total,
    uniqueArtists: artistCounts.size,
    uniqueLabels: labelCounts.size,
    vinylPct,
    // Top 20 for artist/label is all the UI shows; ship less over the wire
    artistCounts: sortedDesc(artistCounts).slice(0, 20),
    labelCounts: sortedDesc(labelCounts).slice(0, 20),
    // Styles: keep all so the pillar slider (3..15) can pick any depth
    styleCounts: sortedDesc(styleCounts),
    decadeCounts: Array.from(decadeCounts.entries()).sort((a, b) =>
      a[0].localeCompare(b[0]),
    ),
    formatCounts: Array.from(formatCounts.entries()),
    conditionCounts: sortedDesc(conditionCounts),
    artistDominantStyle,
  };
});
