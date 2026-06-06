'use client';

import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import Image from 'next/image';
import { useRouter } from 'next/navigation';
import type {
  ProcessedWantlistItem,
  WantlistPricesMap,
} from '@/lib/types';
import { syncPricesAction } from '@/app/actions';

interface BestBuysPanelProps {
  items: ProcessedWantlistItem[];
  prices: WantlistPricesMap;
  collectionMasterIds: Set<number>;
  onItemClick?: (releaseId: number) => void;
}

const DEFAULT_BUDGET_NOK = 1000;
const MAX_RESULTS = 20;

// Approximate fixed rate. Discogs marketplace returns prices in EUR; we
// convert to NOK for display because Discogs doesn't accept NOK as curr_abbr.
const EUR_TO_NOK = 11.5;

const buildDiscogsMarketplaceUrl = (releaseId: number) =>
  `https://www.discogs.com/sell/release/${releaseId}`;

interface SyncProgressState {
  status: string;
  resource?: string;
  processed?: number;
  total?: number;
  stepName?: string;
  message?: string;
}

const BestBuysPanel: React.FC<BestBuysPanelProps> = ({
  items,
  prices,
  collectionMasterIds,
  onItemClick,
}) => {
  const [budget, setBudget] = useState<number>(DEFAULT_BUDGET_NOK);
  const [budgetInput, setBudgetInput] = useState<string>(
    String(DEFAULT_BUDGET_NOK),
  );
  const [refreshing, setRefreshing] = useState(false);
  const [syncProgress, setSyncProgress] = useState<SyncProgressState | null>(
    null,
  );
  const pollRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const router = useRouter();

  const ranked = useMemo(() => {
    const matches: {
      item: ProcessedWantlistItem;
      priceNok: number;
      priceEur: number;
      numForSale: number;
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
      const priceNok = price.lowest_price * EUR_TO_NOK;
      if (priceNok > budget) continue;

      matches.push({
        item,
        priceNok,
        priceEur: price.lowest_price,
        numForSale: price.num_for_sale,
      });
    }

    matches.sort((a, b) => a.priceNok - b.priceNok);
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

  const stopPolling = useCallback(() => {
    if (pollRef.current) {
      clearInterval(pollRef.current);
      pollRef.current = null;
    }
  }, []);

  const startPolling = useCallback(() => {
    if (pollRef.current) return;
    let observedActiveSync = false;
    let pollCount = 0;
    pollRef.current = setInterval(async () => {
      try {
        const res = await fetch('/api/sync-progress');
        if (!res.ok) return;
        const progress = (await res.json()) as SyncProgressState;
        pollCount++;

        const isActive =
          !!progress.status &&
          progress.status !== 'idle' &&
          progress.status !== 'done' &&
          progress.status !== 'error';

        if (isActive) {
          observedActiveSync = true;
          setSyncProgress(progress);
        } else if (observedActiveSync) {
          // Was running, now finished — reload to pull fresh cached prices
          stopPolling();
          setSyncProgress(null);
          setRefreshing(false);
          router.refresh();
        } else if (pollCount > 10) {
          // 30s with no activity — give up silently
          stopPolling();
          setRefreshing(false);
        }
      } catch {
        // Network blip — keep polling
      }
    }, 3000);
  }, [router, stopPolling]);

  useEffect(() => stopPolling, [stopPolling]);

  const handleRefresh = async () => {
    if (refreshing) return;
    setRefreshing(true);
    setSyncProgress({ status: 'starting', message: 'Queuing sync…' });
    try {
      await syncPricesAction();
      startPolling();
    } catch (err) {
      console.error('Failed to start price sync:', err);
      setSyncProgress(null);
      setRefreshing(false);
    }
  };

  const progressLabel = (() => {
    if (!syncProgress) return null;
    if (syncProgress.processed != null && syncProgress.total) {
      const pct =
        syncProgress.total > 0
          ? Math.round((syncProgress.processed / syncProgress.total) * 100)
          : 0;
      return `${syncProgress.processed}/${syncProgress.total} (${pct}%)`;
    }
    return syncProgress.stepName || syncProgress.message || 'Working…';
  })();

  return (
    <div className="mb-4 rounded-lg border border-discogs-border bg-discogs-bg-light p-4">
      <div className="mb-3 flex items-center justify-between">
        <h2 className="text-lg font-semibold text-white">Best buys</h2>
        <button
          onClick={handleRefresh}
          disabled={refreshing}
          className="rounded-md bg-discogs-blue px-3 py-1 text-xs font-medium text-white transition-colors hover:bg-sky-600 disabled:cursor-not-allowed disabled:bg-gray-600"
          title="Fetch fresh Discogs marketplace prices for your wantlist (slow — runs in the background)"
        >
          {refreshing ? 'Syncing…' : 'Refresh prices'}
        </button>
      </div>

      {refreshing && progressLabel && (
        <p className="mb-3 text-xs text-discogs-blue">{progressLabel}</p>
      )}

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
        {ranked.map(({ item, priceNok, priceEur, numForSale }) => {
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
                    <span
                      className="font-semibold text-discogs-blue"
                      title={`${priceEur.toFixed(2)} EUR`}
                    >
                      ~{Math.round(priceNok)} NOK
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
