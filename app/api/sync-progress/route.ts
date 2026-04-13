
import { NextResponse } from 'next/server';
import { getIronSession } from 'iron-session';
import { syncQueue } from '@/lib/queue';
import { cookies } from 'next/headers';
import { sessionOptions, SessionData } from '@/lib/session-options';
import { getSyncProgress } from '@/lib/cache'; // Import getSyncProgress

export async function GET() {
  const session = await getIronSession<SessionData>(await cookies(), sessionOptions);
  const isTokenLoggedIn = !!session.token && !!session.user;
  const isOAuthLoggedIn = !!session.accessToken && !!session.accessTokenSecret && !!session.user;

  if (!isTokenLoggedIn && !isOAuthLoggedIn) {
    return NextResponse.json({ error: 'Not authenticated' }, { status: 401 });
  }

  const { username } = session.user!;

  // First, check for detailed progress from the cache file
  const cachedProgress = await getSyncProgress(username);

  // Then, check for the BullMQ job status
  const jobs = await syncQueue.getJobs(['active', 'waiting', 'completed', 'failed']);
  const job = jobs.find(j => j.data.user.username === username);

  if (job) {
    const bullMqState = await job.getState();
    const bullMqProgress = job.progress;

    // Prioritize detailed status from cache if available
    if (cachedProgress) {
      return NextResponse.json({
        status: cachedProgress.status,
        resource: cachedProgress.resource,
        page: cachedProgress.page,
        pages: cachedProgress.pages,
        processed: cachedProgress.processed,
        total: cachedProgress.total,
        message: cachedProgress.message,
        // Use BullMQ progress for percentage, as detailed progress doesn't have it
        progress: bullMqProgress,
      });
    } else {
      // Fallback to BullMQ state if no detailed cached progress
      return NextResponse.json({ status: bullMqState, progress: bullMqProgress });
    }
  } else if (cachedProgress) {
    // If no BullMQ job but cached progress exists (e.g., job completed and removed, but file not yet cleared or status is 'done')
    // This case might indicate a successful completion if status is 'done' or an error that wasn't cleared.
    return NextResponse.json({
      status: cachedProgress.status,
      resource: cachedProgress.resource,
      page: cachedProgress.page,
      pages: cachedProgress.pages,
      processed: cachedProgress.processed,
      total: cachedProgress.total,
      message: cachedProgress.message,
      progress: 100, // Assume 100% if no BullMQ job but cached progress implies done or error
    });
  }

  // If no job and no cached progress, it's idle
  return NextResponse.json({ status: 'idle' });
}
