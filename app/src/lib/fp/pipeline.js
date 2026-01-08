/**
 * Pipeline - Function Composition Utilities
 * Split Lease - FP Utilities (Frontend)
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
 * Fluent API: pipe(value).to(fn1).to(fn2).value()
 *
 * @example
 * const result = pipe(5)
 *   .to(x => x * 2)
 *   .to(x => x + 1)
 *   .value() // 11
 *
 * @param {*} initial - Initial value
 * @returns {{ to: Function, value: Function }}
 */
export const pipe = (initial) => ({
  to: (fn) => pipe(fn(initial)),
  value: () => initial,
})

/**
 * Simple pipe: apply functions left-to-right (non-fluent)
 *
 * @example
 * pipeValue(5, x => x * 2, x => x + 1) // 11
 *
 * @param {*} initial - Initial value
 * @param {...Function} fns - Functions to apply
 * @returns {*} Final result
 */
export const pipeValue = (initial, ...fns) =>
  fns.reduce((acc, fn) => fn(acc), initial)

// ─────────────────────────────────────────────────────────────
// Compose (Right-to-Left Composition)
// ─────────────────────────────────────────────────────────────

/**
 * Compose two functions (right-to-left)
 * Mathematical convention: (g . f)(x) = g(f(x))
 *
 * @example
 * const addOneThenDouble = compose(x => x * 2, x => x + 1)
 * addOneThenDouble(5) // 12 (5+1=6, 6*2=12)
 *
 * @param {Function} g - Second function to apply
 * @param {Function} f - First function to apply
 * @returns {Function} Composed function
 */
export const compose = (g, f) => (a) => g(f(a))

/**
 * Compose three functions (right-to-left)
 * @param {Function} h - Third function
 * @param {Function} g - Second function
 * @param {Function} f - First function
 * @returns {Function} Composed function
 */
export const compose3 = (h, g, f) => (a) => h(g(f(a)))

/**
 * Compose any number of functions (right-to-left)
 * @param {...Function} fns - Functions to compose
 * @returns {Function} Composed function
 */
export const composeAll = (...fns) => (initial) =>
  fns.reduceRight((acc, fn) => fn(acc), initial)

// ─────────────────────────────────────────────────────────────
// Identity and Constant
// ─────────────────────────────────────────────────────────────

/**
 * Identity function: returns its input unchanged
 * Useful as a no-op in function composition
 * @param {*} x - Input value
 * @returns {*} Same value
 */
export const identity = (x) => x

/**
 * Constant function: ignores input, returns predefined value
 * Useful for providing default values in pipelines
 * @param {*} value - Value to always return
 * @returns {Function} Function that always returns value
 */
export const constant = (value) => () => value

// ─────────────────────────────────────────────────────────────
// Conditional Execution
// ─────────────────────────────────────────────────────────────

/**
 * Conditionally apply a transformation
 * If predicate is true, apply fn; otherwise return value unchanged
 * @param {Function} predicate - Condition function
 * @param {Function} fn - Transform function
 * @returns {Function} Conditional transform
 */
export const when = (predicate, fn) => (value) =>
  predicate(value) ? fn(value) : value

/**
 * Apply transformation unless predicate is true
 * Inverse of when
 * @param {Function} predicate - Condition function
 * @param {Function} fn - Transform function
 * @returns {Function} Conditional transform
 */
export const unless = (predicate, fn) => (value) =>
  predicate(value) ? value : fn(value)

// ─────────────────────────────────────────────────────────────
// Tap (Side Effect in Pipeline)
// ─────────────────────────────────────────────────────────────

/**
 * Execute a side effect without modifying the value
 * Useful for logging in pipelines
 *
 * @example
 * pipe(data)
 *   .to(transform)
 *   .to(tap(x => console.log('After transform:', x)))
 *   .to(format)
 *   .value()
 *
 * @param {Function} fn - Side effect function
 * @returns {Function} Pass-through function
 */
export const tap = (fn) => (value) => {
  fn(value)
  return value
}

// ─────────────────────────────────────────────────────────────
// Predicates Combinators
// ─────────────────────────────────────────────────────────────

/**
 * Negate a predicate
 * @param {Function} predicate - Predicate to negate
 * @returns {Function} Negated predicate
 */
export const not = (predicate) => (...args) => !predicate(...args)

/**
 * Combine predicates with AND
 * @param {...Function} predicates - Predicates to combine
 * @returns {Function} Combined predicate
 */
export const and = (...predicates) => (...args) =>
  predicates.every((p) => p(...args))

/**
 * Combine predicates with OR
 * @param {...Function} predicates - Predicates to combine
 * @returns {Function} Combined predicate
 */
export const or = (...predicates) => (...args) =>
  predicates.some((p) => p(...args))

// ─────────────────────────────────────────────────────────────
// Array Utilities (Functional Style)
// ─────────────────────────────────────────────────────────────

/**
 * Get first element of array
 * @param {Array} arr - Input array
 * @returns {*} First element or undefined
 */
export const head = (arr) => arr[0]

/**
 * Get all but first element
 * @param {Array} arr - Input array
 * @returns {Array} Tail of array
 */
export const tail = (arr) => arr.slice(1)

/**
 * Get last element of array
 * @param {Array} arr - Input array
 * @returns {*} Last element or undefined
 */
export const last = (arr) => arr[arr.length - 1]

/**
 * Get all but last element
 * @param {Array} arr - Input array
 * @returns {Array} Init of array
 */
export const init = (arr) => arr.slice(0, -1)

/**
 * Check if array is empty
 * @param {Array} arr - Input array
 * @returns {boolean}
 */
export const isEmpty = (arr) => arr.length === 0

/**
 * Check if array has elements
 * @param {Array} arr - Input array
 * @returns {boolean}
 */
export const isNonEmpty = (arr) => arr.length > 0
