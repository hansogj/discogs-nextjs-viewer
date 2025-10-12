'use client';

import React, {
  useState,
  useMemo,
  useEffect,
  useRef,
  useCallback,
} from 'react';
import type {
  CollectionRelease,
  ProcessedWantlistItem,
  Pagination,
} from '@/lib/types';
import { fetchCollectionPage, fetchWantlistPage } from '@/app/actions';
import Grid from './Grid';
import SortControls, { type SortKey, type SortOrder } from './SortControls';
import Spinner from './Spinner';

interface AlbumViewerProps {
  initialItems: (CollectionRelease | ProcessedWantlistItem)[];
  initialPagination: Pagination;
  viewType: 'collection' | 'wantlist';
  collectionItemsForFiltering?: CollectionRelease[];
}

const AlbumViewer: React.FC<AlbumViewerProps> = ({
  initialItems,
  initialPagination,
  viewType,
  collectionItemsForFiltering,
}) => {
  // Memoize the processing of initial items to ensure wantlist is unique from the start.
  const { initialUniqueItems, initialSeenMasterIds } = useMemo(() => {
    if (viewType !== 'wantlist') {
      return {
        initialUniqueItems: initialItems,
        initialSeenMasterIds: new Set<number>(),
      };
    }
    const uniqueItems: ProcessedWantlistItem[] = [];
    const seenIds = new Set<number>();
    for (const item of initialItems as ProcessedWantlistItem[]) {
      const masterId = item.basic_information.master_id;
      // Rule: Item must have a master_id and it must not have been seen before.
      if (masterId > 0 && !seenIds.has(masterId)) {
        seenIds.add(masterId);
        uniqueItems.push(item);
      }
    }
    return { initialUniqueItems: uniqueItems, initialSeenMasterIds: seenIds };
  }, [initialItems, viewType]);

  const [items, setItems] = useState(initialUniqueItems);
  const [page, setPage] = useState(2); // Start with the next page to fetch
  const [hasNextPage, setHasNextPage] = useState(!!initialPagination.urls.next);
  const [isLoading, setIsLoading] = useState(false);

  const [sortKey, setSortKey] = useState<SortKey>('date_added');
  const [sortOrder, setSortOrder] = useState<SortOrder>('desc');
  const [showInCollectionOnly, setShowInCollectionOnly] = useState(false);

  // Use the memoized set of master IDs for the initial state.
  const [seenMasterIds, setSeenMasterIds] = useState(initialSeenMasterIds);

  const observerRef = useRef<IntersectionObserver | null>(null);
  const loadMoreRef = useRef<HTMLDivElement | null>(null);
  const isInitialMount = useRef(true);

  const handleSortOrderChange = () => {
    setSortOrder((prev) => (prev === 'asc' ? 'desc' : 'asc'));
  };

  const collectionMasterIds = useMemo(() => {
    if (viewType !== 'wantlist' || !collectionItemsForFiltering)
      return new Set<number>();
    const ids = new Set<number>();
    for (const item of collectionItemsForFiltering) {
      if (item.basic_information.master_id > 0) {
        ids.add(item.basic_information.master_id);
      }
    }
    return ids;
  }, [collectionItemsForFiltering, viewType]);

  const displayedItems = useMemo(() => {
    if (viewType === 'wantlist' && showInCollectionOnly) {
      return items.filter((item) => {
        const masterId = item.basic_information.master_id;
        return masterId > 0 && collectionMasterIds.has(masterId);
      });
    }
    return items;
  }, [items, showInCollectionOnly, viewType, collectionMasterIds]);

  const loadMoreItems = useCallback(
    async (currentPage: number, consecutiveEmptyFetches = 0) => {
      if (isLoading) return;

      const MAX_EMPTY_FETCHES = 5; // Safety break for recursive fetches
      if (consecutiveEmptyFetches >= MAX_EMPTY_FETCHES) {
        console.warn(
          'Stopped fetching wantlist after too many consecutive empty pages of duplicates.',
        );
        setHasNextPage(false);
        setIsLoading(false); // Ensure loading is reset
        return;
      }

      setIsLoading(true);

      try {
        const action =
          viewType === 'collection' ? fetchCollectionPage : fetchWantlistPage;
        const { data, pagination } = await action(
          currentPage,
          sortKey,
          sortOrder,
        );

        let newItems: (CollectionRelease | ProcessedWantlistItem)[] =
          data as any;

        // De-duplicate wantlist items by master_id
        if (viewType === 'wantlist') {
          const uniqueNewItems = newItems.filter((item) => {
            const masterId = item.basic_information.master_id;
            // Item must have a master ID and it must be one we haven't seen.
            return masterId > 0 && !seenMasterIds.has(masterId);
          });

          const newMasterIds = uniqueNewItems
            .map((item) => item.basic_information.master_id)
            .filter((id) => id > 0);

          if (newMasterIds.length > 0) {
            setSeenMasterIds((prev) => new Set([...prev, ...newMasterIds]));
          }
          newItems = uniqueNewItems;
        }

        if (currentPage === 1) {
          setItems(newItems);
        } else {
          setItems((prev) => [...prev, ...newItems]);
        }

        setPage(currentPage + 1);
        setHasNextPage(!!pagination.urls.next);

        // If we fetched a page that only contained duplicates, and there are more pages, fetch the next one.
        if (
          viewType === 'wantlist' &&
          newItems.length === 0 &&
          !!pagination.urls.next
        ) {
          loadMoreItems(currentPage + 1, consecutiveEmptyFetches + 1);
          return; // Exit here to keep isLoading true until recursive call finishes
        }
      } catch (error) {
        console.error('Failed to fetch more items:', error);
      }

      setIsLoading(false);
    },
    [isLoading, viewType, sortKey, sortOrder, seenMasterIds],
  );

  // Effect for handling sort changes
  useEffect(() => {
    if (isInitialMount.current) {
      isInitialMount.current = false;
      return;
    }
    setItems([]);
    if (viewType === 'wantlist') {
      setSeenMasterIds(new Set());
    }
    setPage(1);
    setHasNextPage(true); // Assume there's a page 1
    loadMoreItems(1);
  }, [sortKey, sortOrder]);

  // Effect for setting up the IntersectionObserver
  useEffect(() => {
    if (isLoading || !hasNextPage) {
      // Disconnect observer if loading or no more pages
      if (observerRef.current && loadMoreRef.current) {
        observerRef.current.unobserve(loadMoreRef.current);
      }
      return;
    }

    observerRef.current = new IntersectionObserver(
      (entries) => {
        if (entries[0].isIntersecting) {
          loadMoreItems(page);
        }
      },
      { rootMargin: '200px' },
    );

    if (loadMoreRef.current) {
      observerRef.current.observe(loadMoreRef.current);
    }

    return () => {
      if (observerRef.current && loadMoreRef.current) {
        observerRef.current.unobserve(loadMoreRef.current);
      }
    };
  }, [isLoading, hasNextPage, page, loadMoreItems]);

  return (
    <>
      <SortControls
        sortKey={sortKey}
        sortOrder={sortOrder}
        onSortKeyChange={setSortKey}
        onSortOrderChange={handleSortOrderChange}
        filterOptions={
          viewType === 'wantlist'
            ? {
                isEnabled: showInCollectionOnly,
                onToggle: () => setShowInCollectionOnly((prev) => !prev),
                label: 'Show only items in collection',
              }
            : undefined
        }
      />
      <Grid items={displayedItems} />

      <div
        ref={loadMoreRef}
        className="flex h-20 items-center justify-center"
      >
        {isLoading && <Spinner size="md" />}
        {!hasNextPage && displayedItems.length > 0 && (
          <p className="text-discogs-text-secondary">End of list.</p>
        )}
      </div>
    </>
  );
};

export default AlbumViewer;
