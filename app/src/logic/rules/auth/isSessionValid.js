/**
 * Check if a session is valid.
 *
 * @intent Determine if the user has a valid active session.
 * @rule Session is valid if auth state is set to true.
 * @rule Bubble API handles actual token expiry - this just checks state.
 *
 * @param {object} params - Named parameters.
 * @param {boolean} params.authState - Current authentication state.
 * @returns {boolean} True if session is valid, false otherwise.
 *
 * @throws {Error} If authState is not a boolean.
 *
 * @example
 * const valid = isSessionValid({ authState: true })
 * // => true
 */
export function isSessionValid({ authState }) {
  // No Fallback: Validate input
  if (typeof authState !== 'boolean') {
    throw new Error(
      `isSessionValid: authState must be a boolean, got ${typeof authState}`
    )
  }

  return authState
}
