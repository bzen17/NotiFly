'use client';
import React from 'react';
import { usePathname, useRouter } from 'next/navigation';

type AuthState = { user: any | null; ready: boolean };

const AuthContext = React.createContext<{
  state: AuthState;
  setUser: (u: any | null) => void;
  fetchWithAuth: (input: RequestInfo, init?: RequestInit) => Promise<Response>;
} | null>(null);

function getStoredTokens() {
  try {
    const a = localStorage.getItem('accessToken');
    const r = localStorage.getItem('refreshToken');
    return { accessToken: a, refreshToken: r };
  } catch (e) {
    return { accessToken: null, refreshToken: null };
  }
}

function setStoredTokens(accessToken?: string | null, refreshToken?: string | null) {
  try {
    if (accessToken) localStorage.setItem('accessToken', accessToken);
    else localStorage.removeItem('accessToken');
    if (refreshToken) localStorage.setItem('refreshToken', refreshToken);
    else localStorage.removeItem('refreshToken');
  } catch (e) {}
}

async function doRefresh(refreshToken: string) {
  const res = await fetch('http://localhost:3001/v1/auth/refresh', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ refreshToken }),
  });
  if (!res.ok) throw new Error('refresh_failed');
  return res.json();
}

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [state, setState] = React.useState<AuthState>({ user: null, ready: false });
  const router = useRouter();
  const pathname = usePathname();

  React.useEffect(() => {
    let mounted = true;
    async function init() {
      const { accessToken, refreshToken } = getStoredTokens();
      if (accessToken) {
        // naive decode for user email/role
        try {
          const payload = JSON.parse(atob(accessToken.split('.')[1]));
          if (mounted)
            setState({
              user: {
                id: payload.sub,
                email: payload.email,
                role: payload.role,
                tenantId: payload.tenantId,
              },
              ready: true,
            });
          return;
        } catch (e) {}
      }
      if (refreshToken) {
        try {
          const json = await doRefresh(refreshToken);
          setStoredTokens(json.accessToken, json.refreshToken);
          const payload = JSON.parse(atob(json.accessToken.split('.')[1]));
          if (mounted)
            setState({
              user: {
                id: payload.sub,
                email: payload.email,
                role: payload.role,
                tenantId: payload.tenantId,
              },
              ready: true,
            });
          return;
        } catch (e) {
          setStoredTokens(null, null);
        }
      }
      if (mounted) setState({ user: null, ready: true });
    }
    init();
    return () => {
      mounted = false;
    };
  }, []);

  React.useEffect(() => {
    if (!state.ready) return;
    const publicPaths = ['/login', '/signup'];
    if (!state.user && !publicPaths.includes(pathname || '/')) {
      router.push('/login');
    }
  }, [state.ready, state.user, pathname, router]);

  const setUser = (u: any | null) => {
    setState((s) => ({ ...s, user: u }));
  };

  async function fetchWithAuth(input: RequestInfo, init?: RequestInit) {
    const { accessToken, refreshToken } = getStoredTokens();
    const headers = new Headers(init?.headers || {});
    if (accessToken) headers.set('Authorization', `Bearer ${accessToken}`);
    const res = await fetch(input, { ...init, headers });
    if (res.status !== 401) return res;
    // try refresh
    if (!refreshToken) return res;
    try {
      const json = await doRefresh(refreshToken);
      setStoredTokens(json.accessToken, json.refreshToken);
      const headers2 = new Headers(init?.headers || {});
      headers2.set('Authorization', `Bearer ${json.accessToken}`);
      return fetch(input, { ...init, headers: headers2 });
    } catch (e) {
      setStoredTokens(null, null);
      setUser(null);
      return res;
    }
  }

  return (
    <AuthContext.Provider value={{ state, setUser, fetchWithAuth }}>
      {children}
    </AuthContext.Provider>
  );
}

export const useAuth = () => {
  const ctx = React.useContext(AuthContext);
  if (!ctx) throw new Error('useAuth must be used within AuthProvider');
  return ctx;
};
