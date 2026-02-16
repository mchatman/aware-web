'use client';

import { useEffect } from 'react';

/**
 * Dashboard page.
 *
 * Thin loading screen that immediately hands off to /api/connect,
 * which performs the instance lookup and redirect entirely server-side.
 * The JWT never leaves the httpOnly cookie.
 */
export default function Dashboard() {
  useEffect(() => {
    window.location.href = '/api/connect';
  }, []);

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
