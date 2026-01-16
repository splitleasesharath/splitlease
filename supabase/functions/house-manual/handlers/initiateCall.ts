/**
 * Initiate Call Handler
 *
 * Initiates an AI-powered phone call via Twilio to gather house manual information.
 * This is a placeholder implementation - full Twilio integration requires additional setup.
 *
 * NOTE: Phone call feature requires:
 * - Twilio account with Voice API enabled
 * - Twilio phone number capable of outbound calls
 * - TwiML webhooks for call flow
 * - Real-time transcription setup
 *
 * @module house-manual/handlers/initiateCall
 */

import { SupabaseClient } from "https://esm.sh/@supabase/supabase-js@2";
import { ValidationError } from "../../_shared/errors.ts";

interface InitiateCallPayload {
  phoneNumber?: string; // Phone number to call (optional, uses user's number)
  callType?: "guided" | "freeform"; // Type of call
}

interface HandlerContext {
  userId: string;
  supabaseClient: SupabaseClient;
  payload: InitiateCallPayload;
}

interface InitiateCallResult {
  callId: string;
  status: "initiated" | "queued" | "unavailable";
  message: string;
  estimatedDuration?: number;
}

/**
 * Initiate an AI phone call for house manual data collection
 *
 * NOTE: This is a stub implementation. Full Twilio integration requires:
 * 1. Twilio credentials (Account SID, Auth Token, Phone Number)
 * 2. TwiML application for call handling
 * 3. Webhook endpoints for call events
 * 4. Real-time transcription service
 */
export async function handleInitiateCall(
  context: HandlerContext
): Promise<InitiateCallResult> {
  const { userId, supabaseClient, payload } = context;
  const { callType = "guided" } = payload;

  console.log(`[initiateCall] User ${userId} requested ${callType} call`);

  // Check for Twilio credentials
  const TWILIO_ACCOUNT_SID = Deno.env.get("TWILIO_ACCOUNT_SID");
  const TWILIO_AUTH_TOKEN = Deno.env.get("TWILIO_AUTH_TOKEN");
  const TWILIO_PHONE_NUMBER = Deno.env.get("TWILIO_PHONE_NUMBER");

  // If Twilio is not configured, return unavailable status
  if (!TWILIO_ACCOUNT_SID || !TWILIO_AUTH_TOKEN || !TWILIO_PHONE_NUMBER) {
    console.log(`[initiateCall] Twilio not configured - feature unavailable`);

    return {
      callId: "not_configured",
      status: "unavailable",
      message: "Phone call feature is not yet available. Please use other input methods like voice recording or text input.",
    };
  }

  // Get user's phone number from profile
  const { data: userData, error: userError } = await supabaseClient
    .from("user")
    .select("phone_number")
    .eq("id", userId)
    .single();

  if (userError || !userData?.phone_number) {
    throw new ValidationError(
      "Phone number not found in your profile. Please add a phone number in your account settings."
    );
  }

  const phoneNumber = payload.phoneNumber || userData.phone_number;

  // Validate phone number format
  const phoneRegex = /^\+?[1-9]\d{9,14}$/;
  if (!phoneRegex.test(phoneNumber.replace(/[\s()-]/g, ""))) {
    throw new ValidationError("Invalid phone number format");
  }

  console.log(`[initiateCall] Initiating call to ${phoneNumber.substring(0, 6)}****`);

  // Generate a call ID for tracking
  const callId = crypto.randomUUID();

  // Store call record in database for tracking
  const { error: insertError } = await supabaseClient
    .from("house_manual_calls")
    .insert({
      id: callId,
      user_id: userId,
      phone_number: phoneNumber,
      call_type: callType,
      status: "initiated",
      created_at: new Date().toISOString(),
    });

  if (insertError) {
    console.error(`[initiateCall] Failed to create call record:`, insertError);
    // Continue anyway - call tracking is non-critical
  }

  // TODO: Actual Twilio API call would go here
  // const twilioClient = twilio(TWILIO_ACCOUNT_SID, TWILIO_AUTH_TOKEN);
  // const call = await twilioClient.calls.create({
  //   to: phoneNumber,
  //   from: TWILIO_PHONE_NUMBER,
  //   url: `${WEBHOOK_BASE_URL}/twilio/house-manual-call?callId=${callId}&type=${callType}`,
  // });

  console.log(`[initiateCall] Call ${callId} initiated (stub)`);

  return {
    callId,
    status: "queued",
    message: "Your call has been queued. You will receive a call shortly from our AI assistant to help create your house manual.",
    estimatedDuration: 5, // minutes
  };
}

export default handleInitiateCall;
