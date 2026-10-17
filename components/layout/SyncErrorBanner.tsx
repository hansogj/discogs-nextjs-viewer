"use client";

import { useSyncContext } from "@/lib/sync-context";
import ErrorMessage from "../ErrorMessage";

export default function SyncErrorBanner() {
  const { syncError, clearError } = useSyncContext();
  if (!syncError) return null;
  return (
    <div className="p-4">
      <ErrorMessage message={syncError} onClear={clearError} />
    </div>
  );
}
