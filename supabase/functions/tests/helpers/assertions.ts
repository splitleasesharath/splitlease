/**
 * Custom assertions for Split Lease Edge Function tests.
 * Extends Deno's built-in assertions with domain-specific helpers.
 */

import { assertEquals } from 'jsr:@std/assert';
import type { Result } from '../../_shared/functional/result.ts';

/**
 * Assert that a Result is Ok and return its value.
 */
export function assertOk<T, E>(result: Result<T, E>, message?: string): T {
  if (!result.ok) {
    throw new Error(message ?? `Expected Ok, got Err: ${result.error}`);
  }
  return result.value;
}

/**
 * Assert that a Result is Err and return its error.
 */
export function assertErr<T, E>(result: Result<T, E>, message?: string): E {
  if (result.ok) {
    throw new Error(message ?? `Expected Err, got Ok: ${JSON.stringify(result.value)}`);
  }
  return result.error;
}

/**
 * Assert that two Results are structurally equal.
 */
export function assertResultEquals<T, E>(
  actual: Result<T, E>,
  expected: Result<T, E>,
  message?: string
): void {
  assertEquals(actual.ok, expected.ok, message);
  if (actual.ok && expected.ok) {
    assertEquals(actual.value, expected.value, message);
  } else if (!actual.ok && !expected.ok) {
    assertEquals(actual.error, expected.error, message);
  }
}
