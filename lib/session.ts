import { getIronSession, IronSessionData } from 'iron-session';
import { cookies } from 'next/headers';
import type { DiscogsUser } from './types';

export interface SessionData extends IronSessionData {
  token?: string;
  user?: DiscogsUser;
}

const sessionOptions = {
    password: process.env.AUTH_SECRET as string,
    cookieName: 'discogs-viewer-session',
    cookieOptions: {
        secure: process.env.NODE_ENV === 'production',
        httpOnly: true,
    },
};

if (!process.env.AUTH_SECRET || process.env.AUTH_SECRET.length < 32) {
    throw new Error('AUTH_SECRET environment variable is not set or is too short (must be at least 32 characters).');
}

export async function getSession() {
  const session = await getIronSession<SessionData>(cookies(), sessionOptions);

  // Add a helper to check login status
  if (!session.isLoggedIn) {
      session.isLoggedIn = !!session.token && !!session.user;
  }
  
  return session;
}
