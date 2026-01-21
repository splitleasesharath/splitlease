/**
 * List Users Handler - Search and list users for magic link generation
 * Split Lease - magic-login-links
 *
 * Flow:
 * 1. Accept optional search text and limit parameters
 * 2. Query public.user table with optional filtering
 * 3. Return user list with essential fields for display
 *
 * @param supabaseUrl - Supabase project URL
 * @param supabaseServiceKey - Supabase service role key for admin operations
 * @param payload - Request payload {searchText?, limit?}
 * @returns {users: Array<{id, email, firstName, lastName, phone, userType, profilePhoto}>}
 */

import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';
import { BubbleApiError } from '../../_shared/errors.ts';

interface ListUsersPayload {
  searchText?: string;
  limit?: number;
}

interface UserRecord {
  _id: string;
  'email as text': string | null;
  'Name - First': string | null;
  'Name - Last': string | null;
  'Phone Number (as text)': string | null;
  'Type - User Current': string | null;
  'Profile Photo': string | null;
}

interface UserListItem {
  id: string;
  email: string;
  firstName: string;
  lastName: string;
  phone: string;
  userType: string;
  profilePhoto: string;
}

export async function handleListUsers(
  supabaseUrl: string,
  supabaseServiceKey: string,
  payload: ListUsersPayload
): Promise<{ users: UserListItem[] }> {
  console.log('[list-users] ========== LIST USERS ==========');

  const { searchText, limit = 50 } = payload;

  console.log(`[list-users] Search text: ${searchText || '(none)'}`);
  console.log(`[list-users] Limit: ${limit}`);

  // Initialize Supabase admin client
  const supabaseAdmin = createClient(supabaseUrl, supabaseServiceKey, {
    auth: {
      autoRefreshToken: false,
      persistSession: false
    }
  });

  try {
    // Build query with optional search filtering
    let query = supabaseAdmin
      .from('user')
      .select('_id, "email as text", "Name - First", "Name - Last", "Phone Number (as text)", "Type - User Current", "Profile Photo"')
      .order('Name - First', { ascending: true })
      .limit(limit);

    // Apply search filter if provided
    if (searchText && searchText.trim().length > 0) {
      const searchPattern = `%${searchText.trim()}%`;
      query = query.or(
        `"email as text".ilike.${searchPattern},"Name - First".ilike.${searchPattern},"Name - Last".ilike.${searchPattern},"Phone Number (as text)".ilike.${searchPattern}`
      );
    }

    const { data, error } = await query;

    if (error) {
      console.error('[list-users] Query error:', error.message);
      throw new BubbleApiError(
        `Failed to list users: ${error.message}`,
        500
      );
    }

    console.log(`[list-users] Found ${data?.length || 0} users`);

    // Transform database records to API response format
    const users: UserListItem[] = (data as UserRecord[] || []).map(user => ({
      id: user._id,
      email: user['email as text'] || '',
      firstName: user['Name - First'] || '',
      lastName: user['Name - Last'] || '',
      phone: user['Phone Number (as text)'] || '',
      userType: user['Type - User Current'] || '',
      profilePhoto: user['Profile Photo'] || '',
    }));

    return { users };

  } catch (error: any) {
    if (error instanceof BubbleApiError) {
      throw error;
    }

    console.error('[list-users] ========== ERROR ==========');
    console.error('[list-users] Error:', error);

    throw new BubbleApiError(
      `Failed to list users: ${error.message}`,
      500,
      error
    );
  }
}
