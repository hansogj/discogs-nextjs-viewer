import redis from "./redis";

// Sync progress state — Redis-backed and ephemeral (1h TTL). Everything
// else that used to live here (per-user JSON files on disk) has moved to
// lib/store.ts. Progress stays here because it isn't user data: it's
// short-lived UI feedback during a running sync.

export interface SyncProgress {
  status: "starting" | "fetching" | "processing" | "caching" | "done" | "error";
  resource?:
    | "collection"
    | "wantlist"
    | "collection_details"
    | "wantlist_details"
    | "collection_masters"
    | "wantlist_prices";
  page?: number;
  pages?: number;
  processed?: number;
  total?: number;
  message?: string;
  progress?: number;
  step?: number;
  totalSteps?: number;
  stepName?: string;
  startedAt?: number;
}

export async function setSyncProgress(
  username: string,
  progress: SyncProgress,
): Promise<void> {
  try {
    await redis.set(
      `sync-progress:${username}`,
      JSON.stringify(progress),
      "EX",
      3600, // expire after 1 hour
    );
  } catch (error) {
    console.error("Failed to write sync progress to Redis:", error);
  }
}

export async function getSyncProgress(
  username: string,
): Promise<SyncProgress | null> {
  try {
    const data = await redis.get(`sync-progress:${username}`);
    if (!data) return null;
    return JSON.parse(data) as SyncProgress;
  } catch (error) {
    console.error("Failed to read sync progress from Redis:", error);
    return null;
  }
}

export async function clearSyncProgress(username: string): Promise<void> {
  try {
    await redis.del(`sync-progress:${username}`);
  } catch (error) {
    console.error("Failed to clear sync progress from Redis:", error);
  }
}
