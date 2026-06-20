"use client";

import { useEffect, useRef, useState } from "react";
import type { ProcessedWantlistItem } from "@/lib/types";

type FinnCounts = Map<number, number | null>;

const buildQuery = (item: ProcessedWantlistItem): string => {
  const artist = item.basic_information.artists?.[0]?.name || "";
  return `${artist} ${item.basic_information.title} vinyl`;
};

const MAX_CONCURRENT = 3;

export function useFinnCounts(items: ProcessedWantlistItem[]): {
  counts: FinnCounts;
  loading: boolean;
} {
  const [counts, setCounts] = useState<FinnCounts>(new Map());
  const [loading, setLoading] = useState(false);
  const abortRef = useRef<AbortController | null>(null);
  const fetchedRef = useRef<Set<number>>(new Set());

  useEffect(() => {
    if (items.length === 0) return;

    const toFetch = items.filter((item) => !fetchedRef.current.has(item.id));
    if (toFetch.length === 0) return;

    const controller = new AbortController();
    abortRef.current = controller;
    setLoading(true);

    let active = 0;
    let index = 0;

    const fetchNext = () => {
      if (controller.signal.aborted) return;
      if (index >= toFetch.length) {
        if (active === 0) setLoading(false);
        return;
      }

      const item = toFetch[index++];
      active++;
      fetchedRef.current.add(item.id);
      const query = buildQuery(item);

      fetch(`/api/finn-search?q=${encodeURIComponent(query)}`, {
        signal: controller.signal,
      })
        .then((res) => res.json())
        .then((data) => {
          if (!controller.signal.aborted) {
            setCounts((prev) => {
              const next = new Map(prev);
              next.set(item.id, data.count ?? null);
              return next;
            });
          }
        })
        .catch(() => {
          // ignore aborted / failed
        })
        .finally(() => {
          active--;
          fetchNext();
        });
    };

    for (let i = 0; i < MAX_CONCURRENT; i++) {
      fetchNext();
    }

    return () => {
      controller.abort();
    };
  }, [items]);

  return { counts, loading };
}
