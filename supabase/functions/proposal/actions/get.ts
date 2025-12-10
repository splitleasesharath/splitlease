/**
 * Get Proposal Action
 * Split Lease - Supabase Edge Functions
 *
 * Retrieves proposal details by ID
 *
 * NO FALLBACK PRINCIPLE: All errors fail fast without fallback logic
 */

import { SupabaseClient } from "https://esm.sh/@supabase/supabase-js@2";
import { ValidationError } from "../../_shared/errors.ts";
import { GetProposalInput, ProposalData } from "../lib/types.ts";
import { getStatusDisplayName, getStatusStage, ProposalStatusName } from "../lib/status.ts";

/**
 * Response structure for get proposal
 */
interface GetProposalResponse {
  proposal: ProposalData;
  status_display: string;
  status_stage: number;
  listing?: {
    _id: string;
    Name: string;
    "Location - Address": Record<string, unknown>;
  };
  guest?: {
    _id: string;
    "Name - Full": string;
    email: string;
  };
  host?: {
    _id: string;
    "Name - Full": string;
    email: string;
  };
}

/**
 * Handle get proposal request
 */
export async function handleGet(
  payload: Record<string, unknown>,
  supabase: SupabaseClient
): Promise<GetProposalResponse> {
  console.log(`[proposal:get] Starting get request`);

  // ================================================
  // VALIDATION
  // ================================================

  const input = payload as unknown as GetProposalInput;

  if (!input.proposal_id || typeof input.proposal_id !== "string") {
    throw new ValidationError("proposal_id is required and must be a string");
  }

  console.log(`[proposal:get] Fetching proposal: ${input.proposal_id}`);

  // ================================================
  // FETCH PROPOSAL
  // ================================================

  const { data: proposal, error: proposalError } = await supabase
    .from("proposal")
    .select("*")
    .eq("_id", input.proposal_id)
    .single();

  if (proposalError || !proposal) {
    console.error(`[proposal:get] Proposal fetch failed:`, proposalError);
    throw new ValidationError(`Proposal not found: ${input.proposal_id}`);
  }

  const proposalData = proposal as unknown as ProposalData;
  console.log(`[proposal:get] Found proposal with status: ${proposalData.Status}`);

  // ================================================
  // FETCH RELATED DATA (Optional enrichment)
  // ================================================

  let listingData;
  let guestData;
  let hostData;

  // Fetch listing
  if (proposalData.Listing) {
    const listingId = proposalData.Listing;
    const { data: listing } = await supabase
      .from("listing")
      .select(`_id, Name, "Location - Address"`)
      .eq("_id", listingId)
      .single();
    listingData = listing;
  }

  // Fetch guest
  if (proposalData.Guest) {
    const { data: guest } = await supabase
      .from("user")
      .select(`_id, "Name - Full", email`)
      .eq("_id", proposalData.Guest)
      .single();
    guestData = guest;
  }

  // Fetch host (via account_host)
  if (proposalData["Host - Account"]) {
    const { data: hostAccount } = await supabase
      .from("account_host")
      .select("User")
      .eq("_id", proposalData["Host - Account"])
      .single();

    if (hostAccount?.User) {
      const { data: host } = await supabase
        .from("user")
        .select(`_id, "Name - Full", email`)
        .eq("_id", hostAccount.User)
        .single();
      hostData = host;
    }
  }

  // ================================================
  // BUILD RESPONSE
  // ================================================

  const statusName = proposalData.Status as ProposalStatusName;

  const response: GetProposalResponse = {
    proposal: proposalData,
    status_display: getStatusDisplayName(statusName),
    status_stage: getStatusStage(statusName),
  };

  if (listingData) {
    response.listing = listingData as GetProposalResponse["listing"];
  }

  if (guestData) {
    response.guest = guestData as GetProposalResponse["guest"];
  }

  if (hostData) {
    response.host = hostData as GetProposalResponse["host"];
  }

  console.log(`[proposal:get] Returning proposal with enriched data`);

  return response;
}
