"use server";

import { getIronSession } from "iron-session";
import { syncQueue } from "@/lib/queue";
import { clearSyncProgress } from "@/lib/cache";
import { deleteAllUserData, getSyncInfoFromStore } from "@/lib/store";
import { cookies } from "next/headers";
import { sessionOptions, SessionData } from "@/lib/session-options";
import type { DiscogsUser } from "@/lib/types";
import type { DiscogsAuth } from "@/lib/discogs";

// Discogs API TOU: cached Content may not be displayed if it is more than 6h
// older than what's on Discogs' online properties. We treat this as the
// staleness threshold that triggers an automatic re-sync.
const STALE_AFTER_MS = 6 * 60 * 60 * 1000;

// Serialise sync enqueues per user so concurrent triggers (login + mount
// effect + manual button) don't stack duplicate jobs against a shared
// consumer-key rate budget.
async function enqueueSyncIfNotRunning(
  user: DiscogsUser,
  token: DiscogsAuth,
): Promise<{ enqueued: boolean }> {
  const existing = await syncQueue.getJobs(["active", "waiting", "delayed"]);
  if (existing.some((j) => j.data.user?.username === user.username)) {
    return { enqueued: false };
  }
  await syncQueue.add("sync", { user, token });
  return { enqueued: true };
}

async function getSessionAuth() {
  const session = await getIronSession<SessionData>(
    await cookies(),
    sessionOptions,
  );

  const isTokenLoggedIn = !!session.token && !!session.user;
  const isOAuthLoggedIn =
    !!session.accessToken && !!session.accessTokenSecret && !!session.user;

  if (!isTokenLoggedIn && !isOAuthLoggedIn) {
    throw new Error("Not authenticated");
  }

  const auth = isOAuthLoggedIn
    ? {
        oauth_token: session.accessToken!,
        oauth_token_secret: session.accessTokenSecret!,
      }
    : session.token!;

  return { user: session.user!, auth };
}

export async function syncAllData(): Promise<{
  success: boolean;
  message?: string;
}> {
  const { user, auth } = await getSessionAuth();
  const { enqueued } = await enqueueSyncIfNotRunning(user, auth);
  return {
    success: true,
    message: enqueued ? "Sync started!" : "Sync already in progress.",
  };
}

export async function getCacheStaleness(): Promise<{
  isStale: boolean;
  syncedAt: number | null;
}> {
  const { user } = await getSessionAuth();
  const info = await getSyncInfoFromStore(user.username);
  const syncedAt = info?.syncedAt ?? null;
  const isStale = syncedAt == null || Date.now() - syncedAt >= STALE_AFTER_MS;
  return { isStale, syncedAt };
}

// Called from the OAuth callback route once the session is populated. Keeping
// this exported (rather than calling syncQueue directly from the route) so all
// enqueue paths share the same dedup logic.
export async function enqueueSyncForSession(
  user: DiscogsUser,
  token: DiscogsAuth,
): Promise<void> {
  await enqueueSyncIfNotRunning(user, token);
}

// "Leave and delete my data": nuke every Redis key that belongs to this
// user and destroy the session cookie in one shot. Called from the burger
// menu. The follow-up router.refresh() on the client bounces through
// middleware, which redirects to the sign-in page now that the session
// is gone.
export async function leaveAppAction(): Promise<{ success: true }> {
  const session = await getIronSession<SessionData>(
    await cookies(),
    sessionOptions,
  );
  const username = session.user?.username;
  if (username) {
    await deleteAllUserData(username);
    await clearSyncProgress(username);
  }
  session.destroy();
  return { success: true };
}

export async function getSyncJobStatus() {
  const session = await getIronSession<SessionData>(
    await cookies(),
    sessionOptions,
  );
  const isTokenLoggedIn = !!session.token && !!session.user;
  const isOAuthLoggedIn =
    !!session.accessToken && !!session.accessTokenSecret && !!session.user;

  if (!isTokenLoggedIn && !isOAuthLoggedIn) {
    throw new Error("Not authenticated");
  }
  const jobs = await syncQueue.getJobs([
    "active",
    "waiting",
    "completed",
    "failed",
  ]);
  const job = jobs.find((j) => j.data.user.username === session.user?.username);

  if (job) {
    return {
      isActive: await job.isActive(),
      isCompleted: await job.isCompleted(),
      isFailed: await job.isFailed(),
      progress: job.progress,
    };
  }

  return null;
}
