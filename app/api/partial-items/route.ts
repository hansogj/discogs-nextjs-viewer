import { NextResponse } from "next/server";
import { getIronSession } from "iron-session";
import { cookies } from "next/headers";
import { sessionOptions, SessionData } from "@/lib/session-options";
import { getPartialItems } from "@/lib/store";

export async function GET(request: Request) {
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

  const { searchParams } = new URL(request.url);
  const resource = searchParams.get("resource");
  if (resource !== "collection" && resource !== "wantlist") {
    return NextResponse.json({ error: "Invalid resource" }, { status: 400 });
  }

  const { username } = session.user!;
  const items = await getPartialItems(username, resource);
  return NextResponse.json({ items: items ?? [] });
}
