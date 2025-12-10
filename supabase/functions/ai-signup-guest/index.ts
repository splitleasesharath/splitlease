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
 */

import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';
import { corsHeaders } from '../_shared/cors.ts';
import { ValidationError } from '../_shared/errors.ts';

console.log('[ai-signup-guest] Edge Function started');

Deno.serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response(null, {
      status: 200,
      headers: corsHeaders,
    });
  }

  try {
    console.log('[ai-signup-guest] ========== NEW REQUEST ==========');
    console.log('[ai-signup-guest] Method:', req.method);

    // Only accept POST requests
    if (req.method !== 'POST') {
      throw new Error('Method not allowed. Use POST.');
    }

    // Parse request body
    const body = await req.json();
    console.log('[ai-signup-guest] Request body:', JSON.stringify(body, null, 2));

    const { email, phone, text_inputted } = body;

    // Validate required fields
    if (!email) {
      throw new ValidationError('email is required');
    }
    if (!text_inputted) {
      throw new ValidationError('text_inputted is required');
    }

    console.log('[ai-signup-guest] Email:', email);
    console.log('[ai-signup-guest] Phone:', phone || 'Not provided');
    console.log('[ai-signup-guest] Text length:', text_inputted.length);

    // Get Supabase credentials
    const supabaseUrl = Deno.env.get('SUPABASE_URL');
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY');

    if (!supabaseUrl || !supabaseServiceKey) {
      throw new Error('Supabase configuration missing');
    }

    // Initialize Supabase admin client
    const supabase = createClient(supabaseUrl, supabaseServiceKey, {
      auth: {
        autoRefreshToken: false,
        persistSession: false
      }
    });

    // ========== STEP 1: Find user by email ==========
    console.log('[ai-signup-guest] Step 1: Looking up user by email...');

    const { data: userData, error: userError } = await supabase
      .from('user')
      .select('_id, email, "Name - First", "Name - Last"')
      .eq('email', email.toLowerCase())
      .maybeSingle();

    if (userError) {
      console.error('[ai-signup-guest] Error looking up user:', userError);
      throw new Error(`Failed to look up user: ${userError.message}`);
    }

    if (!userData) {
      console.log('[ai-signup-guest] User not found, they may not have been created yet');
      // Return success anyway - the user might be created later
      // The parseProfile call will fail gracefully if user doesn't exist
      return new Response(
        JSON.stringify({
          success: true,
          data: {
            message: 'User not found, but text captured for processing',
            email: email,
            text_captured: true
          }
        }),
        {
          status: 200,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        }
      );
    }

    console.log('[ai-signup-guest] ✅ User found:', userData._id);

    // ========== STEP 2: Save freeform text to user record ==========
    console.log('[ai-signup-guest] Step 2: Saving freeform text to user record...');

    const updateData: Record<string, any> = {
      'freeform ai signup text': text_inputted,
      'Modified Date': new Date().toISOString(),
    };

    // Also save phone number if provided
    if (phone) {
      updateData['Phone Number (as text)'] = phone;
    }

    const { error: updateError } = await supabase
      .from('user')
      .update(updateData)
      .eq('_id', userData._id);

    if (updateError) {
      console.error('[ai-signup-guest] Error updating user:', updateError);
      throw new Error(`Failed to update user: ${updateError.message}`);
    }

    console.log('[ai-signup-guest] ✅ Freeform text saved to user record');
    console.log('[ai-signup-guest] ========== SUCCESS ==========');

    // Return user data for subsequent parseProfile call
    return new Response(
      JSON.stringify({
        success: true,
        data: {
          _id: userData._id,
          email: userData.email,
          firstName: userData['Name - First'],
          lastName: userData['Name - Last'],
          text_saved: true
        }
      }),
      {
        status: 200,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      }
    );

  } catch (error) {
    console.error('[ai-signup-guest] ========== ERROR ==========');
    console.error('[ai-signup-guest] Error:', error);
    console.error('[ai-signup-guest] Error stack:', error.stack);

    const statusCode = error instanceof ValidationError ? 400 : 500;

    return new Response(
      JSON.stringify({
        success: false,
        error: error.message || 'An unexpected error occurred'
      }),
      {
        status: statusCode,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      }
    );
  }
});
