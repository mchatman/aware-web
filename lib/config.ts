// lib/config.ts — Centralised application configuration.
// All magic strings (URLs, cookie names) live here so they can be
// changed in one place rather than scattered across the codebase.

const apiBaseUrl = process.env.NEXT_PUBLIC_API_URL ?? '';

if (!apiBaseUrl) {
  console.warn(
    'WARNING: NEXT_PUBLIC_API_URL is not set. API requests will fail.',
  );
}

export const config = {
  /** Base URL for the backend API (BlueFairy). */
  apiBaseUrl,

  /** Name of the HTTP-only cookie that stores the access JWT. */
  cookieName: 'token',

  /** Name of the HTTP-only cookie that stores the refresh token. */
  refreshCookieName: 'aware_refresh',
} as const;
