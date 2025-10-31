/**
 * Logging utilities with different log levels
 */

/**
 * Log levels
 */
export enum LogLevel {
  DEBUG = 0,
  INFO = 1,
  WARN = 2,
  ERROR = 3,
  NONE = 4,
}

/**
 * Current log level (can be configured via environment)
 */
let currentLogLevel: LogLevel = import.meta.env?.DEV ? LogLevel.DEBUG : LogLevel.WARN;

/**
 * Set log level
 * @param level - Log level to set
 */
export function setLogLevel(level: LogLevel): void {
  currentLogLevel = level;
}

/**
 * Get current log level
 * @returns Current log level
 */
export function getLogLevel(): LogLevel {
  return currentLogLevel;
}

/**
 * Format log message with timestamp
 * @param level - Log level
 * @param message - Log message
 * @param args - Additional arguments
 * @returns Formatted log message
 */
function formatLogMessage(level: string, message: string, ...args: unknown[]): string {
  const timestamp = new Date().toISOString();
  return `[${timestamp}] [${level}] ${message}`;
}

/**
 * Check if log level should be logged
 * @param level - Log level to check
 * @returns True if should log
 */
function shouldLog(level: LogLevel): boolean {
  return level >= currentLogLevel;
}

/**
 * Log debug message
 * @param message - Message to log
 * @param args - Additional arguments
 */
export function debug(message: string, ...args: unknown[]): void {
  if (shouldLog(LogLevel.DEBUG)) {
    console.log(formatLogMessage('DEBUG', message), ...args);
  }
}

/**
 * Log info message
 * @param message - Message to log
 * @param args - Additional arguments
 */
export function info(message: string, ...args: unknown[]): void {
  if (shouldLog(LogLevel.INFO)) {
    console.log(formatLogMessage('INFO', message), ...args);
  }
}

/**
 * Log warning message
 * @param message - Message to log
 * @param args - Additional arguments
 */
export function warn(message: string, ...args: unknown[]): void {
  if (shouldLog(LogLevel.WARN)) {
    console.warn(formatLogMessage('WARN', message), ...args);
  }
}

/**
 * Log error message
 * @param message - Message to log
 * @param args - Additional arguments
 */
export function error(message: string, ...args: unknown[]): void {
  if (shouldLog(LogLevel.ERROR)) {
    console.error(formatLogMessage('ERROR', message), ...args);
  }
}

/**
 * Create a namespaced logger
 * @param namespace - Logger namespace
 * @returns Namespaced logger functions
 */
export function createLogger(namespace: string) {
  return {
    debug: (message: string, ...args: unknown[]) => debug(`[${namespace}] ${message}`, ...args),
    info: (message: string, ...args: unknown[]) => info(`[${namespace}] ${message}`, ...args),
    warn: (message: string, ...args: unknown[]) => warn(`[${namespace}] ${message}`, ...args),
    error: (message: string, ...args: unknown[]) => error(`[${namespace}] ${message}`, ...args),
  };
}

/**
 * Log table data (useful for debugging)
 * @param data - Data to log as table
 */
export function table(data: unknown): void {
  if (shouldLog(LogLevel.DEBUG)) {
    console.table(data);
  }
}

/**
 * Log group (collapsible in browser console)
 * @param label - Group label
 * @param collapsed - Whether group should be collapsed by default
 */
export function group(label: string, collapsed: boolean = false): void {
  if (shouldLog(LogLevel.DEBUG)) {
    if (collapsed) {
      console.groupCollapsed(label);
    } else {
      console.group(label);
    }
  }
}

/**
 * End log group
 */
export function groupEnd(): void {
  if (shouldLog(LogLevel.DEBUG)) {
    console.groupEnd();
  }
}

/**
 * Time a function execution
 * @param label - Timer label
 */
export function time(label: string): void {
  if (shouldLog(LogLevel.DEBUG)) {
    console.time(label);
  }
}

/**
 * End timer and log elapsed time
 * @param label - Timer label
 */
export function timeEnd(label: string): void {
  if (shouldLog(LogLevel.DEBUG)) {
    console.timeEnd(label);
  }
}

/**
 * Assert a condition and log error if false
 * @param condition - Condition to assert
 * @param message - Error message if assertion fails
 */
export function assert(condition: boolean, message: string): void {
  if (!condition) {
    error(`Assertion failed: ${message}`);
  }
}

/**
 * Log object as JSON
 * @param obj - Object to log
 * @param space - Number of spaces for indentation
 */
export function json(obj: unknown, space: number = 2): void {
  if (shouldLog(LogLevel.DEBUG)) {
    try {
      console.log(JSON.stringify(obj, null, space));
    } catch (err) {
      error('Failed to stringify object:', err);
    }
  }
}
