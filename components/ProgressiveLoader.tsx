"use client";

import { useState, useEffect, useRef } from "react";
import { useTranslations } from "next-intl";
import AlbumViewer from "./AlbumViewer";
import Spinner from "./Spinner";
import { useSyncContext } from "@/lib/sync-context";
import type {
  CollectionRelease,
  ProcessedWantlistItem,
  Folder,
  CustomField,
  WantlistPricesMap,
} from "@/lib/types";

interface ProgressiveLoaderProps {
  initialItems: (CollectionRelease | ProcessedWantlistItem)[];
  viewType: "collection" | "wantlist";
  folders: Folder[];
  customFields: CustomField[];
  collectionItemsForFiltering?: CollectionRelease[];
  wantlistPrices?: WantlistPricesMap;
}

export default function ProgressiveLoader({
  initialItems,
  viewType,
  ...albumViewerProps
}: ProgressiveLoaderProps) {
  const { isSyncing } = useSyncContext();
  const [partialItems, setPartialItems] = useState<
    (CollectionRelease | ProcessedWantlistItem)[]
  >([]);
  const pollRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const tCollection = useTranslations("collection");
  const tWantlist = useTranslations("wantlist");

  const shouldPoll = initialItems.length === 0 && isSyncing;

  useEffect(() => {
    if (!shouldPoll) {
      if (pollRef.current) {
        clearInterval(pollRef.current);
        pollRef.current = null;
      }
      return;
    }

    const fetchPartial = async () => {
      try {
        const res = await fetch(`/api/partial-items?resource=${viewType}`);
        if (res.ok) {
          const { items } = await res.json();
          if (Array.isArray(items) && items.length > 0) setPartialItems(items);
        }
      } catch {
        // non-critical — just wait for the next poll
      }
    };

    if (!pollRef.current) {
      fetchPartial();
      pollRef.current = setInterval(fetchPartial, 3000);
    }

    return () => {
      if (pollRef.current) {
        clearInterval(pollRef.current);
        pollRef.current = null;
      }
    };
  }, [shouldPoll, viewType, initialItems.length]);

  const displayItems = initialItems.length > 0 ? initialItems : partialItems;
  const showLoader = isSyncing && partialItems.length > 0 && initialItems.length === 0;

  return (
    <div>
      <AlbumViewer items={displayItems} viewType={viewType} {...albumViewerProps} />
      {showLoader && (
        <div className="flex items-center justify-center gap-3 py-8 text-sm text-discogs-text-secondary">
          <Spinner className="text-discogs-text-secondary" />
          <span>
            {viewType === "collection"
              ? tCollection("fetchingMore")
              : tWantlist("fetchingMore")}
          </span>
        </div>
      )}
    </div>
  );
}
