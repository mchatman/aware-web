import { NextRequest, NextResponse } from 'next/server';
import { apiRequest } from '@/lib/api';
import { setAuthCookies } from '@/lib/cookies';
import type { AuthResponse } from '@/lib/types';

/**
 * Shared handler for login and signup routes.
 *
 * Both endpoints have identical logic — POST a JSON body to the backend,
 * set auth cookies on success, and return a sanitised response (tokens
 * are only stored in httpOnly cookies, never in the response body).
 */
export async function handleAuthRequest(
  request: NextRequest,
  apiPath: string,
  label: string,
): Promise<NextResponse> {
  try {
    const body = await request.json();

    const { data, error, status } = await apiRequest<AuthResponse>(apiPath, {
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

    // Strip tokens from the response body — they belong in cookies only.
    const { accessToken, refreshToken, ...safeData } = data!;

    const res = NextResponse.json(safeData);

    if (accessToken) {
      setAuthCookies(res, accessToken, refreshToken);
    }

    return res;
  } catch (err) {
    console.error(`${label} error:`, err);
    return NextResponse.json({ message: 'Internal server error' }, { status: 500 });
  }
}
