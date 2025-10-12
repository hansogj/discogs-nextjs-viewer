'use client';

import React, { useState, useEffect } from 'react';
import Image from 'next/image';
import Spinner from './Spinner';
import { getRandomQuote } from '@/lib/quotes';
import type { DiscogsUser } from '@/lib/types';

const PLACEHOLDER_AVATAR_URL =
  "data:image/svg+xml,%3csvg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 100 100' fill='none'%3e%3crect width='100' height='100' fill='%231d1f24'/%3e%3ccircle cx='50' cy='40' r='15' fill='%23a0a0a0'/%3e%3cpath d='M25,90 A30,30 0 0,1 75,90 Z' fill='%23a0a0a0'/%3e%3c/svg%3e";

interface SyncModalProps {
  isOpen: boolean;
  syncingTarget: string | null;
  user: DiscogsUser;
  onLogout: () => void;
}

const SyncModal: React.FC<SyncModalProps> = ({
  isOpen,
  syncingTarget,
  user,
  onLogout,
}) => {
  const [quote, setQuote] = useState(getRandomQuote());

  useEffect(() => {
    if (isOpen) {
      setQuote(getRandomQuote()); // Set initial quote when opened
      const intervalId = setInterval(() => {
        setQuote(getRandomQuote());
      }, 15000); // Change quote every 15 seconds

      return () => clearInterval(intervalId); // Cleanup on close
    }
  }, [isOpen]);

  if (!isOpen) {
    return null;
  }

  const avatarUrl = user.avatar_url || PLACEHOLDER_AVATAR_URL;
  const targetText =
    syncingTarget === 'duplicates' ? 'collection for duplicates' : syncingTarget;

  return (
    <div
      className="fixed inset-0 z-[100] flex animate-fade-in items-center justify-center bg-black/70 backdrop-blur-sm"
      aria-modal="true"
      role="dialog"
    >
      <div className="relative w-full max-w-md animate-slide-up rounded-xl border border-discogs-border bg-discogs-bg-light p-6 text-center shadow-2xl">
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

        <div className="mt-12">
          <div className="mx-auto mb-4 h-8 w-8">
            <Spinner size="md" />
          </div>
          <h2 className="mb-2 text-xl font-bold text-white">Syncing...</h2>
          <p className="mb-6 text-discogs-text-secondary">
            Fetching the latest updates for your {targetText} from Discogs.
          </p>
          <blockquote className="flex min-h-[60px] items-center justify-center border-l-4 border-discogs-blue pl-4 italic text-discogs-text-secondary">
            <p>"{quote}"</p>
          </blockquote>
        </div>

        <div className="mt-8">
          <button
            onClick={onLogout}
            className="rounded-lg border border-red-500/50 bg-red-600/50 px-4 py-2 text-sm font-bold text-white transition-colors duration-300 hover:bg-red-600"
          >
            Cancel & Logout
          </button>
        </div>
      </div>
    </div>
  );
};

export default SyncModal;
