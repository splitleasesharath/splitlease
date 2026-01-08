// ─────────────────────────────────────────────────────────────
// Constants
// ─────────────────────────────────────────────────────────────
const INTERNAL_USER_TYPE = 'Split Lease'
const HOST_IDENTIFIER = 'Host'

// ─────────────────────────────────────────────────────────────
// Validation Predicates (Pure Functions)
// ─────────────────────────────────────────────────────────────
const isNonEmptyString = (value) => typeof value === 'string' && value.length > 0
const isInternalUser = (type) => type === INTERNAL_USER_TYPE
const containsHost = (type) => type.includes(HOST_IDENTIFIER)

/**
 * Determine if a user type indicates Host privileges.
 *
 * @intent Enforce business rules for Host role identification.
 * @rule Host types from Supabase:
 *   - "A Host (I have a space available to rent)"
 *   - "Trial Host"
 *   - "Split Lease" (internal users with both Host and Guest privileges)
 * @pure Yes - deterministic, no side effects
 *
 * @param {object} params - Named parameters.
 * @param {string|null} params.userType - The user type value from Supabase or localStorage.
 * @returns {boolean} True if user has Host privileges.
 *
 * @example
 * isHost({ userType: 'A Host (I have a space available to rent)' })
 * // => true
 *
 * isHost({ userType: 'A Guest (I would like to rent a space)' })
 * // => false
 *
 * isHost({ userType: 'Split Lease' })
 * // => true (internal users have both roles)
 */
export function isHost({ userType }) {
  // Invalid user type means not authenticated
  if (!isNonEmptyString(userType)) {
    return false
  }

  // Normalize input
  const normalizedType = userType.trim()

  // Predicate composition: internal users OR contains "Host"
  return isInternalUser(normalizedType) || containsHost(normalizedType)
}

// ─────────────────────────────────────────────────────────────
// Exported Constants (for testing)
// ─────────────────────────────────────────────────────────────
export { INTERNAL_USER_TYPE, HOST_IDENTIFIER }
