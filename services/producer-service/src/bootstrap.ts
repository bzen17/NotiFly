import { spawn, ChildProcess } from 'child_process';
import path from 'path';
import logger from './utils/logger';
import app from './app';
import { connectToDatastores } from './config/db';
import { PORT } from './config/env';
import fs from 'fs';

const runtimeDir = typeof __dirname !== 'undefined' ? __dirname : process.cwd();
const servicesRoot = path.resolve(runtimeDir, '..', '..');

const children: ChildProcess[] = [];

function spawnService(name: string) {
  const cwd = path.join(servicesRoot, name);
  const scriptCandidates = [
    path.join(cwd, 'dist', 'index.js'),
    path.join(cwd, 'dist', 'src', 'index.js'),
  ];

  const script = scriptCandidates.find((s) => fs.existsSync(s));

  logger.info({ cwd, script }, `Spawning ${name}`);

  if (script) {
    const p = spawn(process.execPath, [script], { cwd, stdio: 'inherit', env: { ...process.env } });
    p.on('error', (err) => logger.error({ err }, `${name} spawn error`));
    p.on('exit', (code, signal) => logger.warn({ code, signal }, `${name} exited`));
    children.push(p);
    return p;
  }

  const npmCmd = process.platform === 'win32' ? 'npm.cmd' : 'npm';
  if (fs.existsSync(path.join(cwd, 'package.json'))) {
    logger.warn({ script }, `${name} dist missing; falling back to 'npm run start'`);
    const p = spawn(npmCmd, ['run', 'start', '--silent'], {
      cwd,
      stdio: 'inherit',
      env: { ...process.env },
    });
    p.on('error', (err) => logger.error({ err }, `${name} npm fallback error`));
    p.on('exit', (code, signal) => logger.warn({ code, signal }, `${name} (npm start) exited`));
    children.push(p);
    return p;
  }

  logger.warn({ cwd }, `No runnable entry for ${name} (no dist and no package.json)`);
  return null;
}

function shutdown() {
  for (const c of children) {
    try {
      c.kill();
    } catch (e) {
      logger.warn({ err: e }, 'Error killing child process');
    }
  }
}

process.on('exit', shutdown);
process.on('SIGINT', () => process.exit(0));
process.on('SIGTERM', () => process.exit(0));

export default async function bootstrap() {
  try {
    await connectToDatastores();

    app.listen(Number(PORT), '0.0.0.0', () => {
      logger.info({ port: PORT }, 'Producer service HTTP API listening');
    });

    spawnService('router-service');
    spawnService('worker-email');
  } catch (err) {
    logger.error({ err }, 'Failed to bootstrap producer service');
    process.exit(1);
  }
}
