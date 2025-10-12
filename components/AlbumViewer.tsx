'use client';

import React, { useState, useMemo, useEffect, useRef, useCallback } from 'react';
import type { CollectionRelease, ProcessedWantlistItem, Pagination } from '@/lib/types';
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

const AlbumViewer: React.FC<AlbumViewerProps> = ({ initialItems, initialPagination, viewType, collectionItemsForFiltering }) => {
  const [items, setItems] = useState(initialItems);
  const [page, setPage] = useState(2); // Start with the next page to fetch
  const [hasNextPage, setHasNextPage] = useState(!!initialPagination.urls.next);
  const [isLoading, setIsLoading] = useState(false);
  
  const [sortKey, setSortKey] = useState<SortKey>('date_added');
  const [sortOrder, setSortOrder] = useState<SortOrder>('desc');
  const [showInCollectionOnly, setShowInCollectionOnly] = useState(false);

  const observerRef = useRef<IntersectionObserver | null>(null);
  const loadMoreRef = useRef<HTMLDivElement | null>(null);
  const isInitialMount = useRef(true);

  const handleSortOrderChange = () => {
    setSortOrder(prev => prev === 'asc' ? 'desc' : 'asc');
  };

  const collectionMasterIds = useMemo(() => {
    if (viewType !== 'wantlist' || !collectionItemsForFiltering) return new Set<number>();
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
      return items.filter(item => {
        const masterId = item.basic_information.master_id;
        return masterId > 0 && collectionMasterIds.has(masterId);
      });
    }
    return items;
  }, [items, showInCollectionOnly, viewType, collectionMasterIds]);

  const loadMoreItems = useCallback(async (currentPage: number) => {
    if (isLoading) return;
    setIsLoading(true);

    try {
        const action = viewType === 'collection' ? fetchCollectionPage : fetchWantlistPage;
        const { data: newItems, pagination } = await action(currentPage, sortKey, sortOrder);
        
        // This check is important for sort changes, we replace items instead of appending
        if (currentPage === 1) {
            setItems(newItems as (CollectionRelease | ProcessedWantlistItem)[]);
        } else {
            setItems(prev => [...prev, ...newItems as (CollectionRelease | ProcessedWantlistItem)[]]);
        }
        
        setPage(currentPage + 1);
        setHasNextPage(!!pagination.urls.next);

    } catch (error) {
        console.error("Failed to fetch more items:", error);
        // Optionally set an error state here
    } finally {
        setIsLoading(false);
    }
  }, [isLoading, viewType, sortKey, sortOrder]);


  // Effect for handling sort changes
  useEffect(() => {
    if (isInitialMount.current) {
        isInitialMount.current = false;
        return;
    }
    // When sort changes, reset everything and fetch page 1
    setItems([]);
    setPage(1);
    setHasNextPage(true);
    loadMoreItems(1);
  }, [sortKey, sortOrder]);


  // Effect for setting up the IntersectionObserver
  useEffect(() => {
    if (isLoading) return;
    
    observerRef.current = new IntersectionObserver(entries => {
        if (entries[0].isIntersecting && hasNextPage) {
            loadMoreItems(page);
        }
    });

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
            viewType === 'wantlist' ? {
                isEnabled: showInCollectionOnly,
                onToggle: () => setShowInCollectionOnly(prev => !prev),
                label: "Show only items in collection"
            } : undefined
        }
      />
      <Grid items={displayedItems} />

      <div ref={loadMoreRef} className="flex justify-center items-center h-20">
        {isLoading && <Spinner size="md" />}
        {!hasNextPage && displayedItems.length > 0 && (
            <p className="text-discogs-text-secondary">End of list.</p>
        )}
      </div>
    </>
  );
};

export default AlbumViewer;
