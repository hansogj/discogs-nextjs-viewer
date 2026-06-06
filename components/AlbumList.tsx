import React from 'react';
import type {
  CollectionRelease,
  ProcessedWantlistItem,
  Folder,
} from '@/lib/types';
import AlbumListItem from './AlbumListItem';

interface AlbumListProps {
  items: (CollectionRelease | ProcessedWantlistItem)[];
  folders: Folder[];
  expandedItemId?: number | null;
  onToggleExpand?: (id: number) => void;
  finnCounts?: Map<number, number | null>;
}

const AlbumList: React.FC<AlbumListProps> = ({
  items,
  folders,
  expandedItemId,
  onToggleExpand,
  finnCounts,
}) => {
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
          id={`wantlist-item-${item.id}`}
          className="animate-slide-up"
          style={{ animationDelay: `${index * 20}ms` }}
        >
          <AlbumListItem
            item={item}
            folders={folders}
            isExpanded={expandedItemId === item.id}
            onToggle={
              onToggleExpand ? () => onToggleExpand(item.id) : undefined
            }
            badgeCount={finnCounts?.get(item.id)}
          />
        </div>
      ))}
    </div>
  );
};

export default AlbumList;