/**
 * Result Type - Functional Error Handling for Frontend
 * Split Lease - FP Utilities
 *
 * Result represents either success (Ok) or failure (Err).
 * Used instead of try/catch for business logic, enabling:
 * - Pure function composition
 * - Explicit error handling
 * - Type-safe error propagation
 *
 * Compatible with the TypeScript Result type in supabase/functions/_shared/fp/result.ts
 */

// ─────────────────────────────────────────────────────────────
// Constructors
// ─────────────────────────────────────────────────────────────

/**
 * Create a success Result
 * @param {*} value - The success value
 * @returns {{ ok: true, value: * }}
 */
export const ok = (value) => Object.freeze({ ok: true, value })

/**
 * Create a failure Result
 * @param {*} error - The error value
 * @returns {{ ok: false, error: * }}
 */
export const err = (error) => Object.freeze({ ok: false, error })

// ─────────────────────────────────────────────────────────────
// Combinators (Pure Transformations)
// ─────────────────────────────────────────────────────────────

/**
 * Transform the value inside a successful Result
 * If Result is an error, passes it through unchanged
 * @param {Object} result - The Result to transform
 * @param {Function} fn - Transform function
 * @returns {Object} New Result
 */
export const map = (result, fn) =>
  result.ok ? ok(fn(result.value)) : result

/**
 * Chain Results: flatMap/bind operation
 * If Result is successful, apply fn which returns a new Result
 * If Result is an error, passes it through unchanged
 * @param {Object} result - The Result to chain
 * @param {Function} fn - Function returning a new Result
 * @returns {Object} New Result
 */
export const chain = (result, fn) =>
  result.ok ? fn(result.value) : result

/**
 * Transform the error inside a failed Result
 * If Result is successful, passes it through unchanged
 * @param {Object} result - The Result to transform
 * @param {Function} fn - Error transform function
 * @returns {Object} New Result
 */
export const mapError = (result, fn) =>
  result.ok ? result : err(fn(result.error))

/**
 * Provide a default value for failed Results
 * @param {Object} result - The Result
 * @param {*} defaultValue - Default value for errors
 * @returns {*} The value or default
 */
export const getOrElse = (result, defaultValue) =>
  result.ok ? result.value : defaultValue

/**
 * Provide a default value lazily (only computed if needed)
 * @param {Object} result - The Result
 * @param {Function} getDefault - Function returning default
 * @returns {*} The value or computed default
 */
export const getOrElseLazy = (result, getDefault) =>
  result.ok ? result.value : getDefault()

// ─────────────────────────────────────────────────────────────
// Pattern Matching
// ─────────────────────────────────────────────────────────────

/**
 * Pattern match on Result - handle both cases
 * @param {Object} result - The Result to match
 * @param {{ ok: Function, err: Function }} handlers - Handler functions
 * @returns {*} Result of matching handler
 */
export const match = (result, { ok: onOk, err: onErr }) =>
  result.ok ? onOk(result.value) : onErr(result.error)

// ─────────────────────────────────────────────────────────────
// Promise Integration
// ─────────────────────────────────────────────────────────────

/**
 * Wrap a Promise in a Result
 * Catches any thrown errors and returns them as Err
 * @param {Promise} promise - The Promise to wrap
 * @returns {Promise<Object>} Promise of Result
 */
export const fromPromise = async (promise) => {
  try {
    const value = await promise
    return ok(value)
  } catch (e) {
    return err(e instanceof Error ? e : new Error(String(e)))
  }
}

/**
 * Wrap a throwing function in Result
 * @param {Function} fn - Function that may throw
 * @returns {Object} Result
 */
export const tryCatch = (fn) => {
  try {
    return ok(fn())
  } catch (e) {
    return err(e instanceof Error ? e : new Error(String(e)))
  }
}

// ─────────────────────────────────────────────────────────────
// Predicates
// ─────────────────────────────────────────────────────────────

/**
 * Check if Result is Ok
 * @param {Object} result - The Result to check
 * @returns {boolean}
 */
export const isOk = (result) => result.ok === true

/**
 * Check if Result is Err
 * @param {Object} result - The Result to check
 * @returns {boolean}
 */
export const isErr = (result) => result.ok === false

// ─────────────────────────────────────────────────────────────
// Collection Utilities
// ─────────────────────────────────────────────────────────────

/**
 * Combine an array of Results into a Result of array
 * If any Result is an error, returns the first error
 * If all are successful, returns array of all values
 * @param {Object[]} results - Array of Results
 * @returns {Object} Result of array
 */
export const all = (results) => {
  const values = []
  for (const result of results) {
    if (!result.ok) {
      return result
    }
    values.push(result.value)
  }
  return ok(values)
}

/**
 * Apply a function to each element and collect Results
 * Short-circuits on first error
 * @param {Array} items - Items to traverse
 * @param {Function} fn - Function returning Result
 * @returns {Object} Result of array
 */
export const traverse = (items, fn) => {
  const results = []
  for (const item of items) {
    const result = fn(item)
    if (!result.ok) {
      return result
    }
    results.push(result.value)
  }
  return ok(results)
}

// ─────────────────────────────────────────────────────────────
// Validation Helpers
// ─────────────────────────────────────────────────────────────

/**
 * Create a validation Result from a condition
 * @param {boolean} condition - The condition to check
 * @param {*} value - Value to return if valid
 * @param {string} errorMessage - Error message if invalid
 * @returns {Object} Result
 */
export const validateWith = (condition, value, errorMessage) =>
  condition ? ok(value) : err(new Error(errorMessage))

/**
 * Validate that a value is a number
 * @param {*} value - Value to validate
 * @param {string} name - Parameter name for error message
 * @returns {Object} Result<number, Error>
 */
export const validateNumber = (value, name) => {
  if (typeof value !== 'number' || isNaN(value)) {
    return err(new Error(`${name} must be a number, got ${typeof value}`))
  }
  return ok(value)
}

/**
 * Validate that a value is an array
 * @param {*} value - Value to validate
 * @param {string} name - Parameter name for error message
 * @returns {Object} Result<Array, Error>
 */
export const validateArray = (value, name) => {
  if (!Array.isArray(value)) {
    return err(new Error(`${name} must be an array, got ${typeof value}`))
  }
  return ok(value)
}

/**
 * Validate that a number is in range (inclusive)
 * @param {number} value - Value to validate
 * @param {number} min - Minimum value
 * @param {number} max - Maximum value
 * @param {string} name - Parameter name for error message
 * @returns {Object} Result<number, Error>
 */
export const validateRange = (value, min, max, name) => {
  if (value < min || value > max) {
    return err(new Error(`${name} must be between ${min}-${max}, got ${value}`))
  }
  return ok(value)
}

/**
 * Validate that an array is non-empty
 * @param {Array} arr - Array to validate
 * @param {string} name - Parameter name for error message
 * @returns {Object} Result<Array, Error>
 */
export const validateNonEmpty = (arr, name) => {
  if (arr.length === 0) {
    return err(new Error(`${name} cannot be empty`))
  }
  return ok(arr)
}
