/**
 * AI Inquiry (Market Research) Handler
 * Priority: MEDIUM
 *
 * Handles AI-powered market research inquiries with atomic sync
 * This workflow collects user market research requests
 *
 * NOTE: This is NOT an authentication concern - it's a lead generation/inquiry form
 * that collects email for market research purposes. Renamed from 'signup' to 'inquiry'
 * for clarity.
 */

import { BubbleSyncService } from '../../_shared/bubbleSync.ts';
import { validateRequiredFields, validateEmail, validatePhone } from '../../_shared/validation.ts';
import { User } from '../../_shared/types.ts';

/**
 * Handle AI market research inquiry submission
 * NO FALLBACK: Atomic operation - all steps succeed or all fail
 */
export async function handleAiInquiry(
  syncService: BubbleSyncService,
  payload: Record<string, any>,
  user: User
): Promise<any> {
  console.log('[AI Inquiry Handler] ========== AI INQUIRY ==========');
  console.log('[AI Inquiry Handler] User:', user.email);
  console.log('[AI Inquiry Handler] Payload:', JSON.stringify(payload, null, 2));

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

  console.log('[AI Inquiry Handler] Email:', email);
  console.log('[AI Inquiry Handler] Phone:', phone || 'Not provided');
  console.log('[AI Inquiry Handler] Description length:', text_inputted.length);

  try {
    // Atomic create-and-sync operation
    const syncedInquiry = await syncService.createAndSync(
      'ai-signup-guest',  // Bubble workflow name (keeping original for backwards compatibility)
      {
        email,
        phone: phone || '',
        'text inputted': text_inputted,
      },
      'zat_users',    // Bubble object type
      'zat_users'     // Supabase table
    );

    console.log('[AI Inquiry Handler] ✅ AI inquiry created and synced');
    console.log('[AI Inquiry Handler] User ID:', syncedInquiry._id);
    console.log('[AI Inquiry Handler] ========== SUCCESS ==========');

    return syncedInquiry;
  } catch (error) {
    console.error('[AI Inquiry Handler] ========== ERROR ==========');
    console.error('[AI Inquiry Handler] Failed to create AI inquiry:', error);
    throw error;
  }
}
