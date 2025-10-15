
'use client';

import React, { useState, useEffect } from 'react';
import Image from 'next/image';
import Spinner from './Spinner';
import { getRandomQuote } from '@/lib/quotes';
import type { DiscogsUser } from '@/lib/types';
import type { SyncProgress } from '@/lib/cache';
import type { Quote } from '@/lib/quotes';

const PLACEHOLDER_AVATAR_URL =
  "data:image/svg+xml,%3csvg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 100 100' fill='none'%3e%3crect width='100' height='100' fill='%231d1f24'/%3e%3ccircle cx='50' cy='40' r='15' fill='%23a0a0a0'/%3e%3cpath d='M25,90 A30,30 0 0,1 75,90 Z' fill='%23a0a0a0'/%3e%3c/svg%3e";

interface SyncModalProps {
  isOpen: boolean;
  user: DiscogsUser | null;
  progress: SyncProgress | null;
}

const SyncModal: React.FC<SyncModalProps> = ({ isOpen, user, progress }) => {
  const [quote, setQuote] = useState<Quote>(getRandomQuote());

  useEffect(() => {
    if (isOpen) {
      setQuote(getRandomQuote()); // Set initial quote when opened
      const intervalId = setInterval(() => {
        setQuote(getRandomQuote());
      }, 10000); // Change quote every 10 seconds

      return () => clearInterval(intervalId); // Cleanup on close
    }
  }, [isOpen]);

  if (!isOpen) {
    return null;
  }

  const avatarUrl = user?.avatar_url || PLACEHOLDER_AVATAR_URL;

  let message = 'Syncing with Discogs...';
  let subMessage = 'This may take a few moments.';

  if (progress) {
    switch (progress.status) {
      case 'starting':
        message = 'Initiating Sync...';
        subMessage = 'Getting ready to fetch your data.';
        break;
      case 'fetching':
        const resourceName =
          progress.resource === 'collection' ? 'Collection' : 'Wantlist';
        message = `Fetching ${resourceName}...`;
        if (progress.page && progress.pages && progress.pages > 1) {
          subMessage = `Page ${progress.page} of ${progress.pages}`;
        } else {
          subMessage = 'Getting page information...';
        }
        break;
      case 'processing':
        if (progress.resource?.endsWith('_details')) {
          const resource =
            progress.resource === 'collection_details'
              ? 'Collection'
              : 'Wantlist';
          message = `Fetching Details for ${resource}...`;
          if (progress.processed && progress.total) {
            subMessage = `${progress.processed} of ${progress.total} releases`;
          } else {
            subMessage = 'This may take a while for large libraries...';
          }
        } else if (progress.resource === 'collection_masters') {
          message = 'Processing Collection...';
          if (progress.processed && progress.total) {
            subMessage = `Getting master release year ${progress.processed} of ${progress.total}`;
          } else {
            subMessage = 'Fetching master release years...';
          }
        } else {
          message = 'Processing Data...';
          subMessage = 'Fetching cover art for your wantlist.';
        }
        break;
      case 'caching':
        message = 'Finalizing...';
        subMessage = 'Saving your data locally for super-fast access.';
        break;
      case 'error':
        message = 'An Error Occurred';
        subMessage = progress.message || 'Please try again.';
        break;
    }
  }

  return (
    <div
      className="fixed inset-0 z-[100] flex animate-fade-in items-center justify-center bg-black/70 backdrop-blur-sm"
      aria-modal="true"
      role="dialog"
    >
      <div className="relative w-full max-w-md animate-slide-up rounded-xl border border-discogs-border bg-discogs-bg-light p-8 text-center shadow-2xl">
        {user && (
          <div className="absolute top-4 right-4 flex items-center space-x-3">
            <div className="text-right">
              <p className="truncate text-sm font-semibold text-white">
                {user.username}
              </p>
            </div>
            <Image
              src={avatarUrl}
              alt={user.username}
              width={40}
              height={40}
              className="h-10 w-10 rounded-full border-2 border-discogs-blue"
            />
          </div>
        )}

        <div className={user ? 'mt-12' : ''}>
          <div className="mx-auto mb-4 h-8 w-8">
            <Spinner size="md" />
          </div>
          <h2 className="mb-2 text-xl font-bold text-white">{message}</h2>
          <p className="mb-6 text-discogs-text-secondary">{subMessage}</p>
          <blockquote className="flex min-h-[80px] flex-col items-center justify-center border-l-4 border-discogs-blue p-4 italic text-discogs-text-secondary">
            <p>"{quote.quote}"</p>
            <cite className="mt-2 block w-full text-right text-sm not-italic text-discogs-text-secondary/80">
              &mdash; {quote.author}
            </cite>
          </blockquote>
        </div>
      </div>
    </div>
  );
};

export default SyncModal;
