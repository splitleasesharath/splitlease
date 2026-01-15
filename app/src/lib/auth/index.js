/**
 * Split Lease Authentication - Main Entry Point
 * Re-exports all authentication functions for backward compatibility
 *
 * Existing imports remain unchanged:
 * import { login, logout, checkAuthStatus } from '../lib/auth.js';
 * OR
 * import { login, logout, checkAuthStatus } from '../lib/auth/index.js';
 */

// Cookie Management
export {
  getUsernameFromCookies,
  checkSplitLeaseCookies,
  getCurrentUsername,
  storeCurrentUsername,
  getStoredUsername
} from './cookies.js';

// Token Validation & Auth Status
export {
  checkAuthStatus,
  validateTokenAndFetchUser,
  isProtectedPage,
  getAuthToken,
  setAuthToken,
  getSessionId,
  setSessionId,
  getIsUserLoggedIn,
  setIsUserLoggedIn
} from './tokenValidation.js';

// Session Management
export {
  isSessionValid,
  clearAuthData,
  getUserId,
  getUserType,
  setUserType,
  getFirstName,
  getAvatarUrl,
  incrementAuthCheckAttempts,
  getAuthCheckAttempts,
  hasExceededMaxAuthAttempts,
  resetAuthCheckAttempts
} from './session.js';

// Login
export {
  loginUser,
  redirectToLogin,
  redirectToAccountProfile,
  initiateLinkedInOAuthLogin,
  handleLinkedInOAuthLoginCallback,
  checkUrlForAuthError,
  clearAuthErrorFromUrl
} from './login.js';

// Signup
export {
  signupUser,
  initiateLinkedInOAuth,
  handleLinkedInOAuthCallback
} from './signup.js';

// Logout
export {
  logoutUser
} from './logout.js';

// Password Reset
export {
  requestPasswordReset,
  updatePassword
} from './passwordReset.js';
