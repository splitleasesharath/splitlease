/**
 * Result Type - Functional Error Handling
 * Split Lease - FP Utilities
 *
 * Result<T, E> represents either success (Ok) or failure (Err).
 * Used instead of try/catch for business logic, enabling:
 * - Pure function composition
 * - Explicit error handling
 * - Type-safe error propagation
 *
 * Use at boundaries: Only unwrap/throw at effect boundaries (entry points)
 */

// ─────────────────────────────────────────────────────────────
// Core Type Definition
// ─────────────────────────────────────────────────────────────

/**
 * Result type: Either success with value T, or failure with error E
 * Readonly to enforce immutability
 */
export type Result<T, E = Error> =
  | { readonly ok: true; readonly value: T }
  | { readonly ok: false; readonly error: E };

// ─────────────────────────────────────────────────────────────
// Constructors
// ─────────────────────────────────────────────────────────────

/**
 * Create a success Result
 */
export const ok = <T>(value: T): Result<T, never> => ({
  ok: true,
  value,
});

/**
 * Create a failure Result
 */
export const err = <E>(error: E): Result<never, E> => ({
  ok: false,
  error,
});

// ─────────────────────────────────────────────────────────────
// Combinators (Pure Transformations)
// ─────────────────────────────────────────────────────────────

/**
 * Transform the value inside a successful Result
 * If Result is an error, passes it through unchanged
 */
export const map = <T, U, E>(
  result: Result<T, E>,
  fn: (value: T) => U
): Result<U, E> =>
  result.ok ? ok(fn(result.value)) : result;

/**
 * Chain Results: flatMap/bind operation
 * If Result is successful, apply fn which returns a new Result
 * If Result is an error, passes it through unchanged
 */
export const chain = <T, U, E>(
  result: Result<T, E>,
  fn: (value: T) => Result<U, E>
): Result<U, E> =>
  result.ok ? fn(result.value) : result;

/**
 * Async version of chain for async functions returning Results
 */
export const chainAsync = async <T, U, E>(
  result: Result<T, E>,
  fn: (value: T) => Promise<Result<U, E>>
): Promise<Result<U, E>> =>
  result.ok ? fn(result.value) : result;

/**
 * Transform the error inside a failed Result
 * If Result is successful, passes it through unchanged
 */
export const mapError = <T, E, F>(
  result: Result<T, E>,
  fn: (error: E) => F
): Result<T, F> =>
  result.ok ? result : err(fn(result.error));

/**
 * Provide a default value for failed Results
 */
export const getOrElse = <T, E>(
  result: Result<T, E>,
  defaultValue: T
): T =>
  result.ok ? result.value : defaultValue;

/**
 * Provide a default value lazily (only computed if needed)
 */
export const getOrElseLazy = <T, E>(
  result: Result<T, E>,
  getDefault: () => T
): T =>
  result.ok ? result.value : getDefault();

// ─────────────────────────────────────────────────────────────
// Promise Integration
// ─────────────────────────────────────────────────────────────

/**
 * Wrap a Promise in a Result
 * Catches any thrown errors and returns them as Err
 */
export const fromPromise = async <T>(
  promise: Promise<T>
): Promise<Result<T, Error>> => {
  try {
    const value = await promise;
    return ok(value);
  } catch (e) {
    return err(e instanceof Error ? e : new Error(String(e)));
  }
};

/**
 * Wrap an async function in Result error handling
 * Returns a function that catches errors and returns Results
 */
export const fromAsync = <Args extends unknown[], T>(
  fn: (...args: Args) => Promise<T>
): ((...args: Args) => Promise<Result<T, Error>>) =>
  async (...args) => {
    try {
      return ok(await fn(...args));
    } catch (e) {
      return err(e instanceof Error ? e : new Error(String(e)));
    }
  };

// ─────────────────────────────────────────────────────────────
// Effect Boundary Utilities
// ─────────────────────────────────────────────────────────────

/**
 * Unwrap a Result, throwing if it's an error
 * ONLY USE AT EFFECT BOUNDARIES (top level handlers)
 */
export const unwrap = <T, E>(result: Result<T, E>): T => {
  if (result.ok) {
    return result.value;
  }
  throw result.error;
};

/**
 * Unwrap a Result with a custom error transformer
 * ONLY USE AT EFFECT BOUNDARIES
 */
export const unwrapOr = <T, E>(
  result: Result<T, E>,
  transformError: (error: E) => Error
): T => {
  if (result.ok) {
    return result.value;
  }
  throw transformError(result.error);
};

// ─────────────────────────────────────────────────────────────
// Predicates
// ─────────────────────────────────────────────────────────────

/**
 * Type guard: check if Result is Ok
 */
export const isOk = <T, E>(result: Result<T, E>): result is { ok: true; value: T } =>
  result.ok;

/**
 * Type guard: check if Result is Err
 */
export const isErr = <T, E>(result: Result<T, E>): result is { ok: false; error: E } =>
  !result.ok;

// ─────────────────────────────────────────────────────────────
// Collection Utilities
// ─────────────────────────────────────────────────────────────

/**
 * Combine an array of Results into a Result of array
 * If any Result is an error, returns the first error
 * If all are successful, returns array of all values
 */
export const all = <T, E>(results: Result<T, E>[]): Result<T[], E> => {
  const values: T[] = [];
  for (const result of results) {
    if (!result.ok) {
      return result;
    }
    values.push(result.value);
  }
  return ok(values);
};

/**
 * Apply a function to each element and collect Results
 * Short-circuits on first error
 */
export const traverse = <T, U, E>(
  items: T[],
  fn: (item: T) => Result<U, E>
): Result<U[], E> => {
  const results: U[] = [];
  for (const item of items) {
    const result = fn(item);
    if (!result.ok) {
      return result;
    }
    results.push(result.value);
  }
  return ok(results);
};

/**
 * Async version of traverse
 */
export const traverseAsync = async <T, U, E>(
  items: T[],
  fn: (item: T) => Promise<Result<U, E>>
): Promise<Result<U[], E>> => {
  const results: U[] = [];
  for (const item of items) {
    const result = await fn(item);
    if (!result.ok) {
      return result;
    }
    results.push(result.value);
  }
  return ok(results);
};
