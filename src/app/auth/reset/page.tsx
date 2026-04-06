'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { createClient } from '@/lib/supabase/client';

export default function ResetPasswordPage() {
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [done, setDone] = useState(false);
  const supabase = createClient();
  const router = useRouter();

  useEffect(() => {
    // Supabase handles the token exchange automatically via the URL hash
    supabase.auth.onAuthStateChange((event) => {
      if (event === 'PASSWORD_RECOVERY') {
        // User is now in password recovery mode
      }
    });
  }, []);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    setError('');
    const { error } = await supabase.auth.updateUser({ password });
    if (error) setError(error.message);
    else {
      setDone(true);
      setTimeout(() => router.push('/logs'), 2000);
    }
    setLoading(false);
  }

  return (
    <div className="min-h-dvh flex flex-col items-center justify-center px-6" style={{ background: 'var(--pl-bg)' }}>
      <div className="w-full max-w-sm pl-card pl-fade-in">
        <div className="text-center mb-6">
          <div className="text-3xl mb-2">🔑</div>
          <h1 className="text-lg font-bold" style={{ color: 'var(--pl-text)' }}>新しいパスワード</h1>
          <p className="text-xs mt-1" style={{ color: 'var(--pl-text-3)' }}>新しいパスワードを入力してください</p>
        </div>

        {done ? (
          <div className="text-center py-4">
            <div className="text-2xl mb-2">✅</div>
            <p className="text-sm" style={{ color: 'var(--pl-success)' }}>パスワードを変更しました。リダイレクト中...</p>
          </div>
        ) : (
          <form onSubmit={handleSubmit} className="space-y-3">
            <input type="password" value={password} onChange={(e) => setPassword(e.target.value)}
              className="pl-input" placeholder="新しいパスワード（6文字以上）" required minLength={6} autoComplete="new-password" />
            {error && (
              <div className="text-sm px-3 py-2 rounded-lg" style={{ background: 'var(--pl-danger-soft)', color: 'var(--pl-danger)' }}>
                {error}
              </div>
            )}
            <button type="submit" disabled={loading} className="pl-btn pl-btn-primary">
              {loading ? '変更中...' : 'パスワードを変更'}
            </button>
          </form>
        )}
      </div>
    </div>
  );
}
