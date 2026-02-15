'use client';

import { useEffect, useState } from 'react';

export default function Dashboard() {
  const [status, setStatus] = useState<'loading' | 'redirecting' | 'error'>('loading');
  const [errorMessage, setErrorMessage] = useState('');
  const [instanceUrl, setInstanceUrl] = useState('');

  useEffect(() => {
    async function loadInstance() {
      try {
        const response = await fetch('/api/instance');

        if (response.status === 401) {
          // Session expired, redirect to login
          window.location.href = '/logout';
          return;
        }

        if (!response.ok) {
          const data = await response.json();
          setErrorMessage(data.message || 'Failed to load your AI assistant');
          setStatus('error');
          return;
        }

        const data = await response.json();
        // Build redirect URL with gateway token for seamless auth
        const url = data.gateway_token
          ? `${data.endpoint}/?token=${data.gateway_token}`
          : data.endpoint;
        setInstanceUrl(url);
        setStatus('redirecting');

        // Redirect to the tenant instance
        window.location.href = url;
      } catch (err) {
        setErrorMessage('Failed to connect to server');
        setStatus('error');
      }
    }

    loadInstance();
  }, []);

  if (status === 'error') {
    return (
      <div className="min-h-screen bg-black flex items-center justify-center">
        <div className="text-white text-center space-y-4">
          <p className="text-red-400">{errorMessage}</p>
          <div className="space-x-4">
            <button
              onClick={() => { setStatus('loading'); window.location.reload(); }}
              className="text-blue-400 underline hover:text-blue-300"
            >
              Try again
            </button>
            <a
              href="/logout"
              className="text-gray-400 underline hover:text-gray-300"
            >
              Log out
            </a>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-black flex items-center justify-center">
      <div className="text-white">
        <div className="flex flex-col items-center space-y-4">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-white"></div>
          <p>{status === 'redirecting' ? 'Opening AI Assistant...' : 'Loading...'}</p>
          <p className="text-sm text-gray-500">Please wait...</p>
          {instanceUrl && (
            <a
              href={instanceUrl}
              className="text-sm text-blue-400 underline hover:text-blue-300 mt-4"
            >
              Click here if not redirected
            </a>
          )}
        </div>
      </div>
    </div>
  );
}
