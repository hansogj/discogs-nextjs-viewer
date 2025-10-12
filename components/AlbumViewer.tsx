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
import LoadingIndicator from './LoadingIndicator';

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
      if (masterId > 0 && !seenIds.has(masterId)) {
        seenIds.add(masterId);
        uniqueItems.push(item);
      }
    }
    return { initialUniqueItems: uniqueItems, initialSeenMasterIds: seenIds };
  }, [initialItems, viewType]);

  const [items, setItems] = useState(initialUniqueItems);
  const [page, setPage] = useState(2);
  const [hasNextPage, setHasNextPage] = useState(!!initialPagination.urls.next);
  const [isLoading, setIsLoading] = useState(false);
  const [isSorting, setIsSorting] = useState(false);

  const [sortKey, setSortKey] = useState<SortKey>('date_added');
  const [sortOrder, setSortOrder] = useState<SortOrder>('desc');
  const [showInCollectionOnly, setShowInCollectionOnly] = useState(false);

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

      const MAX_EMPTY_FETCHES = 5;
      if (consecutiveEmptyFetches >= MAX_EMPTY_FETCHES) {
        console.warn(
          'Stopped fetching wantlist after too many consecutive empty pages of duplicates.',
        );
        setHasNextPage(false);
        setIsLoading(false);
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

        if (viewType === 'wantlist') {
          const uniqueNewItems = newItems.filter((item) => {
            const masterId = item.basic_information.master_id;
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

        if (
          viewType === 'wantlist' &&
          newItems.length === 0 &&
          !!pagination.urls.next
        ) {
          await loadMoreItems(currentPage + 1, consecutiveEmptyFetches + 1);
          return;
        }
      } catch (error) {
        console.error('Failed to fetch more items:', error);
        setHasNextPage(false); // Stop fetching on error
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
    const resortItems = async () => {
      setIsSorting(true);
      setItems([]);
      if (viewType === 'wantlist') {
        setSeenMasterIds(new Set<number>());
      }
      setPage(1);
      setHasNextPage(true);
      await loadMoreItems(1);
      setIsSorting(false);
    };
    resortItems();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [sortKey, sortOrder]);

  // Effect for setting up the IntersectionObserver
  useEffect(() => {
    if (isLoading || !hasNextPage || isSorting) {
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
  }, [isLoading, hasNextPage, page, loadMoreItems, isSorting]);

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
      {isSorting ? (
        <LoadingIndicator message={`Sorting your ${viewType}...`} />
      ) : (
        <Grid items={displayedItems} />
      )}

      <div
        ref={loadMoreRef}
        className="flex h-20 items-center justify-center"
      >
        {isLoading && !isSorting && (
          <div className="flex items-center space-x-3 text-discogs-text-secondary">
            <Spinner size="md" />
            <span>Loading more...</span>
          </div>
        )}
        {!hasNextPage && !isSorting && displayedItems.length > 0 && (
          <p className="text-discogs-text-secondary">End of list.</p>
        )}
      </div>
    </>
  );
};

export default AlbumViewer;
