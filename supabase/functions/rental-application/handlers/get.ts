/**
 * Get Rental Application Handler
 * Split Lease - Supabase Edge Functions
 *
 * Fetches a user's rental application data from Supabase.
 * Returns null if user has no rental application.
 *
 * SUPABASE ONLY: This handler does NOT interact with Bubble
 *
 * FP PATTERN: Separates pure data builders from effectful database operations
 * All data transformations are pure with @pure annotations
 * All database operations are explicit with @effectful annotations
 *
 * NO FALLBACK PRINCIPLE: All errors fail fast without fallback logic
 *
 * @module rental-application/handlers/get
 */

import { SupabaseClient } from "https://esm.sh/@supabase/supabase-js@2";
import { ValidationError } from "../../_shared/errors.ts";

// ─────────────────────────────────────────────────────────────
// Constants
// ─────────────────────────────────────────────────────────────

const LOG_PREFIX = '[RentalApp:get]'

// ─────────────────────────────────────────────────────────────
// Types
// ─────────────────────────────────────────────────────────────

interface RentalApplicationResponse {
  readonly _id: string;
  readonly name: string;
  readonly email: string;
  readonly DOB: string | null;
  readonly "phone number": string | null;
  readonly "permanent address": { readonly address: string } | null;
  readonly "apartment number": string | null;
  readonly "length resided": string | null;
  readonly renting: boolean;
  readonly "employment status": string | null;
  readonly "employer name": string | null;
  readonly "employer phone number": string | null;
  readonly "job title": string | null;
  readonly "Monthly Income": number | null;
  readonly "business legal name": string | null;
  readonly "year business was created?": number | null;
  readonly "state business registered": string | null;
  readonly "occupants list": ReadonlyArray<{ readonly id: string; readonly name: string; readonly relationship: string }> | null;
  readonly pets: boolean;
  readonly smoking: boolean;
  readonly parking: boolean;
  readonly references: readonly string[] | null;
  readonly signature: string | null;
  readonly "signature (text)": string | null;
  readonly submitted: boolean;
  readonly "percentage % done": number | null;
  // File URL fields
  readonly "proof of employment": string | null;
  readonly "alternate guarantee": string | null;
  readonly "credit score": string | null;
  readonly "State ID - Front": string | null;
  readonly "State ID - Back": string | null;
  readonly "government ID": string | null;
}

// ─────────────────────────────────────────────────────────────
// Pure Predicates
// ─────────────────────────────────────────────────────────────

/**
 * Check if user ID is a Supabase UUID
 * @pure
 */
const isSupabaseUUID = (userId: string): boolean =>
  userId.includes('-') && userId.length === 36

// ─────────────────────────────────────────────────────────────
// Database Query Helpers
// ─────────────────────────────────────────────────────────────

/**
 * Fetch user data by Supabase UUID
 * @effectful - Database read operation
 */
const fetchUserBySupabaseId = async (
  supabase: SupabaseClient,
  supabaseUserId: string
): Promise<{ _id: string; "Rental Application": string | null } | null> => {
  const { data, error } = await supabase
    .from('user')
    .select('_id, "Rental Application"')
    .eq('supabase_user_id', supabaseUserId)
    .single();

  if (error || !data) {
    console.error(`${LOG_PREFIX} User fetch by supabase_user_id failed:`, error);
    return null;
  }

  return data;
}

/**
 * Fetch user data by Bubble ID
 * @effectful - Database read operation
 */
const fetchUserByBubbleId = async (
  supabase: SupabaseClient,
  bubbleId: string
): Promise<{ _id: string; "Rental Application": string | null } | null> => {
  const { data, error } = await supabase
    .from('user')
    .select('_id, "Rental Application"')
    .eq('_id', bubbleId)
    .single();

  if (error || !data) {
    console.error(`${LOG_PREFIX} User fetch by _id failed:`, error);
    return null;
  }

  return data;
}

/**
 * Fetch rental application by ID
 * @effectful - Database read operation
 */
const fetchRentalApplication = async (
  supabase: SupabaseClient,
  rentalAppId: string
): Promise<RentalApplicationResponse | null> => {
  const { data, error } = await supabase
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

  if (error) {
    console.error(`${LOG_PREFIX} Rental application fetch failed:`, error);
    return null;
  }

  return data as RentalApplicationResponse | null;
}

// ─────────────────────────────────────────────────────────────
// Main Handler
// ─────────────────────────────────────────────────────────────

/**
 * Handle rental application fetch
 * @effectful - Orchestrates database operations
 *
 * @param _payload - Optional payload (not used currently)
 * @param supabase - Supabase client (admin)
 * @param userId - The user's ID (either Supabase UUID or Bubble _id)
 * @returns The rental application data or null if none exists
 */
export async function handleGet(
  _payload: Record<string, unknown>,
  supabase: SupabaseClient,
  userId: string
): Promise<RentalApplicationResponse | null> {
  console.log(`${LOG_PREFIX} Fetching rental application for user: ${userId}`);

  // ================================================
  // FETCH USER DATA
  // ================================================

  const userData = isSupabaseUUID(userId)
    ? await fetchUserBySupabaseId(supabase, userId)
    : await fetchUserByBubbleId(supabase, userId);

  if (!userData) {
    throw new ValidationError(`User not found for ID: ${userId}`);
  }

  console.log(`${LOG_PREFIX} Found user: ${userData._id}`);

  // ================================================
  // CHECK FOR RENTAL APPLICATION
  // ================================================

  const rentalAppId = userData["Rental Application"];
  if (!rentalAppId) {
    console.log(`${LOG_PREFIX} User has no rental application`);
    return null;
  }

  console.log(`${LOG_PREFIX} Fetching rental application: ${rentalAppId}`);

  // ================================================
  // FETCH RENTAL APPLICATION
  // ================================================

  const rentalApp = await fetchRentalApplication(supabase, rentalAppId);

  if (!rentalApp) {
    console.log(`${LOG_PREFIX} Rental application not found: ${rentalAppId}`);
    return null;
  }

  console.log(`${LOG_PREFIX} Successfully fetched rental application`);

  return rentalApp;
}

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
  isSupabaseUUID,

  // Database Query Helpers
  fetchUserBySupabaseId,
  fetchUserByBubbleId,
  fetchRentalApplication,

  // Main Handler
  handleGet,
})
