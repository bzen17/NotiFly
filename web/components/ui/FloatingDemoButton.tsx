'use client';
import React from 'react';
import Fab from '@mui/material/Fab';
import Box from '@mui/material/Box';
import Typography from '@mui/material/Typography';
import Tooltip from '@mui/material/Tooltip';
import { startDemoAdmin, stopDemo, demoRemainingMs, getDemoSession } from '../../lib/demoAuth';
import { useRouter } from 'next/navigation';

const pulseKeyframes = {
  '@keyframes demoPulse': {
    '0%': { boxShadow: '0 0 0 0 rgba(99,102,241,0.7)' },
    '70%': { boxShadow: '0 0 0 14px rgba(99,102,241,0)' },
    '100%': { boxShadow: '0 0 0 0 rgba(99,102,241,0)' },
  },
};

export default function FloatingDemoButton() {
  const [remaining, setRemaining] = React.useState<number>(() => demoRemainingMs());
  const router = useRouter();

  React.useEffect(() => {
    const tick = () => setRemaining(demoRemainingMs());
    const iv = setInterval(tick, 1000);
    function handler() {
      tick();
    }
    window.addEventListener('demoAuthChanged', handler as EventListener);
    tick();
    return () => {
      clearInterval(iv);
      window.removeEventListener('demoAuthChanged', handler as EventListener);
    };
  }, []);

  const active = remaining > 0 && getDemoSession() !== null;

  function handleClick() {
    if (active) stopDemo();
    else {
      startDemoAdmin(10);

      router.push('/');
    }
  }

  const mm = Math.floor(remaining / 60000)
    .toString()
    .padStart(2, '0');
  const ss = Math.floor((remaining % 60000) / 1000)
    .toString()
    .padStart(2, '0');

  return (
    <Box
      sx={{
        position: 'fixed',
        right: 20,
        bottom: 20,
        zIndex: 1400,
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        gap: 1,
        ...pulseKeyframes,
      }}
    >
      <Tooltip
        title={active ? 'Click to end demo session' : 'Login-free 10-minute admin demo'}
        placement="left"
        arrow
      >
        <Fab
          color={active ? 'secondary' : 'primary'}
          onClick={handleClick}
          aria-label="demo-auth"
          sx={{
            animation: active ? 'none' : 'demoPulse 2s ease-in-out infinite',
          }}
        >
          <Typography variant="button">DEMO</Typography>
        </Fab>
      </Tooltip>
      <Typography variant="caption" sx={{ color: active ? 'secondary.main' : 'text.secondary' }}>
        {active ? `${mm}:${ss}` : '10 min'}
      </Typography>
    </Box>
  );
}
