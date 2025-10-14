'use client';

import React, { useMemo } from 'react';
import type {
  CollectionRelease,
  ProcessedWantlistItem,
  Folder,
} from '@/lib/types';
import FilterGroup from './FilterGroup';

type Item = CollectionRelease | ProcessedWantlistItem;

interface FilterSidebarProps {
  items: Item[];
  folders: Folder[];
  activeFilters: {
    artists: Set<string>;
    formats: Set<string>;
    years: Set<number>;
    folders: Set<number>;
  };
  onFilterChange: (
    type: 'artists' | 'formats' | 'years' | 'folders',
    value: string | number,
    checked: boolean,
  ) => void;
  onFilterClear: (
    type: 'artists' | 'formats' | 'years' | 'folders' | 'all',
  ) => void;
}

const FilterSidebar: React.FC<FilterSidebarProps> = ({
  items,
  folders,
  activeFilters,
  onFilterChange,
  onFilterClear,
}) => {
  const filterData = useMemo(() => {
    const artists = new Map<string, number>();
    const formats = new Map<string, number>();
    const years = new Map<number, number>();
    const itemFolders = new Map<number, number>();

    for (const item of items) {
      const artistName = item.basic_information.artists?.[0]?.name;
      if (artistName) {
        artists.set(artistName, (artists.get(artistName) || 0) + 1);
      }
      const formatName = item.basic_information.formats?.[0]?.name;
      if (formatName) {
        formats.set(formatName, (formats.get(formatName) || 0) + 1);
      }
      const year =
        'master_year' in item && item.master_year
          ? item.master_year
          : item.basic_information.year;
      if (year) {
        years.set(year, (years.get(year) || 0) + 1);
      }
      if ('folder_id' in item) {
        itemFolders.set(
          item.folder_id,
          (itemFolders.get(item.folder_id) || 0) + 1,
        );
      }
    }

    const sortedArtists = Array.from(artists.entries()).sort((a, b) =>
      a[0].localeCompare(b[0]),
    );
    const sortedFormats = Array.from(formats.entries()).sort((a, b) =>
      a[0].localeCompare(b[0]),
    );
    const sortedYears = Array.from(years.entries()).sort((a, b) => b[0] - a[0]); // Descending year

    const folderMap = new Map(folders.map((f) => [f.id, f.name]));
    const sortedFolders = Array.from(itemFolders.entries())
      .map(([id, count]) => ({
        id,
        name: folderMap.get(id) || `Folder ${id}`,
        count,
      }))
      .sort((a, b) => a.name.localeCompare(b.name));

    return {
      artists: sortedArtists,
      formats: sortedFormats,
      years: sortedYears,
      folders: sortedFolders,
    };
  }, [items, folders]);

  return (
    <div className="sticky top-24 space-y-4">
      <div className="flex items-center justify-between">
        <h2 className="text-lg font-semibold text-white">Filters</h2>
        <button
          onClick={() => onFilterClear('all')}
          className="text-sm text-discogs-blue hover:underline"
        >
          Clear All
        </button>
      </div>

      {filterData.artists.length > 0 && (
        <FilterGroup
          title="Artist"
          onClear={() => onFilterClear('artists')}
          selectedCount={activeFilters.artists.size}
          defaultOpen={true}
        >
          {filterData.artists.map(([name, count]) => (
            <FilterCheckbox
              key={name}
              id={`artist-${name}`}
              label={name}
              count={count}
              checked={activeFilters.artists.has(name)}
              onChange={(e) =>
                onFilterChange('artists', name, e.target.checked)
              }
            />
          ))}
        </FilterGroup>
      )}

      {filterData.formats.length > 0 && (
        <FilterGroup
          title="Format"
          onClear={() => onFilterClear('formats')}
          selectedCount={activeFilters.formats.size}
        >
          {filterData.formats.map(([name, count]) => (
            <FilterCheckbox
              key={name}
              id={`format-${name}`}
              label={name}
              count={count}
              checked={activeFilters.formats.has(name)}
              onChange={(e) =>
                onFilterChange('formats', name, e.target.checked)
              }
            />
          ))}
        </FilterGroup>
      )}

      {filterData.years.length > 0 && (
        <FilterGroup
          title="Year"
          onClear={() => onFilterClear('years')}
          selectedCount={activeFilters.years.size}
        >
          {filterData.years.map(([year, count]) => (
            <FilterCheckbox
              key={year}
              id={`year-${year}`}
              label={String(year)}
              count={count}
              checked={activeFilters.years.has(year)}
              onChange={(e) => onFilterChange('years', year, e.target.checked)}
            />
          ))}
        </FilterGroup>
      )}

      {folders.length > 0 && filterData.folders.length > 0 && (
        <FilterGroup
          title="Folder"
          onClear={() => onFilterClear('folders')}
          selectedCount={activeFilters.folders.size}
        >
          {filterData.folders.map(({ id, name, count }) => (
            <FilterCheckbox
              key={id}
              id={`folder-${id}`}
              label={name}
              count={count}
              checked={activeFilters.folders.has(id)}
              onChange={(e) => onFilterChange('folders', id, e.target.checked)}
            />
          ))}
        </FilterGroup>
      )}
    </div>
  );
};

const FilterCheckbox: React.FC<{
  id: string;
  label: string;
  count: number;
  checked: boolean;
  onChange: (e: React.ChangeEvent<HTMLInputElement>) => void;
}> = ({ id, label, count, checked, onChange }) => (
  <div className="flex items-center justify-between">
    <label
      htmlFor={id}
      className="flex cursor-pointer items-center space-x-2 text-sm text-discogs-text"
    >
      <input
        id={id}
        type="checkbox"
        checked={checked}
        onChange={onChange}
        className="h-4 w-4 rounded border-gray-500 bg-gray-700 text-discogs-blue focus:ring-discogs-blue"
      />
      <span className="truncate" title={label}>
        {label}
      </span>
    </label>
    <span className="text-xs text-discogs-text-secondary">{count}</span>
  </div>
);

export default FilterSidebar;