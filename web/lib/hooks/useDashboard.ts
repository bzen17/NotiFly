'use client';
import { useQuery } from '@tanstack/react-query';
import { api } from '../api';

export function useDashboardMetrics() {
  return function useRangeDashboard(range: string = '24h') {
    return useQuery({
      queryKey: ['dashboard', 'metrics', range],
      queryFn: async () => {
        const { data } = await api.get('/dashboard/metrics', { params: { range } });
        return data;
      },
    });
  };
}
