import { NextRequest, NextResponse } from "next/server";
import createMiddleware from "next-intl/middleware";
import { routing } from "@/i18n/routing";
import { getMiddlewareSession } from "@/lib/middleware-session";

const intlMiddleware = createMiddleware(routing);

// Routes that require authentication, matched *after* the locale prefix.
const GATED_ROUTE_PATTERN =
  /^\/(en|nb|de|fr|zeuhl)\/(collection|wantlist|duplicates|stats|user)(?:\/|$)/;

export async function middleware(req: NextRequest) {
  const pathname = req.nextUrl.pathname;
  const isGated = GATED_ROUTE_PATTERN.test(pathname);

  // Let next-intl handle locale detection / redirect first. Its response
  // may set the NEXT_LOCALE cookie or send a 3xx to add the locale prefix.
  const intlResponse = intlMiddleware(req);

  if (!isGated) {
    return intlResponse;
  }

  // For gated routes we still return next-intl's response, but first check
  // that the session is logged in. Reading iron-session needs a mutable
  // NextResponse — use intlResponse so any cookies it wrote survive.
  const session = await getMiddlewareSession(req, intlResponse);
  if (!session.isLoggedIn) {
    const locale = pathname.split("/")[1];
    return NextResponse.redirect(new URL(`/${locale}`, req.url));
  }
  return intlResponse;
}

export const config = {
  // Match everything except api routes, Next internals, and static assets.
  matcher: ["/((?!api|_next|_vercel|.*\\..*).*)"],
};
