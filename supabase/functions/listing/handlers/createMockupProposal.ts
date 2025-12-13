/**
 * Create Mockup Proposal Handler
 * Split Lease - Supabase Edge Functions
 *
 * Creates a demonstration proposal when a host submits their first listing.
 * This helps new hosts understand how the proposal review process works.
 *
 * Features:
 * - Supports all rental types (Monthly, Weekly, Nightly)
 * - Uses mock guest user (splitleasefrederick@gmail.com)
 * - Calculates realistic pricing from listing configuration
 * - Sets move-in date 14-20 days in future (adjusted for check-in day)
 * - Status set to "Host Review" for immediate visibility
 *
 * NO FALLBACK PRINCIPLE: Non-blocking - failures don't affect listing submission
 */

import { SupabaseClient } from 'https://esm.sh/@supabase/supabase-js@2';
import { enqueueBubbleSync, triggerQueueProcessing } from '../../_shared/queueSync.ts';
import { parseJsonArray } from '../../_shared/jsonUtils.ts';

// ─────────────────────────────────────────────────────────────
// Types
// ─────────────────────────────────────────────────────────────

export interface CreateMockupProposalPayload {
  listingId: string;
  hostAccountId: string;
  hostUserId: string;
  hostEmail: string;
}

interface MockGuestData {
  _id: string;
  email: string;
  'About Me / Bio'?: string;
  'need for Space'?: string;
  'special needs'?: string;
  'About - reasons to host me'?: string;
  'Rental Application'?: string;
  'Proposals List'?: string[];
}

interface ListingData {
  _id: string;
  'rental type'?: string;
  'Days Available (List of Days)'?: number[];
  'Nights Available (List of Nights) '?: number[];
  '💰Weekly Host Rate'?: number;
  '💰Monthly Host Rate'?: number;
  '💰Nightly Host Rate for 2 nights'?: number;
  '💰Nightly Host Rate for 3 nights'?: number;
  '💰Nightly Host Rate for 4 nights'?: number;
  '💰Nightly Host Rate for 5 nights'?: number;
  '💰Nightly Host Rate for 7 nights'?: number;
  '💰Cleaning Cost / Maintenance Fee'?: number;
  '💰Damage Deposit'?: number;
  'Features - House Rules'?: string[];
  'Location - Address'?: Record<string, unknown>;
  'Location - slightly different address'?: string;
  'pricing_list'?: unknown;
}

// Mock guest email for demonstration proposals
const MOCK_GUEST_EMAIL = 'splitleasefrederick@gmail.com';

// ─────────────────────────────────────────────────────────────
// Helper Functions
// ─────────────────────────────────────────────────────────────

/**
 * Get nightly rate based on number of nights from listing pricing
 */
function getNightlyRateForNights(listing: ListingData, nightsPerWeek: number): number {
  const rateMap: Record<number, number | undefined> = {
    2: listing['💰Nightly Host Rate for 2 nights'],
    3: listing['💰Nightly Host Rate for 3 nights'],
    4: listing['💰Nightly Host Rate for 4 nights'],
    5: listing['💰Nightly Host Rate for 5 nights'],
    7: listing['💰Nightly Host Rate for 7 nights'],
  };

  // Try exact match first
  if (rateMap[nightsPerWeek] !== undefined && rateMap[nightsPerWeek]! > 0) {
    return rateMap[nightsPerWeek]!;
  }

  // For 6 nights, use 7-night rate
  if (nightsPerWeek === 6 && rateMap[7] && rateMap[7] > 0) {
    return rateMap[7]!;
  }

  // Fallback to weekly rate divided by nights, or 0
  if (listing['💰Weekly Host Rate'] && nightsPerWeek > 0) {
    return Math.round(listing['💰Weekly Host Rate'] / nightsPerWeek * 100) / 100;
  }

  return 0;
}

/**
 * Calculate move-in date adjusted for the check-in day
 * Move-in should be 14-20 days in future, landing on the correct check-in day
 */
function calculateMoveInDates(checkInDayJS: number): { moveInStart: Date; moveInEnd: Date } {
  const today = new Date();
  const moveInStart = new Date(today);

  // Start 14 days from now
  moveInStart.setDate(today.getDate() + 14);

  // Adjust to the correct check-in day (e.g., Monday for Monthly)
  const currentDayJS = moveInStart.getDay();
  const daysUntilCheckIn = (checkInDayJS - currentDayJS + 7) % 7;

  if (daysUntilCheckIn !== 0) {
    moveInStart.setDate(moveInStart.getDate() + daysUntilCheckIn);
  }

  // Move-in end is 6 days after start (gives a 7-day window)
  const moveInEnd = new Date(moveInStart);
  moveInEnd.setDate(moveInStart.getDate() + 6);

  return { moveInStart, moveInEnd };
}

/**
 * Calculate move-out date based on move-in and duration
 */
function calculateMoveOutDate(
  moveInStart: Date,
  reservationSpanWeeks: number,
  nightsPerWeek: number
): Date {
  const daysToAdd = (reservationSpanWeeks - 1) * 7 + nightsPerWeek;
  const moveOut = new Date(moveInStart);
  moveOut.setDate(moveOut.getDate() + daysToAdd);
  return moveOut;
}

/**
 * Calculate complementary nights (nights available but not selected)
 */
function calculateComplementaryNights(
  availableNights: number[],
  selectedNights: number[]
): number[] {
  if (!availableNights || !Array.isArray(availableNights)) return [];
  if (!selectedNights || !Array.isArray(selectedNights)) return availableNights;
  return availableNights.filter((night) => !selectedNights.includes(night));
}

/**
 * Get day/night configuration based on rental type
 * All values in Bubble format (1-7, Sun=1)
 */
function getDayNightConfig(rentalType: string, listing: ListingData): {
  daysSelected: number[];
  nightsSelected: number[];
  checkIn: number;
  checkOut: number;
  checkInDayJS: number;
  nightsPerWeek: number;
  reservationSpanWeeks: number;
} {
  const rentalTypeLower = (rentalType || 'nightly').toLowerCase();

  // Parse available nights from listing
  const availableNights = parseJsonArray<number>(
    listing['Nights Available (List of Nights) '],
    'Nights Available'
  );
  const availableDays = parseJsonArray<number>(
    listing['Days Available (List of Days)'],
    'Days Available'
  );

  switch (rentalTypeLower) {
    case 'monthly':
      // Monthly: Mon-Fri days, Mon-Thu nights, Check-in Mon, Check-out Fri
      // Bubble format: Sun=1, Mon=2, Tue=3, Wed=4, Thu=5, Fri=6, Sat=7
      return {
        daysSelected: [2, 3, 4, 5, 6], // Mon-Fri
        nightsSelected: [2, 3, 4, 5],  // Mon-Thu nights
        checkIn: 2,                     // Monday
        checkOut: 6,                    // Friday
        checkInDayJS: 1,               // Monday in JS (0-6)
        nightsPerWeek: 4,
        reservationSpanWeeks: 13,      // ~3 months
      };

    case 'weekly':
      // Weekly: Mon-Fri days, Mon-Fri nights, Check-in Mon, Check-out Sat
      return {
        daysSelected: [2, 3, 4, 5, 6], // Mon-Fri
        nightsSelected: [2, 3, 4, 5, 6], // Mon-Fri nights
        checkIn: 2,                      // Monday
        checkOut: 7,                     // Saturday (check out morning)
        checkInDayJS: 1,                // Monday in JS
        nightsPerWeek: 5,
        reservationSpanWeeks: 4,        // 1 month
      };

    case 'nightly':
    default:
      // Check if >5 nights available
      if (availableNights.length > 5) {
        // Full availability
        return {
          daysSelected: [1, 2, 3, 4, 5, 6, 7], // All days
          nightsSelected: [1, 2, 3, 4, 5, 6, 7], // All nights
          checkIn: 1,                            // Sunday
          checkOut: 1,                           // Sunday (next week)
          checkInDayJS: 0,                      // Sunday in JS
          nightsPerWeek: 7,
          reservationSpanWeeks: 4,
        };
      } else {
        // Use listing's actual availability
        const nightsCount = availableNights.length || 4; // Default to 4 if empty
        const sortedDays = availableDays.length > 0
          ? [...availableDays].sort((a, b) => a - b)
          : [2, 3, 4, 5, 6]; // Default Mon-Fri
        const sortedNights = availableNights.length > 0
          ? [...availableNights].sort((a, b) => a - b)
          : [2, 3, 4, 5]; // Default Mon-Thu

        const checkInDay = sortedDays[0] || 2;
        let checkOutDay = (sortedDays[sortedDays.length - 1] || 6) + 1;
        if (checkOutDay > 7) checkOutDay = 1;

        // Convert first day to JS format for date calculation
        // Bubble: Sun=1 -> JS: Sun=0, so subtract 1
        const checkInDayJS = (checkInDay - 1);

        return {
          daysSelected: sortedDays,
          nightsSelected: sortedNights,
          checkIn: checkInDay,
          checkOut: checkOutDay,
          checkInDayJS: checkInDayJS,
          nightsPerWeek: nightsCount,
          reservationSpanWeeks: 4,
        };
      }
  }
}

/**
 * Calculate pricing based on rental type and listing configuration
 */
function calculatePricing(
  rentalType: string,
  listing: ListingData,
  nightsPerWeek: number,
  reservationSpanWeeks: number
): {
  nightlyPrice: number;
  fourWeekRent: number;
  estimatedBookingTotal: number;
  hostCompensation: number;
} {
  const rentalTypeLower = (rentalType || 'nightly').toLowerCase();

  let nightlyPrice = 0;
  let fourWeekRent = 0;
  let estimatedBookingTotal = 0;
  let hostCompensation = 0;

  switch (rentalTypeLower) {
    case 'monthly':
      // Monthly uses 4-nights rate (weekday nights)
      nightlyPrice = listing['💰Nightly Host Rate for 4 nights'] || 0;
      fourWeekRent = nightlyPrice * nightsPerWeek * 4;
      estimatedBookingTotal = nightlyPrice * nightsPerWeek * reservationSpanWeeks;
      hostCompensation = listing['💰Monthly Host Rate'] || estimatedBookingTotal;
      break;

    case 'weekly':
      // Weekly uses 5-nights rate
      nightlyPrice = listing['💰Nightly Host Rate for 5 nights'] || 0;
      fourWeekRent = nightlyPrice * nightsPerWeek * 4;
      estimatedBookingTotal = nightlyPrice * nightsPerWeek * reservationSpanWeeks;
      hostCompensation = (listing['💰Weekly Host Rate'] || 0) * reservationSpanWeeks;
      break;

    case 'nightly':
    default:
      // Nightly uses rate based on actual nights per week
      nightlyPrice = getNightlyRateForNights(listing, nightsPerWeek);
      fourWeekRent = nightlyPrice * nightsPerWeek * 4;
      estimatedBookingTotal = fourWeekRent;
      hostCompensation = estimatedBookingTotal;
      break;
  }

  return {
    nightlyPrice: Math.round(nightlyPrice * 100) / 100,
    fourWeekRent: Math.round(fourWeekRent * 100) / 100,
    estimatedBookingTotal: Math.round(estimatedBookingTotal * 100) / 100,
    hostCompensation: Math.round(hostCompensation * 100) / 100,
  };
}

// ─────────────────────────────────────────────────────────────
// Main Handler
// ─────────────────────────────────────────────────────────────

/**
 * Create a mockup proposal for a first-time host
 *
 * This is a NON-BLOCKING operation - failures are logged but don't
 * affect the main listing submission flow.
 */
export async function handleCreateMockupProposal(
  supabase: SupabaseClient,
  payload: CreateMockupProposalPayload
): Promise<void> {
  const { listingId, hostAccountId, hostUserId, hostEmail } = payload;

  console.log('[createMockupProposal] ========== START ==========');
  console.log('[createMockupProposal] Listing:', listingId);
  console.log('[createMockupProposal] Host Account:', hostAccountId);
  console.log('[createMockupProposal] Host User:', hostUserId);

  try {
    // ─────────────────────────────────────────────────────────
    // Step 1: Fetch mock guest user
    // ─────────────────────────────────────────────────────────
    console.log('[createMockupProposal] Step 1: Fetching mock guest...');

    const { data: mockGuest, error: guestError } = await supabase
      .from('user')
      .select(`
        _id,
        email,
        "About Me / Bio",
        "need for Space",
        "special needs",
        "About - reasons to host me",
        "Rental Application",
        "Proposals List"
      `)
      .eq('email', MOCK_GUEST_EMAIL)
      .single();

    if (guestError || !mockGuest) {
      console.warn('[createMockupProposal] Mock guest not found, skipping mockup creation');
      console.warn('[createMockupProposal] Error:', guestError?.message);
      return;
    }

    const guestData = mockGuest as MockGuestData;
    console.log('[createMockupProposal] Mock guest found:', guestData._id);

    // ─────────────────────────────────────────────────────────
    // Step 2: Fetch listing data
    // ─────────────────────────────────────────────────────────
    console.log('[createMockupProposal] Step 2: Fetching listing data...');

    const { data: listing, error: listingError } = await supabase
      .from('listing')
      .select(`
        _id,
        "rental type",
        "Days Available (List of Days)",
        "Nights Available (List of Nights) ",
        "💰Weekly Host Rate",
        "💰Monthly Host Rate",
        "💰Nightly Host Rate for 2 nights",
        "💰Nightly Host Rate for 3 nights",
        "💰Nightly Host Rate for 4 nights",
        "💰Nightly Host Rate for 5 nights",
        "💰Nightly Host Rate for 7 nights",
        "💰Cleaning Cost / Maintenance Fee",
        "💰Damage Deposit",
        "Features - House Rules",
        "Location - Address",
        "Location - slightly different address",
        "pricing_list"
      `)
      .eq('_id', listingId)
      .single();

    if (listingError || !listing) {
      console.error('[createMockupProposal] Listing not found:', listingError?.message);
      return;
    }

    const listingData = listing as ListingData;
    const rentalType = listingData['rental type'] || 'nightly';
    console.log('[createMockupProposal] Rental type:', rentalType);

    // ─────────────────────────────────────────────────────────
    // Step 3: Calculate day/night configuration
    // ─────────────────────────────────────────────────────────
    console.log('[createMockupProposal] Step 3: Calculating day/night config...');

    const dayNightConfig = getDayNightConfig(rentalType, listingData);
    const {
      daysSelected,
      nightsSelected,
      checkIn,
      checkOut,
      checkInDayJS,
      nightsPerWeek,
      reservationSpanWeeks,
    } = dayNightConfig;

    console.log('[createMockupProposal] Days selected:', daysSelected);
    console.log('[createMockupProposal] Nights selected:', nightsSelected);
    console.log('[createMockupProposal] Reservation weeks:', reservationSpanWeeks);

    // ─────────────────────────────────────────────────────────
    // Step 4: Calculate dates
    // ─────────────────────────────────────────────────────────
    console.log('[createMockupProposal] Step 4: Calculating dates...');

    const { moveInStart, moveInEnd } = calculateMoveInDates(checkInDayJS);
    const moveOutDate = calculateMoveOutDate(moveInStart, reservationSpanWeeks, nightsPerWeek);

    console.log('[createMockupProposal] Move-in start:', moveInStart.toISOString());
    console.log('[createMockupProposal] Move-in end:', moveInEnd.toISOString());
    console.log('[createMockupProposal] Move-out:', moveOutDate.toISOString());

    // ─────────────────────────────────────────────────────────
    // Step 5: Calculate pricing
    // ─────────────────────────────────────────────────────────
    console.log('[createMockupProposal] Step 5: Calculating pricing...');

    const pricing = calculatePricing(
      rentalType,
      listingData,
      nightsPerWeek,
      reservationSpanWeeks
    );

    console.log('[createMockupProposal] Nightly price:', pricing.nightlyPrice);
    console.log('[createMockupProposal] Four week rent:', pricing.fourWeekRent);
    console.log('[createMockupProposal] Total:', pricing.estimatedBookingTotal);

    // ─────────────────────────────────────────────────────────
    // Step 6: Generate proposal ID
    // ─────────────────────────────────────────────────────────
    console.log('[createMockupProposal] Step 6: Generating proposal ID...');

    const { data: proposalId, error: idError } = await supabase.rpc('generate_bubble_id');
    if (idError || !proposalId) {
      console.error('[createMockupProposal] ID generation failed:', idError);
      return;
    }
    console.log('[createMockupProposal] Generated proposal ID:', proposalId);

    // ─────────────────────────────────────────────────────────
    // Step 7: Build proposal data
    // ─────────────────────────────────────────────────────────
    console.log('[createMockupProposal] Step 7: Building proposal data...');

    const now = new Date().toISOString();
    const historyEntry = `Mockup proposal created on ${new Date().toLocaleString("en-US", {
      month: "2-digit",
      day: "2-digit",
      year: "2-digit",
      hour: "numeric",
      minute: "2-digit",
      hour12: true,
    })} - This is a demonstration proposal to help you understand the proposal review process.`;

    // Calculate complementary nights
    const availableNights = parseJsonArray<number>(
      listingData['Nights Available (List of Nights) '],
      'Nights Available'
    );
    const complementaryNights = calculateComplementaryNights(availableNights, nightsSelected);

    // Get available days for proposal
    const availableDays = parseJsonArray<number>(
      listingData['Days Available (List of Days)'],
      'Days Available'
    );

    const proposalData: Record<string, unknown> = {
      _id: proposalId,

      // Core relationships
      Listing: listingId,
      Guest: guestData._id,
      'Host - Account': hostAccountId,
      'Created By': guestData._id,

      // Guest info (from mock guest)
      'Guest email': guestData.email,
      'Guest flexibility': 'Flexible',
      'preferred gender': 'any',
      'need for space': guestData['need for Space'] || 'Looking for a comfortable place to stay',
      about_yourself: guestData['About Me / Bio'] || 'Split Lease Demo Guest',
      special_needs: guestData['special needs'] || null,
      Comment: guestData['About - reasons to host me'] ||
        'This is a demonstration proposal to show you how the proposal review process works. ' +
        'When real guests apply, their information will appear here. You can approve, negotiate, or decline proposals.',

      // Dates
      'Move in range start': moveInStart.toISOString(),
      'Move in range end': moveInEnd.toISOString(),
      'Move-out': moveOutDate.toISOString(),
      'move-in range (text)': `${moveInStart.toLocaleDateString('en-US')} - ${moveInEnd.toLocaleDateString('en-US')}`,

      // Duration
      'Reservation Span': reservationSpanWeeks <= 4 ? '1_month' :
                          reservationSpanWeeks <= 8 ? '2_months' : '3_months',
      'Reservation Span (Weeks)': reservationSpanWeeks,
      'actual weeks during reservation span': reservationSpanWeeks,
      'duration in months': Math.floor(reservationSpanWeeks / 4),

      // Day/Night selection (Bubble format 1-7)
      'Days Selected': daysSelected,
      'Nights Selected (Nights list)': nightsSelected,
      'nights per week (num)': nightsPerWeek,
      'check in day': checkIn,
      'check out day': checkOut,
      'Days Available': availableDays.length > 0 ? availableDays : daysSelected,
      'Complementary Nights': complementaryNights,

      // Pricing
      'proposal nightly price': pricing.nightlyPrice,
      '4 week rent': pricing.fourWeekRent,
      'Total Price for Reservation (guest)': pricing.estimatedBookingTotal,
      'Total Compensation (proposal - host)': pricing.hostCompensation,
      'host compensation': pricing.hostCompensation,
      '4 week compensation': pricing.fourWeekRent,
      'cleaning fee': listingData['💰Cleaning Cost / Maintenance Fee'] || 0,
      'damage deposit': listingData['💰Damage Deposit'] || 0,
      'nightly price for map (text)': `$${Math.round(pricing.nightlyPrice)}`,

      // From listing
      'rental type': rentalType,
      'House Rules': listingData['Features - House Rules'],
      'Location - Address': listingData['Location - Address'],
      'Location - Address slightly different': listingData['Location - slightly different address'],

      // Status & metadata
      Status: 'Host Review',
      'Order Ranking': 1,
      History: [historyEntry],
      'Is Finalized': false,
      Deleted: false,

      // Related records
      'rental application': guestData['Rental Application'],
      'rental app requested': false,
      'host email': hostEmail,

      // Timestamps
      'Created Date': now,
      'Modified Date': now,
    };

    // ─────────────────────────────────────────────────────────
    // Step 8: Insert proposal into Supabase
    // ─────────────────────────────────────────────────────────
    console.log('[createMockupProposal] Step 8: Inserting proposal...');

    const { error: insertError } = await supabase
      .from('proposal')
      .insert(proposalData);

    if (insertError) {
      console.error('[createMockupProposal] Insert failed:', insertError);
      return;
    }
    console.log('[createMockupProposal] Proposal inserted successfully');

    // ─────────────────────────────────────────────────────────
    // Step 9: Update host user's Proposals List
    // ─────────────────────────────────────────────────────────
    console.log('[createMockupProposal] Step 9: Updating host Proposals List...');

    const { data: hostUser, error: hostUserError } = await supabase
      .from('user')
      .select('_id, "Proposals List"')
      .eq('_id', hostUserId)
      .single();

    if (hostUserError || !hostUser) {
      console.warn('[createMockupProposal] Host user not found for Proposals List update');
    } else {
      const currentProposals = parseJsonArray<string>(hostUser['Proposals List'], 'Host Proposals List');
      const updatedProposals = [...currentProposals, proposalId];

      const { error: updateError } = await supabase
        .from('user')
        .update({
          'Proposals List': updatedProposals,
          'Modified Date': now,
        })
        .eq('_id', hostUserId);

      if (updateError) {
        console.warn('[createMockupProposal] Failed to update host Proposals List:', updateError);
      } else {
        console.log('[createMockupProposal] Host Proposals List updated');
      }
    }

    // ─────────────────────────────────────────────────────────
    // Step 10: Queue Bubble sync
    // ─────────────────────────────────────────────────────────
    console.log('[createMockupProposal] Step 10: Queueing Bubble sync...');

    try {
      await enqueueBubbleSync(supabase, {
        correlationId: `mockup_proposal:${proposalId}`,
        items: [
          {
            sequence: 1,
            table: 'proposal',
            recordId: proposalId,
            operation: 'INSERT',
            payload: proposalData,
          },
        ],
      });

      console.log('[createMockupProposal] Bubble sync queued for', proposalId);
      triggerQueueProcessing();
    } catch (syncError) {
      // Non-blocking - log but don't fail
      console.warn('[createMockupProposal] Queue sync failed (non-blocking):', syncError);
    }

    console.log('[createMockupProposal] ========== SUCCESS ==========');
    console.log('[createMockupProposal] Mockup proposal created:', proposalId);

  } catch (error) {
    // Non-blocking - log the error but don't propagate
    console.error('[createMockupProposal] ========== ERROR ==========');
    console.error('[createMockupProposal] Failed to create mockup proposal:', error);
    // Do not throw - this is a non-blocking operation
  }
}
