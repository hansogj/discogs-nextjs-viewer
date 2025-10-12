import { type NextRequest, NextResponse } from 'next/server';
import { getSession } from '@/lib/session';

export const config = {
  matcher: ['/collection', '/wantlist'],
};

export async function middleware(req: NextRequest) {
  const session = await getSession();

  if (!session.isLoggedIn) {
    return NextResponse.redirect(new URL('/', req.url));
  }

  return NextResponse.next();
}