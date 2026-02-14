'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';

export default function Logout() {
  const router = useRouter();

  useEffect(() => {
    // Call logout API
    fetch('/api/auth/logout', { method: 'POST' })
      .then(() => {
        // Redirect to login page
        router.push('/');
      });
  }, [router]);

  return (
    <div className="min-h-screen bg-black flex items-center justify-center">
      <div className="text-white">Logging out...</div>
    </div>
  );
}