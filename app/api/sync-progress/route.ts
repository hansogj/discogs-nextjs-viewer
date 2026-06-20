import { NextResponse } from "next/server";
import { getIronSession } from "iron-session";
import { cookies } from "next/headers";
import { sessionOptions, SessionData } from "@/lib/session-options";
import { getSyncProgress } from "@/lib/cache";

export async function GET() {
  const session = await getIronSession<SessionData>(
    await cookies(),
    sessionOptions,
  );
  const isTokenLoggedIn = !!session.token && !!session.user;
  const isOAuthLoggedIn =
    !!session.accessToken && !!session.accessTokenSecret && !!session.user;

  if (!isTokenLoggedIn && !isOAuthLoggedIn) {
    return NextResponse.json({ error: "Not authenticated" }, { status: 401 });
  }

  const { username } = session.user!;
  const progress = await getSyncProgress(username);

  if (progress) {
    return NextResponse.json(progress);
  }

  return NextResponse.json({ status: "idle" });
}
