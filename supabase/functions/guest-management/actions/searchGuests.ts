/**
 * Search Guests Action
 *
 * Search guests by name, email, or phone number.
 * Returns matching users with basic profile info.
 */

import { SupabaseClient } from "https://esm.sh/@supabase/supabase-js@2";

interface SearchGuestsPayload {
  query?: string;
  searchType?: 'name' | 'email' | 'phone' | 'all';
  limit?: number;
}

interface GuestResult {
  _id: string;
  firstName: string;
  lastName: string;
  email: string;
  phoneNumber: string;
  profilePhoto?: string;
  userType: string;
  createdAt: string;
}

export async function handleSearchGuests(
  payload: SearchGuestsPayload,
  supabase: SupabaseClient
): Promise<GuestResult[]> {
  const { query = '', searchType = 'all', limit = 20 } = payload;

  console.log(`[searchGuests] Searching for: "${query}" (type: ${searchType})`);

  if (!query || query.trim().length < 2) {
    // Return recent guests if no query
    const { data, error } = await supabase
      .from('user')
      .select('_id, "Name - First", "Name - Last", email, "Phone Number", "Profile photo"')
      .order('Modified Date', { ascending: false })
      .limit(limit);

    if (error) {
      console.error('[searchGuests] Error fetching recent guests:', error);
      throw new Error(`Failed to fetch guests: ${error.message}`);
    }

    return (data || []).map(mapUserToGuest);
  }

  // Build search query based on type
  let queryBuilder = supabase
    .from('user')
    .select('_id, "Name - First", "Name - Last", email, "Phone Number", "Profile photo", "Created Date"');

  const searchTerm = `%${query.trim()}%`;

  switch (searchType) {
    case 'name':
      queryBuilder = queryBuilder.or(`"Name - First".ilike.${searchTerm},"Name - Last".ilike.${searchTerm}`);
      break;
    case 'email':
      queryBuilder = queryBuilder.ilike('email', searchTerm);
      break;
    case 'phone':
      queryBuilder = queryBuilder.ilike('"Phone Number"', searchTerm);
      break;
    case 'all':
    default:
      queryBuilder = queryBuilder.or(
        `"Name - First".ilike.${searchTerm},"Name - Last".ilike.${searchTerm},email.ilike.${searchTerm},"Phone Number".ilike.${searchTerm}`
      );
      break;
  }

  const { data, error } = await queryBuilder.limit(limit);

  if (error) {
    console.error('[searchGuests] Search error:', error);
    throw new Error(`Search failed: ${error.message}`);
  }

  console.log(`[searchGuests] Found ${data?.length || 0} results`);

  return (data || []).map(mapUserToGuest);
}

/**
 * Map database user record to guest result format
 */
function mapUserToGuest(user: Record<string, unknown>): GuestResult {
  return {
    _id: user._id as string,
    firstName: (user['Name - First'] as string) || '',
    lastName: (user['Name - Last'] as string) || '',
    email: (user.email as string) || '',
    phoneNumber: (user['Phone Number'] as string) || '',
    profilePhoto: user['Profile photo'] as string | undefined,
    userType: 'guest',
    createdAt: (user['Created Date'] as string) || new Date().toISOString()
  };
}
