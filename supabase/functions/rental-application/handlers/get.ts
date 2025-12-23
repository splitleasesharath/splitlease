/**
 * Get Rental Application Handler
 * Split Lease - Supabase Edge Functions
 *
 * Fetches a user's rental application data from Supabase.
 * Returns null if user has no rental application.
 *
 * SUPABASE ONLY: This handler does NOT interact with Bubble
 * NO FALLBACK PRINCIPLE: All errors fail fast without fallback logic
 */

import { SupabaseClient } from "https://esm.sh/@supabase/supabase-js@2";
import { ValidationError } from "../../_shared/errors.ts";

interface RentalApplicationResponse {
  _id: string;
  name: string;
  email: string;
  DOB: string | null;
  "phone number": string | null;
  "permanent address": { address: string } | null;
  "apartment number": string | null;
  "length resided": string | null;
  renting: boolean;
  "employment status": string | null;
  "employer name": string | null;
  "employer phone number": string | null;
  "job title": string | null;
  "Monthly Income": number | null;
  "business legal name": string | null;
  "year business was created?": number | null;
  "state business registered": string | null;
  "occupants list": Array<{ id: string; name: string; relationship: string }> | null;
  pets: boolean;
  smoking: boolean;
  parking: boolean;
  references: string[] | null;
  signature: string | null;
  "signature (text)": string | null;
  submitted: boolean;
  "percentage % done": number | null;
  // File URL fields
  "proof of employment": string | null;
  "alternate guarantee": string | null;
  "credit score": string | null;
  "State ID - Front": string | null;
  "State ID - Back": string | null;
  "government ID": string | null;
}

/**
 * Handle rental application fetch
 *
 * @param payload - Optional payload (not used currently)
 * @param supabase - Supabase client (admin)
 * @param userId - The user's ID (either Supabase UUID or Bubble _id)
 * @returns The rental application data or null if none exists
 */
export async function handleGet(
  _payload: Record<string, unknown>,
  supabase: SupabaseClient,
  userId: string
): Promise<RentalApplicationResponse | null> {
  console.log(`[RentalApp:get] Fetching rental application for user: ${userId}`);

  // Detect if userId is a UUID (Supabase Auth) or Bubble ID (alphanumeric)
  const isSupabaseUUID = userId.includes('-') && userId.length === 36;

  let userData;
  let userError;

  if (isSupabaseUUID) {
    // Supabase Auth user - look up by supabase_user_id
    console.log(`[RentalApp:get] Looking up user by supabase_user_id: ${userId}`);
    const result = await supabase
      .from('user')
      .select('_id, "Rental Application"')
      .eq('supabase_user_id', userId)
      .single();
    userData = result.data;
    userError = result.error;
  } else {
    // Legacy Bubble user - look up by _id directly
    console.log(`[RentalApp:get] Looking up user by _id (legacy): ${userId}`);
    const result = await supabase
      .from('user')
      .select('_id, "Rental Application"')
      .eq('_id', userId)
      .single();
    userData = result.data;
    userError = result.error;
  }

  if (userError || !userData) {
    console.error(`[RentalApp:get] User fetch failed:`, userError);
    throw new ValidationError(`User not found for ID: ${userId}`);
  }

  console.log(`[RentalApp:get] Found user: ${userData._id}`);

  // Check if user has a rental application
  const rentalAppId = userData["Rental Application"];
  if (!rentalAppId) {
    console.log(`[RentalApp:get] User has no rental application`);
    return null;
  }

  console.log(`[RentalApp:get] Fetching rental application: ${rentalAppId}`);

  // Fetch the rental application
  const { data: rentalApp, error: rentalAppError } = await supabase
    .from('rentalapplication')
    .select(`
      _id,
      name,
      email,
      DOB,
      "phone number",
      "permanent address",
      "apartment number",
      "length resided",
      renting,
      "employment status",
      "employer name",
      "employer phone number",
      "job title",
      "Monthly Income",
      "business legal name",
      "year business was created?",
      "state business registered",
      "occupants list",
      pets,
      smoking,
      parking,
      references,
      signature,
      "signature (text)",
      submitted,
      "percentage % done",
      "proof of employment",
      "alternate guarantee",
      "credit score",
      "State ID - Front",
      "State ID - Back",
      "government ID"
    `)
    .eq('_id', rentalAppId)
    .single();

  if (rentalAppError) {
    console.error(`[RentalApp:get] Rental application fetch failed:`, rentalAppError);
    // Return null instead of throwing - the reference might be stale
    return null;
  }

  if (!rentalApp) {
    console.log(`[RentalApp:get] Rental application not found: ${rentalAppId}`);
    return null;
  }

  console.log(`[RentalApp:get] Successfully fetched rental application`);

  return rentalApp as RentalApplicationResponse;
}
