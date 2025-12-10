/**
 * Validate Handler - Validate session and fetch user data
 * Split Lease - auth-user
 *
 * Flow:
 * 1. Get token and user_id from payload
 * 2. Check if user_id is a Supabase UUID (native auth) or Bubble _id (legacy)
 * 3. For Supabase Auth: validate session token and get user from auth + database
 * 4. For Bubble Auth: fetch user data from Supabase database by _id
 * 5. Return user profile data
 *
 * Supports both:
 * - Native Supabase Auth users (UUID format user IDs)
 * - Legacy Bubble Auth users (Bubble _id format)
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

// Helper to check if a string is a valid UUID format (Supabase Auth user ID)
function isUUID(str: string): boolean {
  const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
  return uuidRegex.test(str);
}

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

  // Detect if this is a Supabase Auth user (UUID) or legacy Bubble user
  const isSupabaseAuthUser = isUUID(user_id);
  console.log(`[validate] User ID: ${user_id}`);
  console.log(`[validate] Auth type: ${isSupabaseAuthUser ? 'Supabase Auth (native)' : 'Bubble (legacy)'}`);

  const supabase = createClient(supabaseUrl, supabaseServiceKey, {
    auth: {
      autoRefreshToken: false,
      persistSession: false
    }
  });

  try {
    // Handle Supabase Auth users (native authentication)
    if (isSupabaseAuthUser) {
      console.log(`[validate] Validating Supabase Auth session...`);

      // Validate the token by getting the user from Supabase Auth
      const { data: { user: authUser }, error: authError } = await supabase.auth.getUser(token);

      if (authError || !authUser) {
        console.error(`[validate] Supabase Auth validation failed:`, authError);
        throw new BubbleApiError('Invalid or expired session', 401, authError);
      }

      console.log(`[validate] ✅ Supabase Auth session valid for: ${authUser.email}`);

      // Build user metadata from Supabase Auth
      const userMetadata = authUser.user_metadata || {};

      // Try to find user in the user table by email OR by bubble_user_id from metadata
      const bubbleUserId = userMetadata.bubble_user_id;

      let userData = null;
      let userError = null;

      // First try by email
      const { data: userByEmail, error: emailError } = await supabase
        .from('user')
        .select('_id, "Name - First", "Name - Full", "Profile Photo", "Type - User Current", "email as text", "email", "Account - Host / Landlord", "About Me / Bio", "need for Space", "special needs"')
        .eq('email', authUser.email)
        .maybeSingle();

      if (emailError) {
        console.error(`[validate] Error querying user table by email:`, emailError);
        userError = emailError;
      }

      if (userByEmail) {
        userData = userByEmail;
        console.log(`[validate] Found user by email: ${userData['Name - First'] || userData.email}`);
      } else if (bubbleUserId) {
        // Try by bubble_user_id from metadata
        console.log(`[validate] User not found by email, trying bubble_user_id: ${bubbleUserId}`);
        const { data: userByBubbleId, error: bubbleIdError } = await supabase
          .from('user')
          .select('_id, "Name - First", "Name - Full", "Profile Photo", "Type - User Current", "email as text", "email", "Account - Host / Landlord", "About Me / Bio", "need for Space", "special needs"')
          .eq('_id', bubbleUserId)
          .maybeSingle();

        if (bubbleIdError) {
          console.error(`[validate] Error querying user table by bubble_user_id:`, bubbleIdError);
        }

        if (userByBubbleId) {
          userData = userByBubbleId;
          console.log(`[validate] Found user by bubble_user_id: ${userData['Name - First']}`);
        }
      }

      // If user found in user table, merge data
      if (userData) {
        console.log(`[validate] Found user in database: ${userData['Name - First'] || userData.email}`);

        let profilePhoto = userData['Profile Photo'];
        if (profilePhoto && profilePhoto.startsWith('//')) {
          profilePhoto = 'https:' + profilePhoto;
        }

        // Fetch proposal count for this user (to determine if first proposal)
        let proposalCount = 0;
        const bubbleUserIdForProposals = userData._id || user_id;
        console.log(`[validate] Querying proposals for user ID: ${bubbleUserIdForProposals}`);
        if (bubbleUserIdForProposals) {
          const { count, error: countError } = await supabase
            .from('proposal')
            .select('*', { count: 'exact', head: true })
            .eq('Guest', bubbleUserIdForProposals);

          console.log(`[validate] Proposal query result - count: ${count}, error: ${countError ? countError.message : 'none'}`);
          if (countError) {
            console.warn(`[validate] Could not fetch proposal count:`, countError);
          } else {
            proposalCount = count ?? 0;
            console.log(`[validate] User has ${proposalCount} proposal(s)`);
          }
        } else {
          console.log(`[validate] No bubbleUserId available, skipping proposal count`);
        }

        const userDataObject = {
          userId: userData._id || user_id,
          supabaseUserId: authUser.id,
          firstName: userData['Name - First'] || userMetadata.first_name || null,
          fullName: userData['Name - Full'] || userMetadata.full_name || null,
          email: userData['email'] || userData['email as text'] || authUser.email,
          profilePhoto: profilePhoto || null,
          userType: userData['Type - User Current'] || userMetadata.user_type || null,
          accountHostId: userData['Account - Host / Landlord'] || null,
          aboutMe: userData['About Me / Bio'] || null,
          needForSpace: userData['need for Space'] || null,
          specialNeeds: userData['special needs'] || null,
          proposalCount: proposalCount
        };

        console.log(`[validate] ✅ Validation complete (Supabase Auth + DB)`);
        console.log(`[validate]    User: ${userDataObject.firstName || userDataObject.email}`);
        console.log(`[validate]    Type: ${userDataObject.userType}`);
        console.log(`[validate]    Proposals: ${proposalCount}`);
        console.log(`[validate] ========== VALIDATION COMPLETE ==========`);

        return userDataObject;
      }

      // User not in user table yet - return data from Supabase Auth only
      // This is a new user, so proposalCount = 0
      console.log(`[validate] User not found in database, using Supabase Auth data`);

      const userDataObject = {
        userId: user_id,
        supabaseUserId: authUser.id,
        firstName: userMetadata.first_name || null,
        fullName: userMetadata.full_name || null,
        email: authUser.email,
        profilePhoto: null,
        userType: userMetadata.user_type || null,
        accountHostId: null,
        aboutMe: null,
        needForSpace: null,
        specialNeeds: null,
        proposalCount: 0
      };

      console.log(`[validate] ✅ Validation complete (Supabase Auth only)`);
      console.log(`[validate]    Email: ${userDataObject.email}`);
      console.log(`[validate]    Type: ${userDataObject.userType}`);
      console.log(`[validate]    Proposals: 0 (new user)`);
      console.log(`[validate] ========== VALIDATION COMPLETE ==========`);

      return userDataObject;
    }

    // Handle legacy Bubble Auth users
    console.log(`[validate] Validating legacy Bubble session...`);
    console.log(`[validate] Token present: ${token ? 'yes' : 'no'}`);

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

    // Format user data
    console.log(`[validate] User found: ${userData['Name - First']}`);

    // Handle protocol-relative URLs for profile photos
    let profilePhoto = userData['Profile Photo'];
    if (profilePhoto && profilePhoto.startsWith('//')) {
      profilePhoto = 'https:' + profilePhoto;
    }

    // Use 'email' column first (more commonly populated), fall back to 'email as text'
    const userEmail = userData['email'] || userData['email as text'] || null;

    // Fetch proposal count for this user (to determine if first proposal)
    let proposalCount = 0;
    console.log(`[validate] Querying proposals for legacy user ID: ${userData._id}`);
    if (userData._id) {
      const { count, error: countError } = await supabase
        .from('proposal')
        .select('*', { count: 'exact', head: true })
        .eq('Guest', userData._id);

      console.log(`[validate] Proposal query result - count: ${count}, error: ${countError ? countError.message : 'none'}`);
      if (countError) {
        console.warn(`[validate] Could not fetch proposal count:`, countError);
      } else {
        proposalCount = count ?? 0;
        console.log(`[validate] User has ${proposalCount} proposal(s)`);
      }
    } else {
      console.log(`[validate] No userData._id available, skipping proposal count`);
    }

    const userDataObject = {
      userId: userData._id,
      firstName: userData['Name - First'] || null,
      fullName: userData['Name - Full'] || null,
      email: userEmail,
      profilePhoto: profilePhoto || null,
      userType: userData['Type - User Current'] || null,
      accountHostId: userData['Account - Host / Landlord'] || null,
      aboutMe: userData['About Me / Bio'] || null,
      needForSpace: userData['need for Space'] || null,
      specialNeeds: userData['special needs'] || null,
      proposalCount: proposalCount
    };

    console.log(`[validate] ✅ Validation complete (Bubble legacy)`);
    console.log(`[validate]    User: ${userDataObject.firstName}`);
    console.log(`[validate]    Type: ${userDataObject.userType}`);
    console.log(`[validate]    Proposals: ${proposalCount}`);
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
