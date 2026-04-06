import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import LoginPage from '@/app/login/page';

const mockSignIn = vi.fn();
const mockSignUp = vi.fn();
const mockResetPassword = vi.fn();
const mockPush = vi.fn();

vi.mock('@/lib/supabase/client', () => ({
  createClient: () => ({
    auth: {
      signInWithPassword: mockSignIn,
      signUp: mockSignUp,
      resetPasswordForEmail: mockResetPassword,
    },
  }),
}));
vi.mock('next/navigation', () => ({
  useRouter: () => ({ push: mockPush, refresh: vi.fn() }),
}));

describe('ログイン画面', () => {
  beforeEach(() => { vi.clearAllMocks(); });

  function getEmailInput() { return screen.getAllByRole('textbox')[0] as HTMLInputElement; }
  function getPasswordInput() { return document.querySelector('input[type="password"]') as HTMLInputElement; }
  function getSubmitButton() { return document.querySelector('button[type="submit"]') as HTMLButtonElement; }

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
    expect(getPasswordInput().type).toBe('password');
  });

  it('ログインボタンがある', () => {
    render(<LoginPage />);
    expect(getSubmitButton()).toBeTruthy();
    expect(getSubmitButton().textContent).toContain('ログイン');
  });

  it('ログイン成功で/logsに遷移する', async () => {
    mockSignIn.mockResolvedValue({ error: null });
    render(<LoginPage />);
    fireEvent.change(getEmailInput(), { target: { value: 'test@example.com' } });
    fireEvent.change(getPasswordInput(), { target: { value: 'password123' } });
    fireEvent.submit(getSubmitButton());
    await waitFor(() => expect(mockPush).toHaveBeenCalledWith('/logs'));
  });

  it('ログイン失敗でエラーメッセージを表示する', async () => {
    mockSignIn.mockResolvedValue({ error: { message: 'Invalid login credentials' } });
    render(<LoginPage />);
    fireEvent.change(getEmailInput(), { target: { value: 'bad@example.com' } });
    fireEvent.change(getPasswordInput(), { target: { value: 'wrong' } });
    fireEvent.submit(getSubmitButton());
    await waitFor(() => expect(screen.getByText('Invalid login credentials')).toBeInTheDocument());
  });

  it('ログイン中はボタンテキストが変わる', async () => {
    mockSignIn.mockImplementation(() => new Promise(() => {}));
    render(<LoginPage />);
    fireEvent.change(getEmailInput(), { target: { value: 'test@example.com' } });
    fireEvent.change(getPasswordInput(), { target: { value: 'pass' } });
    fireEvent.submit(getSubmitButton());
    await waitFor(() => expect(screen.getByText('処理中...')).toBeInTheDocument());
  });

  it('メール欄がrequired', () => {
    render(<LoginPage />); expect(getEmailInput().required).toBe(true);
  });

  it('パスワード欄がrequired', () => {
    render(<LoginPage />); expect(getPasswordInput().required).toBe(true);
  });

  it('パスワードがマスクされている', () => {
    render(<LoginPage />); expect(getPasswordInput().type).toBe('password');
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

  it('タッチ操作に対応（submitボタン）', () => {
    render(<LoginPage />);
    expect(getSubmitButton().className).toContain('pl-btn');
  });

  it('新規登録タブがある', () => {
    render(<LoginPage />);
    expect(screen.getByText('新規登録')).toBeInTheDocument();
  });

  it('リセットタブがある', () => {
    render(<LoginPage />);
    expect(screen.getByText('リセット')).toBeInTheDocument();
  });

  it('新規登録タブでアカウント作成ボタンが表示される', () => {
    render(<LoginPage />);
    fireEvent.click(screen.getByText('新規登録'));
    expect(getSubmitButton().textContent).toContain('アカウント作成');
  });
});
