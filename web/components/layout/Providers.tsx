'use client';
import React from 'react';
import { CacheProvider } from '@emotion/react';
import createEmotionCache from '../../lib/createEmotionCache';
import { ThemeProvider } from '@mui/material/styles';
import { CssBaseline } from '@mui/material';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { theme } from '../../lib/theme';
import AppShell from './AppShell';
import { AuthProvider } from '../../lib/auth';
import { usePathname } from 'next/navigation';

const queryClient = new QueryClient();

export default function Providers({ children }: { children: React.ReactNode }) {
  const pathname = usePathname?.() || '/';

  const isAuthRoute = pathname === '/login' || pathname === '/signup';

  // create a client-side emotion cache that will insert styles at the insertion point
  const cache = React.useMemo(() => createEmotionCache(), []);

  return (
    <CacheProvider value={cache}>
      <ThemeProvider theme={theme}>
        <CssBaseline />
        <QueryClientProvider client={queryClient}>
          <AuthProvider>{isAuthRoute ? children : <AppShell>{children}</AppShell>}</AuthProvider>
        </QueryClientProvider>
      </ThemeProvider>
    </CacheProvider>
  );
}
