/**
 * Determine if a user type indicates Guest privileges.
 *
 * @intent Enforce business rules for Guest role identification.
 * @rule Guest types from Supabase:
 *   - "A Guest (I would like to rent a space)"
 *   - "Split Lease" (internal users with both Host and Guest privileges)
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
  // No user type means not authenticated or type not set
  if (!userType || typeof userType !== 'string') {
    return false
  }

  const type = userType.trim()

  // Split Lease internal users have both Host and Guest privileges
  if (type === 'Split Lease') {
    return true
  }

  // Check if type includes "Guest"
  return type.includes('Guest')
}
