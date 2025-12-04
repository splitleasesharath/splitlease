/**
 * Secure Storage Module
 *
 * Provides storage for authentication tokens in localStorage.
 * Tokens persist across browser sessions for better UX.
 * Only authentication state (not tokens) should be published to the rest of the app.
 *
 * Security Considerations:
 * - localStorage: Persists until manually cleared (survives browser restart)
 * - Origin-isolated: Only accessible by same-origin pages
 * - Protected by browser security model (XSS is the main threat, not storage)
 * - Limited scope: Only this module accesses raw tokens
 * - State-based: Rest of app only knows "logged in" or "logged out"
 *
 * Tradeoffs vs sessionStorage:
 * - Pro: User stays logged in across browser restarts
 * - Con: Token persists if user forgets to log out on shared computer
 * - Mitigation: Bubble API handles token expiration server-side
 */

/**
 * Storage keys for token data
 */
const SECURE_KEYS = {
  AUTH_TOKEN: '__sl_at__',     // Auth token
  SESSION_ID: '__sl_sid__',    // Session/user ID
  REFRESH_DATA: '__sl_rd__',   // Refresh token data
};

/**
 * Public state keys (non-sensitive, can be in localStorage)
 */
const STATE_KEYS = {
  IS_AUTHENTICATED: 'sl_auth_state',
  USER_ID: 'sl_user_id',
  USER_TYPE: 'sl_user_type',
  SESSION_VALID: 'sl_session_valid'
};

/**
 * Store authentication token
 * @param {string} token - Bearer token from Bubble API
 */
export function setAuthToken(token) {
  if (!token) return;
  localStorage.setItem(SECURE_KEYS.AUTH_TOKEN, token);
}

/**
 * Retrieve authentication token
 * @returns {string|null} Token or null
 */
export function getAuthToken() {
  return localStorage.getItem(SECURE_KEYS.AUTH_TOKEN);
}

/**
 * Store session ID (user ID)
 * @param {string} sessionId - User ID from Bubble API
 */
export function setSessionId(sessionId) {
  if (!sessionId) return;
  localStorage.setItem(SECURE_KEYS.SESSION_ID, sessionId);
}

/**
 * Retrieve session ID
 * @returns {string|null} Session ID or null
 */
export function getSessionId() {
  return localStorage.getItem(SECURE_KEYS.SESSION_ID);
}

/**
 * Store refresh token data (for future use)
 * @param {object} refreshData - Refresh token and metadata
 */
export function setRefreshData(refreshData) {
  if (!refreshData) return;
  localStorage.setItem(SECURE_KEYS.REFRESH_DATA, JSON.stringify(refreshData));
}

/**
 * Retrieve refresh token data
 * @returns {object|null} Refresh data or null
 */
export function getRefreshData() {
  const data = localStorage.getItem(SECURE_KEYS.REFRESH_DATA);
  return data ? JSON.parse(data) : null;
}

/**
 * Clear all secure storage (tokens)
 */
export function clearSecureStorage() {
  localStorage.removeItem(SECURE_KEYS.AUTH_TOKEN);
  localStorage.removeItem(SECURE_KEYS.SESSION_ID);
  localStorage.removeItem(SECURE_KEYS.REFRESH_DATA);
}

/**
 * Set authentication state (public, non-sensitive)
 * @param {boolean} isAuthenticated - Whether user is authenticated
 * @param {string} userId - User ID (optional, non-sensitive identifier)
 */
export function setAuthState(isAuthenticated, userId = null) {
  localStorage.setItem(STATE_KEYS.IS_AUTHENTICATED, isAuthenticated ? 'true' : 'false');

  // Store user ID in public state (non-sensitive identifier)
  if (userId) {
    localStorage.setItem(STATE_KEYS.USER_ID, userId);
  }
}

/**
 * Get authentication state
 * @returns {boolean} Whether user is authenticated (according to state)
 */
export function getAuthState() {
  return localStorage.getItem(STATE_KEYS.IS_AUTHENTICATED) === 'true';
}

/**
 * Get user ID from public state
 * @returns {string|null} User ID or null
 */
export function getUserId() {
  return localStorage.getItem(STATE_KEYS.USER_ID);
}

/**
 * Set user type (public, non-sensitive)
 * @param {string} userType - 'Host' or 'Guest'
 */
export function setUserType(userType) {
  if (userType) {
    localStorage.setItem(STATE_KEYS.USER_TYPE, userType);
  }
}

/**
 * Get user type
 * @returns {string|null} User type or null
 */
export function getUserType() {
  return localStorage.getItem(STATE_KEYS.USER_TYPE);
}

/**
 * Set session validity (public state)
 * @param {boolean} isValid - Whether session is valid
 */
export function setSessionValid(isValid) {
  localStorage.setItem(STATE_KEYS.SESSION_VALID, isValid ? 'true' : 'false');
}

/**
 * Get session validity
 * @returns {boolean} Whether session is marked as valid
 */
export function getSessionValid() {
  return localStorage.getItem(STATE_KEYS.SESSION_VALID) === 'true';
}


/**
 * Clear all authentication data (both secure and state)
 */
export function clearAllAuthData() {
  // Clear secure storage (tokens)
  clearSecureStorage();

  // Clear public state
  localStorage.removeItem(STATE_KEYS.IS_AUTHENTICATED);
  localStorage.removeItem(STATE_KEYS.USER_ID);
  localStorage.removeItem(STATE_KEYS.USER_TYPE);
  localStorage.removeItem(STATE_KEYS.SESSION_VALID);
  // Also clear legacy last activity key if present
  localStorage.removeItem('sl_last_activity');

  // Clear legacy keys
  localStorage.removeItem('splitlease_auth_token');
  localStorage.removeItem('splitlease_session_id');
  localStorage.removeItem('splitlease_last_auth');
  localStorage.removeItem('splitlease_user_type');
  localStorage.removeItem('userEmail');

  // Clear cookies
  document.cookie = 'loggedIn=false; path=/; max-age=0';
  document.cookie = 'username=; path=/; max-age=0';
  document.cookie = 'splitlease_auth=; path=/; max-age=0';
  document.cookie = 'loggedIn=false; path=/; max-age=0; domain=.split.lease';
  document.cookie = 'username=; path=/; max-age=0; domain=.split.lease';
  document.cookie = 'splitlease_auth=; path=/; max-age=0; domain=.split.lease';
}

/**
 * Check if secure storage has valid tokens
 * @returns {boolean} True if tokens exist in secure storage
 */
export function hasValidTokens() {
  const token = getAuthToken();
  const sessionId = getSessionId();

  return !!(token && sessionId);
}

/**
 * Migrate from old legacy localStorage keys to new key format
 * Call this once during transition period
 */
export function migrateFromLegacyStorage() {
  // Check if we have old tokens in legacy localStorage keys
  const oldToken = localStorage.getItem('splitlease_auth_token');
  const oldSessionId = localStorage.getItem('splitlease_session_id');

  if (oldToken && oldSessionId) {
    console.log('🔄 Migrating legacy keys to new format...');

    // Store with new keys
    setAuthToken(oldToken);
    setSessionId(oldSessionId);

    // Update state with user ID
    setAuthState(true, oldSessionId);

    // Get user type if available
    const userType = localStorage.getItem('splitlease_user_type');
    if (userType) {
      setUserType(userType);
    }

    // Remove old keys
    localStorage.removeItem('splitlease_auth_token');
    localStorage.removeItem('splitlease_session_id');
    localStorage.removeItem('splitlease_last_auth');

    console.log('✅ Migration complete');
    return true;
  }

  return false;
}

/**
 * Export for debugging (REMOVE IN PRODUCTION)
 */
export const __DEV__ = {
  dumpSecureStorage() {
    return {
      token: getAuthToken(),
      sessionId: getSessionId(),
      refreshData: getRefreshData()
    };
  }
};
