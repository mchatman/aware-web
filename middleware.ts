// middleware.ts — With localStorage-based auth, server-side middleware
// cannot check tokens. Auth protection is handled client-side in the
// dashboard page component. This middleware is kept minimal.

import { NextResponse } from 'next/server';

export function middleware() {
  return NextResponse.next();
}

export const config = {
  matcher: ['/dashboard/:path*'],
};
