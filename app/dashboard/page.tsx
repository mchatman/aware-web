'use client';

import { useEffect, useState } from 'react';

/**
 * Dashboard page.
 *
 * Fetches instance info from /api/connect (server-side, JWT stays in
 * httpOnly cookie), then redirects the browser to the tenant workspace.
 * Shows retry UI if the instance isn't ready yet.
 */

type Status = 'loading' | 'redirecting' | 'error';

export default function Dashboard() {
  const [status, setStatus] = useState<Status>('loading');
  const [errorMessage, setErrorMessage] = useState('');

  useEffect(() => {
    connect();
  }, []);

  async function connect() {
    setStatus('loading');
    setErrorMessage('');

    try {
      const res = await fetch('/api/connect');

      if (res.status === 401) {
        window.location.href = '/';
        return;
      }

      if (!res.ok) {
        const body = await res.json().catch(() => ({ message: 'Unknown error' }));
        setErrorMessage(body.message || 'Failed to connect to workspace');
        setStatus('error');
        return;
      }

      const { endpoint, gateway_token } = await res.json();
      setStatus('redirecting');

      const target = new URL('/auth/callback', endpoint);
      target.searchParams.set('token', gateway_token);
      window.location.href = target.toString();
    } catch {
      setErrorMessage('Failed to connect to server');
      setStatus('error');
    }
  }

  if (status === 'error') {
    return (
      <div className="min-h-screen bg-black flex items-center justify-center">
        <div className="text-white text-center space-y-4">
          <p className="text-red-400">{errorMessage}</p>
          <button
            onClick={connect}
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
          <p>{status === 'redirecting' ? 'Redirecting…' : 'Opening your workspace…'}</p>
          <p className="text-sm text-gray-500">Please wait…</p>
        </div>
      </div>
    </div>
  );
}
