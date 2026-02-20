// client-side demo auth helpers
export type DemoSession = {
  expiresAt: number; // epoch ms
  user: { id: string; email: string; role: string; tenantId?: string };
};

const KEY = 'demoAuth';

let expirationTimer: ReturnType<typeof setTimeout> | null = null;

function scheduleExpiration(expiresAt: number) {
  if (expirationTimer) {
    clearTimeout(expirationTimer);
    expirationTimer = null;
  }
  const ms = Math.max(0, expiresAt - Date.now());
  if (ms <= 0) {
    // already expired — dispatch immediately
    try {
      localStorage.removeItem(KEY);
    } catch (e) {}
    window.dispatchEvent(new Event('demoAuthChanged'));
    return;
  }
  expirationTimer = setTimeout(() => {
    try {
      localStorage.removeItem(KEY);
    } catch (e) {}
    window.dispatchEvent(new Event('demoAuthChanged'));
    expirationTimer = null;
  }, ms);
}

export function getDemoSession(): DemoSession | null {
  try {
    const raw = localStorage.getItem(KEY);
    if (!raw) return null;
    const obj = JSON.parse(raw) as DemoSession;
    if (obj.expiresAt && Date.now() < obj.expiresAt) {
      // ensure we have a timer scheduled for expiration
      scheduleExpiration(obj.expiresAt);
      return obj;
    }
    // expired
    localStorage.removeItem(KEY);
    // notify listeners that demo ended
    window.dispatchEvent(new Event('demoAuthChanged'));
    return null;
  } catch (e) {
    return null;
  }
}

export function startDemoAdmin(minutes = 10) {
  const expiresAt = Date.now() + minutes * 60 * 1000;
  const session: DemoSession = {
    expiresAt,
    user: { id: 'demo-admin', email: 'demo@local', role: 'admin', tenantId: '' },
  };
  try {
    localStorage.setItem(KEY, JSON.stringify(session));
  } catch (e) {}
  // schedule expiration and notify listeners
  scheduleExpiration(expiresAt);
  window.dispatchEvent(new Event('demoAuthChanged'));
}

export function stopDemo() {
  try {
    localStorage.removeItem(KEY);
  } catch (e) {}
  if (expirationTimer) {
    clearTimeout(expirationTimer);
    expirationTimer = null;
  }
  window.dispatchEvent(new Event('demoAuthChanged'));
}

export function demoRemainingMs(): number {
  const s = getDemoSession();
  return s ? Math.max(0, s.expiresAt - Date.now()) : 0;
}
