/**
 * Get Proposal Action
 * Split Lease - Supabase Edge Functions
 *
 * Retrieves proposal details by ID
 *
 * NO FALLBACK PRINCIPLE: All errors fail fast without fallback logic
 *
 * FP PATTERN: Separates pure data builders from effectful database operations
 * All data transformations are pure with @pure annotations
 * All database operations are explicit with @effectful annotations
 *
 * @module proposal/actions/get
 */

import { SupabaseClient } from "https://esm.sh/@supabase/supabase-js@2";
import { ValidationError } from "../../_shared/errors.ts";
import { GetProposalInput, ProposalData, ProposalStatusName } from "../lib/types.ts";
import { getStatusStage } from "../lib/status.ts";

// ─────────────────────────────────────────────────────────────
// Constants
// ─────────────────────────────────────────────────────────────

const LOG_PREFIX = '[proposal:get]'

// ─────────────────────────────────────────────────────────────
// Types
// ─────────────────────────────────────────────────────────────

interface ListingInfo {
  readonly _id: string;
  readonly Name: string;
  readonly "Location - Address": Readonly<Record<string, unknown>>;
}

interface UserInfo {
  readonly _id: string;
  readonly "Name - Full": string;
  readonly email: string;
}

interface GetProposalResponse {
  readonly proposal: ProposalData;
  readonly status_display: string;
  readonly status_stage: number;
  readonly listing?: ListingInfo;
  readonly guest?: UserInfo;
  readonly host?: UserInfo;
}

interface RelatedData {
  readonly listing: ListingInfo | null;
  readonly guest: UserInfo | null;
  readonly host: UserInfo | null;
}

// ─────────────────────────────────────────────────────────────
// Validation Predicates
// ─────────────────────────────────────────────────────────────

/**
 * Validate proposal ID is present and valid
 * @pure
 */
const isValidProposalId = (value: unknown): value is string =>
  typeof value === 'string' && value.length > 0

// ─────────────────────────────────────────────────────────────
// Pure Data Builders
// ─────────────────────────────────────────────────────────────

/**
 * Build response object from proposal and related data
 * @pure
 */
const buildResponse = (
  proposalData: ProposalData,
  relatedData: RelatedData
): GetProposalResponse => {
  const statusName = proposalData.Status as ProposalStatusName

  const response: Record<string, unknown> = {
    proposal: proposalData,
    status_display: statusName,
    status_stage: getStatusStage(statusName),
  }

  if (relatedData.listing) {
    response.listing = relatedData.listing
  }

  if (relatedData.guest) {
    response.guest = relatedData.guest
  }

  if (relatedData.host) {
    response.host = relatedData.host
  }

  return Object.freeze(response) as GetProposalResponse
}

// ─────────────────────────────────────────────────────────────
// Database Query Helpers
// ─────────────────────────────────────────────────────────────

/**
 * Fetch proposal from database
 * @effectful - Database read operation
 */
const fetchProposal = async (
  supabase: SupabaseClient,
  proposalId: string
): Promise<ProposalData> => {
  const { data: proposal, error } = await supabase
    .from("proposal")
    .select("*")
    .eq("_id", proposalId)
    .single()

  if (error || !proposal) {
    console.error(`${LOG_PREFIX} Proposal fetch failed:`, error)
    throw new ValidationError(`Proposal not found: ${proposalId}`)
  }

  return proposal as unknown as ProposalData
}

/**
 * Fetch listing info from database
 * @effectful - Database read operation
 */
const fetchListingInfo = async (
  supabase: SupabaseClient,
  listingId: string | undefined
): Promise<ListingInfo | null> => {
  if (!listingId) return null

  const { data: listing } = await supabase
    .from("listing")
    .select(`_id, Name, "Location - Address"`)
    .eq("_id", listingId)
    .single()

  return listing as ListingInfo | null
}

/**
 * Fetch user info from database
 * @effectful - Database read operation
 */
const fetchUserInfo = async (
  supabase: SupabaseClient,
  userId: string | undefined
): Promise<UserInfo | null> => {
  if (!userId) return null

  const { data: user } = await supabase
    .from("user")
    .select(`_id, "Name - Full", email`)
    .eq("_id", userId)
    .single()

  return user as UserInfo | null
}

/**
 * Fetch all related data for a proposal
 * @effectful - Multiple database read operations
 */
const fetchRelatedData = async (
  supabase: SupabaseClient,
  proposal: ProposalData
): Promise<RelatedData> => {
  const [listing, guest, host] = await Promise.all([
    fetchListingInfo(supabase, proposal.Listing),
    fetchUserInfo(supabase, proposal.Guest),
    fetchUserInfo(supabase, proposal["Host User"]),
  ])

  return Object.freeze({ listing, guest, host })
}

// ─────────────────────────────────────────────────────────────
// Main Handler
// ─────────────────────────────────────────────────────────────

/**
 * Handle get proposal request
 * @effectful - Orchestrates database operations
 */
export async function handleGet(
  payload: Record<string, unknown>,
  supabase: SupabaseClient
): Promise<GetProposalResponse> {
  console.log(`${LOG_PREFIX} Starting get request`)

  // ================================================
  // VALIDATION
  // ================================================

  const input = payload as unknown as GetProposalInput

  if (!isValidProposalId(input.proposal_id)) {
    throw new ValidationError("proposal_id is required and must be a string")
  }

  console.log(`${LOG_PREFIX} Fetching proposal: ${input.proposal_id}`)

  // ================================================
  // FETCH PROPOSAL
  // ================================================

  const proposalData = await fetchProposal(supabase, input.proposal_id)
  console.log(`${LOG_PREFIX} Found proposal with status: ${proposalData.Status}`)

  // ================================================
  // FETCH RELATED DATA
  // ================================================

  const relatedData = await fetchRelatedData(supabase, proposalData)

  // ================================================
  // BUILD RESPONSE
  // ================================================

  console.log(`${LOG_PREFIX} Returning proposal with enriched data`)

  return buildResponse(proposalData, relatedData)
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

  // Validation Predicates
  isValidProposalId,

  // Pure Data Builders
  buildResponse,

  // Database Query Helpers
  fetchProposal,
  fetchListingInfo,
  fetchUserInfo,
  fetchRelatedData,

  // Main Handler
  handleGet,
})
