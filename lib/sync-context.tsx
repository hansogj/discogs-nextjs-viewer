"use client";

import { createContext, useContext } from "react";
import type { SyncProgress } from "@/lib/cache";

export interface SyncContextValue {
  isSyncing: boolean;
  syncProgress: SyncProgress | null;
}

export const SyncContext = createContext<SyncContextValue>({
  isSyncing: false,
  syncProgress: null,
});

export function useSyncContext() {
  return useContext(SyncContext);
}
