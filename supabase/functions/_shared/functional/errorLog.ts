/**
 * ErrorLog - Immutable Error Collection
 * Split Lease - FP Utilities
 *
 * Functional replacement for the ErrorCollector class.
 * All operations return new immutable structures instead of mutating.
 *
 * Pattern: Create log -> Add errors via pure functions -> Format at boundary
 */

// ─────────────────────────────────────────────────────────────
// Types
// ─────────────────────────────────────────────────────────────

/**
 * A single collected error with context
 */
interface CollectedError {
  readonly error: Error;
  readonly context?: string;
  readonly timestamp: string;
}

/**
 * Immutable error log for a request lifecycle
 */
export interface ErrorLog {
  readonly functionName: string;
  readonly action: string;
  readonly correlationId: string;
  readonly startTime: string;
  readonly userId?: string;
  readonly errors: ReadonlyArray<CollectedError>;
}

// ─────────────────────────────────────────────────────────────
// Constructors (Pure)
// ─────────────────────────────────────────────────────────────

/**
 * Create a new error log for a request
 * Pure function - only creates data structure
 */
export const createErrorLog = (
  functionName: string,
  action: string,
  correlationId: string = crypto.randomUUID().slice(0, 8)
): ErrorLog => ({
  functionName,
  action,
  correlationId,
  startTime: new Date().toISOString(),
  errors: [],
});

// ─────────────────────────────────────────────────────────────
// Transformations (Pure)
// ─────────────────────────────────────────────────────────────

/**
 * Add an error to the log (returns new log, original unchanged)
 */
export const addError = (
  log: ErrorLog,
  error: Error,
  context?: string
): ErrorLog => ({
  ...log,
  errors: [
    ...log.errors,
    {
      error,
      context,
      timestamp: new Date().toISOString(),
    },
  ],
});

/**
 * Set the user ID on the log (returns new log)
 */
export const setUserId = (log: ErrorLog, userId: string): ErrorLog => ({
  ...log,
  userId,
});

/**
 * Update the action name (for when action is parsed after log creation)
 */
export const setAction = (log: ErrorLog, action: string): ErrorLog => ({
  ...log,
  action,
});

// ─────────────────────────────────────────────────────────────
// Predicates (Pure)
// ─────────────────────────────────────────────────────────────

/**
 * Check if the log contains any errors
 */
export const hasErrors = (log: ErrorLog): boolean =>
  log.errors.length > 0;

/**
 * Get the error count
 */
export const getErrorCount = (log: ErrorLog): number =>
  log.errors.length;

/**
 * Get the primary (first) error, if any
 */
export const getPrimaryError = (log: ErrorLog): Error | null =>
  log.errors.length > 0 ? log.errors[0].error : null;

// ─────────────────────────────────────────────────────────────
// Formatters (Pure)
// ─────────────────────────────────────────────────────────────

/**
 * Format the error log for Slack notification
 * Pure function - produces string from data
 */
export const formatForSlack = (log: ErrorLog): string => {
  const lines: string[] = [];

  // Header
  lines.push(`[Edge Function Error] ${log.functionName}/${log.action}`);
  lines.push('');

  // Request metadata
  lines.push(`Request ID: ${log.correlationId}`);
  lines.push(`Timestamp: ${log.startTime}`);
  if (log.userId) {
    lines.push(`User ID: ${log.userId}`);
  }
  lines.push('');

  // Error details
  const errorCount = log.errors.length;

  if (errorCount === 0) {
    lines.push('No errors recorded');
  } else if (errorCount === 1) {
    const err = log.errors[0];
    lines.push(`Error Type: ${err.error.name}`);
    lines.push(`Message: ${err.error.message}`);
    if (err.context) {
      lines.push(`Context: ${err.context}`);
    }
  } else {
    lines.push(`Total Errors: ${errorCount}`);
    lines.push('');

    // Show up to 5 errors
    const errorsToShow = log.errors.slice(0, 5);
    errorsToShow.forEach((err, index) => {
      lines.push(`--- Error ${index + 1} ---`);
      lines.push(`Type: ${err.error.name}`);
      lines.push(`Message: ${err.error.message}`);
      if (err.context) {
        lines.push(`Context: ${err.context}`);
      }
      lines.push('');
    });

    if (errorCount > 5) {
      lines.push(`... and ${errorCount - 5} more errors (check Supabase logs)`);
    }
  }

  return lines.join('\n');
};

/**
 * Format the error log as JSON for structured logging
 */
export const formatAsJson = (log: ErrorLog): string =>
  JSON.stringify({
    functionName: log.functionName,
    action: log.action,
    correlationId: log.correlationId,
    startTime: log.startTime,
    userId: log.userId,
    errorCount: log.errors.length,
    errors: log.errors.map(e => ({
      name: e.error.name,
      message: e.error.message,
      context: e.context,
      timestamp: e.timestamp,
    })),
  }, null, 2);

/**
 * Format for console logging (abbreviated)
 */
export const formatForConsole = (log: ErrorLog): string => {
  if (log.errors.length === 0) {
    return `[${log.functionName}/${log.action}] No errors`;
  }

  const primary = log.errors[0];
  const countSuffix = log.errors.length > 1
    ? ` (+${log.errors.length - 1} more)`
    : '';

  return `[${log.functionName}/${log.action}] ${primary.error.name}: ${primary.error.message}${countSuffix}`;
};
