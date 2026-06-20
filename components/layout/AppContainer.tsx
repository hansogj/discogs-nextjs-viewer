
'use client';

// Fix: Import `useState` from React to manage component state.
import React, { useState, useEffect, useCallback, useRef } from 'react';
import { useRouter } from 'next/navigation';
import Header from './Header';
import ErrorMessage from '../ErrorMessage';
import { syncAllData, clearCacheAction } from '@/app/actions';
import type { DiscogsUser } from '@/lib/types';
import type { SyncProgress } from '@/lib/cache';
import { useRememberedUsers } from '@/hooks/useRememberedUsers';

interface AppContainerProps {
  children: React.ReactNode;
  activeView: 'collection' | 'wantlist' | 'duplicates' | 'stats' | 'user';
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
  const pollRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const { saveUser } = useRememberedUsers();

  // Remember this user for the login screen
  useEffect(() => {
    if (user?.username) {
      saveUser(user.username, user.avatar_url);
    }
  }, [user?.username, user?.avatar_url, saveUser]);

  const startPolling = useCallback(() => {
    if (pollRef.current) return;
    pollRef.current = setInterval(async () => {
      try {
        const res = await fetch('/api/sync-progress');
        if (res.ok) {
          const progress = await res.json();
          if (progress.status === 'completed' || progress.status === 'failed' || progress.status === 'idle') {
            if (pollRef.current) clearInterval(pollRef.current);
            pollRef.current = null;
            setIsSyncing(false);
            setSyncProgress(null);
            if (progress.status === 'completed') router.refresh();
          } else if (progress.status) {
            setIsSyncing(true);
            setSyncProgress(progress);
          }
        }
      } catch (e) {
        console.error('Polling for sync progress failed', e);
        if (pollRef.current) clearInterval(pollRef.current);
        pollRef.current = null;
        setIsSyncing(false);
        setSyncProgress(null);
        setSyncError('Failed to get sync progress.');
      }
    }, 2000);
  }, [router]);

  // On mount, check if a sync is already in progress
  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const res = await fetch('/api/sync-progress');
        if (res.ok && !cancelled) {
          const progress = await res.json();
          if (progress.status && progress.status !== 'idle' && progress.status !== 'completed' && progress.status !== 'failed') {
            setIsSyncing(true);
            setSyncProgress(progress);
            startPolling();
          }
        }
      } catch {
        // ignore — no sync in progress
      }
    })();
    return () => {
      cancelled = true;
      if (pollRef.current) clearInterval(pollRef.current);
      pollRef.current = null;
    };
  }, [startPolling]);

  const handleSync = async () => {
    setIsSyncing(true);
    setSyncError(null);
    setSyncProgress({ status: 'starting', message: 'Initiating sync...' });

    await syncAllData();
    startPolling();
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


