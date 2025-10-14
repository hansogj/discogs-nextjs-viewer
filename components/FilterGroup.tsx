'use client';

import React, { useState } from 'react';
import clsx from 'clsx';

interface FilterGroupProps {
  title: string;
  children: React.ReactNode;
  onClear: () => void;
  selectedCount: number;
  defaultOpen?: boolean;
}

const FilterGroup: React.FC<FilterGroupProps> = ({
  title,
  children,
  onClear,
  selectedCount,
  defaultOpen = false,
}) => {
  const [isOpen, setIsOpen] = useState(defaultOpen);

  return (
    <div className="border-b border-discogs-border pb-4">
      <button
        className="flex w-full items-center justify-between text-left"
        onClick={() => setIsOpen(!isOpen)}
        aria-expanded={isOpen}
      >
        <div className="flex items-center">
          <h3 className="font-semibold text-white">{title}</h3>
          {selectedCount > 0 && (
            <span className="ml-2 flex h-5 w-5 items-center justify-center rounded-full bg-discogs-blue text-xs font-bold text-white">
              {selectedCount}
            </span>
          )}
        </div>
        <div className="flex items-center">
          {selectedCount > 0 && (
            <span
              onClick={(e) => {
                e.stopPropagation();
                onClear();
              }}
              className="mr-2 text-xs text-discogs-blue hover:underline"
            >
              Clear
            </span>
          )}
          <svg
            xmlns="http://www.w3.org/2000/svg"
            className={clsx(
              'h-5 w-5 text-discogs-text-secondary transition-transform',
              { 'rotate-180': !isOpen },
            )}
            viewBox="0 0 20 20"
            fill="currentColor"
          >
            <path
              fillRule="evenodd"
              d="M5.293 7.293a1 1 0 011.414 0L10 10.586l3.293-3.293a1 1 0 111.414 1.414l-4 4a1 1 0 01-1.414 0l-4-4a1 1 0 010-1.414z"
              clipRule="evenodd"
            />
          </svg>
        </div>
      </button>
      {isOpen && (
        <div className="mt-3 space-y-2 max-h-60 overflow-y-auto pr-2">
          {children}
        </div>
      )}
    </div>
  );
};

export default FilterGroup;
