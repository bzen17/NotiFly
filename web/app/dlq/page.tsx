'use client';
import React from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { api } from '../../lib/api';
import Loading from '../../components/common/Loading';
import ErrorAlert from '../../components/common/ErrorAlert';
import { DataGrid, GridColDef } from '@mui/x-data-grid';
import Box from '@mui/material/Box';
import Button from '@mui/material/Button';
import Dialog from '@mui/material/Dialog';
import DialogTitle from '@mui/material/DialogTitle';
import DialogActions from '@mui/material/DialogActions';
import Typography from '@mui/material/Typography';
import Table from '@mui/material/Table';
import TableBody from '@mui/material/TableBody';
import TableCell from '@mui/material/TableCell';
import TableHead from '@mui/material/TableHead';
import TableRow from '@mui/material/TableRow';
import TableContainer from '@mui/material/TableContainer';
import Paper from '@mui/material/Paper';
import Collapse from '@mui/material/Collapse';
import IconButton from '@mui/material/IconButton';
import KeyboardArrowDownIcon from '@mui/icons-material/KeyboardArrowDown';
import KeyboardArrowUpIcon from '@mui/icons-material/KeyboardArrowUp';
import Tooltip from '@mui/material/Tooltip';
import CircularProgress from '@mui/material/CircularProgress';

export default function DlqPage() {
  const qc = useQueryClient();
  const { data, isLoading, isError } = useQuery({
    queryKey: ['dlq'],
    queryFn: async () => {
      const { data } = await api.get('/dlq');
      return data;
    },
  });

  const deliveryRequeue = useMutation({
    mutationFn: async (rowId: string) => {
      const res = await api.post(`/dlq/delivery-row/${rowId}/requeue`);
      return { rowId, result: res.data };
    },
    onMutate: async (rowId: string) => {
      await qc.cancelQueries(['dlq']);
      const previous = qc.getQueryData(['dlq']) as any[] | undefined;
      qc.setQueryData(
        ['dlq'],
        previous?.filter((d) => d.id !== rowId),
      );
      return { previous };
    },
    onError: (err: any, rowId: any, context: any) => {
      const locked = err?.response?.data?.requeueLockedUntil;
      if (locked) setRequeueLocks((s) => ({ ...s, [rowId]: new Date(locked).getTime() }));
      if (context?.previous) qc.setQueryData(['dlq'], context.previous);
    },
    onSuccess: (data: any) => {
      const locked = data?.result?.requeueLockedUntil;
      if (locked) setRequeueLocks((s) => ({ ...s, [data.rowId]: new Date(locked).getTime() }));
    },
    onSettled: () => qc.invalidateQueries(['dlq']),
  });

  const campaignRequeue = useMutation({
    mutationFn: async (campaignId: string) => {
      const res = await api.post(`/dlq/campaign/${campaignId}/requeue`);
      return { campaignId, result: res.data };
    },
    onMutate: async (campaignId: string) => {
      await qc.cancelQueries(['dlq']);
      return {};
    },
    onError: (err: any) => {},
    onSuccess: (data: any) => {
      const locks = data?.result?.locks;
      if (locks && typeof locks === 'object') {
        const mapped: Record<string, number> = {};
        for (const k of Object.keys(locks)) {
          try {
            mapped[k] = new Date((locks as any)[k]).getTime();
          } catch (e) {}
        }
        setRequeueLocks((s) => ({ ...s, ...mapped }));
      }
    },
    onSettled: () => qc.invalidateQueries(['dlq']),
  });

  const [requeueLocks, setRequeueLocks] = React.useState<Record<string, number>>({});
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
    }, 1000);
    return () => clearInterval(t);
  }, []);

  const [confirmOpen, setConfirmOpen] = React.useState(false);
  const [selected, setSelected] = React.useState<{ type: 'delivery' | 'campaign'; id: string } | null>(
    null,
  );
  const [openMap, setOpenMap] = React.useState<Record<string, boolean>>({});
  const [clientNow, setClientNow] = React.useState<number | null>(null);

  React.useEffect(() => {
    setClientNow(Date.now());
    const t = setInterval(() => setClientNow(Date.now()), 1000);
    return () => clearInterval(t);
  }, []);

  if (isLoading) return <Loading />;
  if (isError) return <ErrorAlert message="Failed to load DLQ" />;

  const dlqList = Array.isArray(data) ? data : data?.items ?? [];

  // group by campaignId
  const groups: Record<string, any[]> = {};
  for (const r of dlqList) {
    const key = r.campaignId ?? r.campaign?._id ?? 'unknown';
    groups[key] = groups[key] || [];
    groups[key].push(r);
  }

  const campaignGroups = Object.keys(groups).map((k) => {
    const items = groups[k];
    const first = items[0] || {};
    const label = first.campaign?.name || first.campaignName || first.email || first.recipient || first.to || k;
    return { campaignId: k, label, items };
  });

  return (
    <Box>
      <Typography variant="h6" sx={{ mb: 2 }}>
        DLQ
      </Typography>

      <TableContainer component={Paper}>
        <Table>
          <TableHead>
            <TableRow>
              <TableCell />
              <TableCell>Campaign</TableCell>
              <TableCell>Deliveries</TableCell>
              <TableCell align="right">Action</TableCell>
            </TableRow>
          </TableHead>
          <TableBody>
            {campaignGroups.length === 0 && (
              <TableRow>
                <TableCell colSpan={4}>
                  <Typography sx={{ p: 2 }}>No DLQ entries</Typography>
                </TableCell>
              </TableRow>
            )}
            {campaignGroups.map((g) => {
              const open = !!openMap[g.campaignId];
              return (
                <React.Fragment key={g.campaignId}>
                  <TableRow>
                    <TableCell>
                      <IconButton size="small" onClick={() => setOpenMap((m) => ({ ...m, [g.campaignId]: !m[g.campaignId] }))}>
                        {open ? <KeyboardArrowUpIcon /> : <KeyboardArrowDownIcon />}
                      </IconButton>
                    </TableCell>
                    <TableCell>
                      <Typography variant="subtitle1">{g.label}</Typography>
                    </TableCell>
                    <TableCell>{g.items.length}</TableCell>
                    <TableCell align="right">
                      <Tooltip title="Requeue all failed deliveries for this campaign">
                        <span>
                          <Button
                            variant="outlined"
                            size="small"
                            onClick={() => {
                              setSelected({ type: 'campaign', id: g.campaignId });
                              setConfirmOpen(true);
                            }}
                          >
                            Requeue Campaign
                          </Button>
                        </span>
                      </Tooltip>
                    </TableCell>
                  </TableRow>

                  <TableRow>
                    <TableCell style={{ paddingBottom: 0, paddingTop: 0 }} colSpan={4}>
                      <Collapse in={open} timeout="auto" unmountOnExit>
                        <Box sx={{ margin: 1 }}>
                          <Table size="small">
                            <TableHead>
                              <TableRow>
                                <TableCell>Delivery ID</TableCell>
                                <TableCell>Channel</TableCell>
                                <TableCell>Error</TableCell>
                                <TableCell>Failed At</TableCell>
                                <TableCell align="right">Action</TableCell>
                              </TableRow>
                            </TableHead>
                            <TableBody>
                              {g.items.map((r: any) => {
                                const rowId = r.id ?? r._id ?? r.deliveryId;
                                const lockedTs = requeueLocks[rowId] || (r.requeueLockedUntil ? new Date(r.requeueLockedUntil).getTime() : 0);
                                const isLocked = clientNow ? !!(lockedTs && lockedTs > clientNow) : false;
                                return (
                                  <TableRow key={rowId}>
                                    <TableCell>{rowId}</TableCell>
                                    <TableCell>{r.channel}</TableCell>
                                    <TableCell>{r.errorReason}</TableCell>
                                    <TableCell>{r.failedAt ? new Date(r.failedAt).toISOString() : ''}</TableCell>
                                    <TableCell align="right">
                                      <Tooltip title={isLocked ? 'Requeued — try again later' : 'Requeue delivery'}>
                                        <span>
                                          <Button
                                            variant="outlined"
                                            size="small"
                                            onClick={() => {
                                              setSelected({ type: 'delivery', id: String(rowId) });
                                              setConfirmOpen(true);
                                            }}
                                            disabled={isLocked}
                                          >
                                            Requeue
                                          </Button>
                                        </span>
                                      </Tooltip>
                                    </TableCell>
                                  </TableRow>
                                );
                              })}
                            </TableBody>
                          </Table>
                        </Box>
                      </Collapse>
                    </TableCell>
                  </TableRow>
                </React.Fragment>
              );
            })}
          </TableBody>
        </Table>
      </TableContainer>

      <Dialog open={confirmOpen} onClose={() => setConfirmOpen(false)}>
        <DialogTitle>
          {selected?.type === 'campaign' ? 'Requeue campaign?' : 'Requeue delivery?'}
        </DialogTitle>
        <DialogActions>
          <Button onClick={() => setConfirmOpen(false)}>Cancel</Button>
          <Button
            onClick={async () => {
              if (!selected) return setConfirmOpen(false);
              try {
                if (selected.type === 'campaign') {
                  await campaignRequeue.mutateAsync(selected.id);
                } else {
                  await deliveryRequeue.mutateAsync(selected.id);
                }
              } catch (e) {
                // ignore — mutation handlers will surface errors
              } finally {
                setConfirmOpen(false);
              }
            }}
            autoFocus
          >
            Requeue
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
}
