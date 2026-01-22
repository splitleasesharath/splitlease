/**
 * Step C: Date Change Request Handler
 *
 * Simulates a host-initiated date change request.
 * The guest reviews and accepts the proposed new dates.
 */

import { SupabaseClient } from "https://esm.sh/@supabase/supabase-js@2";

interface StepCPayload {
  simulationId: string;
  leaseId: string;
}

interface StepCResult {
  dateChangeRequest: {
    id: string;
    originalStartDate: string;
    originalEndDate: string;
    newStartDate: string;
    newEndDate: string;
    status: string;
    respondedAt: string;
  };
}

export async function handleStepC(
  supabase: SupabaseClient,
  payload: StepCPayload
): Promise<StepCResult> {
  const { simulationId, leaseId } = payload;

  if (!simulationId) {
    throw new Error('simulationId is required');
  }

  console.log(`[step_c] Processing date change for simulation: ${simulationId}`);

  // Get current lease dates
  let originalStartDate = new Date(Date.now() + 86400000).toISOString().split('T')[0];
  let originalEndDate = new Date(Date.now() + 86400000 * 29).toISOString().split('T')[0];

  if (leaseId) {
    const { data: lease } = await supabase
      .from('lease')
      .select('start_date, end_date')
      .eq('_id', leaseId)
      .single();

    if (lease) {
      originalStartDate = lease.start_date;
      originalEndDate = lease.end_date;
    }
  }

  // Calculate new dates (shift by 3 days)
  const originalStart = new Date(originalStartDate);
  const originalEnd = new Date(originalEndDate);

  const newStartDate = new Date(originalStart.getTime() + 86400000 * 3);
  const newEndDate = new Date(originalEnd.getTime() + 86400000 * 3);

  // Try to create a date change request record
  const requestData = {
    lease_id: leaseId,
    original_start_date: originalStartDate,
    original_end_date: originalEndDate,
    new_start_date: newStartDate.toISOString().split('T')[0],
    new_end_date: newEndDate.toISOString().split('T')[0],
    requested_by: 'host',
    status: 'accepted',
    responded_at: new Date().toISOString(),
    simulation_id: simulationId,
    notes: '[SIMULATION] Test date change request'
  };

  const { data: request, error: createError } = await supabase
    .from('date_change_request')
    .insert(requestData)
    .select()
    .single();

  if (createError) {
    console.log('[step_c] Could not create date change record:', createError.message);
  }

  // Update the lease with new dates if it exists
  if (leaseId) {
    await supabase
      .from('lease')
      .update({
        start_date: newStartDate.toISOString().split('T')[0],
        end_date: newEndDate.toISOString().split('T')[0]
      })
      .eq('_id', leaseId);
  }

  console.log(`[step_c] Date change processed`);

  return {
    dateChangeRequest: {
      id: request?._id || request?.id || `dcr_${Date.now()}`,
      originalStartDate,
      originalEndDate,
      newStartDate: newStartDate.toISOString().split('T')[0],
      newEndDate: newEndDate.toISOString().split('T')[0],
      status: 'accepted',
      respondedAt: new Date().toISOString()
    }
  };
}
