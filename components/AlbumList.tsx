import React from 'react';
import type { CollectionRelease, ProcessedWantlistItem } from '@/lib/types';
import AlbumListItem from './AlbumListItem';

interface AlbumListProps {
  items: (CollectionRelease | ProcessedWantlistItem)[];
}

const AlbumList: React.FC<AlbumListProps> = ({ items }) => {
  if (!items || items.length === 0) {
    return (
      <p className="mt-10 text-center text-discogs-text-secondary">
        No items to display.
      </p>
    );
  }

  return (
    <div className="animate-fade-in space-y-3 p-4">
      {items.map((item, index) => (
        <div
          key={'instance_id' in item ? item.instance_id : item.id}
          className="animate-slide-up"
          style={{ animationDelay: `${index * 20}ms` }}
        >
          <AlbumListItem item={item} />
        </div>
      ))}
    </div>
  );
};

export default AlbumList;
