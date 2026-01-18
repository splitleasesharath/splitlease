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
 * @param payload - Request payload {token}
 * @returns {message: string}
 */

import { validateRequiredFields } from '../../_shared/validation.ts';

export async function handleLogout(
  payload: any
): Promise<any> {
  console.log('[logout] ========== LOGOUT REQUEST ==========');

  // We don't strictly need the token anymore since we aren't calling Bubble,
  // but we'll keep the validation to maintain API contract
  if (payload && payload.token) {
    console.log(`[logout] Token provided (unused in new flow)`);
  }

  console.log(`[logout] Logout successful (no server-side action required)`);
  console.log(`[logout] ========== LOGOUT COMPLETE ==========`);

  return {
    success: true,
    message: 'Logout successful'
  };
}
