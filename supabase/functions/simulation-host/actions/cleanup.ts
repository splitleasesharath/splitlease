/**
 * Cleanup Action Handler
 * Removes all test data created during the simulation
 */

import { SupabaseClient } from "https://esm.sh/@supabase/supabase-js@2";

interface CleanupPayload {
  simulationId: string;
}

interface AuthUser {
  id: string;
  email: string;
}

interface CleanupResult {
  deletedCounts: {
    reviews: number;
    leases: number;
    proposals: number;
    guestRequests: number;
    virtualMeetings: number;
    guestAccounts: number;
    users: number;
  };
  simulationId: string;
  success: boolean;
}

export async function handleCleanup(
  payload: CleanupPayload,
  user: AuthUser,
  supabase: SupabaseClient
): Promise<CleanupResult> {
  console.log('[cleanup] Starting cleanup for simulation:', payload.simulationId);

  const { simulationId } = payload;

  if (!simulationId) {
    throw new Error('simulationId is required');
  }

  const deletedCounts = {
    reviews: 0,
    leases: 0,
    proposals: 0,
    guestRequests: 0,
    virtualMeetings: 0,
    guestAccounts: 0,
    users: 0,
  };

  // Delete in order of dependencies (child tables first)

  // 1. Delete reviews
  try {
    const { data: reviews } = await supabase
      .from('review')
      .delete()
      .eq('simulation_id', simulationId)
      .select('_id');

    deletedCounts.reviews = reviews?.length || 0;
    console.log('[cleanup] Deleted', deletedCounts.reviews, 'reviews');
  } catch (err) {
    console.warn('[cleanup] Could not delete reviews:', err);
  }

  // 2. Delete guest requests
  try {
    const { data: requests } = await supabase
      .from('guest_requests')
      .delete()
      .eq('simulation_id', simulationId)
      .select('_id');

    deletedCounts.guestRequests = requests?.length || 0;
    console.log('[cleanup] Deleted', deletedCounts.guestRequests, 'guest requests');
  } catch (err) {
    console.warn('[cleanup] Could not delete guest requests:', err);
  }

  // 3. Delete leases
  try {
    const { data: leases } = await supabase
      .from('bookings_leases')
      .delete()
      .eq('simulation_id', simulationId)
      .select('_id');

    deletedCounts.leases = leases?.length || 0;
    console.log('[cleanup] Deleted', deletedCounts.leases, 'leases');
  } catch (err) {
    console.warn('[cleanup] Could not delete leases:', err);
  }

  // 4. Delete virtual meetings
  try {
    const { data: meetings } = await supabase
      .from('virtualmeetingschedulesandlinks')
      .delete()
      .eq('simulation_id', simulationId)
      .select('_id');

    deletedCounts.virtualMeetings = meetings?.length || 0;
    console.log('[cleanup] Deleted', deletedCounts.virtualMeetings, 'virtual meetings');
  } catch (err) {
    console.warn('[cleanup] Could not delete virtual meetings:', err);
  }

  // 5. Delete proposals
  try {
    const { data: proposals } = await supabase
      .from('proposal')
      .delete()
      .eq('simulation_id', simulationId)
      .select('_id');

    deletedCounts.proposals = proposals?.length || 0;
    console.log('[cleanup] Deleted', deletedCounts.proposals, 'proposals');
  } catch (err) {
    console.warn('[cleanup] Could not delete proposals:', err);
  }

  // 6. Delete guest accounts
  try {
    const { data: guestAccounts } = await supabase
      .from('account_guest')
      .delete()
      .eq('simulation_id', simulationId)
      .select('_id');

    deletedCounts.guestAccounts = guestAccounts?.length || 0;
    console.log('[cleanup] Deleted', deletedCounts.guestAccounts, 'guest accounts');
  } catch (err) {
    console.warn('[cleanup] Could not delete guest accounts:', err);
  }

  // 7. Delete test users (only simulation-created guest users)
  try {
    const { data: users } = await supabase
      .from('user')
      .delete()
      .eq('simulation_id', simulationId)
      .select('_id');

    deletedCounts.users = users?.length || 0;
    console.log('[cleanup] Deleted', deletedCounts.users, 'test users');
  } catch (err) {
    console.warn('[cleanup] Could not delete test users:', err);
  }

  // Reset the host's usability tester status
  const { data: hostUser } = await supabase
    .from('user')
    .select('_id')
    .eq('supabaseUserId', user.id)
    .single();

  if (hostUser) {
    await supabase
      .from('user')
      .update({
        'is usability tester': false,
        'Usability Step': null,
        'Modified Date': new Date().toISOString(),
      })
      .eq('_id', hostUser._id);

    console.log('[cleanup] Reset host usability status');
  }

  const totalDeleted = Object.values(deletedCounts).reduce((a, b) => a + b, 0);
  console.log('[cleanup] Completed - deleted', totalDeleted, 'total records');

  return {
    deletedCounts,
    simulationId,
    success: true,
  };
}
