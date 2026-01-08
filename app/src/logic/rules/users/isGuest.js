// ─────────────────────────────────────────────────────────────
// Constants
// ─────────────────────────────────────────────────────────────
const INTERNAL_USER_TYPE = 'Split Lease'
const GUEST_IDENTIFIER = 'Guest'

// ─────────────────────────────────────────────────────────────
// Validation Predicates (Pure Functions)
// ─────────────────────────────────────────────────────────────
const isNonEmptyString = (value) => typeof value === 'string' && value.length > 0
const isInternalUser = (type) => type === INTERNAL_USER_TYPE
const containsGuest = (type) => type.includes(GUEST_IDENTIFIER)

/**
 * Determine if a user type indicates Guest privileges.
 *
 * @intent Enforce business rules for Guest role identification.
 * @rule Guest types from Supabase:
 *   - "A Guest (I would like to rent a space)"
 *   - "Split Lease" (internal users with both Host and Guest privileges)
 * @pure Yes - deterministic, no side effects
 *
 * @param {object} params - Named parameters.
 * @param {string|null} params.userType - The user type value from Supabase or localStorage.
 * @returns {boolean} True if user has Guest privileges.
 *
 * @example
 * isGuest({ userType: 'A Guest (I would like to rent a space)' })
 * // => true
 *
 * isGuest({ userType: 'A Host (I have a space available to rent)' })
 * // => false
 *
 * isGuest({ userType: 'Split Lease' })
 * // => true (internal users have both roles)
 */
export function isGuest({ userType }) {
  // Invalid user type means not authenticated
  if (!isNonEmptyString(userType)) {
    return false
  }

  // Normalize input
  const normalizedType = userType.trim()

  // Predicate composition: internal users OR contains "Guest"
  return isInternalUser(normalizedType) || containsGuest(normalizedType)
}

// ─────────────────────────────────────────────────────────────
// Exported Constants (for testing)
// ─────────────────────────────────────────────────────────────
export { INTERNAL_USER_TYPE, GUEST_IDENTIFIER }
