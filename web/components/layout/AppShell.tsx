'use client';
import React from 'react';
import Box from '@mui/material/Box';
import Sidebar from './Sidebar';
import Header from './Header';
import Toolbar from '@mui/material/Toolbar';
import { useTheme } from '@mui/material/styles';
import useMediaQuery from '@mui/material/useMediaQuery';

export default function AppShell({ children }: { children: React.ReactNode }) {
  const theme = useTheme();
  const isDesktop = useMediaQuery(theme.breakpoints.up('md'));

  const [collapsed, setCollapsed] = React.useState(false);

  const [mobileOpen, setMobileOpen] = React.useState(false);

  const toggle = () => {
    if (isDesktop) setCollapsed((s) => !s);
    else setMobileOpen((s) => !s);
  };

  return (
    <Box sx={{ display: 'flex', flexDirection: 'column', minHeight: '100vh' }}>
      <Header onToggleSidebar={toggle} />
      {}
      <Toolbar />

      <Box sx={{ display: 'flex', flex: 1, overflow: 'hidden' }}>
        <Sidebar
          collapsed={collapsed}
          mobileOpen={mobileOpen}
          onMobileClose={() => setMobileOpen(false)}
        />

        <Box sx={{ flex: 1, display: 'flex', flexDirection: 'column', minWidth: 0 }}>
          <Box component="main" sx={{ p: { xs: 2, md: 3 }, flex: 1, overflow: 'auto' }}>
            {children}
          </Box>
        </Box>
      </Box>
    </Box>
  );
}
