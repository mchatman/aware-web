import { NextRequest, NextResponse } from 'next/server';
import { apiRequest } from '@/lib/api';
import { setAuthCookies } from '@/lib/cookies';
import type { AuthResponse } from '@/lib/types';

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();

    const { data, error, status } = await apiRequest<AuthResponse>('/auth/login', {
      method: 'POST',
      body: JSON.stringify(body),
    });

    if (error) {
      // Attempt to parse the error body as JSON; fall back to a plain message.
      let payload: Record<string, unknown>;
      try {
        payload = JSON.parse(error);
      } catch {
        payload = { message: error };
      }
      return NextResponse.json(payload, { status });
    }

    const res = NextResponse.json(data);

    // Persist the JWT in an HTTP-only cookie so subsequent requests are authenticated.
    if (data?.accessToken) {
      setAuthCookies(res, data.accessToken, data.refreshToken);
    }

    return res;
  } catch (err) {
    console.error('Login error:', err);
    return NextResponse.json({ message: 'Internal server error' }, { status: 500 });
  }
}
