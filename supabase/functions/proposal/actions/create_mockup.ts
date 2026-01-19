/**
 * Create Mockup Proposal Action
 * Split Lease - Supabase Edge Functions
 *
 * Creates a demonstration proposal when a host submits their first listing.
 * This helps new hosts understand how the proposal review process works.
 *
 * Key characteristics:
 * - Uses mock guest user (splitleasefrederick@gmail.com)
 * - Calculates realistic pricing using shared calculations.ts
 * - Status set to "Host Review" for immediate visibility
 * - NON-BLOCKING: Failures do not affect listing submission
 *
 * NO FALLBACK PRINCIPLE: Errors are logged but don't block the listing flow
 */

import { SupabaseClient } from "https://esm.sh/@supabase/supabase-js@2";
import {
  CreateMockupProposalInput,
  CreateMockupProposalResponse,
  ListingData,
  RentalType,
  ReservationSpan,
} from "../lib/types.ts";
import {
  calculateCompensation,
  calculateMoveOutDate,
  calculateComplementaryNights,
  formatPriceForDisplay,
  getNightlyRateForNights,
} from "../lib/calculations.ts";
import {
  MOCK_GUEST_EMAIL,
  getMockupDayNightConfig,
  calculateMockupMoveInDates,
  generateMockupHistoryEntry,
  generateMockupComment,
} from "../lib/mockupHelpers.ts";
import { addUserProposal } from "../../_shared/junctionHelpers.ts";
import { parseJsonArray } from "../../_shared/jsonUtils.ts";
import { triggerProposalMessaging } from "../../_shared/queueSync.ts";

// ─────────────────────────────────────────────────────────────
// INTERNAL TYPES
// ─────────────────────────────────────────────────────────────

interface MockGuestData {
  _id: string;
  email: string;
  "About Me / Bio"?: string;
  "need for Space"?: string;
  "special needs"?: string;
  "About - reasons to host me"?: string;
  "Rental Application"?: string;
  "Proposals List"?: string[];
}

// ─────────────────────────────────────────────────────────────
// MAIN HANDLER
// ─────────────────────────────────────────────────────────────

/**
 * Create a mockup proposal for a first-time host
 *
 * This is a NON-BLOCKING operation - failures are logged but don't
 * affect the main listing submission flow.
 */
export async function handleCreateMockup(
  payload: Record<string, unknown>,
  supabase: SupabaseClient
): Promise<CreateMockupProposalResponse | { success: false; error: string }> {
  const input = payload as unknown as CreateMockupProposalInput;
  const { listingId, hostUserId, hostEmail } = input;

  console.log("[proposal:create_mockup] ========== START ==========");
  console.log("[proposal:create_mockup] Listing:", listingId);
  console.log("[proposal:create_mockup] Host User:", hostUserId);

  try {
    // ─────────────────────────────────────────────────────────
    // Step 1: Fetch mock guest user
    // ─────────────────────────────────────────────────────────
    console.log("[proposal:create_mockup] Step 1: Fetching mock guest...");

    const { data: mockGuest, error: guestError } = await supabase
      .from("user")
      .select(
        `
        _id,
        email,
        "About Me / Bio",
        "need for Space",
        "special needs",
        "About - reasons to host me",
        "Rental Application",
        "Proposals List"
      `
      )
      .eq("email", MOCK_GUEST_EMAIL)
      .single();

    if (guestError || !mockGuest) {
      console.warn(
        "[proposal:create_mockup] Mock guest not found, skipping mockup creation"
      );
      console.warn("[proposal:create_mockup] Error:", guestError?.message);
      return { success: false, error: "Mock guest not found" };
    }

    const guestData = mockGuest as MockGuestData;
    console.log("[proposal:create_mockup] Mock guest found:", guestData._id);

    // ─────────────────────────────────────────────────────────
    // Step 2: Fetch listing data
    // ─────────────────────────────────────────────────────────
    console.log("[proposal:create_mockup] Step 2: Fetching listing data...");

    const { data: listing, error: listingError } = await supabase
      .from("listing")
      .select(
        `
        _id,
        "Name",
        "rental type",
        "Host User",
        "Days Available (List of Days)",
        "Nights Available (List of Nights) ",
        "💰Weekly Host Rate",
        "💰Monthly Host Rate",
        "💰Nightly Host Rate for 2 nights",
        "💰Nightly Host Rate for 3 nights",
        "💰Nightly Host Rate for 4 nights",
        "💰Nightly Host Rate for 5 nights",
        "💰Nightly Host Rate for 6 nights",
        "💰Nightly Host Rate for 7 nights",
        "💰Cleaning Cost / Maintenance Fee",
        "💰Damage Deposit",
        "Features - House Rules",
        "Location - Address",
        "Location - slightly different address"
      `
      )
      .eq("_id", listingId)
      .single();

    if (listingError || !listing) {
      console.error(
        "[proposal:create_mockup] Listing not found:",
        listingError?.message
      );
      return { success: false, error: "Listing not found" };
    }

    const listingData = listing as unknown as ListingData;
    const rentalType = listingData["rental type"] || "nightly";
    console.log("[proposal:create_mockup] Rental type:", rentalType);

    // ─────────────────────────────────────────────────────────
    // Step 2.5: Get host user ID from listing
    // ─────────────────────────────────────────────────────────
    console.log("[proposal:create_mockup] Step 2.5: Getting host user ID...");

    // Host User column contains user._id directly
    const resolvedHostUserId = listingData["Host User"] || hostUserId;
    console.log("[proposal:create_mockup] Host User ID:", resolvedHostUserId);

    // ─────────────────────────────────────────────────────────
    // Step 3: Calculate day/night configuration using shared helper
    // ─────────────────────────────────────────────────────────
    console.log(
      "[proposal:create_mockup] Step 3: Calculating day/night config..."
    );

    const dayNightConfig = getMockupDayNightConfig(rentalType, listingData);
    const {
      daysSelected,
      nightsSelected,
      checkIn,
      checkOut,
      nightsPerWeek,
      reservationSpanWeeks,
      reservationSpan,
    } = dayNightConfig;

    console.log("[proposal:create_mockup] Days selected:", daysSelected);
    console.log("[proposal:create_mockup] Nights selected:", nightsSelected);
    console.log(
      "[proposal:create_mockup] Reservation weeks:",
      reservationSpanWeeks
    );

    // ─────────────────────────────────────────────────────────
    // Step 4: Calculate dates
    // ─────────────────────────────────────────────────────────
    console.log("[proposal:create_mockup] Step 4: Calculating dates...");

    const { moveInStart, moveInEnd } = calculateMockupMoveInDates(checkIn);
    const moveOutDate = calculateMoveOutDate(
      moveInStart,
      reservationSpanWeeks,
      nightsPerWeek
    );

    console.log(
      "[proposal:create_mockup] Move-in start:",
      moveInStart.toISOString()
    );
    console.log(
      "[proposal:create_mockup] Move-in end:",
      moveInEnd.toISOString()
    );
    console.log("[proposal:create_mockup] Move-out:", moveOutDate.toISOString());

    // ─────────────────────────────────────────────────────────
    // Step 5: Calculate pricing using SHARED calculations
    // ─────────────────────────────────────────────────────────
    console.log("[proposal:create_mockup] Step 5: Calculating pricing...");

    const rentalTypeLower = (rentalType || "nightly").toLowerCase() as RentalType;
    const hostNightlyRate = getNightlyRateForNights(listingData, nightsPerWeek);

    const compensation = calculateCompensation(
      rentalTypeLower,
      reservationSpan as ReservationSpan,
      nightsPerWeek,
      listingData["💰Weekly Host Rate"] || 0,
      hostNightlyRate,
      reservationSpanWeeks,
      listingData["💰Monthly Host Rate"] || 0
    );

    console.log("[proposal:create_mockup] Pricing calculated:", {
      hostCompensationPerPeriod: compensation.host_compensation_per_night,
      totalHostCompensation: compensation.total_compensation,
      fourWeekRent: compensation.four_week_rent,
      fourWeekCompensation: compensation.four_week_compensation,
    });

    // ─────────────────────────────────────────────────────────
    // Step 6: Generate proposal ID
    // ─────────────────────────────────────────────────────────
    console.log("[proposal:create_mockup] Step 6: Generating proposal ID...");

    const { data: proposalId, error: idError } = await supabase.rpc(
      "generate_bubble_id"
    );
    if (idError || !proposalId) {
      console.error("[proposal:create_mockup] ID generation failed:", idError);
      return { success: false, error: "Failed to generate proposal ID" };
    }
    console.log("[proposal:create_mockup] Generated proposal ID:", proposalId);

    // ─────────────────────────────────────────────────────────
    // Step 7: Build proposal data
    // ─────────────────────────────────────────────────────────
    console.log("[proposal:create_mockup] Step 7: Building proposal data...");

    const now = new Date().toISOString();
    const historyEntry = generateMockupHistoryEntry();

    // Calculate complementary nights
    const availableNights = parseJsonArray<number>(
      listingData["Nights Available (List of Nights) "],
      "Nights Available"
    );
    const complementaryNights = calculateComplementaryNights(
      availableNights,
      nightsSelected
    );

    // Get available days for proposal
    const availableDays = parseJsonArray<number>(
      listingData["Days Available (List of Days)"],
      "Days Available"
    );

    const proposalData: Record<string, unknown> = {
      _id: proposalId,

      // Core relationships
      Listing: listingId,
      Guest: guestData._id,
      "Host User": resolvedHostUserId,
      "Created By": guestData._id,

      // Guest info (from mock guest)
      "Guest email": guestData.email,
      "Guest flexibility": "Flexible",
      "preferred gender": "any",
      "need for space":
        guestData["need for Space"] ||
        "Looking for a comfortable place to stay",
      about_yourself: guestData["About Me / Bio"] || "Split Lease Demo Guest",
      special_needs: guestData["special needs"] || null,
      Comment: generateMockupComment(guestData["About - reasons to host me"]),

      // Dates
      "Move in range start": moveInStart.toISOString(),
      "Move in range end": moveInEnd.toISOString(),
      "Move-out": moveOutDate.toISOString(),
      "move-in range (text)": `${moveInStart.toLocaleDateString(
        "en-US"
      )} - ${moveInEnd.toLocaleDateString("en-US")}`,

      // Duration
      "Reservation Span": reservationSpan,
      "Reservation Span (Weeks)": reservationSpanWeeks,
      "actual weeks during reservation span": reservationSpanWeeks,
      "duration in months": compensation.duration_months,

      // Day/Night selection (0-indexed JS format)
      "Days Selected": daysSelected,
      "Nights Selected (Nights list)": nightsSelected,
      "nights per week (num)": nightsPerWeek,
      "check in day": checkIn,
      "check out day": checkOut,
      "Days Available": availableDays.length > 0 ? availableDays : daysSelected,
      "Complementary Nights": complementaryNights,

      // Pricing - Uses shared calculateCompensation() results
      // host_compensation_per_night is the HOST'S per-period rate (monthly rate for monthly, etc.)
      "proposal nightly price": hostNightlyRate,
      "4 week rent": compensation.four_week_rent,
      "Total Price for Reservation (guest)": compensation.total_compensation,
      "Total Compensation (proposal - host)": compensation.total_compensation,
      "host compensation": compensation.host_compensation_per_night,
      "4 week compensation": compensation.four_week_compensation,
      "cleaning fee":
        listingData["💰Cleaning Cost / Maintenance Fee"] || 0,
      "damage deposit": listingData["💰Damage Deposit"] || 0,
      "nightly price for map (text)": formatPriceForDisplay(hostNightlyRate),

      // From listing
      "rental type": rentalType,
      "House Rules": listingData["Features - House Rules"],
      "Location - Address": listingData["Location - Address"],
      "Location - Address slightly different":
        listingData["Location - slightly different address"],

      // Status & metadata
      Status: "Host Review",
      "Order Ranking": 1,
      History: [historyEntry],
      "Is Finalized": false,
      Deleted: false,

      // Related records
      "rental application": guestData["Rental Application"],
      "rental app requested": false,
      "host email": hostEmail,

      // Timestamps
      "Created Date": now,
      "Modified Date": now,
    };

    // ─────────────────────────────────────────────────────────
    // Step 8: Insert proposal into Supabase
    // ─────────────────────────────────────────────────────────
    console.log("[proposal:create_mockup] Step 8: Inserting proposal...");

    const { error: insertError } = await supabase
      .from("proposal")
      .insert(proposalData);

    if (insertError) {
      console.error("[proposal:create_mockup] Insert failed:", insertError);
      return { success: false, error: `Failed to insert proposal: ${insertError.message}` };
    }
    console.log("[proposal:create_mockup] Proposal inserted successfully");

    // ─────────────────────────────────────────────────────────
    // Step 9: Update host user's Proposals List
    // ─────────────────────────────────────────────────────────
    console.log(
      "[proposal:create_mockup] Step 9: Updating host Proposals List..."
    );

    const { data: hostUser, error: hostUserError } = await supabase
      .from("user")
      .select('_id, "Proposals List"')
      .eq("_id", resolvedHostUserId)
      .single();

    if (hostUserError || !hostUser) {
      console.warn(
        "[proposal:create_mockup] Host user not found for Proposals List update"
      );
    } else {
      const currentProposals = parseJsonArray<string>(
        hostUser["Proposals List"],
        "Host Proposals List"
      );
      const updatedProposals = [...currentProposals, proposalId];

      const { error: updateError } = await supabase
        .from("user")
        .update({
          "Proposals List": updatedProposals,
          "Modified Date": now,
        })
        .eq("_id", resolvedHostUserId);

      if (updateError) {
        console.warn(
          "[proposal:create_mockup] Failed to update host Proposals List:",
          updateError
        );
      } else {
        console.log("[proposal:create_mockup] Host Proposals List updated");
      }

      // Dual-write to junction table
      await addUserProposal(supabase, resolvedHostUserId, proposalId, "host");
    }

    // ─────────────────────────────────────────────────────────
    // Step 10: Create messaging thread for host notification
    // ─────────────────────────────────────────────────────────
    console.log(
      "[proposal:create_mockup] Step 10: Triggering proposal messaging..."
    );

    triggerProposalMessaging({
      proposalId: proposalId,
      guestId: guestData._id,
      hostId: resolvedHostUserId,
      listingId: listingId,
      proposalStatus: "Host Review",
    });

    console.log("[proposal:create_mockup] ========== SUCCESS ==========");
    console.log("[proposal:create_mockup] Mockup proposal created:", proposalId);

    return {
      proposalId: proposalId,
      threadId: null, // Thread is created async by triggerProposalMessaging
      status: "Host Review",
      createdAt: now,
    };
  } catch (error) {
    // Non-blocking - log the error but don't propagate
    console.error("[proposal:create_mockup] ========== ERROR ==========");
    console.error(
      "[proposal:create_mockup] Failed to create mockup proposal:",
      error
    );
    // Return error info instead of throwing
    return {
      success: false,
      error: error instanceof Error ? error.message : "Unknown error",
    };
  }
}
