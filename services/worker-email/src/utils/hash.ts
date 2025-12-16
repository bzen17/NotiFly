import crypto from 'crypto';

function stableStringify(obj: any): string {
  if (obj === null || typeof obj !== 'object') return JSON.stringify(obj);
  if (Array.isArray(obj)) return '[' + obj.map(stableStringify).join(',') + ']';
  const keys = Object.keys(obj).sort();
  return '{' + keys.map((k) => JSON.stringify(k) + ':' + stableStringify(obj[k])).join(',') + '}';
}

export default function stableHash(value: any): string {
  const s = typeof value === 'string' ? value : stableStringify(value);
  return crypto.createHash('sha256').update(s).digest('hex');
}
