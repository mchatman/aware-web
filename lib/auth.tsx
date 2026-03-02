'use client';

import { createContext, useCallback, useContext, useEffect, useMemo, useState, type ReactNode } from 'react';
import type { AuthResponse, InstanceResponse, User } from './types';

// Use same-origin API routes to avoid CORS issues.
// Next.js API routes proxy to the real backend (api.wareit.ai).
const API_URL = '';

const STORAGE_KEYS = {
  accessToken: 'aware_access_token',
  refreshToken: 'aware_refresh_token',
  user: 'aware_user',
} as const;

type AuthContextValue = {
  user: User | null;
  accessToken: string | null;
  refreshToken: string | null;
  isAuthenticated: boolean;
  loading: boolean;
  instance: InstanceResponse | null;
  instanceLoading: boolean;
  login: (email: string, password: string) => Promise<void>;
  signup: (email: string, password: string) => Promise<void>;
  logout: () => void;
  fetchInstance: () => Promise<InstanceResponse | null>;
};

const AuthContext = createContext<AuthContextValue | null>(null);

export function useAuth(): AuthContextValue {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth must be used within AuthProvider');
  return ctx;
}

async function apiFetch<T>(path: string, opts?: RequestInit): Promise<T> {
  // Map backend paths to same-origin Next.js API routes
  const routeMap: Record<string, string> = {
    '/auth/login': '/api/auth/login',
    '/auth/signup': '/api/auth/signup',
    '/auth/refresh': '/api/auth/refresh',
    '/me': '/api/me',
    '/instance': '/api/instance',
  };
  const url = routeMap[path] || `/api${path}`;
  const res = await fetch(`${API_URL}${url}`, {
    headers: { 'Content-Type': 'application/json', ...opts?.headers },
    ...opts,
  });
  if (!res.ok) {
    const text = await res.text();
    // Try to extract message from JSON error response
    try {
      const parsed = JSON.parse(text);
      throw new Error(parsed.message || parsed.error || text);
    } catch (e) {
      // If JSON.parse failed (SyntaxError), use the raw text as the error
      if (e instanceof SyntaxError) throw new Error(text || res.statusText);
      // Otherwise re-throw (it's the Error we created above)
      throw e;
    }
  }
  return res.json();
}

function loadStored(): { user: User | null; accessToken: string | null; refreshToken: string | null } {
  if (typeof window === 'undefined') return { user: null, accessToken: null, refreshToken: null };
  try {
    const accessToken = localStorage.getItem(STORAGE_KEYS.accessToken);
    const refreshToken = localStorage.getItem(STORAGE_KEYS.refreshToken);
    const raw = localStorage.getItem(STORAGE_KEYS.user);
    const user = raw ? (JSON.parse(raw) as User) : null;
    return { user, accessToken, refreshToken };
  } catch {
    return { user: null, accessToken: null, refreshToken: null };
  }
}

function saveTokens(accessToken: string, refreshToken: string, user: User) {
  localStorage.setItem(STORAGE_KEYS.accessToken, accessToken);
  localStorage.setItem(STORAGE_KEYS.refreshToken, refreshToken);
  localStorage.setItem(STORAGE_KEYS.user, JSON.stringify(user));
}

function clearTokens() {
  localStorage.removeItem(STORAGE_KEYS.accessToken);
  localStorage.removeItem(STORAGE_KEYS.refreshToken);
  localStorage.removeItem(STORAGE_KEYS.user);
}

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [accessToken, setAccessToken] = useState<string | null>(null);
  const [refreshToken, setRefreshToken] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [instance, setInstance] = useState<InstanceResponse | null>(null);
  const [instanceLoading, setInstanceLoading] = useState(false);

  const doRefresh = useCallback(async (rt: string): Promise<{ accessToken: string; refreshToken: string; user: User } | null> => {
    try {
      const data = await apiFetch<AuthResponse>('/auth/refresh', {
        method: 'POST',
        body: JSON.stringify({ refreshToken: rt }),
      });
      saveTokens(data.accessToken, data.refreshToken, data.user);
      setAccessToken(data.accessToken);
      setRefreshToken(data.refreshToken);
      setUser(data.user);
      return { accessToken: data.accessToken, refreshToken: data.refreshToken, user: data.user };
    } catch {
      clearTokens();
      setAccessToken(null);
      setRefreshToken(null);
      setUser(null);
      return null;
    }
  }, []);

  // Validate stored tokens on mount
  useEffect(() => {
    (async () => {
      const stored = loadStored();
      if (!stored.accessToken) {
        if (stored.refreshToken) {
          await doRefresh(stored.refreshToken);
        }
        setLoading(false);
        return;
      }
      // Validate access token
      try {
        const me = await apiFetch<User>('/me', {
          headers: { Authorization: `Bearer ${stored.accessToken}` },
        });
        setUser(me);
        setAccessToken(stored.accessToken);
        setRefreshToken(stored.refreshToken);
      } catch {
        // Token expired — try refresh
        if (stored.refreshToken) {
          await doRefresh(stored.refreshToken);
        } else {
          clearTokens();
        }
      }
      setLoading(false);
    })();
  }, [doRefresh]);

  const login = useCallback(async (email: string, password: string) => {
    const data = await apiFetch<AuthResponse>('/auth/login', {
      method: 'POST',
      body: JSON.stringify({ email, password }),
    });
    saveTokens(data.accessToken, data.refreshToken, data.user);
    setAccessToken(data.accessToken);
    setRefreshToken(data.refreshToken);
    setUser(data.user);
  }, []);

  const signup = useCallback(async (email: string, password: string) => {
    const data = await apiFetch<AuthResponse>('/auth/signup', {
      method: 'POST',
      body: JSON.stringify({ email, password }),
    });
    saveTokens(data.accessToken, data.refreshToken, data.user);
    setAccessToken(data.accessToken);
    setRefreshToken(data.refreshToken);
    setUser(data.user);
  }, []);

  const logout = useCallback(() => {
    clearTokens();
    setUser(null);
    setAccessToken(null);
    setRefreshToken(null);
    setInstance(null);
  }, []);

  const fetchInstance = useCallback(async (): Promise<InstanceResponse | null> => {
    let token = accessToken;
    if (!token) return null;
    setInstanceLoading(true);
    try {
      const data = await apiFetch<InstanceResponse>('/instance', {
        headers: { Authorization: `Bearer ${token}` },
      });
      setInstance(data);
      return data;
    } catch (err: unknown) {
      // If 401, try refresh
      const msg = err instanceof Error ? err.message : '';
      if (msg.includes('Unauthorized') || msg.includes('401')) {
        if (refreshToken) {
          const refreshed = await doRefresh(refreshToken);
          if (refreshed) {
            try {
              const data = await apiFetch<InstanceResponse>('/instance', {
                headers: { Authorization: `Bearer ${refreshed.accessToken}` },
              });
              setInstance(data);
              return data;
            } catch {
              return null;
            }
          }
        }
      }
      return null;
    } finally {
      setInstanceLoading(false);
    }
  }, [accessToken, refreshToken, doRefresh]);

  const value = useMemo<AuthContextValue>(() => ({
    user,
    accessToken,
    refreshToken,
    isAuthenticated: !!accessToken && !!user,
    loading,
    instance,
    instanceLoading,
    login,
    signup,
    logout,
    fetchInstance,
  }), [user, accessToken, refreshToken, loading, instance, instanceLoading, login, signup, logout, fetchInstance]);

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}
