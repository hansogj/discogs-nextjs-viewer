import { NextResponse } from 'next/server';
import { getSession } from '@/lib/session';
import { clearUserCache } from '@/lib/cache';

export async function POST() {
  const session = await getSession();
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
