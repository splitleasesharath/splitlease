/**
 * Rate Co-Host Request Handler
 * Split Lease - Supabase Edge Functions
 *
 * Submits a rating for a completed co-host session.
 *
 * FP PATTERN: Separates pure data builders from effectful database operations
 * All data transformations are pure with @pure annotations
 * All database operations are explicit with @effectful annotations
 *
 * NO FALLBACK PRINCIPLE: All errors fail fast without fallback logic
 *
 * @module cohost-request/handlers/rate
 */

import { SupabaseClient } from "https://esm.sh/@supabase/supabase-js@2";
import { ValidationError, SupabaseSyncError } from "../../_shared/errors.ts";
import { validateRequired } from "../../_shared/validation.ts";
import { enqueueBubbleSync, triggerQueueProcessing } from "../../_shared/queueSync.ts";

// ─────────────────────────────────────────────────────────────
// Constants
// ─────────────────────────────────────────────────────────────

const LOG_PREFIX = '[cohost-request:rate]'
const CLOSED_STATUS = 'Request closed'
const MIN_RATING = 1
const MAX_RATING = 5

// ─────────────────────────────────────────────────────────────
// Types
// ─────────────────────────────────────────────────────────────

interface UserContext {
  readonly id: string;
  readonly email: string;
}

interface RateCoHostRequestInput {
  readonly requestId: string;       // Co-host request Bubble _id
  readonly Rating: number;          // 1-5 star rating
  readonly "Rating message (optional)"?: string;  // Optional feedback message
}

interface RateCoHostRequestResponse {
  readonly requestId: string;
  readonly rating: number;
  readonly updatedAt: string;
}

// ─────────────────────────────────────────────────────────────
// Pure Predicates
// ─────────────────────────────────────────────────────────────

/**
 * Check if rating is valid
 * @pure
 */
const isValidRating = (rating: unknown): rating is number =>
  typeof rating === 'number' && rating >= MIN_RATING && rating <= MAX_RATING

// ─────────────────────────────────────────────────────────────
// Pure Data Builders
// ─────────────────────────────────────────────────────────────

/**
 * Build update data for rating
 * @pure
 */
const buildRatingUpdateData = (
  rating: number,
  message: string | undefined,
  now: string
): Record<string, unknown> =>
  Object.freeze({
    Rating: rating,
    "Rating message (optional)": message || null,
    status: CLOSED_STATUS,
    "Modified Date": now,
  })

/**
 * Build success response
 * @pure
 */
const buildSuccessResponse = (
  requestId: string,
  rating: number,
  updatedAt: string
): RateCoHostRequestResponse =>
  Object.freeze({
    requestId,
    rating,
    updatedAt,
  })

// ─────────────────────────────────────────────────────────────
// Validation Helpers
// ─────────────────────────────────────────────────────────────

/**
 * Validate rate input
 * @pure - Throws ValidationError on invalid input
 */
const validateRateInput = (input: RateCoHostRequestInput): void => {
  validateRequired(input.requestId, "requestId");
  validateRequired(input.Rating, "Rating");

  if (!isValidRating(input.Rating)) {
    throw new ValidationError(`Rating must be a number between ${MIN_RATING} and ${MAX_RATING}`);
  }
}

// ─────────────────────────────────────────────────────────────
// Database Operations
// ─────────────────────────────────────────────────────────────

/**
 * Fetch co-host request by ID
 * @effectful - Database read operation
 */
const fetchCoHostRequest = async (
  supabase: SupabaseClient,
  requestId: string
): Promise<{ _id: string; status: string }> => {
  const { data, error } = await supabase
    .from("co_hostrequest")
    .select("_id, status")
    .eq("_id", requestId)
    .single();

  if (error || !data) {
    console.error(`${LOG_PREFIX} Request not found:`, error);
    throw new ValidationError(`Co-host request not found: ${requestId}`);
  }

  return data;
}

/**
 * Update co-host request with rating
 * @effectful - Database write operation
 */
const updateCoHostRequestRating = async (
  supabase: SupabaseClient,
  requestId: string,
  updateData: Record<string, unknown>
): Promise<void> => {
  const { error } = await supabase
    .from("co_hostrequest")
    .update(updateData)
    .eq("_id", requestId);

  if (error) {
    console.error(`${LOG_PREFIX} Update failed:`, error);
    throw new SupabaseSyncError(`Failed to update co-host request: ${error.message}`);
  }
}

/**
 * Enqueue rating update to Bubble sync
 * @effectful - Database write operation (non-blocking)
 */
const enqueueRatingSync = async (
  supabase: SupabaseClient,
  requestId: string,
  updateData: Record<string, unknown>
): Promise<void> => {
  try {
    await enqueueBubbleSync(supabase, {
      correlationId: requestId,
      items: [
        {
          sequence: 1,
          table: 'co_hostrequest',
          recordId: requestId,
          operation: 'UPDATE',
          payload: {
            _id: requestId,
            ...updateData,
          },
        },
      ],
    });

    console.log(`${LOG_PREFIX} Bubble sync enqueued`);

    triggerQueueProcessing();

  } catch (syncError) {
    console.error(`${LOG_PREFIX} Failed to enqueue Bubble sync (non-blocking):`, syncError);
  }
}

// ─────────────────────────────────────────────────────────────
// Main Handler
// ─────────────────────────────────────────────────────────────

/**
 * Handle rate co-host request
 * @effectful - Orchestrates database operations
 *
 * Steps:
 * 1. Validate input (requestId, Rating required)
 * 2. Verify co-host request exists
 * 3. Update co-host request with rating and close status
 * 4. Enqueue Bubble sync
 * 5. Return success response
 */
export async function handleRate(
  payload: Record<string, unknown>,
  user: UserContext | null,
  supabase: SupabaseClient
): Promise<RateCoHostRequestResponse> {
  console.log(`${LOG_PREFIX} Starting rate for user: ${user?.email || 'public'}`);

  // ================================================
  // VALIDATION
  // ================================================

  const input = payload as unknown as RateCoHostRequestInput;
  validateRateInput(input);

  console.log(`${LOG_PREFIX} Validated input for request: ${input.requestId}`);

  // ================================================
  // VERIFY REQUEST EXISTS
  // ================================================

  const existingRequest = await fetchCoHostRequest(supabase, input.requestId);
  console.log(`${LOG_PREFIX} Found request with status: ${existingRequest.status}`);

  // ================================================
  // UPDATE CO-HOST REQUEST
  // ================================================

  const now = new Date().toISOString();
  const updateData = buildRatingUpdateData(input.Rating, input["Rating message (optional)"], now);

  await updateCoHostRequestRating(supabase, input.requestId, updateData);
  console.log(`${LOG_PREFIX} Co-host request updated successfully`);

  // ================================================
  // ENQUEUE BUBBLE SYNC
  // ================================================

  await enqueueRatingSync(supabase, input.requestId, updateData);

  // ================================================
  // RETURN RESPONSE
  // ================================================

  console.log(`${LOG_PREFIX} Complete, returning response`);

  return buildSuccessResponse(input.requestId, input.Rating, now);
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
  CLOSED_STATUS,
  MIN_RATING,
  MAX_RATING,

  // Pure Predicates
  isValidRating,

  // Pure Data Builders
  buildRatingUpdateData,
  buildSuccessResponse,

  // Validation Helpers
  validateRateInput,

  // Database Operations
  fetchCoHostRequest,
  updateCoHostRequestRating,
  enqueueRatingSync,

  // Main Handler
  handleRate,
})
