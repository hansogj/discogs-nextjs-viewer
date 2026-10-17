"use client";

import { useState, useRef, useCallback, useEffect } from "react";
import { useRouter } from "@/i18n/routing";
import { useTranslations } from "next-intl";
import { SyncContext } from "@/lib/sync-context";
import { syncAllData, getCacheStaleness } from "@/app/actions";
import type { SyncProgress } from "@/lib/cache";

export default function SyncManager({
  children,
}: {
  children: React.ReactNode;
}) {
  const [isSyncing, setIsSyncing] = useState(false);
  const [syncProgress, setSyncProgress] = useState<SyncProgress | null>(null);
  const [syncError, setSyncError] = useState<string | null>(null);
  const router = useRouter();
  const pollRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const tErrors = useTranslations("errors");
  const tHeader = useTranslations("header");

  const startPolling = useCallback(() => {
    if (pollRef.current) return;
    pollRef.current = setInterval(async () => {
      try {
        const res = await fetch("/api/sync-progress");
        if (res.ok) {
          const progress = await res.json();
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

  const handleSync = useCallback(async () => {
    setIsSyncing(true);
    setSyncError(null);
    setSyncProgress({
      status: "starting",
      message: tHeader("refreshingMessage"),
    });
    await syncAllData();
    startPolling();
  }, [startPolling, tHeader]);

  return (
    <SyncContext.Provider
      value={{
        isSyncing,
        syncProgress,
        syncError,
        onSync: handleSync,
        clearError: () => setSyncError(null),
      }}
    >
      {children}
    </SyncContext.Provider>
  );
}
