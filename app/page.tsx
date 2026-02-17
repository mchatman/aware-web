'use client';

import { Suspense, useState } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import Link from 'next/link';

/** Shape of the JSON body returned by /api/auth/login and /api/auth/signup. */
interface AuthResponseBody {
  message?: string;
}

/**
 * Home / Auth page.
 * Renders a combined Login + Sign-Up form. On success the user is redirected
 * to /dashboard where the external workspace is opened.
 */
export default function Home() {
  return (
    <Suspense>
      <AuthPage />
    </Suspense>
  );
}

function AuthPage() {
  const [isLogin, setIsLogin] = useState(true);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [rememberMe, setRememberMe] = useState(false);
  const searchParams = useSearchParams();
  const urlError = searchParams.get('error');
  const [error, setError] = useState(
    urlError === 'instance' ? 'Unable to connect to your workspace. Please try again.' : '',
  );
  const [loading, setLoading] = useState(false);
  const router = useRouter();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setLoading(true);

    const endpoint = isLogin ? '/api/auth/login' : '/api/auth/signup';

    try {
      const response = await fetch(endpoint, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, password }),
      });

      const data: AuthResponseBody = await response.json();

      if (!response.ok) {
        setError(data.message || 'Something went wrong');
        return;
      }

      // Authenticated — navigate to the dashboard loading screen.
      router.push('/dashboard');
    } catch {
      setError('Failed to connect to server');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-black font-sans text-gray-100 flex items-center justify-center overflow-hidden selection:bg-blue-500/30 selection:text-white relative">
      {/* Background effects */}
      <div className="absolute inset-0 z-0 bg-gradient-to-b from-black via-black/80 to-black/40"></div>
      <div className="absolute top-0 left-1/2 -translate-x-1/2 w-[800px] h-[400px] bg-blue-500/10 blur-[120px] rounded-full pointer-events-none"></div>

      {/* Bottom gradient line */}
      <div className="fixed bottom-0 left-0 right-0 h-[2px] opacity-30">
        <div className="h-full w-full bg-gradient-to-r from-teal-400 via-blue-500 to-purple-500"></div>
      </div>

      <div className="relative z-10 w-full max-w-md px-6">

        {/* Glass panel card */}
        <div className="backdrop-blur-[40px] bg-black/70 rounded-[2.5rem] p-10 shadow-2xl relative overflow-hidden group border border-white/10">
          <div className="absolute inset-0 border border-white/5 rounded-[2.5rem] pointer-events-none"></div>

          {/* Header */}
          <div className="flex flex-col items-center mb-10">
            <div className="w-16 h-16 rounded-2xl bg-black/40 border border-white/10 flex items-center justify-center mb-6 group-hover:border-blue-500/30 transition-colors duration-500">
              <svg className="w-8 h-8 text-blue-400" style={{filter: 'drop-shadow(0 0 15px rgba(59, 130, 246, 0.5))'}} fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
              </svg>
            </div>
            <h1 className="text-3xl font-extralight tracking-tight text-white mb-2">
              {isLogin ? 'Welcome Back' : 'Create Account'}
            </h1>
            <p className="text-sm text-gray-500 font-light tracking-wide">
              {isLogin ? 'Sign in to access your workspace' : 'Join the Aware platform'}
            </p>
          </div>

          {/* Error banner */}
          {error && (
            <div className="mb-6 p-3 bg-red-900/10 border border-red-500/20 rounded-2xl text-red-400 text-sm backdrop-blur">
              {error}
            </div>
          )}

          {/* Form */}
          <form onSubmit={handleSubmit} className="space-y-6">
            <div className="space-y-2">
              <label className="text-[10px] uppercase tracking-[0.2em] text-gray-500 ml-1 font-medium">
                Email
              </label>
              <div className="relative">
                <svg className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-blue-400/60" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M16 12a4 4 0 10-8 0 4 4 0 008 0zm0 0v1.5a2.5 2.5 0 005 0V12a9 9 0 10-9 9m4.5-1.206a8.959 8.959 0 01-4.5 1.207" />
                </svg>
                <input
                  type="email"
                  id="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="w-full py-4 pl-12 pr-4 rounded-2xl text-sm font-light text-white placeholder-gray-600 bg-white/[0.03] border border-white/10 transition-all duration-300 focus:border-blue-500 focus:bg-blue-500/[0.05] focus:shadow-[0_0_15px_rgba(59,130,246,0.15)] focus:outline-none"
                  placeholder="you@example.com"
                  required
                />
              </div>
            </div>

            <div className="space-y-2">
              <div className="flex justify-between items-center px-1">
                <label className="text-[10px] uppercase tracking-[0.2em] text-gray-500 font-medium">
                  Password
                </label>
                {isLogin && (
                  <Link className="text-[10px] uppercase tracking-widest hover:text-blue-400 transition-colors text-blue-400" href="#">
                    Forgot Password
                  </Link>
                )}
              </div>
              <div className="relative">
                <svg className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-blue-400/60" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M15 7a2 2 0 012 2m4 0a6 6 0 01-7.743 5.743L11 17H9v2H7v2H4a1 1 0 01-1-1v-2.586a1 1 0 01.293-.707l5.964-5.964A6 6 0 1121 9z" />
                </svg>
                <input
                  type="password"
                  id="password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="w-full py-4 pl-12 pr-4 rounded-2xl text-sm font-light text-white placeholder-gray-600 bg-white/[0.03] border border-white/10 transition-all duration-300 focus:border-blue-500 focus:bg-blue-500/[0.05] focus:shadow-[0_0_15px_rgba(59,130,246,0.15)] focus:outline-none"
                  placeholder={isLogin ? '••••••••' : 'Min. 8 characters'}
                  minLength={isLogin ? undefined : 8}
                  required
                />
              </div>
            </div>

            {isLogin && (
              <div className="flex items-center space-x-3 px-1">
                <input
                  className="w-4 h-4 rounded border-white/10 bg-white/5 text-blue-500 focus:ring-blue-500/20 transition-all"
                  id="remember"
                  type="checkbox"
                  checked={rememberMe}
                  onChange={(e) => setRememberMe(e.target.checked)}
                />
                <label className="text-xs text-gray-500 font-light cursor-pointer select-none" htmlFor="remember">
                  Keep session active
                </label>
              </div>
            )}

            <button
              type="submit"
              disabled={loading}
              className="w-full py-4 rounded-2xl text-white text-sm font-medium tracking-[0.15em] uppercase shadow-lg mt-4 bg-gradient-to-r from-teal-400 via-blue-500 to-purple-500 bg-[length:200%_200%] transition-all duration-400 hover:bg-right-center hover:shadow-[0_0_25px_rgba(59,130,246,0.4)] hover:-translate-y-[1px] disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {loading ? 'Please wait…' : isLogin ? 'Sign In' : 'Create Account'}
            </button>
          </form>

          {/* Footer */}
          <div className="mt-10 pt-8 border-t border-white/5 text-center">
            <p className="text-xs text-gray-500 font-light">
              {isLogin ? "Don't have an account? " : "Already have an account? "}
              <button
                onClick={() => setIsLogin(!isLogin)}
                className="font-medium hover:underline underline-offset-4 ml-1 text-blue-400"
              >
                {isLogin ? 'Sign Up' : 'Sign In'}
              </button>
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
