import React from "react";
import type { CollectionRelease, ProcessedWantlistItem } from "@/lib/types";
import AlbumCard from "./AlbumCard";
import WantlistItemDetail from "./WantlistItemDetail";

interface GridProps {
  items: (CollectionRelease | ProcessedWantlistItem)[];
  gridClassNames?: string;
  expandedItemId?: number | null;
  onToggleExpand?: (id: number) => void;
  finnCounts?: Map<number, number | null>;
}

const getArtistName = (
  item: CollectionRelease | ProcessedWantlistItem,
): string => {
  return item.basic_information.artists?.[0]?.name || "Unknown Artist";
};

const Grid: React.FC<GridProps> = ({
  items,
  gridClassNames,
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

  const discogsBaseUrl = "https://www.discogs.com";
  const defaultGridClasses =
    "grid animate-fade-in grid-cols-2 gap-4 p-4 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 2xl:grid-cols-8";

  return (
    <div className={gridClassNames || defaultGridClasses}>
      {items.map((item, index) => {
        const itemId = "instance_id" in item ? item.instance_id : item.id;
        const isExpanded = expandedItemId === item.id;
        const discogsUrl = `${discogsBaseUrl}/release/${item.basic_information.id}`;
        return (
          <React.Fragment key={itemId}>
            <div
              id={`wantlist-item-${item.id}`}
              className="animate-slide-up"
              style={{ animationDelay: `${index * 20}ms` }}
            >
              <AlbumCard
                title={item.basic_information.title}
                artist={getArtistName(item)}
                imageUrl={
                  "master_cover_image" in item
                    ? item.master_cover_image
                    : item.basic_information.cover_image
                }
                discogsUrl={discogsUrl}
                onClick={
                  onToggleExpand ? () => onToggleExpand(item.id) : undefined
                }
                isExpanded={isExpanded}
                badgeCount={finnCounts?.get(item.id)}
              />
            </div>
            {isExpanded && (
              <div className="col-span-full animate-fade-in">
                <WantlistItemDetail item={item as ProcessedWantlistItem} />
              </div>
            )}
          </React.Fragment>
        );
      })}
    </div>
  );
};

export default Grid;
