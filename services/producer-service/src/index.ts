import app from './app';
import { connectToDatastores } from './config/db';
import { PORT } from './config/env';
import logger from './utils/logger';

async function start() {
  try {
    await connectToDatastores();
    app.listen(Number(PORT), '0.0.0.0', () => {
      logger.info({ port: PORT }, 'Producer service listening');
    });
  } catch (err) {
    logger.error({ err }, 'Failed to start producer service');
    process.exit(1);
  }
}

start();
