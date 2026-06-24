import { type NextRequest, NextResponse } from "next/server";
import { getMiddlewareSession } from "@/lib/middleware-session";

export const config = {
  matcher: ["/collection", "/wantlist", "/duplicates", "/stats", "/user"],
};

export async function middleware(req: NextRequest) {
  const res = NextResponse.next();
  const session = await getMiddlewareSession(req, res);

  if (!session.isLoggedIn) {
    return NextResponse.redirect(new URL("/", req.url));
  }

  return res;
}
