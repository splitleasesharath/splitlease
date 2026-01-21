/**
 * Magic Link Expiration Rules
 *
 * Determines if a magic link access token has expired.
 * Default expiration: 30 days from creation.
 *
 * @module logic/rules/houseManual/isManualExpired
 */

/**
 * Default token expiration in milliseconds (30 days)
 */
const DEFAULT_EXPIRATION_MS = 30 * 24 * 60 * 60 * 1000;

/**
 * Check if a magic link token has expired.
 *
 * @param {Object} params - Named parameters
 * @param {string|Date|null} params.expiresAt - Token expiration timestamp
 * @param {Date} [params.currentTime] - Current time for comparison (default: new Date())
 * @returns {boolean} True if token has expired
 *
 * @example
 * // Token expires in the past
 * isTokenExpired({ expiresAt: '2024-01-01T00:00:00Z' }); // true
 *
 * @example
 * // Token expires in the future
 * isTokenExpired({ expiresAt: '2030-01-01T00:00:00Z' }); // false
 *
 * @example
 * // No expiration set (never expires)
 * isTokenExpired({ expiresAt: null }); // false
 */
export function isTokenExpired({ expiresAt, currentTime = new Date() }) {
  // No expiration = never expires
  if (!expiresAt) {
    return false;
  }

  // Parse expiration date
  const expirationDate = expiresAt instanceof Date ? expiresAt : new Date(expiresAt);

  // Invalid date = treat as expired for safety
  if (isNaN(expirationDate.getTime())) {
    return true;
  }

  // Compare against current time
  return expirationDate < currentTime;
}

/**
 * Calculate token expiration date from creation date.
 *
 * @param {Object} params - Named parameters
 * @param {string|Date} params.createdAt - Token creation timestamp
 * @param {number} [params.expirationDays=30] - Days until expiration
 * @returns {Date} Expiration date
 *
 * @example
 * const expiration = calculateTokenExpiration({
 *   createdAt: new Date(),
 *   expirationDays: 30
 * });
 * // Returns date 30 days from now
 */
export function calculateTokenExpiration({ createdAt, expirationDays = 30 }) {
  const creationDate = createdAt instanceof Date ? createdAt : new Date(createdAt);

  if (isNaN(creationDate.getTime())) {
    throw new Error('Invalid creation date');
  }

  const expirationMs = expirationDays * 24 * 60 * 60 * 1000;
  return new Date(creationDate.getTime() + expirationMs);
}

/**
 * Get time remaining until token expires.
 *
 * @param {Object} params - Named parameters
 * @param {string|Date|null} params.expiresAt - Token expiration timestamp
 * @param {Date} [params.currentTime] - Current time for comparison
 * @returns {Object} Time remaining information
 *
 * @example
 * const remaining = getTimeUntilExpiration({ expiresAt: '2024-12-31T00:00:00Z' });
 * // Returns { isExpired: false, days: 10, hours: 5, minutes: 30, totalMs: 123456789 }
 */
export function getTimeUntilExpiration({ expiresAt, currentTime = new Date() }) {
  if (!expiresAt) {
    return {
      isExpired: false,
      days: null,
      hours: null,
      minutes: null,
      totalMs: null,
      neverExpires: true,
    };
  }

  const expirationDate = expiresAt instanceof Date ? expiresAt : new Date(expiresAt);

  if (isNaN(expirationDate.getTime())) {
    return {
      isExpired: true,
      days: 0,
      hours: 0,
      minutes: 0,
      totalMs: 0,
      neverExpires: false,
    };
  }

  const totalMs = expirationDate.getTime() - currentTime.getTime();

  if (totalMs <= 0) {
    return {
      isExpired: true,
      days: 0,
      hours: 0,
      minutes: 0,
      totalMs: 0,
      neverExpires: false,
    };
  }

  const days = Math.floor(totalMs / (24 * 60 * 60 * 1000));
  const hours = Math.floor((totalMs % (24 * 60 * 60 * 1000)) / (60 * 60 * 1000));
  const minutes = Math.floor((totalMs % (60 * 60 * 1000)) / (60 * 1000));

  return {
    isExpired: false,
    days,
    hours,
    minutes,
    totalMs,
    neverExpires: false,
  };
}

/**
 * Check if a token is within the warning period before expiration.
 *
 * @param {Object} params - Named parameters
 * @param {string|Date|null} params.expiresAt - Token expiration timestamp
 * @param {number} [params.warningDays=3] - Days before expiration to show warning
 * @param {Date} [params.currentTime] - Current time for comparison
 * @returns {boolean} True if token is expiring soon
 *
 * @example
 * // Token expires in 2 days
 * isExpiringSoon({ expiresAt: twoDaysFromNow, warningDays: 3 }); // true
 *
 * @example
 * // Token expires in 10 days
 * isExpiringSoon({ expiresAt: tenDaysFromNow, warningDays: 3 }); // false
 */
export function isExpiringSoon({ expiresAt, warningDays = 3, currentTime = new Date() }) {
  const remaining = getTimeUntilExpiration({ expiresAt, currentTime });

  if (remaining.isExpired) {
    return false; // Already expired, not "expiring soon"
  }

  if (remaining.neverExpires) {
    return false;
  }

  return remaining.days !== null && remaining.days <= warningDays;
}

/**
 * Check if a single-use token has already been used.
 *
 * @param {Object} params - Named parameters
 * @param {boolean} params.isSingleUse - Whether token is single-use
 * @param {string|Date|null} params.usedAt - When token was used
 * @returns {boolean} True if token has been used and is single-use
 *
 * @example
 * isTokenUsed({ isSingleUse: true, usedAt: '2024-01-15T10:00:00Z' }); // true
 * isTokenUsed({ isSingleUse: false, usedAt: '2024-01-15T10:00:00Z' }); // false
 * isTokenUsed({ isSingleUse: true, usedAt: null }); // false
 */
export function isTokenUsed({ isSingleUse, usedAt }) {
  if (!isSingleUse) {
    return false; // Multi-use tokens can be used multiple times
  }

  return Boolean(usedAt);
}

/**
 * Validate a magic link token's status.
 *
 * @param {Object} params - Named parameters
 * @param {string|Date|null} params.expiresAt - Token expiration timestamp
 * @param {boolean} params.isSingleUse - Whether token is single-use
 * @param {string|Date|null} params.usedAt - When token was used
 * @param {Date} [params.currentTime] - Current time for comparison
 * @returns {Object} Token validation result
 *
 * @example
 * const status = validateTokenStatus({
 *   expiresAt: '2024-12-31T00:00:00Z',
 *   isSingleUse: false,
 *   usedAt: null
 * });
 * // Returns { isValid: true, reason: null }
 */
export function validateTokenStatus({ expiresAt, isSingleUse, usedAt, currentTime = new Date() }) {
  // Check expiration
  if (isTokenExpired({ expiresAt, currentTime })) {
    return {
      isValid: false,
      reason: 'Token has expired',
    };
  }

  // Check single-use status
  if (isTokenUsed({ isSingleUse, usedAt })) {
    return {
      isValid: false,
      reason: 'Token has already been used',
    };
  }

  return {
    isValid: true,
    reason: null,
  };
}

export default isTokenExpired;
