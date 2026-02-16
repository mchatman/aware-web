import { NextRequest, NextResponse } from 'next/server';
import { apiRequest } from '@/lib/api';
import { getAuthToken } from '@/lib/cookies';
import type { InstanceResponse } from '@/lib/types';

/**
 * GET /api/connect
 *
 * Server-side endpoint that reads the JWT from the httpOnly cookie and
 * resolves the user's tenant instance.  The JWT never touches client JS.
 *
 * Query params:
 *   ?redirect=true  — 302 redirect to the tenant (used by window.location)
 *   (default)       — returns JSON { endpoint, gateway_token } or error
 */
export async function GET(request: NextRequest) {
  const token = getAuthToken(request);

  if (!token) {
    return NextResponse.json({ message: 'Not authenticated' }, { status: 401 });
  }

  const { data, error, status } = await apiRequest<InstanceResponse>('/instance', {
    headers: { Authorization: `Bearer ${token}` },
  });

  if (error || !data) {
    const messages: Record<number, string> = {
      401: 'Session expired',
      404: 'Instance not ready',
    };
    return NextResponse.json(
      { message: messages[status] || 'Failed to connect to workspace' },
      { status: status || 502 },
    );
  }

  // If ?redirect, send the browser directly to the tenant.
  if (request.nextUrl.searchParams.get('redirect') === 'true') {
    const target = new URL('/auth/callback', data.endpoint);
    target.searchParams.set('token', data.gateway_token);
    return NextResponse.redirect(target.toString());
  }

  // Otherwise return the connection info as JSON.
  return NextResponse.json({
    endpoint: data.endpoint,
    gateway_token: data.gateway_token,
  });
}
