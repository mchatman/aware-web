// lib/types.ts — Shared TypeScript interfaces

/** Authenticated user returned by the API. */
export interface User {
  id: string;
  email: string;
  display_name?: string;
  role: string;
}

/** Response payload from /auth/login and /auth/signup. */
export interface AuthResponse {
  user: User;
  accessToken: string;
  refreshToken: string;
  expiresAt: string;
  message?: string;
}

/** Response payload from /instance. */
export interface InstanceResponse {
  endpoint: string;
  name: string;
  gateway_token: string;
}

/** Generic API error shape returned by the backend. */
export interface ApiError {
  message: string;
}
