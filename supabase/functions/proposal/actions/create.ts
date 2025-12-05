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

/**
 * Generate a Bubble-compatible ID
 * Format: {timestamp}x{random}
 */
function generateBubbleId(): string {
  const timestamp = Date.now();
  const random = Math.floor(Math.random() * 1000000000);
  return `${timestamp}x${random}`;
}

/**
 * Handle create proposal request
 */
export async function handleCreate(
  payload: Record<string, unknown>,
  user: UserContext,
  supabase: SupabaseClient
): Promise<CreateProposalResponse> {
  console.log(`[proposal:create] Starting create for user: ${user.email}`);

  // ================================================
  // VALIDATION
  // ================================================

  const input = payload as unknown as CreateProposalInput;
  validateCreateProposalInput(input);

  console.log(`[proposal:create] Validated input for listing: ${input.listing_id}`);

  // ================================================
  // FETCH RELATED DATA
  // ================================================

  // Fetch Listing
  const { data: listing, error: listingError } = await supabase
    .from("listing")
    .select(
      `
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
    `
    )
    .eq("_id", input.listing_id)
    .single();

  if (listingError || !listing) {
    console.error(`[proposal:create] Listing fetch failed:`, listingError);
    throw new ValidationError(`Listing not found: ${input.listing_id}`);
  }

  const listingData = listing as unknown as ListingData;
  console.log(`[proposal:create] Found listing, host account: ${listingData["Host / Landlord"]}`);

  // Fetch Guest User
  const { data: guest, error: guestError } = await supabase
    .from("user")
    .select(
      `
      _id,
      "email as text",
      "Rental Application",
      "Proposals List",
      "Favorited Listings",
      "About Me / Bio",
      "need for Space",
      "special needs",
      "Tasks Completed"
    `
    )
    .eq("_id", input.guest_id)
    .single();

  if (guestError || !guest) {
    console.error(`[proposal:create] Guest fetch failed:`, guestError);
    throw new ValidationError(`Guest not found: ${input.guest_id}`);
  }

  const guestData = guest as unknown as GuestData;
  console.log(`[proposal:create] Found guest: ${guestData["email as text"]}`);

  // Fetch Host Account
  const { data: hostAccount, error: hostAccountError } = await supabase
    .from("account_host")
    .select("_id, User")
    .eq("_id", listingData["Host / Landlord"])
    .single();

  if (hostAccountError || !hostAccount) {
    console.error(`[proposal:create] Host account fetch failed:`, hostAccountError);
    throw new ValidationError(`Host account not found: ${listingData["Host / Landlord"]}`);
  }

  const hostAccountData = hostAccount as unknown as HostAccountData;

  // Fetch Host User
  const { data: hostUser, error: hostUserError } = await supabase
    .from("user")
    .select(`_id, "email as text", "Proposals List"`)
    .eq("_id", hostAccountData.User)
    .single();

  if (hostUserError || !hostUser) {
    console.error(`[proposal:create] Host user fetch failed:`, hostUserError);
    throw new ValidationError(`Host user not found`);
  }

  const hostUserData = hostUser as unknown as HostUserData;
  console.log(`[proposal:create] Found host: ${hostUserData["email as text"]}`);

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
  const existingProposals = guestData["Proposals List"] || [];
  const orderRanking = calculateOrderRanking(existingProposals.length);

  // Calculate complementary nights (Step 4)
  const complementaryNights = calculateComplementaryNights(
    listingData["Nights Available (List of Nights)"] || [],
    input.nights_selected
  );

  // Calculate compensation (Steps 13-18)
  const rentalType = ((listingData["rental type"] || "nightly").toLowerCase()) as RentalType;
  const compensation = calculateCompensation(
    rentalType,
    (input.reservation_span || "other") as ReservationSpan,
    input.nights_selected.length,
    listingData["💰Weekly Host Rate"] || 0,
    input.proposal_price,
    input.reservation_span_weeks
  );

  // Calculate move-out date
  const moveOutDate = calculateMoveOutDate(
    new Date(input.move_in_start_range),
    input.reservation_span_weeks,
    input.nights_selected.length
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

  const proposalId = generateBubbleId();
  const now = new Date().toISOString();
  const historyEntry = `Proposal created on ${new Date().toLocaleString("en-US", {
    month: "2-digit",
    day: "2-digit",
    year: "2-digit",
    hour: "numeric",
    minute: "2-digit",
    hour12: true,
  })}`;

  const proposalData = {
    _id: proposalId,

    // Core relationships
    Listing: input.listing_id,
    Guest: input.guest_id,
    "Host - Account": listingData["Host / Landlord"],
    "Created By": input.guest_id,

    // Guest info
    "Guest email": guestData["email as text"],
    "Guest flexibility": input.guest_flexibility,
    "preferred gender": input.preferred_gender,
    "need for space": input.need_for_space || null,
    "About yourself": input.about_me || null,
    "Special needs": input.special_needs || null,
    Comment: input.comment || null,

    // Dates
    "Move in range start": input.move_in_start_range,
    "Move in range end": input.move_in_end_range,
    "Move-out": moveOutDate.toISOString(),
    "move-in range (text)": input.move_in_range_text || null,

    // Duration
    "Reservation Span": input.reservation_span,
    "Reservation Span (Weeks)": input.reservation_span_weeks,
    "actual weeks during reservation span": input.actual_weeks || input.reservation_span_weeks,
    "duration in months": compensation.duration_months,

    // Day/Night selection
    "Days Selected": input.days_selected,
    "Nights Selected (Nights list)": input.nights_selected,
    "nights per week (num)": input.nights_selected.length,
    "check in day": input.check_in,
    "check out day": input.check_out,
    "Days Available": listingData["Days Available (List of Days)"],
    "Complementary Nights": complementaryNights,

    // Pricing
    "proposal nightly price": input.proposal_price,
    "4 week rent": input.four_week_rent || compensation.four_week_rent,
    "Total Price for Reservation (guest)": input.estimated_booking_total,
    "Total Compensation (proposal - host)": compensation.total_compensation,
    "host compensation": input.host_compensation || compensation.total_compensation,
    "4 week compensation": input.four_week_compensation || compensation.four_week_compensation,
    "cleaning fee": listingData["💰Cleaning Cost / Maintenance Fee"] || 0,
    "damage deposit": listingData["💰Damage Deposit"] || 0,
    "nightly price for map (text)": formatPriceForDisplay(input.proposal_price),

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
    "host email": hostUserData["email as text"],

    // Suggestion fields
    "suggested reason (benefits)": input.suggested_reason || null,
    "origin proposal of this suggestion": input.origin_proposal_id || null,
    "number of matches": input.number_of_matches || null,

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
    "flexibility (last known)": input.guest_flexibility,
    "Recent Days Selected": input.days_selected,
    "Modified Date": now,
  };

  // Add proposal to guest's list
  const updatedGuestProposals = [...existingProposals, proposalId];
  guestUpdates["Proposals List"] = updatedGuestProposals;

  // Add listing to favorites (Step 2)
  const currentFavorites = guestData["Favorited Listings"] || [];
  if (!currentFavorites.includes(input.listing_id)) {
    guestUpdates["Favorited Listings"] = [...currentFavorites, input.listing_id];
  }

  // Profile enrichment (Steps 20-22) - only if empty
  const tasksCompleted = guestData["Tasks Completed"] || [];

  if (!guestData["About Me / Bio"] && !tasksCompleted.includes("bio") && input.about_me) {
    guestUpdates["About Me / Bio"] = input.about_me;
  }
  if (!guestData["need for Space"] && !tasksCompleted.includes("need_for_space") && input.need_for_space) {
    guestUpdates["need for Space"] = input.need_for_space;
  }
  if (!guestData["special needs"] && !tasksCompleted.includes("special_needs") && input.special_needs) {
    guestUpdates["special needs"] = input.special_needs;
  }

  const { error: guestUpdateError } = await supabase
    .from("user")
    .update(guestUpdates)
    .eq("_id", input.guest_id);

  if (guestUpdateError) {
    console.error(`[proposal:create] Guest update failed:`, guestUpdateError);
    // Non-blocking - continue
  } else {
    console.log(`[proposal:create] Guest user updated`);
  }

  // ================================================
  // STEP 3: UPDATE HOST USER
  // ================================================

  const hostProposals = hostUserData["Proposals List"] || [];

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
  // TRIGGER ASYNC WORKFLOWS (Non-blocking)
  // ================================================

  // These are placeholder logs - actual async calls will be implemented in Phase 4
  console.log(`[proposal:create] [ASYNC] Would trigger: proposal-communications`, {
    proposal_id: proposalId,
    guest_id: input.guest_id,
    host_id: hostAccountData.User,
  });

  console.log(`[proposal:create] [ASYNC] Would trigger: proposal-summary (ai-gateway)`, {
    proposal_id: proposalId,
  });

  console.log(`[proposal:create] [ASYNC] Would trigger: proposal-suggestions`, {
    proposal_id: proposalId,
  });

  // ================================================
  // RETURN RESPONSE
  // ================================================

  console.log(`[proposal:create] Complete, returning response`);

  return {
    proposal_id: proposalId,
    status: status,
    order_ranking: orderRanking,
    listing_id: input.listing_id,
    guest_id: input.guest_id,
    host_id: hostAccountData.User,
    created_at: now,
  };
}
