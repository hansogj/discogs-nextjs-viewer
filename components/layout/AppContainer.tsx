
'use client';

// Fix: Import `useState` from React to manage component state.
import React, { useState } from 'react';
import { useRouter } from 'next/navigation';
import Header from './Header';
import ErrorMessage from '../ErrorMessage';
import { syncAllData, clearCacheAction } from '@/app/actions';
import type { DiscogsUser } from '@/lib/types';
import type { SyncProgress } from '@/lib/cache';

interface AppContainerProps {
  children: React.ReactNode;
  activeView: 'collection' | 'wantlist' | 'duplicates' | 'user';
  user: DiscogsUser;
  collectionCount: number;
  wantlistCount: number;
  duplicatesCount: number;
}

export default function AppContainer({
  children,
  activeView,
  user,
  collectionCount,
  wantlistCount,
  duplicatesCount,
}: AppContainerProps) {
  const [isSyncing, setIsSyncing] = useState(false);
  const [syncError, setSyncError] = useState<string | null>(null);
  const [syncProgress, setSyncProgress] = useState<SyncProgress | null>(null);
  const router = useRouter();

  const handleSync = async () => {
    setIsSyncing(true);
    setSyncError(null);
    setSyncProgress({ status: 'starting', message: 'Initiating sync...' });

    await syncAllData();

    // Polling interval reference
    const pollInterval = setInterval(async () => {
      try {
        const res = await fetch('/api/sync-progress');
        if (res.ok) {
          const progress = await res.json();
          if (progress.status === 'completed' || progress.status === 'failed') {
            clearInterval(pollInterval);
            setIsSyncing(false);
            setSyncProgress(null);
            router.refresh();
          } else if (progress.status) {
            setSyncProgress(progress);
          }
        }
      } catch (e) {
        console.error('Polling for sync progress failed', e);
        clearInterval(pollInterval);
        setIsSyncing(false);
        setSyncProgress(null);
        setSyncError('Failed to get sync progress.');
      }
    }, 2000);
  };

  const handleClearCache = async () => {
    if (
      window.confirm(
        'Are you sure you want to clear the local cache? This will require a full sync with Discogs.',
      )
    ) {
      await clearCacheAction();
      router.refresh();
    }
  };

  return (
    <>
      <Header
        user={user}
        activeView={activeView}
        collectionCount={collectionCount}
        wantlistCount={wantlistCount}
        duplicatesCount={duplicatesCount}
        onSync={handleSync}
        onClearCache={handleClearCache}
        isSyncing={isSyncing}
        syncProgress={syncProgress}
      />
      <main className="container mx-auto">
        {syncError && (
          <div className="p-4">
            <ErrorMessage
              message={syncError}
              onClear={() => setSyncError(null)}
            />
          </div>
        )}
        {children}
      </main>
    </>
  );
}


