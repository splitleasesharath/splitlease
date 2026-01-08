/**
 * Suggest Proposal Action
 * Split Lease - Supabase Edge Functions
 *
 * Finds and creates suggestion proposals for a guest based on:
 * - Weekly match: Listings with matching available days
 * - Same address: Other listings at the same address
 *
 * NO FALLBACK PRINCIPLE: All errors fail fast without fallback logic
 *
 * FP PATTERN: Separates pure data builders from effectful database operations
 * All data transformations are pure with @pure annotations
 * All database operations are explicit with @effectful annotations
 *
 * @module proposal/actions/suggest
 */

import { SupabaseClient } from "https://esm.sh/@supabase/supabase-js@2";
import { ValidationError } from "../../_shared/errors.ts";
import { UserContext, ListingData } from "../lib/types.ts";

// ─────────────────────────────────────────────────────────────
// Constants
// ─────────────────────────────────────────────────────────────

const LOG_PREFIX = '[proposal:suggest]'

const VALID_SUGGESTION_TYPES: readonly string[] = Object.freeze([
  "weekly_match",
  "same_address",
  "both"
])

const DEFAULT_MAX_SUGGESTIONS = 5

// ─────────────────────────────────────────────────────────────
// Types
// ─────────────────────────────────────────────────────────────

type SuggestionType = "weekly_match" | "same_address" | "both"

interface SuggestProposalInput {
  readonly origin_proposal_id: string;
  readonly suggestion_type: SuggestionType;
  readonly max_suggestions?: number;
  readonly exclude_listing_ids?: readonly string[];
}

interface SuggestProposalResponse {
  readonly origin_proposal_id: string;
  readonly suggestion_type: string;
  readonly suggestions_found: number;
  readonly suggestions_created: number;
  readonly suggestion_ids: readonly string[];
  readonly skipped_reasons: readonly string[];
}

interface OriginProposalData {
  readonly _id: string;
  readonly Listing: string;
  readonly Guest: string;
  readonly "Days Selected": readonly number[];
  readonly "Nights Selected (Nights list)": readonly number[];
  readonly "Move in range start": string;
  readonly "Move in range end": string;
  readonly "Reservation Span (Weeks)": number;
  readonly "Reservation Span": string;
  readonly "nights per week (num)": number;
  readonly "proposal nightly price": number;
  readonly "Guest flexibility": string;
  readonly "preferred gender": string;
  readonly "check in day": number;
  readonly "check out day": number;
}

interface OriginListingData {
  readonly _id: string;
  readonly "Location - Address": Readonly<Record<string, unknown>>;
  readonly "Location - slightly different address": string;
  readonly "Days Available (List of Days)": readonly number[];
  readonly "Nights Available (List of Nights) ": readonly number[];
}

interface MatchResult {
  readonly matchingListings: readonly ListingData[];
  readonly skippedReasons: readonly string[];
}

// ─────────────────────────────────────────────────────────────
// Validation Predicates
// ─────────────────────────────────────────────────────────────

/**
 * Validate proposal ID is present
 * @pure
 */
const isValidProposalId = (value: unknown): value is string =>
  typeof value === 'string' && value.length > 0

/**
 * Validate suggestion type is valid
 * @pure
 */
const isValidSuggestionType = (value: unknown): value is SuggestionType =>
  typeof value === 'string' && VALID_SUGGESTION_TYPES.includes(value)

/**
 * Validate user owns the proposal
 * @pure
 */
const isProposalOwner = (proposalGuestId: string, userId: string): boolean =>
  proposalGuestId === userId

// ─────────────────────────────────────────────────────────────
// Pure Data Transformations
// ─────────────────────────────────────────────────────────────

/**
 * Extract address from listing for matching
 * @pure
 */
const extractAddress = (listing: OriginListingData): string | null =>
  listing["Location - slightly different address"] ||
  (listing["Location - Address"] as Record<string, unknown>)?.address as string ||
  null

/**
 * Calculate overlapping days between guest selection and listing availability
 * @pure
 */
const calculateOverlappingDays = (
  guestDays: readonly number[],
  listingDays: readonly number[]
): readonly number[] =>
  Object.freeze(guestDays.filter((d) => listingDays.includes(d)))

/**
 * Check if listing has enough overlapping days
 * @pure
 */
const hasEnoughOverlap = (
  overlappingDays: readonly number[],
  requiredNights: number
): boolean =>
  overlappingDays.length >= requiredNights

/**
 * Build exclusion list from origin and input
 * @pure
 */
const buildExclusionList = (
  originListingId: string,
  inputExclusions: readonly string[] | undefined
): readonly string[] =>
  Object.freeze([originListingId, ...(inputExclusions || [])])

// ─────────────────────────────────────────────────────────────
// Pure Data Builders
// ─────────────────────────────────────────────────────────────

/**
 * Build suggestion proposal data from origin and listing
 * @pure
 */
const buildSuggestionData = (
  originProposal: OriginProposalData,
  listing: ListingData,
  suggestionType: SuggestionType
): Readonly<Record<string, unknown>> =>
  Object.freeze({
    Listing: listing._id,
    Guest: originProposal.Guest,
    "Host User": listing["Host User"],
    Status: "sl_submitted_awaiting_rental_app",
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
    "Is Suggested": true,
    "Origin Proposal": originProposal._id,
    "Suggested Reason": suggestionType,
    Deleted: false,
    "Created Date": new Date().toISOString(),
    "Modified Date": new Date().toISOString(),
  })

/**
 * Build response object
 * @pure
 */
const buildResponse = (
  originProposalId: string,
  suggestionType: SuggestionType,
  matchingCount: number,
  suggestionIds: readonly string[],
  skippedReasons: readonly string[]
): SuggestProposalResponse =>
  Object.freeze({
    origin_proposal_id: originProposalId,
    suggestion_type: suggestionType,
    suggestions_found: matchingCount,
    suggestions_created: suggestionIds.length,
    suggestion_ids: suggestionIds,
    skipped_reasons: skippedReasons,
  })

// ─────────────────────────────────────────────────────────────
// Database Query Helpers
// ─────────────────────────────────────────────────────────────

/**
 * Fetch origin proposal from database
 * @effectful - Database read operation
 */
const fetchOriginProposal = async (
  supabase: SupabaseClient,
  proposalId: string
): Promise<OriginProposalData> => {
  const { data: proposal, error } = await supabase
    .from("proposal")
    .select(`
      _id,
      Listing,
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
    .eq("_id", proposalId)
    .single()

  if (error || !proposal) {
    console.error(`${LOG_PREFIX} Origin proposal fetch failed:`, error)
    throw new ValidationError(`Origin proposal not found: ${proposalId}`)
  }

  return proposal as unknown as OriginProposalData
}

/**
 * Fetch origin listing from database
 * @effectful - Database read operation
 */
const fetchOriginListing = async (
  supabase: SupabaseClient,
  listingId: string
): Promise<OriginListingData> => {
  const { data: listing, error } = await supabase
    .from("listing")
    .select(`
      _id,
      "Location - Address",
      "Location - slightly different address",
      "Days Available (List of Days)",
      "Nights Available (List of Nights) "
    `)
    .eq("_id", listingId)
    .single()

  if (error || !listing) {
    console.error(`${LOG_PREFIX} Origin listing fetch failed:`, error)
    throw new ValidationError(`Origin listing not found: ${listingId}`)
  }

  return listing as unknown as OriginListingData
}

/**
 * Fetch weekly matching listings
 * @effectful - Database read operation
 */
const fetchWeeklyMatches = async (
  supabase: SupabaseClient,
  excludeIds: readonly string[],
  guestDays: readonly number[],
  requiredNights: number,
  maxResults: number
): Promise<{ listings: ListingData[]; error: string | null }> => {
  const { data: listings, error } = await supabase
    .from("listing")
    .select(`
      _id,
      "Host User",
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
    .not("_id", "in", `(${excludeIds.join(",")})`)

  if (error) {
    return { listings: [], error: error.message }
  }

  // Filter by overlapping days
  const matchingListings: ListingData[] = []
  for (const listing of listings || []) {
    const listingDays = listing["Days Available (List of Days)"] || []
    const overlappingDays = calculateOverlappingDays(guestDays, listingDays)

    if (hasEnoughOverlap(overlappingDays, requiredNights)) {
      matchingListings.push(listing as unknown as ListingData)
      if (matchingListings.length >= maxResults) break
    }
  }

  return { listings: matchingListings, error: null }
}

/**
 * Fetch same-address matching listings
 * @effectful - Database read operation
 */
const fetchAddressMatches = async (
  supabase: SupabaseClient,
  address: string,
  excludeIds: readonly string[],
  existingIds: ReadonlySet<string>,
  maxResults: number
): Promise<{ listings: ListingData[]; error: string | null }> => {
  const { data: listings, error } = await supabase
    .from("listing")
    .select(`
      _id,
      "Host User",
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
    .eq("Location - slightly different address", address)
    .not("_id", "in", `(${excludeIds.join(",")})`)

  if (error) {
    return { listings: [], error: error.message }
  }

  // Filter out already matched listings
  const newListings: ListingData[] = []
  for (const listing of listings || []) {
    if (!existingIds.has(listing._id)) {
      newListings.push(listing as unknown as ListingData)
      if (newListings.length >= maxResults) break
    }
  }

  return { listings: newListings, error: null }
}

/**
 * Find matching listings based on suggestion type
 * @effectful - Database read operations
 */
const findMatchingListings = async (
  supabase: SupabaseClient,
  input: SuggestProposalInput,
  originProposal: OriginProposalData,
  originListing: OriginListingData,
  excludeIds: readonly string[],
  maxSuggestions: number
): Promise<MatchResult> => {
  const matchingListings: ListingData[] = []
  const skippedReasons: string[] = []

  const guestDays = originProposal["Days Selected"] || []
  const guestNightsPerWeek = originProposal["nights per week (num)"] || guestDays.length

  // Weekly Match
  if (input.suggestion_type === "weekly_match" || input.suggestion_type === "both") {
    console.log(`${LOG_PREFIX} Searching for weekly matches...`)

    const { listings, error } = await fetchWeeklyMatches(
      supabase,
      excludeIds,
      guestDays,
      guestNightsPerWeek,
      maxSuggestions
    )

    if (error) {
      console.error(`${LOG_PREFIX} Weekly match query failed:`, error)
      skippedReasons.push(`Weekly match query error: ${error}`)
    } else {
      matchingListings.push(...listings)
      console.log(`${LOG_PREFIX} Found ${listings.length} weekly matches`)
    }
  }

  // Same Address
  if (
    (input.suggestion_type === "same_address" || input.suggestion_type === "both") &&
    matchingListings.length < maxSuggestions
  ) {
    console.log(`${LOG_PREFIX} Searching for same address matches...`)

    const originAddress = extractAddress(originListing)

    if (originAddress) {
      const existingIds = new Set(matchingListings.map((l) => l._id))
      const remainingSlots = maxSuggestions - matchingListings.length

      const { listings, error } = await fetchAddressMatches(
        supabase,
        originAddress,
        excludeIds,
        existingIds,
        remainingSlots
      )

      if (error) {
        console.error(`${LOG_PREFIX} Address match query failed:`, error)
        skippedReasons.push(`Address match query error: ${error}`)
      } else {
        matchingListings.push(...listings)
        console.log(`${LOG_PREFIX} Found ${listings.length} address matches`)
      }
    } else {
      skippedReasons.push("Origin listing has no address for matching")
    }
  }

  return Object.freeze({
    matchingListings: Object.freeze(matchingListings),
    skippedReasons: Object.freeze(skippedReasons),
  })
}

/**
 * Create suggestion proposal in database
 * @effectful - Database write operation
 */
const createSuggestionProposal = async (
  supabase: SupabaseClient,
  suggestionData: Readonly<Record<string, unknown>>
): Promise<{ id: string | null; error: string | null }> => {
  const { data: newSuggestion, error } = await supabase
    .from("proposal")
    .insert(suggestionData)
    .select("_id")
    .single()

  if (error) {
    return { id: null, error: error.message }
  }

  return { id: newSuggestion?._id || null, error: null }
}

// ─────────────────────────────────────────────────────────────
// Main Handler
// ─────────────────────────────────────────────────────────────

/**
 * Handle suggest proposal request
 * @effectful - Orchestrates multiple database operations
 */
export async function handleSuggest(
  payload: Record<string, unknown>,
  user: UserContext,
  supabase: SupabaseClient
): Promise<SuggestProposalResponse> {
  console.log(`${LOG_PREFIX} Starting suggestion generation`)

  // ================================================
  // VALIDATION
  // ================================================

  const input = payload as unknown as SuggestProposalInput

  if (!isValidProposalId(input.origin_proposal_id)) {
    throw new ValidationError("origin_proposal_id is required and must be a string")
  }

  if (!isValidSuggestionType(input.suggestion_type)) {
    throw new ValidationError(`suggestion_type must be one of: ${VALID_SUGGESTION_TYPES.join(", ")}`)
  }

  const maxSuggestions = input.max_suggestions ?? DEFAULT_MAX_SUGGESTIONS

  console.log(`${LOG_PREFIX} Origin proposal: ${input.origin_proposal_id}`)
  console.log(`${LOG_PREFIX} Type: ${input.suggestion_type}, Max: ${maxSuggestions}`)

  // ================================================
  // FETCH ORIGIN PROPOSAL
  // ================================================

  const originProposal = await fetchOriginProposal(supabase, input.origin_proposal_id)

  if (!isProposalOwner(originProposal.Guest, user.id)) {
    throw new ValidationError("You can only generate suggestions for your own proposals")
  }

  console.log(`${LOG_PREFIX} Origin listing: ${originProposal.Listing}`)

  // ================================================
  // FETCH ORIGIN LISTING
  // ================================================

  const originListing = await fetchOriginListing(supabase, originProposal.Listing)

  // ================================================
  // FIND MATCHING LISTINGS
  // ================================================

  const excludeIds = buildExclusionList(originProposal.Listing, input.exclude_listing_ids)

  const { matchingListings, skippedReasons } = await findMatchingListings(
    supabase,
    input,
    originProposal,
    originListing,
    excludeIds,
    maxSuggestions
  )

  // ================================================
  // CREATE SUGGESTION PROPOSALS
  // ================================================

  const suggestionIds: string[] = []
  const allSkippedReasons = [...skippedReasons]
  const suggestionsToCreate = matchingListings.slice(0, maxSuggestions)

  console.log(`${LOG_PREFIX} Creating ${suggestionsToCreate.length} suggestion proposals`)

  for (const listing of suggestionsToCreate) {
    const suggestionData = buildSuggestionData(originProposal, listing, input.suggestion_type)
    const { id, error } = await createSuggestionProposal(supabase, suggestionData)

    if (error) {
      console.error(`${LOG_PREFIX} Failed to create suggestion for listing ${listing._id}:`, error)
      allSkippedReasons.push(`Failed to create suggestion for listing ${listing._id}: ${error}`)
      continue
    }

    if (id) {
      suggestionIds.push(id)
      console.log(`${LOG_PREFIX} Created suggestion ${id} for listing ${listing._id}`)
    }
  }

  // ================================================
  // BUILD RESPONSE
  // ================================================

  const response = buildResponse(
    input.origin_proposal_id,
    input.suggestion_type,
    matchingListings.length,
    suggestionIds,
    allSkippedReasons
  )

  console.log(`${LOG_PREFIX} Complete: ${response.suggestions_created} suggestions created`)

  return response
}

// ─────────────────────────────────────────────────────────────
// Exported Test Constants
// ─────────────────────────────────────────────────────────────

/**
 * Exported for testing purposes
 * @test
 */
export const __test__ = Object.freeze({
  // Constants
  LOG_PREFIX,
  VALID_SUGGESTION_TYPES,
  DEFAULT_MAX_SUGGESTIONS,

  // Validation Predicates
  isValidProposalId,
  isValidSuggestionType,
  isProposalOwner,

  // Pure Data Transformations
  extractAddress,
  calculateOverlappingDays,
  hasEnoughOverlap,
  buildExclusionList,

  // Pure Data Builders
  buildSuggestionData,
  buildResponse,

  // Database Query Helpers
  fetchOriginProposal,
  fetchOriginListing,
  fetchWeeklyMatches,
  fetchAddressMatches,
  findMatchingListings,
  createSuggestionProposal,

  // Main Handler
  handleSuggest,
})
