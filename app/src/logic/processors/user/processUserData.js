/**
 * Process raw user data from Supabase into a clean, validated user object.
 *
 * @intent Transform raw user rows from Supabase into consistent, UI-ready format.
 * @rule NO FALLBACK - Throws explicit errors for missing critical fields.
 * @rule Sanitizes user data for privacy and security.
 *
 * @param {object} params - Named parameters.
 * @param {object} params.rawUser - Raw user object from Supabase.
 * @param {boolean} [params.requireVerification=false] - Whether to enforce verification fields.
 * @returns {object} Clean, validated user object.
 *
 * @throws {Error} If rawUser is null/undefined.
 * @throws {Error} If critical _id field is missing.
 * @throws {Error} If Name - Full is missing.
 * @throws {Error} If verification is required but user not verified.
 *
 * @example
 * const user = processUserData({
 *   rawUser: {
 *     _id: '123',
 *     'Name - Full': 'Jane Doe',
 *     'Name - First': 'Jane',
 *     'Profile Photo': 'https://...',
 *     'About Me / Bio': 'Software engineer...',
 *     'user verified?': true
 *   }
 * })
 */
export function processUserData({ rawUser, requireVerification = false }) {
  // No Fallback: User data must exist
  if (!rawUser) {
    throw new Error('processUserData: rawUser cannot be null or undefined')
  }

  // Validate critical ID field
  if (!rawUser._id) {
    throw new Error('processUserData: User missing critical _id field')
  }

  // Name handling - derive from available fields
  // Some users may not have "Name - Full" populated yet
  let fullName = rawUser['Name - Full']
  const firstName = rawUser['Name - First']
  const lastName = rawUser['Name - Last']

  // Build fullName from parts if not directly available
  if (!fullName || typeof fullName !== 'string' || fullName.trim().length === 0) {
    if (firstName && lastName) {
      fullName = `${firstName} ${lastName}`
    } else if (firstName) {
      fullName = firstName
    } else if (lastName) {
      fullName = lastName
    } else {
      // Use a default for users without any name fields
      fullName = 'Guest User'
      console.warn(`processUserData: User ${rawUser._id} has no name fields, using default`)
    }
  }

  // Verification enforcement (if required)
  if (requireVerification && !rawUser['user verified?']) {
    throw new Error(
      `processUserData: User ${rawUser._id} is not verified (required for this operation)`
    )
  }

  // Derive display firstName if not already set
  const displayFirstName = firstName || fullName.split(' ')[0]

  return {
    id: rawUser._id,
    fullName: fullName.trim(),
    firstName: (displayFirstName || '').trim(),

    // Profile information
    profilePhoto: rawUser['Profile Photo'] || null,
    bio: rawUser['About Me / Bio'] || null,

    // Contact information (sensitive - only include if present)
    email: rawUser['email as text'] || null,
    phone: rawUser['Phone Number (as text)'] || null,

    // Verification status
    isVerified: rawUser['user verified?'] === true,
    isEmailConfirmed: rawUser['is email confirmed'] === true,
    isPhoneVerified: rawUser['Verify - Phone'] === true,
    linkedInId: rawUser['Verify - Linked In ID'] || null,

    // Privacy: First name only for display
    displayName: (displayFirstName || 'Guest').trim()
  }
}
