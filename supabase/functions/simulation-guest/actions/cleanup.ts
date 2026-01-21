/**
 * Cleanup Simulation Handler
 *
 * Removes all test data created during the simulation.
 * Cleans up proposals, leases, and other records tagged with the simulation ID.
 */

import { SupabaseClient } from "https://esm.sh/@supabase/supabase-js@2";

interface CleanupPayload {
  simulationId: string;
}

interface CleanupResult {
  cleaned: {
    proposals: number;
    leases: number;
    dateChangeRequests: number;
    houseManualVisits: number;
  };
}

export async function handleCleanup(
  supabase: SupabaseClient,
  payload: CleanupPayload
): Promise<CleanupResult> {
  const { simulationId } = payload;

  if (!simulationId) {
    throw new Error('simulationId is required');
  }

  console.log(`[cleanup] Starting cleanup for simulation: ${simulationId}`);

  const results = {
    proposals: 0,
    leases: 0,
    dateChangeRequests: 0,
    houseManualVisits: 0
  };

  // Clean up proposals with this simulation ID
  try {
    const { data: deletedProposals } = await supabase
      .from('proposal')
      .delete()
      .eq('simulation_id', simulationId)
      .select('_id');

    results.proposals = deletedProposals?.length || 0;
    console.log(`[cleanup] Deleted ${results.proposals} proposals`);
  } catch (err) {
    console.log('[cleanup] Could not clean proposals:', (err as Error).message);
  }

  // Clean up leases with this simulation ID
  try {
    const { data: deletedLeases } = await supabase
      .from('lease')
      .delete()
      .eq('simulation_id', simulationId)
      .select('_id');

    results.leases = deletedLeases?.length || 0;
    console.log(`[cleanup] Deleted ${results.leases} leases`);
  } catch (err) {
    console.log('[cleanup] Could not clean leases:', (err as Error).message);
  }

  // Clean up date change requests with this simulation ID
  try {
    const { data: deletedRequests } = await supabase
      .from('date_change_request')
      .delete()
      .eq('simulation_id', simulationId)
      .select('_id');

    results.dateChangeRequests = deletedRequests?.length || 0;
    console.log(`[cleanup] Deleted ${results.dateChangeRequests} date change requests`);
  } catch (err) {
    console.log('[cleanup] Could not clean date change requests:', (err as Error).message);
  }

  // Clean up house manual visits with this simulation ID
  try {
    const { data: deletedVisits } = await supabase
      .from('house_manual_visit')
      .delete()
      .eq('simulation_id', simulationId)
      .select('_id');

    results.houseManualVisits = deletedVisits?.length || 0;
    console.log(`[cleanup] Deleted ${results.houseManualVisits} house manual visits`);
  } catch (err) {
    console.log('[cleanup] Could not clean house manual visits:', (err as Error).message);
  }

  console.log(`[cleanup] Cleanup completed for simulation: ${simulationId}`);

  return {
    cleaned: results
  };
}
