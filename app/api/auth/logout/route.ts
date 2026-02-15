import { NextResponse } from 'next/server';
import { clearAuthCookies } from '@/lib/cookies';

export async function POST() {
  const response = NextResponse.json({ message: 'Logged out successfully' });

  // Remove all auth cookies so the session is fully terminated.
  clearAuthCookies(response);

  return response;
}
