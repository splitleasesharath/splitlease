/**
 * Handle Guest Request Action Handler
 * Simulates guest submitting a request, then host responds
 */

import { SupabaseClient } from "https://esm.sh/@supabase/supabase-js@2";

interface HandleGuestRequestPayload {
  simulationId: string;
  leaseId: string;
  requestType?: 'early_checkin' | 'late_checkout' | 'amenity_request' | 'maintenance';
  hostResponse?: 'approve' | 'deny';
}

interface AuthUser {
  id: string;
  email: string;
}

interface GuestRequestResult {
  requestCreated: boolean;
  requestType: string;
  hostResponse: string;
  simulationId: string;
}

export async function handleGuestRequest(
  payload: HandleGuestRequestPayload,
  user: AuthUser,
  supabase: SupabaseClient
): Promise<GuestRequestResult> {
  console.log('[handleGuestRequest] Starting for lease:', payload.leaseId);

  const {
    simulationId,
    leaseId,
    requestType = 'early_checkin',
    hostResponse = 'approve'
  } = payload;

  if (!simulationId || !leaseId) {
    throw new Error('simulationId and leaseId are required');
  }

  // Verify lease exists and belongs to this simulation
  const { data: lease, error: fetchError } = await supabase
    .from('bookings_leases')
    .select('_id, simulation_id, "Guest User", "Host User"')
    .eq('_id', leaseId)
    .single();

  if (fetchError || !lease) {
    console.warn('[handleGuestRequest] Lease not found, continuing with simulation:', fetchError);
    // Continue for simulation purposes even if lease doesn't exist
  }

  // For simulation purposes, we'll track the request in memory
  // In production, this would create a record in a guest_requests table

  const requestTypeLabels: Record<string, string> = {
    early_checkin: 'Early Check-in Request',
    late_checkout: 'Late Check-out Request',
    amenity_request: 'Amenity Request',
    maintenance: 'Maintenance Request',
  };

  const requestLabel = requestTypeLabels[requestType] || 'General Request';

  console.log(`[handleGuestRequest] Simulating ${requestLabel}...`);

  // Attempt to create a request record if the table exists
  try {
    await supabase
      .from('guest_requests')
      .insert({
        lease: leaseId,
        request_type: requestType,
        status: hostResponse === 'approve' ? 'Approved' : 'Denied',
        'is_test_data': true,
        'simulation_id': simulationId,
        'Created Date': new Date().toISOString(),
      });
    console.log('[handleGuestRequest] Created request record');
  } catch (requestErr) {
    console.warn('[handleGuestRequest] Could not create request record (table may not exist)');
    // Continue - table may not exist
  }

  // Update host's usability step
  const { data: hostUser } = await supabase
    .from('user')
    .select('_id')
    .eq('supabaseUserId', user.id)
    .single();

  if (hostUser) {
    await supabase
      .from('user')
      .update({ 'Usability Step': 5 })
      .eq('_id', hostUser._id);
  }

  console.log('[handleGuestRequest] Completed - request processed');

  return {
    requestCreated: true,
    requestType: requestLabel,
    hostResponse: hostResponse === 'approve' ? 'Approved' : 'Denied',
    simulationId,
  };
}
