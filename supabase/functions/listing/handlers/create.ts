/**
 * Listing Creation Handler
 * Priority: CRITICAL
 *
 * STANDARDIZED FLOW (Supabase-first with queue-based Bubble sync):
 * 1. Generate Bubble-compatible ID via generate_bubble_id()
 * 2. Create listing in Supabase (source of truth)
 * 3. Queue INSERT to Bubble (Data API) for async processing
 * 4. Return listing data immediately
 *
 * This flow matches the proposal and auth-user patterns for uniformity.
 *
 * NO FALLBACK PRINCIPLE: Supabase insert must succeed, Bubble sync is queued
 */

import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';
import { validateRequiredFields } from '../../_shared/validation.ts';
import { enqueueBubbleSync, triggerQueueProcessing } from '../../_shared/queueSync.ts';

interface CreateListingPayload {
  listing_name: string;
  user_email?: string;
}

interface CreateListingResult {
  _id: string;
  listing_id: string;
  Name: string;
  [key: string]: unknown;
}

/**
 * Handle listing creation with Supabase-first pattern
 * Supabase insert must succeed, Bubble sync is queued for async processing
 */
export async function handleCreate(
  payload: Record<string, unknown>
): Promise<CreateListingResult> {
  console.log('[listing:create] ========== CREATE LISTING (SUPABASE-FIRST) ==========');
  console.log('[listing:create] Payload:', JSON.stringify(payload, null, 2));

  // Validate required fields
  validateRequiredFields(payload, ['listing_name']);

  const { listing_name, user_email } = payload as CreateListingPayload;

  // Get environment variables
  const supabaseUrl = Deno.env.get('SUPABASE_URL');
  const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY');

  if (!supabaseUrl || !supabaseServiceKey) {
    throw new Error('Missing required environment variables');
  }

  // Initialize Supabase admin client
  const supabase = createClient(supabaseUrl, supabaseServiceKey, {
    auth: {
      autoRefreshToken: false,
      persistSession: false
    }
  });

  console.log('[listing:create] Creating listing with name:', listing_name);
  console.log('[listing:create] User email:', user_email || 'Not provided (logged out)');

  try {
    // Step 1: Generate Bubble-compatible ID
    console.log('[listing:create] Step 1/3: Generating listing ID...');
    const { data: listingId, error: idError } = await supabase.rpc('generate_bubble_id');

    if (idError || !listingId) {
      console.error('[listing:create] ID generation failed:', idError);
      throw new Error('Failed to generate listing ID');
    }

    console.log('[listing:create] ✅ Step 1 complete - Listing ID:', listingId);

    // Step 2: Create listing in Supabase
    console.log('[listing:create] Step 2/3: Creating listing in Supabase...');
    const now = new Date().toISOString();

    // Build initial listing data
    const listingData: Record<string, unknown> = {
      _id: listingId,
      Name: listing_name.trim(),
      Status: 'Draft',
      Active: false,
      'Created Date': now,
      'Modified Date': now,
    };

    // If user_email provided, look up user and attach
    let hostAccountId: string | null = null;
    if (user_email) {
      const { data: userData } = await supabase
        .from('user')
        .select('_id, "Account - Host / Landlord"')
        .eq('email', user_email.toLowerCase())
        .single();

      if (userData) {
        hostAccountId = userData['Account - Host / Landlord'] as string;
        listingData['Host / Landlord'] = hostAccountId;
        listingData['Created By'] = userData._id;
        console.log('[listing:create] User found, host account:', hostAccountId);
      }
    }

    const { error: insertError } = await supabase
      .from('listing')
      .insert(listingData);

    if (insertError) {
      console.error('[listing:create] Supabase insert failed:', insertError);
      throw new Error(`Failed to create listing: ${insertError.message}`);
    }

    console.log('[listing:create] ✅ Step 2 complete - Listing created in Supabase');

    // Step 3: Queue Bubble sync (INSERT operation)
    console.log('[listing:create] Step 3/3: Queueing Bubble sync...');
    try {
      await enqueueBubbleSync(supabase, {
        correlationId: `listing_create:${listingId}`,
        items: [{
          sequence: 1,
          table: 'listing',
          recordId: listingId,
          operation: 'INSERT',
          payload: listingData,
        }]
      });

      console.log('[listing:create] ✅ Step 3 complete - Bubble sync queued');

      // Trigger queue processing (fire-and-forget)
      // pg_cron will also process the queue as a fallback
      triggerQueueProcessing();
    } catch (syncError) {
      // Log but don't fail - sync can be retried via pg_cron
      console.error('[listing:create] ⚠️ Step 3 warning - Queue error (non-blocking):', syncError);
    }

    console.log('[listing:create] ========== SUCCESS ==========');

    // Return the listing data
    return {
      _id: listingId,
      listing_id: listingId,
      Name: listing_name.trim(),
      ...listingData
    };
  } catch (error) {
    console.error('[listing:create] ========== ERROR ==========');
    console.error('[listing:create] Failed to create listing:', error);
    throw error;
  }
}
