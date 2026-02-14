'use client';

import { useEffect, useState } from 'react';

export default function Dashboard() {
  const [error, setError] = useState(false);

  useEffect(() => {
    // Get the auth token from cookie and redirect to bluefairy proxy
    const getCookie = (name: string) => {
      const value = `; ${document.cookie}`;
      const parts = value.split(`; ${name}=`);
      if (parts.length === 2) return parts.pop()?.split(';').shift();
      return null;
    };

    const token = getCookie('token');

    if (!token) {
      // No token, redirect to login
      window.location.href = '/';
      return;
    }

    // Redirect to bluefairy which will proxy to OpenClaw with authentication
    const backendUrl = 'https://bluefairy.fly.dev/gateway';

    console.log('Redirecting to backend via proxy:', { backendUrl, hasToken: !!token });

    // Add a timeout to prevent infinite waiting
    const timer = setTimeout(() => {
      setError(true);
    }, 5000);

    // Redirect to bluefairy proxy endpoint
    window.location.href = backendUrl;

    return () => clearTimeout(timer);
  }, []);

  if (error) {
    return (
      <div className="min-h-screen bg-black flex items-center justify-center">
        <div className="text-white text-center">
          <p className="mb-4">Unable to redirect automatically.</p>
          <a
            href="https://bluefairy.fly.dev/gateway"
            className="text-blue-400 underline hover:text-blue-300"
          >
            Click here to continue to AI Assistant
          </a>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-black flex items-center justify-center">
      <div className="text-white">
        <div className="flex flex-col items-center space-y-4">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-white"></div>
          <p>Redirecting to AI Assistant...</p>
          <p className="text-sm text-gray-500">Please wait...</p>
        </div>
      </div>
    </div>
  );
}