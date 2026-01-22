/**
 * Create Test Guest Action Handler
 * Generates a test guest user for the simulation
 */

import { SupabaseClient } from "https://esm.sh/@supabase/supabase-js@2";

interface CreateTestGuestPayload {
  simulationId: string;
}

interface AuthUser {
  id: string;
  email: string;
}

interface TestGuestResult {
  guestId: string;
  guestEmail: string;
  guestName: string;
  simulationId: string;
}

/**
 * Generate a unique test email
 */
function generateTestEmail(simulationId: string): string {
  const timestamp = Date.now().toString(36);
  return `test_guest_${simulationId}_${timestamp}@simulation.splitlease.com`;
}

export async function handleCreateTestGuest(
  payload: CreateTestGuestPayload,
  user: AuthUser,
  supabase: SupabaseClient
): Promise<TestGuestResult> {
  console.log('[createTestGuest] Starting for simulation:', payload.simulationId);

  const { simulationId } = payload;

  if (!simulationId) {
    throw new Error('simulationId is required');
  }

  const testEmail = generateTestEmail(simulationId);
  const testFirstName = 'Test';
  const testLastName = `Guest ${simulationId.substring(4, 10)}`;

  // Create test guest user record
  // Note: We're creating a user record directly, not through auth
  // This is for simulation purposes only
  const { data: guestData, error: createError } = await supabase
    .from('user')
    .insert({
      email: testEmail,
      'Name - First': testFirstName,
      'Name - Last': testLastName,
      userType: 'A Guest (I would like to rent a space)',
      'is usability tester': true,
      'is_test_data': true,
      'simulation_id': simulationId,
      'Created Date': new Date().toISOString(),
      'Modified Date': new Date().toISOString()
    })
    .select('_id, email, "Name - First", "Name - Last"')
    .single();

  if (createError) {
    console.error('[createTestGuest] Error creating guest:', createError);
    throw new Error(`Failed to create test guest: ${createError.message}`);
  }

  console.log('[createTestGuest] Created test guest:', guestData._id);

  // Also create a guest account record if the table exists
  try {
    await supabase
      .from('account_guest')
      .insert({
        user: guestData._id,
        'is_test_data': true,
        'simulation_id': simulationId,
        'Created Date': new Date().toISOString()
      });
    console.log('[createTestGuest] Created guest account record');
  } catch (accountError) {
    console.warn('[createTestGuest] Could not create guest account (may not exist):', accountError);
    // Continue - account table may not exist or have different schema
  }

  return {
    guestId: guestData._id,
    guestEmail: testEmail,
    guestName: `${testFirstName} ${testLastName}`,
    simulationId
  };
}
