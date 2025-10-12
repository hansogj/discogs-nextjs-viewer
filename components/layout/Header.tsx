'use client';

import React from 'react';
import Image from 'next/image';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import type { DiscogsUser } from '@/lib/types';
import clsx from 'clsx';

interface HeaderProps {
  user: DiscogsUser;
  activeView: 'collection' | 'wantlist' | 'duplicates';
  collectionCount: number;
  wantlistCount: number;
  duplicatesCount: number;
}

const Header: React.FC<HeaderProps> = ({ user, activeView, collectionCount, wantlistCount, duplicatesCount }) => {
  const router = useRouter();

  const handleLogout = async () => {
    await fetch('/api/logout', { method: 'POST' });
    router.refresh();
  };
  
  const buttonBaseClasses = "px-4 py-2 text-sm font-medium rounded-md transition-colors duration-200 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-offset-discogs-bg-light focus:ring-discogs-blue";
  const activeButtonClasses = "bg-discogs-blue text-white";
  const inactiveButtonClasses = "bg-discogs-bg-light text-discogs-text-secondary hover:bg-discogs-border";

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
            <Link 
                href="/collection"
                className={clsx(buttonBaseClasses, { [activeButtonClasses]: activeView === 'collection', [inactiveButtonClasses]: activeView !== 'collection' })}
            >
                Collection <span className="bg-discogs-border text-gray-200 text-xs font-bold ml-2 px-2 py-0.5 rounded-full">{collectionCount}</span>
            </Link>
            <Link 
                href="/wantlist"
                className={clsx(buttonBaseClasses, { [activeButtonClasses]: activeView === 'wantlist', [inactiveButtonClasses]: activeView !== 'wantlist' })}
            >
                Wantlist <span className="bg-discogs-border text-gray-200 text-xs font-bold ml-2 px-2 py-0.5 rounded-full">{wantlistCount}</span>
            </Link>
            <Link 
                href="/duplicates"
                className={clsx(buttonBaseClasses, { [activeButtonClasses]: activeView === 'duplicates', [inactiveButtonClasses]: activeView !== 'duplicates' })}
            >
                Duplicates <span className="bg-discogs-border text-gray-200 text-xs font-bold ml-2 px-2 py-0.5 rounded-full">{duplicatesCount}</span>
            </Link>
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
    const buttonBaseClasses = "px-4 py-2 text-sm font-medium rounded-md";
    const activeButtonClasses = "bg-discogs-blue text-white";
    const inactiveButtonClasses = "bg-discogs-bg-light text-discogs-text-secondary";

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
                    <div className={clsx(buttonBaseClasses, { [activeButtonClasses]: activeView === 'collection', [inactiveButtonClasses]: activeView !== 'collection' })}>
                        Collection <span className="bg-discogs-border text-gray-200 text-xs font-bold ml-2 px-2 py-0.5 rounded-full">--</span>
                    </div>
                    <div className={clsx(buttonBaseClasses, { [activeButtonClasses]: activeView === 'wantlist', [inactiveButtonClasses]: activeView !== 'wantlist' })}>
                        Wantlist <span className="bg-discogs-border text-gray-200 text-xs font-bold ml-2 px-2 py-0.5 rounded-full">--</span>
                    </div>
                    <div className={clsx(buttonBaseClasses, { [activeButtonClasses]: activeView === 'duplicates', [inactiveButtonClasses]: activeView !== 'duplicates' })}>
                        Duplicates <span className="bg-discogs-border text-gray-200 text-xs font-bold ml-2 px-2 py-0.5 rounded-full">--</span>
                    </div>
                </nav>
                <div className="bg-red-700 h-10 w-24 rounded-lg"></div>
            </div>
        </header>
    );
};

export default Header;
