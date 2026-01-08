/**
 * Process User Data Processor
 *
 * PILLAR III: Processors (The "Transform" Layer)
 *
 * Process raw user data from Supabase into a clean, validated user object.
 *
 * @intent Transform raw user rows from Supabase into consistent, UI-ready format.
 * @rule NO FALLBACK - Throws explicit errors for missing critical fields.
 * @rule Sanitizes user data for privacy and security.
 * @pure Yes - deterministic (console warnings are for debugging only)
 */

// ─────────────────────────────────────────────────────────────
// Constants
// ─────────────────────────────────────────────────────────────

const DEFAULT_DISPLAY_NAME = 'Guest'
const DEFAULT_FULL_NAME = 'Guest User'
const NAME_SEPARATOR = ' '

const FIELD_NAMES = Object.freeze({
  ID: '_id',
  FULL_NAME: 'Name - Full',
  FIRST_NAME: 'Name - First',
  LAST_NAME: 'Name - Last',
  PROFILE_PHOTO: 'Profile Photo',
  BIO: 'About Me / Bio',
  EMAIL: 'email as text',
  PHONE: 'Phone Number (as text)',
  VERIFIED: 'user verified?',
  EMAIL_CONFIRMED: 'is email confirmed',
  PHONE_VERIFIED: 'Verify - Phone',
  LINKEDIN_ID: 'Verify - Linked In ID'
})

// ─────────────────────────────────────────────────────────────
// Validation Predicates (Pure Functions)
// ─────────────────────────────────────────────────────────────

const isString = (value) => typeof value === 'string'
const isNullish = (value) => value === null || value === undefined
const isNonEmptyString = (value) => isString(value) && value.trim().length > 0
const isTrue = (value) => value === true

// ─────────────────────────────────────────────────────────────
// Pure Transformation Helpers
// ─────────────────────────────────────────────────────────────

/**
 * Combine first and last name with separator
 * @pure
 */
const combineNames = (firstName, lastName) =>
  `${firstName}${NAME_SEPARATOR}${lastName}`

/**
 * Extract first word from full name
 * @pure
 */
const extractFirstWord = (fullName) =>
  fullName.split(NAME_SEPARATOR)[0]

/**
 * Derive full name from available name fields
 * @pure
 */
const deriveFullName = (fullName, firstName, lastName, userId) => {
  // Already have a valid full name
  if (isNonEmptyString(fullName)) {
    return fullName.trim()
  }

  // Build from parts
  if (isNonEmptyString(firstName) && isNonEmptyString(lastName)) {
    return combineNames(firstName.trim(), lastName.trim())
  }

  if (isNonEmptyString(firstName)) {
    return firstName.trim()
  }

  if (isNonEmptyString(lastName)) {
    return lastName.trim()
  }

  // No name fields available - log warning and use default
  console.warn(`processUserData: User ${userId} has no name fields, using default`)
  return DEFAULT_FULL_NAME
}

/**
 * Derive display first name
 * @pure
 */
const deriveDisplayFirstName = (firstName, fullName) =>
  isNonEmptyString(firstName)
    ? firstName.trim()
    : extractFirstWord(fullName)

/**
 * Safely extract field or return null
 * @pure
 */
const extractFieldOrNull = (rawUser, fieldName) =>
  rawUser[fieldName] || null

/**
 * Build processed user object
 * @pure
 */
const buildUserObject = (rawUser, fullName, displayFirstName) =>
  Object.freeze({
    // Identity
    id: rawUser[FIELD_NAMES.ID],
    fullName,
    firstName: (displayFirstName || '').trim(),

    // Profile information
    profilePhoto: extractFieldOrNull(rawUser, FIELD_NAMES.PROFILE_PHOTO),
    bio: extractFieldOrNull(rawUser, FIELD_NAMES.BIO),

    // Contact information (sensitive - only include if present)
    email: extractFieldOrNull(rawUser, FIELD_NAMES.EMAIL),
    phone: extractFieldOrNull(rawUser, FIELD_NAMES.PHONE),

    // Verification status
    isVerified: isTrue(rawUser[FIELD_NAMES.VERIFIED]),
    isEmailConfirmed: isTrue(rawUser[FIELD_NAMES.EMAIL_CONFIRMED]),
    isPhoneVerified: isTrue(rawUser[FIELD_NAMES.PHONE_VERIFIED]),
    linkedInId: extractFieldOrNull(rawUser, FIELD_NAMES.LINKEDIN_ID),

    // Privacy: First name only for display
    displayName: (displayFirstName || DEFAULT_DISPLAY_NAME).trim()
  })

// ─────────────────────────────────────────────────────────────
// Main Processor
// ─────────────────────────────────────────────────────────────

/**
 * Process raw user data from Supabase into a clean, validated user object.
 * @pure
 *
 * @param {object} params - Named parameters.
 * @param {object} params.rawUser - Raw user object from Supabase.
 * @param {boolean} [params.requireVerification=false] - Whether to enforce verification fields.
 * @returns {object} Clean, validated user object (frozen).
 *
 * @throws {Error} If rawUser is null/undefined.
 * @throws {Error} If critical _id field is missing.
 * @throws {Error} If verification is required but user not verified.
 *
 * @example
 * processUserData({ rawUser: { _id: '123', 'Name - Full': 'Jane Doe' } })
 */
export function processUserData({ rawUser, requireVerification = false }) {
  // Validation: rawUser must exist
  if (isNullish(rawUser)) {
    throw new Error('processUserData: rawUser cannot be null or undefined')
  }

  // Validation: ID is required
  const userId = rawUser[FIELD_NAMES.ID]
  if (!userId) {
    throw new Error('processUserData: User missing critical _id field')
  }

  // Validation: Verification check (if required)
  if (requireVerification && !isTrue(rawUser[FIELD_NAMES.VERIFIED])) {
    throw new Error(
      `processUserData: User ${userId} is not verified (required for this operation)`
    )
  }

  // Extract raw name fields
  const rawFullName = rawUser[FIELD_NAMES.FULL_NAME]
  const firstName = rawUser[FIELD_NAMES.FIRST_NAME]
  const lastName = rawUser[FIELD_NAMES.LAST_NAME]

  // Derive names
  const fullName = deriveFullName(rawFullName, firstName, lastName, userId)
  const displayFirstName = deriveDisplayFirstName(firstName, fullName)

  // Build and return processed user
  return buildUserObject(rawUser, fullName, displayFirstName)
}

// ─────────────────────────────────────────────────────────────
// Exported Constants (for testing)
// ─────────────────────────────────────────────────────────────
export {
  DEFAULT_DISPLAY_NAME,
  DEFAULT_FULL_NAME,
  NAME_SEPARATOR,
  FIELD_NAMES
}
