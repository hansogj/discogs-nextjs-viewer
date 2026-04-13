import { NextResponse } from 'next/server';
import { getIronSession } from 'iron-session';
import { clearUserCache } from '@/lib/cache';
import { cookies } from 'next/headers';
import { sessionOptions, SessionData } from '@/lib/session-options';

export async function POST() {
  const session = await getIronSession<SessionData>(await cookies(), sessionOptions);
  if (session.user?.username) {
    try {
      await clearUserCache(session.user.username);
    } catch (error) {
      console.error('Failed to clear cache on logout:', error);
    }
  }
  session.destroy();
  return NextResponse.json({ message: 'Logged out' });
}
