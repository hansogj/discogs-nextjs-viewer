"use client";

import { createContext, useContext } from "react";
import type { SyncProgress } from "@/lib/cache";

export interface SyncContextValue {
  isSyncing: boolean;
  syncProgress: SyncProgress | null;
  syncError: string | null;
  onSync: () => Promise<void>;
  clearError: () => void;
}

export const SyncContext = createContext<SyncContextValue>({
  isSyncing: false,
  syncProgress: null,
  syncError: null,
  onSync: async () => {},
  clearError: () => {},
});

export function useSyncContext() {
  return useContext(SyncContext);
}
