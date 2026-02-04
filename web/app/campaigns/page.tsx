'use client';
import React from 'react';
import { DataGrid, GridColDef } from '@mui/x-data-grid';
import Box from '@mui/material/Box';
import Button from '@mui/material/Button';
import Card from '@mui/material/Card';
import CardContent from '@mui/material/CardContent';
import Chip from '@mui/material/Chip';
import Stack from '@mui/material/Stack';
import { useTheme } from '@mui/material/styles';
import useMediaQuery from '@mui/material/useMediaQuery';
import Loading from '../../components/common/Loading';
import ErrorAlert from '../../components/common/ErrorAlert';
import { useCampaigns } from '../../lib/hooks/useCampaigns';
import { useRouter } from 'next/navigation';
import Typography from '@mui/material/Typography';

export default function CampaignsPage() {
  const { data, isLoading, isError } = useCampaigns();
  const router = useRouter();

  const theme = useTheme();
  const isMobile = useMediaQuery(theme.breakpoints.down('sm'));

  if (isLoading) return <Loading />;
  if (isError) return <ErrorAlert message="Failed to load campaigns" />;

  const list = Array.isArray(data) ? data : (data?.items ?? []);
  const rows = list.map((c: any, idx: number) => ({
    id: c.campaignId,
    name: c.name,
    createdAt: c.createdAt ? new Date(c.createdAt).getTime() : null,
    status: c.status,
    totalDeliveries: c.totalDeliveries,
    success: c.success,
    failed: c.failed,
  }));


  const columns: GridColDef[] = [
    { field: 'name', headerName: 'Campaign Name', flex: 1 },
    {
      field: 'createdAt',
      headerName: 'Created At',
      width: 200,
      renderCell: (params) => (
        <Typography variant="caption">
          {params.value ? new Date(params.value as number).toLocaleString() : ''}
        </Typography>
      ),
    },
    { field: 'status', headerName: 'Status', width: 140 },
    { field: 'totalDeliveries', headerName: 'Total', width: 100 },
    { field: 'success', headerName: 'Success', width: 100 },
    { field: 'failed', headerName: 'Failed', width: 100 },
  ];

  return (
    <Box>
      <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 2, alignItems: 'center' }}>
        <Typography variant="h6">Campaigns</Typography>
        <Box sx={{ display: 'flex', alignItems: 'center' }}>
          <Button variant="contained" onClick={() => router.push('/campaigns/new')}>
            New Campaign
          </Button>
        </Box>
      </Box>

      {isMobile ? (
        <Stack spacing={2}>
          {rows.map((r: any) => (
            <Card
              key={r.id}
              variant="outlined"
              sx={{ borderRadius: 2 }}
              onClick={() => router.push(`/campaigns/${r.id}`)}
            >
              <CardContent sx={{ display: 'flex', gap: 2, alignItems: 'center', px: 2, py: 1.5 }}>
                <Box sx={{ flex: 1, minWidth: 0 }}>
                  <Typography noWrap variant="subtitle1" sx={{ fontWeight: 600 }} title={r.name}>
                    {r.name}
                  </Typography>
                  <Typography variant="caption" color="text.secondary">
                    {r.createdAt}
                  </Typography>
                </Box>
                <Box
                  sx={{
                    display: 'flex',
                    flexDirection: 'column',
                    alignItems: 'flex-end',
                    gap: 0.5,
                  }}
                >
                  <Chip label={r.status} size="small" />
                  <Typography variant="caption" color="text.secondary">
                    {r.totalDeliveries ?? 0}
                  </Typography>
                </Box>
              </CardContent>
            </Card>
          ))}
        </Stack>
      ) : (
        <div style={{ height: '60vh', maxHeight: 800, width: '100%' }}>
          <DataGrid
            rows={rows}
            columns={columns}
            pageSizeOptions={[10, 25, 50]}
            onRowClick={(params) => router.push(`/campaigns/${params.id}`)}
          />
        </div>
      )}
    </Box>
  );
}
