'use client';

import React, { useState, useMemo } from 'react';
import type { CollectionRelease, ProcessedWantlistItem } from '@/lib/types';
import Grid from './Grid';
import SortControls, { type SortKey, type SortOrder } from './SortControls';

interface AlbumViewerProps {
  items: (CollectionRelease | ProcessedWantlistItem)[];
  viewType: 'collection' | 'wantlist';
  collectionItemsForFiltering?: CollectionRelease[];
}

const getArtistName = (item: CollectionRelease | ProcessedWantlistItem): string => {
    return item.basic_information.artists?.[0]?.name || 'Unknown Artist';
};

const AlbumViewer: React.FC<AlbumViewerProps> = ({ items, viewType, collectionItemsForFiltering }) => {
  const [sortKey, setSortKey] = useState<SortKey>('date_added');
  const [sortOrder, setSortOrder] = useState<SortOrder>('desc');
  const [showInCollectionOnly, setShowInCollectionOnly] = useState(false);

  const handleSortOrderChange = () => {
    setSortOrder(prev => prev === 'asc' ? 'desc' : 'asc');
  };

  const collectionMasterIds = useMemo(() => {
    if (viewType !== 'wantlist' || !collectionItemsForFiltering) return null;
    const ids = new Set<number>();
    for (const item of collectionItemsForFiltering) {
        if (item.basic_information.master_id > 0) {
            ids.add(item.basic_information.master_id);
        }
    }
    return ids;
  }, [collectionItemsForFiltering, viewType]);

  const sortedItems = useMemo(() => {
    let filteredItems = items;
    
    if (viewType === 'wantlist' && showInCollectionOnly && collectionMasterIds) {
        filteredItems = items.filter(item => {
            const masterId = item.basic_information.master_id;
            return masterId > 0 && collectionMasterIds.has(masterId);
        });
    }

    return [...filteredItems].sort((a, b) => {
        const aInfo = a.basic_information;
        const bInfo = b.basic_information;
        let comparison = 0;

        switch (sortKey) {
            case 'title':
                comparison = aInfo.title.localeCompare(bInfo.title);
                break;
            case 'artist':
                comparison = getArtistName(a).localeCompare(getArtistName(b));
                break;
            case 'year':
                if (aInfo.year === 0 && bInfo.year !== 0) comparison = 1;
                else if (aInfo.year !== 0 && bInfo.year === 0) comparison = -1;
                else comparison = aInfo.year - bInfo.year;
                break;
            case 'date_added':
                comparison = new Date(a.date_added).getTime() - new Date(b.date_added).getTime();
                break;
            default:
                comparison = new Date(a.date_added).getTime() - new Date(b.date_added).getTime();
                break;
        }

        return sortOrder === 'asc' ? comparison : -comparison;
    });
  }, [items, sortKey, sortOrder, showInCollectionOnly, collectionMasterIds, viewType]);


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
      <Grid items={sortedItems} />
    </>
  );
};

export default AlbumViewer;
