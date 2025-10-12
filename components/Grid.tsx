import React from 'react';
import type { CollectionRelease } from '@/lib/types';
import type { ProcessedWantlistItem } from '../lib/types';
import AlbumCard from './AlbumCard';

interface GridProps {
  items: (CollectionRelease | ProcessedWantlistItem)[];
}

const getArtistName = (item: CollectionRelease | ProcessedWantlistItem): string => {
  return item.basic_information.artists?.[0]?.name || 'Unknown Artist';
};

const Grid: React.FC<GridProps> = ({ items }) => {
  if (!items || items.length === 0) {
    return (
      <p className="mt-10 text-center text-discogs-text-secondary">
        No items to display.
      </p>
    );
  }

  const discogsBaseUrl = 'https://www.discogs.com';

  return (
    <div className="grid animate-fade-in grid-cols-2 gap-4 p-4 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 2xl:grid-cols-8">
      {items.map((item, index) => {
        // Construct the URL to the specific release page on Discogs.
        const discogsUrl = `${discogsBaseUrl}/release/${item.basic_information.id}`;
        return (
          <div
            key={'instance_id' in item ? item.instance_id : item.id}
            className="animate-slide-up"
            style={{ animationDelay: `${index * 20}ms` }}
          >
            <AlbumCard
              title={item.basic_information.title}
              artist={getArtistName(item)}
              imageUrl={
                'master_cover_image' in item
                  ? item.master_cover_image
                  : item.basic_information.cover_image
              }
              discogsUrl={discogsUrl}
            />
          </div>
        );
      })}
    </div>
  );
};

export default Grid;
