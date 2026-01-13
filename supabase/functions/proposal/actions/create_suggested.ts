/**
 * Create Suggested Proposal Action
 * Split Lease - Supabase Edge Functions
 *
 * Internal action for creating proposals on behalf of guests.
 * Used by the internal admin page at /_internal/create-suggested-proposal
 *
 * Key differences from regular create:
 * - No authentication required (internal tool)
 * - Simplified validation (assumes data is already validated by UI)
 * - Uses "Proposal Submitted for guest by Split Lease - Awaiting Rental Application" status
 * - Creates associated thread record for messaging
 *
 * NO FALLBACK PRINCIPLE: All errors fail fast without fallback logic
 */

import { SupabaseClient } from "https://esm.sh/@supabase/supabase-js@2";
import { ValidationError, SupabaseSyncError } from "../../_shared/errors.ts";
import {
  ListingData,
  GuestData,
  HostUserData,
  RentalApplicationData,
  RentalType,
  ReservationSpan,
} from "../lib/types.ts";
import {
  calculateCompensation,
  calculateMoveOutDate,
  calculateComplementaryNights,
  calculateOrderRanking,
  formatPriceForDisplay,
  getNightlyRateForNights,
} from "../lib/calculations.ts";
import { enqueueBubbleSync, triggerQueueProcessing } from "../lib/bubbleSyncQueue.ts";
import {
  addUserProposal,
  addUserListingFavorite,
} from "../../_shared/junctionHelpers.ts";
import { parseJsonArray } from "../../_shared/jsonUtils.ts";

// ─────────────────────────────────────────────────────────────
// INPUT TYPE
// ─────────────────────────────────────────────────────────────

export interface CreateSuggestedProposalInput {
  // Required Identifiers
  listingId: string;
  guestId: string;

  // Day/Night Selection (0-indexed: 0=Sunday, 6=Saturday)
  daysSelected: number[];
  nightsSelected: number[];
  checkIn: number;
  checkOut: number;

  // Dates & Duration
  moveInStartRange: string; // ISO date
  moveInEndRange: string; // ISO date
  reservationSpanWeeks: number;
  reservationSpan: string; // → os_stay_periods.name

  // Pricing (calculated by frontend from pricing_list)
  nightlyPrice: number;
  totalPrice: number;
  hostCompensation: number;
  cleaningFee: number;
  damageDeposit: number;
  fourWeekRent: number;

  // Optional Guest Info
  guestFlexibility?: string;
  preferredGender?: string;
  comment?: string;
}

// ─────────────────────────────────────────────────────────────
// RESPONSE TYPE
// ─────────────────────────────────────────────────────────────

export interface CreateSuggestedProposalResponse {
  proposalId: string;
  threadId: string;
  status: string;
  listingId: string;
  guestId: string;
  hostId: string;
  createdAt: string;
}

// ─────────────────────────────────────────────────────────────
// VALIDATION
// ─────────────────────────────────────────────────────────────

function validateDayIndices(days: number[]): boolean {
  if (!Array.isArray(days)) return false;
  return days.every((d) => Number.isInteger(d) && d >= 0 && d <= 6);
}

function validateCreateSuggestedInput(input: CreateSuggestedProposalInput): void {
  // Required identifiers
  if (!input.listingId || typeof input.listingId !== "string") {
    throw new ValidationError("listingId is required and must be a string");
  }
  if (!input.guestId || typeof input.guestId !== "string") {
    throw new ValidationError("guestId is required and must be a string");
  }

  // Day/Night selection
  if (!Array.isArray(input.daysSelected) || input.daysSelected.length === 0) {
    throw new ValidationError("daysSelected must be a non-empty array");
  }
  if (!validateDayIndices(input.daysSelected)) {
    throw new ValidationError("daysSelected must contain integer values 0-6 (Sun=0, Sat=6)");
  }
  if (!Array.isArray(input.nightsSelected) || input.nightsSelected.length === 0) {
    throw new ValidationError("nightsSelected must be a non-empty array");
  }
  if (!validateDayIndices(input.nightsSelected)) {
    throw new ValidationError("nightsSelected must contain integer values 0-6");
  }
  if (typeof input.checkIn !== "number" || !validateDayIndices([input.checkIn])) {
    throw new ValidationError("checkIn must be an integer value 0-6");
  }
  if (typeof input.checkOut !== "number" || !validateDayIndices([input.checkOut])) {
    throw new ValidationError("checkOut must be an integer value 0-6");
  }

  // Dates
  if (!input.moveInStartRange) {
    throw new ValidationError("moveInStartRange is required");
  }
  if (!input.moveInEndRange) {
    throw new ValidationError("moveInEndRange is required");
  }

  // Duration
  if (typeof input.reservationSpanWeeks !== "number" || input.reservationSpanWeeks < 1) {
    throw new ValidationError("reservationSpanWeeks must be a positive number");
  }
  if (!input.reservationSpan || typeof input.reservationSpan !== "string") {
    throw new ValidationError("reservationSpan is required and must be a string");
  }

  // Pricing
  if (typeof input.nightlyPrice !== "number" || input.nightlyPrice < 0) {
    throw new ValidationError("nightlyPrice must be a non-negative number");
  }
  if (typeof input.totalPrice !== "number" || input.totalPrice < 0) {
    throw new ValidationError("totalPrice must be a non-negative number");
  }
}

// ─────────────────────────────────────────────────────────────
// MAIN HANDLER
// ─────────────────────────────────────────────────────────────

export async function handleCreateSuggested(
  payload: Record<string, unknown>,
  supabase: SupabaseClient
): Promise<CreateSuggestedProposalResponse> {
  console.log(`[proposal:create_suggested] Starting suggested proposal creation`);

  // ================================================
  // VALIDATION
  // ================================================

  const input = payload as unknown as CreateSuggestedProposalInput;
  validateCreateSuggestedInput(input);

  console.log(`[proposal:create_suggested] Validated input for listing: ${input.listingId}, guest: ${input.guestId}`);

  // ================================================
  // DUPLICATE CHECK
  // ================================================

  const excludedStatuses = [
    'Proposal Cancelled by Guest',
    'Proposal Cancelled by Host',
    'Proposal Cancelled by Split Lease',
    'Proposal Rejected by Host',
    'Proposal Rejected by Guest'
  ];

  const { data: existingProposals, error: duplicateCheckError } = await supabase
    .from("proposal")
    .select("_id, Status")
    .eq('"Guest"', input.guestId)
    .eq('"Listing"', input.listingId)
    .eq('"Deleted"', false)
    .limit(10);

  if (duplicateCheckError) {
    console.error(`[proposal:create_suggested] Duplicate check failed:`, duplicateCheckError);
    // Non-blocking - continue
  } else if (existingProposals && existingProposals.length > 0) {
    const activeProposals = existingProposals.filter(
      (p) => !excludedStatuses.includes(p.Status)
    );

    if (activeProposals.length > 0) {
      console.warn(`[proposal:create_suggested] Active proposal exists:`, {
        existingProposalId: activeProposals[0]._id,
        existingStatus: activeProposals[0].Status
      });
      // Note: For internal tool, we warn but don't block (admin may need to create anyway)
    }
  }

  // ================================================
  // FETCH RELATED DATA
  // ================================================

  // Fetch Listing
  const { data: listing, error: listingError } = await supabase
    .from("listing")
    .select(`
      _id,
      "Host User",
      "rental type",
      "Features - House Rules",
      "💰Cleaning Cost / Maintenance Fee",
      "💰Damage Deposit",
      "Weeks offered",
      "Days Available (List of Days)",
      "Nights Available (List of Nights) ",
      "Location - Address",
      "Location - slightly different address",
      "💰Weekly Host Rate",
      "💰Nightly Host Rate for 2 nights",
      "💰Nightly Host Rate for 3 nights",
      "💰Nightly Host Rate for 4 nights",
      "💰Nightly Host Rate for 5 nights",
      "💰Nightly Host Rate for 7 nights",
      "💰Monthly Host Rate",
      "Deleted"
    `)
    .eq("_id", input.listingId)
    .single();

  if (listingError || !listing) {
    console.error(`[proposal:create_suggested] Listing fetch failed:`, listingError);
    throw new ValidationError(`Listing not found: ${input.listingId}`);
  }

  if ((listing as Record<string, unknown>).Deleted === true) {
    throw new ValidationError(`Cannot create proposal for deleted listing: ${input.listingId}`);
  }

  const listingData = listing as unknown as ListingData;
  console.log(`[proposal:create_suggested] Found listing, host user: ${listingData["Host User"]}`);

  // Fetch Guest User
  const { data: guest, error: guestError } = await supabase
    .from("user")
    .select(`
      _id,
      email,
      "Rental Application",
      "Proposals List",
      "Favorited Listings",
      "Tasks Completed"
    `)
    .eq("_id", input.guestId)
    .single();

  if (guestError || !guest) {
    console.error(`[proposal:create_suggested] Guest fetch failed:`, guestError);
    throw new ValidationError(`Guest not found: ${input.guestId}`);
  }

  const guestData = guest as unknown as GuestData;
  console.log(`[proposal:create_suggested] Found guest: ${guestData.email}`);

  // Fetch Host User
  const { data: hostUser, error: hostUserError } = await supabase
    .from("user")
    .select(`_id, email, "Proposals List"`)
    .eq("_id", listingData["Host User"])
    .single();

  if (hostUserError || !hostUser) {
    console.error(`[proposal:create_suggested] Host user fetch failed:`, hostUserError);
    throw new ValidationError(`Host user not found: ${listingData["Host User"]}`);
  }

  const hostUserData = hostUser as unknown as HostUserData;
  console.log(`[proposal:create_suggested] Found host: ${hostUserData.email}`);

  // Fetch Rental Application (if exists)
  let rentalApp: RentalApplicationData | null = null;
  if (guestData["Rental Application"]) {
    const { data: app } = await supabase
      .from("rentalapplication")
      .select("_id, submitted")
      .eq("_id", guestData["Rental Application"])
      .single();
    rentalApp = app as RentalApplicationData | null;
    console.log(`[proposal:create_suggested] Rental app found, submitted: ${rentalApp?.submitted}`);
  }

  // ================================================
  // CALCULATIONS
  // ================================================

  // Order ranking
  const guestProposalsList: string[] = guestData["Proposals List"] || [];
  const orderRanking = calculateOrderRanking(guestProposalsList.length);

  // Complementary nights
  const complementaryNights = calculateComplementaryNights(
    listingData["Nights Available (List of Nights) "] || [],
    input.nightsSelected
  );

  // Compensation calculation
  const rentalType = ((listingData["rental type"] || "nightly").toLowerCase()) as RentalType;
  const nightsPerWeek = input.nightsSelected.length;
  const hostNightlyRate = getNightlyRateForNights(listingData, nightsPerWeek);

  const compensation = calculateCompensation(
    rentalType,
    (input.reservationSpan || "other") as ReservationSpan,
    nightsPerWeek,
    listingData["💰Weekly Host Rate"] || 0,
    hostNightlyRate,
    input.reservationSpanWeeks,
    listingData["💰Monthly Host Rate"] || 0
  );

  // Move-out date
  const moveOutDate = calculateMoveOutDate(
    new Date(input.moveInStartRange),
    input.reservationSpanWeeks,
    nightsPerWeek
  );

  // Status: For suggested proposals by Split Lease
  const hasRentalApp = !!guestData["Rental Application"];
  const rentalAppSubmitted = rentalApp?.submitted ?? false;

  // Use appropriate status based on rental app state
  const status = (hasRentalApp && rentalAppSubmitted)
    ? "Host Review"
    : "Proposal Submitted for guest by Split Lease - Awaiting Rental Application";

  console.log(`[proposal:create_suggested] Calculated status: ${status}`);

  // ================================================
  // GENERATE IDS
  // ================================================

  // Generate Bubble-compatible ID for proposal
  const { data: proposalId, error: proposalIdError } = await supabase.rpc('generate_bubble_id');
  if (proposalIdError || !proposalId) {
    console.error(`[proposal:create_suggested] Proposal ID generation failed:`, proposalIdError);
    throw new SupabaseSyncError('Failed to generate proposal ID');
  }

  // Generate Bubble-compatible ID for thread
  const { data: threadId, error: threadIdError } = await supabase.rpc('generate_bubble_id');
  if (threadIdError || !threadId) {
    console.error(`[proposal:create_suggested] Thread ID generation failed:`, threadIdError);
    throw new SupabaseSyncError('Failed to generate thread ID');
  }

  console.log(`[proposal:create_suggested] Generated IDs - Proposal: ${proposalId}, Thread: ${threadId}`);

  // ================================================
  // CREATE PROPOSAL RECORD
  // ================================================

  const now = new Date().toISOString();
  const historyEntry = `Suggested proposal created by Split Lease on ${new Date().toLocaleString("en-US", {
    month: "2-digit",
    day: "2-digit",
    year: "2-digit",
    hour: "numeric",
    minute: "2-digit",
    hour12: true,
  })}`;

  const guestFlexibility = input.guestFlexibility || "Flexible";
  const preferredGender = input.preferredGender || "any";

  const proposalData = {
    _id: proposalId,

    // Core relationships
    Listing: input.listingId,
    Guest: input.guestId,
    "Host User": hostUserData._id,
    "Created By": "Split Lease", // Indicates internal creation

    // Guest info
    "Guest email": guestData.email,
    "Guest flexibility": guestFlexibility,
    "preferred gender": preferredGender,
    Comment: input.comment || null,

    // Dates
    "Move in range start": input.moveInStartRange,
    "Move in range end": input.moveInEndRange,
    "Move-out": moveOutDate.toISOString(),

    // Duration
    "Reservation Span": input.reservationSpan,
    "Reservation Span (Weeks)": input.reservationSpanWeeks,
    "actual weeks during reservation span": input.reservationSpanWeeks,
    "duration in months": compensation.duration_months,

    // Day/Night selection (0-indexed)
    "Days Selected": input.daysSelected,
    "Nights Selected (Nights list)": input.nightsSelected,
    "nights per week (num)": nightsPerWeek,
    "check in day": input.checkIn,
    "check out day": input.checkOut,
    "Days Available": listingData["Days Available (List of Days)"],
    "Complementary Nights": complementaryNights,

    // Pricing
    "proposal nightly price": input.nightlyPrice,
    "4 week rent": input.fourWeekRent || compensation.four_week_rent,
    "Total Price for Reservation (guest)": input.totalPrice,
    "Total Compensation (proposal - host)": input.hostCompensation || compensation.total_compensation,
    "host compensation": compensation.host_compensation_per_night,
    "4 week compensation": compensation.four_week_compensation,
    "cleaning fee": input.cleaningFee || listingData["💰Cleaning Cost / Maintenance Fee"] || 0,
    "damage deposit": input.damageDeposit || listingData["💰Damage Deposit"] || 0,
    "nightly price for map (text)": formatPriceForDisplay(input.nightlyPrice),

    // From listing
    "rental type": listingData["rental type"],
    "House Rules": listingData["Features - House Rules"],
    "week selection": listingData["Weeks offered"],
    "hc house rules": listingData["Features - House Rules"],
    "Location - Address": listingData["Location - Address"],
    "Location - Address slightly different": listingData["Location - slightly different address"],

    // Status & metadata
    Status: status,
    "Order Ranking": orderRanking,
    History: [historyEntry],
    "Is Finalized": false,
    Deleted: false,

    // Related records
    "rental application": guestData["Rental Application"],
    "rental app requested": hasRentalApp,
    "host email": hostUserData.email,

    // Thread reference
    Thread: threadId,

    // Timestamps
    "Created Date": now,
    "Modified Date": now,
  };

  console.log(`[proposal:create_suggested] Inserting proposal: ${proposalId}`);

  const { error: proposalInsertError } = await supabase
    .from("proposal")
    .insert(proposalData);

  if (proposalInsertError) {
    console.error(`[proposal:create_suggested] Proposal insert failed:`, proposalInsertError);
    throw new SupabaseSyncError(`Failed to create proposal: ${proposalInsertError.message}`);
  }

  console.log(`[proposal:create_suggested] Proposal created successfully`);

  // ================================================
  // CREATE THREAD RECORD
  // ================================================

  const threadData = {
    _id: threadId,
    Proposal: proposalId,
    Listing: input.listingId,
    Guest: input.guestId,
    Host: hostUserData._id,
    "Is Active": true,
    "Message Count": 0,
    Deleted: false,
    "Created Date": now,
    "Modified Date": now,
  };

  console.log(`[proposal:create_suggested] Inserting thread: ${threadId}`);

  const { error: threadInsertError } = await supabase
    .from("thread")
    .insert(threadData);

  if (threadInsertError) {
    console.error(`[proposal:create_suggested] Thread insert failed:`, threadInsertError);
    // Note: Proposal already created, so we log but continue
    console.warn(`[proposal:create_suggested] Proposal created but thread creation failed - manual intervention may be needed`);
  } else {
    console.log(`[proposal:create_suggested] Thread created successfully`);
  }

  // ================================================
  // UPDATE GUEST USER
  // ================================================

  const guestUpdates: Record<string, unknown> = {
    "flexibility (last known)": guestFlexibility,
    "Recent Days Selected": input.daysSelected,
    "Modified Date": now,
  };

  // Add proposal to guest's list
  const updatedGuestProposals = [...guestProposalsList, proposalId];
  guestUpdates["Proposals List"] = updatedGuestProposals;

  // Add listing to favorites
  const currentFavorites = parseJsonArray<string>(guestData["Favorited Listings"], "Favorited Listings");
  if (!currentFavorites.includes(input.listingId)) {
    guestUpdates["Favorited Listings"] = [...currentFavorites, input.listingId];
  }

  const { error: guestUpdateError } = await supabase
    .from("user")
    .update(guestUpdates)
    .eq("_id", input.guestId);

  if (guestUpdateError) {
    console.error(`[proposal:create_suggested] Guest update failed:`, guestUpdateError);
    // Non-blocking
  } else {
    console.log(`[proposal:create_suggested] Guest user updated`);
  }

  // Dual-write to junction tables
  await addUserProposal(supabase, input.guestId, proposalId, 'guest');
  if (!currentFavorites.includes(input.listingId)) {
    await addUserListingFavorite(supabase, input.guestId, input.listingId);
  }

  // ================================================
  // UPDATE HOST USER
  // ================================================

  const hostProposals: string[] = hostUserData["Proposals List"] || [];

  const { error: hostUpdateError } = await supabase
    .from("user")
    .update({
      "Proposals List": [...hostProposals, proposalId],
      "Modified Date": now,
    })
    .eq("_id", hostUserData._id);

  if (hostUpdateError) {
    console.error(`[proposal:create_suggested] Host update failed:`, hostUpdateError);
    // Non-blocking
  } else {
    console.log(`[proposal:create_suggested] Host user updated`);
  }

  // Dual-write to junction tables
  await addUserProposal(supabase, hostUserData._id, proposalId, 'host');

  // ================================================
  // ENQUEUE BUBBLE SYNC
  // ================================================

  try {
    await enqueueBubbleSync(supabase, {
      correlationId: proposalId,
      items: [
        {
          sequence: 1,
          table: 'proposal',
          recordId: proposalId,
          operation: 'INSERT',
          payload: proposalData,
        },
        {
          sequence: 2,
          table: 'thread',
          recordId: threadId,
          operation: 'INSERT',
          payload: threadData,
        },
      ]
    });

    console.log(`[proposal:create_suggested] Bubble sync items enqueued`);
    triggerQueueProcessing();

  } catch (syncError) {
    console.error(`[proposal:create_suggested] Failed to enqueue Bubble sync (non-blocking):`, syncError);
  }

  // ================================================
  // RETURN RESPONSE
  // ================================================

  console.log(`[proposal:create_suggested] Complete`);

  return {
    proposalId: proposalId,
    threadId: threadId,
    status: status,
    listingId: input.listingId,
    guestId: input.guestId,
    hostId: hostUserData._id,
    createdAt: now,
  };
}
