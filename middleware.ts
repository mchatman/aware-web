// middleware.ts — Runs on every matched route before rendering.
// Handles two redirect rules:
//   1. Unauthenticated users hitting /dashboard… are sent to the login page.
//   2. Already-authenticated users on auth pages (/, /login, /signup) are
//      sent straight to /dashboard so they don’t see the login form again.

import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';

/** Cookie name must stay in sync with lib/config.ts (can’t import at edge). */
const AUTH_COOKIE = 'token';

const AUTH_PATHS = new Set(['/', '/login', '/signup']);

export function middleware(request: NextRequest) {
  const hasToken = request.cookies.has(AUTH_COOKIE);
  const { pathname } = request.nextUrl;

  const isAuthPage = AUTH_PATHS.has(pathname);
  const isDashboard = pathname.startsWith('/dashboard');

  // Rule 1: protect /dashboard/* for unauthenticated visitors.
  if (isDashboard && !hasToken) {
    return NextResponse.redirect(new URL('/', request.url));
  }

  // Rule 2: skip the login/signup form when the user is already logged in.
  if (isAuthPage && hasToken) {
    return NextResponse.redirect(new URL('/dashboard', request.url));
  }

  return NextResponse.next();
}

export const config = {
  matcher: ['/', '/login', '/signup', '/dashboard/:path*'],
};
