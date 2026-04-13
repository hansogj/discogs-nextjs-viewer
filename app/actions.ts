
'use server';

import { getIronSession } from 'iron-session';
import { syncQueue } from '@/lib/queue';
import { clearUserCache } from '@/lib/cache';
import { revalidatePath } from 'next/cache';
import { cookies } from 'next/headers';
import { sessionOptions, SessionData } from '@/lib/session-options';

export async function syncAllData(): Promise<{
  success: boolean;
  message?: string;
}> {
  const session = await getIronSession<SessionData>(await cookies(), sessionOptions);
  
  const isTokenLoggedIn = !!session.token && !!session.user;
  const isOAuthLoggedIn = !!session.accessToken && !!session.accessTokenSecret && !!session.user;

  if (!isTokenLoggedIn && !isOAuthLoggedIn) {
    throw new Error('Not authenticated');
  }

  const { user } = session;
  const auth = isOAuthLoggedIn
    ? {
        oauth_token: session.accessToken!,
        oauth_token_secret: session.accessTokenSecret!,
      }
    : session.token!;

  await syncQueue.add('sync', { user, token: auth });

  return { success: true, message: 'Sync started!' };
}

export async function getSyncJobStatus() {
  const session = await getIronSession<SessionData>(await cookies(), sessionOptions);
  const isTokenLoggedIn = !!session.token && !!session.user;
  const isOAuthLoggedIn = !!session.accessToken && !!session.accessTokenSecret && !!session.user;

  if (!isTokenLoggedIn && !isOAuthLoggedIn) {
    throw new Error('Not authenticated');
  }
  const jobs = await syncQueue.getJobs(['active', 'waiting', 'completed', 'failed']);
  const job = jobs.find(j => j.data.user.username === session.user?.username);

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

export async function clearCacheAction() {
  const session = await getIronSession<SessionData>(await cookies(), sessionOptions);
  const isTokenLoggedIn = !!session.token && !!session.user;
  const isOAuthLoggedIn = !!session.accessToken && !!session.accessTokenSecret && !!session.user;

  if (!isTokenLoggedIn && !isOAuthLoggedIn) {
    throw new Error('Not authenticated');
  }
  await clearUserCache(session.user!.username);
  revalidatePath('/', 'layout');
  console.log(`[Action] Cache cleared for ${session.user!.username}`);
  return { success: true };
}


