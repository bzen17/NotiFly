'use client';
import React from 'react';
import Grid from '@mui/material/Grid';
import Box from '@mui/material/Box';
import Card from '@mui/material/Card';
import CardContent from '@mui/material/CardContent';
import Typography from '@mui/material/Typography';
import FormControl from '@mui/material/FormControl';
import InputLabel from '@mui/material/InputLabel';
import Select from '@mui/material/Select';
import MenuItem from '@mui/material/MenuItem';
import { useDashboardMetrics } from '../../lib/hooks/useDashboard';
import Loading from '../../components/common/Loading';
import ErrorAlert from '../../components/common/ErrorAlert';
import { useAuth } from '../../lib/auth';
import { useState } from 'react';
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  Legend,
  ResponsiveContainer,
  LineChart,
  Line,
  CartesianGrid,
} from 'recharts';

// Color tokens used in charts and accents
const SUCCESS_COLOR = '#4caf50';
const FAILED_COLOR = '#f44336';
const ACCENT_BG = '#f5f7fb';
const CARD_SHADOW = '0 1px 6px rgba(16,24,40,0.08)';

export default function DashboardPage() {
  const [range, setRange] = useState<string>('24h');
  const useRangeDashboard = useDashboardMetrics();
  const { data, isLoading, isError } = useRangeDashboard(range);

  if (isLoading) return <Loading />;
  if (isError) return <ErrorAlert message="Failed to load dashboard metrics" />;

  const {
    totalDeliveries,
    successCount,
    failedCount,
    dlqCount,
    totalNotifications,
    deliverySuccessRate,
    activeTenants,
    perChannel,
    timeSeries,
  } = data ?? {};
  const { state } = useAuth();
  const role = state?.user?.role;

  return (
    <>
      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 3 }}>
        <Typography variant="h6">Dashboard</Typography>
        <FormControl variant="standard" size="small">
          <InputLabel id="range-select-label">Range</InputLabel>
          <Select
            labelId="range-select-label"
            value={range}
            onChange={(e) => setRange(e.target.value as string)}
            label="Range"
            sx={{ minWidth: 160 }}
          >
            <MenuItem value="24h">Last 24 hours</MenuItem>
            <MenuItem value="7d">Last 7 days</MenuItem>
            <MenuItem value="1m">Last 30 days</MenuItem>
          </Select>
        </FormControl>
      </Box>

      <Grid container spacing={2} sx={{ mb: 1 }}>
        {/** Metric cards row - compact and consistent */}
        {(() => {
          const email =
            (perChannel || []).find((p: any) => (p.channel || '').toLowerCase() === 'email') ||
            null;
          return (
            <>
              {[
                {
                  title: `Total Notifications (${totalNotifications?.range ?? range})`,
                  value: totalNotifications?.period ?? 0,
                  caption: `Today: ${totalNotifications?.today ?? 0}`,
                },
                {
                  title: 'Delivery Success Rate',
                  value: `${deliverySuccessRate ?? 0}%`,
                  caption: `${successCount ?? 0} success • ${failedCount ?? 0} failed`,
                },
                { title: 'Failed Deliveries', value: failedCount ?? 0, caption: '' },
                { title: 'Total Deliveries', value: totalDeliveries ?? 0, caption: '' },
                { title: 'Active Tenants', value: activeTenants ?? 0, caption: '' },
                {
                  title: 'Avg latency',
                  value: email && email.avgLatencyMs ? Math.round(email.avgLatencyMs) + 'ms' : '—',
                  caption: '',
                },
                { title: 'Retries', value: email ? email.retries : 0, caption: '' },
              ].map((m, idx) => (
                <Box
                  key={m.title}
                  sx={{
                    width: { xs: '100%', sm: '50%', md: '16.666%' },
                    display: 'flex',
                    justifyContent: 'center',
                  }}
                >
                  <Card
                    sx={{
                      height: 120,
                      width: 180,
                      display: 'flex',
                      alignItems: 'center',
                      boxShadow: CARD_SHADOW,
                      borderRadius: 2,
                    }}
                  >
                    <Box
                      sx={{
                        width: 6,
                        height: '100%',
                        bgcolor: ACCENT_BG,
                        borderTopLeftRadius: 8,
                        borderBottomLeftRadius: 8,
                      }}
                    />
                    <CardContent sx={{ py: 1, pl: 2, pr: 1 }}>
                      <Typography variant="caption" color="text.secondary">
                        {m.title}
                      </Typography>
                      <Typography variant="h6" sx={{ mt: 0.5 }}>
                        {m.value}
                      </Typography>
                      {m.caption ? (
                        <Typography variant="caption" color="text.secondary">
                          {m.caption}
                        </Typography>
                      ) : null}
                    </CardContent>
                  </Card>
                </Box>
              ))}
            </>
          );
        })()}
        {role === 'admin' && (
          <Box
            sx={{
              width: { xs: '100%', sm: '50%', md: '16.666%' },
              display: 'flex',
              justifyContent: 'center',
            }}
          >
            <Card
              sx={{
                height: 120,
                width: 180,
                display: 'flex',
                alignItems: 'center',
                boxShadow: CARD_SHADOW,
                borderRadius: 2,
              }}
            >
              <Box
                sx={{
                  width: 6,
                  height: '100%',
                  bgcolor: ACCENT_BG,
                  borderTopLeftRadius: 8,
                  borderBottomLeftRadius: 8,
                }}
              />
              <CardContent sx={{ py: 1, pl: 2 }}>
                <Typography variant="caption" color="text.secondary">
                  DLQ Entries (Admin)
                </Typography>
                <Typography variant="h6" sx={{ mt: 0.5 }}>
                  {dlqCount ?? 0}
                </Typography>
              </CardContent>
            </Card>
          </Box>
        )}
      </Grid>

      <Box
        sx={{
          display: 'flex',
          gap: 2,
          flexDirection: { xs: 'column', md: 'row' },
          alignItems: 'stretch',
          my: 4,
        }}
      >
        <Box sx={{ flex: 1 }}>
          <Card sx={{ boxShadow: CARD_SHADOW, borderRadius: 2, height: '100%' }}>
            <CardContent sx={{ height: 420, px: 0 }}>
              <Typography variant="caption" color="text.secondary" gutterBottom sx={{ px: 4 }}>
                Sent per Channel (stacked)
              </Typography>
              <Box sx={{ height: 12 }} />
              {(() => {
                const buckets = timeSeries?.buckets || [];
                const channelsMap = timeSeries?.channels || {};
                const emailSeries =
                  channelsMap['email'] || channelsMap['Email'] || channelsMap['EMAIL'] || null;
                if (!emailSeries || !buckets.length) {
                  return (
                    <Box
                      sx={{
                        height: '100%',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        p: 2,
                      }}
                    >
                      <Typography variant="body2" color="text.secondary">
                        No data for selected range
                      </Typography>
                    </Box>
                  );
                }
                const data = buckets.map((b: string, i: number) => ({
                  name: new Date(b).toLocaleString(),
                  success: emailSeries.success?.[i] || 0,
                  failed: emailSeries.failed?.[i] || 0,
                }));
                return (
                  <Box sx={{ height: 'calc(100% - 1rem)', px: 2 }}>
                    <ResponsiveContainer width="100%" height="100%">
                      <BarChart data={data} margin={{ top: 8, right: 8, bottom: 8, left: 0 }}>
                        <XAxis dataKey="name" tick={{ fontSize: 12 }} />
                        <YAxis />
                        <Tooltip />
                        <Legend />
                        <Bar dataKey="success" stackId="a" fill={SUCCESS_COLOR} />
                        <Bar dataKey="failed" stackId="a" fill={FAILED_COLOR} />
                      </BarChart>
                    </ResponsiveContainer>
                  </Box>
                );
              })()}
            </CardContent>
          </Card>
        </Box>

        <Box sx={{ flex: 1 }}>
          <Card sx={{ boxShadow: CARD_SHADOW, borderRadius: 2, height: '100%' }}>
            <CardContent sx={{ height: 420, px: 0 }}>
              <Typography variant="caption" color="text.secondary" gutterBottom sx={{ px: 4 }}>
                Total Deliveries Over Time
              </Typography>
              <Box sx={{ height: 12 }} />
              {(() => {
                const buckets = timeSeries?.buckets || [];
                if (!buckets.length) {
                  return (
                    <Box
                      sx={{
                        height: '100%',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        p: 2,
                      }}
                    >
                      <Typography variant="body2" color="text.secondary">
                        No data for selected range
                      </Typography>
                    </Box>
                  );
                }
                return (
                  <Box sx={{ height: 'calc(100% - 1rem)', px: 2 }}>
                    <ResponsiveContainer width="100%" height="100%">
                      <LineChart
                        data={(() => {
                          const buckets = timeSeries?.buckets || [];
                          const channelsMap = timeSeries?.channels || {};
                          const channels = Object.keys(channelsMap || {});
                          return buckets.map((b: string, i: number) => {
                            const obj: any = { name: new Date(b).toLocaleString(), total: 0 };
                            channels.forEach((ch) => {
                              obj.total += channelsMap[ch].sent?.[i] || 0;
                            });
                            return obj;
                          });
                        })()}
                        margin={{ top: 8, right: 8, bottom: 8, left: 0 }}
                      >
                        <CartesianGrid strokeDasharray="3 3" />
                        <XAxis dataKey="name" tick={{ fontSize: 12 }} />
                        <YAxis />
                        <Tooltip />
                        <Line
                          type="monotone"
                          dataKey="total"
                          stroke="#1976d2"
                          strokeWidth={2}
                          dot={false}
                        />
                      </LineChart>
                    </ResponsiveContainer>
                  </Box>
                );
              })()}
            </CardContent>
          </Card>
        </Box>
      </Box>
    </>
  );
}
