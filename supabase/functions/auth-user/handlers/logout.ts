/**
 * Logout Handler - Invalidate user session
 * Split Lease - auth-user
 *
 * Flow:
 * 1. Return success immediately
 *
 * NOTE:
 * We have migrated to Supabase Auth.
 * Session invalidation happens client-side via supabase.auth.signOut().
 * This handler is kept for backward compatibility and potential future server-side cleanup.
 *
 * @module auth-user/handlers/logout
 */

// ─────────────────────────────────────────────────────────────
// Constants
// ─────────────────────────────────────────────────────────────

const LOG_PREFIX = '[logout]'

/**
 * Success message for logout
 * @immutable
 */
const SUCCESS_MESSAGE = 'Logout successful'

// ─────────────────────────────────────────────────────────────
// Types
// ─────────────────────────────────────────────────────────────

interface LogoutPayload {
  readonly token?: string;
}

interface LogoutResult {
  readonly success: true;
  readonly message: string;
}

// ─────────────────────────────────────────────────────────────
// Validation Predicates
// ─────────────────────────────────────────────────────────────

/**
 * Check if token is provided in payload
 * @pure
 */
const hasToken = (payload: LogoutPayload | null | undefined): boolean =>
  payload !== null && payload !== undefined && typeof payload.token === 'string'

// ─────────────────────────────────────────────────────────────
// Result Builders
// ─────────────────────────────────────────────────────────────

/**
 * Build logout success result
 * @pure
 */
const buildLogoutResult = (): LogoutResult =>
  Object.freeze({
    success: true,
    message: SUCCESS_MESSAGE,
  })

// ─────────────────────────────────────────────────────────────
// Main Handler
// ─────────────────────────────────────────────────────────────

/**
 * Handle logout request (stub - actual logout happens client-side)
 * @effectful (console logging)
 */
export async function handleLogout(
  payload: LogoutPayload
): Promise<LogoutResult> {
  console.log(`${LOG_PREFIX} ========== LOGOUT REQUEST ==========`);

  // We don't strictly need the token anymore since we aren't calling Bubble,
  // but we'll keep the validation to maintain API contract
  if (hasToken(payload)) {
    console.log(`${LOG_PREFIX} Token provided (unused in new flow)`);
  }

  console.log(`${LOG_PREFIX} Logout successful (no server-side action required)`);
  console.log(`${LOG_PREFIX} ========== LOGOUT COMPLETE ==========`);

  return buildLogoutResult();
}

// ─────────────────────────────────────────────────────────────
// Exported Test Constants
// ─────────────────────────────────────────────────────────────

/**
 * Exported for testing purposes
 * @test
 */
export const __test__ = Object.freeze({
  // Constants
  LOG_PREFIX,
  SUCCESS_MESSAGE,

  // Predicates
  hasToken,

  // Result builders
  buildLogoutResult,
})
