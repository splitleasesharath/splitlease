/**
 * Unit tests for Pipeline utilities
 * Split Lease - Supabase Edge Functions
 *
 * Tests cover:
 * - pipe() fluent API
 * - pipeAsync() for async operations
 * - pipeValue() non-fluent pipe
 * - compose() right-to-left composition
 * - identity() and constant()
 * - when() and unless() conditionals
 * - tap() and tapAsync() side effects
 */

import { assertEquals } from 'jsr:@std/assert';
import {
  pipe,
  pipeAsync,
  pipeValue,
  compose,
  compose3,
  composeAsync,
  identity,
  constant,
  when,
  unless,
  tap,
  tapAsync,
} from './pipeline.ts';

// ─────────────────────────────────────────────────────────────
// Pipe (Fluent API) Tests
// ─────────────────────────────────────────────────────────────

Deno.test('pipe() chains functions left-to-right', () => {
  const result = pipe(5)
    .pipe((x) => x * 2)
    .pipe((x) => x + 1)
    .value();
  assertEquals(result, 11); // (5 * 2) + 1
});

Deno.test('pipe() with single function', () => {
  const result = pipe(10).pipe((x) => x / 2).value();
  assertEquals(result, 5);
});

Deno.test('pipe() returns initial value when no pipes', () => {
  const result = pipe(42).value();
  assertEquals(result, 42);
});

Deno.test('pipe() with type transformations', () => {
  const result = pipe(42)
    .pipe((x) => `Number: ${x}`)
    .pipe((s) => s.length)
    .value();
  assertEquals(result, 10); // "Number: 42".length
});

Deno.test('pipe() with array transformations', () => {
  const result = pipe([1, 2, 3])
    .pipe((arr) => arr.map((x) => x * 2))
    .pipe((arr) => arr.filter((x) => x > 2))
    .pipe((arr) => arr.reduce((sum, x) => sum + x, 0))
    .value();
  assertEquals(result, 10); // [2, 4, 6] -> [4, 6] -> 10
});

Deno.test('pipe() preserves null values', () => {
  const result = pipe(null as string | null)
    .pipe((x) => x)
    .value();
  assertEquals(result, null);
});

// ─────────────────────────────────────────────────────────────
// PipeAsync Tests
// ─────────────────────────────────────────────────────────────

Deno.test('pipeAsync() chains async functions', async () => {
  const result = await pipeAsync(Promise.resolve(5))
    .pipe(async (x) => x * 2)
    .pipe(async (x) => x + 1)
    .value();
  assertEquals(result, 11);
});

Deno.test('pipeAsync() with single async function', async () => {
  const result = await pipeAsync(Promise.resolve(10))
    .pipe(async (x) => x / 2)
    .value();
  assertEquals(result, 5);
});

Deno.test('pipeAsync() returns initial promise when no pipes', async () => {
  const result = await pipeAsync(Promise.resolve(42)).value();
  assertEquals(result, 42);
});

// ─────────────────────────────────────────────────────────────
// PipeValue (Non-Fluent) Tests
// ─────────────────────────────────────────────────────────────

Deno.test('pipeValue() with two functions', () => {
  const result = pipeValue(
    5,
    (x) => x * 2,
    (x) => x + 1
  );
  assertEquals(result, 11);
});

Deno.test('pipeValue() with three functions', () => {
  const result = pipeValue(
    5,
    (x) => x * 2,
    (x) => x + 1,
    (x) => x * 3
  );
  assertEquals(result, 33); // ((5 * 2) + 1) * 3
});

Deno.test('pipeValue() with four functions', () => {
  const result = pipeValue(
    2,
    (x) => x + 1, // 3
    (x) => x * 2, // 6
    (x) => x - 1, // 5
    (x) => x * x // 25
  );
  assertEquals(result, 25);
});

// ─────────────────────────────────────────────────────────────
// Compose Tests
// ─────────────────────────────────────────────────────────────

Deno.test('compose() chains functions right-to-left', () => {
  const addOne = (x: number) => x + 1;
  const double = (x: number) => x * 2;
  const composed = compose(addOne, double);
  assertEquals(composed(5), 11); // addOne(double(5)) = addOne(10) = 11
});

Deno.test('compose() order matters (right-to-left)', () => {
  const addOne = (x: number) => x + 1;
  const double = (x: number) => x * 2;

  // compose(f, g)(x) = f(g(x))
  const doubleFirst = compose(addOne, double); // addOne(double(5)) = 11
  const addFirst = compose(double, addOne); // double(addOne(5)) = 12

  assertEquals(doubleFirst(5), 11);
  assertEquals(addFirst(5), 12);
});

Deno.test('compose() with type transformations', () => {
  const toString = (x: number) => `Value: ${x}`;
  const double = (x: number) => x * 2;
  const composed = compose(toString, double);
  assertEquals(composed(5), 'Value: 10');
});

// ─────────────────────────────────────────────────────────────
// Compose3 Tests
// ─────────────────────────────────────────────────────────────

Deno.test('compose3() chains three functions right-to-left', () => {
  const addOne = (x: number) => x + 1;
  const double = (x: number) => x * 2;
  const square = (x: number) => x * x;
  const composed = compose3(addOne, double, square);
  // addOne(double(square(3))) = addOne(double(9)) = addOne(18) = 19
  assertEquals(composed(3), 19);
});

// ─────────────────────────────────────────────────────────────
// ComposeAsync Tests
// ─────────────────────────────────────────────────────────────

Deno.test('composeAsync() chains async functions right-to-left', async () => {
  const asyncAddOne = async (x: number) => x + 1;
  const asyncDouble = async (x: number) => x * 2;
  const composed = composeAsync(asyncAddOne, asyncDouble);
  const result = await composed(5);
  assertEquals(result, 11); // asyncAddOne(await asyncDouble(5))
});

// ─────────────────────────────────────────────────────────────
// Identity Tests
// ─────────────────────────────────────────────────────────────

Deno.test('identity() returns input unchanged', () => {
  assertEquals(identity(42), 42);
  assertEquals(identity('hello'), 'hello');
  assertEquals(identity(null), null);
});

Deno.test('identity() preserves object reference', () => {
  const obj = { a: 1 };
  assertEquals(identity(obj), obj);
  assertEquals(identity(obj) === obj, true);
});

Deno.test('identity() works in pipe', () => {
  const result = pipe(42).pipe(identity).value();
  assertEquals(result, 42);
});

// ─────────────────────────────────────────────────────────────
// Constant Tests
// ─────────────────────────────────────────────────────────────

Deno.test('constant() returns predefined value', () => {
  const always42 = constant(42);
  assertEquals(always42(), 42);
});

Deno.test('constant() ignores any arguments', () => {
  const alwaysHello = constant('hello');
  assertEquals(alwaysHello(), 'hello');
});

Deno.test('constant() returns same value each time', () => {
  const alwaysOne = constant(1);
  assertEquals(alwaysOne(), 1);
  assertEquals(alwaysOne(), 1);
  assertEquals(alwaysOne(), 1);
});

// ─────────────────────────────────────────────────────────────
// When Tests
// ─────────────────────────────────────────────────────────────

Deno.test('when() applies function if predicate is true', () => {
  const doubleIfPositive = when(
    (x: number) => x > 0,
    (x) => x * 2
  );
  assertEquals(doubleIfPositive(5), 10);
});

Deno.test('when() returns unchanged if predicate is false', () => {
  const doubleIfPositive = when(
    (x: number) => x > 0,
    (x) => x * 2
  );
  assertEquals(doubleIfPositive(-5), -5);
});

Deno.test('when() works in pipe', () => {
  const result = pipe(5)
    .pipe(when((x) => x > 3, (x) => x * 2))
    .value();
  assertEquals(result, 10);
});

// ─────────────────────────────────────────────────────────────
// Unless Tests
// ─────────────────────────────────────────────────────────────

Deno.test('unless() applies function if predicate is false', () => {
  const doubleUnlessNegative = unless(
    (x: number) => x < 0,
    (x) => x * 2
  );
  assertEquals(doubleUnlessNegative(5), 10);
});

Deno.test('unless() returns unchanged if predicate is true', () => {
  const doubleUnlessNegative = unless(
    (x: number) => x < 0,
    (x) => x * 2
  );
  assertEquals(doubleUnlessNegative(-5), -5);
});

// ─────────────────────────────────────────────────────────────
// Tap Tests
// ─────────────────────────────────────────────────────────────

Deno.test('tap() executes side effect without changing value', () => {
  let sideEffectValue = 0;
  const result = pipe(5)
    .pipe(
      tap((x) => {
        sideEffectValue = x;
      })
    )
    .pipe((x) => x * 2)
    .value();

  assertEquals(result, 10);
  assertEquals(sideEffectValue, 5);
});

Deno.test('tap() can be used for logging', () => {
  const logs: number[] = [];
  const result = pipe(1)
    .pipe((x) => x + 1)
    .pipe(tap((x) => logs.push(x)))
    .pipe((x) => x * 2)
    .pipe(tap((x) => logs.push(x)))
    .value();

  assertEquals(result, 4);
  assertEquals(logs, [2, 4]);
});

Deno.test('tap() returns original value type', () => {
  const result = tap((x: number) => console.log(x))(42);
  assertEquals(result, 42);
});

// ─────────────────────────────────────────────────────────────
// TapAsync Tests
// ─────────────────────────────────────────────────────────────

Deno.test('tapAsync() executes async side effect without changing value', async () => {
  let sideEffectValue = 0;
  const asyncTap = tapAsync<number>(async (x) => {
    sideEffectValue = x;
  });

  const result = await asyncTap(5);
  assertEquals(result, 5);
  assertEquals(sideEffectValue, 5);
});

Deno.test('tapAsync() waits for async operation', async () => {
  const operations: string[] = [];
  const asyncTap = tapAsync<number>(async (x) => {
    await new Promise((resolve) => setTimeout(resolve, 10));
    operations.push(`tapped: ${x}`);
  });

  const result = await asyncTap(42);
  assertEquals(result, 42);
  assertEquals(operations, ['tapped: 42']);
});
