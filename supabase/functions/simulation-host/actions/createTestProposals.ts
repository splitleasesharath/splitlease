/**
 * Create Test Proposals Action Handler
 * Creates 3 test proposals (Weekly, Monthly, Nightly) from the test guest
 */

import { SupabaseClient } from "https://esm.sh/@supabase/supabase-js@2";

interface CreateTestProposalsPayload {
  simulationId: string;
  guestId: string;
  listingId: string;
  hostId: string;
  rentalType: 'weekly' | 'monthly' | 'nightly';
}

interface AuthUser {
  id: string;
  email: string;
}

interface ProposalData {
  proposalId: string;
  rentalType: string;
  status: string;
}

interface TestProposalsResult {
  proposals: ProposalData[];
  simulationId: string;
}

/**
 * Get proposal configuration based on rental type
 */
function getProposalConfig(rentalType: string) {
  const now = new Date();
  const oneWeekFromNow = new Date(now.getTime() + 7 * 24 * 60 * 60 * 1000);
  const twoWeeksFromNow = new Date(now.getTime() + 14 * 24 * 60 * 60 * 1000);
  const threeMonthsFromNow = new Date(now.getTime() + 90 * 24 * 60 * 60 * 1000);

  const baseConfig = {
    'Guest MIS': oneWeekFromNow.toISOString().split('T')[0],
    'Guest MIE': twoWeeksFromNow.toISOString().split('T')[0],
    'Guest Move-out Date': threeMonthsFromNow.toISOString().split('T')[0],
    Status: 'Under Review',
  };

  switch (rentalType) {
    case 'weekly':
      return {
        ...baseConfig,
        'Rental Type': 'Weekly',
        'Guest Nights per Week': 4,
        'Guest check-in day': 2, // Tuesday (0-indexed)
        'Guest check-out day': 6, // Saturday
        'Guest Nightly Price': 125,
      };
    case 'monthly':
      return {
        ...baseConfig,
        'Rental Type': 'Monthly',
        'Guest Nights per Week': 7,
        'Guest check-in day': 0, // Sunday
        'Guest check-out day': 0, // Sunday (full week)
        'Guest Nightly Price': 100,
      };
    case 'nightly':
    default:
      return {
        ...baseConfig,
        'Rental Type': 'Nightly',
        'Guest Nights per Week': 2,
        'Guest check-in day': 5, // Friday
        'Guest check-out day': 0, // Sunday
        'Guest Nightly Price': 150,
      };
  }
}

export async function handleCreateTestProposals(
  payload: CreateTestProposalsPayload,
  user: AuthUser,
  supabase: SupabaseClient
): Promise<TestProposalsResult> {
  console.log('[createTestProposals] Starting for simulation:', payload.simulationId);

  const { simulationId, guestId, listingId, hostId, rentalType } = payload;

  if (!simulationId || !guestId || !listingId || !hostId) {
    throw new Error('simulationId, guestId, listingId, and hostId are required');
  }

  const proposals: ProposalData[] = [];

  // Create 3 proposals with different rental types
  const rentalTypes: Array<'weekly' | 'monthly' | 'nightly'> = ['weekly', 'monthly', 'nightly'];

  for (const type of rentalTypes) {
    const config = getProposalConfig(type);

    const proposalData = {
      'Guest User': guestId,
      'Host User': hostId,
      listing: listingId,
      ...config,
      'is_test_data': true,
      'simulation_id': simulationId,
      'Created Date': new Date().toISOString(),
      'Modified Date': new Date().toISOString(),
    };

    console.log(`[createTestProposals] Creating ${type} proposal...`);

    const { data: proposal, error: createError } = await supabase
      .from('proposal')
      .insert(proposalData)
      .select('_id, Status, "Rental Type"')
      .single();

    if (createError) {
      console.error(`[createTestProposals] Error creating ${type} proposal:`, createError);
      throw new Error(`Failed to create ${type} proposal: ${createError.message}`);
    }

    console.log(`[createTestProposals] Created ${type} proposal:`, proposal._id);

    proposals.push({
      proposalId: proposal._id,
      rentalType: proposal['Rental Type'],
      status: proposal.Status,
    });
  }

  // Update the host's usability step
  const { data: hostUser } = await supabase
    .from('user')
    .select('_id')
    .eq('supabaseUserId', user.id)
    .single();

  if (hostUser) {
    await supabase
      .from('user')
      .update({ 'Usability Step': 2 })
      .eq('_id', hostUser._id);
  }

  console.log('[createTestProposals] Created', proposals.length, 'proposals');

  return {
    proposals,
    simulationId,
  };
}
