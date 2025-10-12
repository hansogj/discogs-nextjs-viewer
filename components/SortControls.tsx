'use client';

import React from 'react';
import clsx from 'clsx';

export type SortKey = 'date_added' | 'title' | 'year' | 'artist';
export type SortOrder = 'asc' | 'desc';

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
}

const SORT_OPTIONS: { key: SortKey; label: string }[] = [
  { key: 'title', label: 'Title' },
  { key: 'artist', label: 'Artist' },
  { key: 'year', label: 'Year' },
  { key: 'date_added', label: 'Date Added' },
];

const SortControls: React.FC<SortControlsProps> = ({ sortKey, sortOrder, onSortKeyChange, onSortOrderChange, filterOptions }) => {
  const buttonBaseClasses = "px-4 py-2 text-sm font-medium rounded-md transition-colors duration-200 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-offset-discogs-bg focus:ring-discogs-blue";
  const activeButtonClasses = "bg-discogs-blue text-white";
  const inactiveButtonClasses = "bg-discogs-bg-light text-discogs-text-secondary hover:bg-discogs-border";

  return (
    <div className="p-4 flex justify-between items-center bg-discogs-bg-light/80 border-b border-discogs-border sticky top-[80px] z-40 backdrop-blur-sm">
        <div className="flex items-center space-x-2 bg-discogs-bg p-1 rounded-lg border border-discogs-border/50">
            <span className="text-sm font-medium text-discogs-text-secondary px-3">Sort by:</span>
            {SORT_OPTIONS.map(option => (
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
                className={clsx(buttonBaseClasses, inactiveButtonClasses, "flex items-center space-x-2 ml-2")}
                aria-label={`Sort order: ${sortOrder === 'asc' ? 'Ascending' : 'Descending'}`}
            >
                <span>{sortOrder === 'asc' ? 'Asc' : 'Desc'}</span>
                {sortOrder === 'asc' ? (
                    <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" viewBox="0 0 20 20" fill="currentColor">
                        <path fillRule="evenodd" d="M14.707 12.707a1 1 0 01-1.414 0L10 9.414l-3.293 3.293a1 1 0 01-1.414-1.414l4-4a1 1 0 011.414 0l4 4a1 1 0 010 1.414z" clipRule="evenodd" />
                    </svg>
                ) : (
                    <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" viewBox="0 0 20 20" fill="currentColor">
                        <path fillRule="evenodd" d="M5.293 7.293a1 1 0 011.414 0L10 10.586l3.293-3.293a1 1 0 111.414 1.414l-4 4a1 1 0 01-1.414 0l-4-4a1 1 0 010-1.414z" clipRule="evenodd" />
                    </svg>
                )}
            </button>
        </div>
        {filterOptions && (
             <div className="flex items-center space-x-3">
                <label htmlFor="filter-toggle" className="text-sm font-medium text-discogs-text-secondary cursor-pointer">{filterOptions.label}</label>
                <button
                    id="filter-toggle"
                    role="switch"
                    aria-checked={filterOptions.isEnabled}
                    onClick={filterOptions.onToggle}
                    className={clsx(
                    "relative inline-flex h-6 w-11 flex-shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-none focus:ring-2 focus:ring-discogs-blue focus:ring-offset-2 focus:ring-offset-discogs-bg-light",
                    filterOptions.isEnabled ? 'bg-discogs-blue' : 'bg-discogs-border'
                    )}
                >
                    <span
                    aria-hidden="true"
                    className={clsx(
                        "pointer-events-none inline-block h-5 w-5 transform rounded-full bg-white shadow ring-0 transition duration-200 ease-in-out",
                        filterOptions.isEnabled ? 'translate-x-5' : 'translate-x-0'
                    )}
                    />
                </button>
            </div>
        )}
    </div>
  );
};

export default SortControls;
