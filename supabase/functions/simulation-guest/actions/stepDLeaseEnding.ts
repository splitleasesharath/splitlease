/**
 * Step D: Lease Ending Handler
 *
 * Simulates the lease approaching its end date.
 * Updates the lease to show it's nearing completion.
 */

import { SupabaseClient } from "https://esm.sh/@supabase/supabase-js@2";

interface StepDPayload {
  simulationId: string;
  leaseId: string;
}

interface StepDResult {
  leaseEndingDetails: {
    leaseId: string;
    endDate: string;
    daysRemaining: number;
    status: string;
  };
}

export async function handleStepD(
  supabase: SupabaseClient,
  payload: StepDPayload
): Promise<StepDResult> {
  const { simulationId, leaseId } = payload;

  if (!simulationId) {
    throw new Error('simulationId is required');
  }

  console.log(`[step_d] Processing lease ending view for simulation: ${simulationId}`);

  // Calculate a simulated "approaching end" date (5 days from now)
  const approachingEndDate = new Date(Date.now() + 86400000 * 5);
  const daysRemaining = 5;

  // Update lease if it exists to simulate approaching end
  if (leaseId) {
    const { error: updateError } = await supabase
      .from('lease')
      .update({
        end_date: approachingEndDate.toISOString().split('T')[0],
        status: 'Ending Soon'
      })
      .eq('_id', leaseId);

    if (updateError) {
      console.log('[step_d] Could not update lease:', updateError.message);
    }
  }

  console.log(`[step_d] Lease ending details viewed`);

  return {
    leaseEndingDetails: {
      leaseId: leaseId || `mock_lease_${Date.now()}`,
      endDate: approachingEndDate.toISOString().split('T')[0],
      daysRemaining,
      status: 'Ending Soon'
    }
  };
}
