// FIX: Remove 'IronSessionData' import and interface extension as it's not exported by newer versions of 'iron-session'.
import { getIronSession } from 'iron-session';
import { cookies } from 'next/headers';
import type { DiscogsUser } from './types';

export interface SessionData {
  token?: string;
  user?: DiscogsUser;
  isLoggedIn?: boolean;
}

const sessionOptions = {
    password: process.env.AUTH_SECRET as string,
    cookieName: 'discogs-viewer-session',
    cookieOptions: {
        secure: process.env.NODE_ENV === 'production',
        httpOnly: true,
        maxAge: 60 * 30, // Expire session after 30 minutes of inactivity
    },
};

if (!process.env.AUTH_SECRET || process.env.AUTH_SECRET.length < 32) {
    throw new Error('AUTH_SECRET environment variable is not set or is too short (must be at least 32 characters).');
}

export async function getSession() {
  const session = await getIronSession<SessionData>(cookies(), sessionOptions);

  // Add a helper to check login status
  session.isLoggedIn = !!session.token && !!session.user;
  
  return session;
}