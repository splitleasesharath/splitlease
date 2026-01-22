/**
 * Get Emergency By ID Handler
 * Split Lease - Emergency Edge Function
 *
 * Fetches a single emergency with full details including messages and emails
 */

import { SupabaseClient } from "https://esm.sh/@supabase/supabase-js@2";

interface GetByIdPayload {
  id: string;
}

export async function handleGetById(
  payload: GetByIdPayload,
  supabase: SupabaseClient
): Promise<unknown> {
  console.log('[emergency:getById] Fetching emergency:', payload.id);

  const { id } = payload;

  if (!id) {
    throw new Error('Emergency ID is required');
  }

  // Fetch emergency
  const { data: emergency, error } = await supabase
    .from('emergency_report')
    .select('*')
    .eq('id', id)
    .single();

  if (error) {
    console.error('[emergency:getById] Query error:', error);
    throw new Error(`Failed to fetch emergency: ${error.message}`);
  }

  if (!emergency) {
    throw new Error(`Emergency not found: ${id}`);
  }

  // Fetch related data
  const [
    proposal,
    reportedBy,
    assignedTo,
    messages,
    emails,
  ] = await Promise.all([
    emergency.proposal_id ? fetchProposal(emergency.proposal_id, supabase) : null,
    emergency.reported_by_user_id ? fetchUser(emergency.reported_by_user_id, supabase) : null,
    emergency.assigned_to_user_id ? fetchUser(emergency.assigned_to_user_id, supabase) : null,
    fetchMessages(id, supabase),
    fetchEmails(id, supabase),
  ]);

  // Fetch listing if proposal exists
  const listing = proposal?.Listing ? await fetchListing(proposal.Listing, supabase) : null;

  // Fetch guest user if proposal has guest
  const guest = proposal?.Guest ? await fetchUser(proposal.Guest, supabase) : null;

  console.log('[emergency:getById] Emergency fetched with relations');

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
    guest: guest ? {
      _id: guest._id,
      email: guest.email,
      firstName: guest['First name'],
      lastName: guest['Last name'],
      phone: guest['Phone number'],
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
    messages,
    emails,
  };
}

async function fetchProposal(proposalId: string, supabase: SupabaseClient): Promise<Record<string, unknown> | null> {
  const { data, error } = await supabase
    .from('proposal')
    .select('_id, "Agreement #", "Guest", "Listing", "Move in", "Move out"')
    .eq('_id', proposalId)
    .single();

  if (error) {
    console.warn('[emergency:getById] Proposal fetch warning:', error.message);
    return null;
  }
  return data;
}

async function fetchUser(userId: string, supabase: SupabaseClient): Promise<Record<string, unknown> | null> {
  const { data, error } = await supabase
    .from('user')
    .select('_id, email, "First name", "Last name", "Phone number", admin')
    .eq('_id', userId)
    .single();

  if (error) {
    console.warn('[emergency:getById] User fetch warning:', error.message);
    return null;
  }
  return data;
}

async function fetchListing(listingId: string, supabase: SupabaseClient): Promise<Record<string, unknown> | null> {
  const { data, error } = await supabase
    .from('listing')
    .select('_id, Name, "Street address", "City/Town"')
    .eq('_id', listingId)
    .single();

  if (error) {
    console.warn('[emergency:getById] Listing fetch warning:', error.message);
    return null;
  }
  return data;
}

async function fetchMessages(emergencyId: string, supabase: SupabaseClient): Promise<unknown[]> {
  const { data, error } = await supabase
    .from('emergency_message')
    .select('*')
    .eq('emergency_report_id', emergencyId)
    .order('created_at', { ascending: false });

  if (error) {
    console.warn('[emergency:getById] Messages fetch warning:', error.message);
    return [];
  }
  return data || [];
}

async function fetchEmails(emergencyId: string, supabase: SupabaseClient): Promise<unknown[]> {
  const { data, error } = await supabase
    .from('emergency_email_log')
    .select('*')
    .eq('emergency_report_id', emergencyId)
    .order('created_at', { ascending: false });

  if (error) {
    console.warn('[emergency:getById] Emails fetch warning:', error.message);
    return [];
  }
  return data || [];
}
