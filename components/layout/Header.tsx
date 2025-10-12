'use client';

import type { DiscogsUser } from '@/lib/types';
import Link from 'next/link';
import Image from 'next/image';
import { useRouter } from 'next/navigation';
import clsx from 'clsx';
import React from 'react';

interface HeaderProps {
  user: DiscogsUser;
  activeView: 'collection' | 'wantlist' | 'duplicates';
  collectionCount: number;
  wantlistCount: number;
  duplicatesCount: number;
}

export default function Header({
  user,
  activeView,
  collectionCount,
  wantlistCount,
  duplicatesCount,
}: HeaderProps) {
  const router = useRouter();

  const handleLogout = async () => {
    await fetch('/api/logout', { method: 'POST' });
    router.refresh(); // This will re-trigger the middleware, which will redirect to the login page.
  };

  const buttonBaseClasses =
    'focus:outline-none rounded-md px-4 py-2 text-sm font-medium transition-colors duration-200 focus:ring-2 focus:ring-offset-2 focus:ring-offset-discogs-bg focus:ring-discogs-blue';
  const activeButtonClasses = 'bg-discogs-blue text-white';
  const inactiveButtonClasses =
    'bg-discogs-bg-light text-discogs-text-secondary hover:bg-discogs-border';

  const PLACEHOLDER_AVATAR_URL =
    "data:image/svg+xml,%3csvg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 100 100' fill='none'%3e%3crect width='100' height='100' fill='%231d1f24'/%3e%3ccircle cx='50' cy='40' r='15' fill='%23a0a0a0'/%3e%3cpath d='M25,90 A30,30 0 0,1 75,90 Z' fill='%23a0a0a0'/%3e%3c/svg%3e";

  return (
    <header className="sticky top-0 z-50 border-b border-discogs-border bg-discogs-bg/80 p-4 shadow-lg backdrop-blur-sm">
      <div className="container mx-auto flex items-center justify-between">
        <div className="flex items-center space-x-4">
          <Image
            src={user.avatar_url || PLACEHOLDER_AVATAR_URL}
            alt={user.username}
            width={48}
            height={48}
            className="h-12 w-12 rounded-full border-2 border-discogs-blue"
          />
          <div>
            <p className="font-semibold text-white">{user.username}</p>
            <a
              href={`https://www.discogs.com/user/${user.username}`}
              target="_blank"
              rel="noopener noreferrer"
              className="text-sm text-discogs-text-secondary hover:text-discogs-blue"
            >
              View on Discogs
            </a>
          </div>
        </div>

        <nav className="flex items-center space-x-2 rounded-lg border border-discogs-border/50 bg-discogs-bg p-1">
          <Link
            href="/collection"
            className={clsx(buttonBaseClasses, {
              [activeButtonClasses]: activeView === 'collection',
              [inactiveButtonClasses]: activeView !== 'collection',
            })}
          >
            Collection
            <span className="ml-2 rounded-full bg-discogs-border px-2 py-0.5 text-xs font-bold text-discogs-text">
              {collectionCount}
            </span>
          </Link>
          <Link
            href="/wantlist"
            className={clsx(buttonBaseClasses, {
              [activeButtonClasses]: activeView === 'wantlist',
              [inactiveButtonClasses]: activeView !== 'wantlist',
            })}
          >
            Wantlist
            <span className="ml-2 rounded-full bg-discogs-border px-2 py-0.5 text-xs font-bold text-discogs-text">
              {wantlistCount}
            </span>
          </Link>
          <Link
            href="/duplicates"
            className={clsx(buttonBaseClasses, {
              [activeButtonClasses]: activeView === 'duplicates',
              [inactiveButtonClasses]: activeView !== 'duplicates',
            })}
          >
            Duplicates
            <span className="ml-2 rounded-full bg-discogs-border px-2 py-0.5 text-xs font-bold text-discogs-text">
              {duplicatesCount}
            </span>
          </Link>
        </nav>

        <button
          onClick={handleLogout}
          className="rounded-lg bg-red-600 px-4 py-2 font-bold text-white transition-colors duration-300 hover:bg-red-700 focus:outline-none focus:ring-2 focus:ring-red-500 focus:ring-offset-2 focus:ring-offset-discogs-bg"
        >
          Logout
        </button>
      </div>
    </header>
  );
}

export function HeaderSkeleton({
  activeView,
}: {
  activeView: 'collection' | 'wantlist' | 'duplicates';
}) {
  const buttonBaseClasses =
    'focus:outline-none rounded-md px-4 py-2 text-sm font-medium';
  const activeButtonClasses = 'bg-discogs-blue';
  const inactiveButtonClasses = 'bg-discogs-bg-light';

  return (
    <header className="sticky top-0 z-50 border-b border-discogs-border bg-discogs-bg/80 p-4 shadow-lg backdrop-blur-sm">
      <div className="container mx-auto flex animate-pulse items-center justify-between">
        <div className="flex items-center space-x-4">
          <div className="h-12 w-12 rounded-full bg-discogs-border"></div>
          <div>
            <div className="mb-2 h-4 w-24 rounded bg-discogs-border"></div>
            <div className="h-3 w-32 rounded bg-discogs-border"></div>
          </div>
        </div>

        <div className="flex items-center space-x-2 rounded-lg border border-discogs-border/50 bg-discogs-bg p-1">
          <div
            className={clsx(
              buttonBaseClasses,
              activeView === 'collection'
                ? activeButtonClasses
                : inactiveButtonClasses,
              'h-9 w-32',
            )}
          ></div>
          <div
            className={clsx(
              buttonBaseClasses,
              activeView === 'wantlist'
                ? activeButtonClasses
                : inactiveButtonClasses,
              'h-9 w-32',
            )}
          ></div>
          <div
            className={clsx(
              buttonBaseClasses,
              activeView === 'duplicates'
                ? activeButtonClasses
                : inactiveButtonClasses,
              'h-9 w-32',
            )}
          ></div>
        </div>

        <div className="h-10 w-24 rounded-lg bg-discogs-border"></div>
      </div>
    </header>
  );
}
