'use client';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { api } from '../api';

export function useCampaigns() {
  return useQuery({
    queryKey: ['campaigns'],
    queryFn: async () => {
      const { data } = await api.get('/campaigns');
      return data;
    },
  });
}

export function useCreateCampaign() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (payload: any) => {
      const { data } = await api.post('/campaigns', payload);
      return data;
    },
    onSuccess() {
      qc.invalidateQueries(['campaigns']);
    },
  });
}

export function useCampaign(id?: string) {
  return useQuery({
    queryKey: ['campaign', id],
    queryFn: async () => {
      const { data } = await api.get(`/campaigns/${id}`);
      return data;
    },
    enabled: !!id,
  });
}

export function useCampaignDeliveries(id?: string, page = 1) {
  return useQuery({
    queryKey: ['campaign', id, 'deliveries', page],
    queryFn: async () => {
      const { data } = await api.get(`/campaigns/${id}/deliveries`, { params: { page } });
      return data;
    },
    enabled: !!id,
  });
}
