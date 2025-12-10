/**
 * Suggest Proposal Action
 * Split Lease - Supabase Edge Functions
 *
 * Finds and creates suggestion proposals for a guest based on:
 * - Weekly match: Listings with matching available days
 * - Same address: Other listings at the same address
 *
 * NO FALLBACK PRINCIPLE: All errors fail fast without fallback logic
 */

import { SupabaseClient } from "https://esm.sh/@supabase/supabase-js@2";
import { ValidationError } from "../../_shared/errors.ts";
import { UserContext, CreateProposalInput, ListingData } from "../lib/types.ts";
import { adaptDaysFromBubble } from "../lib/dayConversion.ts";

// ─────────────────────────────────────────────────────────────
// INPUT TYPE
// ─────────────────────────────────────────────────────────────

interface SuggestProposalInput {
  // Reference proposal to base suggestions on
  origin_proposal_id: string;

  // Suggestion type
  suggestion_type: "weekly_match" | "same_address" | "both";

  // Optional filters
  max_suggestions?: number;
  exclude_listing_ids?: string[];
}

// ─────────────────────────────────────────────────────────────
// RESPONSE TYPE
// ─────────────────────────────────────────────────────────────

interface SuggestProposalResponse {
  origin_proposal_id: string;
  suggestion_type: string;
  suggestions_found: number;
  suggestions_created: number;
  suggestion_ids: string[];
  skipped_reasons: string[];
}

// ─────────────────────────────────────────────────────────────
// MAIN HANDLER
// ─────────────────────────────────────────────────────────────

export async function handleSuggest(
  payload: Record<string, unknown>,
  user: UserContext,
  supabase: SupabaseClient
): Promise<SuggestProposalResponse> {
  console.log(`[proposal:suggest] Starting suggestion generation`);

  // ================================================
  // VALIDATION
  // ================================================

  const input = payload as unknown as SuggestProposalInput;

  if (!input.origin_proposal_id || typeof input.origin_proposal_id !== "string") {
    throw new ValidationError("origin_proposal_id is required and must be a string");
  }

  if (!input.suggestion_type) {
    throw new ValidationError("suggestion_type is required (weekly_match, same_address, or both)");
  }

  const validTypes = ["weekly_match", "same_address", "both"];
  if (!validTypes.includes(input.suggestion_type)) {
    throw new ValidationError(`suggestion_type must be one of: ${validTypes.join(", ")}`);
  }

  const maxSuggestions = input.max_suggestions ?? 5;
  const excludeListingIds = input.exclude_listing_ids ?? [];

  console.log(`[proposal:suggest] Origin proposal: ${input.origin_proposal_id}`);
  console.log(`[proposal:suggest] Type: ${input.suggestion_type}, Max: ${maxSuggestions}`);

  // ================================================
  // FETCH ORIGIN PROPOSAL
  // ================================================

  const { data: originProposal, error: proposalError } = await supabase
    .from("proposal")
    .select(`
      _id,
      "Listing ",
      Guest,
      "Days Selected",
      "Nights Selected (Nights list)",
      "Move in range start",
      "Move in range end",
      "Reservation Span (Weeks)",
      "Reservation Span",
      "nights per week (num)",
      "proposal nightly price",
      "Guest flexibility",
      "preferred gender",
      "check in day",
      "check out day"
    `)
    .eq("_id", input.origin_proposal_id)
    .single();

  if (proposalError || !originProposal) {
    console.error(`[proposal:suggest] Origin proposal fetch failed:`, proposalError);
    throw new ValidationError(`Origin proposal not found: ${input.origin_proposal_id}`);
  }

  // Verify user owns this proposal
  if (originProposal.Guest !== user.id) {
    throw new ValidationError("You can only generate suggestions for your own proposals");
  }

  console.log(`[proposal:suggest] Origin listing: ${originProposal["Listing "]}`);

  // ================================================
  // FETCH ORIGIN LISTING (for address matching)
  // ================================================

  const { data: originListing, error: listingError } = await supabase
    .from("listing")
    .select(`
      _id,
      "Location - Address",
      "Location - slightly different address",
      "Days Available (List of Days)",
      "Nights Available (List of Nights) "
    `)
    .eq("_id", originProposal["Listing "])
    .single();

  if (listingError || !originListing) {
    console.error(`[proposal:suggest] Origin listing fetch failed:`, listingError);
    throw new ValidationError(`Origin listing not found: ${originProposal["Listing "]}`);
  }

  // ================================================
  // FIND MATCHING LISTINGS
  // ================================================

  const matchingListings: ListingData[] = [];
  const skippedReasons: string[] = [];

  // Exclude origin listing and any specified exclusions
  const excludeIds = [originProposal["Listing "], ...excludeListingIds];

  // Get guest's selected days (convert from Bubble format)
  const guestDaysJS = adaptDaysFromBubble(originProposal["Days Selected"] || []);
  const guestNightsPerWeek = originProposal["nights per week (num)"] || guestDaysJS.length;

  // Weekly Match: Find listings with overlapping available days
  if (input.suggestion_type === "weekly_match" || input.suggestion_type === "both") {
    console.log(`[proposal:suggest] Searching for weekly matches...`);

    // Fetch active listings with available days
    const { data: weeklyMatches, error: weeklyError } = await supabase
      .from("listing")
      .select(`
        _id,
        "Host / Landlord",
        "rental type",
        "Days Available (List of Days)",
        "Nights Available (List of Nights) ",
        "Location - Address",
        "Location - slightly different address",
        "Features - House Rules",
        "💰Cleaning Cost / Maintenance Fee",
        "💰Damage Deposit",
        "Weeks offered",
        "💰Weekly Host Rate",
        "💰Nightly Host Rate for 2 nights",
        "💰Nightly Host Rate for 3 nights",
        "💰Nightly Host Rate for 4 nights",
        "💰Nightly Host Rate for 5 nights",
        "💰Nightly Host Rate for 7 nights",
        "💰Monthly Host Rate"
      `)
      .eq("Is Live", true)
      .eq("Deleted", false)
      .not("_id", "in", `(${excludeIds.join(",")})`);

    if (weeklyError) {
      console.error(`[proposal:suggest] Weekly match query failed:`, weeklyError);
      skippedReasons.push(`Weekly match query error: ${weeklyError.message}`);
    } else if (weeklyMatches) {
      for (const listing of weeklyMatches) {
        // Check if listing has overlapping available days
        const listingDaysJS = adaptDaysFromBubble(listing["Days Available (List of Days)"] || []);
        const overlappingDays = guestDaysJS.filter((d) => listingDaysJS.includes(d));

        if (overlappingDays.length >= guestNightsPerWeek) {
          matchingListings.push(listing as unknown as ListingData);
          if (matchingListings.length >= maxSuggestions) break;
        }
      }
      console.log(`[proposal:suggest] Found ${matchingListings.length} weekly matches`);
    }
  }

  // Same Address: Find other listings at the same address
  if (
    (input.suggestion_type === "same_address" || input.suggestion_type === "both") &&
    matchingListings.length < maxSuggestions
  ) {
    console.log(`[proposal:suggest] Searching for same address matches...`);

    // Extract address for matching
    const originAddress = originListing["Location - slightly different address"] ||
      (originListing["Location - Address"] as Record<string, unknown>)?.address;

    if (originAddress) {
      const { data: addressMatches, error: addressError } = await supabase
        .from("listing")
        .select(`
          _id,
          "Host / Landlord",
          "rental type",
          "Days Available (List of Days)",
          "Nights Available (List of Nights)",
          "Location - Address",
          "Location - slightly different address",
          "Features - House Rules",
          "💰Cleaning Cost / Maintenance Fee",
          "💰Damage Deposit",
          "Weeks offered",
          "💰Weekly Host Rate",
          "💰Nightly Host Rate for 2 nights",
          "💰Nightly Host Rate for 3 nights",
          "💰Nightly Host Rate for 4 nights",
          "💰Nightly Host Rate for 5 nights",
          "💰Nightly Host Rate for 7 nights",
          "💰Monthly Host Rate"
        `)
        .eq("Is Live", true)
        .eq("Deleted", false)
        .eq("Location - slightly different address", originAddress)
        .not("_id", "in", `(${excludeIds.join(",")})`);

      if (addressError) {
        console.error(`[proposal:suggest] Address match query failed:`, addressError);
        skippedReasons.push(`Address match query error: ${addressError.message}`);
      } else if (addressMatches) {
        const existingIds = new Set(matchingListings.map((l) => l._id));
        for (const listing of addressMatches) {
          if (!existingIds.has(listing._id)) {
            matchingListings.push(listing as unknown as ListingData);
            if (matchingListings.length >= maxSuggestions) break;
          }
        }
        console.log(`[proposal:suggest] Found ${addressMatches.length} address matches`);
      }
    } else {
      skippedReasons.push("Origin listing has no address for matching");
    }
  }

  // ================================================
  // CREATE SUGGESTION PROPOSALS
  // ================================================

  const suggestionIds: string[] = [];
  const suggestionsToCreate = matchingListings.slice(0, maxSuggestions);

  console.log(`[proposal:suggest] Creating ${suggestionsToCreate.length} suggestion proposals`);

  for (const listing of suggestionsToCreate) {
    try {
      // Create suggestion proposal with reference to origin
      const suggestionData = {
        "Listing ": listing._id,  // Note: trailing space in column name
        Guest: originProposal.Guest,
        "Host - Account": listing["Host / Landlord"],
        Status: "sl_submitted_awaiting_rental_app", // Default for suggestions
        "Days Selected": originProposal["Days Selected"],
        "Nights Selected (Nights list)": originProposal["Nights Selected (Nights list)"],
        "Move in range start": originProposal["Move in range start"],
        "Move in range end": originProposal["Move in range end"],
        "Reservation Span (Weeks)": originProposal["Reservation Span (Weeks)"],
        "Reservation Span": originProposal["Reservation Span"],
        "nights per week (num)": originProposal["nights per week (num)"],
        "proposal nightly price": originProposal["proposal nightly price"],
        "Guest flexibility": originProposal["Guest flexibility"],
        "preferred gender": originProposal["preferred gender"],
        "check in day": originProposal["check in day"],
        "check out day": originProposal["check out day"],
        "cleaning fee": listing["💰Cleaning Cost / Maintenance Fee"] || 0,
        "damage deposit": listing["💰Damage Deposit"] || 0,
        // Mark as suggestion
        "Is Suggested": true,
        "Origin Proposal": input.origin_proposal_id,
        "Suggested Reason": input.suggestion_type,
        Deleted: false,
        "Created Date": new Date().toISOString(),
        "Modified Date": new Date().toISOString(),
      };

      const { data: newSuggestion, error: createError } = await supabase
        .from("proposal")
        .insert(suggestionData)
        .select("_id")
        .single();

      if (createError) {
        console.error(`[proposal:suggest] Failed to create suggestion for listing ${listing._id}:`, createError);
        skippedReasons.push(`Failed to create suggestion for listing ${listing._id}: ${createError.message}`);
        continue;
      }

      if (newSuggestion) {
        suggestionIds.push(newSuggestion._id);
        console.log(`[proposal:suggest] Created suggestion ${newSuggestion._id} for listing ${listing._id}`);
      }
    } catch (error) {
      console.error(`[proposal:suggest] Error creating suggestion:`, error);
      skippedReasons.push(`Error creating suggestion: ${String(error)}`);
    }
  }

  // ================================================
  // BUILD RESPONSE
  // ================================================

  const response: SuggestProposalResponse = {
    origin_proposal_id: input.origin_proposal_id,
    suggestion_type: input.suggestion_type,
    suggestions_found: matchingListings.length,
    suggestions_created: suggestionIds.length,
    suggestion_ids: suggestionIds,
    skipped_reasons: skippedReasons,
  };

  console.log(`[proposal:suggest] Complete: ${response.suggestions_created} suggestions created`);

  return response;
}
