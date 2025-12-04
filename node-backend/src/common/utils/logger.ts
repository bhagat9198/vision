import winston from 'winston';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { env } from '../../config/env.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Ensure logs directory exists
const logsDir = path.join(__dirname, '../../../logs');
if (!fs.existsSync(logsDir)) {
  fs.mkdirSync(logsDir, { recursive: true });
}

const { combine, timestamp, printf, colorize, errors } = winston.format;

// Format for console output (colorized)
const consoleFormat = printf(({ level, message, timestamp, ...meta }) => {
  const metaString = Object.keys(meta).length ? JSON.stringify(meta) : '';
  return `${timestamp} [${level}]: ${message} ${metaString}`;
});

// Format for file output (no colors)
const fileFormat = printf(({ level, message, timestamp, ...meta }) => {
  const metaString = Object.keys(meta).length ? JSON.stringify(meta, null, 2) : '';
  return `${timestamp} [${level.toUpperCase()}]: ${message} ${metaString}`;
});

// Determine log file name based on environment
const logFileName = env.NODE_ENV === 'production' ? 'prod.log' : 'dev.log';

export const logger = winston.createLogger({
  level: env.NODE_ENV === 'production' ? 'info' : 'debug',
  format: combine(
    errors({ stack: true }),
    timestamp({ format: 'YYYY-MM-DD HH:mm:ss' })
  ),
  transports: [
    // Console transport (always)
    new winston.transports.Console({
      format: combine(colorize(), consoleFormat),
    }),
    // Main log file (dev.log or prod.log)
    new winston.transports.File({
      filename: path.join(logsDir, logFileName),
      format: fileFormat,
      maxsize: 10 * 1024 * 1024, // 10MB
      maxFiles: 5,
    }),
    // Error-only log file
    new winston.transports.File({
      filename: path.join(logsDir, 'error.log'),
      level: 'error',
      format: fileFormat,
      maxsize: 10 * 1024 * 1024, // 10MB
      maxFiles: 5,
    }),
  ],
});

// OTP-specific logger for security-sensitive operations
export const otpLogger = {
  sent: (target: string, type: string, code?: string) => {
    const maskedTarget = target.length > 4
      ? target.slice(0, 2) + '*'.repeat(target.length - 4) + target.slice(-2)
      : '****';
    // In development, show the actual code for testing
    if (env.NODE_ENV === 'development' && code) {
      logger.info(`[OTP] Code ${code} sent to ${target} for ${type}`);
    } else {
      logger.info(`[OTP] OTP sent`, { target: maskedTarget, type });
    }
  },
  verified: (target: string, type: string) => {
    const maskedTarget = target.length > 4
      ? target.slice(0, 2) + '*'.repeat(target.length - 4) + target.slice(-2)
      : '****';
    logger.info(`[OTP] Verified successfully`, { target: maskedTarget, type });
  },
  failed: (target: string, type: string, reason: string) => {
    const maskedTarget = target.length > 4
      ? target.slice(0, 2) + '*'.repeat(target.length - 4) + target.slice(-2)
      : '****';
    logger.warn(`[OTP] Verification failed`, { target: maskedTarget, type, reason });
  },
};

