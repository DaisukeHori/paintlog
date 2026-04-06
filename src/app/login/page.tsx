'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { createClient } from '@/lib/supabase/client';

type Mode = 'login' | 'signup' | 'reset';

export default function LoginPage() {
  const [mode, setMode] = useState<Mode>('login');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [message, setMessage] = useState('');
  const supabase = createClient();
  const router = useRouter();

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true); setError(''); setMessage('');
    if (mode === 'login') {
      const { error } = await supabase.auth.signInWithPassword({ email, password });
      if (error) setError(error.message); else router.push('/logs');
    } else if (mode === 'signup') {
      const { error } = await supabase.auth.signUp({ email, password });
      if (error) setError(error.message);
      else { setMessage('アカウントを作成しました。ログインしてください。'); setMode('login'); }
    } else {
      const { error } = await supabase.auth.resetPasswordForEmail(email, { redirectTo: 'https://paintlog.vercel.app/auth/reset' });
      if (error) setError(error.message);
      else setMessage('パスワードリセット用のメールを送信しました。');
    }
    setLoading(false);
  }

  return (
    <div className="min-h-dvh flex flex-col items-center justify-center px-6" style={{ background: 'var(--pl-bg)' }}>
      <div className="mb-8 text-center pl-fade-in">
        <div className="w-16 h-16 mx-auto mb-4 rounded-2xl flex items-center justify-center text-3xl" style={{ background: 'var(--pl-accent-soft)' }}>🎨</div>
        <h1 className="text-2xl font-bold tracking-tight">PaintLog</h1>
        <p className="text-sm mt-1" style={{ color: 'var(--pl-text-2)' }}>塗装技術データ管理</p>
      </div>

      <div className="w-full max-w-sm pl-card pl-fade-in" style={{ animationDelay: '0.08s' }}>
        <div className="flex gap-1 p-1 rounded-xl mb-5" style={{ background: 'var(--pl-surface-2)' }}>
          {([['login', 'ログイン'], ['signup', '新規登録'], ['reset', 'リセット']] as const).map(([m, label]) => (
            <button key={m} onClick={() => { setMode(m); setError(''); setMessage(''); }}
              className="flex-1 py-2.5 rounded-lg text-sm font-semibold transition-all"
              style={{ background: mode === m ? 'var(--pl-surface)' : 'transparent',
                color: mode === m ? 'var(--pl-accent)' : 'var(--pl-text-3)',
                boxShadow: mode === m ? '0 1px 3px rgba(0,0,0,0.08)' : 'none' }}>
              {label}
            </button>
          ))}
        </div>

        <form onSubmit={handleSubmit} className="space-y-3">
          <div>
            <label className="block text-xs font-semibold mb-1.5" style={{ color: 'var(--pl-text-2)' }}>メールアドレス</label>
            <input type="email" value={email} onChange={(e) => setEmail(e.target.value)}
              className="pl-input" placeholder="your@email.com" required autoComplete="email" />
          </div>
          {mode !== 'reset' && (
            <div>
              <label className="block text-xs font-semibold mb-1.5" style={{ color: 'var(--pl-text-2)' }}>パスワード</label>
              <input type="password" value={password} onChange={(e) => setPassword(e.target.value)}
                className="pl-input" placeholder="6文字以上" required minLength={6} autoComplete={mode === 'signup' ? 'new-password' : 'current-password'} />
            </div>
          )}
          {error && <div className="text-sm px-3 py-2.5 rounded-xl" style={{ background: 'var(--pl-danger-soft)', color: 'var(--pl-danger)' }}>{error}</div>}
          {message && <div className="text-sm px-3 py-2.5 rounded-xl" style={{ background: 'var(--pl-success-soft)', color: 'var(--pl-success)' }}>{message}</div>}
          <button type="submit" disabled={loading} className="pl-btn pl-btn-primary mt-1" style={{ opacity: loading ? 0.7 : 1 }}>
            {loading ? <span className="pl-pulse">処理中...</span> : mode === 'login' ? 'ログイン' : mode === 'signup' ? 'アカウント作成' : 'リセットメール送信'}
          </button>
        </form>
      </div>
    </div>
  );
}
