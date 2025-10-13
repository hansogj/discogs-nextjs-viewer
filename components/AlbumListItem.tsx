import React from 'react';
import Image from 'next/image';
import type {
  CollectionRelease,
  ProcessedWantlistItem,
  BasicInformation,
} from '@/lib/types';

const PLACEHOLDER_IMAGE_URL =
  "data:image/svg+xml,%3csvg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 100 100' fill='none'%3e%3crect width='100' height='100' fill='%231d1f24'/%3e%3ccircle cx='50' cy='50' r='35' stroke='%232f323a' stroke-width='4'/%3e%3ccircle cx='50' cy='50' r='10' fill='%23101114' stroke='%232f323a' stroke-width='2'/%3e%3cpath d='M45 55 a5,5 0 0,1 10,0 l0,-20 a5,5 0 0,1 5,-5 a5,5 0 0,1 5,5' stroke='%23a0a0a0' stroke-width='3'/%3e%3ccircle cx='47.5' cy='55' r='4' fill='%23a0a0a0'/%3e%3ccircle cx='62.5' cy='40' r='4' fill='%23a0a0a0'/%3e%3c/svg%3e";

const getArtistName = (
  item: CollectionRelease | ProcessedWantlistItem,
): string => {
  return item.basic_information.artists?.[0]?.name || 'Unknown Artist';
};

const formatMedia = (formats: BasicInformation['formats']): string => {
  if (!formats || formats.length === 0) return 'N/A';
  const format = formats[0];
  let desc = format.name;
  if (format.descriptions && format.descriptions.length > 0) {
    desc += `, ${format.descriptions.join(', ')}`;
  }
  return desc;
};

type Item = CollectionRelease | ProcessedWantlistItem;

interface AlbumListItemProps {
  item: Item;
}

const DetailItem: React.FC<{
  label: string;
  value: string | number | undefined;
}> = ({ label, value }) => {
  if (!value || value === 'N/A') return null;
  return (
    <div>
      <p className="text-xs font-semibold text-discogs-text-secondary">
        {label}
      </p>
      <p className="truncate text-sm text-discogs-text">{value}</p>
    </div>
  );
};

const AlbumListItem: React.FC<AlbumListItemProps> = ({ item }) => {
  const { basic_information: info } = item;
  const discogsUrl = `https://www.discogs.com/release/${info.id}`;
  const imageUrl =
    'master_cover_image' in item ? item.master_cover_image : info.cover_image;

  const labelInfo = info.labels?.[0];
  const labelParts = [labelInfo?.name, labelInfo?.catno].filter(Boolean);
  const labelString = labelParts.length > 0 ? labelParts.join(' - ') : undefined;

  return (
    <div className="flex space-x-4 rounded-lg border border-discogs-border/50 bg-discogs-bg p-3 transition-colors hover:bg-discogs-border/30">
      <a
        href={discogsUrl}
        target="_blank"
        rel="noopener noreferrer"
        className="block flex-shrink-0"
      >
        <Image
          src={imageUrl || PLACEHOLDER_IMAGE_URL}
          alt={`${getArtistName(item)} - ${info.title}`}
          width={96}
          height={96}
          className="aspect-square w-24 rounded-md object-cover shadow-md transition-transform duration-300 hover:scale-105"
          placeholder="blur"
          blurDataURL={PLACEHOLDER_IMAGE_URL}
        />
      </a>
      <div className="flex min-w-0 flex-grow flex-col justify-between py-1">
        <div>
          <a
            href={discogsUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="group"
          >
            <h3 className="truncate text-base font-bold text-white group-hover:text-discogs-blue group-hover:underline">
              {info.title}
            </h3>
            <p className="truncate text-sm text-discogs-text-secondary">
              {getArtistName(item)}
            </p>
          </a>
        </div>
        <div className="mt-2 grid grid-cols-2 gap-x-4 gap-y-1 sm:grid-cols-3 md:grid-cols-4">
          <DetailItem label="Label" value={labelString} />
          <DetailItem label="Format" value={formatMedia(info.formats)} />
          <DetailItem label="Year" value={info.year || undefined} />
          {'date_added' in item && (
            <DetailItem
              label="Added"
              value={new Date(item.date_added).toLocaleDateString()}
            />
          )}
          {'folder_id' in item && (
            <DetailItem label="Folder ID" value={item.folder_id} />
          )}
        </div>
      </div>
    </div>
  );
};

export default AlbumListItem;
