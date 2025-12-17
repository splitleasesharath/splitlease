/**
 * Delete Listing Handler
 * Split Lease - Supabase Edge Functions
 *
 * PATTERN: Soft delete (set Active=false) with queue-based Bubble sync
 * Following virtual-meeting/handlers/delete.ts pattern
 *
 * NO FALLBACK PRINCIPLE: All errors fail fast without fallback logic
 */

import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';
import { ValidationError, SupabaseSyncError } from '../../_shared/errors.ts';
import { validateRequiredFields } from '../../_shared/validation.ts';
import { enqueueBubbleSync, triggerQueueProcessing } from '../../_shared/queueSync.ts';

interface DeleteListingPayload {
  listing_id: string;
  user_email?: string; // Optional: for ownership verification
}

interface DeleteListingResult {
  deleted: true;
  listing_id: string;
  deletedAt: string;
}

/**
 * Handle listing deletion with Supabase-first pattern
 * Soft deletes (Active=false) and queues Bubble sync
 */
export async function handleDelete(
  payload: Record<string, unknown>
): Promise<DeleteListingResult> {
  console.log('[listing:delete] ========== DELETE LISTING ==========');

  // Validate required fields
  validateRequiredFields(payload, ['listing_id']);

  const { listing_id, user_email } = payload as DeleteListingPayload;

  // Get environment variables
  const supabaseUrl = Deno.env.get('SUPABASE_URL');
  const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY');

  if (!supabaseUrl || !supabaseServiceKey) {
    throw new Error('Missing required environment variables');
  }

  // Initialize Supabase admin client
  const supabase = createClient(supabaseUrl, supabaseServiceKey, {
    auth: { autoRefreshToken: false, persistSession: false }
  });

  console.log('[listing:delete] Deleting listing ID:', listing_id);
  if (user_email) {
    console.log('[listing:delete] User email:', user_email);
  }

  // Step 1: Verify listing exists
  const { data: existingListing, error: fetchError } = await supabase
    .from('listing')
    .select('_id, Name, "Host User"')
    .eq('_id', listing_id)
    .single();

  if (fetchError || !existingListing) {
    console.error('[listing:delete] Listing not found:', fetchError);
    throw new ValidationError(`Listing not found: ${listing_id}`);
  }

  console.log('[listing:delete] Found listing:', existingListing.Name);

  // Step 2: Soft delete (set Active=false)
  const now = new Date().toISOString();
  const { error: updateError } = await supabase
    .from('listing')
    .update({
      Active: false,
      'Modified Date': now,
    })
    .eq('_id', listing_id);

  if (updateError) {
    console.error('[listing:delete] Update failed:', updateError);
    throw new SupabaseSyncError(`Failed to delete listing: ${updateError.message}`);
  }

  console.log('[listing:delete] Listing soft-deleted successfully');

  // Step 3: Queue Bubble sync (UPDATE operation to set Active=false)
  try {
    await enqueueBubbleSync(supabase, {
      correlationId: `listing_delete:${listing_id}`,
      items: [{
        sequence: 1,
        table: 'listing',
        recordId: listing_id,
        operation: 'UPDATE',
        bubbleId: listing_id,
        payload: { Active: false, 'Modified Date': now },
      }]
    });

    console.log('[listing:delete] Bubble sync enqueued');
    triggerQueueProcessing();
  } catch (syncError) {
    console.error('[listing:delete] Queue error (non-blocking):', syncError);
  }

  console.log('[listing:delete] ========== SUCCESS ==========');

  return {
    deleted: true,
    listing_id: listing_id,
    deletedAt: now,
  };
}
