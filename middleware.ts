import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';

export function middleware(request: NextRequest) {
  const token = request.cookies.get('token');
  const isAuthPage = request.nextUrl.pathname === '/' ||
                     request.nextUrl.pathname === '/login' ||
                     request.nextUrl.pathname === '/signup';
  const isDashboard = request.nextUrl.pathname.startsWith('/dashboard');

  // If trying to access dashboard without token, redirect to login
  if (isDashboard && !token) {
    return NextResponse.redirect(new URL('/', request.url));
  }

  // If on auth page with token, redirect to dashboard
  if (isAuthPage && token) {
    return NextResponse.redirect(new URL('/dashboard', request.url));
  }

  return NextResponse.next();
}

export const config = {
  matcher: ['/', '/login', '/signup', '/dashboard/:path*']
};