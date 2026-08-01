"use client";

import React from "react";
import { useTranslations } from "next-intl";
import type { ProcessedWantlistItem } from "@/lib/types";

interface WantlistItemDetailProps {
  item: ProcessedWantlistItem;
}

const buildDiscogsUrl = (item: ProcessedWantlistItem): string => {
  const masterId = item.basic_information.master_id;
  if (masterId && masterId > 0) {
    return `https://www.discogs.com/master/${masterId}`;
  }
  return `https://www.discogs.com/release/${item.basic_information.id}`;
};

const WantlistItemDetail: React.FC<WantlistItemDetailProps> = ({ item }) => {
  const tCommon = useTranslations("common");
  const tAlbum = useTranslations("album");
  const { basic_information: info } = item;
  const artist = info.artists?.[0]?.name || tCommon("unknownArtist");
  const discogsUrl = buildDiscogsUrl(item);

  const year = item.master_year || info.year || null;
  const label = info.labels?.[0];
  const genres = item.details?.genres;
  const styles = item.details?.styles;

  return (
    <div className="flex flex-col gap-4 rounded-lg border border-discogs-border bg-discogs-bg-light p-5 sm:flex-row">
      <div className="flex-1 space-y-3">
        <div>
          <h4 className="text-lg font-bold text-discogs-text">{info.title}</h4>
          <p className="text-sm text-discogs-text-secondary">{artist}</p>
        </div>

        {(year || label || genres || styles) && (
          <div className="flex flex-wrap gap-x-6 gap-y-1 text-sm text-discogs-text-secondary">
            {year && (
              <span>
                {tAlbum("yearPrefix")} {year}
              </span>
            )}
            {label && (
              <span>
                {label.name}
                {label.catno ? ` - ${label.catno}` : ""}
              </span>
            )}
            {genres && genres.length > 0 && <span>{genres.join(", ")}</span>}
            {styles && styles.length > 0 && <span>{styles.join(", ")}</span>}
          </div>
        )}

        <div className="flex flex-wrap gap-3 pt-1">
          <a
            href={discogsUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center gap-2 rounded-md bg-discogs-border px-4 py-2 text-sm font-medium text-discogs-text transition-colors hover:bg-discogs-blue hover:text-white"
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
            {tCommon("viewOnDiscogs")}
          </a>
        </div>
      </div>
    </div>
  );
};

export default WantlistItemDetail;
