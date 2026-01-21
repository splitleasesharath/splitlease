/**
 * Initialize Simulation Action Handler
 * Creates a unique simulation session ID for tracking test data
 */

import { SupabaseClient } from "https://esm.sh/@supabase/supabase-js@2";

interface InitSimulationPayload {
  hostId?: string;
}

interface AuthUser {
  id: string;
  email: string;
}

interface SimulationSession {
  simulationId: string;
  hostId: string;
  createdAt: string;
}

/**
 * Generate a unique simulation ID
 * Format: sim_<timestamp>_<random>
 */
function generateSimulationId(): string {
  const timestamp = Date.now().toString(36);
  const random = Math.random().toString(36).substring(2, 8);
  return `sim_${timestamp}_${random}`;
}

export async function handleInitSimulation(
  payload: InitSimulationPayload,
  user: AuthUser,
  supabase: SupabaseClient
): Promise<SimulationSession> {
  console.log('[initSimulation] Starting for user:', user.id);

  const hostId = payload.hostId || user.id;
  const simulationId = generateSimulationId();

  // Verify the user exists and get their user record ID
  const { data: userData, error: userError } = await supabase
    .from('user')
    .select('_id, "Name - First", "Name - Last", userType')
    .eq('supabaseUserId', user.id)
    .single();

  if (userError) {
    console.error('[initSimulation] Error fetching user:', userError);
    throw new Error('Failed to fetch user data');
  }

  if (!userData) {
    throw new Error('User not found');
  }

  // Check if user is a host
  const userType = userData.userType || '';
  const isHost = userType.includes('Host') || userType.includes('Landlord');

  if (!isHost) {
    console.warn('[initSimulation] User is not a host, userType:', userType);
    // Allow for testing purposes, but log warning
  }

  console.log('[initSimulation] Created simulation session:', simulationId);

  return {
    simulationId,
    hostId: userData._id,
    createdAt: new Date().toISOString()
  };
}
