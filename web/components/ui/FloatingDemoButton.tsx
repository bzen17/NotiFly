"use client";
import React from 'react';
import Fab from '@mui/material/Fab';
import Box from '@mui/material/Box';
import Typography from '@mui/material/Typography';
import { startDemoAdmin, stopDemo, demoRemainingMs, getDemoSession } from '../../lib/demoAuth';
import { useRouter } from 'next/navigation';

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
      // navigate to home after starting demo
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
      }}
    >
      <Fab color={active ? 'secondary' : 'primary'} onClick={handleClick} aria-label="demo-auth">
        <Typography variant="button">DEMO</Typography>
      </Fab>
      <Typography variant="caption" sx={{ color: active ? 'secondary.main' : 'text.secondary' }}>
        {active ? `${mm}:${ss}` : '10 min'}
      </Typography>
    </Box>
  );
}
