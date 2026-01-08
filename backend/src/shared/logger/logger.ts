import winston from 'winston';
import { env } from '@/shared/config/index.js';

const { combine, timestamp, printf, colorize, json } = winston.format;

// Custom format for development (readable)
const devFormat = printf(({ level, message, timestamp, ...metadata }) => {
  const meta = Object.keys(metadata).length ? JSON.stringify(metadata, null, 2) : '';
  return `${timestamp as string} [${level}]: ${message as string} ${meta}`;
});

// Sanitize sensitive data from logs
const sanitizeFormat = winston.format((info) => {
  // Never log plain cookies or sensitive data
  if (info.cookie) {
    info.cookie = '[REDACTED]';
  }
  if (info.sessionId) {
    info.sessionId = '[REDACTED]';
  }
  if (info.password) {
    info.password = '[REDACTED]';
  }
  return info;
});

// Determine log level: use LOG_LEVEL env var if set, otherwise default based on NODE_ENV
const getLogLevel = (): string => {
  if (env.LOG_LEVEL) {
    return env.LOG_LEVEL;
  }
  return env.NODE_ENV === 'production' ? 'info' : 'debug';
};

// Application version from package.json (available via npm scripts or fallback)
const APP_VERSION = process.env.npm_package_version || '1.0.0';

const logger = winston.createLogger({
  level: getLogLevel(),
  format: combine(sanitizeFormat(), timestamp({ format: 'YYYY-MM-DD HH:mm:ss' })),
  defaultMeta: { service: 'retropulse-backend', version: APP_VERSION },
  transports: [
    // Console transport
    new winston.transports.Console({
      format:
        env.NODE_ENV === 'production'
          ? combine(timestamp(), json())
          : combine(colorize(), timestamp({ format: 'HH:mm:ss' }), devFormat),
    }),
  ],
});

// Add file transport in production
if (env.NODE_ENV === 'production') {
  logger.add(
    new winston.transports.File({
      filename: 'logs/error.log',
      level: 'error',
      format: combine(timestamp(), json()),
    })
  );
  logger.add(
    new winston.transports.File({
      filename: 'logs/combined.log',
      format: combine(timestamp(), json()),
    })
  );
}

export { logger };
