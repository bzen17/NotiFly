import axios from 'axios';

const baseURL = process.env.NEXT_PUBLIC_API_BASE_URL;

export const api = axios.create({
  baseURL: `${baseURL}/v1`,
  headers: { 'Content-Type': 'application/json' },
});

// Attach access token from localStorage (if present) to all requests
api.interceptors.request.use((config) => {
  try {
    if (typeof window !== 'undefined') {
      const token = localStorage.getItem('accessToken');
      if (token) {
        config.headers = config.headers || {};
        (config.headers as any).Authorization = `Bearer ${token}`;
      }
    }
  } catch (e) {}
  return config;
});

// Single in-flight refresh promise to avoid multiple concurrent refresh requests
let refreshPromise: Promise<void> | null = null;

api.interceptors.response.use(
  (res) => res,
  async (err) => {
    const original = err.config;
    if (!original) return Promise.reject(err);
    // If we already tried refreshing for this request, reject
    if (original._retry) return Promise.reject(err);
    const status = err.response ? err.response.status : null;
    if (status !== 401) return Promise.reject(err);

    // attempt refresh
    const refreshToken =
      typeof window !== 'undefined' ? localStorage.getItem('refreshToken') : null;
    if (!refreshToken) return Promise.reject(err);

    if (!refreshPromise) {
      refreshPromise = (async () => {
        try {
          const resp = await fetch(`${baseURL}/v1/auth/refresh`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ refreshToken }),
          });
          if (!resp.ok) throw new Error('refresh_failed');
          const json = await resp.json();
          localStorage.setItem('accessToken', json.accessToken);
          localStorage.setItem('refreshToken', json.refreshToken);
        } catch (e) {
          localStorage.removeItem('accessToken');
          localStorage.removeItem('refreshToken');
          throw e;
        } finally {
          refreshPromise = null;
        }
      })();
    }

    try {
      await refreshPromise;
      original._retry = true;
      // set new header and retry
      const token = localStorage.getItem('accessToken');
      if (token) {
        original.headers = original.headers || {};
        original.headers.Authorization = `Bearer ${token}`;
      }
      return api(original);
    } catch (e) {
      return Promise.reject(err);
    }
  },
);

export default api;
