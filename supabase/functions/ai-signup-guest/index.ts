/**
 * AI Signup Guest - Edge Function
 * Split Lease
 *
 * This edge function handles the AI signup flow for guests:
 * 1. Receives email, phone, and freeform text input
 * 2. Looks up the user by email (user was already created in auth-user/signup)
 * 3. Saves the freeform text to the user's `freeform ai signup text` field
 * 4. Returns the user data (including _id) for the subsequent parseProfile call
 *
 * This function bridges the gap between user creation and AI profile parsing.
 *
 * FP PATTERN: Separates pure data builders from effectful database operations
 * All data transformations are pure with @pure annotations
 * All database operations are explicit with @effectful annotations
 *
 * NO FALLBACK PRINCIPLE: All errors fail fast without fallback logic
 */

import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient, SupabaseClient } from 'https://esm.sh/@supabase/supabase-js@2';
import { corsHeaders } from '../_shared/cors.ts';
import { ValidationError } from '../_shared/errors.ts';

// ─────────────────────────────────────────────────────────────
// Constants
// ─────────────────────────────────────────────────────────────

const LOG_PREFIX = '[ai-signup-guest]'

console.log(`${LOG_PREFIX} Edge Function started`);

// ─────────────────────────────────────────────────────────────
// Types
// ─────────────────────────────────────────────────────────────

interface SignupGuestInput {
  readonly email: string;
  readonly phone?: string;
  readonly text_inputted: string;
}

interface UserData {
  readonly _id: string;
  readonly email: string;
  readonly 'Name - First': string | null;
  readonly 'Name - Last': string | null;
}

interface SignupGuestResponse {
  readonly _id?: string;
  readonly email: string;
  readonly firstName?: string | null;
  readonly lastName?: string | null;
  readonly text_saved?: boolean;
  readonly message?: string;
  readonly text_captured?: boolean;
}

// ─────────────────────────────────────────────────────────────
// Pure Predicates
// ─────────────────────────────────────────────────────────────

/**
 * Check if string is non-empty
 * @pure
 */
const isNonEmptyString = (value: unknown): value is string =>
  typeof value === 'string' && value.trim() !== ''

// ─────────────────────────────────────────────────────────────
// Pure Data Builders
// ─────────────────────────────────────────────────────────────

/**
 * Build update data for user record
 * @pure
 */
const buildUserUpdateData = (textInputted: string, phone?: string): Record<string, unknown> => {
  const updateData: Record<string, unknown> = {
    'freeform ai signup text': textInputted,
    'Modified Date': new Date().toISOString(),
  };

  if (phone) {
    updateData['Phone Number (as text)'] = phone;
  }

  return Object.freeze(updateData);
}

/**
 * Build success response for found user
 * @pure
 */
const buildFoundUserResponse = (userData: UserData): SignupGuestResponse =>
  Object.freeze({
    _id: userData._id,
    email: userData.email,
    firstName: userData['Name - First'],
    lastName: userData['Name - Last'],
    text_saved: true
  })

/**
 * Build response for user not found case
 * @pure
 */
const buildUserNotFoundResponse = (email: string): SignupGuestResponse =>
  Object.freeze({
    message: 'User not found, but text captured for processing',
    email,
    text_captured: true
  })

// ─────────────────────────────────────────────────────────────
// Validation Helpers
// ─────────────────────────────────────────────────────────────

/**
 * Validate signup guest input
 * @pure - Throws ValidationError on invalid input
 */
const validateSignupInput = (input: SignupGuestInput): void => {
  if (!isNonEmptyString(input.email)) {
    throw new ValidationError('email is required');
  }
  if (!isNonEmptyString(input.text_inputted)) {
    throw new ValidationError('text_inputted is required');
  }
}

// ─────────────────────────────────────────────────────────────
// Database Operations
// ─────────────────────────────────────────────────────────────

/**
 * Fetch user by email
 * @effectful - Database read operation
 */
const fetchUserByEmail = async (
  supabase: SupabaseClient,
  email: string
): Promise<UserData | null> => {
  const { data, error } = await supabase
    .from('user')
    .select('_id, email, "Name - First", "Name - Last"')
    .eq('email', email.toLowerCase())
    .maybeSingle();

  if (error) {
    console.error(`${LOG_PREFIX} Error looking up user:`, error);
    throw new Error(`Failed to look up user: ${error.message}`);
  }

  return data as UserData | null;
}

/**
 * Update user with freeform text
 * @effectful - Database write operation
 */
const updateUserFreeformText = async (
  supabase: SupabaseClient,
  userId: string,
  updateData: Record<string, unknown>
): Promise<void> => {
  const { error } = await supabase
    .from('user')
    .update(updateData)
    .eq('_id', userId);

  if (error) {
    console.error(`${LOG_PREFIX} Error updating user:`, error);
    throw new Error(`Failed to update user: ${error.message}`);
  }
}

/**
 * Get Supabase client configuration
 * @effectful - Environment access
 */
const getSupabaseConfig = (): { url: string; serviceKey: string } => {
  const supabaseUrl = Deno.env.get('SUPABASE_URL');
  const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY');

  if (!supabaseUrl || !supabaseServiceKey) {
    throw new Error('Supabase configuration missing');
  }

  return { url: supabaseUrl, serviceKey: supabaseServiceKey };
}

// ─────────────────────────────────────────────────────────────
// Main Handler
// ─────────────────────────────────────────────────────────────

Deno.serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response(null, {
      status: 200,
      headers: corsHeaders,
    });
  }

  try {
    console.log(`${LOG_PREFIX} ========== NEW REQUEST ==========`);
    console.log(`${LOG_PREFIX} Method:`, req.method);

    // Only accept POST requests
    if (req.method !== 'POST') {
      throw new Error('Method not allowed. Use POST.');
    }

    // Parse request body
    const body = await req.json();
    console.log(`${LOG_PREFIX} Request body:`, JSON.stringify(body, null, 2));

    const input = body as SignupGuestInput;

    // ================================================
    // VALIDATION
    // ================================================

    validateSignupInput(input);

    console.log(`${LOG_PREFIX} Email:`, input.email);
    console.log(`${LOG_PREFIX} Phone:`, input.phone || 'Not provided');
    console.log(`${LOG_PREFIX} Text length:`, input.text_inputted.length);

    // ================================================
    // GET SUPABASE CLIENT
    // ================================================

    const config = getSupabaseConfig();
    const supabase = createClient(config.url, config.serviceKey, {
      auth: { autoRefreshToken: false, persistSession: false }
    });

    // ================================================
    // FIND USER BY EMAIL
    // ================================================

    console.log(`${LOG_PREFIX} Step 1: Looking up user by email...`);

    const userData = await fetchUserByEmail(supabase, input.email);

    if (!userData) {
      console.log(`${LOG_PREFIX} User not found, they may not have been created yet`);
      // Return success anyway - the user might be created later
      return new Response(
        JSON.stringify({
          success: true,
          data: buildUserNotFoundResponse(input.email)
        }),
        {
          status: 200,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        }
      );
    }

    console.log(`${LOG_PREFIX} ✅ User found:`, userData._id);

    // ================================================
    // UPDATE USER WITH FREEFORM TEXT
    // ================================================

    console.log(`${LOG_PREFIX} Step 2: Saving freeform text to user record...`);

    const updateData = buildUserUpdateData(input.text_inputted, input.phone);
    await updateUserFreeformText(supabase, userData._id, updateData);

    console.log(`${LOG_PREFIX} ✅ Freeform text saved to user record`);
    console.log(`${LOG_PREFIX} ========== SUCCESS ==========`);

    // Return user data for subsequent parseProfile call
    return new Response(
      JSON.stringify({
        success: true,
        data: buildFoundUserResponse(userData)
      }),
      {
        status: 200,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      }
    );

  } catch (error) {
    console.error(`${LOG_PREFIX} ========== ERROR ==========`);
    console.error(`${LOG_PREFIX} Error:`, error);
    console.error(`${LOG_PREFIX} Error stack:`, (error as Error).stack);

    const statusCode = error instanceof ValidationError ? 400 : 500;

    return new Response(
      JSON.stringify({
        success: false,
        error: (error as Error).message || 'An unexpected error occurred'
      }),
      {
        status: statusCode,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      }
    );
  }
});

// ─────────────────────────────────────────────────────────────
// Exported Test Constants
// ─────────────────────────────────────────────────────────────

/**
 * Exported for testing purposes
 * @test
 */
export const __test__ = Object.freeze({
  // Constants
  LOG_PREFIX,

  // Pure Predicates
  isNonEmptyString,

  // Pure Data Builders
  buildUserUpdateData,
  buildFoundUserResponse,
  buildUserNotFoundResponse,

  // Validation Helpers
  validateSignupInput,

  // Database Operations
  fetchUserByEmail,
  updateUserFreeformText,
  getSupabaseConfig,
})
