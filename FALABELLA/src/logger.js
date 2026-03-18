function formatMetadata(metadata) {
  if (!metadata || Object.keys(metadata).length === 0) {
    return '';
  }

  return ` ${JSON.stringify(metadata)}`;
}

function log(level, message, metadata = undefined) {
  const timestamp = new Date().toISOString();
  const line = `[${timestamp}] ${level.toUpperCase()} ${message}${formatMetadata(metadata)}`;
  if (level === 'error') {
    console.error(line);
    return;
  }

  console.log(line);
}

export const logger = {
  info(message, metadata) {
    log('info', message, metadata);
  },
  warn(message, metadata) {
    log('warn', message, metadata);
  },
  error(message, metadata) {
    log('error', message, metadata);
  }
};