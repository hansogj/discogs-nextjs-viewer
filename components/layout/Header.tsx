'use client';

import React, { useState, useTransition, useEffect, FC } from 'react';
import Image from 'next/image';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import type { DiscogsUser } from '@/lib/types';
import clsx from 'clsx';
import Spinner from '@/components/Spinner';

type SyncTarget = 'collection' | 'wantlist' | 'duplicates';

interface HeaderProps {
  user: DiscogsUser;
  activeView: 'collection' | 'wantlist' | 'duplicates';
  collectionCount: number;
  wantlistCount: number;
  duplicatesCount: number;
}

const RefreshIcon: FC = () => (
    <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" viewBox="0 0 20 20" fill="currentColor">
        <path fillRule="evenodd" d="M4 2a1 1 0 011 1v2.101a7.002 7.002 0 0111.601 2.566 1 1 0 11-1.885.666A5.002 5.002 0 005.999 7H9a1 1 0 010 2H4a1 1 0 01-1-1V3a1 1 0 011-1zm.008 9.057a1 1 0 011.276.61A5.002 5.002 0 0014.001 13H11a1 1 0 110-2h5a1 1 0 011 1v5a1 1 0 11-2 0v-2.101a7.002 7.002 0 01-11.601-2.566 1 1 0 01.61-1.276z" clipRule="evenodd" />
    </svg>
);


const Header: React.FC<HeaderProps> = ({ user, activeView, collectionCount, wantlistCount, duplicatesCount }) => {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [syncingTarget, setSyncingTarget] = useState<SyncTarget | null>(null);

  useEffect(() => {
    if (!isPending) {
        setSyncingTarget(null);
    }
  }, [isPending]);

  const handleLogout = async () => {
    await fetch('/api/logout', { method: 'POST' });
    router.refresh();
  };

  const handleResync = (target: SyncTarget) => {
    if (isPending) return;
    setSyncingTarget(target);
    startTransition(() => {
        // Just refreshing the page is enough. Next.js will re-fetch server components,
        // which gets us fresh page 1 data. The client component will reset.
        router.refresh();
    });
  };
  
  const navLinkBaseClasses = "px-4 py-2 text-sm font-medium rounded-md transition-colors duration-200 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-offset-discogs-bg-light focus:ring-discogs-blue";
  const activeLinkClasses = "bg-discogs-blue text-white";
  const inactiveLinkClasses = "bg-discogs-bg-light text-discogs-text-secondary hover:bg-discogs-border";
  const syncButtonClasses = "p-1.5 rounded-full text-discogs-text-secondary/70 hover:bg-discogs-border hover:text-white transition-colors duration-200 disabled:cursor-wait disabled:opacity-50";

  return (
    <header className="bg-discogs-bg-light/80 backdrop-blur-sm sticky top-0 z-50 p-4 shadow-lg border-b border-discogs-border">
      <div className="container mx-auto flex justify-between items-center">
        <div className="flex items-center space-x-4">
          <Image src={user.avatar_url} alt={user.username} width={48} height={48} className="w-12 h-12 rounded-full border-2 border-discogs-blue" />
          <div>
            <p className="text-white font-semibold">{user.username}</p>
            <p className="text-discogs-text-secondary text-sm">Discogs User</p>
          </div>
        </div>
        
        <nav className="flex items-center space-x-2 bg-discogs-bg p-1 rounded-lg border border-discogs-border/50">
            <div className="flex items-center">
                <Link 
                    href="/collection"
                    className={clsx(navLinkBaseClasses, 'rounded-r-none', { [activeLinkClasses]: activeView === 'collection', [inactiveLinkClasses]: activeView !== 'collection' })}
                >
                    Collection <span className="bg-discogs-border text-gray-200 text-xs font-bold ml-2 px-2 py-0.5 rounded-full">{collectionCount}</span>
                </Link>
                <button onClick={() => handleResync('collection')} disabled={isPending} className={clsx(syncButtonClasses, 'ml-1 mr-1')} aria-label="Resync Collection">
                    {(isPending && syncingTarget === 'collection') ? <Spinner size="sm" /> : <RefreshIcon />}
                </button>
            </div>
             <div className="flex items-center">
                <Link 
                    href="/wantlist"
                    className={clsx(navLinkBaseClasses, 'rounded-r-none', { [activeLinkClasses]: activeView === 'wantlist', [inactiveLinkClasses]: activeView !== 'wantlist' })}
                >
                    Wantlist <span className="bg-discogs-border text-gray-200 text-xs font-bold ml-2 px-2 py-0.5 rounded-full">{wantlistCount}</span>
                </Link>
                <button onClick={() => handleResync('wantlist')} disabled={isPending} className={clsx(syncButtonClasses, 'ml-1 mr-1')} aria-label="Resync Wantlist">
                    {(isPending && syncingTarget === 'wantlist') ? <Spinner size="sm" /> : <RefreshIcon />}
                </button>
            </div>
            <div className="flex items-center">
                <Link 
                    href="/duplicates"
                    className={clsx(navLinkBaseClasses, 'rounded-r-none', { [activeLinkClasses]: activeView === 'duplicates', [inactiveLinkClasses]: activeView !== 'duplicates' })}
                >
                    Duplicates <span className="bg-discogs-border text-gray-200 text-xs font-bold ml-2 px-2 py-0.5 rounded-full">{duplicatesCount}</span>
                </Link>
                <button onClick={() => handleResync('duplicates')} disabled={isPending} className={clsx(syncButtonClasses, 'ml-1 mr-1')} aria-label="Resync Duplicates">
                    {(isPending && syncingTarget === 'duplicates') ? <Spinner size="sm" /> : <RefreshIcon />}
                </button>
            </div>
        </nav>

        <button
          onClick={handleLogout}
          className="bg-red-600 hover:bg-red-700 text-white font-bold py-2 px-4 rounded-lg transition-colors duration-300"
        >
          Logout
        </button>
      </div>
    </header>
  );
};

export function HeaderSkeleton({ activeView }: { activeView: 'collection' | 'wantlist' | 'duplicates' }) {
    const navLinkBaseClasses = "px-4 py-2 text-sm font-medium rounded-md";
    const activeLinkClasses = "bg-discogs-blue text-white";
    const inactiveLinkClasses = "bg-discogs-bg-light text-discogs-text-secondary";

    return (
        <header className="bg-discogs-bg-light/80 backdrop-blur-sm sticky top-0 z-50 p-4 shadow-lg border-b border-discogs-border">
            <div className="container mx-auto flex justify-between items-center animate-pulse">
                <div className="flex items-center space-x-4">
                    <div className="w-12 h-12 rounded-full bg-discogs-border"></div>
                    <div>
                        <div className="h-4 w-24 bg-discogs-border rounded"></div>
                        <div className="h-3 w-16 bg-discogs-border rounded mt-2"></div>
                    </div>
                </div>
                <nav className="flex items-center space-x-2 bg-discogs-bg p-1 rounded-lg border border-discogs-border/50">
                    <div className="flex items-center">
                        <div className={clsx(navLinkBaseClasses, 'rounded-r-none', { [activeLinkClasses]: activeView === 'collection', [inactiveLinkClasses]: activeView !== 'collection' })}>
                            Collection <span className="bg-discogs-border text-gray-200 text-xs font-bold ml-2 px-2 py-0.5 rounded-full">--</span>
                        </div>
                        <div className="p-1.5 ml-1 mr-1 rounded-full bg-discogs-border/50"><div className="h-4 w-4"></div></div>
                    </div>
                     <div className="flex items-center">
                        <div className={clsx(navLinkBaseClasses, 'rounded-r-none', { [activeLinkClasses]: activeView === 'wantlist', [inactiveLinkClasses]: activeView !== 'wantlist' })}>
                            Wantlist <span className="bg-discogs-border text-gray-200 text-xs font-bold ml-2 px-2 py-0.5 rounded-full">--</span>
                        </div>
                         <div className="p-1.5 ml-1 mr-1 rounded-full bg-discogs-border/50"><div className="h-4 w-4"></div></div>
                    </div>
                    <div className="flex items-center">
                        <div className={clsx(navLinkBaseClasses, 'rounded-r-none', { [activeLinkClasses]: activeView === 'duplicates', [inactiveLinkClasses]: activeView !== 'duplicates' })}>
                            Duplicates <span className="bg-discogs-border text-gray-200 text-xs font-bold ml-2 px-2 py-0.5 rounded-full">--</span>
                        </div>
                         <div className="p-1.5 ml-1 mr-1 rounded-full bg-discogs-border/50"><div className="h-4 w-4"></div></div>
                    </div>
                </nav>
                <div className="bg-red-700 h-10 w-24 rounded-lg"></div>
            </div>
        </header>
    );
};

export default Header;