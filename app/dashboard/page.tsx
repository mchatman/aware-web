'use client';

import { useEffect, useState } from 'react';

const DASHBOARD_URL = 'https://dashboard.wareit.ai';

export default function Dashboard() {
  const [status, setStatus] = useState<'loading' | 'redirecting' | 'error'>('loading');
  const [errorMessage, setErrorMessage] = useState('');

  useEffect(() => {
    async function redirect() {
      try {
        // Get a fresh token from the login cookie
        const response = await fetch('/api/auth/token');
        if (!response.ok) {
          // Not authenticated
          window.location.href = '/';
          return;
        }

        const { token } = await response.json();
        setStatus('redirecting');

        // Redirect to dashboard.wareit.ai with the JWT
        // The callback sets an HTTP-only cookie and redirects to /
        window.location.href = `${DASHBOARD_URL}/auth/callback?token=${encodeURIComponent(token)}`;
      } catch (err) {
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
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-white"></div>
          <p>Opening your workspace...</p>
          <p className="text-sm text-gray-500">Please wait...</p>
        </div>
      </div>
    </div>
  );
}
