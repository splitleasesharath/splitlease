/**
 * Create Co-Host Request Handler
 * Split Lease - Supabase Edge Functions
 *
 * Creates a co-host request record in the database.
 *
 * NO FALLBACK PRINCIPLE: All errors fail fast without fallback logic
 */

import { SupabaseClient } from "https://esm.sh/@supabase/supabase-js@2";
import { ValidationError, SupabaseSyncError } from "../../_shared/errors.ts";
import { validateRequired } from "../../_shared/validation.ts";

// ─────────────────────────────────────────────────────────────
// Types
// ─────────────────────────────────────────────────────────────

interface UserContext {
  id: string;
  email: string;
}

interface CreateCoHostRequestInput {
  userId: string;           // User's Bubble _id
  userEmail: string;        // User's email
  userName: string;         // User's name
  listingId?: string;       // Optional: Listing Bubble _id
  selectedTimes: string[];  // Array of formatted datetime strings
  subject?: string;         // Topics/help needed (comma-separated)
  details?: string;         // Additional details text
}

interface CreateCoHostRequestResponse {
  requestId: string;
  createdAt: string;
}

// ─────────────────────────────────────────────────────────────
// Handler
// ─────────────────────────────────────────────────────────────

/**
 * Handle create co-host request
 *
 * Steps:
 * 1. Validate input (userId, selectedTimes required)
 * 2. Generate unique _id for co-host request
 * 3. Insert co-host request record
 * 4. Return the created ID
 */
export async function handleCreate(
  payload: Record<string, unknown>,
  user: UserContext | null,
  supabase: SupabaseClient
): Promise<CreateCoHostRequestResponse> {
  console.log(`[cohost-request:create] Starting create for user: ${user?.email || 'public'}`);

  // ================================================
  // VALIDATION
  // ================================================

  const input = payload as unknown as CreateCoHostRequestInput;

  validateRequired(input.userId, "userId");
  validateRequired(input.selectedTimes, "selectedTimes");

  if (!Array.isArray(input.selectedTimes) || input.selectedTimes.length === 0) {
    throw new ValidationError("selectedTimes must be a non-empty array");
  }

  console.log(`[cohost-request:create] Validated input for user: ${input.userId}`);
  console.log(`[cohost-request:create] Selected times: ${input.selectedTimes.length}`);

  // ================================================
  // GENERATE ID
  // ================================================

  const { data: coHostRequestId, error: requestIdError } = await supabase.rpc('generate_bubble_id');
  if (requestIdError || !coHostRequestId) {
    console.error(`[cohost-request:create] Co-host request ID generation failed:`, requestIdError);
    throw new SupabaseSyncError('Failed to generate co-host request ID');
  }

  console.log(`[cohost-request:create] Generated ID: ${coHostRequestId}`);

  // ================================================
  // CREATE CO-HOST REQUEST RECORD
  // ================================================

  const now = new Date().toISOString();

  // co_hostrequest table columns:
  // _id, Co-Host User, Host - Landlord, Listing, Created By
  // Note: 'status' column may not exist in schema cache - omitting for now
  const coHostData: Record<string, unknown> = {
    _id: coHostRequestId,
    "Co-Host User": input.userId,
    "Created By": input.userId,
    Listing: input.listingId || null,
  };

  console.log(`[cohost-request:create] Inserting co-host request:`, JSON.stringify(coHostData));

  const { error: requestInsertError } = await supabase
    .from("co_hostrequest")
    .insert(coHostData);

  if (requestInsertError) {
    console.error(`[cohost-request:create] Insert failed:`, requestInsertError);
    console.error(`[cohost-request:create] Error details - code: ${requestInsertError.code}, message: ${requestInsertError.message}, details: ${requestInsertError.details}, hint: ${requestInsertError.hint}`);
    throw new SupabaseSyncError(`Failed to create co-host request: ${requestInsertError.message}`);
  }

  console.log(`[cohost-request:create] Co-host request created successfully: ${coHostRequestId}`);

  // ================================================
  // RETURN RESPONSE
  // ================================================

  return {
    requestId: coHostRequestId,
    createdAt: now,
  };
}
