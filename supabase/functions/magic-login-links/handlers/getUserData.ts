/**
 * Get User Data Handler - Get user context data for magic link attachment
 * Split Lease - magic-login-links
 *
 * Flow:
 * 1. Accept userId in payload
 * 2. Query related entities: listings, proposals, leases, threads
 * 3. Return comprehensive user context for data attachment selection
 *
 * @param supabaseUrl - Supabase project URL
 * @param supabaseServiceKey - Supabase service role key for admin operations
 * @param payload - Request payload {userId}
 * @returns {listings, proposals, leases, threads}
 */

import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';
import { BubbleApiError } from '../../_shared/errors.ts';
import { validateRequiredFields } from '../../_shared/validation.ts';

interface GetUserDataPayload {
  userId: string;
}

interface UserDataResponse {
  listings: Array<{ id: string; title: string; address: string }>;
  proposals: Array<{ id: string; listingTitle: string; status: string }>;
  leases: Array<{ id: string; listingTitle: string; status: string }>;
  threads: Array<{ id: string; subject: string; lastMessageAt: string }>;
}

export async function handleGetUserData(
  supabaseUrl: string,
  supabaseServiceKey: string,
  payload: GetUserDataPayload
): Promise<UserDataResponse> {
  console.log('[get-user-data] ========== GET USER DATA ==========');

  // Validate required fields
  validateRequiredFields(payload, ['userId']);
  const { userId } = payload;

  console.log(`[get-user-data] Fetching data for user: ${userId}`);

  // Initialize Supabase admin client
  const supabaseAdmin = createClient(supabaseUrl, supabaseServiceKey, {
    auth: {
      autoRefreshToken: false,
      persistSession: false
    }
  });

  try {
    // Fetch listings where user is owner or co-host
    const { data: listingsData, error: listingsError } = await supabaseAdmin
      .from('listing')
      .select('_id, Title, "Street Address"')
      .or(`user_id.eq.${userId},co_host_id.eq.${userId}`)
      .limit(50);

    if (listingsError) {
      console.error('[get-user-data] Listings query error:', listingsError.message);
    }

    // Fetch proposals where user is guest or host (via listing)
    const { data: proposalsData, error: proposalsError } = await supabaseAdmin
      .from('proposal')
      .select('_id, listing_id, "Proposal Status", listing!inner(Title)')
      .or(`user_id.eq.${userId},listing.user_id.eq.${userId}`)
      .limit(50);

    if (proposalsError) {
      console.error('[get-user-data] Proposals query error:', proposalsError.message);
    }

    // Fetch leases (if table exists and has user relationships)
    // Note: Lease structure may vary - adjust based on actual schema
    let leasesData: any[] = [];
    try {
      const { data, error } = await supabaseAdmin
        .from('lease')
        .select('_id, listing_id, status, listing(Title)')
        .or(`user_id.eq.${userId},host_id.eq.${userId}`)
        .limit(50);

      if (!error) {
        leasesData = data || [];
      }
    } catch (e) {
      console.log('[get-user-data] Lease table query skipped (table may not exist)');
    }

    // Fetch message threads where user is a participant
    const { data: threadsData, error: threadsError } = await supabaseAdmin
      .from('thread')
      .select('_id, subject, "Last Message At"')
      .contains('participants', [userId])
      .limit(50);

    if (threadsError) {
      console.error('[get-user-data] Threads query error:', threadsError.message);
    }

    console.log('[get-user-data] Data fetched successfully');
    console.log(`[get-user-data] Listings: ${listingsData?.length || 0}`);
    console.log(`[get-user-data] Proposals: ${proposalsData?.length || 0}`);
    console.log(`[get-user-data] Leases: ${leasesData?.length || 0}`);
    console.log(`[get-user-data] Threads: ${threadsData?.length || 0}`);

    // Transform to API response format
    const listings = (listingsData || []).map(listing => ({
      id: listing._id,
      title: listing.Title || 'Untitled Listing',
      address: listing['Street Address'] || '',
    }));

    const proposals = (proposalsData || []).map((proposal: any) => ({
      id: proposal._id,
      listingTitle: proposal.listing?.Title || 'Unknown Listing',
      status: proposal['Proposal Status'] || 'Unknown',
    }));

    const leases = leasesData.map((lease: any) => ({
      id: lease._id,
      listingTitle: lease.listing?.Title || 'Unknown Listing',
      status: lease.status || 'Unknown',
    }));

    const threads = (threadsData || []).map(thread => ({
      id: thread._id,
      subject: thread.subject || 'No Subject',
      lastMessageAt: thread['Last Message At'] || '',
    }));

    return {
      listings,
      proposals,
      leases,
      threads,
    };

  } catch (error: any) {
    if (error instanceof BubbleApiError) {
      throw error;
    }

    console.error('[get-user-data] ========== ERROR ==========');
    console.error('[get-user-data] Error:', error);

    throw new BubbleApiError(
      `Failed to get user data: ${error.message}`,
      500,
      error
    );
  }
}
