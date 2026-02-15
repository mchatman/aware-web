import { NextRequest, NextResponse } from 'next/server';
import { getAuthToken } from '@/lib/cookies';

/**
 * GET /api/auth/token
 * Returns the current access token from the HTTP-only cookie.
 * Used by client-side code that needs to forward the JWT (e.g. to the dashboard).
 */
export async function GET(request: NextRequest) {
  const token = getAuthToken(request);

  if (!token) {
    return NextResponse.json({ message: 'Not authenticated' }, { status: 401 });
  }

  return NextResponse.json({ token });
}
