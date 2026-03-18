import { logger } from './logger.js';
import { runSync } from './sync.js';

async function main() {
  const command = process.argv[2] || 'sync:once';

  switch (command) {
    case 'sync:once': {
      await runSync();
      return;
    }
    default:
      throw new Error(`Unknown command: ${command}`);
  }
}

main().catch((error) => {
  logger.error(error.message, error.details || {});
  process.exitCode = 1;
});