/**
 * Development-aware logging utility
 *
 * Automatically gates log/warn/debug behind development mode.
 * Errors are always logged (production + development).
 *
 * @example
 * import { logger } from '../../lib/logger.js';
 *
 * logger.log('[Component] Rendering...'); // Only in dev
 * logger.error('[Component] Failed:', err); // Always logs
 */

const isDev = import.meta.env.DEV;

export const logger = {
  log: (...args) => isDev && console.log(...args),
  warn: (...args) => isDev && console.warn(...args),
  error: (...args) => console.error(...args), // Keep errors in production
  debug: (...args) => isDev && console.debug(...args),
};
