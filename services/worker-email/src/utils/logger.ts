import pino from 'pino';
import { LOG_LEVEL } from '../config/env';

const pretty = process.env.PRETTY_LOGS === '1' || process.env.NODE_ENV !== 'production';
const level = LOG_LEVEL || 'info';

const log = pretty
  ? pino(
      { level },
      pino.transport({
        target: 'pino-pretty',
        options: { colorize: true, ignore: 'pid,hostname' },
      }),
    )
  : pino({ level });

export default log;
export { log };
