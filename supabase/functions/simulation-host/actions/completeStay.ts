/**
 * Complete Stay Action Handler
 * Marks stay as complete and generates reviews
 */

import { SupabaseClient } from "https://esm.sh/@supabase/supabase-js@2";

interface CompleteStayPayload {
  simulationId: string;
  leaseId: string;
  proposalId: string;
}

interface AuthUser {
  id: string;
  email: string;
}

interface ReviewData {
  reviewId: string;
  reviewerType: 'host' | 'guest';
  rating: number;
}

interface CompleteStayResult {
  leaseCompleted: boolean;
  reviews: ReviewData[];
  simulationId: string;
}

export async function handleCompleteStay(
  payload: CompleteStayPayload,
  user: AuthUser,
  supabase: SupabaseClient
): Promise<CompleteStayResult> {
  console.log('[completeStay] Starting for lease:', payload.leaseId);

  const { simulationId, leaseId, proposalId } = payload;

  if (!simulationId || !proposalId) {
    throw new Error('simulationId and proposalId are required');
  }

  const reviews: ReviewData[] = [];

  // Step 1: Update lease status to completed (if lease exists)
  if (leaseId) {
    try {
      const { error: leaseError } = await supabase
        .from('bookings_leases')
        .update({
          'Lease Status': 'Completed',
          'Modified Date': new Date().toISOString(),
        })
        .eq('_id', leaseId);

      if (leaseError) {
        console.warn('[completeStay] Could not update lease:', leaseError);
      } else {
        console.log('[completeStay] Lease marked as completed');
      }
    } catch (leaseErr) {
      console.warn('[completeStay] Lease update failed:', leaseErr);
    }
  }

  // Step 2: Update proposal status
  const { error: proposalError } = await supabase
    .from('proposal')
    .update({
      Status: 'Stay Completed',
      'Modified Date': new Date().toISOString(),
    })
    .eq('_id', proposalId);

  if (proposalError) {
    console.warn('[completeStay] Could not update proposal:', proposalError);
  }

  // Step 3: Get guest and host IDs from proposal
  const { data: proposal } = await supabase
    .from('proposal')
    .select('"Guest User", "Host User", listing')
    .eq('_id', proposalId)
    .single();

  if (proposal) {
    // Step 4: Create reviews (host review of guest, guest review of host)
    try {
      // Host's review of guest
      const { data: hostReview, error: hostReviewError } = await supabase
        .from('review')
        .insert({
          reviewer: proposal['Host User'],
          reviewee: proposal['Guest User'],
          listing: proposal.listing,
          proposal: proposalId,
          lease: leaseId,
          reviewer_type: 'host',
          rating: 5,
          review_text: 'Great guest! Very respectful and communicative throughout the stay.',
          'is_test_data': true,
          'simulation_id': simulationId,
          'Created Date': new Date().toISOString(),
        })
        .select('_id')
        .single();

      if (hostReviewError) {
        console.warn('[completeStay] Could not create host review:', hostReviewError);
      } else if (hostReview) {
        reviews.push({
          reviewId: hostReview._id,
          reviewerType: 'host',
          rating: 5,
        });
        console.log('[completeStay] Created host review');
      }

      // Guest's review of host/listing
      const { data: guestReview, error: guestReviewError } = await supabase
        .from('review')
        .insert({
          reviewer: proposal['Guest User'],
          reviewee: proposal['Host User'],
          listing: proposal.listing,
          proposal: proposalId,
          lease: leaseId,
          reviewer_type: 'guest',
          rating: 5,
          review_text: 'Wonderful experience! The space was exactly as described and the host was very accommodating.',
          'is_test_data': true,
          'simulation_id': simulationId,
          'Created Date': new Date().toISOString(),
        })
        .select('_id')
        .single();

      if (guestReviewError) {
        console.warn('[completeStay] Could not create guest review:', guestReviewError);
      } else if (guestReview) {
        reviews.push({
          reviewId: guestReview._id,
          reviewerType: 'guest',
          rating: 5,
        });
        console.log('[completeStay] Created guest review');
      }
    } catch (reviewErr) {
      console.warn('[completeStay] Review creation failed (table may not exist):', reviewErr);
      // Continue - review table may not exist
    }
  }

  // Update host's usability step to complete
  const { data: hostUser } = await supabase
    .from('user')
    .select('_id')
    .eq('supabaseUserId', user.id)
    .single();

  if (hostUser) {
    await supabase
      .from('user')
      .update({ 'Usability Step': 6 })
      .eq('_id', hostUser._id);
  }

  console.log('[completeStay] Completed - stay finished with', reviews.length, 'reviews');

  return {
    leaseCompleted: true,
    reviews,
    simulationId,
  };
}
