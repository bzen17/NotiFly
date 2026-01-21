import { closeRedis, closeMongo, closePg } from './config/db';
import { log } from './utils/logger';
import runEmailConsumer, { stopConsumer } from './consumers/email.consumer';

let running = true;

process.on('SIGINT', shutDown);
process.on('SIGTERM', shutDown);

async function shutDown() {
  if (!running) return;
  running = false;
  log.info('Shutting down, closing connections...');
  try {
    // stop the consumer loop
    stopConsumer();
  } catch (e) {
    log.warn({ err: e }, 'failed to stop consumer gracefully');
  }
  try {
    await closeRedis();
    await closeMongo();
    await closePg();
  } catch (err) {
    log.warn('Error during shutdown', err);
  }
  process.exit(0);
}

runEmailConsumer()
  .then(() => {
    log.info('consumer stopped');
  })
  .catch((err: any) => {
    log.error({ err }, 'consumer crashed');
    process.exit(1);
  });
