
import { NextResponse } from 'next/server';
import { getSession } from '@/lib/session';
import { getSyncProgress } from '@/lib/cache';

export async function GET() {
  const session = await getSession();
  if (!session.isLoggedIn || !session.user) {
    return NextResponse.json({ error: 'Not authenticated' }, { status: 401 });
  }

  const progress = await getSyncProgress(session.user.username);

  if (!progress) {
    return NextResponse.json({ status: 'idle' });
  }

  return NextResponse.json(progress);
}
