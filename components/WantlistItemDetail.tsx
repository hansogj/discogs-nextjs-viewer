'use client';

import React, { useEffect, useState } from 'react';
import type { ProcessedWantlistItem } from '@/lib/types';

interface WantlistItemDetailProps {
  item: ProcessedWantlistItem;
}

const buildFinnSearchQuery = (artist: string, title: string): string => {
  return `${artist} ${title} vinyl`;
};

const buildFinnSearchUrl = (query: string): string => {
  return `https://www.finn.no/recommerce/forsale/search?q=${encodeURIComponent(query)}`;
};

const buildDiscogsUrl = (item: ProcessedWantlistItem): string => {
  const masterId = item.basic_information.master_id;
  if (masterId && masterId > 0) {
    return `https://www.discogs.com/master/${masterId}`;
  }
  return `https://www.discogs.com/release/${item.basic_information.id}`;
};

const WantlistItemDetail: React.FC<WantlistItemDetailProps> = ({ item }) => {
  const { basic_information: info } = item;
  const artist = info.artists?.[0]?.name || 'Unknown Artist';
  const discogsUrl = buildDiscogsUrl(item);
  const finnQuery = buildFinnSearchQuery(artist, info.title);
  const finnUrl = buildFinnSearchUrl(finnQuery);

  const [finnCount, setFinnCount] = useState<number | null>(null);
  const [finnLoading, setFinnLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;
    setFinnLoading(true);
    fetch(`/api/finn-search?q=${encodeURIComponent(finnQuery)}`)
      .then((res) => res.json())
      .then((data) => {
        if (!cancelled) {
          setFinnCount(data.count);
          setFinnLoading(false);
        }
      })
      .catch(() => {
        if (!cancelled) setFinnLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [finnQuery]);

  const year = item.master_year || info.year || null;
  const label = info.labels?.[0];
  const genres = item.details?.genres;
  const styles = item.details?.styles;

  const finnLabel = finnLoading
    ? 'Search on Finn.no\u2026'
    : finnCount !== null
      ? `Search on Finn.no: ${finnCount} ${finnCount === 1 ? 'hit' : 'hits'}`
      : 'Search on Finn.no';

  return (
    <div className="flex flex-col gap-4 rounded-lg border border-discogs-border bg-discogs-bg-light p-5 sm:flex-row">
      <div className="flex-1 space-y-3">
        <div>
          <h4 className="text-lg font-bold text-white">{info.title}</h4>
          <p className="text-sm text-discogs-text-secondary">{artist}</p>
        </div>

        {(year || label || genres || styles) && (
          <div className="flex flex-wrap gap-x-6 gap-y-1 text-sm text-discogs-text-secondary">
            {year && <span>Year: {year}</span>}
            {label && (
              <span>
                {label.name}
                {label.catno ? ` - ${label.catno}` : ''}
              </span>
            )}
            {genres && genres.length > 0 && <span>{genres.join(', ')}</span>}
            {styles && styles.length > 0 && <span>{styles.join(', ')}</span>}
          </div>
        )}

        <div className="flex flex-wrap gap-3 pt-1">
          <a
            href={discogsUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center gap-2 rounded-md bg-discogs-border px-4 py-2 text-sm font-medium text-white transition-colors hover:bg-discogs-blue"
          >
            <svg
              className="h-4 w-4"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14"
              />
            </svg>
            View on Discogs
          </a>
          <a
            href={finnUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center gap-2 rounded-md bg-blue-700 px-4 py-2 text-sm font-medium text-white transition-colors hover:bg-blue-600"
          >
            <svg
              className="h-4 w-4"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z"
              />
            </svg>
            {finnLabel}
          </a>
        </div>
      </div>
    </div>
  );
};

export default WantlistItemDetail;
