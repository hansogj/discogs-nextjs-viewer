import { NextResponse } from "next/server";
import { getIronSession } from "iron-session";
import { sessionOptions, SessionData } from "@/lib/session-options";
import {
  getDiscogsAccessToken,
  getIdentity,
  getUserProfile,
} from "@/lib/discogs";
import { enqueueSyncForSession } from "@/app/actions";
import type { DiscogsUser } from "@/lib/types";

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const oauth_token = searchParams.get("oauth_token");
    const oauth_verifier = searchParams.get("oauth_verifier");

    if (!oauth_token || !oauth_verifier) {
      throw new Error("Missing OAuth token or verifier in callback.");
    }

    const origin = new URL(process.env.DISCOGS_CALLBACK_URL!).origin;
    const redirectResponse = NextResponse.redirect(
      new URL("/collection", origin),
    );

    const session = await getIronSession<SessionData>(
      request,
      redirectResponse,
      sessionOptions,
    );

    const { oauthRequestToken, oauthRequestTokenSecret } = session;

    if (!oauthRequestToken || !oauthRequestTokenSecret) {
      throw new Error("Missing OAuth request tokens in session.");
    }

    // Exchange request token for access token
    const { oauth_token: accessToken, oauth_token_secret: accessTokenSecret } =
      await getDiscogsAccessToken(
        oauthRequestToken,
        oauthRequestTokenSecret,
        oauth_verifier,
      );

    // Save access token and secret to session
    session.accessToken = accessToken;
    session.accessTokenSecret = accessTokenSecret;

    // Clear request tokens from session
    session.oauthRequestToken = undefined;
    session.oauthRequestTokenSecret = undefined;

    // Fetch user identity using the new access token
    const identity = await getIdentity({
      oauth_token: accessToken,
      oauth_token_secret: accessTokenSecret,
    });

    if (!identity || !identity.username) {
      throw new Error("Invalid access token or failed to fetch identity.");
    }

    // Fetch detailed user profile
    const userProfile = await getUserProfile(identity.username, {
      oauth_token: accessToken,
      oauth_token_secret: accessTokenSecret,
    });

    const sessionUser: DiscogsUser = {
      id: identity.id,
      username: identity.username,
      avatar_url: userProfile.avatar_url,
      resource_url: identity.resource_url,
    };
    session.user = sessionUser;
    session.userProfile = userProfile;

    await session.save(); // This will modify the 'redirectResponse' object's headers

    // Kick off a background sync so freshly logged-in users see current data
    // rather than a stale cache from a previous session. Enqueue is dedup'd
    // per-username, so repeated logins won't stack jobs.
    await enqueueSyncForSession(sessionUser, {
      oauth_token: accessToken,
      oauth_token_secret: accessTokenSecret,
    });

    return redirectResponse;
  } catch (error) {
    console.error("OAuth Callback error:", error);
    const errorMessage =
      error instanceof Error ? error.message : "An unknown error occurred";
    return NextResponse.json(
      { error: `Authentication failed: ${errorMessage}` },
      { status: 500 },
    );
  }
}
