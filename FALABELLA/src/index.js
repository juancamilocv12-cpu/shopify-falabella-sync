import { config } from './config.js';
import { logger } from './logger.js';
import { runSync } from './sync.js';

let isRunning = false;

async function executeScheduledSync() {
  if (isRunning) {
    logger.warn('Skipping scheduled run because previous sync is still running');
    return;
  }

  isRunning = true;
  try {
    await runSync();
  } catch (error) {
    logger.error(error.message, error.details || {});
  } finally {
    isRunning = false;
  }
}

await executeScheduledSync();

const intervalMs = config.app.syncFrequencyMinutes * 60 * 1000;
logger.info('Scheduler started', { intervalMs });
setInterval(executeScheduledSync, intervalMs);