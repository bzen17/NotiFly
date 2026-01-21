import app from './app';
import { connectToDatastores } from './config/db';
import { PORT as CFG_PORT } from './config/env';
import logger from './utils/logger';

const PORT = Number(CFG_PORT || process.env.PORT || 3001);

async function start() {
  try {
    await connectToDatastores();
    app.listen(PORT, () => {
      logger.info({ port: PORT }, 'Producer service listening');
    });
  } catch (err) {
    logger.error({ err }, 'Failed to start producer service');
    process.exit(1);
  }
}

start();
