'use client';

import { useEffect, useRef, useState } from 'react';

/**
 * Dashboard page.
 *
 * Polls /api/connect until the tenant workspace is ready, then redirects
 * to the workspace proxy on api.wareit.ai. Shows a loading screen while
 * the workspace is being provisioned.
 */

type Status = 'loading' | 'redirecting' | 'error';

interface ConnectResponse {
  workspace_url?: string;
  ready?: boolean;
  message?: string;
}

const POLL_INTERVAL = 3000;

export default function Dashboard() {
  const [status, setStatus] = useState<Status>('loading');
  const [errorMessage, setErrorMessage] = useState('');
  const pollingRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    connect();
    return () => {
      if (pollingRef.current) clearTimeout(pollingRef.current);
    };
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

      const body: ConnectResponse = await res.json().catch(() => ({}));

      if (res.status >= 500) {
        setErrorMessage(body.message || 'Failed to connect to workspace');
        setStatus('error');
        return;
      }

      // Instance exists but tenant not ready yet — poll.
      if (!body.ready || res.status === 202) {
        pollingRef.current = setTimeout(connect, POLL_INTERVAL);
        return;
      }

      // Tenant is ready — redirect to workspace proxy.
      setStatus('redirecting');
      window.location.href = body.workspace_url!;
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
          <p>{status === 'redirecting' ? 'Opening workspace…' : 'Setting up your workspace…'}</p>
          <p className="text-sm text-gray-500">This usually takes just a few seconds.</p>
        </div>
      </div>
    </div>
  );
}
