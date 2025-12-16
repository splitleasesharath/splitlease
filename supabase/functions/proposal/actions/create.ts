/**
 * Create Proposal Action
 * Split Lease - Supabase Edge Functions
 *
 * Implements Bubble CORE-create_proposal-NEW workflow (Steps 1-7, 13-23)
 *
 * NO FALLBACK PRINCIPLE: All errors fail fast without fallback logic
 */

import { SupabaseClient } from "https://esm.sh/@supabase/supabase-js@2";
import { ValidationError, SupabaseSyncError } from "../../_shared/errors.ts";
import { parseJsonArray } from "../../_shared/jsonUtils.ts";
import {
  CreateProposalInput,
  CreateProposalResponse,
  ListingData,
  GuestData,
  HostAccountData,
  HostUserData,
  RentalApplicationData,
  UserContext,
  RentalType,
  ReservationSpan,
} from "../lib/types.ts";
import { validateCreateProposalInput } from "../lib/validators.ts";
import {
  calculateCompensation,
  calculateMoveOutDate,
  calculateComplementaryNights,
  calculateOrderRanking,
  formatPriceForDisplay,
} from "../lib/calculations.ts";
import { determineInitialStatus, ProposalStatusName } from "../lib/status.ts";
import { enqueueBubbleSync, triggerQueueProcessing } from "../lib/bubbleSyncQueue.ts";
import {
  addUserProposal,
  addUserListingFavorite,
} from "../../_shared/junctionHelpers.ts";

// ID generation is now done via RPC: generate_bubble_id()

/**
 * Handle create proposal request
 *
 * NOTE: Uses camelCase input to match frontend payload format
 */
export async function handleCreate(
  payload: Record<string, unknown>,
  user: UserContext | null,
  supabase: SupabaseClient
): Promise<CreateProposalResponse> {
  console.log(`[proposal:create] Starting create for user: ${user?.email || 'public'}`);

  // ================================================
  // VALIDATION
  // ================================================

  const input = payload as unknown as CreateProposalInput;
  validateCreateProposalInput(input);

  console.log(`[proposal:create] Validated input for listing: ${input.listingId}`);

  // ================================================
  // FETCH RELATED DATA
  // ================================================

  // Fetch Listing
  const { data: listing, error: listingError } = await supabase
    .from("listing")
    .select(
      `
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
      "💰Monthly Host Rate"
    `
    )
    .eq("_id", input.listingId)
    .single();

  if (listingError || !listing) {
    console.error(`[proposal:create] Listing fetch failed:`, listingError);
    throw new ValidationError(`Listing not found: ${input.listingId}`);
  }

  const listingData = listing as unknown as ListingData;
  console.log(`[proposal:create] Found listing, host user: ${listingData["Host User"]}`);

  // Fetch Guest User
  const { data: guest, error: guestError } = await supabase
    .from("user")
    .select(
      `
      _id,
      email,
      "Rental Application",
      "Proposals List",
      "Favorited Listings",
      "About Me / Bio",
      "need for Space",
      "special needs",
      "Tasks Completed"
    `
    )
    .eq("_id", input.guestId)
    .single();

  if (guestError || !guest) {
    console.error(`[proposal:create] Guest fetch failed:`, guestError);
    throw new ValidationError(`Guest not found: ${input.guestId}`);
  }

  const guestData = guest as unknown as GuestData;
  console.log(`[proposal:create] Found guest: ${guestData.email}`);

  // Fetch Host User directly (Host User column now contains user._id)
  const { data: hostUser, error: hostUserError } = await supabase
    .from("user")
    .select(`_id, email, "Proposals List"`)
    .eq("_id", listingData["Host User"])
    .single();

  if (hostUserError || !hostUser) {
    console.error(`[proposal:create] Host user fetch failed:`, hostUserError);
    throw new ValidationError(`Host user not found: ${listingData["Host User"]}`);
  }

  const hostUserData = hostUser as unknown as HostUserData;
  // hostAccountData maintained for backwards compatibility with downstream code
  const hostAccountData = { _id: hostUserData._id, User: hostUserData._id } as HostAccountData;
  console.log(`[proposal:create] Found host: ${hostUserData.email}`);

  // Fetch Rental Application (if exists)
  let rentalApp: RentalApplicationData | null = null;
  if (guestData["Rental Application"]) {
    const { data: app } = await supabase
      .from("rentalapplication")
      .select("_id, submitted")
      .eq("_id", guestData["Rental Application"])
      .single();
    rentalApp = app as RentalApplicationData | null;
    console.log(`[proposal:create] Rental app found, submitted: ${rentalApp?.submitted}`);
  }

  // ================================================
  // CALCULATIONS
  // ================================================

  // Calculate order ranking
  // After migration, "Proposals List" is a native text[] array - no parsing needed
  const existingProposals: string[] = guestData["Proposals List"] || [];
  const orderRanking = calculateOrderRanking(existingProposals.length);

  // Calculate complementary nights (Step 4)
  const complementaryNights = calculateComplementaryNights(
    listingData["Nights Available (List of Nights) "] || [],
    input.nightsSelected
  );

  // Calculate compensation (Steps 13-18)
  const rentalType = ((listingData["rental type"] || "nightly").toLowerCase()) as RentalType;
  const compensation = calculateCompensation(
    rentalType,
    (input.reservationSpan || "other") as ReservationSpan,
    input.nightsSelected.length,
    listingData["💰Weekly Host Rate"] || 0,
    input.proposalPrice,
    input.reservationSpanWeeks
  );

  // Calculate move-out date
  const moveOutDate = calculateMoveOutDate(
    new Date(input.moveInStartRange),
    input.reservationSpanWeeks,
    input.nightsSelected.length
  );

  // Determine initial status (Steps 5-7)
  const status = determineInitialStatus(
    !!rentalApp,
    rentalApp?.submitted ?? false,
    input.status as ProposalStatusName | undefined
  );

  console.log(`[proposal:create] Calculated status: ${status}, compensation: ${compensation.total_compensation}`);

  // ================================================
  // STEP 1: CREATE PROPOSAL RECORD
  // ================================================

  // Generate Bubble-compatible ID using RPC
  const { data: proposalId, error: idError } = await supabase.rpc('generate_bubble_id');
  if (idError || !proposalId) {
    console.error(`[proposal:create] ID generation failed:`, idError);
    throw new SupabaseSyncError('Failed to generate proposal ID');
  }

  console.log(`[proposal:create] Generated proposal ID: ${proposalId}`);

  const now = new Date().toISOString();
  const historyEntry = `Proposal created on ${new Date().toLocaleString("en-US", {
    month: "2-digit",
    day: "2-digit",
    year: "2-digit",
    hour: "numeric",
    minute: "2-digit",
    hour12: true,
  })}`;

  // Default values for optional fields (tech-debt: should be collected from user)
  const guestFlexibility = input.guestFlexibility || "Flexible";
  const preferredGender = input.preferredGender || "any";

  const proposalData = {
    _id: proposalId,

    // Core relationships
    Listing: input.listingId,
    Guest: input.guestId,
    // Host User contains user._id directly
    "Host User": hostUserData._id,
    "Created By": input.guestId,

    // Guest info
    "Guest email": guestData.email,
    "Guest flexibility": guestFlexibility,
    "preferred gender": preferredGender,
    "need for space": input.needForSpace || null,
    about_yourself: input.aboutMe || null,        // snake_case column
    special_needs: input.specialNeeds || null,    // snake_case column
    Comment: input.comment || null,

    // Dates
    "Move in range start": input.moveInStartRange,
    "Move in range end": input.moveInEndRange,
    "Move-out": moveOutDate.toISOString(),
    "move-in range (text)": input.moveInRangeText || null,

    // Duration
    "Reservation Span": input.reservationSpan,
    "Reservation Span (Weeks)": input.reservationSpanWeeks,
    "actual weeks during reservation span": input.actualWeeks || input.reservationSpanWeeks,
    "duration in months": compensation.duration_months,

    // Day/Night selection
    "Days Selected": input.daysSelected,
    "Nights Selected (Nights list)": input.nightsSelected,
    "nights per week (num)": input.nightsSelected.length,
    "check in day": input.checkIn,
    "check out day": input.checkOut,
    "Days Available": listingData["Days Available (List of Days)"],
    "Complementary Nights": complementaryNights,

    // Pricing
    "proposal nightly price": input.proposalPrice,
    "4 week rent": input.fourWeekRent || compensation.four_week_rent,
    "Total Price for Reservation (guest)": input.estimatedBookingTotal,
    "Total Compensation (proposal - host)": compensation.total_compensation,
    "host compensation": input.hostCompensation || compensation.total_compensation,
    "4 week compensation": input.fourWeekCompensation || compensation.four_week_compensation,
    "cleaning fee": listingData["💰Cleaning Cost / Maintenance Fee"] || 0,
    "damage deposit": listingData["💰Damage Deposit"] || 0,
    "nightly price for map (text)": formatPriceForDisplay(input.proposalPrice),

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
    "rental app requested": !!guestData["Rental Application"],  // NOT NULL boolean
    "host email": hostUserData.email,

    // Suggestion fields - NOTE: These columns don't exist yet in the proposal table
    // TODO: Add these columns via migration if suggestion feature is needed
    // "suggested reason (benefits)": input.suggestedReason || null,
    // "origin proposal of this suggestion": input.originProposalId || null,
    // "number of matches": input.numberOfMatches || null,

    // Timestamps
    "Created Date": now,
    "Modified Date": now,
  };

  console.log(`[proposal:create] Inserting proposal: ${proposalId}`);

  const { error: insertError } = await supabase
    .from("proposal")
    .insert(proposalData);

  if (insertError) {
    console.error(`[proposal:create] Insert failed:`, insertError);
    throw new SupabaseSyncError(`Failed to create proposal: ${insertError.message}`);
  }

  console.log(`[proposal:create] Proposal created successfully`);

  // ================================================
  // STEP 2: UPDATE GUEST USER
  // ================================================

  const guestUpdates: Record<string, unknown> = {
    "flexibility (last known)": guestFlexibility,
    "Recent Days Selected": input.daysSelected,
    "Modified Date": now,
  };

  // Add proposal to guest's list
  const updatedGuestProposals = [...existingProposals, proposalId];
  guestUpdates["Proposals List"] = updatedGuestProposals;

  // Add listing to favorites (Step 2)
  // CRITICAL: Parse JSONB arrays - Supabase can return as stringified JSON
  const currentFavorites = parseJsonArray<string>(guestData["Favorited Listings"], "Favorited Listings");
  if (!currentFavorites.includes(input.listingId)) {
    guestUpdates["Favorited Listings"] = [...currentFavorites, input.listingId];
  }

  // Profile enrichment (Steps 20-22) - only if empty
  // CRITICAL: Parse JSONB arrays - Supabase can return as stringified JSON
  const tasksCompleted = parseJsonArray<string>(guestData["Tasks Completed"], "Tasks Completed");

  if (!guestData["About Me / Bio"] && !tasksCompleted.includes("bio") && input.aboutMe) {
    guestUpdates["About Me / Bio"] = input.aboutMe;
  }
  if (!guestData["need for Space"] && !tasksCompleted.includes("need_for_space") && input.needForSpace) {
    guestUpdates["need for Space"] = input.needForSpace;
  }
  if (!guestData["special needs"] && !tasksCompleted.includes("special_needs") && input.specialNeeds) {
    guestUpdates["special needs"] = input.specialNeeds;
  }

  const { error: guestUpdateError } = await supabase
    .from("user")
    .update(guestUpdates)
    .eq("_id", input.guestId);

  if (guestUpdateError) {
    console.error(`[proposal:create] Guest update failed:`, guestUpdateError);
    // Non-blocking - continue
  } else {
    console.log(`[proposal:create] Guest user updated`);
  }

  // ================================================
  // STEP 2b: DUAL-WRITE TO JUNCTION TABLES (Guest)
  // ================================================

  // Add proposal to guest's junction table
  await addUserProposal(supabase, input.guestId, proposalId, 'guest');

  // Add listing to favorites junction table (if newly added)
  if (!currentFavorites.includes(input.listingId)) {
    await addUserListingFavorite(supabase, input.guestId, input.listingId);
  }

  // ================================================
  // STEP 3: UPDATE HOST USER
  // ================================================

  // After migration, "Proposals List" is a native text[] array - no parsing needed
  const hostProposals: string[] = hostUserData["Proposals List"] || [];

  const { error: hostUpdateError } = await supabase
    .from("user")
    .update({
      "Proposals List": [...hostProposals, proposalId],
      "Modified Date": now,
    })
    .eq("_id", hostAccountData.User);

  if (hostUpdateError) {
    console.error(`[proposal:create] Host update failed:`, hostUpdateError);
    // Non-blocking - continue
  } else {
    console.log(`[proposal:create] Host user updated`);
  }

  // ================================================
  // STEP 3b: DUAL-WRITE TO JUNCTION TABLES (Host)
  // ================================================

  // Add proposal to host's junction table
  await addUserProposal(supabase, hostAccountData.User, proposalId, 'host');

  // ================================================
  // TRIGGER ASYNC WORKFLOWS (Non-blocking)
  // ================================================

  // These are placeholder logs - actual async calls will be implemented in Phase 4
  console.log(`[proposal:create] [ASYNC] Would trigger: proposal-communications`, {
    proposalId: proposalId,
    guestId: input.guestId,
    hostId: hostAccountData.User,
  });

  console.log(`[proposal:create] [ASYNC] Would trigger: proposal-summary (ai-gateway)`, {
    proposalId: proposalId,
  });

  console.log(`[proposal:create] [ASYNC] Would trigger: proposal-suggestions`, {
    proposalId: proposalId,
  });

  // ================================================
  // ENQUEUE BUBBLE SYNC (Supabase → Bubble via sync_queue)
  // ================================================

  // Enqueue sync item for the proposal creation only.
  // The proposal record contains FK relationships (Guest, Host User, Listing)
  // that establish the connections. We do NOT update user records' Proposals List
  // via Data API - Bubble's Data API handles ONE record per call, and list fields
  // like Proposals List are managed by Bubble's internal relationship system.
  try {
    await enqueueBubbleSync(supabase, {
      correlationId: proposalId,

      items: [
        // CREATE proposal in Bubble - contains all FK relationships
        {
          sequence: 1,
          table: 'proposal',
          recordId: proposalId,
          operation: 'INSERT',
          payload: proposalData,
        },
      ]
    });

    console.log(`[proposal:create] Bubble sync items enqueued (correlation: ${proposalId})`);

    // Trigger queue processing (fire and forget)
    triggerQueueProcessing();

  } catch (syncError) {
    // Log but don't fail - items can be manually requeued if needed
    console.error(`[proposal:create] Failed to enqueue Bubble sync (non-blocking):`, syncError);
  }

  // ================================================
  // RETURN RESPONSE
  // ================================================

  console.log(`[proposal:create] Complete, returning response`);

  return {
    proposalId: proposalId,
    status: status,
    orderRanking: orderRanking,
    listingId: input.listingId,
    guestId: input.guestId,
    hostId: hostAccountData.User,
    createdAt: now,
  };
}
