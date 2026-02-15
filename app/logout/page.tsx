'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';

/**
 * Logout page.
 * Calls the server-side logout endpoint to clear auth cookies, then
 * redirects the user back to the login page.
 */
export default function Logout() {
  const router = useRouter();

  useEffect(() => {
    fetch('/api/auth/logout', { method: 'POST' }).then(() => {
      router.push('/');
    });
  }, [router]);

  return (
    <div className="min-h-screen bg-black flex items-center justify-center">
      <div className="text-white">Logging out…</div>
    </div>
  );
}
