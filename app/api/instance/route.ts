import { NextRequest, NextResponse } from 'next/server';
import { apiRequest } from '@/lib/api';
import { getAuthToken } from '@/lib/cookies';
import type { InstanceResponse } from '@/lib/types';

/**
 * GET /api/instance
 * Proxies the instance-lookup call to the backend, forwarding the user’s JWT.
 */
export async function GET(request: NextRequest) {
  try {
    const token = getAuthToken(request);

    if (!token) {
      return NextResponse.json({ message: 'Not authenticated' }, { status: 401 });
    }

    const { data, error, status } = await apiRequest<InstanceResponse>('/instance', {
      headers: { Authorization: `Bearer ${token}` },
    });

    if (error) {
      // Provide user-friendly messages for expected failure codes.
      const messages: Record<number, string> = {
        401: 'Session expired',
        404: 'No instance found. Please contact support.',
      };
      return NextResponse.json(
        { message: messages[status] || 'Failed to look up instance' },
        { status },
      );
    }

    return NextResponse.json(data);
  } catch (err) {
    console.error('Instance lookup error:', err);
    return NextResponse.json({ message: 'Failed to connect to server' }, { status: 500 });
  }
}
