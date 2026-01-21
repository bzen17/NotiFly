'use client';
import React from 'react';
import { DataGrid, GridColDef } from '@mui/x-data-grid';
import Box from '@mui/material/Box';
import Button from '@mui/material/Button';
import Loading from '../../components/common/Loading';
import ErrorAlert from '../../components/common/ErrorAlert';
import { useCampaigns } from '../../lib/hooks/useCampaigns';
import { useRouter } from 'next/navigation';
import Typography from '@mui/material/Typography';

export default function CampaignsPage() {
  const { data, isLoading, isError } = useCampaigns();
  const router = useRouter();

  if (isLoading) return <Loading />;
  if (isError) return <ErrorAlert message="Failed to load campaigns" />;

  const list = Array.isArray(data) ? data : (data?.items ?? []);
  const rows = list.map((c: any, idx: number) => ({
    id: c.campaignId,
    name: c.name,
    createdAt: c.createdAt ? new Date(c.createdAt).toISOString() : '',
    status: c.status,
    totalDeliveries: c.totalDeliveries,
    success: c.success,
    failed: c.failed,
  }));

  const columns: GridColDef[] = [
    { field: 'name', headerName: 'Campaign Name', flex: 1 },
    { field: 'createdAt', headerName: 'Created At', width: 200 },
    { field: 'status', headerName: 'Status', width: 140 },
    { field: 'totalDeliveries', headerName: 'Total', width: 100 },
    { field: 'success', headerName: 'Success', width: 100 },
    { field: 'failed', headerName: 'Failed', width: 100 },
  ];

  return (
    <Box>
      <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 2 }}>
        <Typography variant="h6">Campaigns</Typography>
        <Box sx={{ display: 'flex', alignItems: 'center' }}>
          <Button variant="contained" onClick={() => router.push('/campaigns/new')}>
            New Campaign
          </Button>
        </Box>
      </Box>
      <div style={{ height: 600, width: '100%' }}>
        <DataGrid
          rows={rows}
          columns={columns}
          pageSizeOptions={[10, 25, 50]}
          onRowClick={(params) => router.push(`/campaigns/${params.id}`)}
        />
      </div>
    </Box>
  );
}
