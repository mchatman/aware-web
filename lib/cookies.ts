// lib/cookies.ts — Helpers for reading / writing auth cookies.
// Next.js API‑route handlers use NextResponse.cookies (edge-compatible),
// so these helpers accept a NextResponse and mutate it in place.

import { NextRequest, NextResponse } from 'next/server';
import { config } from './config';

const COOKIE_OPTS = {
  httpOnly: true,
  secure: true,
  sameSite: 'lax' as const,
  path: '/',
};

/** Attach an access-token cookie to the outgoing response. */
export function setAccessTokenCookie(response: NextResponse, accessToken: string): void {
  response.cookies.set(config.cookieName, accessToken, {
    ...COOKIE_OPTS,
    maxAge: 60 * 60 * 24 * 7, // 7 days
  });
}

/** Attach a refresh-token cookie to the outgoing response. */
export function setRefreshTokenCookie(response: NextResponse, refreshToken: string): void {
  response.cookies.set(config.refreshCookieName, refreshToken, {
    ...COOKIE_OPTS,
    maxAge: 60 * 60 * 24 * 30, // 30 days
  });
}

/** Set both access & refresh token cookies on the response. */
export function setAuthCookies(
  response: NextResponse,
  accessToken: string,
  refreshToken?: string,
): void {
  setAccessTokenCookie(response, accessToken);
  if (refreshToken) {
    setRefreshTokenCookie(response, refreshToken);
  }
}

/** Clear all auth cookies (used on logout). */
export function clearAuthCookies(response: NextResponse): void {
  response.cookies.set(config.cookieName, '', { ...COOKIE_OPTS, maxAge: 0 });
  response.cookies.set(config.refreshCookieName, '', { ...COOKIE_OPTS, maxAge: 0 });
}

/** Read the access token from the incoming request cookies. */
export function getAuthToken(request: NextRequest): string | undefined {
  return request.cookies.get(config.cookieName)?.value;
}
