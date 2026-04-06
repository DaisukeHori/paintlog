import '@testing-library/jest-dom/vitest';
import { cleanup } from '@testing-library/react';
import { afterEach, vi } from 'vitest';

afterEach(() => {
  cleanup();
});

// Mock next/navigation
vi.mock('next/navigation', () => ({
  useRouter: () => ({
    push: vi.fn(),
    replace: vi.fn(),
    back: vi.fn(),
    refresh: vi.fn(),
    prefetch: vi.fn(),
  }),
  useParams: () => ({ id: 'test-id-123' }),
  usePathname: () => '/logs',
  redirect: vi.fn(),
}));

// Mock Supabase client
const mockFrom = vi.fn();
const mockAuth = {
  getUser: vi.fn().mockResolvedValue({
    data: { user: { id: 'user-123', email: 'test@example.com' } },
  }),
  signInWithPassword: vi.fn().mockResolvedValue({ error: null }),
  signOut: vi.fn().mockResolvedValue({ error: null }),
};

vi.mock('@/lib/supabase/client', () => ({
  createClient: () => ({
    from: mockFrom,
    auth: mockAuth,
  }),
}));

// Mock date-fns
vi.mock('date-fns', () => ({
  format: (date: Date, fmt: string) => {
    const d = new Date(date);
    return `${d.getMonth() + 1}/${d.getDate()} ${String(d.getHours()).padStart(2, '0')}:${String(d.getMinutes()).padStart(2, '0')}`;
  },
}));

// Expose mocks for tests
export { mockFrom, mockAuth };
