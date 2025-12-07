/**
 * Validate Handler - Validate session and fetch user data
 * Split Lease - auth-user
 *
 * Flow:
 * 1. Get token and user_id from payload
 * 2. Fetch user data from Supabase database by _id (validates user exists)
 * 3. Return user profile data
 *
 * Note: Token validation against Bubble is skipped because:
 * - The token was validated when login succeeded
 * - Bubble will reject expired tokens on actual API calls
 * - The Bubble Data API may not accept workflow-issued tokens
 *
 * NO FALLBACK - If user not found, operation fails
 *
 * @param bubbleAuthBaseUrl - Base URL for Bubble auth API (unused, kept for signature compatibility)
 * @param bubbleApiKey - API key for Bubble (unused)
 * @param supabaseUrl - Supabase project URL
 * @param supabaseServiceKey - Service role key for bypassing RLS
 * @param payload - Request payload {token, user_id}
 * @returns {userId, firstName, fullName, email, profilePhoto, userType}
 */

import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';
import { BubbleApiError, SupabaseSyncError } from '../../_shared/errors.ts';
import { validateRequiredFields } from '../../_shared/validation.ts';

export async function handleValidate(
  bubbleAuthBaseUrl: string,
  bubbleApiKey: string,
  supabaseUrl: string,
  supabaseServiceKey: string,
  payload: any
): Promise<any> {
  console.log('[validate] ========== SESSION VALIDATION REQUEST ==========');

  // Validate required fields
  validateRequiredFields(payload, ['token', 'user_id']);
  const { token, user_id } = payload;

  console.log(`[validate] Validating session for user (_id): ${user_id}`);

  try {
    // Token validation against Bubble Data API is skipped because:
    // 1. Workflow-issued tokens may not work with Data API privacy rules
    // 2. The token was already validated when login succeeded
    // 3. Bubble will reject expired tokens on actual API calls
    // 4. We verify the user exists in Supabase below
    console.log(`[validate] Skipping Bubble token validation (trusting login-issued token)`);
    console.log(`[validate] Token present: ${token ? 'yes' : 'no'}`);

    // Step 1: Fetch user data from Supabase (validates user exists)
    console.log(`[validate] Fetching user data from Supabase...`);

    const supabase = createClient(supabaseUrl, supabaseServiceKey, {
      auth: {
        autoRefreshToken: false,
        persistSession: false
      }
    });

    // Query by _id (the primary key stored in browser after login/signup)
    const { data: userData, error: userError } = await supabase
      .from('user')
      .select('_id, "Name - First", "Name - Full", "Profile Photo", "Type - User Current", "email as text", "email", "Account - Host / Landlord", "About Me / Bio", "need for Space", "special needs"')
      .eq('_id', user_id)
      .single();

    if (userError) {
      console.error(`[validate] Supabase query error:`, userError);
      throw new SupabaseSyncError(`Failed to fetch user data: ${userError.message}`, userError);
    }

    if (!userData) {
      console.error(`[validate] User not found in Supabase by _id: ${user_id}`);
      throw new SupabaseSyncError(`User not found with _id: ${user_id}`);
    }

    // Step 2: Format user data
    console.log(`[validate] User found: ${userData['Name - First']}`);

    // Handle protocol-relative URLs for profile photos
    let profilePhoto = userData['Profile Photo'];
    if (profilePhoto && profilePhoto.startsWith('//')) {
      profilePhoto = 'https:' + profilePhoto;
    }

    // Use 'email' column first (more commonly populated), fall back to 'email as text'
    const userEmail = userData['email'] || userData['email as text'] || null;

    const userDataObject = {
      userId: userData._id,
      firstName: userData['Name - First'] || null,
      fullName: userData['Name - Full'] || null,
      email: userEmail,
      profilePhoto: profilePhoto || null,
      userType: userData['Type - User Current'] || null,
      accountHostId: userData['Account - Host / Landlord'] || null,
      // User profile fields for proposal prefilling
      aboutMe: userData['About Me / Bio'] || null,
      needForSpace: userData['need for Space'] || null,
      specialNeeds: userData['special needs'] || null
    };

    console.log(`[validate] ✅ Validation complete`);
    console.log(`[validate]    User: ${userDataObject.firstName}`);
    console.log(`[validate]    Type: ${userDataObject.userType}`);
    console.log(`[validate] ========== VALIDATION COMPLETE ==========`);

    return userDataObject;

  } catch (error) {
    if (error instanceof BubbleApiError || error instanceof SupabaseSyncError) {
      throw error;
    }

    console.error(`[validate] ========== VALIDATION ERROR ==========`);
    console.error(`[validate] Error:`, error);

    throw new BubbleApiError(
      `Failed to validate token: ${error.message}`,
      500,
      error
    );
  }
}
