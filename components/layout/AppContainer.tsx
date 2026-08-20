"use client";

// Fix: Import `useState` from React to manage component state.
import React, { useState, useEffect, useCallback, useRef } from "react";
import { useTranslations } from "next-intl";
import { useRouter } from "@/i18n/routing";
import Header from "./Header";
import ErrorMessage from "../ErrorMessage";
import { syncAllData, getCacheStaleness } from "@/app/actions";
import type { DiscogsUser } from "@/lib/types";
import type { SyncProgress } from "@/lib/cache";
import { useRememberedUsers } from "@/hooks/useRememberedUsers";
import { SyncContext } from "@/lib/sync-context";

interface AppContainerProps {
  children: React.ReactNode;
  activeView: "collection" | "wantlist" | "duplicates" | "stats" | "user";
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
  const tHeader = useTranslations("header");
  const tErrors = useTranslations("errors");

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
        const res = await fetch("/api/sync-progress");
        if (res.ok) {
          const progress = await res.json();
          // Worker writes `"done"` / `"error"` (see lib/cache.ts SyncProgress
          // type + worker.ts). It also calls clearSyncProgress at the end, so
          // we may instead observe `"idle"` (the API's fallback when the key
          // is gone). All three mean the sync is no longer running — stop
          // polling and refresh the page so the new cached data is rendered.
          if (
            progress.status === "done" ||
            progress.status === "error" ||
            progress.status === "idle"
          ) {
            if (pollRef.current) clearInterval(pollRef.current);
            pollRef.current = null;
            setIsSyncing(false);
            setSyncProgress(null);
            if (progress.status !== "error") router.refresh();
          } else if (progress.status) {
            setIsSyncing(true);
            setSyncProgress(progress);
          }
        }
      } catch (e) {
        console.error("Polling for sync progress failed", e);
        if (pollRef.current) clearInterval(pollRef.current);
        pollRef.current = null;
        setIsSyncing(false);
        setSyncProgress(null);
        setSyncError(tErrors("syncFailedProgress"));
      }
    }, 2000);
  }, [router, tErrors]);

  // On mount: pick up any sync already in progress, then enforce the Discogs
  // TOU 6h freshness rule — if the cached data is older than the threshold
  // and nothing is running, kick off a background sync automatically so
  // whatever we render is <6h old by the time the polling loop refreshes.
  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const res = await fetch("/api/sync-progress");
        if (!res.ok || cancelled) return;
        const progress = await res.json();
        const running =
          progress.status &&
          progress.status !== "idle" &&
          progress.status !== "done" &&
          progress.status !== "error";
        if (running) {
          setIsSyncing(true);
          setSyncProgress(progress);
          startPolling();
          return;
        }
        // No sync running — check freshness and self-trigger if stale.
        const { isStale } = await getCacheStaleness();
        if (cancelled || !isStale) return;
        setIsSyncing(true);
        setSyncProgress({
          status: "starting",
          message: tHeader("refreshingMessage"),
        });
        await syncAllData();
        startPolling();
      } catch {
        // ignore — network hiccup, next navigation will retry
      }
    })();
    return () => {
      cancelled = true;
      if (pollRef.current) clearInterval(pollRef.current);
      pollRef.current = null;
    };
  }, [startPolling, tHeader]);

  const handleSync = async () => {
    setIsSyncing(true);
    setSyncError(null);
    setSyncProgress({
      status: "starting",
      message: tHeader("refreshingMessage"),
    });

    await syncAllData();
    startPolling();
  };

  return (
    <SyncContext.Provider value={{ isSyncing, syncProgress }}>
      <Header
        user={user}
        activeView={activeView}
        collectionCount={collectionCount}
        wantlistCount={wantlistCount}
        duplicatesCount={duplicatesCount}
        onSync={handleSync}
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
    </SyncContext.Provider>
  );
}
