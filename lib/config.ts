// lib/config.ts — Centralized application configuration
// All magic strings (URLs, cookie names, paths) live here so they can be
// changed in one place rather than scattered across the codebase.

export const config = {
  /** Base URL for the backend API (BlueFairy). */
  apiBaseUrl: process.env.NEXT_PUBLIC_API_URL || 'https://bluefairy-n68eu.ondigitalocean.app',

  /** URL of the Aware dashboard app. */
  dashboardUrl: process.env.NEXT_PUBLIC_DASHBOARD_URL || 'https://dashboard.wareit.ai',

  /** Name of the HTTP-only cookie that stores the access JWT. */
  cookieName: 'token',

  /** Name of the HTTP-only cookie that stores the refresh token. */
  refreshCookieName: 'aware_refresh',

  /** Routes that are considered "auth" pages (login / signup). */
  authPaths: ['/', '/login', '/signup'],
} as const;
