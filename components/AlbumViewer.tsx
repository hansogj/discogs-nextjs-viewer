'use client';

import React, { useState, useMemo } from 'react';
import type { CollectionRelease, ProcessedWantlistItem } from '@/lib/types';
import Grid from './Grid';
import SortControls, { type SortKey, type SortOrder } from './SortControls';

interface AlbumViewerProps {
  items: (CollectionRelease | ProcessedWantlistItem)[];
}

const getArtistName = (item: CollectionRelease | ProcessedWantlistItem): string => {
    return item.basic_information.artists?.[0]?.name || 'Unknown Artist';
};

const AlbumViewer: React.FC<AlbumViewerProps> = ({ items }) => {
  const [sortKey, setSortKey] = useState<SortKey>('date_added');
  const [sortOrder, setSortOrder] = useState<SortOrder>('desc');

  const handleSortOrderChange = () => {
    setSortOrder(prev => prev === 'asc' ? 'desc' : 'asc');
  };

  const sortedItems = useMemo(() => {
    return [...items].sort((a, b) => {
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
                // Treat year 0 as "unknown" and push it to the end
                if (aInfo.year === 0 && bInfo.year !== 0) comparison = 1;
                else if (aInfo.year !== 0 && bInfo.year === 0) comparison = -1;
                else comparison = aInfo.year - bInfo.year;
                break;
            case 'date_added':
                comparison = new Date(a.date_added).getTime() - new Date(b.date_added).getTime();
                break;
            // The default case is technically unreachable with strong typing, but serves as a robust fallback.
            default:
                comparison = new Date(a.date_added).getTime() - new Date(b.date_added).getTime();
                break;
        }

        return sortOrder === 'asc' ? comparison : -comparison;
    });
  }, [items, sortKey, sortOrder]);


  return (
    <>
      <SortControls
        sortKey={sortKey}
        sortOrder={sortOrder}
        onSortKeyChange={setSortKey}
        onSortOrderChange={handleSortOrderChange}
      />
      <Grid items={sortedItems} />
    </>
  );
};

export default AlbumViewer;