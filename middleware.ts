// middleware.ts — Protects /dashboard/* for unauthenticated visitors.
// The "/" route is NOT redirected for authenticated users because
// bluefairy serves the workspace there (this middleware only runs
// when bluefairy proxies the request to aware-web, which only
// happens for known UI paths like /dashboard).

import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';
import { config as appConfig } from '@/lib/config';

export function middleware(request: NextRequest) {
  const hasToken = request.cookies.has(appConfig.cookieName);
  const { pathname } = request.nextUrl;

  // Protect /dashboard/* for unauthenticated visitors.
  if (pathname.startsWith('/dashboard') && !hasToken) {
    return NextResponse.redirect(new URL('/', request.url));
  }

  return NextResponse.next();
}

export const config = {
  matcher: ['/dashboard/:path*'],
};
