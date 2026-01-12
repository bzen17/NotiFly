import app from './app';
import { connectToDatastores } from './config/db';
import { PORT as CFG_PORT } from './config/env';

const PORT = Number(CFG_PORT || process.env.PORT || 3001);

async function start() {
  try {
    await connectToDatastores();
    app.listen(PORT, () => {
      console.log(`Producer service listening on ${PORT}`);
    });
  } catch (err) {
    console.error('Failed to start producer service', err);
    process.exit(1);
  }
}

start();
