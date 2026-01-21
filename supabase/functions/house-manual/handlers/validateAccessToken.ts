/**
 * Validate Access Token Handler
 *
 * Validates a magic link access token for house manual access.
 * Returns validation status and associated visit information.
 *
 * This handler is called when a user clicks a magic link.
 * It verifies the token is valid and returns visit/guest info for authentication.
 *
 * @module house-manual/handlers/validateAccessToken
 */

import { SupabaseClient } from "https://esm.sh/@supabase/supabase-js@2";
import { ValidationError } from "../../_shared/errors.ts";

interface ValidateAccessTokenPayload {
  accessToken: string;
}

interface HandlerContext {
  userId: string;
  supabaseClient: SupabaseClient;
  payload: ValidateAccessTokenPayload;
}

interface ValidationResult {
  isValid: boolean;
  visitId: string | null;
  guestId: string | null;
  guestEmail: string | null;
  houseManualId: string | null;
  expiresAt: string | null;
  isExpired: boolean;
  isUsed: boolean;
  isSingleUse: boolean;
  errorReason: string | null;
}

/**
 * Validate a magic link access token
 *
 * Checks:
 * 1. Token exists in database
 * 2. Token has not expired (30-day expiration)
 * 3. For single-use tokens, checks if already used
 *
 * Returns visit and guest information for the frontend to verify
 * the authenticated user matches the visit's guest.
 */
export async function handleValidateAccessToken(
  context: HandlerContext
): Promise<ValidationResult> {
  const { supabaseClient, payload } = context;
  const { accessToken } = payload;

  // Validate input
  if (!accessToken || typeof accessToken !== "string") {
    throw new ValidationError("accessToken is required");
  }

  console.log(`[validateAccessToken] Validating token: ${accessToken.substring(0, 8)}...`);

  // Find visit with this access token
  const { data: visit, error: visitError } = await supabaseClient
    .from("visit")
    .select(`
      _id,
      "User shared with (guest)",
      "house manual",
      "access_token",
      "token_expires_at",
      "token_used_at",
      "is_single_use"
    `)
    .eq("access_token", accessToken)
    .single();

  if (visitError || !visit) {
    console.log(`[validateAccessToken] Token not found in database`);
    return {
      isValid: false,
      visitId: null,
      guestId: null,
      guestEmail: null,
      houseManualId: null,
      expiresAt: null,
      isExpired: false,
      isUsed: false,
      isSingleUse: false,
      errorReason: "Invalid access token",
    };
  }

  const expiresAt = visit["token_expires_at"];
  const usedAt = visit["token_used_at"];
  const isSingleUse = Boolean(visit["is_single_use"]);

  // Check if token is expired
  const isExpired = expiresAt ? new Date(expiresAt) < new Date() : false;

  if (isExpired) {
    console.log(`[validateAccessToken] Token expired at ${expiresAt}`);
    return {
      isValid: false,
      visitId: visit._id,
      guestId: visit["User shared with (guest)"],
      guestEmail: null,
      houseManualId: visit["house manual"],
      expiresAt,
      isExpired: true,
      isUsed: Boolean(usedAt),
      isSingleUse,
      errorReason: "Access token has expired",
    };
  }

  // Check if single-use token has already been used
  if (isSingleUse && usedAt) {
    console.log(`[validateAccessToken] Single-use token already used at ${usedAt}`);
    return {
      isValid: false,
      visitId: visit._id,
      guestId: visit["User shared with (guest)"],
      guestEmail: null,
      houseManualId: visit["house manual"],
      expiresAt,
      isExpired: false,
      isUsed: true,
      isSingleUse,
      errorReason: "Access token has already been used",
    };
  }

  // Fetch guest email for frontend display/verification
  const guestId = visit["User shared with (guest)"];
  let guestEmail: string | null = null;

  if (guestId) {
    const { data: guest } = await supabaseClient
      .from("user")
      .select("email")
      .eq("_id", guestId)
      .single();

    if (guest) {
      guestEmail = guest.email;
    }
  }

  console.log(`[validateAccessToken] Token valid for visit ${visit._id}`);

  return {
    isValid: true,
    visitId: visit._id,
    guestId,
    guestEmail,
    houseManualId: visit["house manual"],
    expiresAt,
    isExpired: false,
    isUsed: Boolean(usedAt),
    isSingleUse,
    errorReason: null,
  };
}

export default handleValidateAccessToken;
