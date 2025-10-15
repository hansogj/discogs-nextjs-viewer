import { NextResponse } from 'next/server';
import { getSession } from '@/lib/session';
import { getIdentity, getUserProfile } from '@/lib/discogs';
import { z } from 'zod';

const loginSchema = z.object({
  token: z.string().min(1, { message: 'Token is required' }),
});

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const parsed = loginSchema.safeParse(body);

    if (!parsed.success) {
      return NextResponse.json(
        { error: 'Invalid token provided.' },
        { status: 400 },
      );
    }

    const { token } = parsed.data;

    // Verify token with Discogs API
    const identity = await getIdentity(token);

    if (!identity || !identity.username) {
      throw new Error('Invalid token or failed to fetch identity.');
    }

    // Fetch detailed user profile to get the most accurate data
    const userProfile = await getUserProfile(identity.username, token);

    // Save user info and token in session
    const session = await getSession();
    session.token = token;
    session.user = {
      id: identity.id,
      username: identity.username,
      // Use the avatar from the detailed profile for consistency
      avatar_url: userProfile.avatar_url,
      resource_url: identity.resource_url,
    };
    session.userProfile = userProfile;
    await session.save();

    return NextResponse.json({ user: session.user });
  } catch (error) {
    console.error('Login error:', error);
    const errorMessage =
      error instanceof Error ? error.message : 'An unknown error occurred';
    return NextResponse.json(
      { error: `Authentication failed: ${errorMessage}` },
      { status: 401 },
    );
  }
}
