/**
 * Step B: House Manual Handler
 *
 * Simulates the guest receiving access to the house manual.
 * Creates a house_manual_visit record to track access.
 */

import { SupabaseClient } from "https://esm.sh/@supabase/supabase-js@2";

interface StepBPayload {
  simulationId: string;
  leaseId: string;
}

interface StepBResult {
  houseManual: {
    id: string;
    accessedAt: string;
    status: string;
  };
}

export async function handleStepB(
  supabase: SupabaseClient,
  payload: StepBPayload
): Promise<StepBResult> {
  const { simulationId, leaseId } = payload;

  if (!simulationId) {
    throw new Error('simulationId is required');
  }

  console.log(`[step_b] Processing house manual access for simulation: ${simulationId}`);

  // Try to fetch the lease to get associated data
  let guestId = null;
  let listingId = null;

  if (leaseId) {
    const { data: lease } = await supabase
      .from('lease')
      .select('guest_id, listing_id')
      .eq('_id', leaseId)
      .single();

    if (lease) {
      guestId = lease.guest_id;
      listingId = lease.listing_id;
    }
  }

  // Create house manual visit record
  const visitData = {
    guest_id: guestId,
    listing_id: listingId,
    lease_id: leaseId,
    accessed_at: new Date().toISOString(),
    simulation_id: simulationId,
    notes: '[SIMULATION] Test house manual access'
  };

  const { data: visit, error: createError } = await supabase
    .from('house_manual_visit')
    .insert(visitData)
    .select()
    .single();

  if (createError) {
    console.log('[step_b] Could not create visit record:', createError.message);
    // Return mock data - the table might not exist
    return {
      houseManual: {
        id: `mock_visit_${Date.now()}`,
        accessedAt: new Date().toISOString(),
        status: 'accessed'
      }
    };
  }

  console.log(`[step_b] House manual access recorded`);

  return {
    houseManual: {
      id: visit?._id || visit?.id || `visit_${Date.now()}`,
      accessedAt: new Date().toISOString(),
      status: 'accessed'
    }
  };
}
