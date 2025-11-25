/**
 * AI Signup (Market Research) Handler
 * Priority: MEDIUM
 *
 * Handles AI-powered market research signup with atomic sync
 * This workflow collects user market research requests
 */

import { BubbleSyncService } from '../../_shared/bubbleSync.ts';
import { validateRequiredFields, validateEmail, validatePhone } from '../../_shared/validation.ts';
import { User } from '../../_shared/types.ts';

/**
 * Handle AI signup/market research submission
 * NO FALLBACK: Atomic operation - all steps succeed or all fail
 */
export async function handleAiSignup(
  syncService: BubbleSyncService,
  payload: Record<string, any>,
  user: User
): Promise<any> {
  console.log('[AI Signup Handler] ========== AI SIGNUP ==========');
  console.log('[AI Signup Handler] User:', user.email);
  console.log('[AI Signup Handler] Payload:', JSON.stringify(payload, null, 2));

  // Validate required fields
  validateRequiredFields(payload, ['email', 'text_inputted']);

  const { email, phone, text_inputted } = payload;

  // Validate email format
  validateEmail(email);

  // Validate phone if provided (optional)
  if (phone) {
    validatePhone(phone);
  }

  // Validate text is not empty
  if (!text_inputted.trim()) {
    throw new Error('Market research description cannot be empty');
  }

  console.log('[AI Signup Handler] Email:', email);
  console.log('[AI Signup Handler] Phone:', phone || 'Not provided');
  console.log('[AI Signup Handler] Description length:', text_inputted.length);

  try {
    // Atomic create-and-sync operation
    const syncedSignup = await syncService.createAndSync(
      'ai-signup-guest',  // Bubble workflow name
      {
        email,
        phone: phone || '',
        'text inputted': text_inputted,
      },
      'zat_users',    // Bubble object type
      'zat_users'     // Supabase table
    );

    console.log('[AI Signup Handler] ✅ AI signup created and synced');
    console.log('[AI Signup Handler] User ID:', syncedSignup._id);
    console.log('[AI Signup Handler] ========== SUCCESS ==========');

    return syncedSignup;
  } catch (error) {
    console.error('[AI Signup Handler] ========== ERROR ==========');
    console.error('[AI Signup Handler] Failed to create AI signup:', error);
    throw error;
  }
}
