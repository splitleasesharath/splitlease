/**
 * Generates user initials from first and last name for avatar display.
 *
 * @function processUserInitials
 * @intent Create 1-2 letter initials for avatar when no profile photo available
 * @rule If both names provided, use first letter of each (uppercase)
 * @rule If only firstName, use first letter (uppercase)
 * @rule NO FALLBACK: firstName is required, throw if missing
 *
 * @param {object} params - Named parameters
 * @param {string} params.firstName - User's first name (required)
 * @param {string|null|undefined} params.lastName - User's last name (optional)
 * @returns {string} 1-2 letter initials (e.g., "JD" or "J")
 * @throws {Error} If firstName is missing or invalid
 *
 * @example
 * processUserInitials({ firstName: 'John', lastName: 'Doe' }) // "JD"
 * processUserInitials({ firstName: 'Jane', lastName: null }) // "J"
 * processUserInitials({ firstName: 'Bob', lastName: '' }) // "B"
 * processUserInitials({ firstName: '', lastName: 'Smith' }) // throws Error
 */
export function processUserInitials({ firstName, lastName }) {
  // NO FALLBACK: firstName is mandatory for user identity
  if (typeof firstName !== 'string' || firstName.trim().length === 0) {
    throw new Error('processUserInitials requires a valid firstName. Cannot generate initials without user name.');
  }

  // Get first letter of firstName (uppercase)
  const firstInitial = firstName.trim().charAt(0).toUpperCase();

  // If lastName exists and is valid, add its first letter
  if (lastName && typeof lastName === 'string' && lastName.trim().length > 0) {
    const lastInitial = lastName.trim().charAt(0).toUpperCase();
    return firstInitial + lastInitial;
  }

  // Return just first initial if no valid lastName
  return firstInitial;
}
