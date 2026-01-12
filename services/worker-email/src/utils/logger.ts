import pino from 'pino';
import { LOG_LEVEL } from '../config/env';

export const log = pino({ level: LOG_LEVEL });

export default log;
