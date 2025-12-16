import { Pool } from 'pg';

let pool: Pool | null = null;

// Return a Postgres pool or a minimal mock when Postgres is not configured
export function getPgPool() {
  if (pool) return pool;

  // Prefer an explicit URL, otherwise build from individual env vars
  let conn: string | undefined = process.env.POSTGRES_URL;
  if (!conn) {
    const host = process.env.PG_HOST;
    const port = process.env.PG_PORT || '5432';
    const user = process.env.PG_USER;
    const pass = process.env.PG_PASS;
    const db = process.env.PG_DB;
    console.log('postgres', host, port, user, db);
    if (host && user && pass && db) {
      const u = encodeURIComponent(user);
      const p = encodeURIComponent(pass);
      conn = `postgresql://${u}:${p}@${host}:${port}/${db}`;
    }
  }

  if (!conn) {
    const mock: any = {
      query: async (_sql: string, _params?: any[]) => {
        console.warn('[pg-mock] Postgres not configured; skipping DB write');
        return { rows: [], rowCount: 0 };
      },
      end: async () => {},
    };
    return mock;
  }

  pool = new Pool({ connectionString: conn });
  return pool;
}

export async function closePg() {
  if (pool) await pool.end();
}
