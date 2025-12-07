/**
 * Proposal Handler
 * Creates a new proposal directly in Supabase (NO Bubble API calls)
 *
 * Flow:
 * 1. Generate Bubble-compatible ID via RPC
 * 2. Fetch all related data from Supabase (listing, guest, host)
 * 3. Calculate compensation, move-out date, status, etc.
 * 4. Insert proposal directly into Supabase
 * 5. Update guest user record (Proposals List, Favorites, profile enrichment)
 * 6. Update host user record (Proposals List)
 *
 * Mirrors Bubble workflow: CORE-create_proposal-NEW
 * Migration: 2025-12-06 - Bubble → Supabase native
 */

import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';
import { validateRequiredFields } from '../../_shared/validation.ts';
import { ValidationError } from '../../_shared/errors.ts';

// Import calculation utilities from proposal Edge Function
import {
  calculateCompensation,
  calculateMoveOutDate,
  calculateComplementaryNights,
  calculateComplementaryDays,
  calculateOrderRanking,
  formatPriceForDisplay,
} from '../../proposal/lib/calculations.ts';
import { determineInitialStatus, ProposalStatusName } from '../../proposal/lib/status.ts';
import { RentalType, ReservationSpan } from '../../proposal/lib/types.ts';

// ============================================================================
// TYPES
// ============================================================================

interface CreateProposalPayload {
  // Required fields
  guestId: string;              // Bubble user _id
  listingId: string;            // Bubble listing _id
  moveInStartRange: string;     // ISO date string
  moveInEndRange: string;       // ISO date string
  daysSelected: number[];       // Array of day numbers (Bubble format: 1-7)
  nightsSelected: number[];     // Array of night numbers (Bubble format: 1-7)
  reservationSpan: string;      // "13 weeks (3 months)", "20 weeks", etc.
  reservationSpanWeeks: number; // Number of weeks
  checkInDay: number;           // Day number (Bubble format: 1-7)
  checkOutDay: number;          // Day number (Bubble format: 1-7)
  proposalPrice: number;        // Nightly price proposed
  fourWeekRent: number;         // 4-week rental price
  hostCompensation: number;     // Per-period host compensation
  needForSpace: string;         // Guest's reason for needing space
  aboutMe: string;              // Guest's bio/about text
  estimatedBookingTotal: number; // Total estimated cost
  numberOfMatches?: number;     // Number of listing matches

  // Optional fields
  guestFlexibility?: string;
  preferredGender?: string;
  specialNeeds?: string;
  fourWeekCompensation?: number;
  moveInRangeText?: string;
  flexibleMoveIn?: boolean;
  status?: string;              // Override status if provided
  suggestedReason?: string;
  originProposal?: string;
}

interface ProposalResult {
  proposalId: string;
  status: string;
  success: boolean;
}

// Internal data types
interface ListingData {
  _id: string;
  'Host / Landlord': string;
  'rental type': string;
  'Features - House Rules': string[];
  '💰Cleaning Cost / Maintenance Fee': number;
  '💰Damage Deposit': number;
  'Weeks offered': string;
  'Days Available (List of Days)': number[];
  'Nights Available (List of Nights)': number[];
  'Location - Address': Record<string, unknown>;
  'Location - slightly different address': string;
  '💰Weekly Host Rate': number;
  '💰Nightly Host Rate for 2 nights': number;
  '💰Nightly Host Rate for 3 nights': number;
  '💰Nightly Host Rate for 4 nights': number;
  '💰Nightly Host Rate for 5 nights': number;
  '💰Nightly Host Rate for 7 nights': number;
  '💰Monthly Host Rate': number;
}

interface GuestData {
  _id: string;
  'email as text': string;
  'Rental Application': string | null;
  'Proposals List': string[];
  'Favorited Listings': string[];
  'About Me / Bio'?: string;
  'need for Space'?: string;
  'special needs'?: string;
  'Tasks Completed'?: string[];
}

interface HostAccountData {
  _id: string;
  User: string;
}

interface HostUserData {
  _id: string;
  'email as text': string;
  'Proposals List': string[];
}

interface RentalAppData {
  _id: string;
  submitted: boolean;
}

// ============================================================================
// MAIN HANDLER
// ============================================================================

export async function handleCreateProposal(
  payload: CreateProposalPayload
): Promise<ProposalResult> {
  console.log('[Proposal Handler] ========== CREATE PROPOSAL (Supabase Native) ==========');
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

  // Get environment variables (only Supabase needed now)
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
    // STEP 1: Generate Bubble-compatible ID via RPC
    // ========================================================================
    console.log('[Proposal Handler] Step 1: Generating proposal ID via RPC...');

    const { data: proposalId, error: idGenError } = await supabase
      .rpc('generate_bubble_id');

    if (idGenError || !proposalId) {
      console.error('[Proposal Handler] Failed to generate proposal ID:', idGenError);
      throw new Error('Failed to generate proposal ID');
    }

    console.log('[Proposal Handler] Generated proposal ID:', proposalId);

    // ========================================================================
    // STEP 2: Fetch all related data from Supabase
    // ========================================================================
    console.log('[Proposal Handler] Step 2: Fetching related data from Supabase...');

    // 2.1: Fetch Listing
    const { data: listing, error: listingError } = await supabase
      .from('listing')
      .select(`
        _id,
        "Host / Landlord",
        "rental type",
        "Features - House Rules",
        "💰Cleaning Cost / Maintenance Fee",
        "💰Damage Deposit",
        "Weeks offered",
        "Days Available (List of Days)",
        "Nights Available (List of Nights)",
        "Location - Address",
        "Location - slightly different address",
        "💰Weekly Host Rate",
        "💰Nightly Host Rate for 2 nights",
        "💰Nightly Host Rate for 3 nights",
        "💰Nightly Host Rate for 4 nights",
        "💰Nightly Host Rate for 5 nights",
        "💰Nightly Host Rate for 7 nights",
        "💰Monthly Host Rate"
      `)
      .eq('_id', payload.listingId)
      .single();

    if (listingError || !listing) {
      console.error('[Proposal Handler] Listing not found:', listingError);
      throw new ValidationError(`Listing not found: ${payload.listingId}`);
    }

    const listingData = listing as unknown as ListingData;
    console.log('[Proposal Handler] Found listing, host account:', listingData['Host / Landlord']);

    // 2.2: Fetch Guest User
    const { data: guest, error: guestError } = await supabase
      .from('user')
      .select(`
        _id,
        "email as text",
        "Rental Application",
        "Proposals List",
        "Favorited Listings",
        "About Me / Bio",
        "need for Space",
        "special needs",
        "Tasks Completed"
      `)
      .eq('_id', payload.guestId)
      .single();

    if (guestError || !guest) {
      console.error('[Proposal Handler] Guest not found:', guestError);
      throw new ValidationError(`Guest not found: ${payload.guestId}`);
    }

    const guestData = guest as unknown as GuestData;
    console.log('[Proposal Handler] Found guest:', guestData['email as text']);

    // 2.3: Fetch Host Account
    const { data: hostAccount, error: hostAccountError } = await supabase
      .from('account_host')
      .select('_id, User')
      .eq('_id', listingData['Host / Landlord'])
      .single();

    if (hostAccountError || !hostAccount) {
      console.error('[Proposal Handler] Host account not found:', hostAccountError);
      throw new ValidationError(`Host account not found: ${listingData['Host / Landlord']}`);
    }

    const hostAccountData = hostAccount as unknown as HostAccountData;

    // 2.4: Fetch Host User
    const { data: hostUser, error: hostUserError } = await supabase
      .from('user')
      .select(`_id, "email as text", "Proposals List"`)
      .eq('_id', hostAccountData.User)
      .single();

    if (hostUserError || !hostUser) {
      console.error('[Proposal Handler] Host user not found:', hostUserError);
      throw new ValidationError('Host user not found');
    }

    const hostUserData = hostUser as unknown as HostUserData;
    console.log('[Proposal Handler] Found host:', hostUserData['email as text']);

    // 2.5: Fetch Rental Application (if exists)
    let rentalApp: RentalAppData | null = null;
    if (guestData['Rental Application']) {
      const { data: app } = await supabase
        .from('rentalapplication')
        .select('_id, submitted')
        .eq('_id', guestData['Rental Application'])
        .single();
      rentalApp = app as RentalAppData | null;
      console.log('[Proposal Handler] Rental app found, submitted:', rentalApp?.submitted);
    }

    // ========================================================================
    // STEP 3: Perform all calculations
    // ========================================================================
    console.log('[Proposal Handler] Step 3: Calculating proposal values...');

    const now = new Date().toISOString();
    const existingProposals = guestData['Proposals List'] || [];

    // 3.1: Order ranking
    const orderRanking = calculateOrderRanking(existingProposals.length);

    // 3.2: Complementary nights and days
    const complementaryNights = calculateComplementaryNights(
      listingData['Nights Available (List of Nights)'] || [],
      payload.nightsSelected
    );
    const complementaryDays = calculateComplementaryDays(
      listingData['Days Available (List of Days)'] || [],
      payload.daysSelected
    );

    // 3.3: Compensation calculation
    const rentalType = ((listingData['rental type'] || 'nightly').toLowerCase()) as RentalType;
    const compensation = calculateCompensation(
      rentalType,
      'other' as ReservationSpan, // reservationSpan category
      payload.nightsSelected.length,
      listingData['💰Weekly Host Rate'] || 0,
      payload.proposalPrice,
      payload.reservationSpanWeeks
    );

    // 3.4: Move-out date calculation
    const moveOutDate = calculateMoveOutDate(
      new Date(payload.moveInStartRange),
      payload.reservationSpanWeeks,
      payload.nightsSelected.length
    );

    // 3.5: Determine initial status
    const status = determineInitialStatus(
      !!rentalApp,
      rentalApp?.submitted ?? false,
      payload.status as ProposalStatusName | undefined
    );

    // 3.6: History entry
    const historyEntry = `Proposal created on ${new Date().toLocaleString('en-US', {
      month: '2-digit',
      day: '2-digit',
      year: '2-digit',
      hour: 'numeric',
      minute: '2-digit',
      hour12: true,
    })}`;

    console.log('[Proposal Handler] Calculated status:', status);
    console.log('[Proposal Handler] Calculated total compensation:', compensation.total_compensation);

    // ========================================================================
    // STEP 4: Build and insert proposal record
    // ========================================================================
    console.log('[Proposal Handler] Step 4: Inserting proposal into Supabase...');

    const proposalData = {
      _id: proposalId,

      // Core relationships
      Listing: payload.listingId,
      Guest: payload.guestId,
      'Host - Account': listingData['Host / Landlord'],
      'Created By': payload.guestId,

      // Guest info
      'Guest email': guestData['email as text'],
      'Guest flexibility': payload.guestFlexibility || '',
      'preferred gender': payload.preferredGender || '',
      'need for space': payload.needForSpace || null,
      'About yourself': payload.aboutMe || null,
      'Special needs': payload.specialNeeds || null,
      Comment: payload.aboutMe || null,

      // Dates
      'Move in range start': payload.moveInStartRange,
      'Move in range end': payload.moveInEndRange,
      'Move-out': moveOutDate.toISOString(),
      'move-in range (text)': payload.moveInRangeText || null,

      // Duration
      'Reservation Span': payload.reservationSpan,
      'Reservation Span (Weeks)': payload.reservationSpanWeeks,
      'actual weeks during reservation span': payload.reservationSpanWeeks,
      'duration in months': compensation.duration_months,

      // Day/Night selection (Bubble format: 1-7)
      'Days Selected': payload.daysSelected,
      'Nights Selected (Nights list)': payload.nightsSelected,
      'nights per week (num)': payload.nightsSelected.length,
      'check in day': payload.checkInDay,
      'check out day': payload.checkOutDay,
      'Days Available': listingData['Days Available (List of Days)'],
      'Complementary Nights': complementaryNights,
      'Complementary Days': complementaryDays,

      // Pricing
      'proposal nightly price': payload.proposalPrice,
      '4 week rent': payload.fourWeekRent || compensation.four_week_rent,
      'Total Price for Reservation (guest)': payload.estimatedBookingTotal,
      'Total Compensation (proposal - host)': compensation.total_compensation,
      'host compensation': payload.hostCompensation || compensation.total_compensation,
      '4 week compensation': payload.fourWeekCompensation || compensation.four_week_compensation,
      'cleaning fee': listingData['💰Cleaning Cost / Maintenance Fee'] || 0,
      'damage deposit': listingData['💰Damage Deposit'] || 0,
      'nightly price for map (text)': formatPriceForDisplay(payload.proposalPrice),

      // From listing
      'rental type': listingData['rental type'],
      'House Rules': listingData['Features - House Rules'],
      'week selection': listingData['Weeks offered'],
      'hc house rules': listingData['Features - House Rules'],
      'Location - Address': listingData['Location - Address'],
      'Location - Address slightly different': listingData['Location - slightly different address'],

      // Status & metadata
      Status: status,
      'Order Ranking': orderRanking,
      History: [historyEntry],
      'Is Finalized': false,
      Deleted: false,

      // Related records
      'rental application': guestData['Rental Application'],
      'host email': hostUserData['email as text'],

      // Suggestion fields (for future use)
      'suggested reason (benefits)': payload.suggestedReason || null,
      'origin proposal of this suggestion': payload.originProposal || null,
      'number of matches': payload.numberOfMatches || null,

      // Timestamps
      'Created Date': now,
      'Modified Date': now,
    };

    console.log('[Proposal Handler] Inserting proposal:', proposalId);

    const { error: insertError } = await supabase
      .from('proposal')
      .insert(proposalData);

    if (insertError) {
      console.error('[Proposal Handler] Insert failed:', insertError);
      throw new Error(`Failed to create proposal: ${insertError.message}`);
    }

    console.log('[Proposal Handler] Proposal created successfully in Supabase');

    // ========================================================================
    // STEP 5: Update guest user record
    // ========================================================================
    console.log('[Proposal Handler] Step 5: Updating guest user...');

    const guestUpdates: Record<string, unknown> = {
      'flexibility (last known)': payload.guestFlexibility || '',
      'Recent Days Selected': payload.daysSelected,
      'Modified Date': now,
    };

    // Add proposal to guest's list
    const updatedGuestProposals = [...existingProposals, proposalId];
    guestUpdates['Proposals List'] = updatedGuestProposals;

    // Add listing to favorites if not already
    const currentFavorites = guestData['Favorited Listings'] || [];
    if (!currentFavorites.includes(payload.listingId)) {
      guestUpdates['Favorited Listings'] = [...currentFavorites, payload.listingId];
    }

    // Profile enrichment - only if fields are empty
    const tasksCompleted = guestData['Tasks Completed'] || [];
    if (!guestData['About Me / Bio'] && !tasksCompleted.includes('bio') && payload.aboutMe) {
      guestUpdates['About Me / Bio'] = payload.aboutMe;
    }
    if (!guestData['need for Space'] && !tasksCompleted.includes('need_for_space') && payload.needForSpace) {
      guestUpdates['need for Space'] = payload.needForSpace;
    }
    if (!guestData['special needs'] && !tasksCompleted.includes('special_needs') && payload.specialNeeds) {
      guestUpdates['special needs'] = payload.specialNeeds;
    }

    const { error: guestUpdateError } = await supabase
      .from('user')
      .update(guestUpdates)
      .eq('_id', payload.guestId);

    if (guestUpdateError) {
      console.warn('[Proposal Handler] Guest update failed:', guestUpdateError);
      // Non-blocking - continue
    } else {
      console.log('[Proposal Handler] Guest user updated');
    }

    // ========================================================================
    // STEP 6: Update host user record
    // ========================================================================
    console.log('[Proposal Handler] Step 6: Updating host user...');

    const hostProposals = hostUserData['Proposals List'] || [];

    const { error: hostUpdateError } = await supabase
      .from('user')
      .update({
        'Proposals List': [...hostProposals, proposalId],
        'Modified Date': now,
      })
      .eq('_id', hostAccountData.User);

    if (hostUpdateError) {
      console.warn('[Proposal Handler] Host update failed:', hostUpdateError);
      // Non-blocking - continue
    } else {
      console.log('[Proposal Handler] Host user updated');
    }

    // ========================================================================
    // SUCCESS
    // ========================================================================
    console.log('[Proposal Handler] ========== SUCCESS ==========');
    console.log('[Proposal Handler] Proposal ID:', proposalId);
    console.log('[Proposal Handler] Status:', status);
    console.log('[Proposal Handler] Order Ranking:', orderRanking);

    return {
      proposalId,
      status: status,
      success: true,
    };

  } catch (error) {
    console.error('[Proposal Handler] ========== ERROR ==========');
    console.error('[Proposal Handler] Failed to create proposal:', error);
    throw error;
  }
}
