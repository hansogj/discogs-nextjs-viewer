'use client';

import type { DiscogsUser } from '@/lib/types';
import Link from 'next/link';
import Image from 'next/image';
import { usePathname, useRouter } from 'next/navigation';
import clsx from 'clsx';
import React from 'react';

interface HeaderProps {
  user: DiscogsUser;
  activeView: 'collection' | 'wantlist' | 'duplicates' | 'user';
  collectionCount: number;
  wantlistCount: number;
  duplicatesCount: number;
  onSync: () => void;
  onClearCache: () => void;
}

export default function Header({
  user,
  activeView,
  collectionCount,
  wantlistCount,
  duplicatesCount,
  onSync,
  onClearCache,
}: HeaderProps) {
  const router = useRouter();
  const pathname = usePathname();
  const isUserPage = pathname === '/user';

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
          <Link
            href="/user"
            className={clsx(
              'group flex items-center space-x-4 rounded-lg p-2 transition-colors duration-200 -m-2',
              isUserPage ? 'bg-discogs-bg-light' : 'hover:bg-discogs-bg-light',
            )}
          >
            <Image
              src={user.avatar_url || PLACEHOLDER_AVATAR_URL}
              alt={user.username}
              width={48}
              height={48}
              className={clsx(
                'h-12 w-12 rounded-full border-2 transition-colors duration-200',
                isUserPage
                  ? 'border-white'
                  : 'border-discogs-blue group-hover:border-white',
              )}
            />
            <div>
              <p className="font-semibold text-white group-hover:text-discogs-blue">
                {user.username}
              </p>
              <a
                href={`https://www.discogs.com/user/${user.username}`}
                target="_blank"
                rel="noopener noreferrer"
                onClick={(e) => e.stopPropagation()}
                className="text-sm text-discogs-text-secondary hover:text-discogs-blue"
              >
                View on Discogs
              </a>
            </div>
          </Link>
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

        <div className="flex items-center space-x-2">
          <button
            onClick={onSync}
            className="rounded-lg bg-green-600 px-4 py-2 text-sm font-bold text-white transition-colors duration-300 hover:bg-green-700 focus:outline-none focus:ring-2 focus:ring-green-500 focus:ring-offset-2 focus:ring-offset-discogs-bg"
          >
            Sync with Discogs
          </button>
          <button
            onClick={handleLogout}
            className="rounded-lg bg-red-600 px-4 py-2 text-sm font-bold text-white transition-colors duration-300 hover:bg-red-700 focus:outline-none focus:ring-2 focus:ring-red-500 focus:ring-offset-2 focus:ring-offset-discogs-bg"
          >
            Logout
          </button>
          <button
            onClick={onClearCache}
            className="rounded-lg p-2 text-gray-400 transition-colors hover:bg-discogs-border hover:text-white"
            title="Clear local cache"
          >
            <svg
              xmlns="http://www.w3.org/2000/svg"
              className="h-5 w-5"
              viewBox="0 0 20 20"
              fill="currentColor"
            >
              <path
                fillRule="evenodd"
                d="M9 2a1 1 0 00-.894.553L7.382 4H4a1 1 0 000 2v10a2 2 0 002 2h8a2 2 0 002-2V6a1 1 0 100-2h-3.382l-.724-1.447A1 1 0 0011 2H9zM7 8a1 1 0 012 0v6a1 1 0 11-2 0V8zm4 0a1 1 0 012 0v6a1 1 0 11-2 0V8z"
                clipRule="evenodd"
              />
            </svg>
          </button>
        </div>
      </div>
    </header>
  );
}

export function HeaderSkeleton({
  activeView,
}: {
  activeView: 'collection' | 'wantlist' | 'duplicates' | 'user';
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

        <div className="flex items-center space-x-2">
            <div className="h-10 w-36 rounded-lg bg-discogs-border"></div>
            <div className="h-10 w-24 rounded-lg bg-discogs-border"></div>
        </div>
      </div>
    </header>
  );
}
