'use client';

import React, { useMemo, useState } from 'react';
import Image from 'next/image';
import type {
  ProcessedWantlistItem,
  WantlistPricesMap,
} from '@/lib/types';
import { syncPricesAction } from '@/app/actions';

interface BestBuysPanelProps {
  items: ProcessedWantlistItem[];
  prices: WantlistPricesMap;
  collectionMasterIds: Set<number>;
  isSyncing: boolean;
  onItemClick?: (releaseId: number) => void;
}

const DEFAULT_BUDGET = 1000;
const MAX_RESULTS = 20;

const buildDiscogsMarketplaceUrl = (releaseId: number) =>
  `https://www.discogs.com/sell/release/${releaseId}`;

const BestBuysPanel: React.FC<BestBuysPanelProps> = ({
  items,
  prices,
  collectionMasterIds,
  isSyncing,
  onItemClick,
}) => {
  const [budget, setBudget] = useState<number>(DEFAULT_BUDGET);
  const [budgetInput, setBudgetInput] = useState<string>(String(DEFAULT_BUDGET));
  const [refreshing, setRefreshing] = useState(false);

  const ranked = useMemo(() => {
    const matches: {
      item: ProcessedWantlistItem;
      price: number;
      numForSale: number;
      currency: string;
    }[] = [];

    const seenMasters = new Set<number>();
    for (const item of items) {
      const masterId = item.basic_information.master_id;
      if (masterId > 0) {
        if (seenMasters.has(masterId)) continue;
        seenMasters.add(masterId);
        if (collectionMasterIds.has(masterId)) continue;
      }

      const price = prices[item.id];
      if (!price || price.lowest_price == null) continue;
      if (price.num_for_sale === 0) continue;
      if (price.lowest_price > budget) continue;

      matches.push({
        item,
        price: price.lowest_price,
        numForSale: price.num_for_sale,
        currency: price.currency,
      });
    }

    matches.sort((a, b) => a.price - b.price);
    return matches.slice(0, MAX_RESULTS);
  }, [items, prices, collectionMasterIds, budget]);

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

  const handleRefresh = async () => {
    if (refreshing || isSyncing) return;
    setRefreshing(true);
    try {
      await syncPricesAction();
    } catch (err) {
      console.error('Failed to start price sync:', err);
    } finally {
      // Re-enable shortly; the actual progress is shown via the header sync indicator
      setTimeout(() => setRefreshing(false), 1500);
    }
  };

  return (
    <div className="mb-4 rounded-lg border border-discogs-border bg-discogs-bg-light p-4">
      <div className="mb-3 flex items-center justify-between">
        <h2 className="text-lg font-semibold text-white">Best buys</h2>
        <button
          onClick={handleRefresh}
          disabled={refreshing || isSyncing}
          className="rounded-md bg-discogs-blue px-3 py-1 text-xs font-medium text-white transition-colors hover:bg-sky-600 disabled:cursor-not-allowed disabled:bg-gray-600"
          title="Fetch fresh Discogs marketplace prices for your wantlist (slow — runs in the background)"
        >
          {refreshing || isSyncing ? 'Syncing…' : 'Refresh prices'}
        </button>
      </div>

      <form onSubmit={handleBudgetSubmit} className="mb-3">
        <label className="mb-1 block text-xs text-discogs-text-secondary">
          Max budget (NOK)
        </label>
        <div className="flex gap-2">
          <input
            type="number"
            inputMode="numeric"
            min={1}
            value={budgetInput}
            onChange={(e) => setBudgetInput(e.target.value)}
            className="w-full rounded-md border border-discogs-border bg-discogs-bg px-2 py-1 text-sm text-white focus:border-discogs-blue focus:outline-none"
          />
          <button
            type="submit"
            className="rounded-md bg-discogs-border px-3 py-1 text-sm text-white transition-colors hover:bg-discogs-blue"
          >
            Apply
          </button>
        </div>
      </form>

      <p className="mb-3 text-xs text-discogs-text-secondary">
        {pricedCount > 0
          ? `${pricedCount} wantlist items priced. Showing top ${ranked.length} ≤ ${budget} NOK.`
          : 'No prices cached yet. Click "Refresh prices" to fetch from Discogs.'}
      </p>

      {ranked.length === 0 && pricedCount > 0 && (
        <p className="text-sm text-discogs-text-secondary">
          No items found under {budget} NOK. Try a higher budget.
        </p>
      )}

      <ul className="max-h-[60vh] space-y-2 overflow-y-auto pr-1">
        {ranked.map(({ item, price, numForSale, currency }) => {
          const info = item.basic_information;
          const artist = info.artists?.[0]?.name || 'Unknown Artist';
          const cover =
            item.master_cover_image || info.cover_image || info.thumb;
          return (
            <li key={item.id}>
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
                    onClick={() => onItemClick?.(item.id)}
                    className="block w-full truncate text-left text-sm font-medium text-white hover:text-discogs-blue"
                    title={`${artist} – ${info.title}`}
                  >
                    {artist} – {info.title}
                  </button>
                  <div className="mt-1 flex items-center justify-between gap-2 text-xs">
                    <span className="font-semibold text-discogs-blue">
                      {Math.round(price)} {currency}
                    </span>
                    <span className="text-discogs-text-secondary">
                      {numForSale} for sale
                    </span>
                  </div>
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
