'use client';

import { useEffect, useState } from 'react';

/**
 * Dashboard page.
 *
 * This is a transient “loading” screen — it fetches the JWT from the
 * server-side cookie (via /api/auth/token), then redirects the browser to
 * the external dashboard app at NEXT_PUBLIC_DASHBOARD_URL, passing the
 * token in the query string so the dashboard can establish its own session.
 */

const DASHBOARD_URL = process.env.NEXT_PUBLIC_DASHBOARD_URL || 'https://dashboard.wareit.ai';

type Status = 'loading' | 'redirecting' | 'error';

export default function Dashboard() {
  const [status, setStatus] = useState<Status>('loading');
  const [errorMessage, setErrorMessage] = useState('');

  useEffect(() => {
    async function redirect() {
      try {
        // Retrieve the access token stored in the HTTP-only cookie.
        const response = await fetch('/api/auth/token');

        if (!response.ok) {
          // No valid session — send the user back to the login page.
          window.location.href = '/';
          return;
        }

        const { token } = await response.json();
        setStatus('redirecting');

        // Hand the JWT to the dashboard app via its /auth/callback endpoint.
        window.location.href = `${DASHBOARD_URL}/auth/callback?token=${encodeURIComponent(token)}`;
      } catch {
        setErrorMessage('Failed to connect to server');
        setStatus('error');
      }
    }

    redirect();
  }, []);

  if (status === 'error') {
    return (
      <div className="min-h-screen bg-black flex items-center justify-center">
        <div className="text-white text-center space-y-4">
          <p className="text-red-400">{errorMessage}</p>
          <button
            onClick={() => window.location.reload()}
            className="text-blue-400 underline hover:text-blue-300"
          >
            Try again
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-black flex items-center justify-center">
      <div className="text-white">
        <div className="flex flex-col items-center space-y-4">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-white" />
          <p>Opening your workspace…</p>
          <p className="text-sm text-gray-500">Please wait…</p>
        </div>
      </div>
    </div>
  );
}
