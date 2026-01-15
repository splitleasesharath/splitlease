/**
 * Split Lease Authentication Utilities
 *
 * ⚠️ DEPRECATED MONOLITHIC FILE - USE auth/ MODULES INSTEAD
 *
 * This file has been refactored into focused modules in app/src/lib/auth/:
 * - cookies.js         # Cookie management
 * - tokenValidation.js # Token validation and auth status
 * - session.js         # Session management
 * - login.js           # Login methods (email, OAuth)
 * - signup.js          # Signup with validation
 * - logout.js          # Logout and cleanup
 * - passwordReset.js   # Password reset flow
 * - index.js           # Re-exports for backward compatibility
 *
 * This file now simply re-exports all functions from auth/index.js
 * to maintain backward compatibility with existing imports.
 *
 * Existing imports remain unchanged:
 * import { login, logout, checkAuthStatus } from './auth.js'
 *
 * For new code, prefer importing from specific modules:
 * import { loginUser } from './auth/login.js'
 * import { checkAuthStatus } from './auth/tokenValidation.js'
 */

export * from './auth/index.js';
