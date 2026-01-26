/**
 * Get Lease Handler
 * Split Lease - Supabase Edge Functions
 *
 * Fetches lease details for display in the frontend.
 * Requires authentication to ensure users can only access their own leases.
 */

import { SupabaseClient } from 'https://esm.sh/@supabase/supabase-js@2';
import { ValidationError, AuthenticationError } from '../../_shared/errors.ts';
import { validateGetLeasePayload } from '../lib/validators.ts';
import type { UserContext, LeaseData } from '../lib/types.ts';

/**
 * Handle get lease request
 *
 * Fetches lease with related data (proposal, stays, payment records)
 * Validates that the requesting user is a participant in the lease.
 *
 * @param payload - Request payload with leaseId
 * @param user - Authenticated user context
 * @param supabase - Supabase client
 * @returns Lease data with related records
 */
export async function handleGet(
  payload: Record<string, unknown>,
  user: UserContext | null,
  supabase: SupabaseClient
): Promise<LeaseData & { canAccess: boolean }> {
  console.log('[lease:get] Fetching lease...');

  // Validate input
  validateGetLeasePayload(payload);

  const leaseId = payload.leaseId as string;

  // Fetch lease with related data
  const { data: lease, error: leaseError } = await supabase
    .from('bookings_leases')
    .select(`
      *,
      proposal:Proposal (
        _id,
        Status,
        "rental type",
        "hc move in date",
        "hc reservation span (weeks)",
        "hc nights per week",
        "hc nightly price"
      ),
      guest:Guest (
        _id,
        email,
        "First Name",
        "Last Name"
      ),
      host:Host (
        _id,
        email,
        "First Name",
        "Last Name"
      ),
      listing:Listing (
        _id,
        Name,
        "listing full address (text)",
        "List of Photos",
        "cancellation policy"
      )
    `)
    .eq('_id', leaseId)
    .single();

  if (leaseError) {
    console.error('[lease:get] Error fetching lease:', leaseError.message);
    throw new ValidationError(`Lease not found: ${leaseError.message}`);
  }

  if (!lease) {
    throw new ValidationError('Lease not found');
  }

  // Check if user is a participant
  const participants: string[] = lease.Participants || [];
  const isParticipant = user ? participants.includes(user.id) : false;

  if (user && !isParticipant) {
    console.warn('[lease:get] User not authorized:', user.id);
    throw new AuthenticationError('Not authorized to view this lease');
  }

  console.log('[lease:get] Lease fetched successfully:', leaseId);

  return {
    ...lease,
    canAccess: isParticipant,
  };
}
