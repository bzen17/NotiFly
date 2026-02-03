import React from 'react';
import { render, waitFor } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import * as apiMod from '../lib/api';
import { useDashboardMetrics } from '../lib/hooks/useDashboard';
import { vi } from 'vitest';

function Wrapper({ children }: any) {
  const qc = new QueryClient();
  return <QueryClientProvider client={qc}>{children}</QueryClientProvider>;
}

describe('useDashboardMetrics', () => {
  test('returns metrics for default range', async () => {
    vi.spyOn(apiMod.api, 'get').mockResolvedValue({ data: { visits: 10 } } as any);

    function Comp() {
      const dashboardQuery = useDashboardMetrics();
      const q = dashboardQuery();
      if (q.isLoading) return <div>loading</div>;
      return <div data-testid="metrics">{JSON.stringify(q.data)}</div>;
    }

    const { getByTestId } = render(
      <Wrapper>
        <Comp />
      </Wrapper>,
    );

    await waitFor(() => {
      const element = getByTestId('metrics');
      expect(element).toBeDefined();
      expect(JSON.parse(element.textContent || '{}')).toEqual({ visits: 10 });
    });
  });
});
