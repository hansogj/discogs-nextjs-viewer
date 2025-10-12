'use client';

import React from 'react';
import clsx from 'clsx';

export type SortKey = 'date_added' | 'title' | 'year' | 'artist';
export type SortOrder = 'asc' | 'desc';

interface SortControlsProps {
  sortKey: SortKey;
  sortOrder: SortOrder;
  onSortKeyChange: (key: SortKey) => void;
  onSortOrderChange: () => void;
}

const SORT_OPTIONS: { key: SortKey; label: string }[] = [
  { key: 'title', label: 'Title' },
  { key: 'artist', label: 'Artist' },
  { key: 'year', label: 'Year' },
  { key: 'date_added', label: 'Date Added' },
];

const SortControls: React.FC<SortControlsProps> = ({ sortKey, sortOrder, onSortKeyChange, onSortOrderChange }) => {
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
        </div>
        <button
            onClick={onSortOrderChange}
            className={clsx(buttonBaseClasses, inactiveButtonClasses, "flex items-center space-x-2")}
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
  );
};

export default SortControls;