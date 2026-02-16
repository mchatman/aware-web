import { NextRequest, NextResponse } from 'next/server';
import { apiRequest } from '@/lib/api';
import { getAuthToken } from '@/lib/cookies';
import type { InstanceResponse } from '@/lib/types';

/**
 * GET /api/connect
 *
 * Server-side endpoint that reads the JWT from the httpOnly cookie and
 * resolves the user's tenant instance. Also probes the tenant to check
 * if it's actually ready before returning success.
 *
 * Returns:
 *   200 { endpoint, gateway_token, ready: true }  — tenant is up
 *   202 { endpoint, gateway_token, ready: false }  — tenant exists but not ready
 *   401 { message: "Not authenticated" }
 *   502 { message: "Failed to connect to workspace" }
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

  return NextResponse.json(
    {
      endpoint: data.endpoint,
      gateway_token: data.gateway_token,
      ready,
    },
    { status: ready ? 200 : 202 },
  );
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
    // Use HTTP to avoid self-signed cert issues on the k8s ingress.
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
