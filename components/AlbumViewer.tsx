'use client';

import React, { useState, useMemo } from 'react';
import type {
  CollectionRelease,
  ProcessedWantlistItem,
  ReleaseDetails,
} from '@/lib/types';
import Grid from './Grid';
import SortControls, {
  type SortKey,
  type SortOrder,
  type View,
} from './SortControls';
import AlbumList from './AlbumList';

interface AlbumViewerProps {
  items: (CollectionRelease | ProcessedWantlistItem)[];
  viewType: 'collection' | 'wantlist';
  collectionItemsForFiltering?: CollectionRelease[];
}

const AlbumViewer: React.FC<AlbumViewerProps> = ({
  items,
  viewType,
  collectionItemsForFiltering,
}) => {
  const [sortKey, setSortKey] = useState<SortKey>('date_added');
  const [sortOrder, setSortOrder] = useState<SortOrder>('desc');
  const [showOnlyInCollection, setShowOnlyInCollection] = useState(false);
  const [view, setView] = useState<View>('grid');
  const [searchQuery, setSearchQuery] = useState('');

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

  const uniqueWantlistItems = useMemo(() => {
    if (viewType !== 'wantlist') return items;
    const uniqueItems: ProcessedWantlistItem[] = [];
    const seenIds = new Set<number>();
    for (const item of items as ProcessedWantlistItem[]) {
      const masterId = item.basic_information.master_id;
      if (masterId > 0 && !seenIds.has(masterId)) {
        seenIds.add(masterId);
        uniqueItems.push(item);
      }
    }
    return uniqueItems;
  }, [items, viewType]);

  const sortedAndFilteredItems = useMemo(() => {
    let itemsToDisplay = viewType === 'wantlist' ? uniqueWantlistItems : items;

    // --- Search Filtering ---
    if (searchQuery.trim() !== '') {
      const lowercasedQuery = searchQuery.toLowerCase();
      itemsToDisplay = itemsToDisplay.filter((item) => {
        const info = item.basic_information;
        const details = item.details;

        const check = (str: string | undefined | null) =>
          str?.toLowerCase().includes(lowercasedQuery);
        const checkArr = (arr: string[] | undefined) =>
          arr?.some((s) => s.toLowerCase().includes(lowercasedQuery));

        if (check(info.title)) return true;
        if (info.year?.toString().includes(lowercasedQuery)) return true;
        if (info.artists?.some((a) => check(a.name))) return true;
        if (info.labels?.some((l) => check(l.name) || check(l.catno)))
          return true;
        if (info.formats?.some((f) => check(f.name) || checkArr(f.descriptions)))
          return true;

        if (details) {
          if (details.extraartists?.some((a) => check(a.name) || check(a.role)))
            return true;
          if (checkArr(details.genres)) return true;
          if (checkArr(details.styles)) return true;
          if (check(details.notes)) return true;
        }

        return false;
      });
    }

    // --- Other Filtering ---
    if (viewType === 'wantlist' && showOnlyInCollection) {
      itemsToDisplay = itemsToDisplay.filter((item) => {
        const masterId = item.basic_information.master_id;
        // Inverted logic: show only items that ARE in the collection
        return masterId > 0 && collectionMasterIds.has(masterId);
      });
    }

    // --- Sorting ---
    return [...itemsToDisplay].sort((a, b) => {
      const aInfo = a.basic_information;
      const bInfo = b.basic_information;
      let compareA: string | number;
      let compareB: string | number;

      switch (sortKey) {
        case 'artist':
          compareA = aInfo.artists?.[0]?.name.toLocaleLowerCase() || '';
          compareB = bInfo.artists?.[0]?.name.toLocaleLowerCase() || '';
          break;
        case 'year':
          compareA = aInfo.year || 0;
          compareB = bInfo.year || 0;
          break;
        case 'date_added':
          const dateA = 'date_added' in a ? a.date_added : 0;
          const dateB = 'date_added' in b ? b.date_added : 0;
          compareA = new Date(dateA).getTime();
          compareB = new Date(dateB).getTime();
          break;
        case 'title':
        default:
          compareA = aInfo.title
            .replace(/^(the|a|an)\s+/i, '')
            .toLocaleLowerCase();
          compareB = bInfo.title
            .replace(/^(the|a|an)\s+/i, '')
            .toLocaleLowerCase();
      }

      const direction = sortOrder === 'asc' ? 1 : -1;

      if (typeof compareA === 'string' && typeof compareB === 'string') {
        return compareA.localeCompare(compareB) * direction;
      }
      if (compareA < compareB) return -1 * direction;
      if (compareA > compareB) return 1 * direction;
      return 0;
    });
  }, [
    items,
    uniqueWantlistItems,
    sortKey,
    sortOrder,
    showOnlyInCollection,
    viewType,
    collectionMasterIds,
    searchQuery,
  ]);

  return (
    <>
      <SortControls
        sortKey={sortKey}
        sortOrder={sortOrder}
        onSortKeyChange={setSortKey}
        onSortOrderChange={handleSortOrderChange}
        view={view}
        onViewChange={setView}
        searchQuery={searchQuery}
        onSearchQueryChange={setSearchQuery}
        viewType={viewType}
        filterOptions={
          viewType === 'wantlist'
            ? {
                isEnabled: showOnlyInCollection,
                onToggle: () => setShowOnlyInCollection((prev) => !prev),
                label: 'Show only items in collection',
              }
            : undefined
        }
      />
      {items.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-20 text-center">
          <p className="text-lg text-discogs-text-secondary">
            Your {viewType} is empty.
          </p>
          <p className="mt-2 text-discogs-text-secondary">
            Try syncing with Discogs to load your data.
          </p>
        </div>
      ) : view === 'grid' ? (
        <Grid items={sortedAndFilteredItems} />
      ) : (
        <AlbumList items={sortedAndFilteredItems} />
      )}
    </>
  );
};

export default AlbumViewer;
