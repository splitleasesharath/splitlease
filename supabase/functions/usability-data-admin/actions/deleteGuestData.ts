/**
 * Delete Guest Data Action Handler
 * Clears threads, proposals, and data for a guest
 */

import { SupabaseClient } from "https://esm.sh/@supabase/supabase-js@2";

interface DeleteGuestDataPayload {
  guestId: string;
}

export async function handleDeleteGuestData(
  payload: DeleteGuestDataPayload,
  supabase: SupabaseClient
) {
  const { guestId } = payload;

  if (!guestId) {
    throw new Error('guestId is required');
  }

  console.log('[usability-data-admin] Deleting guest data for:', guestId);

  // Track deletion counts
  let proposalsDeleted = 0;
  let threadsDeleted = 0;

  // Delete proposals where guest is involved
  const { data: proposalData, error: proposalError } = await supabase
    .from('proposal')
    .delete()
    .eq('Guest', guestId)
    .select('_id');

  if (proposalError) {
    console.error('[usability-data-admin] Delete proposals error:', proposalError);
    throw new Error(`Failed to delete proposals: ${proposalError.message}`);
  }

  proposalsDeleted = proposalData?.length || 0;
  console.log('[usability-data-admin] Deleted proposals:', proposalsDeleted);

  // Delete message threads where guest is a participant
  const { data: threadData, error: threadError } = await supabase
    .from('message_threads')
    .delete()
    .eq('guest_id', guestId)
    .select('thread_id');

  if (threadError) {
    console.error('[usability-data-admin] Delete threads error:', threadError);
    throw new Error(`Failed to delete threads: ${threadError.message}`);
  }

  threadsDeleted = threadData?.length || 0;
  console.log('[usability-data-admin] Deleted threads:', threadsDeleted);

  const timestamp = new Date().toISOString();
  console.log('[usability-data-admin] Guest data cleared:', { guestId, timestamp });

  return {
    success: true,
    message: `Cleared data for guest ${guestId}`,
    deletedCounts: {
      proposals: proposalsDeleted,
      threads: threadsDeleted,
    },
    timestamp,
  };
}
