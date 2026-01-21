/**
 * Pipeline - Function Composition Utilities
 * Split Lease - FP Utilities
 *
 * Utilities for composing functions in a clean, readable way.
 * - pipe: Left-to-right composition (data flows forward)
 * - compose: Right-to-left composition (mathematical convention)
 *
 * These enable building complex transformations from simple, pure functions.
 */

// ─────────────────────────────────────────────────────────────
// Pipe (Left-to-Right Composition)
// ─────────────────────────────────────────────────────────────

/**
 * Pipe a value through a series of functions (left-to-right)
 * Fluent API: pipe(value).pipe(fn1).pipe(fn2).value()
 *
 * @example
 * const result = pipe(5)
 *   .pipe(x => x * 2)
 *   .pipe(x => x + 1)
 *   .value(); // 11
 */
export const pipe = <A>(initial: A) => ({
  pipe: <B>(fn: (a: A) => B) => pipe(fn(initial)),
  value: (): A => initial,
});

/**
 * Async pipe for chaining async operations
 * Fluent API: pipeAsync(promise).pipe(asyncFn).value()
 *
 * @example
 * const result = await pipeAsync(Promise.resolve(5))
 *   .pipe(async x => x * 2)
 *   .pipe(async x => x + 1)
 *   .value(); // 11
 */
export const pipeAsync = <T>(initial: Promise<T>) => ({
  pipe: <U>(fn: (value: T) => Promise<U>) =>
    pipeAsync(initial.then(fn)),
  value: (): Promise<T> => initial,
});

// ─────────────────────────────────────────────────────────────
// Direct Pipe Functions (Non-Fluent)
// ─────────────────────────────────────────────────────────────

/**
 * Simple pipe: apply functions left-to-right
 * Non-fluent version for simple cases
 */
export function pipeValue<A, B>(a: A, ab: (a: A) => B): B;
export function pipeValue<A, B, C>(a: A, ab: (a: A) => B, bc: (b: B) => C): C;
export function pipeValue<A, B, C, D>(
  a: A,
  ab: (a: A) => B,
  bc: (b: B) => C,
  cd: (c: C) => D
): D;
export function pipeValue<A, B, C, D, E>(
  a: A,
  ab: (a: A) => B,
  bc: (b: B) => C,
  cd: (c: C) => D,
  de: (d: D) => E
): E;
export function pipeValue(
  initial: unknown,
  ...fns: ((arg: unknown) => unknown)[]
): unknown {
  return fns.reduce((acc, fn) => fn(acc), initial);
}

// ─────────────────────────────────────────────────────────────
// Compose (Right-to-Left Composition)
// ─────────────────────────────────────────────────────────────

/**
 * Compose two functions (right-to-left)
 * Mathematical convention: (g . f)(x) = g(f(x))
 *
 * @example
 * const addOneThenDouble = compose(x => x * 2, x => x + 1);
 * addOneThenDouble(5); // 12 (5+1=6, 6*2=12)
 */
export const compose = <A, B, C>(
  g: (b: B) => C,
  f: (a: A) => B
): ((a: A) => C) =>
  (a) => g(f(a));

/**
 * Compose three functions
 */
export const compose3 = <A, B, C, D>(
  h: (c: C) => D,
  g: (b: B) => C,
  f: (a: A) => B
): ((a: A) => D) =>
  (a) => h(g(f(a)));

/**
 * Async compose for async functions (right-to-left)
 */
export const composeAsync = <A, B, C>(
  g: (b: B) => Promise<C>,
  f: (a: A) => Promise<B>
): ((a: A) => Promise<C>) =>
  async (a) => g(await f(a));

// ─────────────────────────────────────────────────────────────
// Identity and Constant
// ─────────────────────────────────────────────────────────────

/**
 * Identity function: returns its input unchanged
 * Useful as a no-op in function composition
 */
export const identity = <T>(x: T): T => x;

/**
 * Constant function: ignores input, returns predefined value
 * Useful for providing default values in pipelines
 */
export const constant = <T>(value: T): (() => T) => () => value;

// ─────────────────────────────────────────────────────────────
// Conditional Execution
// ─────────────────────────────────────────────────────────────

/**
 * Conditionally apply a transformation
 * If predicate is true, apply fn; otherwise return value unchanged
 */
export const when = <T>(
  predicate: (value: T) => boolean,
  fn: (value: T) => T
): ((value: T) => T) =>
  (value) => predicate(value) ? fn(value) : value;

/**
 * Apply transformation unless predicate is true
 * Inverse of when
 */
export const unless = <T>(
  predicate: (value: T) => boolean,
  fn: (value: T) => T
): ((value: T) => T) =>
  (value) => predicate(value) ? value : fn(value);

// ─────────────────────────────────────────────────────────────
// Tap (Side Effect in Pipeline)
// ─────────────────────────────────────────────────────────────

/**
 * Execute a side effect without modifying the value
 * Useful for logging in pipelines
 *
 * @example
 * pipe(data)
 *   .pipe(transform)
 *   .pipe(tap(x => console.log('After transform:', x)))
 *   .pipe(format)
 *   .value()
 */
export const tap = <T>(fn: (value: T) => void): ((value: T) => T) =>
  (value) => {
    fn(value);
    return value;
  };

/**
 * Async tap for async side effects
 */
export const tapAsync = <T>(
  fn: (value: T) => Promise<void>
): ((value: T) => Promise<T>) =>
  async (value) => {
    await fn(value);
    return value;
  };
