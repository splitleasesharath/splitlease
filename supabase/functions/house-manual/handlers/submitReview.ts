/**
 * Submit Review Handler
 *
 * Allows guests to submit a comprehensive review of their stay.
 * Captures multiple rating categories and optional text feedback.
 *
 * SECURITY: Only the guest of the visit can submit a review.
 *
 * @module house-manual/handlers/submitReview
 */

import { SupabaseClient } from "https://esm.sh/@supabase/supabase-js@2";
import { ValidationError, AuthenticationError } from "../../_shared/errors.ts";

interface ReviewData {
  overallRating: number; // 1-5
  cleanliness?: number; // 1-5
  accuracy?: number; // 1-5
  communication?: number; // 1-5
  checkin?: number; // 1-5
  location?: number; // 1-5
  value?: number; // 1-5
  publicReview?: string; // Public review text (legacy "Review from Guest" field)
  privateFeedback?: string; // Private feedback for host only
  wouldRecommend?: boolean;
}

interface SubmitReviewPayload {
  visitId: string;
  review: ReviewData;
}

interface HandlerContext {
  userId: string;
  supabaseClient: SupabaseClient;
  payload: SubmitReviewPayload;
}

interface SubmitReviewResult {
  success: boolean;
  visitId: string;
  reviewSubmittedAt: string;
  averageRating: number;
}

/**
 * Validate a rating value is between 1 and 5
 */
function validateRating(value: unknown, fieldName: string): number | undefined {
  if (value === undefined || value === null) {
    return undefined;
  }

  const num = Number(value);

  if (isNaN(num) || num < 1 || num > 5 || !Number.isInteger(num)) {
    throw new ValidationError(`${fieldName} must be an integer between 1 and 5`);
  }

  return num;
}

/**
 * Calculate average rating from all provided rating fields
 */
function calculateAverageRating(review: ReviewData): number {
  const ratings = [
    review.overallRating,
    review.cleanliness,
    review.accuracy,
    review.communication,
    review.checkin,
    review.location,
    review.value,
  ].filter((r): r is number => r !== undefined && r !== null);

  if (ratings.length === 0) {
    return 0;
  }

  const sum = ratings.reduce((acc, r) => acc + r, 0);
  return Math.round((sum / ratings.length) * 10) / 10; // Round to 1 decimal
}

/**
 * Submit a guest review for a visit
 *
 * SECURITY: Only the guest of the visit can submit a review.
 * Prevents duplicate reviews - once submitted, cannot be modified.
 */
export async function handleSubmitReview(
  context: HandlerContext
): Promise<SubmitReviewResult> {
  const { userId, supabaseClient, payload } = context;
  const { visitId, review } = payload;

  // Validate input
  if (!visitId || typeof visitId !== "string") {
    throw new ValidationError("visitId is required");
  }

  if (!review || typeof review !== "object") {
    throw new ValidationError("review data is required");
  }

  // Validate and normalize ratings
  const overallRating = validateRating(review.overallRating, "overallRating");
  if (overallRating === undefined) {
    throw new ValidationError("overallRating is required and must be between 1 and 5");
  }

  const cleanlinessRating = validateRating(review.cleanliness, "cleanliness");
  const accuracyRating = validateRating(review.accuracy, "accuracy");
  const communicationRating = validateRating(review.communication, "communication");
  const checkinRating = validateRating(review.checkin, "checkin");
  const locationRating = validateRating(review.location, "location");
  const valueRating = validateRating(review.value, "value");

  console.log(`[submitReview] Submitting review for visit: ${visitId}`);

  // Step 1: Fetch the visit and check ownership
  const { data: visit, error: visitError } = await supabaseClient
    .from("visit")
    .select(`
      _id,
      "User shared with (guest)",
      "review_submitted_at"
    `)
    .eq("_id", visitId)
    .single();

  if (visitError || !visit) {
    console.error(`[submitReview] Visit not found:`, visitError);
    throw new ValidationError(`Visit not found: ${visitId}`);
  }

  // Step 2: Verify the authenticated user is the guest of this visit
  const { data: userData, error: userError } = await supabaseClient
    .from("user")
    .select("_id, supabase_user_id")
    .eq("supabase_user_id", userId)
    .single();

  if (userError || !userData) {
    console.error(`[submitReview] User not found for supabase ID:`, userError);
    throw new AuthenticationError("User not found");
  }

  const guestId = visit["User shared with (guest)"];

  if (userData._id !== guestId) {
    console.error(`[submitReview] Access denied. User ${userData._id} is not guest ${guestId}`);
    throw new AuthenticationError("You are not authorized to submit a review for this visit");
  }

  // Step 3: Check if review already submitted
  if (visit["review_submitted_at"]) {
    throw new ValidationError("A review has already been submitted for this visit");
  }

  // Step 4: Build update payload
  const submittedAt = new Date().toISOString();
  const updatePayload: Record<string, unknown> = {
    // New structured review fields
    review_rating: overallRating,
    review_submitted_at: submittedAt,
    review_cleanliness: cleanlinessRating,
    review_accuracy: accuracyRating,
    review_communication: communicationRating,
    review_checkin: checkinRating,
    review_location: locationRating,
    review_value: valueRating,
    review_would_recommend: review.wouldRecommend,
    "Modified Date": submittedAt,
  };

  // Handle public review text (maps to legacy "Review from Guest" field)
  if (review.publicReview && typeof review.publicReview === "string") {
    updatePayload["Review from Guest"] = review.publicReview.trim();
  }

  // Handle private feedback
  if (review.privateFeedback && typeof review.privateFeedback === "string") {
    updatePayload["review_private_feedback"] = review.privateFeedback.trim();
  }

  // Step 5: Update visit with review data
  const { error: updateError } = await supabaseClient
    .from("visit")
    .update(updatePayload)
    .eq("_id", visitId);

  if (updateError) {
    console.error(`[submitReview] Failed to save review:`, updateError);
    throw new Error(`Failed to submit review: ${updateError.message}`);
  }

  // Calculate average rating for response
  const averageRating = calculateAverageRating({
    ...review,
    overallRating,
    cleanliness: cleanlinessRating,
    accuracy: accuracyRating,
    communication: communicationRating,
    checkin: checkinRating,
    location: locationRating,
    value: valueRating,
  });

  console.log(`[submitReview] Successfully saved review for visit ${visitId} (avg: ${averageRating})`);

  return {
    success: true,
    visitId,
    reviewSubmittedAt: submittedAt,
    averageRating,
  };
}

export default handleSubmitReview;
