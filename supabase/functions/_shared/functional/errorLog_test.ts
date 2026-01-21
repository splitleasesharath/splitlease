/**
 * Unit tests for ErrorLog utilities
 * Split Lease - Supabase Edge Functions
 *
 * Tests cover:
 * - createErrorLog() - initialization
 * - addError() - immutable error addition
 * - setUserId() - adding user context
 * - setAction() - updating action
 * - hasErrors() - error presence check
 * - getErrorCount() - error counting
 * - getPrimaryError() - first error extraction
 * - formatForSlack() - Slack formatting
 * - formatAsJson() - JSON formatting
 * - formatForConsole() - console formatting
 */

import { assertEquals } from 'jsr:@std/assert';
import {
  createErrorLog,
  addError,
  setUserId,
  setAction,
  hasErrors,
  getErrorCount,
  getPrimaryError,
  formatForSlack,
  formatAsJson,
  formatForConsole,
} from './errorLog.ts';

// ─────────────────────────────────────────────────────────────
// Constructor Tests
// ─────────────────────────────────────────────────────────────

Deno.test('createErrorLog() initializes empty log', () => {
  const log = createErrorLog('test-function', 'test-action');
  assertEquals(hasErrors(log), false);
  assertEquals(getErrorCount(log), 0);
});

Deno.test('createErrorLog() sets function name', () => {
  const log = createErrorLog('auth-user', 'login');
  assertEquals(log.functionName, 'auth-user');
});

Deno.test('createErrorLog() sets action', () => {
  const log = createErrorLog('auth-user', 'login');
  assertEquals(log.action, 'login');
});

Deno.test('createErrorLog() generates correlation ID when not provided', () => {
  const log = createErrorLog('test-function', 'test-action');
  assertEquals(typeof log.correlationId, 'string');
  assertEquals(log.correlationId.length, 8);
});

Deno.test('createErrorLog() uses provided correlation ID', () => {
  const log = createErrorLog('test-function', 'test-action', 'custom-id');
  assertEquals(log.correlationId, 'custom-id');
});

Deno.test('createErrorLog() sets start time', () => {
  const log = createErrorLog('test-function', 'test-action');
  assertEquals(typeof log.startTime, 'string');
  // Verify it's a valid ISO date
  const date = new Date(log.startTime);
  assertEquals(isNaN(date.getTime()), false);
});

// ─────────────────────────────────────────────────────────────
// addError Tests
// ─────────────────────────────────────────────────────────────

Deno.test('addError() returns new log with error added', () => {
  const log = createErrorLog('test-function', 'test-action');
  const error = new Error('Something went wrong');
  const logWithError = addError(log, error, 'processing step');

  assertEquals(hasErrors(log), false); // Original unchanged
  assertEquals(hasErrors(logWithError), true); // New log has error
});

Deno.test('addError() preserves original log immutability', () => {
  const log = createErrorLog('test-function', 'test-action');
  const logWithError = addError(log, new Error('Test'), 'step 1');

  assertEquals(log.errors.length, 0);
  assertEquals(logWithError.errors.length, 1);
});

Deno.test('addError() preserves previous errors', () => {
  const log = createErrorLog('test-function', 'test-action');
  const log1 = addError(log, new Error('First'), 'step 1');
  const log2 = addError(log1, new Error('Second'), 'step 2');

  assertEquals(getErrorCount(log2), 2);
});

Deno.test('addError() includes error context', () => {
  const log = createErrorLog('test-function', 'test-action');
  const logWithError = addError(log, new Error('Test'), 'during validation');

  assertEquals(logWithError.errors[0].context, 'during validation');
});

Deno.test('addError() sets timestamp on error', () => {
  const log = createErrorLog('test-function', 'test-action');
  const logWithError = addError(log, new Error('Test'), 'step 1');

  assertEquals(typeof logWithError.errors[0].timestamp, 'string');
  const date = new Date(logWithError.errors[0].timestamp);
  assertEquals(isNaN(date.getTime()), false);
});

Deno.test('addError() works without context', () => {
  const log = createErrorLog('test-function', 'test-action');
  const logWithError = addError(log, new Error('Test'));

  assertEquals(hasErrors(logWithError), true);
  assertEquals(logWithError.errors[0].context, undefined);
});

// ─────────────────────────────────────────────────────────────
// setUserId Tests
// ─────────────────────────────────────────────────────────────

Deno.test('setUserId() returns new log with user ID', () => {
  const log = createErrorLog('test-function', 'test-action');
  const logWithUser = setUserId(log, 'user-123');

  assertEquals(log.userId, undefined); // Original unchanged
  assertEquals(logWithUser.userId, 'user-123');
});

Deno.test('setUserId() preserves other log properties', () => {
  const log = createErrorLog('test-function', 'test-action');
  const logWithError = addError(log, new Error('Test'), 'step 1');
  const logWithUser = setUserId(logWithError, 'user-123');

  assertEquals(logWithUser.functionName, 'test-function');
  assertEquals(logWithUser.action, 'test-action');
  assertEquals(getErrorCount(logWithUser), 1);
});

// ─────────────────────────────────────────────────────────────
// setAction Tests
// ─────────────────────────────────────────────────────────────

Deno.test('setAction() returns new log with updated action', () => {
  const log = createErrorLog('test-function', 'unknown');
  const logWithAction = setAction(log, 'login');

  assertEquals(log.action, 'unknown'); // Original unchanged
  assertEquals(logWithAction.action, 'login');
});

// ─────────────────────────────────────────────────────────────
// Predicate Tests
// ─────────────────────────────────────────────────────────────

Deno.test('hasErrors() returns false for empty log', () => {
  const log = createErrorLog('test-function', 'test-action');
  assertEquals(hasErrors(log), false);
});

Deno.test('hasErrors() returns true when log has errors', () => {
  const log = createErrorLog('test-function', 'test-action');
  const logWithError = addError(log, new Error('Test'));
  assertEquals(hasErrors(logWithError), true);
});

Deno.test('getErrorCount() returns 0 for empty log', () => {
  const log = createErrorLog('test-function', 'test-action');
  assertEquals(getErrorCount(log), 0);
});

Deno.test('getErrorCount() returns correct count', () => {
  let log = createErrorLog('test-function', 'test-action');
  log = addError(log, new Error('Error 1'));
  log = addError(log, new Error('Error 2'));
  log = addError(log, new Error('Error 3'));
  assertEquals(getErrorCount(log), 3);
});

Deno.test('getPrimaryError() returns null for empty log', () => {
  const log = createErrorLog('test-function', 'test-action');
  assertEquals(getPrimaryError(log), null);
});

Deno.test('getPrimaryError() returns first error', () => {
  const log = createErrorLog('test-function', 'test-action');
  const firstError = new Error('First error');
  const secondError = new Error('Second error');
  const log1 = addError(log, firstError);
  const log2 = addError(log1, secondError);

  assertEquals(getPrimaryError(log2), firstError);
});

// ─────────────────────────────────────────────────────────────
// formatForSlack Tests
// ─────────────────────────────────────────────────────────────

Deno.test('formatForSlack() includes function and action in header', () => {
  const log = createErrorLog('auth-user', 'login');
  const logWithError = addError(log, new Error('Auth failed'), 'verify token');
  const formatted = formatForSlack(logWithError);

  assertEquals(formatted.includes('[Edge Function Error] auth-user/login'), true);
});

Deno.test('formatForSlack() includes correlation ID', () => {
  const log = createErrorLog('auth-user', 'login', 'corr-123');
  const formatted = formatForSlack(log);

  assertEquals(formatted.includes('Request ID: corr-123'), true);
});

Deno.test('formatForSlack() includes user ID when present', () => {
  const log = setUserId(createErrorLog('auth-user', 'login'), 'user-456');
  const formatted = formatForSlack(log);

  assertEquals(formatted.includes('User ID: user-456'), true);
});

Deno.test('formatForSlack() shows "No errors recorded" for empty log', () => {
  const log = createErrorLog('auth-user', 'login');
  const formatted = formatForSlack(log);

  assertEquals(formatted.includes('No errors recorded'), true);
});

Deno.test('formatForSlack() includes error details for single error', () => {
  const log = createErrorLog('auth-user', 'login');
  const logWithError = addError(log, new Error('Token expired'), 'validating JWT');
  const formatted = formatForSlack(logWithError);

  assertEquals(formatted.includes('Error Type: Error'), true);
  assertEquals(formatted.includes('Message: Token expired'), true);
  assertEquals(formatted.includes('Context: validating JWT'), true);
});

Deno.test('formatForSlack() shows total count for multiple errors', () => {
  let log = createErrorLog('auth-user', 'login');
  log = addError(log, new Error('Error 1'));
  log = addError(log, new Error('Error 2'));
  log = addError(log, new Error('Error 3'));
  const formatted = formatForSlack(log);

  assertEquals(formatted.includes('Total Errors: 3'), true);
});

Deno.test('formatForSlack() limits errors shown to 5', () => {
  let log = createErrorLog('auth-user', 'login');
  for (let i = 1; i <= 7; i++) {
    log = addError(log, new Error(`Error ${i}`));
  }
  const formatted = formatForSlack(log);

  assertEquals(formatted.includes('Total Errors: 7'), true);
  assertEquals(formatted.includes('... and 2 more errors'), true);
});

// ─────────────────────────────────────────────────────────────
// formatAsJson Tests
// ─────────────────────────────────────────────────────────────

Deno.test('formatAsJson() returns valid JSON', () => {
  const log = createErrorLog('auth-user', 'login');
  const json = formatAsJson(log);
  const parsed = JSON.parse(json);

  assertEquals(parsed.functionName, 'auth-user');
  assertEquals(parsed.action, 'login');
  assertEquals(parsed.errorCount, 0);
});

Deno.test('formatAsJson() includes error details', () => {
  const log = createErrorLog('auth-user', 'login');
  const logWithError = addError(log, new Error('Test error'), 'context');
  const json = formatAsJson(logWithError);
  const parsed = JSON.parse(json);

  assertEquals(parsed.errorCount, 1);
  assertEquals(parsed.errors[0].name, 'Error');
  assertEquals(parsed.errors[0].message, 'Test error');
  assertEquals(parsed.errors[0].context, 'context');
});

// ─────────────────────────────────────────────────────────────
// formatForConsole Tests
// ─────────────────────────────────────────────────────────────

Deno.test('formatForConsole() returns "No errors" for empty log', () => {
  const log = createErrorLog('auth-user', 'login');
  const formatted = formatForConsole(log);

  assertEquals(formatted, '[auth-user/login] No errors');
});

Deno.test('formatForConsole() shows primary error', () => {
  const log = createErrorLog('auth-user', 'login');
  const logWithError = addError(log, new Error('Token expired'));
  const formatted = formatForConsole(logWithError);

  assertEquals(formatted, '[auth-user/login] Error: Token expired');
});

Deno.test('formatForConsole() shows count suffix for multiple errors', () => {
  let log = createErrorLog('auth-user', 'login');
  log = addError(log, new Error('First error'));
  log = addError(log, new Error('Second error'));
  log = addError(log, new Error('Third error'));
  const formatted = formatForConsole(log);

  assertEquals(formatted, '[auth-user/login] Error: First error (+2 more)');
});
