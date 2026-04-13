'use client';

import React, { useMemo } from 'react';
import type {
  CollectionRelease,
  ProcessedWantlistItem,
  Folder,
  CustomField,
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
    composers: Set<string>;
    customFields: Record<string, Set<string>>;
  };
  onFilterChange: (
    type: string,
    value: string | number,
    checked: boolean,
  ) => void;
  onFilterClear: (type: string) => void;
  customFields: CustomField[];
}

const FilterSidebar: React.FC<FilterSidebarProps> = ({
  items,
  folders,
  activeFilters,
  onFilterChange,
  onFilterClear,
  customFields,
}) => {
  const filterData = useMemo(() => {
    const artists = new Map<string, number>();
    const formats = new Map<string, number>();
    const years = new Map<string, number>();
    const itemFolders = new Map<number, number>();
    const composers = new Map<string, number>();
    const customFieldValues: Record<string, Map<string, number>> = {};

    if (customFields) {
      for (const field of customFields) {
        if (field.type === 'dropdown') {
          customFieldValues[field.name] = new Map<string, number>();
        }
      }
    }

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
        const yearString = String(year); // Convert to string
        years.set(yearString, (years.get(yearString) || 0) + 1);
      }
      if ('folder_id' in item) {
        itemFolders.set(
          item.folder_id,
          (itemFolders.get(item.folder_id) || 0) + 1,
        );
      }
      if (item.details?.extraartists) {
        for (const artist of item.details.extraartists) {
          if (artist.role === 'Composed By') {
            composers.set(artist.name, (composers.get(artist.name) || 0) + 1);
          }
        }
      }
      if (customFields) {
        for (const field of customFields) {
          if (field.type === 'dropdown') {
            const note = (item as CollectionRelease).notes?.find(
              (n) => n.field_id === field.id,
            );
            if (note) {
              const map = customFieldValues[field.name];
              const value = note.value.trim();
              map.set(value, (map.get(value) || 0) + 1);
            }
          }
        }
      }
    }

    const sortedArtists = Array.from(artists.entries()).sort((a, b) =>
      a[0].localeCompare(b[0]),
    );
    const sortedFormats = Array.from(formats.entries()).sort((a, b) =>
      a[0].localeCompare(b[0]),
    );
    const sortedYears = Array.from(years.entries()).sort((a, b) => parseInt(b[0]) - parseInt(a[0])); // Descending year
    const sortedComposers = Array.from(composers.entries()).sort((a, b) =>
      a[0].localeCompare(b[0]),
    );
    const sortedCustomFields: Record<string, [string, number][]> = {};
    for (const fieldName in customFieldValues) {
      sortedCustomFields[fieldName] = Array.from(
        customFieldValues[fieldName].entries(),
      ).sort((a, b) => a[0].localeCompare(b[0]));
    }

    const folderMap = new Map(folders.map((f) => [f.id, f.name]));
    const sortedFolders = Array.from(itemFolders.entries())
      .map(([id, count]) => {
        let name = folderMap.get(id);
        if (id === 1 || name === '*') {
          name = 'Uncategorized';
        }
        return {
          id,
          name: name || `Folder ${id}`,
          count,
        };
      })
      .sort((a, b) => a.name.localeCompare(b.name));

    const result = {
      artists: sortedArtists,
      formats: sortedFormats,
      years: sortedYears,
      folders: sortedFolders,
      composers: sortedComposers,
      customFields: sortedCustomFields,
    };
    return result;
  }, [items, folders, customFields]);

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

      {filterData.composers.length > 0 && (
        <FilterGroup
          title="Composer"
          onClear={() => onFilterClear('composers')}
          selectedCount={activeFilters.composers.size}
        >
          {filterData.composers.map(([name, count]) => (
            <FilterCheckbox
              key={name}
              id={`composer-${name}`}
              label={name}
              count={count}
              checked={activeFilters.composers.has(name)}
              onChange={(e) =>
                onFilterChange('composers', name, e.target.checked)
              }
            />
          ))}
        </FilterGroup>
      )}

      {customFields && customFields.map((field) =>
        field.type === 'dropdown' &&
        filterData.customFields[field.name]?.length > 0 ? (
          <FilterGroup
            key={field.id}
            title={field.name}
            onClear={() => onFilterClear(field.name)}
            selectedCount={activeFilters.customFields[field.name]?.size || 0}
          >
            {filterData.customFields[field.name].map(([name, count]) => (
              <FilterCheckbox
                key={name}
                id={`custom-${field.id}-${name}`}
                label={name}
                count={count}
                checked={
                  activeFilters.customFields[field.name]?.has(name) || false
                }
                onChange={(e) =>
                  onFilterChange(field.name, name, e.target.checked)
                }
              />
            ))}
          </FilterGroup>
        ) : null,
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
              checked={activeFilters.years.has(parseInt(year, 10))}
              onChange={(e) =>
                onFilterChange('years', parseInt(year, 10), e.target.checked)
              }
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