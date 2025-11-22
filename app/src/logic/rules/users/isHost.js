/**
 * Determine if a user type indicates Host privileges.
 *
 * @intent Enforce business rules for Host role identification.
 * @rule Host types from Supabase:
 *   - "A Host (I have a space available to rent)"
 *   - "Trial Host"
 *   - "Split Lease" (internal users with both Host and Guest privileges)
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
  // No user type means not authenticated or type not set
  if (!userType || typeof userType !== 'string') {
    return false
  }

  const type = userType.trim()

  // Split Lease internal users have both Host and Guest privileges
  if (type === 'Split Lease') {
    return true
  }

  // Check if type includes "Host" (covers both regular and trial hosts)
  return type.includes('Host')
}
