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
            className={clsx(
              buttonBaseClasses,
              'flex items-center gap-2', // Added for icon layout
              {
                [activeButtonClasses]: activeView === 'collection',
                [inactiveButtonClasses]: activeView !== 'collection',
              },
            )}
          >
            <svg
              xmlns="http://www.w3.org/2000/svg"
              viewBox="0 0 24 24"
              className="h-5 w-5"
              fill="currentColor"
              aria-hidden="true"
            >
              <path d="M19.5846 20.5964C18.8055 20.5964 18.1719 19.9628 18.1719 19.1837V4.41267C18.1719 3.63359 18.8055 3 19.5846 3C20.3636 3 20.9972 3.63359 20.9972 4.41267V19.1837C20.9972 19.9628 20.3636 20.5964 19.5846 20.5964Z" />
              <path d="M15.858 20.5964C15.0789 20.5964 14.4453 19.9628 14.4453 19.1837V4.41267C14.4453 3.63359 15.0789 3 15.858 3C16.6371 3 17.2707 3.63359 17.2707 4.41267V19.1837C17.2707 19.9628 16.6371 20.5964 15.858 20.5964Z" />
              <path d="M12.1236 20.5964C11.3445 20.5964 10.7109 19.9628 10.7109 19.1837V4.41267C10.7109 3.63359 11.3445 3 12.1236 3C12.9027 3 13.5363 3.63359 13.5363 4.41267V19.1837C13.5363 19.9628 12.9027 20.5964 12.1236 20.5964Z" />
              <path d="M3.41022 20.1624C3.25167 20.1624 3.09016 20.1369 2.93517 20.0799C2.20063 19.8168 1.82059 19.0092 2.08305 18.2747L7.06454 4.36827C7.3276 3.63373 8.13518 3.25369 8.86973 3.51616C9.60427 3.77862 9.98431 4.5868 9.72185 5.32134L4.74036 19.2278C4.53134 19.8044 3.98978 20.1618 3.41022 20.1618V20.1624Z" />
            </svg>
            <span>Collection</span>
            <span className="rounded-full bg-discogs-border px-2 py-0.5 text-xs font-bold text-discogs-text">
              {collectionCount}
            </span>
          </Link>
          <Link
            href="/wantlist"
            className={clsx(
              buttonBaseClasses,
              'flex items-center gap-2', // Added for icon layout
              {
                [activeButtonClasses]: activeView === 'wantlist',
                [inactiveButtonClasses]: activeView !== 'wantlist',
              },
            )}
          >
            <svg
              viewBox="0 0 20 12"
              className="h-5 w-5"
              fill="currentColor"
              xmlns="http://www.w3.org/2000/svg"
              aria-hidden="true"
            >
              <path d="M17.7747 6.00033C16.7485 4.40696 15.4622 3.21515 13.9157 2.42489C14.3275 3.12705 14.5334 3.88668 14.5334 4.70378C14.5334 5.95306 14.0895 7.02161 13.2017 7.90942C12.3138 8.79723 11.2453 9.24113 9.99601 9.24113C8.74673 9.24113 7.67818 8.79723 6.79037 7.90942C5.90256 7.02161 5.45866 5.95306 5.45866 4.70378C5.45866 3.88668 5.66454 3.12705 6.07631 2.42489C4.5302 3.21477 3.24386 4.40658 2.21729 6.00033C3.11531 7.3846 4.24114 8.48679 5.59478 9.30692C6.94842 10.127 8.41531 10.5373 9.99545 10.5377C11.5756 10.5381 13.0425 10.1278 14.3961 9.30692C15.7498 8.48604 16.8756 7.38384 17.7736 6.00033H17.7747ZM10.4826 2.11125C10.4826 1.97626 10.4354 1.8615 10.3409 1.76698C10.2463 1.67245 10.1316 1.62518 9.99658 1.62518C9.15263 1.62518 8.42855 1.9273 7.82432 2.53152C7.2201 3.13574 6.91799 3.85983 6.91799 4.70378C6.91799 4.83876 6.96525 4.95352 7.05978 5.04805C7.15431 5.14258 7.26906 5.18984 7.40405 5.18984C7.53904 5.18984 7.65379 5.14258 7.74832 5.04805C7.84285 4.95352 7.89011 4.83876 7.89011 4.70378C7.89011 4.123 8.096 3.62672 8.50776 3.21496C8.91953 2.80319 9.4158 2.59731 9.99658 2.59731C10.1316 2.59731 10.2463 2.55005 10.3409 2.45552C10.4354 2.36099 10.4826 2.24623 10.4826 2.11125ZM19.0713 6.00033C19.0713 6.22984 19.0038 6.46276 18.8688 6.69908C17.9235 8.25199 16.6525 9.49598 15.0557 10.4311C13.459 11.3661 11.7726 11.8337 9.99658 11.8337C8.22058 11.8337 6.5342 11.3644 4.93743 10.4259C3.34066 9.48747 2.06964 8.24518 1.12435 6.69908C0.989368 6.46276 0.921875 6.22984 0.921875 6.00033C0.921875 5.77081 0.989368 5.53789 1.12435 5.30157C2.06964 3.75547 3.34066 2.51318 4.93743 1.57471C6.5342 0.63623 8.22058 0.166992 9.99658 0.166992C11.7726 0.166992 13.459 0.63623 15.0557 1.57471C16.6525 2.51318 17.9235 3.75547 18.8688 5.30157C19.0038 5.53789 19.0713 5.77081 19.0713 6.00033Z" />
            </svg>
            <span>Wantlist</span>
            <span className="rounded-full bg-discogs-border px-2 py-0.5 text-xs font-bold text-discogs-text">
              {wantlistCount}
            </span>
          </Link>
          <Link
            href="/duplicates"
            className={clsx(
              buttonBaseClasses,
              'flex items-center gap-2', // Added for icon layout
              {
                [activeButtonClasses]: activeView === 'duplicates',
                [inactiveButtonClasses]: activeView !== 'duplicates',
              },
            )}
          >
            <svg
              viewBox="0 0 24 24"
              className="h-5 w-5"
              fill="currentColor"
              aria-hidden="true"
            >
              <path d="M22 7h-2v1h3v1h-4V7c0-.55.45-1 1-1h2V5h-3V4h3c.55 0 1 .45 1 1v1c0 .55-.45 1-1 1M5.88 20h2.66l3.4-5.42h.12l3.4 5.42h2.66l-4.65-7.27L17.81 6h-2.68l-3.07 4.99h-.12L8.85 6H6.19l4.32 6.73z" />
            </svg>
            <span>Duplicates</span>
            <span className="rounded-full bg-discogs-border px-2 py-0.5 text-xs font-bold text-discogs-text">
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
