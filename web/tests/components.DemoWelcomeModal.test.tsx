import React from 'react';
import { render, screen, act, fireEvent, waitFor } from '@testing-library/react';
import { vi, beforeEach, afterEach } from 'vitest';

vi.mock('../lib/demoAuth', () => ({
  getDemoSession: vi.fn(),
}));

import { getDemoSession } from '../lib/demoAuth';
import DemoWelcomeModal from '../components/ui/DemoWelcomeModal';

const SEEN_KEY = 'demoWelcomeSeen';

describe('DemoWelcomeModal', () => {
  beforeEach(() => {
    localStorage.clear();
    vi.mocked(getDemoSession).mockReturnValue(null);
  });

  afterEach(() => {
    vi.clearAllMocks();
  });

  test('opens when not yet seen and no demo session', async () => {
    render(<DemoWelcomeModal />);
    expect(await screen.findByRole('dialog')).toBeInTheDocument();
  });

  test('stays closed when already seen in localStorage', () => {
    localStorage.setItem(SEEN_KEY, '1');
    render(<DemoWelcomeModal />);
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
  });

  test('stays closed when a demo session is already active', () => {
    vi.mocked(getDemoSession).mockReturnValue({ user: 'demo' } as any);
    render(<DemoWelcomeModal />);
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
  });

  test('dismiss closes the modal and writes localStorage', async () => {
    render(<DemoWelcomeModal />);
    const dialog = await screen.findByRole('dialog');
    expect(dialog).toBeInTheDocument();

    const dismissBtn = screen.getByRole('button', { name: /got it/i });
    fireEvent.click(dismissBtn);

    await waitFor(() => expect(screen.queryByRole('dialog')).not.toBeInTheDocument());
    expect(localStorage.getItem(SEEN_KEY)).toBe('1');
  });

  test('demoAuthChanged event closes modal and writes localStorage', async () => {
    render(<DemoWelcomeModal />);
    expect(await screen.findByRole('dialog')).toBeInTheDocument();

    vi.mocked(getDemoSession).mockReturnValue({ user: 'demo' } as any);
    act(() => {
      window.dispatchEvent(new Event('demoAuthChanged'));
    });

    await waitFor(() => expect(screen.queryByRole('dialog')).not.toBeInTheDocument());
    expect(localStorage.getItem(SEEN_KEY)).toBe('1');
  });

  test('demoAuthChanged event with no session does not close modal', async () => {
    render(<DemoWelcomeModal />);
    expect(await screen.findByRole('dialog')).toBeInTheDocument();

    // getDemoSession still returns null — event should be a no-op
    act(() => {
      window.dispatchEvent(new Event('demoAuthChanged'));
    });

    expect(screen.getByRole('dialog')).toBeInTheDocument();
  });

  test('does not open when localStorage.getItem throws', () => {
    vi.spyOn(Storage.prototype, 'getItem').mockImplementation(() => {
      throw new Error('Storage disabled');
    });
    render(<DemoWelcomeModal />);
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
    vi.restoreAllMocks();
  });

  test('dismiss still closes modal even if localStorage.setItem throws', async () => {
    render(<DemoWelcomeModal />);
    expect(await screen.findByRole('dialog')).toBeInTheDocument();

    vi.spyOn(Storage.prototype, 'setItem').mockImplementation(() => {
      throw new Error('Storage disabled');
    });

    const dismissBtn = screen.getByRole('button', { name: /got it/i });
    fireEvent.click(dismissBtn);

    await waitFor(() => expect(screen.queryByRole('dialog')).not.toBeInTheDocument());
    vi.restoreAllMocks();
  });

  test('demoAuthChanged still closes modal even if localStorage.setItem throws', async () => {
    render(<DemoWelcomeModal />);
    expect(await screen.findByRole('dialog')).toBeInTheDocument();

    vi.spyOn(Storage.prototype, 'setItem').mockImplementation(() => {
      throw new Error('Storage disabled');
    });
    vi.mocked(getDemoSession).mockReturnValue({ user: 'demo' } as any);

    act(() => {
      window.dispatchEvent(new Event('demoAuthChanged'));
    });

    await waitFor(() => expect(screen.queryByRole('dialog')).not.toBeInTheDocument());
    vi.restoreAllMocks();
  });
});
