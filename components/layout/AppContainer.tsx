
'use client';

// Fix: Import `useState` from React to manage component state.
import React, { useState } from 'react';
import { useRouter } from 'next/navigation';
import Header from './Header';
import SyncModal from '../SyncModal';
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

    // Polling interval reference
    const pollInterval = setInterval(async () => {
      try {
        const res = await fetch('/api/sync-progress');
        if (res.ok) {
          const progress: SyncProgress = await res.json();
          if (progress.status) {
            setSyncProgress(progress);
          }
        }
      } catch (e) {
        console.error('Polling for sync progress failed', e);
      }
    }, 1500);

    // Call server action
    const result = await syncAllData();

    // Stop polling
    clearInterval(pollInterval);
    setIsSyncing(false);
    setSyncProgress(null);

    if (result.success) {
      // Refresh the page to load new data from cache
      router.refresh();
    } else {
      setSyncError(result.message ?? 'An unknown error occurred during sync.');
    }
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
      />
      <SyncModal isOpen={isSyncing} user={user} progress={syncProgress} />
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
