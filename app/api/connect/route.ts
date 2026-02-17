import { NextRequest, NextResponse } from 'next/server';
import { apiRequest } from '@/lib/api';
import { getAuthToken } from '@/lib/cookies';
import type { InstanceResponse } from '@/lib/types';

/**
 * GET /api/connect
 *
 * Checks if the user's tenant workspace is ready.
 * The actual workspace is served by bluefairy on the same domain
 * (dashboard.wareit.ai) — the client just navigates to "/" when ready.
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

  // Probe the tenant to see if it's actually serving traffic.
  const ready = await checkTenantHealth(data.endpoint);

  return NextResponse.json({ ready }, { status: ready ? 200 : 202 });
}

async function checkTenantHealth(endpoint: string): Promise<boolean> {
  try {
    const httpEndpoint = endpoint.replace(/^https:\/\//, 'http://');
    const res = await fetch(httpEndpoint, {
      method: 'HEAD',
      signal: AbortSignal.timeout(5000),
    });
    return res.status < 500;
  } catch {
    return false;
  }
}
