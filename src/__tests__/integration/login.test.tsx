import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import LoginPage from '@/app/login/page';

const mockSignIn = vi.fn();
const mockPush = vi.fn();

vi.mock('@/lib/supabase/client', () => ({
  createClient: () => ({
    auth: { signInWithPassword: mockSignIn },
  }),
}));
vi.mock('next/navigation', () => ({
  useRouter: () => ({ push: mockPush, refresh: vi.fn() }),
}));

describe('ログイン画面', () => {
  beforeEach(() => { vi.clearAllMocks(); });

  function getEmailInput() { return screen.getAllByRole('textbox')[0] as HTMLInputElement; }
  function getPasswordInput() { return document.querySelector('input[type="password"]') as HTMLInputElement; }

  it('タイトル「PaintLog」を表示する', () => {
    render(<LoginPage />);
    expect(screen.getByText('PaintLog')).toBeInTheDocument();
  });

  it('サブタイトルを表示する', () => {
    render(<LoginPage />);
    expect(screen.getByText('塗装技術データ管理')).toBeInTheDocument();
  });

  it('メールアドレス入力欄がある', () => {
    render(<LoginPage />);
    expect(getEmailInput()).toBeTruthy();
    expect(getEmailInput().type).toBe('email');
  });

  it('パスワード入力欄がある', () => {
    render(<LoginPage />);
    expect(getPasswordInput()).toBeTruthy();
  });

  it('ログインボタンがある', () => {
    render(<LoginPage />);
    expect(screen.getByText('ログイン')).toBeInTheDocument();
  });

  it('ログイン成功で/logsに遷移する', async () => {
    mockSignIn.mockResolvedValue({ error: null });
    render(<LoginPage />);
    fireEvent.change(getEmailInput(), { target: { value: 'test@example.com' } });
    fireEvent.change(getPasswordInput(), { target: { value: 'password123' } });
    fireEvent.submit(screen.getByText('ログイン'));
    await waitFor(() => expect(mockPush).toHaveBeenCalledWith('/logs'));
  });

  it('ログイン失敗でエラーメッセージを表示する', async () => {
    mockSignIn.mockResolvedValue({ error: { message: 'Invalid' } });
    render(<LoginPage />);
    fireEvent.change(getEmailInput(), { target: { value: 'bad@example.com' } });
    fireEvent.change(getPasswordInput(), { target: { value: 'wrong' } });
    fireEvent.submit(screen.getByText('ログイン'));
    await waitFor(() => expect(screen.getByText(/正しくありません/)).toBeInTheDocument());
  });

  it('ログイン中はボタンテキストが変わる', async () => {
    mockSignIn.mockImplementation(() => new Promise(() => {}));
    render(<LoginPage />);
    fireEvent.change(getEmailInput(), { target: { value: 'test@example.com' } });
    fireEvent.change(getPasswordInput(), { target: { value: 'pass' } });
    fireEvent.submit(screen.getByText('ログイン'));
    await waitFor(() => expect(screen.getByText('ログイン中...')).toBeInTheDocument());
  });

  it('メール欄がrequired', () => {
    render(<LoginPage />);
    expect(getEmailInput().required).toBe(true);
  });

  it('パスワード欄がrequired', () => {
    render(<LoginPage />);
    expect(getPasswordInput().required).toBe(true);
  });

  it('パスワードがマスクされている', () => {
    render(<LoginPage />);
    expect(getPasswordInput().type).toBe('password');
  });

  it('メール欄がemailタイプ', () => {
    render(<LoginPage />);
    expect(getEmailInput().type).toBe('email');
  });

  it('autocomplete属性がある', () => {
    render(<LoginPage />);
    expect(getEmailInput().autocomplete).toBe('email');
    expect(getPasswordInput().autocomplete).toBe('current-password');
  });

  it('🎨アイコンが表示される', () => {
    render(<LoginPage />);
    expect(screen.getByText('🎨')).toBeInTheDocument();
  });

  it('タッチ操作に対応したクラスがある', () => {
    render(<LoginPage />);
    const btn = screen.getByText('ログイン');
    expect(btn.className).toContain('touch-manipulation');
  });
});
