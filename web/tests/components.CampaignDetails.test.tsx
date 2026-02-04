import React from 'react';
import { render, waitFor } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { vi } from 'vitest';

// mock next/navigation before importing the page so the imported module uses the mock
vi.mock('next/navigation', () => ({
  useRouter: () => ({ push: vi.fn() }),
  useParams: () => ({ id: '1' }),
  usePathname: () => '/',
}));

import * as hooks from '../lib/hooks/useCampaigns';
import CampaignDetails from '../app/campaigns/[id]/page';

function Wrapper({ children }: any) {
  const qc = new QueryClient();
  return <QueryClientProvider client={qc}>{children}</QueryClientProvider>;
}

function setMatchMedia(matches: boolean) {
  // simple mock for window.matchMedia used by MUI's useMediaQuery
  // keep minimal API used by the lib
  Object.defineProperty(window, 'matchMedia', {
    writable: true,
    configurable: true,
    value: (query: string) => ({
      matches,
      media: query,
      onchange: null,
      addListener: () => {},
      removeListener: () => {},
      addEventListener: () => {},
      removeEventListener: () => {},
      dispatchEvent: () => false,
    }),
  });
}

describe('CampaignDetails header layout', () => {
  beforeEach(() => {
    // mock next/navigation hooks
    vi.mock('next/navigation', () => ({
      useRouter: () => ({ push: vi.fn() }),
      useParams: () => ({ id: '1' }),
    }));
  });

  test('desktop: Requeue button is before status chip', async () => {
    setMatchMedia(false); // desktop

    vi.spyOn(hooks, 'useCampaign').mockReturnValue({
      data: {
        id: '1',
        name: 'Test',
        status: 'FAILED',
        createdAt: Date.now(),
        totalDeliveries: 0,
        success: 0,
        failed: 2,
      },
      isLoading: false,
      isError: false,
    } as any);
    vi.spyOn(hooks, 'useCampaignDeliveries').mockReturnValue({ data: [], isLoading: false } as any);

    const { container, getByText } = render(
      <Wrapper>
        <CampaignDetails />
      </Wrapper>,
    );

    await waitFor(() => {
      const btnIndex = container.innerHTML.indexOf('Requeue Failed');
      const chipIndex = container.innerHTML.indexOf('FAILED');
      expect(btnIndex).toBeGreaterThan(-1);
      expect(chipIndex).toBeGreaterThan(-1);
      expect(btnIndex).toBeLessThan(chipIndex);
    });
  });

  test('mobile: Requeue button appears after status chip (on second row)', async () => {
    setMatchMedia(true); // mobile

    vi.spyOn(hooks, 'useCampaign').mockReturnValue({
      data: {
        id: '1',
        name: 'Test',
        status: 'FAILED',
        createdAt: Date.now(),
        totalDeliveries: 0,
        success: 0,
        failed: 2,
      },
      isLoading: false,
      isError: false,
    } as any);
    vi.spyOn(hooks, 'useCampaignDeliveries').mockReturnValue({ data: [], isLoading: false } as any);

    const { container } = render(
      <Wrapper>
        <CampaignDetails />
      </Wrapper>,
    );

    await waitFor(() => {
      const btnIndex = container.innerHTML.indexOf('Requeue Failed');
      const chipIndex = container.innerHTML.indexOf('FAILED');
      expect(btnIndex).toBeGreaterThan(-1);
      expect(chipIndex).toBeGreaterThan(-1);
      expect(btnIndex).toBeGreaterThan(chipIndex);
    });
  });
});
