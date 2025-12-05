/**
 * Proposal Handler
 * Creates a new proposal in Supabase
 *
 * Adapted from Bubble workflow: CORE-create_proposal-NEW
 * Focuses on proposal creation and user updates (excludes thread creation)
 */

import { createClient, SupabaseClient } from 'https://esm.sh/@supabase/supabase-js@2';
import { validateRequiredFields } from '../../_shared/validation.ts';
import { v4 as uuidv4 } from 'https://esm.sh/uuid@9';

// ============================================================================
// TYPES
// ============================================================================

interface CreateProposalPayload {
  // Required fields
  guestId: string;              // Bubble user _id
  listingId: string;            // Bubble listing _id
  moveInStartRange: string;     // ISO date string
  moveInEndRange: string;       // ISO date string
  daysSelected: string[];       // ["Monday", "Tuesday", ...]
  nightsSelected: string[];     // ["Monday", "Tuesday", ...] (nights guest stays)
  reservationSpan: string;      // "13 weeks (3 months)", "20 weeks", etc.
  reservationSpanWeeks: number; // Number of weeks
  checkInDay: string;           // "Monday", "Sunday", etc.
  checkOutDay: string;          // "Thursday", "Friday", etc.
  proposalPrice: number;        // Nightly price proposed
  fourWeekRent: number;         // 4-week rental price
  hostCompensation: number;     // Per-period host compensation
  needForSpace: string;         // Guest's reason for needing space
  aboutMe: string;              // Guest's bio/about text
  estimatedBookingTotal: number; // Total estimated cost

  // Optional fields
  guestFlexibility?: string;
  preferredGender?: string;
  specialNeeds?: string;
  fourWeekCompensation?: number;
  moveInRangeText?: string;
  flexibleMoveIn?: boolean;
  status?: string;              // Override status if provided
}

interface ProposalResult {
  proposalId: string;
  status: string;
  orderRanking: number;
}

// All available nights for complementary calculation
const ALL_NIGHTS = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];

// ============================================================================
// HELPER FUNCTIONS
// ============================================================================

/**
 * Generate a Bubble-style unique ID
 * Format: timestamp + random number
 */
function generateBubbleId(): string {
  const timestamp = Date.now();
  const random = Math.floor(Math.random() * 1000000000000000);
  return `${timestamp}x${random}`;
}

/**
 * Calculate complementary nights (nights NOT selected by guest)
 */
function calculateComplementaryNights(nightsSelected: string[]): string[] {
  return ALL_NIGHTS.filter(night => !nightsSelected.includes(night));
}

/**
 * Calculate complementary days (days NOT selected, plus check-in/check-out)
 */
function calculateComplementaryDays(
  daysAvailable: string[],
  daysSelected: string[],
  checkInDay: string,
  checkOutDay: string
): string[] {
  // Remove selected days from available days
  const complementary = daysAvailable.filter(day => !daysSelected.includes(day));

  // Add back check-in and check-out days (they're partially available)
  if (!complementary.includes(checkInDay)) {
    complementary.push(checkInDay);
  }
  if (!complementary.includes(checkOutDay)) {
    complementary.push(checkOutDay);
  }

  return complementary;
}

/**
 * Calculate move-out date based on move-in date and reservation span
 * Formula: move_in_start + (span_weeks - 1) * 7 + nights_count
 */
function calculateMoveOutDate(
  moveInStart: string,
  reservationSpanWeeks: number,
  nightsCount: number
): string {
  const moveIn = new Date(moveInStart);
  const daysToAdd = (reservationSpanWeeks - 1) * 7 + nightsCount;
  moveIn.setDate(moveIn.getDate() + daysToAdd);
  return moveIn.toISOString();
}

/**
 * Calculate actual weeks during reservation span
 * This accounts for partial weeks
 */
function calculateActualWeeks(reservationSpanWeeks: number): number {
  return reservationSpanWeeks;
}

/**
 * Format price as currency string for display
 */
function formatPriceForMap(price: number): string {
  return `$${price.toLocaleString('en-US')}`;
}

/**
 * Format date for history entry
 */
function formatHistoryDate(date: Date): string {
  const options: Intl.DateTimeFormatOptions = {
    month: '2-digit',
    day: '2-digit',
    year: '2-digit',
    hour: 'numeric',
    minute: '2-digit',
    hour12: true
  };
  return date.toLocaleString('en-US', options).replace(',', ' @');
}

// ============================================================================
// MAIN HANDLER
// ============================================================================

export async function handleCreateProposal(
  payload: CreateProposalPayload
): Promise<ProposalResult> {
  console.log('[Proposal Handler] ========== CREATE PROPOSAL ==========');
  console.log('[Proposal Handler] Guest ID:', payload.guestId);
  console.log('[Proposal Handler] Listing ID:', payload.listingId);

  // Validate required fields
  validateRequiredFields(payload, [
    'guestId',
    'listingId',
    'moveInStartRange',
    'moveInEndRange',
    'daysSelected',
    'nightsSelected',
    'reservationSpan',
    'reservationSpanWeeks',
    'checkInDay',
    'checkOutDay',
    'proposalPrice',
    'fourWeekRent',
    'hostCompensation',
    'needForSpace',
    'aboutMe',
    'estimatedBookingTotal'
  ]);

  // Initialize Supabase with service role key (bypasses RLS)
  const supabaseUrl = Deno.env.get('SUPABASE_URL');
  const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY');

  if (!supabaseUrl || !supabaseServiceKey) {
    throw new Error('Supabase configuration missing');
  }

  const supabase = createClient(supabaseUrl, supabaseServiceKey, {
    auth: {
      autoRefreshToken: false,
      persistSession: false,
    },
  });

  try {
    // ========================================================================
    // STEP 1: Fetch required data (guest, listing, host)
    // ========================================================================
    console.log('[Proposal Handler] Step 1: Fetching guest, listing, and host data...');

    // Fetch guest data
    const { data: guestData, error: guestError } = await supabase
      .from('user')
      .select(`
        "_id",
        "email",
        "Proposals List",
        "Rental Application",
        "About Me / Bio",
        "Favorited Listings",
        "flexibility (last known)",
        "profile completeness",
        "Tasks Completed",
        "need for Space",
        "special needs"
      `)
      .eq('_id', payload.guestId)
      .single();

    if (guestError || !guestData) {
      console.error('[Proposal Handler] Guest fetch error:', guestError);
      throw new Error(`Guest not found: ${payload.guestId}`);
    }

    console.log('[Proposal Handler] Guest email:', guestData.email);

    // Fetch listing data
    const { data: listingData, error: listingError } = await supabase
      .from('listing')
      .select(`
        "_id",
        "Host / Landlord",
        "Host email",
        "Days Available (List of Days)",
        "Nights Available (List of Nights) ",
        "Weeks offered",
        "rental type",
        "💰Cleaning Cost / Maintenance Fee",
        "💰Damage Deposit",
        "Features - House Rules",
        "Location - Address",
        "Location - slightly different address"
      `)
      .eq('_id', payload.listingId)
      .single();

    if (listingError || !listingData) {
      console.error('[Proposal Handler] Listing fetch error:', listingError);
      throw new Error(`Listing not found: ${payload.listingId}`);
    }

    console.log('[Proposal Handler] Listing host account:', listingData['Host / Landlord']);

    // Fetch host user data via account_host
    const hostAccountId = listingData['Host / Landlord'];
    let hostUserId: string | null = null;
    let hostEmail: string | null = listingData['Host email'];

    if (hostAccountId) {
      const { data: hostAccountData, error: hostAccountError } = await supabase
        .from('account_host')
        .select('"User"')
        .eq('_id', hostAccountId)
        .single();

      if (!hostAccountError && hostAccountData) {
        hostUserId = hostAccountData['User'];
        console.log('[Proposal Handler] Host user ID:', hostUserId);
      }
    }

    // ========================================================================
    // STEP 2: Calculate proposal order ranking
    // ========================================================================
    console.log('[Proposal Handler] Step 2: Calculating order ranking...');

    const existingProposals: string[] = guestData['Proposals List'] || [];
    const orderRanking = existingProposals.length + 1;
    console.log('[Proposal Handler] Order ranking:', orderRanking);

    // ========================================================================
    // STEP 3: Check rental application status for initial status
    // ========================================================================
    console.log('[Proposal Handler] Step 3: Determining initial status...');

    let rentalAppSubmitted = false;
    const rentalAppId = guestData['Rental Application'];

    if (rentalAppId) {
      // Check if rental application is submitted
      const { data: rentalAppData } = await supabase
        .from('rentalapplication')
        .select('"submitted"')
        .eq('_id', rentalAppId)
        .single();

      rentalAppSubmitted = rentalAppData?.submitted === true;
    }

    // Determine initial status
    let proposalStatus: string;
    if (payload.status) {
      // Use provided status override
      proposalStatus = payload.status;
    } else if (rentalAppSubmitted) {
      // Guest has submitted rental app - go to host review
      proposalStatus = 'Host Review';
    } else {
      // Guest needs to submit rental app first
      proposalStatus = 'Proposal Submitted by guest - Awaiting Rental Application';
    }

    console.log('[Proposal Handler] Initial status:', proposalStatus);

    // ========================================================================
    // STEP 4: Calculate derived fields
    // ========================================================================
    console.log('[Proposal Handler] Step 4: Calculating derived fields...');

    const daysAvailable = listingData['Days Available (List of Days)'] || [];
    const nightsAvailable = listingData['Nights Available (List of Nights) '] || [];

    // Complementary nights (for roommate matching)
    const complementaryNights = calculateComplementaryNights(payload.nightsSelected);

    // Complementary days
    const complementaryDays = calculateComplementaryDays(
      daysAvailable,
      payload.daysSelected,
      payload.checkInDay,
      payload.checkOutDay
    );

    // Move-out date
    const moveOutDate = calculateMoveOutDate(
      payload.moveInStartRange,
      payload.reservationSpanWeeks,
      payload.nightsSelected.length
    );

    // Actual weeks
    const actualWeeks = calculateActualWeeks(payload.reservationSpanWeeks);

    // History entry
    const historyEntry = `Proposal created on ${formatHistoryDate(new Date())}`;

    // Generate proposal ID
    const proposalId = generateBubbleId();

    console.log('[Proposal Handler] Proposal ID:', proposalId);
    console.log('[Proposal Handler] Move-out date:', moveOutDate);
    console.log('[Proposal Handler] Complementary nights:', complementaryNights);

    // ========================================================================
    // STEP 5: Create the proposal record
    // ========================================================================
    console.log('[Proposal Handler] Step 5: Creating proposal record...');

    const now = new Date().toISOString();

    const proposalRecord = {
      '_id': proposalId,
      'Comment': payload.aboutMe, // Using about me as initial comment
      'Listing': payload.listingId,
      'Guest': payload.guestId,
      'proposal nightly price': payload.proposalPrice,
      'Move in range start': payload.moveInStartRange,
      'Move in range end': payload.moveInEndRange,
      'Days Selected': JSON.stringify(payload.daysSelected),
      'Reservation Span (Weeks)': payload.reservationSpanWeeks,
      'Reservation Span': payload.reservationSpan,
      'Total Price for Reservation (guest)': payload.estimatedBookingTotal,
      'Order Ranking': orderRanking,
      'Guest email': guestData.email,
      'Guest flexibility': payload.guestFlexibility || null,
      'History': JSON.stringify([historyEntry]),
      'preferred gender': payload.preferredGender || null,
      'need for space': payload.needForSpace,
      'cleaning fee': listingData['💰Cleaning Cost / Maintenance Fee'] || 0,
      'damage deposit': listingData['💰Damage Deposit'] || 0,
      'week selection': listingData['Weeks offered'] || null,
      'Host - Account': hostAccountId,
      'nights per week (num)': payload.nightsSelected.length,
      'Days Available': JSON.stringify(daysAvailable),
      'House Rules': listingData['Features - House Rules'] || null,
      '4 week rent': payload.fourWeekRent,
      'host email': hostEmail,
      'Nights Selected (Nights list)': JSON.stringify(payload.nightsSelected),
      'actual weeks during reservation span': actualWeeks,
      'check in day': payload.checkInDay,
      'check out day': payload.checkOutDay,
      'Move-out': moveOutDate,
      '4 week compensation': payload.fourWeekCompensation || null,
      'Location - Address': listingData['Location - Address'],
      'Location - Address slightly different': listingData['Location - slightly different address'],
      'nightly price for map (text)': formatPriceForMap(payload.proposalPrice),
      'move-in range (text)': payload.moveInRangeText || null,
      'flexible move in?': payload.flexibleMoveIn || false,
      'Status': proposalStatus,
      'Complementary Nights': JSON.stringify(complementaryNights),
      'Complementary Days': JSON.stringify(complementaryDays),
      'host compensation': payload.hostCompensation,
      'rental type': listingData['rental type'],
      'about_yourself': payload.aboutMe,
      'special_needs': payload.specialNeeds || null,
      'Is Finalized': false,
      'rental app requested': false,
      'Created Date': now,
      'Modified Date': now,
      'created_at': now,
      'updated_at': now,
      'pending': false,
    };

    const { error: insertError } = await supabase
      .from('proposal')
      .insert(proposalRecord);

    if (insertError) {
      console.error('[Proposal Handler] Insert error:', insertError);
      throw new Error(`Failed to create proposal: ${insertError.message}`);
    }

    console.log('[Proposal Handler] Proposal created successfully');

    // ========================================================================
    // STEP 6: Update guest user record
    // ========================================================================
    console.log('[Proposal Handler] Step 6: Updating guest user record...');

    // Add proposal to guest's proposals list
    const updatedProposalsList = [...existingProposals, proposalId];

    // Add listing to favorites if not already there
    const currentFavorites: string[] = guestData['Favorited Listings'] || [];
    const updatedFavorites = currentFavorites.includes(payload.listingId)
      ? currentFavorites
      : [...currentFavorites, payload.listingId];

    // Prepare user updates
    const userUpdates: Record<string, unknown> = {
      'Proposals List': updatedProposalsList,
      'Favorited Listings': updatedFavorites,
      'flexibility (last known)': payload.guestFlexibility || guestData['flexibility (last known)'],
      'Recent Days Selected': payload.daysSelected,
      'Modified Date': now,
      'updated_at': now,
    };

    // Populate profile fields if empty (auto-fill from proposal)
    const tasksCompleted: string[] = guestData['Tasks Completed'] || [];
    let profileCompleteness = guestData['profile completeness'] || 0;

    // About Me / Bio
    if (!guestData['About Me / Bio'] && !tasksCompleted.includes('bio')) {
      userUpdates['About Me / Bio'] = payload.aboutMe;
      profileCompleteness += 15;
      tasksCompleted.push('bio');
    }

    // Need for Space
    if (!guestData['need for Space'] && !tasksCompleted.includes('need_for_space')) {
      userUpdates['need for Space'] = payload.needForSpace;
      profileCompleteness += 10;
      tasksCompleted.push('need_for_space');
    }

    // Special needs
    if (payload.specialNeeds && !guestData['special needs'] && !tasksCompleted.includes('special_needs')) {
      userUpdates['special needs'] = payload.specialNeeds;
      profileCompleteness += 5;
      tasksCompleted.push('special_needs');
    }

    userUpdates['profile completeness'] = profileCompleteness;
    userUpdates['Tasks Completed'] = tasksCompleted;

    const { error: guestUpdateError } = await supabase
      .from('user')
      .update(userUpdates)
      .eq('_id', payload.guestId);

    if (guestUpdateError) {
      console.error('[Proposal Handler] Guest update error:', guestUpdateError);
      // Don't throw - proposal was created, this is a secondary update
      console.warn('[Proposal Handler] Warning: Failed to update guest user record');
    } else {
      console.log('[Proposal Handler] Guest user record updated');
    }

    // ========================================================================
    // STEP 7: Update host user record (add proposal to their list)
    // ========================================================================
    if (hostUserId) {
      console.log('[Proposal Handler] Step 7: Updating host user record...');

      // Fetch host's current proposals list
      const { data: hostUserData, error: hostFetchError } = await supabase
        .from('user')
        .select('"Proposals List"')
        .eq('_id', hostUserId)
        .single();

      if (!hostFetchError && hostUserData) {
        const hostProposals: string[] = hostUserData['Proposals List'] || [];
        const updatedHostProposals = [...hostProposals, proposalId];

        const { error: hostUpdateError } = await supabase
          .from('user')
          .update({
            'Proposals List': updatedHostProposals,
            'Modified Date': now,
            'updated_at': now,
          })
          .eq('_id', hostUserId);

        if (hostUpdateError) {
          console.error('[Proposal Handler] Host update error:', hostUpdateError);
          console.warn('[Proposal Handler] Warning: Failed to update host user record');
        } else {
          console.log('[Proposal Handler] Host user record updated');
        }
      }
    } else {
      console.log('[Proposal Handler] Step 7: Skipping host update (no host user ID)');
    }

    // ========================================================================
    // STEP 8: Calculate total compensation based on rental type
    // ========================================================================
    console.log('[Proposal Handler] Step 8: Calculating total compensation...');

    const rentalType = listingData['rental type'];
    let totalCompensation = 0;

    if (rentalType === 'Nightly') {
      // Nightly: compensation * nights * weeks
      totalCompensation = payload.hostCompensation * payload.nightsSelected.length * actualWeeks;
    } else if (rentalType === 'Weekly') {
      // Weekly: compensation * weeks (ceiling)
      totalCompensation = payload.hostCompensation * Math.ceil(actualWeeks);
    } else if (rentalType === 'Monthly') {
      // Monthly: compensation * months (approximate)
      const months = actualWeeks / 4.33; // Average weeks per month
      totalCompensation = payload.hostCompensation * months;
    } else {
      // Default to nightly calculation
      totalCompensation = payload.hostCompensation * payload.nightsSelected.length * actualWeeks;
    }

    // Update proposal with total compensation
    const { error: compUpdateError } = await supabase
      .from('proposal')
      .update({
        'Total Compensation (proposal - host)': totalCompensation,
        'duration in months': actualWeeks / 4.33,
      })
      .eq('_id', proposalId);

    if (compUpdateError) {
      console.error('[Proposal Handler] Compensation update error:', compUpdateError);
      console.warn('[Proposal Handler] Warning: Failed to update compensation');
    } else {
      console.log('[Proposal Handler] Total compensation calculated:', totalCompensation);
    }

    // ========================================================================
    // SUCCESS
    // ========================================================================
    console.log('[Proposal Handler] ========== SUCCESS ==========');
    console.log('[Proposal Handler] Proposal ID:', proposalId);
    console.log('[Proposal Handler] Status:', proposalStatus);
    console.log('[Proposal Handler] Order Ranking:', orderRanking);

    return {
      proposalId,
      status: proposalStatus,
      orderRanking,
    };

  } catch (error) {
    console.error('[Proposal Handler] ========== ERROR ==========');
    console.error('[Proposal Handler] Failed to create proposal:', error);
    throw error;
  }
}
