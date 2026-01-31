'use client';
import React from 'react';
import { usePathname, useRouter, useSearchParams, useParams } from 'next/navigation';
import { useCampaign, useCampaignDeliveries } from '../../../lib/hooks/useCampaigns';
import IconButton from '@mui/material/IconButton';
import Tooltip from '@mui/material/Tooltip';
import RefreshIcon from '@mui/icons-material/Refresh';
import ReplayIcon from '@mui/icons-material/Replay';
import Button from '@mui/material/Button';
import Snackbar from '@mui/material/Snackbar';
import Alert from '@mui/material/Alert';
import { useQueryClient } from '@tanstack/react-query';
import { api } from '../../../lib/api';
import CircularProgress from '@mui/material/CircularProgress';
import Loading from '../../../components/common/Loading';
import ErrorAlert from '../../../components/common/ErrorAlert';
import Box from '@mui/material/Box';
import Tabs from '@mui/material/Tabs';
import Tab from '@mui/material/Tab';
import Typography from '@mui/material/Typography';
import Chip from '@mui/material/Chip';
import { DataGrid, GridColDef } from '@mui/x-data-grid';
import { STATUS, ERRORS } from '../../../lib/constants';

export default function CampaignDetails() {
  const router = useRouter();
  const params = useParams() as { id?: string } | null;
  const id = params?.id ?? undefined;
  const { data, isLoading, isError } = useCampaign(id);
  const [tab, setTab] = React.useState(0);

  const deliveriesQuery = useCampaignDeliveries(id);
  const qc = useQueryClient();
  const [requeueLocks, setRequeueLocks] = React.useState<Record<string, number>>({});
  const [campaignRequeueLockedUntil, setCampaignRequeueLockedUntil] = React.useState<number | null>(
    null,
  );
  React.useEffect(() => {
    const t = setInterval(() => {
      setRequeueLocks((prev) => {
        const now = Date.now();
        const next: Record<string, number> = {};
        let changed = false;
        for (const k of Object.keys(prev)) {
          if (prev[k] > now) next[k] = prev[k];
          else changed = true;
        }
        return changed ? next : prev;
      });
      // clear campaign-level lock when expired
      setCampaignRequeueLockedUntil((prev) => {
        if (!prev) return prev;
        return prev > Date.now() ? prev : null;
      });
    }, 1000);
    return () => clearInterval(t);
  }, []);
  const [snack, setSnack] = React.useState<{
    open: boolean;
    message?: string;
    severity?: 'success' | 'error';
  }>({ open: false });
  const [loadingIds, setLoadingIds] = React.useState<Record<string, boolean>>({});
  const [campaignLoading, setCampaignLoading] = React.useState(false);

  if (!id) return <ErrorAlert message="Invalid campaign id" />;

  if (isLoading) return <Loading />;
  if (isError || !data) return <ErrorAlert message="Campaign not found" />;

  const deliveries = Array.isArray(deliveriesQuery.data)
    ? deliveriesQuery.data
    : (deliveriesQuery.data?.items ?? []);

  const columns: GridColDef[] = [
    { field: 'recipient', headerName: 'Recipient', flex: 1 },
    { field: 'channel', headerName: 'Channel', width: 120 },
    {
      field: 'status',
      headerName: 'Status',
      width: 140,
      renderCell: (params) => {
        const s = String(params.value || '').toLowerCase();
        let color: any = 'default';
        if (s === STATUS.DELIVERED || s === STATUS.DELIVERED) color = 'success';
        else if (s === STATUS.FAILED || s === STATUS.FAILED) color = 'error';
        else if (s === STATUS.REQUEUED) color = 'warning';
        return <Chip label={String(params.value || '')} color={color} size="small" />;
      },
    },
    {
      field: 'actions',
      headerName: 'Actions',
      width: 100,
      sortable: false,
      filterable: false,
      renderCell: (params) => {
        const rowId = params.row.id;
        const isLoading = !!loadingIds[rowId];
        const now = Date.now();
        const lockedTs =
          requeueLocks[rowId] ||
          (params.row.requeueLockedUntil ? new Date(params.row.requeueLockedUntil).getTime() : 0);
        // Disable requeue when delivered, or when status is 'requeued' and lock window hasn't expired
        const status = (params.row.status || '') as string;
        const isLocked = !!(lockedTs && lockedTs > now);
        let disabled = Boolean(isLoading || status?.toLowerCase() === STATUS.DELIVERED || isLocked);
        let tooltip =
          status?.toLowerCase() === STATUS.DELIVERED ? 'Already delivered' : 'Requeue delivery';
        if (isLocked) {
          const remainingMs = lockedTs - now;
          const secs = Math.ceil(remainingMs / 1000);
          const mins = Math.floor(secs / 60);
          const secRem = secs % 60;
          tooltip = `Requeued — try again in ${mins > 0 ? `${mins}m ` : ''}${secRem}s`;
        }

        return (
          <Tooltip title={tooltip}>
            <span>
              <IconButton
                size="small"
                sx={{ color: disabled ? 'rgba(0,0,0,0.26)' : 'primary.main' }}
                onClick={async () => {
                  try {
                    setLoadingIds((s) => ({ ...s, [rowId]: true }));
                    const res = await api.post(`/dlq/delivery-row/${rowId}/requeue`);
                    const locked = res.data?.requeueLockedUntil || params.row.requeueLockedUntil;
                    if (locked) {
                      setRequeueLocks((s) => ({ ...s, [rowId]: new Date(locked).getTime() }));
                    }
                    setSnack({ open: true, message: 'Requeued', severity: 'success' });
                    qc.invalidateQueries({ queryKey: ['campaign', id, 'deliveries', 1] });
                    qc.invalidateQueries({ queryKey: ['campaign', id] });
                  } catch (err: any) {
                    const locked =
                      err?.response?.data?.requeueLockedUntil || params.row.requeueLockedUntil;
                    if (locked)
                      setRequeueLocks((s) => ({ ...s, [rowId]: new Date(locked).getTime() }));
                    setSnack({
                      open: true,
                      message:
                        err?.response?.data?.error === ERRORS.LOCKED
                          ? 'Requeue locked'
                          : 'Failed to requeue',
                      severity: 'error',
                    });
                  } finally {
                    setLoadingIds((s) => ({ ...s, [rowId]: false }));
                  }
                }}
                disabled={disabled}
              >
                {isLoading ? <CircularProgress size={20} /> : <ReplayIcon />}
              </IconButton>
            </span>
          </Tooltip>
        );
      },
    },
    { field: 'attemptCount', headerName: 'Attempts', width: 100 },
    { field: 'lastError', headerName: 'Last Error', flex: 1 },
    { field: 'updatedAt', headerName: 'Updated At', width: 180 },
  ];

  return (
    <Box>
      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 2 }}>
        <Box sx={{ display: 'flex', gap: 1, alignItems: 'center' }}>
          <div>
            <Typography variant="h6">{data.name}</Typography>
          </div>
          <Chip label={data.status} color={data.status === 'FAILED' ? 'error' : 'primary'} />
        </Box>

        <Button
          variant="outlined"
          size="small"
          onClick={async () => {
            try {
              setCampaignLoading(true);
              const res = await api.post(`/dlq/campaign/${id}/requeue`);
              setSnack({
                open: true,
                message: `Requeued ${res.data.result?.requeued ?? 0}`,
                severity: 'success',
              });
              // apply locks returned from server for each row and campaign-level lock
              const locks = res.data?.result?.locks;
              const lockedUntil = res.data?.result?.lockedUntil;
              if (locks && typeof locks === 'object') {
                const mapped: Record<string, number> = {};
                for (const k of Object.keys(locks)) {
                  try {
                    mapped[k] = new Date((locks as any)[k]).getTime();
                  } catch (e) {
                    // ignore parse errors
                  }
                }
                setRequeueLocks((s) => ({ ...s, ...mapped }));
              }
              if (lockedUntil) {
                try {
                  setCampaignRequeueLockedUntil(new Date(lockedUntil).getTime());
                } catch (e) {
                  // ignore
                }
              } else if (!locks) {
                // fallback: disable all visible rows and campaign button for default lock window
                const DEFAULT_LOCK_MS = 10 * 60 * 1000;
                const until = Date.now() + DEFAULT_LOCK_MS;
                setRequeueLocks((s) => {
                  const next = { ...s };
                  for (const d of deliveries) {
                    next[String(d.id)] = until;
                  }
                  return next;
                });
                setCampaignRequeueLockedUntil(until);
              }

              qc.invalidateQueries({ queryKey: ['campaign', id, 'deliveries'] });
              qc.invalidateQueries({ queryKey: ['campaign', id] });
            } catch (err) {
              setSnack({ open: true, message: 'Failed to requeue campaign', severity: 'error' });
            } finally {
              setCampaignLoading(false);
            }
          }}
          disabled={
            campaignLoading ||
            (!!campaignRequeueLockedUntil && campaignRequeueLockedUntil > Date.now())
          }
          startIcon={campaignLoading ? <CircularProgress size={16} /> : <RefreshIcon />}
        >
          Requeue Failed
        </Button>
      </Box>

      <Tabs value={tab} onChange={(_, v) => setTab(v)}>
        <Tab label="Overview" />
        <Tab label="Deliveries" />
      </Tabs>

      {tab === 0 && (
        <Box sx={{ mt: 2 }}>
          <Typography>
            <strong>Created:</strong> {data.createdAt ? new Date(data.createdAt).toISOString() : ''}
          </Typography>
          <Typography>
            <strong>Total:</strong> {data.totalDeliveries}
          </Typography>
          <Typography>
            <strong>Success:</strong> {data.success}
          </Typography>
          <Typography>
            <strong>Failed:</strong> {data.failed}
          </Typography>
        </Box>
      )}

      {tab === 1 && (
        <Box sx={{ mt: 2, height: 600 }}>
          <DataGrid
            rows={deliveries.map((d: any, idx: number) => ({
              id: d.id ?? d._id ?? d.deliveryId ?? `delivery-${idx}`,
              ...d,
            }))}
            columns={columns}
            pageSizeOptions={[10, 25]}
            sx={{
              '& .MuiDataGrid-columnHeaders': { backgroundColor: '#eef2ff' },
              '& .MuiDataGrid-cell': { alignItems: 'center' },
            }}
          />
        </Box>
      )}

      <Snackbar open={snack.open} autoHideDuration={4000} onClose={() => setSnack({ open: false })}>
        <Alert
          onClose={() => setSnack({ open: false })}
          severity={snack.severity || 'success'}
          sx={{ width: '100%' }}
        >
          {snack.message}
        </Alert>
      </Snackbar>
    </Box>
  );
}
