/**
 * Validate that a value is a non-negative number.
 * @param {*} value - Value to validate
 * @param {string} paramName - Parameter name for error message
 * @param {string} functionName - Function name for error message
 * @throws {Error} If validation fails
 */
export function validateNonNegativeNumber(value, paramName, functionName) {
  if (typeof value !== 'number' || isNaN(value) || value < 0) {
    throw new Error(`${functionName}: ${paramName} must be a non-negative number, got ${typeof value}: ${value}`);
  }
}

/**
 * Validate that a value is a positive integer.
 * @param {*} value - Value to validate
 * @param {string} paramName - Parameter name for error message
 * @param {string} functionName - Function name for error message
 * @throws {Error} If validation fails
 */
export function validatePositiveInteger(value, paramName, functionName) {
  if (typeof value !== 'number' || !Number.isInteger(value) || value < 1) {
    throw new Error(`${functionName}: ${paramName} must be a positive integer, got ${typeof value}: ${value}`);
  }
}

/**
 * Validate that a value is a number (allows NaN check).
 * @param {*} value - Value to validate
 * @param {string} paramName - Parameter name for error message
 * @param {string} functionName - Function name for error message
 * @throws {Error} If validation fails
 */
export function validateNumber(value, paramName, functionName) {
  if (typeof value !== 'number' || isNaN(value)) {
    throw new Error(`${functionName}: ${paramName} must be a number, got ${typeof value}`);
  }
}

/**
 * Validate that a value is a positive number.
 * @param {*} value - Value to validate
 * @param {string} paramName - Parameter name for error message
 * @param {string} functionName - Function name for error message
 * @throws {Error} If validation fails
 */
export function validatePositiveNumber(value, paramName, functionName) {
  if (typeof value !== 'number' || isNaN(value) || value <= 0) {
    throw new Error(`${functionName}: ${paramName} must be positive, got ${value}`);
  }
}

/**
 * Validate that a value is within a specific range.
 * @param {*} value - Value to validate
 * @param {number} min - Minimum value (inclusive)
 * @param {number} max - Maximum value (inclusive)
 * @param {string} paramName - Parameter name for error message
 * @param {string} functionName - Function name for error message
 * @throws {Error} If validation fails
 */
export function validateRange(value, min, max, paramName, functionName) {
  if (typeof value !== 'number' || isNaN(value) || value < min || value > max) {
    throw new Error(`${functionName}: ${paramName} must be between ${min}-${max} nights, got ${value}`);
  }
}
