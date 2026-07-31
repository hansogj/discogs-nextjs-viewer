"use client";

import React, { useEffect, useMemo, useRef, useState } from "react";
import Image from "next/image";
import type { ProcessedWantlistItem, WantlistPricesMap } from "@/lib/types";
import {
  computeBestBuys,
  DEFAULT_BUDGET_NOK,
  type Ranked,
  type SortMode,
} from "@/lib/best-buys";

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

const MYWANTS_URL =
  "https://www.discogs.com/sell/mywants?format=Vinyl&currency=EUR&ships_to=NO";

const buildDiscogsMarketplaceUrl = (releaseId: number) =>
  `https://www.discogs.com/sell/release/${releaseId}`;

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
  const [sortMode, setSortMode] = useState<SortMode>("taste");

  // Tests + a11y tools use data-hydrated to detect when the panel's onClick
  // handlers are wired up. Set the attribute via DOM mutation after mount —
  // keeps server HTML free of the attribute and avoids a setState-in-effect.
  const rootRef = useRef<HTMLDivElement>(null);
  useEffect(() => {
    rootRef.current?.setAttribute("data-hydrated", "true");
  }, []);

  const ranked = useMemo<Ranked[]>(
    () =>
      computeBestBuys({
        items,
        prices,
        collectionMasterIds,
        artistCounts,
        labelCounts,
        styleCounts,
        pressingCounts,
        budget,
        sortMode,
      }),
    [
      items,
      prices,
      collectionMasterIds,
      artistCounts,
      labelCounts,
      styleCounts,
      pressingCounts,
      budget,
      sortMode,
    ],
  );

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
        ? "bg-discogs-blue text-white"
        : "bg-discogs-bg text-discogs-text-secondary hover:bg-discogs-border"
    }`;

  return (
    <div
      ref={rootRef}
      className="mb-4 rounded-lg border border-discogs-border bg-discogs-bg-light p-4"
    >
      <h2 className="mb-3 text-lg font-semibold text-discogs-text">
        Best buys
      </h2>

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
          onClick={() => setSortMode("taste")}
          aria-pressed={sortMode === "taste"}
          className={sortButtonClass("taste")}
          title="Items closest to your collection's taste profile"
        >
          Taste match
        </button>
        <button
          type="button"
          onClick={() => setSortMode("value")}
          aria-pressed={sortMode === "value"}
          className={sortButtonClass("value")}
          title="Taste score per NOK spent"
        >
          Value
        </button>
        <button
          type="button"
          onClick={() => setSortMode("cheap")}
          aria-pressed={sortMode === "cheap"}
          className={sortButtonClass("cheap")}
          title="Sorted by price ascending"
        >
          Cheapest
        </button>
      </div>

      <p className="mb-3 text-xs text-discogs-text-secondary">
        {pricedCount > 0
          ? `${pricedCount} priced items. Showing top ${ranked.length} ≤ ${budget} NOK by ${sortMode === "taste" ? "taste match" : sortMode === "value" ? "value" : "price"}.`
          : "No prices cached yet. Run a sync to populate marketplace prices."}
      </p>

      {ranked.length === 0 && pricedCount > 0 && (
        <p className="text-sm text-discogs-text-secondary">
          No items found under {budget} NOK. Try a higher budget.
        </p>
      )}

      <ul className="max-h-[60vh] space-y-2 overflow-y-auto pr-1">
        {ranked.map((r) => {
          const info = r.item.basic_information;
          const artist = info.artists?.[0]?.name || "Unknown Artist";
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
                      title={r.reasons.join(" · ")}
                    >
                      {r.reasons.join(" · ")}
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
