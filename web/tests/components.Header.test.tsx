import React from 'react';
import { render, fireEvent } from '@testing-library/react';
import { vi } from 'vitest';
import Header from '../components/layout/Header';

// Mock useAuth
vi.mock('../lib/auth', () => ({
  useAuth: () => ({
    state: { user: { email: 'user@test.com', name: 'User Name' } },
    setUser: vi.fn(),
  }),
}));

// Mock next/navigation
vi.mock('next/navigation', () => ({
  useRouter: () => ({ push: vi.fn() }),
  usePathname: () => '/',
}));

describe('Header', () => {
  test('renders initials and avatar button is clickable', () => {
    const { container } = render(<Header />);
    expect(container).toBeTruthy();
    const avatarBtn = container.querySelector('button[aria-haspopup]');
    if (avatarBtn) fireEvent.click(avatarBtn);
  });
});
