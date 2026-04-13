import { getIronSession } from 'iron-session';
import { type NextRequest, type NextResponse } from 'next/server';
import type { DiscogsUser, DiscogsUserProfile, SessionData } from './types';
import { sessionOptions } from './session-options';

export async function getMiddlewareSession(req: NextRequest, res: NextResponse) {
  const session = await getIronSession<SessionData>(req, res, sessionOptions);

  const isTokenLoggedIn = !!session.token && !!session.user;
  const isOAuthLoggedIn = !!session.accessToken && !!session.accessTokenSecret && !!session.user;

  // Add a helper to check login status
  session.isLoggedIn = isTokenLoggedIn || isOAuthLoggedIn;

  return session;
}
