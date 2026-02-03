import React from 'react';
import { render, waitFor } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import * as apiMod from '../lib/api';
import { useCampaigns } from '../lib/hooks/useCampaigns';
import { vi } from 'vitest';

function Wrapper({ children }: any) {
  const qc = new QueryClient();
  return <QueryClientProvider client={qc}>{children}</QueryClientProvider>;
}

describe('useCampaigns hook', () => {
  test('fetches and returns data', async () => {
    vi.spyOn(apiMod.api, 'get').mockResolvedValue({ data: { items: [] } } as any);

    function Comp() {
      const q = useCampaigns();
      if (q.isLoading) return <div>loading</div>;
      return <div data-testid="ok">{JSON.stringify(q.data)}</div>;
    }

    const { getByTestId } = render(
      <Wrapper>
        <Comp />
      </Wrapper>,
    );

    await waitFor(() => {
      const element = getByTestId('ok');
      expect(element).toBeDefined();
      expect(JSON.parse(element.textContent || '{}')).toEqual({ items: [] });
    });
  });
});
