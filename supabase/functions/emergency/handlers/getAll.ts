/**
 * Get All Emergencies Handler
 * Split Lease - Emergency Edge Function
 *
 * Fetches all emergencies with optional filters and related data
 */

import { SupabaseClient } from "https://esm.sh/@supabase/supabase-js@2";

interface GetAllPayload {
  status?: string;
  assignedTo?: string;
  includeHidden?: boolean;
  limit?: number;
  offset?: number;
}

export async function handleGetAll(
  payload: GetAllPayload,
  supabase: SupabaseClient
): Promise<unknown[]> {
  console.log('[emergency:getAll] Fetching emergencies with filters:', payload);

  const { status, assignedTo, includeHidden = false, limit = 100, offset = 0 } = payload;

  // Build query
  let query = supabase
    .from('emergency_report')
    .select(`
      *
    `)
    .order('created_at', { ascending: false })
    .range(offset, offset + limit - 1);

  // Apply filters
  if (status) {
    query = query.eq('status', status);
  }

  if (assignedTo) {
    query = query.eq('assigned_to_user_id', assignedTo);
  }

  if (!includeHidden) {
    query = query.eq('is_hidden', false);
  }

  const { data, error } = await query;

  if (error) {
    console.error('[emergency:getAll] Query error:', error);
    throw new Error(`Failed to fetch emergencies: ${error.message}`);
  }

  console.log('[emergency:getAll] Found', data?.length || 0, 'emergencies');

  // Enrich with related data
  const enrichedData = await enrichEmergencies(data || [], supabase);

  return enrichedData;
}

/**
 * Enrich emergencies with proposal, listing, and user data
 */
async function enrichEmergencies(
  emergencies: unknown[],
  supabase: SupabaseClient
): Promise<unknown[]> {
  if (emergencies.length === 0) return [];

  // Collect unique IDs for batch lookups
  const proposalIds = new Set<string>();
  const userIds = new Set<string>();

  for (const emergency of emergencies as Array<Record<string, unknown>>) {
    if (emergency.proposal_id) proposalIds.add(emergency.proposal_id as string);
    if (emergency.reported_by_user_id) userIds.add(emergency.reported_by_user_id as string);
    if (emergency.assigned_to_user_id) userIds.add(emergency.assigned_to_user_id as string);
  }

  // Batch fetch proposals
  const proposalMap = new Map();
  if (proposalIds.size > 0) {
    const { data: proposals } = await supabase
      .from('proposal')
      .select('_id, "Agreement #", "Guest", "Listing", "Move in", "Move out"')
      .in('_id', Array.from(proposalIds));

    if (proposals) {
      for (const p of proposals) {
        proposalMap.set(p._id, p);
      }
    }
  }

  // Batch fetch users
  const userMap = new Map();
  if (userIds.size > 0) {
    const { data: users } = await supabase
      .from('user')
      .select('_id, email, "First name", "Last name", "Phone number", admin')
      .in('_id', Array.from(userIds));

    if (users) {
      for (const u of users) {
        userMap.set(u._id, u);
      }
    }
  }

  // Batch fetch listings from proposals
  const listingIds = new Set<string>();
  for (const [, proposal] of proposalMap) {
    if (proposal.Listing) listingIds.add(proposal.Listing);
  }

  const listingMap = new Map();
  if (listingIds.size > 0) {
    const { data: listings } = await supabase
      .from('listing')
      .select('_id, Name, "Street address", "City/Town"')
      .in('_id', Array.from(listingIds));

    if (listings) {
      for (const l of listings) {
        listingMap.set(l._id, l);
      }
    }
  }

  // Enrich emergencies
  return (emergencies as Array<Record<string, unknown>>).map(emergency => {
    const proposal = proposalMap.get(emergency.proposal_id);
    const reportedBy = userMap.get(emergency.reported_by_user_id);
    const assignedTo = userMap.get(emergency.assigned_to_user_id);
    const listing = proposal ? listingMap.get(proposal.Listing) : null;

    return {
      ...emergency,
      proposal: proposal ? {
        _id: proposal._id,
        agreementNumber: proposal['Agreement #'],
        guestId: proposal.Guest,
        listingId: proposal.Listing,
        moveIn: proposal['Move in'],
        moveOut: proposal['Move out'],
      } : null,
      listing: listing ? {
        _id: listing._id,
        name: listing.Name,
        streetAddress: listing['Street address'],
        city: listing['City/Town'],
      } : null,
      reportedBy: reportedBy ? {
        _id: reportedBy._id,
        email: reportedBy.email,
        firstName: reportedBy['First name'],
        lastName: reportedBy['Last name'],
        phone: reportedBy['Phone number'],
      } : null,
      assignedTo: assignedTo ? {
        _id: assignedTo._id,
        email: assignedTo.email,
        firstName: assignedTo['First name'],
        lastName: assignedTo['Last name'],
        phone: assignedTo['Phone number'],
      } : null,
    };
  });
}
