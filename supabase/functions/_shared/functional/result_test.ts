/**
 * Unit tests for Result type utilities
 * Split Lease - Supabase Edge Functions
 *
 * Tests cover the core Result monad operations:
 * - Constructors (ok, err)
 * - Predicates (isOk, isErr)
 * - Combinators (map, mapError, chain)
 * - Extractors (unwrap, unwrapOr, getOrElse)
 * - Collection utilities (all, traverse)
 */

import { assertEquals, assertThrows } from 'jsr:@std/assert';
import {
  ok,
  err,
  isOk,
  isErr,
  map,
  mapError,
  chain,
  chainAsync,
  unwrap,
  unwrapOr,
  getOrElse,
  getOrElseLazy,
  fromPromise,
  all,
  traverse,
  traverseAsync,
} from './result.ts';
import { assertOk, assertErr } from '../../tests/helpers/assertions.ts';

// ─────────────────────────────────────────────────────────────
// Constructor Tests
// ─────────────────────────────────────────────────────────────

Deno.test('ok() wraps value in success Result', () => {
  const result = ok(42);
  assertEquals(result.ok, true);
  if (result.ok) {
    assertEquals(result.value, 42);
  }
});

Deno.test('ok() wraps null value correctly', () => {
  const result = ok(null);
  assertEquals(result.ok, true);
  if (result.ok) {
    assertEquals(result.value, null);
  }
});

Deno.test('ok() wraps undefined value correctly', () => {
  const result = ok(undefined);
  assertEquals(result.ok, true);
  if (result.ok) {
    assertEquals(result.value, undefined);
  }
});

Deno.test('ok() wraps complex objects', () => {
  const data = { user: { name: 'Test', id: 123 } };
  const result = ok(data);
  assertEquals(result.ok, true);
  if (result.ok) {
    assertEquals(result.value, data);
  }
});

Deno.test('err() wraps value in error Result', () => {
  const result = err('something went wrong');
  assertEquals(result.ok, false);
  if (!result.ok) {
    assertEquals(result.error, 'something went wrong');
  }
});

Deno.test('err() wraps Error objects', () => {
  const error = new Error('Test error');
  const result = err(error);
  assertEquals(result.ok, false);
  if (!result.ok) {
    assertEquals(result.error, error);
    assertEquals(result.error.message, 'Test error');
  }
});

// ─────────────────────────────────────────────────────────────
// Predicate Tests
// ─────────────────────────────────────────────────────────────

Deno.test('isOk() returns true for success Result', () => {
  assertEquals(isOk(ok(1)), true);
  assertEquals(isOk(ok(null)), true);
  assertEquals(isOk(ok(0)), true);
});

Deno.test('isOk() returns false for error Result', () => {
  assertEquals(isOk(err('fail')), false);
  assertEquals(isOk(err(new Error('fail'))), false);
});

Deno.test('isErr() returns true for error Result', () => {
  assertEquals(isErr(err('fail')), true);
  assertEquals(isErr(err(new Error('fail'))), true);
});

Deno.test('isErr() returns false for success Result', () => {
  assertEquals(isErr(ok(1)), false);
  assertEquals(isErr(ok(null)), false);
});

// ─────────────────────────────────────────────────────────────
// Map Tests
// ─────────────────────────────────────────────────────────────

Deno.test('map() transforms success value', () => {
  const result = map(ok(5), (x) => x * 2);
  const value = assertOk(result);
  assertEquals(value, 10);
});

Deno.test('map() chains multiple transformations', () => {
  const result = map(map(ok(5), (x) => x * 2), (x) => x + 1);
  const value = assertOk(result);
  assertEquals(value, 11);
});

Deno.test('map() passes through error unchanged', () => {
  const result = map(err('fail'), (x: number) => x * 2);
  const error = assertErr(result);
  assertEquals(error, 'fail');
});

Deno.test('map() with type transformation', () => {
  const result = map(ok(42), (x) => `Value: ${x}`);
  const value = assertOk(result);
  assertEquals(value, 'Value: 42');
});

// ─────────────────────────────────────────────────────────────
// MapError Tests
// ─────────────────────────────────────────────────────────────

Deno.test('mapError() transforms error value', () => {
  const result = mapError(err('fail'), (e) => `wrapped: ${e}`);
  const error = assertErr(result);
  assertEquals(error, 'wrapped: fail');
});

Deno.test('mapError() passes through success unchanged', () => {
  const result = mapError(ok(5), (e) => `wrapped: ${e}`);
  const value = assertOk(result);
  assertEquals(value, 5);
});

Deno.test('mapError() transforms error type', () => {
  const result = mapError(err('not found'), () => new Error('Resource missing'));
  const error = assertErr(result);
  assertEquals(error instanceof Error, true);
  assertEquals(error.message, 'Resource missing');
});

// ─────────────────────────────────────────────────────────────
// Chain Tests
// ─────────────────────────────────────────────────────────────

Deno.test('chain() sequences successful Results', () => {
  const double = (x: number) => ok(x * 2);
  const result = chain(ok(5), double);
  const value = assertOk(result);
  assertEquals(value, 10);
});

Deno.test('chain() short-circuits on error', () => {
  const double = (x: number) => ok(x * 2);
  const result = chain(err('fail'), double);
  const error = assertErr(result);
  assertEquals(error, 'fail');
});

Deno.test('chain() propagates errors from chained function', () => {
  const mayFail = (x: number) => (x > 10 ? err('too big') : ok(x));
  const result = chain(ok(20), mayFail);
  const error = assertErr(result);
  assertEquals(error, 'too big');
});

Deno.test('chain() allows multiple sequential operations', () => {
  const addOne = (x: number) => ok(x + 1);
  const double = (x: number) => ok(x * 2);
  const result = chain(chain(ok(5), addOne), double);
  const value = assertOk(result);
  assertEquals(value, 12); // (5 + 1) * 2
});

// ─────────────────────────────────────────────────────────────
// ChainAsync Tests
// ─────────────────────────────────────────────────────────────

Deno.test('chainAsync() sequences async successful Results', async () => {
  const asyncDouble = async (x: number) => ok(x * 2);
  const result = await chainAsync(ok(5), asyncDouble);
  const value = assertOk(result);
  assertEquals(value, 10);
});

Deno.test('chainAsync() short-circuits on error', async () => {
  const asyncDouble = async (x: number) => ok(x * 2);
  const result = await chainAsync(err('fail'), asyncDouble);
  const error = assertErr(result);
  assertEquals(error, 'fail');
});

// ─────────────────────────────────────────────────────────────
// Unwrap Tests
// ─────────────────────────────────────────────────────────────

Deno.test('unwrap() returns value for success', () => {
  assertEquals(unwrap(ok(42)), 42);
});

Deno.test('unwrap() throws for error', () => {
  assertThrows(
    () => unwrap(err(new Error('fail'))),
    Error,
    'fail'
  );
});

Deno.test('unwrap() throws string errors', () => {
  assertThrows(() => unwrap(err('string error')));
});

// ─────────────────────────────────────────────────────────────
// UnwrapOr Tests
// ─────────────────────────────────────────────────────────────

Deno.test('unwrapOr() returns value for success', () => {
  assertEquals(unwrapOr(ok(42), () => new Error('default')), 42);
});

Deno.test('unwrapOr() throws transformed error for failure', () => {
  assertThrows(
    () => unwrapOr(err('original'), (e) => new Error(`Transformed: ${e}`)),
    Error,
    'Transformed: original'
  );
});

// ─────────────────────────────────────────────────────────────
// GetOrElse Tests
// ─────────────────────────────────────────────────────────────

Deno.test('getOrElse() returns value for success', () => {
  assertEquals(getOrElse(ok(42), 0), 42);
});

Deno.test('getOrElse() returns default for error', () => {
  assertEquals(getOrElse(err('fail'), 0), 0);
});

Deno.test('getOrElse() returns null default', () => {
  assertEquals(getOrElse(err('fail'), null), null);
});

// ─────────────────────────────────────────────────────────────
// GetOrElseLazy Tests
// ─────────────────────────────────────────────────────────────

Deno.test('getOrElseLazy() returns value for success without calling default', () => {
  let called = false;
  const result = getOrElseLazy(ok(42), () => {
    called = true;
    return 0;
  });
  assertEquals(result, 42);
  assertEquals(called, false);
});

Deno.test('getOrElseLazy() calls default function for error', () => {
  let called = false;
  const result = getOrElseLazy(err('fail'), () => {
    called = true;
    return 0;
  });
  assertEquals(result, 0);
  assertEquals(called, true);
});

// ─────────────────────────────────────────────────────────────
// FromPromise Tests
// ─────────────────────────────────────────────────────────────

Deno.test('fromPromise() wraps resolved promise in Ok', async () => {
  const result = await fromPromise(Promise.resolve(42));
  const value = assertOk(result);
  assertEquals(value, 42);
});

Deno.test('fromPromise() wraps rejected promise in Err', async () => {
  const result = await fromPromise(Promise.reject(new Error('rejected')));
  const error = assertErr(result);
  assertEquals(error.message, 'rejected');
});

Deno.test('fromPromise() converts non-Error rejections to Error', async () => {
  const result = await fromPromise(Promise.reject('string rejection'));
  const error = assertErr(result);
  assertEquals(error instanceof Error, true);
  assertEquals(error.message, 'string rejection');
});

// ─────────────────────────────────────────────────────────────
// All Tests
// ─────────────────────────────────────────────────────────────

Deno.test('all() collects all successes', () => {
  const results = [ok(1), ok(2), ok(3)];
  const collected = all(results);
  const value = assertOk(collected);
  assertEquals(value, [1, 2, 3]);
});

Deno.test('all() returns first error', () => {
  const results = [ok(1), err('first fail'), ok(3), err('second fail')];
  const collected = all(results);
  const error = assertErr(collected);
  assertEquals(error, 'first fail');
});

Deno.test('all() handles empty array', () => {
  const results: ReturnType<typeof ok<number, string>>[] = [];
  const collected = all(results);
  const value = assertOk(collected);
  assertEquals(value, []);
});

Deno.test('all() with single element', () => {
  const results = [ok(42)];
  const collected = all(results);
  const value = assertOk(collected);
  assertEquals(value, [42]);
});

// ─────────────────────────────────────────────────────────────
// Traverse Tests
// ─────────────────────────────────────────────────────────────

Deno.test('traverse() applies function and collects successes', () => {
  const items = [1, 2, 3];
  const result = traverse(items, (x) => ok(x * 2));
  const value = assertOk(result);
  assertEquals(value, [2, 4, 6]);
});

Deno.test('traverse() returns first error and short-circuits', () => {
  const items = [1, 2, 3, 4];
  let callCount = 0;
  const result = traverse(items, (x) => {
    callCount++;
    return x === 3 ? err('three is bad') : ok(x);
  });
  const error = assertErr(result);
  assertEquals(error, 'three is bad');
  assertEquals(callCount, 3); // Should have stopped at 3
});

Deno.test('traverse() handles empty array', () => {
  const items: number[] = [];
  const result = traverse(items, (x) => ok(x * 2));
  const value = assertOk(result);
  assertEquals(value, []);
});

// ─────────────────────────────────────────────────────────────
// TraverseAsync Tests
// ─────────────────────────────────────────────────────────────

Deno.test('traverseAsync() applies async function and collects successes', async () => {
  const items = [1, 2, 3];
  const result = await traverseAsync(items, async (x) => ok(x * 2));
  const value = assertOk(result);
  assertEquals(value, [2, 4, 6]);
});

Deno.test('traverseAsync() returns first error and short-circuits', async () => {
  const items = [1, 2, 3, 4];
  let callCount = 0;
  const result = await traverseAsync(items, async (x) => {
    callCount++;
    return x === 3 ? err('three is bad') : ok(x);
  });
  const error = assertErr(result);
  assertEquals(error, 'three is bad');
  assertEquals(callCount, 3);
});
