/**
 * Validate Handler - Validate token and fetch user data
 * Split Lease - bubble-auth-proxy
 *
 * Flow:
 * 1. Get token and user_id from payload
 * 2. Validate token via Bubble Data API (GET /obj/user/{userId})
 * 3. If valid, fetch user data from Supabase database
 * 4. Return user profile data
 *
 * NO FALLBACK - If token invalid or user not found, operation fails
 *
 * @param bubbleAuthBaseUrl - Base URL for Bubble auth API
 * @param bubbleApiKey - API key for Bubble (NOT used - token from client is used)
 * @param supabaseUrl - Supabase project URL
 * @param supabaseServiceKey - Service role key for bypassing RLS
 * @param payload - Request payload {token, user_id}
 * @returns {userId, firstName, fullName, profilePhoto, userType}
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
  console.log('[validate] ========== TOKEN VALIDATION REQUEST ==========');

  // Validate required fields
  validateRequiredFields(payload, ['token', 'user_id']);
  const { token, user_id } = payload;

  console.log(`[validate] Validating token for user: ${user_id}`);

  try {
    // Step 1: Validate token via Bubble Data API
    const bubbleUserUrl = `${bubbleAuthBaseUrl}/obj/user/${user_id}`;
    console.log(`[validate] Step 1: Validating token via Bubble API: ${bubbleUserUrl}`);

    const bubbleResponse = await fetch(bubbleUserUrl, {
      method: 'GET',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${token}`
      }
    });

    console.log(`[validate] Bubble validation status: ${bubbleResponse.status} ${bubbleResponse.statusText}`);

    if (!bubbleResponse.ok) {
      console.error(`[validate] Token validation failed - token invalid or expired`);
      throw new BubbleApiError('Token is invalid or expired', bubbleResponse.status);
    }

    console.log(`[validate] ✅ Token is valid`);

    // Step 2: Fetch user data from Supabase
    console.log(`[validate] Step 2: Fetching user data from Supabase...`);

    const supabase = createClient(supabaseUrl, supabaseServiceKey, {
      auth: {
        autoRefreshToken: false,
        persistSession: false
      }
    });

    const { data: userData, error: userError } = await supabase
      .from('user')
      .select('_id, "Name - First", "Name - Full", "Profile Photo", "Type - User Current"')
      .eq('_id', user_id)
      .single();

    if (userError) {
      console.error(`[validate] Supabase query error:`, userError);
      throw new SupabaseSyncError(`Failed to fetch user data: ${userError.message}`, userError);
    }

    if (!userData) {
      console.error(`[validate] User not found in Supabase: ${user_id}`);
      throw new SupabaseSyncError(`User not found: ${user_id}`);
    }

    // Step 3: Format user data
    console.log(`[validate] User found: ${userData['Name - First']}`);

    // Handle protocol-relative URLs for profile photos
    let profilePhoto = userData['Profile Photo'];
    if (profilePhoto && profilePhoto.startsWith('//')) {
      profilePhoto = 'https:' + profilePhoto;
    }

    const userDataObject = {
      userId: userData._id,
      firstName: userData['Name - First'] || null,
      fullName: userData['Name - Full'] || null,
      profilePhoto: profilePhoto || null,
      userType: userData['Type - User Current'] || null
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
