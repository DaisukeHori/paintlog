'use client';

import { useState } from 'react';
import { createClient } from '@/lib/supabase/client';
import { useRouter } from 'next/navigation';

export default function LoginPage() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const router = useRouter();
  const supabase = createClient();

  async function handleLogin(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    setError('');
    const { error } = await supabase.auth.signInWithPassword({ email, password });
    if (error) {
      setError('メールアドレスまたはパスワードが正しくありません');
      setLoading(false);
    } else {
      router.push('/logs');
      router.refresh();
    }
  }

  return (
    <div className="min-h-screen flex items-center justify-center px-6">
      <div className="w-full max-w-sm">
        <div className="text-center mb-8">
          <div className="text-4xl mb-2">🎨</div>
          <h1 className="text-2xl font-medium">PaintLog</h1>
          <p className="text-sm text-gray-500 mt-1">塗装技術データ管理</p>
        </div>
        <form onSubmit={handleLogin} className="space-y-4">
          <div>
            <label className="text-xs text-gray-500 mb-1 block">メールアドレス</label>
            <input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="w-full h-[48px] px-4 rounded-xl border border-gray-200 text-base touch-manipulation focus:outline-none focus:border-blue-400"
              required
              autoComplete="email"
            />
          </div>
          <div>
            <label className="text-xs text-gray-500 mb-1 block">パスワード</label>
            <input
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="w-full h-[48px] px-4 rounded-xl border border-gray-200 text-base touch-manipulation focus:outline-none focus:border-blue-400"
              required
              autoComplete="current-password"
            />
          </div>
          {error && (
            <div className="text-sm text-red-600 bg-red-50 rounded-xl px-4 py-2">
              {error}
            </div>
          )}
          <button
            type="submit"
            disabled={loading}
            className="w-full h-[48px] rounded-xl bg-blue-600 text-white font-medium touch-manipulation active:bg-blue-700 disabled:opacity-50"
          >
            {loading ? 'ログイン中...' : 'ログイン'}
          </button>
        </form>
      </div>
    </div>
  );
}
