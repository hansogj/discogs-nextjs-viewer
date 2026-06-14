'use client';

import React, { useEffect, useMemo, useState } from 'react';
import Image from 'next/image';
import type {
  ProcessedWantlistItem,
  WantlistPricesMap,
} from '@/lib/types';

interface BestBuysPanelProps {
  items: ProcessedWantlistItem[];
  prices: WantlistPricesMap;
  collectionMasterIds: Set<number>;
  artistCounts: Map<string, number>;
  labelCounts: Map<string, number>;
  styleCounts: Map<string, number>;
  pressingCounts: Map<number, number>;
  onItemClick?: (releaseId: number) => void;
}

const DEFAULT_BUDGET_NOK = 1000;
const MAX_RESULTS = 20;

// Discogs marketplace returns prices in EUR (NOK is not accepted by their
// curr_abbr param). We convert to NOK in the UI using a fixed approximate
// rate so budget input stays in the user's familiar currency.
const EUR_TO_NOK = 11.5;

// Score weights. Tuned so the artist signal dominates (a heavy Coltrane
// collector finding a Coltrane record beats label coincidence), with style
// overlap and pressings-wanted as strong secondary signals.
const W_ARTIST = 3;
const W_STYLE = 2;
const W_PRESSINGS = 2;
const W_LABEL = 1;

const MYWANTS_URL =
  'https://www.discogs.com/sell/mywants?format=Vinyl&currency=EUR&ships_to=NO';

const buildDiscogsMarketplaceUrl = (releaseId: number) =>
  `https://www.discogs.com/sell/release/${releaseId}`;

const log1p = (n: number) => Math.log(1 + n);

type Ranked = {
  item: ProcessedWantlistItem;
  priceNok: number;
  priceEur: number;
  numForSale: number;
  tasteScore: number;
  reasons: string[];
};

type SortMode = 'taste' | 'cheap' | 'value';

const BestBuysPanel: React.FC<BestBuysPanelProps> = ({
  items,
  prices,
  collectionMasterIds,
  artistCounts,
  labelCounts,
  styleCounts,
  pressingCounts,
  onItemClick,
}) => {
  const [budget, setBudget] = useState<number>(DEFAULT_BUDGET_NOK);
  const [budgetInput, setBudgetInput] = useState<string>(
    String(DEFAULT_BUDGET_NOK),
  );
  const [sortMode, setSortMode] = useState<SortMode>('taste');

  // Tests + a11y tools use data-hydrated to detect when the panel's onClick
  // handlers are wired up. The attribute is missing in server-rendered HTML
  // and only flips to "true" after the client mounts.
  const [hydrated, setHydrated] = useState(false);
  useEffect(() => {
    setHydrated(true);
  }, []);

  const ranked = useMemo<Ranked[]>(() => {
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
      const labelMatch = primaryLabel
        ? (labelCounts.get(primaryLabel) ?? 0)
        : 0;
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

      const reasons: string[] = [];
      if (artistMatch >= 3 && primaryArtist) {
        reasons.push(`★ ${primaryArtist} (${artistMatch} in collection)`);
      }
      if (pressings >= 3) {
        reasons.push(`${pressings} pressings wanted`);
      }
      if (labelMatch >= 20 && primaryLabel) {
        reasons.push(`${primaryLabel} (${labelMatch})`);
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
          reasons.push(`${bestStyle.name} (${bestStyle.count})`);
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

    if (sortMode === 'cheap') {
      matches.sort((a, b) => a.priceNok - b.priceNok);
    } else if (sortMode === 'value') {
      // taste per NOK spent — biggest bang for buck
      matches.sort(
        (a, b) =>
          b.tasteScore / Math.max(a.priceNok, 1) -
          a.tasteScore / Math.max(b.priceNok, 1),
      );
    } else {
      // taste: rank by score, tiebreak by cheaper
      matches.sort((a, b) => {
        if (b.tasteScore !== a.tasteScore) return b.tasteScore - a.tasteScore;
        return a.priceNok - b.priceNok;
      });
    }
    return matches.slice(0, MAX_RESULTS);
  }, [
    items,
    prices,
    collectionMasterIds,
    artistCounts,
    labelCounts,
    styleCounts,
    pressingCounts,
    budget,
    sortMode,
  ]);

  const pricedCount = useMemo(() => {
    let count = 0;
    for (const id in prices) {
      if (prices[id].lowest_price != null) count++;
    }
    return count;
  }, [prices]);

  const handleBudgetSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const parsed = parseInt(budgetInput, 10);
    if (!isNaN(parsed) && parsed > 0) {
      setBudget(parsed);
    }
  };

  const sortButtonClass = (mode: SortMode) =>
    `flex-1 rounded-md px-2 py-1 text-xs font-medium transition-colors ${
      sortMode === mode
        ? 'bg-discogs-blue text-white'
        : 'bg-discogs-bg text-discogs-text-secondary hover:bg-discogs-border'
    }`;

  return (
    <div
      data-hydrated={hydrated ? 'true' : undefined}
      className="mb-4 rounded-lg border border-discogs-border bg-discogs-bg-light p-4"
    >
      <h2 className="mb-3 text-lg font-semibold text-discogs-text">Best buys</h2>

      <a
        href={MYWANTS_URL}
        target="_blank"
        rel="noopener noreferrer"
        className="mb-3 block rounded-md bg-discogs-blue px-3 py-2 text-center text-xs font-medium text-white transition-colors hover:bg-discogs-blue-dark"
        title="Open Discogs marketplace filtered to your wantlist. Discogs ranks sellers by how many of your wantlist items they stock."
      >
        Find best seller on Discogs →
      </a>

      <form onSubmit={handleBudgetSubmit} className="mb-3">
        <label className="mb-1 block text-xs text-discogs-text-secondary">
          Max budget per item (NOK)
        </label>
        <div className="flex gap-2">
          <input
            type="number"
            inputMode="numeric"
            min={1}
            value={budgetInput}
            onChange={(e) => setBudgetInput(e.target.value)}
            className="w-full rounded-md border border-discogs-border bg-discogs-bg px-2 py-1 text-sm text-discogs-text focus:border-discogs-blue focus:outline-none"
          />
          <button
            type="submit"
            className="rounded-md bg-discogs-border px-3 py-1 text-sm text-discogs-text transition-colors hover:bg-discogs-blue hover:text-white"
          >
            Apply
          </button>
        </div>
      </form>

      <div className="mb-3 flex gap-1">
        <button
          type="button"
          onClick={() => setSortMode('taste')}
          aria-pressed={sortMode === 'taste'}
          className={sortButtonClass('taste')}
          title="Items closest to your collection's taste profile"
        >
          Taste match
        </button>
        <button
          type="button"
          onClick={() => setSortMode('value')}
          aria-pressed={sortMode === 'value'}
          className={sortButtonClass('value')}
          title="Taste score per NOK spent"
        >
          Value
        </button>
        <button
          type="button"
          onClick={() => setSortMode('cheap')}
          aria-pressed={sortMode === 'cheap'}
          className={sortButtonClass('cheap')}
          title="Sorted by price ascending"
        >
          Cheapest
        </button>
      </div>

      <p className="mb-3 text-xs text-discogs-text-secondary">
        {pricedCount > 0
          ? `${pricedCount} priced items. Showing top ${ranked.length} ≤ ${budget} NOK by ${sortMode === 'taste' ? 'taste match' : sortMode === 'value' ? 'value' : 'price'}.`
          : 'No prices cached yet. Run a sync to populate marketplace prices.'}
      </p>

      {ranked.length === 0 && pricedCount > 0 && (
        <p className="text-sm text-discogs-text-secondary">
          No items found under {budget} NOK. Try a higher budget.
        </p>
      )}

      <ul className="max-h-[60vh] space-y-2 overflow-y-auto pr-1">
        {ranked.map((r) => {
          const info = r.item.basic_information;
          const artist = info.artists?.[0]?.name || 'Unknown Artist';
          const cover =
            r.item.master_cover_image || info.cover_image || info.thumb;
          return (
            <li key={r.item.id}>
              <div className="flex gap-2 rounded-md bg-discogs-bg p-2 transition-colors hover:bg-discogs-border/40">
                {cover ? (
                  <Image
                    src={cover}
                    alt={info.title}
                    width={48}
                    height={48}
                    className="h-12 w-12 flex-shrink-0 rounded object-cover"
                    unoptimized
                  />
                ) : (
                  <div className="h-12 w-12 flex-shrink-0 rounded bg-discogs-border" />
                )}
                <div className="min-w-0 flex-1">
                  <button
                    type="button"
                    onClick={() => onItemClick?.(r.item.id)}
                    className="block w-full truncate text-left text-sm font-medium text-discogs-text hover:text-discogs-blue"
                    title={`${artist} – ${info.title}`}
                  >
                    {artist} – {info.title}
                  </button>
                  <div className="mt-1 flex items-center justify-between gap-2 text-xs">
                    <span
                      className="font-semibold text-discogs-blue"
                      title={`${r.priceEur.toFixed(2)} EUR`}
                    >
                      ~{Math.round(r.priceNok)} NOK
                    </span>
                    <span className="text-discogs-text-secondary">
                      {r.numForSale} for sale
                    </span>
                  </div>
                  {r.reasons.length > 0 && (
                    <div
                      className="mt-1 truncate text-[10px] text-discogs-text-secondary"
                      title={r.reasons.join(' · ')}
                    >
                      {r.reasons.join(' · ')}
                    </div>
                  )}
                  <a
                    href={buildDiscogsMarketplaceUrl(info.id)}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-xs text-discogs-text-secondary hover:text-discogs-blue"
                  >
                    Open marketplace →
                  </a>
                </div>
              </div>
            </li>
          );
        })}
      </ul>
    </div>
  );
};

export default BestBuysPanel;
