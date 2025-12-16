import { Pool } from 'pg';
import { PG_CONNECTION } from '../config';

export const pool = new Pool({ connectionString: PG_CONNECTION });

export async function insertDelivery(row: {
  id: string;
  event_id: string;
  recipient: string;
  channel: string;
  status: string;
  payload: any;
}) {
  const query = `INSERT INTO deliveries(id, event_id, recipient, channel, status, payload, created_at) VALUES($1,$2,$3,$4,$5,$6,now()) RETURNING id`;
  const values = [row.id, row.event_id, row.recipient, row.channel, row.status, row.payload];
  const res = await pool.query(query, values);
  return res.rows[0];
}
