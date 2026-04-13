import { NextResponse } from 'next/server';
import { getIronSession } from 'iron-session';
import { getDiscogsRequestToken, getDiscogsAuthorizeUrl } from '@/lib/discogs';
import { sessionOptions, SessionData } from '@/lib/session-options';

export async function GET(request: Request) {
  try {
    const callbackUrl = process.env.DISCOGS_CALLBACK_URL;
    if (!callbackUrl) {
      throw new Error('DISCOGS_CALLBACK_URL environment variable is not set.');
    }

    const { oauth_token, oauth_token_secret } = await getDiscogsRequestToken(callbackUrl);

    if (!oauth_token || !oauth_token_secret) {
      throw new Error('Failed to obtain valid Discogs request tokens.');
    }

    const authorizeUrl = await getDiscogsAuthorizeUrl(oauth_token);
    const redirectResponse = NextResponse.redirect(authorizeUrl);

    const session = await getIronSession<SessionData>(request, redirectResponse, sessionOptions);
    session.oauthRequestToken = oauth_token;
    session.oauthRequestTokenSecret = oauth_token_secret;
    await session.save();

    return redirectResponse;
  } catch (error) {
    console.error('[OAuth Request] Error:', error);
    const errorMessage =
      error instanceof Error ? error.message : 'An unknown error occurred';
    return NextResponse.json(
      { error: `Authentication failed: ${errorMessage}` },
      { status: 500 },
    );
  }
}
