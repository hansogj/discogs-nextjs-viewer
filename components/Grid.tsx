import React from 'react';
import type { CollectionRelease, ProcessedWantlistItem } from '@/lib/types';
import AlbumCard from './AlbumCard';

interface GridProps {
  items: (CollectionRelease | ProcessedWantlistItem)[];
}

const getArtistName = (item: CollectionRelease | ProcessedWantlistItem): string => {
    return item.basic_information.artists?.[0]?.name || 'Unknown Artist';
};

const Grid: React.FC<GridProps> = ({ items }) => {
  if (!items || items.length === 0) {
    return <p className="text-center text-discogs-text-secondary mt-10">No items to display.</p>;
  }

  return (
    <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 2xl:grid-cols-8 gap-4 p-4 animate-fade-in">
      {items.map((item, index) => (
        <div key={'instance_id' in item ? item.instance_id : item.id} className="animate-slide-up" style={{ animationDelay: `${index * 20}ms`}}>
          <AlbumCard
            title={item.basic_information.title}
            artist={getArtistName(item)}
            imageUrl={'master_cover_image' in item ? item.master_cover_image : item.basic_information.cover_image}
          />
        </div>
      ))}
    </div>
  );
};

export default Grid;
