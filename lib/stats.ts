// Pure aggregation helpers used by /stats and /duplicates. Split from
// lib/data.ts so unit tests can import them without pulling in the
// server-only auth/cache modules that data.ts uses at page-load time.

import type { CollectionRelease } from "./types";

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

export function computeCollectionStats(
  collection: CollectionRelease[],
): StatsPayload {
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
}
