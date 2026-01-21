import pino from 'pino';

// Lightweight logger wrapper. Keep configuration minimal and driven by env.
const level = process.env.LOG_LEVEL || 'info';
const pretty = process.env.PRETTY_LOGS === '1' || process.env.NODE_ENV !== 'production';

const logger = pretty
  ? pino(
      { level },
      pino.transport({
        target: 'pino-pretty',
        options: { colorize: true, ignore: 'pid,hostname' },
      }),
    )
  : pino({ level });

export default logger;
