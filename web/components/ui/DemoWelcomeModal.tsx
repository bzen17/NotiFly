'use client';
import React from 'react';
import Dialog from '@mui/material/Dialog';
import DialogTitle from '@mui/material/DialogTitle';
import DialogContent from '@mui/material/DialogContent';
import DialogActions from '@mui/material/DialogActions';
import Button from '@mui/material/Button';
import Typography from '@mui/material/Typography';
import Box from '@mui/material/Box';
import Chip from '@mui/material/Chip';
import Divider from '@mui/material/Divider';
import useMediaQuery from '@mui/material/useMediaQuery';
import { useTheme } from '@mui/material/styles';
import NotificationsActiveIcon from '@mui/icons-material/NotificationsActive';
import { getDemoSession } from '../../lib/demoAuth';

const SEEN_KEY = 'demoWelcomeSeen';

export default function DemoWelcomeModal() {
  const [open, setOpen] = React.useState(false);
  const theme = useTheme();
  const fullScreen = useMediaQuery(theme.breakpoints.down('sm'));

  React.useEffect(() => {
    const seen = localStorage.getItem(SEEN_KEY);
    const demo = getDemoSession();
    if (!seen && !demo) {
      setOpen(true);
    }
  }, []);

  // Close modal when DEMO button is clicked (startDemoAdmin fires 'demoAuthChanged')
  React.useEffect(() => {
    function handleDemoStart() {
      if (getDemoSession()) {
        localStorage.setItem(SEEN_KEY, '1');
        setOpen(false);
      }
    }
    window.addEventListener('demoAuthChanged', handleDemoStart);
    return () => window.removeEventListener('demoAuthChanged', handleDemoStart);
  }, []);

  function dismiss() {
    localStorage.setItem(SEEN_KEY, '1');
    setOpen(false);
  }

  return (
    <Dialog
      open={open}
      onClose={dismiss}
      maxWidth="xs"
      fullWidth
      fullScreen={fullScreen}
      PaperProps={{
        sx: {
          borderRadius: fullScreen ? 0 : 3,
          ...(fullScreen && {
            justifyContent: 'center',
          }),
        },
      }}
    >
      {/* Top accent bar using theme primary */}
      <Box
        sx={{
          height: 5,
          bgcolor: 'primary.main',
          borderRadius: fullScreen ? 0 : '12px 12px 0 0',
        }}
      />

      <DialogTitle sx={{ pt: 3, pb: 0.5 }}>
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5 }}>
          <NotificationsActiveIcon color="primary" sx={{ fontSize: 26 }} />
          <Box>
            <Typography variant="h6" sx={{ fontWeight: 700, lineHeight: 1.2 }}>
              Welcome to NotiFly
            </Typography>
            <Chip
              label="Multi-channel notifications, delivered at scale"
              size="small"
              color="primary"
              variant='outlined'
              sx={{ mt: 0.5, fontSize: '0.65rem' }}
            />
          </Box>
        </Box>
      </DialogTitle>

      <DialogContent sx={{ pt: 1.5 }}>
        <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
          A production-grade notification platform — multi-channel delivery (email, SMS, push),
          Kafka-based routing, DLQ management, and real-time observability.
        </Typography>

        <Divider sx={{ mb: 2 }} />

        {/* Demo CTA callout */}
        <Box
          sx={{
            p: 2,
            borderRadius: 2,
            bgcolor: 'primary.main',
            color: 'primary.contrastText',
          }}
        >
          <Typography variant="subtitle2" sx={{ fontWeight: 700, mb: 0.5 }}>
            Try it instantly — no login needed
          </Typography>
          <Typography variant="body2" sx={{ opacity: 0.92 }}>
            Tap the{' '}
            <Box
              component="span"
              sx={{
                display: 'inline-block',
                bgcolor: 'white',
                color: 'primary.main',
                borderRadius: 0.75,
                px: 0.8,
                py: 0.1,
                fontWeight: 700,
                fontSize: '0.7rem',
                letterSpacing: 1,
              }}
            >
              DEMO
            </Box>{' '}
            button (bottom-right) for a full 10-minute admin session — no credentials required.
          </Typography>
        </Box>
      </DialogContent>

      <DialogActions sx={{ px: 3, pb: 3, pt: 1 }}>
        <Button onClick={dismiss} variant="contained" color="primary" fullWidth size="large">
          Got it!
        </Button>
      </DialogActions>
    </Dialog>
  );
}
