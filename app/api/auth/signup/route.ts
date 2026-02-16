import { NextRequest, NextResponse } from 'next/server';
import { apiRequest } from '@/lib/api';
import { setAuthCookies } from '@/lib/cookies';
import type { AuthResponse } from '@/lib/types';

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();

    const { data, error, status } = await apiRequest<AuthResponse>('/auth/signup', {
      method: 'POST',
      body: JSON.stringify(body),
    });

    if (error) {
      let payload: Record<string, unknown>;
      try {
        payload = JSON.parse(error);
      } catch {
        payload = { message: error };
      }
      return NextResponse.json(payload, { status });
    }

    const res = NextResponse.json(data);

    if (data?.accessToken) {
      setAuthCookies(res, data.accessToken, data.refreshToken);
    }

    return res;
  } catch (err) {
    console.error('Signup error:', err);
    return NextResponse.json({ message: 'Internal server error' }, { status: 500 });
  }
}
