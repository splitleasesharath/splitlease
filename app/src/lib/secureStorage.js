/**
 * Secure Storage Module
 *
 * Provides encrypted storage for sensitive authentication tokens.
 * Tokens are stored in sessionStorage (cleared when tab closes) with AES encryption.
 * Only authentication state (not tokens) should be published to the rest of the app.
 *
 * Security Benefits:
 * - sessionStorage: Cleared when tab closes (vs localStorage persists)
 * - Encryption: Tokens not stored in plaintext
 * - Limited scope: Only this module can access raw tokens
 * - State-based: Rest of app only knows "logged in" or "logged out"
 */

// Generate a per-session encryption key (unique per browser tab)
// This key is stored in memory only and lost when page refreshes
let encryptionKey = null;

/**
 * Initialize encryption key for the session
 * Called automatically on first use
 */
async function initializeEncryptionKey() {
  if (encryptionKey) return;

  // Generate a random key for this session
  // In production, you might derive this from a user-specific value
  const key = await crypto.subtle.generateKey(
    {
      name: 'AES-GCM',
      length: 256
    },
    true, // extractable
    ['encrypt', 'decrypt']
  );

  encryptionKey = key;
}

/**
 * Encrypt data using AES-GCM
 * @param {string} plaintext - Data to encrypt
 * @returns {Promise<string>} Base64-encoded encrypted data with IV
 */
async function encrypt(plaintext) {
  await initializeEncryptionKey();

  const encoder = new TextEncoder();
  const data = encoder.encode(plaintext);

  // Generate random IV for each encryption
  const iv = crypto.getRandomValues(new Uint8Array(12));

  const encryptedData = await crypto.subtle.encrypt(
    {
      name: 'AES-GCM',
      iv: iv
    },
    encryptionKey,
    data
  );

  // Combine IV + encrypted data
  const combined = new Uint8Array(iv.length + encryptedData.byteLength);
  combined.set(iv, 0);
  combined.set(new Uint8Array(encryptedData), iv.length);

  // Convert to base64 for storage
  return btoa(String.fromCharCode(...combined));
}

/**
 * Decrypt data using AES-GCM
 * @param {string} ciphertext - Base64-encoded encrypted data
 * @returns {Promise<string>} Decrypted plaintext
 */
async function decrypt(ciphertext) {
  await initializeEncryptionKey();

  try {
    // Decode base64
    const combined = Uint8Array.from(atob(ciphertext), c => c.charCodeAt(0));

    // Extract IV and encrypted data
    const iv = combined.slice(0, 12);
    const data = combined.slice(12);

    const decryptedData = await crypto.subtle.decrypt(
      {
        name: 'AES-GCM',
        iv: iv
      },
      encryptionKey,
      data
    );

    const decoder = new TextDecoder();
    return decoder.decode(decryptedData);
  } catch (error) {
    console.error('Decryption failed:', error);
    return null;
  }
}

/**
 * Storage keys for encrypted data
 */
const SECURE_KEYS = {
  AUTH_TOKEN: '__sl_at__',     // Encrypted auth token
  SESSION_ID: '__sl_sid__',    // Encrypted session/user ID
  REFRESH_DATA: '__sl_rd__',   // Encrypted refresh token data
};

/**
 * Public state keys (non-sensitive, can be in localStorage)
 */
const STATE_KEYS = {
  IS_AUTHENTICATED: 'sl_auth_state',
  USER_ID: 'sl_user_id',
  USER_TYPE: 'sl_user_type',
  LAST_ACTIVITY: 'sl_last_activity',
  SESSION_VALID: 'sl_session_valid'
};

/**
 * Store authentication token securely
 * @param {string} token - Bearer token from Bubble API
 */
export async function setAuthToken(token) {
  if (!token) return;

  const encrypted = await encrypt(token);
  sessionStorage.setItem(SECURE_KEYS.AUTH_TOKEN, encrypted);
}

/**
 * Retrieve authentication token
 * @returns {Promise<string|null>} Decrypted token or null
 */
export async function getAuthToken() {
  const encrypted = sessionStorage.getItem(SECURE_KEYS.AUTH_TOKEN);
  if (!encrypted) return null;

  return await decrypt(encrypted);
}

/**
 * Store session ID (user ID) securely
 * @param {string} sessionId - User ID from Bubble API
 */
export async function setSessionId(sessionId) {
  if (!sessionId) return;

  const encrypted = await encrypt(sessionId);
  sessionStorage.setItem(SECURE_KEYS.SESSION_ID, encrypted);
}

/**
 * Retrieve session ID
 * @returns {Promise<string|null>} Decrypted session ID or null
 */
export async function getSessionId() {
  const encrypted = sessionStorage.getItem(SECURE_KEYS.SESSION_ID);
  if (!encrypted) return null;

  return await decrypt(encrypted);
}

/**
 * Store refresh token data securely (for future use)
 * @param {object} refreshData - Refresh token and metadata
 */
export async function setRefreshData(refreshData) {
  if (!refreshData) return;

  const encrypted = await encrypt(JSON.stringify(refreshData));
  sessionStorage.setItem(SECURE_KEYS.REFRESH_DATA, encrypted);
}

/**
 * Retrieve refresh token data
 * @returns {Promise<object|null>} Decrypted refresh data or null
 */
export async function getRefreshData() {
  const encrypted = sessionStorage.getItem(SECURE_KEYS.REFRESH_DATA);
  if (!encrypted) return null;

  const decrypted = await decrypt(encrypted);
  return decrypted ? JSON.parse(decrypted) : null;
}

/**
 * Clear all secure storage (tokens)
 */
export function clearSecureStorage() {
  sessionStorage.removeItem(SECURE_KEYS.AUTH_TOKEN);
  sessionStorage.removeItem(SECURE_KEYS.SESSION_ID);
  sessionStorage.removeItem(SECURE_KEYS.REFRESH_DATA);
}

/**
 * Set authentication state (public, non-sensitive)
 * @param {boolean} isAuthenticated - Whether user is authenticated
 * @param {string} userId - User ID (optional, non-sensitive identifier)
 */
export function setAuthState(isAuthenticated, userId = null) {
  localStorage.setItem(STATE_KEYS.IS_AUTHENTICATED, isAuthenticated ? 'true' : 'false');
  localStorage.setItem(STATE_KEYS.LAST_ACTIVITY, Date.now().toString());

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
 * Update last activity timestamp
 */
export function updateLastActivity() {
  localStorage.setItem(STATE_KEYS.LAST_ACTIVITY, Date.now().toString());
}

/**
 * Get last activity timestamp
 * @returns {number|null} Timestamp or null
 */
export function getLastActivity() {
  const timestamp = localStorage.getItem(STATE_KEYS.LAST_ACTIVITY);
  return timestamp ? parseInt(timestamp, 10) : null;
}

/**
 * Check if session has expired (based on last activity)
 * NOTE: This is now only used for UI staleness checks, not for auth validation.
 * Bubble API handles token expiry - we validate on each request.
 * @param {number} maxAgeMs - Maximum session age in milliseconds (default 24 hours)
 * @returns {boolean} True if session expired
 */
export function isSessionExpired(maxAgeMs = 86400000) { // Default 24 hours (same as before)
  const lastActivity = getLastActivity();
  if (!lastActivity) return true;

  return (Date.now() - lastActivity) > maxAgeMs;
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
  localStorage.removeItem(STATE_KEYS.LAST_ACTIVITY);
  localStorage.removeItem(STATE_KEYS.SESSION_VALID);

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
 * @returns {Promise<boolean>} True if tokens exist in secure storage
 */
export async function hasValidTokens() {
  const token = await getAuthToken();
  const sessionId = await getSessionId();

  return !!(token && sessionId);
}

/**
 * Migrate from old localStorage to secure storage
 * Call this once during transition period
 */
export async function migrateFromLegacyStorage() {
  // Check if we have old tokens in localStorage
  const oldToken = localStorage.getItem('splitlease_auth_token');
  const oldSessionId = localStorage.getItem('splitlease_session_id');

  if (oldToken && oldSessionId) {
    console.log('🔄 Migrating to secure storage...');

    // Store in secure storage
    await setAuthToken(oldToken);
    await setSessionId(oldSessionId);

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
  async dumpSecureStorage() {
    return {
      token: await getAuthToken(),
      sessionId: await getSessionId(),
      refreshData: await getRefreshData()
    };
  },

  async checkEncryption() {
    const testData = 'test-token-12345';
    const encrypted = await encrypt(testData);
    const decrypted = await decrypt(encrypted);
    console.log('Encryption test:', {
      original: testData,
      encrypted: encrypted.substring(0, 20) + '...',
      decrypted,
      match: testData === decrypted
    });
  }
};
