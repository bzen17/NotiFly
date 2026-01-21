'use client';
import React from 'react';
import Drawer from '@mui/material/Drawer';
import List from '@mui/material/List';
import ListItemButton from '@mui/material/ListItemButton';
import ListItemIcon from '@mui/material/ListItemIcon';
import ListItemText from '@mui/material/ListItemText';
import Divider from '@mui/material/Divider';
import CampaignIcon from '@mui/icons-material/Campaign';
import DashboardIcon from '@mui/icons-material/Dashboard';
import ReportIcon from '@mui/icons-material/Report';
import { usePathname, useRouter } from 'next/navigation';
import Toolbar from '@mui/material/Toolbar';

export const drawerWidth = 260;
export const collapsedWidth = 72;

export default function Sidebar({ collapsed = false }: { collapsed?: boolean }) {
  const pathname = usePathname();
  const router = useRouter();

  const items = [
    { label: 'Dashboard', icon: <DashboardIcon />, href: '/dashboard' },
    { label: 'Campaigns', icon: <CampaignIcon />, href: '/campaigns' },
    { label: 'DLQ', icon: <ReportIcon />, href: '/dlq' },
  ];

  const width = collapsed ? collapsedWidth : drawerWidth;

  return (
    <Drawer
      variant="permanent"
      open
      sx={{
        width,
        flexShrink: 0,
        [`& .MuiDrawer-paper`]: (theme: any) => ({
          width,
          boxSizing: 'border-box',
          overflowX: 'hidden',
          top: 64,
          zIndex: (theme?.zIndex?.appBar ?? 1100) - 1,
        }),
      }}
    >
      <Divider />
      <List>
        {items.map((it) => (
          <ListItemButton
            key={it.href}
            selected={pathname?.startsWith(it.href)}
            onClick={() => router.push(it.href)}
            sx={{ justifyContent: collapsed ? 'center' : 'flex-start', px: 2 }}
          >
            <ListItemIcon sx={{ minWidth: 0, mr: collapsed ? 0 : 2, justifyContent: 'center' }}>
              {it.icon}
            </ListItemIcon>
            {!collapsed && <ListItemText primary={it.label} />}
          </ListItemButton>
        ))}
      </List>
    </Drawer>
  );
}
