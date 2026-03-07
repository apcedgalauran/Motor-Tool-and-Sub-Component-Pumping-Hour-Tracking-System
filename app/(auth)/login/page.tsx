'use client';

import { useState } from 'react';
import { signIn } from 'next-auth/react';
import { useRouter } from 'next/navigation';

export default function LoginPage() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const router = useRouter();

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError('');
    setLoading(true);
    try {
      const res = await signIn('credentials', { redirect: false, email, password });
      if (!res || res.error) {
        throw new Error(res?.error || 'Sign in failed');
      }
      router.push('/');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Sign in failed');
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-[#FAFAFA]">
      <div className="w-full max-w-sm mx-4">
        {/* Logo / Branding */}
        <div className="text-center mb-8">
          <div className="inline-flex items-center justify-center w-12 h-12 rounded-xl bg-[#9E9EB0]/10 border border-[#9E9EB0]/30 text-[#9E9EB0] text-xl font-bold mb-3">
            M
          </div>
          <h1 className="text-lg font-semibold text-[#121212] tracking-tight">Motor Tracker</h1>
          <p className="text-xs text-[#333333]/60 uppercase tracking-widest mt-0.5">Hour System</p>
        </div>

        {/* Sign In Card */}
        <div className="bg-[#F0F0F0] border border-[#D4D4D4] rounded-2xl p-8 shadow-sm">
          <h2 className="text-base font-semibold text-[#121212] mb-6">Sign in</h2>

          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label className="block text-xs font-medium text-[#333333] mb-1.5">Email</label>
              <input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
                placeholder="you@example.com"
                className="w-full bg-white border border-[#D4D4D4] rounded-lg px-3.5 py-2.5 text-sm text-[#121212] placeholder:text-[#A3A3A3] focus:outline-none focus:border-[#9E9EB0] focus:ring-2 focus:ring-[#9E9EB0]/20 transition-all"
              />
            </div>

            <div>
              <label className="block text-xs font-medium text-[#333333] mb-1.5">Password</label>
              <input
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
                placeholder="••••••••"
                className="w-full bg-white border border-[#D4D4D4] rounded-lg px-3.5 py-2.5 text-sm text-[#121212] placeholder:text-[#A3A3A3] focus:outline-none focus:border-[#9E9EB0] focus:ring-2 focus:ring-[#9E9EB0]/20 transition-all"
              />
            </div>

            {error && (
              <div className="bg-red-50 border border-red-200 text-red-600 text-xs rounded-lg px-3 py-2">
                {error}
              </div>
            )}

            <button
              type="submit"
              disabled={loading}
              className="w-full bg-[#9E9EB0] hover:bg-[#8A8A9F] active:bg-[#7A7A8F] text-white font-semibold text-sm py-2.5 rounded-lg transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed mt-2"
            >
              {loading ? (
                <span className="inline-flex items-center gap-2">
                  <svg className="animate-spin h-4 w-4" viewBox="0 0 24 24" fill="none">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
                  </svg>
                  Signing in...
                </span>
              ) : (
                'Sign in'
              )}
            </button>
          </form>
        </div>
      </div>
    </div>
  );
}
