/**
 * Development-aware logging utility with configurable log levels
 *
 * Automatically gates log levels based on environment.
 * In production: only WARN and ERROR are logged
 * In development: DEBUG, INFO, WARN, and ERROR are logged
 *
 * @example
 * import { logger } from '../../lib/logger.js';
 *
 * logger.debug('📅 ViewSplitLeasePage: Loading schedule'); // Only in dev
 * logger.info('[Component] Rendering...'); // Only in dev
 * logger.warn('[Component] Deprecated API used'); // Dev + prod
 * logger.error('[Component] Failed:', err); // Always logs
 */

const LOG_LEVEL = {
  DEBUG: 0,
  INFO: 1,
  WARN: 2,
  ERROR: 3,
  NONE: 4
};

// Set via environment: production uses WARN level, development uses DEBUG level
const currentLevel = import.meta.env.PROD ? LOG_LEVEL.WARN : LOG_LEVEL.DEBUG;

export const logger = {
  debug: (...args) => currentLevel <= LOG_LEVEL.DEBUG && console.log('[DEBUG]', ...args),
  info: (...args) => currentLevel <= LOG_LEVEL.INFO && console.log('[INFO]', ...args),
  warn: (...args) => currentLevel <= LOG_LEVEL.WARN && console.warn('[WARN]', ...args),
  error: (...args) => currentLevel <= LOG_LEVEL.ERROR && console.error('[ERROR]', ...args)
};
