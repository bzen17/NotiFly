import { runRouter } from './router';

async function main() {
  try {
    await runRouter();
  } catch (err) {
    console.error('Fatal error', err);
    process.exit(1);
  }
}

main();
