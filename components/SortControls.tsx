'use client';

import React from 'react';
import clsx from 'clsx';

export type SortKey = 'date_added' | 'title' | 'year' | 'artist';
export type SortOrder = 'asc' | 'desc';
export type View = 'grid' | 'list';

interface FilterOptions {
  isEnabled: boolean;
  onToggle: () => void;
  label: string;
}

interface SortControlsProps {
  sortKey: SortKey;
  sortOrder: SortOrder;
  onSortKeyChange: (key: SortKey) => void;
  onSortOrderChange: () => void;
  filterOptions?: FilterOptions;
  view: View;
  onViewChange: (view: View) => void;
  searchQuery: string;
  onSearchQueryChange: (query: string) => void;
  viewType: 'collection' | 'wantlist';
}

const SORT_OPTIONS: { key: SortKey; label: string }[] = [
  { key: 'title', label: 'Title' },
  { key: 'artist', label: 'Artist' },
  { key: 'year', label: 'Year' },
  { key: 'date_added', label: 'Date Added' },
];

const SortControls: React.FC<SortControlsProps> = ({
  sortKey,
  sortOrder,
  onSortKeyChange,
  onSortOrderChange,
  filterOptions,
  view,
  onViewChange,
  searchQuery,
  onSearchQueryChange,
  viewType,
}) => {
  const buttonBaseClasses =
    'focus:outline-none rounded-md px-4 py-2 text-sm font-medium transition-colors duration-200 focus:ring-2 focus:ring-offset-2 focus:ring-offset-discogs-bg focus:ring-discogs-blue';
  const activeButtonClasses = 'bg-discogs-blue text-white';
  const inactiveButtonClasses =
    'bg-discogs-bg-light text-discogs-text-secondary hover:bg-discogs-border';

  return (
    <div className="sticky top-[80px] z-40 flex flex-wrap items-center justify-between gap-4 border-b border-discogs-border bg-discogs-bg-light/80 p-4 backdrop-blur-sm">
      <div className="flex flex-1 flex-wrap items-center gap-x-6 gap-y-4">
        <div className="relative min-w-[250px] flex-1">
          <div className="pointer-events-none absolute inset-y-0 left-0 flex items-center pl-3">
            <svg
              xmlns="http://www.w3.org/2000/svg"
              className="h-5 w-5 text-discogs-text-secondary"
              viewBox="0 0 20 20"
              fill="currentColor"
            >
              <path
                fillRule="evenodd"
                d="M8 4a4 4 0 100 8 4 4 0 000-8zM2 8a6 6 0 1110.89 3.476l4.817 4.817a1 1 0 01-1.414 1.414l-4.816-4.816A6 6 0 012 8z"
                clipRule="evenodd"
              />
            </svg>
          </div>
          <input
            type="search"
            placeholder={`Search ${viewType}...`}
            value={searchQuery}
            onChange={(e) => onSearchQueryChange(e.target.value)}
            className="block w-full rounded-lg border border-discogs-border bg-discogs-bg p-2.5 pl-10 text-sm text-white placeholder-discogs-text-secondary/50 focus:border-discogs-blue focus:ring-discogs-blue"
          />
        </div>
        <div className="flex items-center space-x-2 rounded-lg border border-discogs-border/50 bg-discogs-bg p-1">
          <span className="hidden px-3 text-sm font-medium text-discogs-text-secondary sm:inline">
            Sort by:
          </span>
          {SORT_OPTIONS.map((option) => (
            <button
              key={option.key}
              onClick={() => onSortKeyChange(option.key)}
              className={clsx(buttonBaseClasses, {
                [activeButtonClasses]: sortKey === option.key,
                [inactiveButtonClasses]: sortKey !== option.key,
              })}
            >
              {option.label}
            </button>
          ))}
          <button
            onClick={onSortOrderChange}
            className={clsx(
              buttonBaseClasses,
              inactiveButtonClasses,
              'ml-2 flex items-center space-x-2',
            )}
            aria-label={`Sort order: ${
              sortOrder === 'asc' ? 'Ascending' : 'Descending'
            }`}
          >
            <span>{sortOrder === 'asc' ? 'Asc' : 'Desc'}</span>
            {sortOrder === 'asc' ? (
              <svg
                xmlns="http://www.w3.org/2000/svg"
                className="h-4 w-4"
                viewBox="0 0 20 20"
                fill="currentColor"
              >
                <path
                  fillRule="evenodd"
                  d="M14.707 12.707a1 1 0 01-1.414 0L10 9.414l-3.293 3.293a1 1 0 01-1.414-1.414l4-4a1 1 0 011.414 0l4 4a1 1 0 010 1.414z"
                  clipRule="evenodd"
                />
              </svg>
            ) : (
              <svg
                xmlns="http://www.w3.org/2000/svg"
                className="h-4 w-4"
                viewBox="0 0 20 20"
                fill="currentColor"
              >
                <path
                  fillRule="evenodd"
                  d="M5.293 7.293a1 1 0 011.414 0L10 10.586l3.293-3.293a1 1 0 111.414 1.414l-4 4a1 1 0 01-1.414 0l-4-4a1 1 0 010-1.414z"
                  clipRule="evenodd"
                />
              </svg>
            )}
          </button>
        </div>
      </div>
      <div className="flex items-center gap-4">
        {filterOptions && (
          <div className="flex items-center space-x-3">
            <label
              htmlFor="filter-toggle"
              className="cursor-pointer text-sm font-medium text-discogs-text-secondary"
            >
              {filterOptions.label}
            </label>
            <button
              id="filter-toggle"
              role="switch"
              aria-checked={filterOptions.isEnabled}
              onClick={filterOptions.onToggle}
              className={clsx(
                'relative inline-flex h-6 w-11 flex-shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-none focus:ring-2 focus:ring-discogs-blue focus:ring-offset-2 focus:ring-offset-discogs-bg-light',
                filterOptions.isEnabled
                  ? 'bg-discogs-blue'
                  : 'bg-discogs-border',
              )}
            >
              <span
                aria-hidden="true"
                className={clsx(
                  'pointer-events-none inline-block h-5 w-5 transform rounded-full bg-white shadow ring-0 transition duration-200 ease-in-out',
                  filterOptions.isEnabled ? 'translate-x-5' : 'translate-x-0',
                )}
              />
            </button>
          </div>
        )}
        <div className="flex items-center space-x-2 rounded-lg border border-discogs-border/50 bg-discogs-bg p-1">
          <button
            onClick={() => onViewChange('grid')}
            aria-pressed={view === 'grid'}
            className={clsx(
              'rounded-md p-2 transition-colors focus:outline-none focus:ring-2 focus:ring-discogs-blue focus:ring-offset-2 focus:ring-offset-discogs-bg',
              view === 'grid'
                ? 'bg-discogs-blue text-white'
                : 'text-discogs-text-secondary hover:bg-discogs-border',
            )}
            aria-label="Grid View"
          >
            <svg
              xmlns="http://www.w3.org/2000/svg"
              className="h-5 w-5"
              viewBox="0 0 20 20"
              fill="currentColor"
            >
              <path d="M5 3a2 2 0 00-2 2v2a2 2 0 002 2h2a2 2 0 002-2V5a2 2 0 00-2-2H5zM5 11a2 2 0 00-2 2v2a2 2 0 002 2h2a2 2 0 002-2v-2a2 2 0 00-2-2H5zM11 5a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2h-2a2 2 0 01-2-2V5zM11 13a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2h-2a2 2 0 01-2-2v-2z" />
            </svg>
          </button>
          <button
            onClick={() => onViewChange('list')}
            aria-pressed={view === 'list'}
            className={clsx(
              'rounded-md p-2 transition-colors focus:outline-none focus:ring-2 focus:ring-discogs-blue focus:ring-offset-2 focus:ring-offset-discogs-bg',
              view === 'list'
                ? 'bg-discogs-blue text-white'
                : 'text-discogs-text-secondary hover:bg-discogs-border',
            )}
            aria-label="List View"
          >
            <svg
              xmlns="http://www.w3.org/2000/svg"
              className="h-5 w-5"
              viewBox="0 0 20 20"
              fill="currentColor"
            >
              <path
                fillRule="evenodd"
                d="M3 4a1 1 0 011-1h12a1 1 0 110 2H4a1 1 0 01-1-1zm0 4a1 1 0 011-1h12a1 1 0 110 2H4a1 1 0 01-1-1zm0 4a1 1 0 011-1h12a1 1 0 110 2H4a1 1 0 01-1-1zm0 4a1 1 0 011-1h12a1 1 0 110 2H4a1 1 0 01-1-1z"
                clipRule="evenodd"
              />
            </svg>
          </button>
        </div>
      </div>
    </div>
  );
};

export default SortControls;
