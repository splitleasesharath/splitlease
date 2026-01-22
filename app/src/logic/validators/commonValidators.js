/**
 * Common Validation Utilities
 *
 * Centralized validators for consistent error handling across the codebase.
 * All validators throw errors on failure (NO FALLBACK philosophy).
 *
 * @module validators/commonValidators
 */

/**
 * Validate that a value is a non-empty string.
 *
 * @param {*} value - Value to validate
 * @param {string} paramName - Parameter name for error message
 * @param {string} functionName - Calling function name for error message
 * @throws {Error} If value is not a non-empty string
 * @returns {string} The trimmed string value (for chaining)
 */
export function validateString(value, paramName, functionName) {
  if (typeof value !== 'string') {
    throw new Error(
      `${functionName}: ${paramName} must be a string, got ${typeof value}`
    );
  }
  return value;
}

/**
 * Validate that a value is a non-empty string after trimming.
 *
 * @param {*} value - Value to validate
 * @param {string} paramName - Parameter name for error message
 * @param {string} functionName - Calling function name for error message
 * @throws {Error} If value is not a non-empty string
 * @returns {string} The trimmed string value
 */
export function validateNonEmptyString(value, paramName, functionName) {
  validateString(value, paramName, functionName);
  const trimmed = value.trim();
  if (trimmed.length === 0) {
    throw new Error(
      `${functionName}: ${paramName} cannot be empty or whitespace`
    );
  }
  return trimmed;
}

/**
 * Validate that a value is a boolean.
 *
 * @param {*} value - Value to validate
 * @param {string} paramName - Parameter name for error message
 * @param {string} functionName - Calling function name for error message
 * @throws {Error} If value is not a boolean
 * @returns {boolean} The boolean value
 */
export function validateBoolean(value, paramName, functionName) {
  if (typeof value !== 'boolean') {
    throw new Error(
      `${functionName}: ${paramName} must be a boolean, got ${typeof value}`
    );
  }
  return value;
}

/**
 * Validate that a value is an array.
 *
 * @param {*} value - Value to validate
 * @param {string} paramName - Parameter name for error message
 * @param {string} functionName - Calling function name for error message
 * @throws {Error} If value is not an array
 * @returns {Array} The array value
 */
export function validateArray(value, paramName, functionName) {
  if (!Array.isArray(value)) {
    throw new Error(
      `${functionName}: ${paramName} must be an array, got ${typeof value}`
    );
  }
  return value;
}

/**
 * Validate that a value is a non-empty array.
 *
 * @param {*} value - Value to validate
 * @param {string} paramName - Parameter name for error message
 * @param {string} functionName - Calling function name for error message
 * @throws {Error} If value is not a non-empty array
 * @returns {Array} The array value
 */
export function validateNonEmptyArray(value, paramName, functionName) {
  validateArray(value, paramName, functionName);
  if (value.length === 0) {
    throw new Error(
      `${functionName}: ${paramName} cannot be empty`
    );
  }
  return value;
}

/**
 * Validate that a value is not null or undefined.
 *
 * @param {*} value - Value to validate
 * @param {string} paramName - Parameter name for error message
 * @param {string} functionName - Calling function name for error message
 * @throws {Error} If value is null or undefined
 * @returns {*} The value (for chaining)
 */
export function validateDefined(value, paramName, functionName) {
  if (value === null || value === undefined) {
    throw new Error(
      `${functionName}: ${paramName} cannot be null or undefined`
    );
  }
  return value;
}

/**
 * Validate that a value is a valid object (not null, not array).
 *
 * @param {*} value - Value to validate
 * @param {string} paramName - Parameter name for error message
 * @param {string} functionName - Calling function name for error message
 * @throws {Error} If value is not a valid object
 * @returns {Object} The object value
 */
export function validateObject(value, paramName, functionName) {
  if (!value || typeof value !== 'object' || Array.isArray(value)) {
    throw new Error(
      `${functionName}: ${paramName} must be a valid object`
    );
  }
  return value;
}

/**
 * Validate that a value is a valid day index (0-6).
 *
 * @param {*} day - Value to validate
 * @param {string} functionName - Calling function name for error message
 * @throws {Error} If day is not a valid index (0-6)
 * @returns {number} The day index
 */
export function validateDayIndex(day, functionName) {
  if (typeof day !== 'number' || isNaN(day) || day < 0 || day > 6) {
    throw new Error(
      `${functionName}: Invalid day index ${day}, must be 0-6`
    );
  }
  return day;
}

/**
 * Validate all elements in an array of day indices.
 *
 * @param {number[]} days - Array of day indices to validate
 * @param {string} functionName - Calling function name for error message
 * @throws {Error} If any day is not a valid index (0-6)
 * @returns {number[]} The validated array
 */
export function validateDayIndices(days, functionName) {
  validateArray(days, 'selectedDays', functionName);
  days.forEach(day => validateDayIndex(day, functionName));
  return days;
}

/**
 * Create a validator that checks if a value is in an allowed set.
 *
 * @param {Array} allowedValues - Array of allowed values
 * @param {string} paramName - Parameter name for error message
 * @param {string} functionName - Calling function name for error message
 * @returns {function} Validator function that returns boolean
 */
export function createEnumValidator(allowedValues, paramName, functionName) {
  return (value) => {
    validateString(value, paramName, functionName);
    return allowedValues.includes(value);
  };
}
