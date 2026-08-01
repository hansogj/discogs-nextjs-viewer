// Pure taste-scoring, filtering, and sorting for the /wantlist Best Buys
// panel. Extracted from components/BestBuysPanel.tsx so it can be unit
// tested independently of React.

import type { ProcessedWantlistItem, WantlistPricesMap } from "./types";

export const DEFAULT_BUDGET_NOK = 1000;
export const MAX_RESULTS = 20;

// Discogs marketplace returns prices in EUR (NOK is not accepted by their
// curr_abbr param). We convert to NOK in the UI using a fixed approximate
// rate so budget input stays in the user's familiar currency.
export const EUR_TO_NOK = 11.5;

// Score weights. Tuned so the artist signal dominates (a heavy Coltrane
// collector finding a Coltrane record beats label coincidence), with style
// overlap and pressings-wanted as strong secondary signals.
const W_ARTIST = 3;
const W_STYLE = 2;
const W_PRESSINGS = 2;
const W_LABEL = 1;

const log1p = (n: number) => Math.log(1 + n);

export type SortMode = "taste" | "cheap" | "value";

// Structured reasons so the UI can render them under the active locale.
// Previously these were pre-formatted English strings baked in here.
export type Reason =
  | { kind: "artist"; name: string; count: number }
  | { kind: "pressings"; count: number }
  | { kind: "label"; name: string; count: number }
  | { kind: "style"; name: string; count: number };

export type Ranked = {
  item: ProcessedWantlistItem;
  priceNok: number;
  priceEur: number;
  numForSale: number;
  tasteScore: number;
  reasons: Reason[];
};

export interface ComputeBestBuysInput {
  items: ProcessedWantlistItem[];
  prices: WantlistPricesMap;
  collectionMasterIds: Set<number>;
  artistCounts: Map<string, number>;
  labelCounts: Map<string, number>;
  styleCounts: Map<string, number>;
  pressingCounts: Map<number, number>;
  budget: number;
  sortMode: SortMode;
}

export function computeBestBuys({
  items,
  prices,
  collectionMasterIds,
  artistCounts,
  labelCounts,
  styleCounts,
  pressingCounts,
  budget,
  sortMode,
}: ComputeBestBuysInput): Ranked[] {
  const matches: Ranked[] = [];

  const seenMasters = new Set<number>();
  for (const item of items) {
    const info = item.basic_information;
    const masterId = info.master_id;
    if (masterId > 0) {
      if (seenMasters.has(masterId)) continue;
      seenMasters.add(masterId);
      if (collectionMasterIds.has(masterId)) continue;
    }

    const price = prices[item.id];
    if (!price || price.lowest_price == null) continue;
    if (price.num_for_sale === 0) continue;
    const priceNok = price.lowest_price * EUR_TO_NOK;
    if (priceNok > budget) continue;

    // --- taste scoring ---
    const primaryArtist = info.artists?.[0]?.name;
    const artistMatch = primaryArtist
      ? (artistCounts.get(primaryArtist) ?? 0)
      : 0;
    const primaryLabel = info.labels?.[0]?.name;
    const labelMatch = primaryLabel ? (labelCounts.get(primaryLabel) ?? 0) : 0;
    const styles = item.details?.styles ?? [];
    const styleMatch = styles.reduce(
      (sum, s) => sum + (styleCounts.get(s) ?? 0),
      0,
    );
    const pressings = masterId > 0 ? (pressingCounts.get(masterId) ?? 1) : 1;

    const tasteScore =
      W_ARTIST * log1p(artistMatch) +
      W_STYLE * log1p(styleMatch) +
      W_PRESSINGS * log1p(pressings) +
      W_LABEL * log1p(labelMatch);

    const reasons: Reason[] = [];
    if (artistMatch >= 3 && primaryArtist) {
      reasons.push({
        kind: "artist",
        name: primaryArtist,
        count: artistMatch,
      });
    }
    if (pressings >= 3) {
      reasons.push({ kind: "pressings", count: pressings });
    }
    if (labelMatch >= 20 && primaryLabel) {
      reasons.push({
        kind: "label",
        name: primaryLabel,
        count: labelMatch,
      });
    }
    // Top style match — surface the single strongest style hit
    if (styles.length > 0) {
      let bestStyle: { name: string; count: number } | null = null;
      for (const s of styles) {
        const c = styleCounts.get(s) ?? 0;
        if (c > 0 && (!bestStyle || c > bestStyle.count)) {
          bestStyle = { name: s, count: c };
        }
      }
      if (bestStyle && bestStyle.count >= 10) {
        reasons.push({
          kind: "style",
          name: bestStyle.name,
          count: bestStyle.count,
        });
      }
    }

    matches.push({
      item,
      priceNok,
      priceEur: price.lowest_price,
      numForSale: price.num_for_sale,
      tasteScore,
      reasons,
    });
  }

  if (sortMode === "cheap") {
    matches.sort((a, b) => a.priceNok - b.priceNok);
  } else if (sortMode === "value") {
    // taste per NOK spent — biggest bang for buck
    matches.sort(
      (a, b) =>
        b.tasteScore / Math.max(b.priceNok, 1) -
        a.tasteScore / Math.max(a.priceNok, 1),
    );
  } else {
    // taste: rank by score, tiebreak by cheaper
    matches.sort((a, b) => {
      if (b.tasteScore !== a.tasteScore) return b.tasteScore - a.tasteScore;
      return a.priceNok - b.priceNok;
    });
  }
  return matches.slice(0, MAX_RESULTS);
}
