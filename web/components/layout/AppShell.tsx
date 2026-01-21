'use client';
import React from 'react';
import Box from '@mui/material/Box';
import Sidebar, { drawerWidth } from './Sidebar';
import Header from './Header';
import Toolbar from '@mui/material/Toolbar';

export default function AppShell({ children }: { children: React.ReactNode }) {
  const [collapsed, setCollapsed] = React.useState(false);
  const toggle = () => setCollapsed((s) => !s);

  const rightPanelWidth = 340;

  return (
    <Box sx={{ display: 'flex', flexDirection: 'column', minHeight: '100vh' }}>
      <Header onToggleSidebar={toggle} />
      {/* spacer to offset fixed header */}
      <Toolbar />

      <Box sx={{ display: 'flex', flex: 1 }}>
        <Sidebar collapsed={collapsed} />

        <Box sx={{ flex: 1, display: 'flex', flexDirection: 'column' }}>
          <Box component="main" sx={{ p: 3, flex: 1 }}>
            {children}
          </Box>
        </Box>
      </Box>
    </Box>
  );
}
