"use client";

import Link from 'next/link';
import React from 'react';
import Box from '@mui/material/Box';
import Container from '@mui/material/Container';
import Grid from '@mui/material/Grid';
import Paper from '@mui/material/Paper';
import Typography from '@mui/material/Typography';
import Button from '@mui/material/Button';
import Chip from '@mui/material/Chip';
import Stack from '@mui/material/Stack';
import Avatar from '@mui/material/Avatar';
import EmailIcon from '@mui/icons-material/Email';
import SmsIcon from '@mui/icons-material/Sms';
import NotificationsActiveIcon from '@mui/icons-material/NotificationsActive';
import SmartphoneIcon from '@mui/icons-material/Smartphone';
import CodeIcon from '@mui/icons-material/Code';
import SpeedIcon from '@mui/icons-material/Speed';

const features = [
  { title: 'Email', desc: 'Deliver templated and transactional emails', icon: <EmailIcon /> },
  { title: 'SMS', desc: 'High-throughput SMS delivery (Twilio)', icon: <SmsIcon /> },
  { title: 'Push', desc: 'Mobile push via FCM and APNs', icon: <NotificationsActiveIcon /> },
  { title: 'Webhooks', desc: 'Real-time event webhooks', icon: <CodeIcon /> },
  { title: 'Fast routing', desc: 'Intelligent channel routing & retries', icon: <SpeedIcon /> },
];

export default function HomePage() {
  return (
    <Box sx={{ py: 4 }}>
      <Container maxWidth="xl">
      <Grid container spacing={2} alignItems="flex-start">
        <Grid item xs={12} md={6}>
          <Paper elevation={2} sx={{ p: 3, borderRadius: 2, background: 'linear-gradient(135deg, #fff6f8 0%, #fff 100%)', width: '100%' }}>
            <Typography variant="h3" component="h1" gutterBottom sx={{ fontWeight: 700 }}>
              notifly — notifications, simplified
            </Typography>
            <Typography variant="h6" color="text.secondary" sx={{ mb: 3 }}>
              Send reliable email, SMS and push notifications from one unified platform.
              Built for teams who need predictable delivery, observability, and flexible templates.
            </Typography>

            <Stack direction={{ xs: 'column', sm: 'row' }} spacing={2} sx={{ mb: 3 }}>
              <Button component={Link as any} href="/campaigns/new" variant="contained" size="large">
                Create Campaign
              </Button>
              <Button component={Link as any} href="/dashboard" variant="outlined" size="large">
                View Dashboard
              </Button>
            </Stack>

            <Typography variant="subtitle2" color="text.secondary" sx={{ mb: 1 }}>
              Core capabilities
            </Typography>

            <Grid container spacing={2}>
              {features.slice(0, 3).map((f) => (
                <Grid key={f.title} item xs={12} sm={4}>
                  <Paper sx={{ display: 'flex', gap: 2, alignItems: 'center', p: 2 }} elevation={0}>
                    <Avatar sx={{ bgcolor: 'primary.main', color: '#fff' }}>{f.icon}</Avatar>
                    <Box>
                      <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                        <Typography sx={{ fontWeight: 600 }}>{f.title}</Typography>
                        {['SMS', 'Push'].includes(f.title) && (
                          <Chip label="Coming soon" size="small" color="warning" />
                        )}
                      </Box>
                      <Typography variant="body2" color="text.secondary">
                        {f.desc}
                      </Typography>
                    </Box>
                  </Paper>
                </Grid>
              ))}
            </Grid>
          </Paper>
        </Grid>

        <Grid item xs={12} md={6}>
          {/* right column intentionally left blank so top row keeps two equal columns */}
        </Grid>

        <Grid item xs={12}>
          <Paper elevation={2} sx={{ p: 3, borderRadius: 2, width: '100%' }}>
            <Typography variant="h6" sx={{ fontWeight: 700, mb: 1 }}>
              Features at a glance
            </Typography>

            <Grid container spacing={1}>
              {features.map((f) => (
                <Grid key={f.title} item xs={12} sm={6}>
                  <Paper sx={{ display: 'flex', gap: 2, alignItems: 'center', p: 1 }} elevation={0}>
                    <Avatar sx={{ bgcolor: 'primary.main', color: '#fff', width: 36, height: 36 }}>{f.icon}</Avatar>
                    <Box>
                      <Typography sx={{ fontWeight: 600 }}>{f.title}</Typography>
                      <Typography variant="caption" color="text.secondary">
                        {f.desc}
                      </Typography>
                    </Box>
                  </Paper>
                </Grid>
              ))}
            </Grid>
          </Paper>
        </Grid>

        <Grid item xs={12}>
          <Paper elevation={1} sx={{ p: 3, borderRadius: 2, width: '100%' }}>
            <Typography variant="h6" sx={{ fontWeight: 700, mb: 1 }}>
              Upcoming
            </Typography>

            <Stack direction="row" spacing={1} flexWrap="wrap">
              <Chip label="In-app notifications" color="secondary" sx={{ mr: 1, mb: 1 }} />
              <Chip label="Templates Marketplace" color="secondary" sx={{ mr: 1, mb: 1 }} />
              <Chip label="A/B Testing" color="secondary" sx={{ mr: 1, mb: 1 }} />
              <Chip label="Advanced Analytics" color="secondary" sx={{ mr: 1, mb: 1 }} />
              <Chip label="Multi-channel Orchestration" color="secondary" sx={{ mr: 1, mb: 1 }} />
            </Stack>

            <Typography variant="body2" color="text.secondary" sx={{ mt: 2 }}>
              We're focused on expanding delivery reliability, richer insights, and workflow automation.
              Expect early access programs soon.
            </Typography>
          </Paper>
        </Grid>

        <Grid item xs={12}>
          <Paper elevation={0} sx={{ p: 2, borderRadius: 2, background: 'transparent' }}>
            <Typography variant="caption" color="text.secondary">
              Need help? Visit the docs or create your first campaign to see how fast notifly delivers.
            </Typography>
          </Paper>
        </Grid>
      </Grid>
      </Container>
    </Box>
  );
}
