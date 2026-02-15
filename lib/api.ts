// lib/api.ts — Thin wrapper around `fetch` for backend API calls.
// Reduces boilerplate in API route handlers by centralising headers,
// URL construction, and error handling.

import { config } from './config';

export interface ApiResult<T> {
  data?: T;
  error?: string;
  status: number;
}

/**
 * Make a request to the backend API.
 *
 * @param path   — API path (e.g. "/auth/login")
 * @param options — Standard RequestInit; `Content-Type` defaults to JSON.
 */
export async function apiRequest<T>(
  path: string,
  options?: RequestInit,
): Promise<ApiResult<T>> {
  try {
    const res = await fetch(`${config.apiBaseUrl}${path}`, {
      headers: { 'Content-Type': 'application/json', ...options?.headers },
      ...options,
    });

    if (!res.ok) {
      const text = await res.text();
      return { error: text || res.statusText, status: res.status };
    }

    const data: T = await res.json();
    return { data, status: res.status };
  } catch {
    return { error: 'Network error', status: 0 };
  }
}
