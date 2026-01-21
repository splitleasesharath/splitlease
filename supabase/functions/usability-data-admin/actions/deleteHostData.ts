/**
 * Delete Host Data Action Handler
 * Clears threads, proposals, and data for a host
 */

import { SupabaseClient } from "https://esm.sh/@supabase/supabase-js@2";

interface DeleteHostDataPayload {
  hostId: string;
}

export async function handleDeleteHostData(
  payload: DeleteHostDataPayload,
  supabase: SupabaseClient
) {
  const { hostId } = payload;

  if (!hostId) {
    throw new Error('hostId is required');
  }

  console.log('[usability-data-admin] Deleting host data for:', hostId);

  // Track deletion counts
  let proposalsDeleted = 0;
  let threadsDeleted = 0;

  // Delete proposals where host is involved
  const { data: proposalData, error: proposalError } = await supabase
    .from('proposal')
    .delete()
    .eq('Host', hostId)
    .select('_id');

  if (proposalError) {
    console.error('[usability-data-admin] Delete proposals error:', proposalError);
    throw new Error(`Failed to delete proposals: ${proposalError.message}`);
  }

  proposalsDeleted = proposalData?.length || 0;
  console.log('[usability-data-admin] Deleted proposals:', proposalsDeleted);

  // Delete message threads where host is a participant
  const { data: threadData, error: threadError } = await supabase
    .from('message_threads')
    .delete()
    .eq('host_id', hostId)
    .select('thread_id');

  if (threadError) {
    console.error('[usability-data-admin] Delete threads error:', threadError);
    throw new Error(`Failed to delete threads: ${threadError.message}`);
  }

  threadsDeleted = threadData?.length || 0;
  console.log('[usability-data-admin] Deleted threads:', threadsDeleted);

  const timestamp = new Date().toISOString();
  console.log('[usability-data-admin] Host data cleared:', { hostId, timestamp });

  return {
    success: true,
    message: `Cleared data for host ${hostId}`,
    deletedCounts: {
      proposals: proposalsDeleted,
      threads: threadsDeleted,
    },
    timestamp,
  };
}
