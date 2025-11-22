/**
 * Formats user's display name for UI presentation.
 *
 * @function processUserDisplayName
 * @intent Transform user name data into formatted display string
 * @rule If showFull is true and lastName exists, return "FirstName LastName"
 * @rule If showFull is false or no lastName, return "FirstName"
 * @rule NO FALLBACK: firstName is required, throw if missing
 * @rule Trims whitespace and ensures proper capitalization
 *
 * @param {object} params - Named parameters
 * @param {string} params.firstName - User's first name (required)
 * @param {string|null|undefined} params.lastName - User's last name (optional)
 * @param {boolean} params.showFull - Whether to show full name (first + last)
 * @returns {string} Formatted display name
 * @throws {Error} If firstName is missing or invalid
 *
 * @example
 * processUserDisplayName({ firstName: 'John', lastName: 'Doe', showFull: true }) // "John Doe"
 * processUserDisplayName({ firstName: 'John', lastName: 'Doe', showFull: false }) // "John"
 * processUserDisplayName({ firstName: 'Jane', lastName: null, showFull: true }) // "Jane"
 * processUserDisplayName({ firstName: '', lastName: 'Doe', showFull: true }) // throws Error
 */
export function processUserDisplayName({ firstName, lastName, showFull }) {
  // NO FALLBACK: firstName is mandatory for user identity
  if (typeof firstName !== 'string' || firstName.trim().length === 0) {
    throw new Error('processUserDisplayName requires a valid firstName. Cannot display user without name.');
  }

  // Validate showFull is a boolean
  if (typeof showFull !== 'boolean') {
    throw new Error('processUserDisplayName requires showFull to be a boolean');
  }

  // Normalize firstName (trim whitespace)
  const normalizedFirstName = firstName.trim();

  // If not showing full name or no lastName, return first name only
  if (!showFull || !lastName) {
    return normalizedFirstName;
  }

  // Validate lastName if we're trying to use it
  if (typeof lastName !== 'string' || lastName.trim().length === 0) {
    return normalizedFirstName;
  }

  // Return full name with space separator
  const normalizedLastName = lastName.trim();
  return `${normalizedFirstName} ${normalizedLastName}`;
}
