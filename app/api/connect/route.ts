import { NextRequest, NextResponse } from 'next/server';
import { apiRequest } from '@/lib/api';
import { getAuthToken } from '@/lib/cookies';
import { config } from '@/lib/config';
import type { InstanceResponse } from '@/lib/types';

/**
 * GET /api/connect
 *
 * Server-side endpoint that reads the JWT from the httpOnly cookie and
 * resolves the user's tenant instance. Returns a workspace URL that
 * goes through bluefairy's reverse proxy (avoiding self-signed cert
 * issues and keeping the tenant URL hidden from the browser).
 *
 * Returns:
 *   200 { workspace_url, ready: true }  — tenant is up
 *   202 { ready: false }                — tenant exists but not ready
 *   401 { message }                     — not authenticated
 *   502 { message }                     — lookup failed
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

  // Build the workspace URL through bluefairy's reverse proxy.
  // The iframe loads api.wareit.ai/workspace/ with the JWT as a query param.
  // Bluefairy authenticates and proxies to the tenant over HTTP internally.
  const workspaceUrl = `${config.apiBaseUrl}/workspace/?token=${encodeURIComponent(token)}`;

  return NextResponse.json({ workspace_url: workspaceUrl, ready: true });
}

/**
 * Quick health check — tries to reach the tenant endpoint.
 * Returns true if it responds with anything other than 502/503/504.
 *
 * Tenants may use self-signed certs behind the ingress, so we probe
 * over HTTP to avoid TLS verification failures in serverless.
 */
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
