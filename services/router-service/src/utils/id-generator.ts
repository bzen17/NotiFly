import { v4 as uuidv4 } from 'uuid';

export function generateId(prefix = '') {
  return `${prefix}${uuidv4()}`;
}
