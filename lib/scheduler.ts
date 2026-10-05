import { syncQueue } from "./queue";

// How often to automatically re-sync a logged-in user's collection.
const SYNC_INTERVAL_MS = 60 * 60 * 1000; // 1 hour

function schedulerId(username: string): string {
  return `scheduled-sync:${username}`;
}

export async function scheduleUserSync(username: string): Promise<void> {
  await syncQueue.upsertJobScheduler(
    schedulerId(username),
    { every: SYNC_INTERVAL_MS },
    {
      name: "sync",
      data: { username, source: "scheduled" },
    },
  );
  console.log(`[Scheduler] Hourly sync registered for ${username}.`);
}

export async function cancelUserSync(username: string): Promise<void> {
  const removed = await syncQueue.removeJobScheduler(schedulerId(username));
  if (removed) {
    console.log(`[Scheduler] Cancelled scheduled sync for ${username}.`);
  }
}
