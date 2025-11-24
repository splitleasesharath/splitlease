/**
 * Referral Tracking Handler
 * Priority: LOW
 *
 * Handles referral submissions with atomic sync
 */

import { BubbleSyncService } from '../../_shared/bubbleSync.ts';
import { validateRequiredFields } from '../../_shared/validation.ts';
import { User } from '../../_shared/types.ts';

/**
 * Handle referral submission
 * NO FALLBACK: Atomic operation - all steps succeed or all fail
 */
export async function handleReferral(
  syncService: BubbleSyncService,
  payload: Record<string, any>,
  user: User
): Promise<any> {
  console.log('[Referral Handler] ========== SUBMIT REFERRAL ==========');
  console.log('[Referral Handler] User:', user.email);
  console.log('[Referral Handler] Payload:', JSON.stringify(payload, null, 2));

  // Validate required fields
  validateRequiredFields(payload, ['method', 'contact']);

  const { method, contact } = payload;

  console.log('[Referral Handler] Method:', method);
  console.log('[Referral Handler] Contact:', contact);

  try {
    // Atomic create-and-sync operation
    const syncedReferral = await syncService.createAndSync(
      'referral-index-lite',  // Bubble workflow name
      {
        method,
        contact,
      },
      'zat_referrals',  // Bubble object type
      'zat_referrals'   // Supabase table
    );

    console.log('[Referral Handler] ✅ Referral created and synced');
    console.log('[Referral Handler] Referral ID:', syncedReferral._id);
    console.log('[Referral Handler] ========== SUCCESS ==========');

    return syncedReferral;
  } catch (error) {
    console.error('[Referral Handler] ========== ERROR ==========');
    console.error('[Referral Handler] Failed to submit referral:', error);
    throw error;
  }
}
