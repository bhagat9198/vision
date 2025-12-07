/**
 * =============================================================================
 * Logger Utility
 * =============================================================================
 * Simple structured logger with timestamp and log levels.
 * =============================================================================
 */

type LogLevel = 'debug' | 'info' | 'warn' | 'error';

const LOG_LEVELS: Record<LogLevel, number> = {
  debug: 0,
  info: 1,
  warn: 2,
  error: 3,
};

// Get configured log level (default: info)
const configuredLevel = (process.env.LOG_LEVEL as LogLevel) || 'info';
const minLevel = LOG_LEVELS[configuredLevel] ?? LOG_LEVELS.info;

/**
 * Format log message with timestamp and level.
 */
function formatMessage(level: LogLevel, message: string, meta?: unknown): string {
  const timestamp = new Date().toISOString();
  const prefix = `[${timestamp}] [${level.toUpperCase()}]`;

  if (meta !== undefined) {
    const metaStr = typeof meta === 'object' ? JSON.stringify(meta) : String(meta);
    return `${prefix} ${message} ${metaStr}`;
  }

  return `${prefix} ${message}`;
}

/**
 * Check if a log level should be output.
 */
function shouldLog(level: LogLevel): boolean {
  return LOG_LEVELS[level] >= minLevel;
}

/**
 * Structured logger with colored output.
 */
export const logger = {
  /**
   * Debug level - verbose information for debugging.
   */
  debug(message: string, meta?: unknown): void {
    if (shouldLog('debug')) {
      console.debug('\x1b[36m%s\x1b[0m', formatMessage('debug', message, meta));
    }
  },

  /**
   * Info level - general operational information.
   */
  info(message: string, meta?: unknown): void {
    if (shouldLog('info')) {
      console.info('\x1b[32m%s\x1b[0m', formatMessage('info', message, meta));
    }
  },

  /**
   * Warn level - warning conditions that should be addressed.
   */
  warn(message: string, meta?: unknown): void {
    if (shouldLog('warn')) {
      console.warn('\x1b[33m%s\x1b[0m', formatMessage('warn', message, meta));
    }
  },

  /**
   * Error level - error conditions.
   */
  error(message: string, meta?: unknown): void {
    if (shouldLog('error')) {
      console.error('\x1b[31m%s\x1b[0m', formatMessage('error', message, meta));
    }
  },
};

