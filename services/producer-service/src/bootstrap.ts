import { spawn } from 'child_process';
import path from 'path';
import logger from './utils/logger';
import app from './app';
import { connectToDatastores } from './config/db';
import { PORT, ENABLE_ROUTER, ENABLE_EMAIL_WORKER } from './config/env';
import fs from 'fs';

function spawnServiceScript(serviceName: string, script: string, name: string) {
  // Resolve to the sibling service under the repository `services` folder
  const servicesRoot = path.resolve(__dirname, '..', '..');
  const cwd = path.join(servicesRoot, serviceName);
  logger.info({ cwd, script }, `Spawning ${name}`);

  // Use platform-appropriate npm executable without forcing a shell to avoid
  // /bin/sh ENOENT in restricted environments. On Windows use npm.cmd.
  const npmCmd = process.platform === 'win32' ? 'npm.cmd' : 'npm';
  const child = spawn(npmCmd, ['run', script, '--silent'], { cwd, stdio: 'inherit' });

  child.on('error', (err: any) => {
    logger.error({ err: err instanceof Error ? err.message : err }, `Failed to spawn ${name}`);

    // If npm isn't available (ENOENT), try to spawn Node directly using package.json `main`.
    if (err && err.code === 'ENOENT') {
      try {
        const pkgPath = path.join(cwd, 'package.json');
        if (fs.existsSync(pkgPath)) {
          const pkg = JSON.parse(fs.readFileSync(pkgPath, 'utf8'));
          const mainFile = pkg.main || pkg.start || null;
          if (mainFile) {
            const mainPath = path.resolve(cwd, mainFile.replace(/^\.\//, ''));
            logger.info({ mainPath }, `Falling back to node ${mainPath} for ${name}`);
            const nodeChild = spawn(process.execPath, [mainPath], { cwd, stdio: 'inherit' });
            nodeChild.on('exit', (code, signal) => logger.warn({ code, signal }, `${name} (node fallback) exited`));
          } else {
            logger.error({}, `No main/start entry in package.json for ${name}; cannot fallback`);
          }
        } else {
          logger.error({ pkgPath }, `package.json not found for ${name}; cannot fallback`);
        }
      } catch (fallbackErr) {
        logger.error({ fallbackErr }, `Fallback spawn for ${name} failed`);
      }
    }
  });
  child.on('exit', (code, signal) => {
    logger.warn({ code, signal }, `${name} process exited`);
  });

  return child;
}

export default async function bootstrap() {
  try {
    await connectToDatastores();

    // Start HTTP API in this process
    app.listen(Number(PORT), '0.0.0.0', () => {
      logger.info({ port: PORT }, 'Producer service HTTP API listening');
    });

    // Optionally spawn router service
    if (ENABLE_ROUTER) {
      spawnServiceScript('router-service', 'start', 'router-service');
    }

    // Optionally spawn email worker
    if (ENABLE_EMAIL_WORKER) {
      spawnServiceScript('worker-email', 'start', 'worker-email');
    }
  } catch (err) {
    logger.error({ err }, 'Failed to bootstrap producer service');
    process.exit(1);
  }
}
