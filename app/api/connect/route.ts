import { NextRequest, NextResponse } from 'next/server';
import { apiRequest } from '@/lib/api';
import { getAuthToken } from '@/lib/cookies';
import type { InstanceResponse } from '@/lib/types';

/**
 * GET /api/connect
 *
 * Server-side redirect that reads the JWT from the httpOnly cookie,
 * resolves the user's tenant instance, and redirects the browser to
 * the tenant endpoint with the gateway token.  The JWT never touches
 * client-side JavaScript.
 */
export async function GET(request: NextRequest) {
  const token = getAuthToken(request);

  if (!token) {
    return NextResponse.redirect(new URL('/', request.url));
  }

  try {
    const { data, error } = await apiRequest<InstanceResponse>('/instance', {
      headers: { Authorization: `Bearer ${token}` },
    });

    if (error || !data) {
      return NextResponse.redirect(new URL('/?error=instance', request.url));
    }

    const target = new URL('/auth/callback', data.endpoint);
    target.searchParams.set('token', data.gateway_token);

    return NextResponse.redirect(target.toString());
  } catch (err) {
    console.error('Connect redirect error:', err);
    return NextResponse.redirect(new URL('/?error=instance', request.url));
  }
}
