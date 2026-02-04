'use client';
import React, { useState } from 'react';
import AppBar from '@mui/material/AppBar';
import Toolbar from '@mui/material/Toolbar';
import Typography from '@mui/material/Typography';
import IconButton from '@mui/material/IconButton';
import MenuIcon from '@mui/icons-material/Menu';
import NotificationsIcon from '@mui/icons-material/Notifications';
import ExitToAppIcon from '@mui/icons-material/ExitToApp';
import Menu from '@mui/material/Menu';
import MenuItem from '@mui/material/MenuItem';
import Avatar from '@mui/material/Avatar';
import Box from '@mui/material/Box';
import { useTheme } from '@mui/material/styles';
import useMediaQuery from '@mui/material/useMediaQuery';
import Link from 'next/link';
import Image from 'next/image';
import { useRouter } from 'next/navigation';
import { useAuth } from '../../lib/auth';

export default function Header({ onToggleSidebar }: { onToggleSidebar?: () => void }) {
  const router = useRouter();
  const { state, setUser } = useAuth();
  const theme = useTheme();
  const isDesktop = useMediaQuery(theme.breakpoints.up('md'));

  function getInitials() {
    const u = state?.user;
    if (!u) return 'N';
    const name = u.name || u.email || '';
    const part = String(name).split('@')[0];
    const fragments = part.split(/[^a-zA-Z0-9]+/).filter(Boolean);
    const initials = (fragments[0]?.[0] || '') + (fragments[1]?.[0] || '');
    return initials.toUpperCase() || 'N';
  }

  function handleLogout() {
    try {
      localStorage.removeItem('accessToken');
      localStorage.removeItem('refreshToken');
    } catch (e) {}
    try {
      setUser(null);
    } catch (e) {}
    router.push('/login');
  }

  const initials = getInitials();
  const [anchorEl, setAnchorEl] = useState<HTMLElement | null>(null);
  const open = Boolean(anchorEl);

  function handleAvatarOpen(e: React.SyntheticEvent<HTMLElement>) {
    setAnchorEl(e.currentTarget as HTMLElement);
  }

  function handleAvatarClose() {
    setAnchorEl(null);
  }

  return (
    <AppBar
      position="fixed"
      color="default"
      elevation={1}
      sx={{
        borderBottom: 1,
        borderColor: 'divider',
        backgroundColor: 'background.paper',
        color: 'text.primary',
      }}
    >
      <Toolbar sx={{ minHeight: { xs: 56, md: 64 } }}>
        {!isDesktop && (
          <IconButton edge="start" sx={{ mr: 2 }} onClick={onToggleSidebar} aria-label="menu">
            <MenuIcon />
          </IconButton>
        )}
        <Box sx={{ flex: 1 }}>
          <Link href="/" style={{ textDecoration: 'none', color: 'inherit' }}>
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, cursor: 'pointer' }}>
              <Image src="/notifly-icon.svg" alt="Notifly" width={32} height={32} />
              <Typography
                variant="h6"
                sx={{ fontWeight: 700, fontSize: { xs: '1rem', md: '1.125rem' } }}
              >
                notifly
              </Typography>
            </Box>
          </Link>
        </Box>
        <Box sx={{ display: 'flex', gap: 1, alignItems: 'center' }}>
          <IconButton>
            <NotificationsIcon />
          </IconButton>
          <Box>
            <IconButton
              aria-controls={open ? 'avatar-menu' : undefined}
              aria-haspopup="true"
              aria-expanded={open ? 'true' : undefined}
              size="small"
              sx={{ ml: 1 }}
              onMouseEnter={handleAvatarOpen}
              onClick={handleAvatarOpen}
            >
              <Avatar sx={{ bgcolor: 'primary.main' }}>{initials}</Avatar>
            </IconButton>
            <Menu
              id="avatar-menu"
              open={open}
              anchorEl={anchorEl}
              onClose={handleAvatarClose}
              MenuListProps={{ onMouseLeave: handleAvatarClose }}
              anchorOrigin={{ vertical: 'bottom', horizontal: 'right' }}
              transformOrigin={{ vertical: 'top', horizontal: 'right' }}
            >
              <MenuItem
                onClick={() => {
                  handleAvatarClose();
                  handleLogout();
                }}
              >
                <ExitToAppIcon fontSize="small" sx={{ mr: 1 }} />
                Logout
              </MenuItem>
            </Menu>
          </Box>
        </Box>
      </Toolbar>
    </AppBar>
  );
}
