import { NextRequest, NextResponse } from 'next/server';
import { apiRequest } from '@/lib/api';
import { getAuthToken } from '@/lib/cookies';
import { config } from '@/lib/config';
import type { InstanceResponse } from '@/lib/types';

/**
 * GET /api/connect
 *
 * Resolves the user's tenant instance and returns a workspace URL
 * that goes through bluefairy's reverse proxy on api.wareit.ai.
 * The browser redirects there directly (no iframe).
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

  if (!ready) {
    return NextResponse.json({ ready: false }, { status: 202 });
  }

  // Redirect through bluefairy's workspace proxy.
  // No iframe — the browser navigates directly to api.wareit.ai/workspace/
  // which reverse-proxies to the tenant over HTTP internally.
  const workspaceUrl = `${config.apiBaseUrl}/workspace/?token=${encodeURIComponent(token)}`;

  return NextResponse.json({ workspace_url: workspaceUrl, ready: true });
}

/** Quick health check over HTTP to avoid self-signed cert issues. */
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
