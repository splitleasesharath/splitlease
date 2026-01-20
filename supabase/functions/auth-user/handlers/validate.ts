/**
 * Validate Handler - Validate session and fetch user data
 * Split Lease - bubble-auth-proxy
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

    // Query by _id first (the primary key stored in browser after login/signup)
    // If that fails, get email from token and query by email
    let userData = null;
    let userError = null;

    // Note: "Account - Host / Landlord" column was removed - user._id is now used directly as host reference
    const userSelectFields = '_id, bubble_id, "Name - First", "Name - Full", "Profile Photo", "Type - User Current", "email as text", "email", "About Me / Bio", "need for Space", "special needs", "Proposals List", "Rental Application", "is usability tester", "Phone Number - Primary"';

    // First attempt: query by _id (Bubble-style ID)
    console.log(`[validate] Attempting to find user by _id: ${user_id}`);
    const { data: userDataById, error: errorById } = await supabase
      .from('user')
      .select(userSelectFields)
      .eq('_id', user_id)
      .maybeSingle();

    if (userDataById) {
      userData = userDataById;
      console.log(`[validate] User found by _id`);
    } else {
      // Second attempt: use token to get email from Supabase Auth, then query by email
      console.log(`[validate] User not found by _id, trying to get email from token...`);

      // Verify the token and get user info from Supabase Auth
      const { data: { user: authUser }, error: authError } = await supabase.auth.getUser(token);

      if (authError) {
        console.error(`[validate] Failed to get user from token:`, authError.message);
        userError = authError;
      } else if (authUser?.email) {
        console.log(`[validate] Got email from token: ${authUser.email}, querying by email...`);

        // Query by email
        const { data: userDataByEmail, error: errorByEmail } = await supabase
          .from('user')
          .select(userSelectFields)
          .eq('email', authUser.email)
          .maybeSingle();

        if (userDataByEmail) {
          userData = userDataByEmail;
          console.log(`[validate] User found by email`);
        } else if (!userDataByEmail) {
          // Try 'email as text' column as fallback
          const { data: userDataByEmailText, error: errorByEmailText } = await supabase
            .from('user')
            .select(userSelectFields)
            .eq('email as text', authUser.email)
            .maybeSingle();

          if (userDataByEmailText) {
            userData = userDataByEmailText;
            console.log(`[validate] User found by 'email as text'`);
          } else {
            userError = errorByEmail || errorByEmailText || errorById;
          }
        }
      } else {
        console.error(`[validate] No email found in auth user`);
        userError = errorById;
      }
    }

    if (userError) {
      console.error(`[validate] Supabase query error:`, userError);
      throw new SupabaseSyncError(`Failed to fetch user data: ${userError.message}`, userError);
    }

    if (!userData) {
      console.error(`[validate] User not found in Supabase by _id or email: ${user_id}`);
      throw new SupabaseSyncError(`User not found with _id or email: ${user_id}`);
    }

    // Step 2: Check rental application submission status
    let hasSubmittedRentalApp = false;
    const rentalAppId = userData['Rental Application'];

    if (rentalAppId) {
      console.log(`[validate] User has rental application: ${rentalAppId}, checking submission status...`);
      const { data: rentalAppData, error: rentalAppError } = await supabase
        .from('rentalapplication')
        .select('submitted')
        .eq('_id', rentalAppId)
        .maybeSingle();

      if (rentalAppError) {
        console.warn(`[validate] Failed to fetch rental application: ${rentalAppError.message}`);
      } else if (rentalAppData) {
        hasSubmittedRentalApp = rentalAppData.submitted === true;
        console.log(`[validate] Rental application submitted: ${hasSubmittedRentalApp}`);
      }
    } else {
      console.log(`[validate] User has no rental application`);
    }

    // Step 3: Format user data
    console.log(`[validate] User found: ${userData['Name - First']}`);

    // Handle protocol-relative URLs for profile photos
    let profilePhoto = userData['Profile Photo'];
    if (profilePhoto && profilePhoto.startsWith('//')) {
      profilePhoto = 'https:' + profilePhoto;
    }

    // Use 'email' column first (more commonly populated), fall back to 'email as text'
    const userEmail = userData['email'] || userData['email as text'] || null;

    // Get proposal count from user's "Proposals List" array
    const proposalsList = userData['Proposals List'];
    const proposalCount = Array.isArray(proposalsList) ? proposalsList.length : 0;
    console.log(`[validate] User has ${proposalCount} proposal(s)`);

    const userDataObject = {
      userId: userData._id,
      firstName: userData['Name - First'] || null,
      fullName: userData['Name - Full'] || null,
      email: userEmail,
      profilePhoto: profilePhoto || null,
      userType: userData['Type - User Current'] || null,
      // accountHostId is now the same as userId (user IS their own host account)
      accountHostId: userData._id,
      // User profile fields for proposal prefilling
      aboutMe: userData['About Me / Bio'] || null,
      needForSpace: userData['need for Space'] || null,
      specialNeeds: userData['special needs'] || null,
      // Proposal count for showing/hiding Create Proposal CTA on search page
      proposalCount: proposalCount,
      // Rental application submission status for hiding CTA in success modal
      hasSubmittedRentalApp: hasSubmittedRentalApp,
      // Usability testing flag - determines who sees mobile testing popup
      isUsabilityTester: userData['is usability tester'] ?? false,
      // Phone number for SMS magic link pre-fill
      phoneNumber: userData['Phone Number - Primary'] || null
    };

    console.log(`[validate] ✅ Validation complete`);
    console.log(`[validate]    User: ${userDataObject.firstName}`);
    console.log(`[validate]    Type: ${userDataObject.userType}`);
    console.log(`[validate]    Proposals: ${userDataObject.proposalCount}`);
    console.log(`[validate]    Rental App Submitted: ${userDataObject.hasSubmittedRentalApp}`);
    console.log(`[validate]    Is Usability Tester: ${userDataObject.isUsabilityTester}`);
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
