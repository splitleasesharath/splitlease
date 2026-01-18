/**
 * Input validation utilities for Proposal Edge Function
 * Split Lease - Supabase Edge Functions
 *
 * NO FALLBACK PRINCIPLE: Validation failures throw errors immediately
 *
 * Day indices use JavaScript 0-based format (0=Sunday through 6=Saturday)
 */

import { ValidationError } from "../../_shared/errors.ts";
import { CreateProposalInput, UpdateProposalInput } from "./types.ts";

/**
 * Validate that day indices are in correct 0-6 range (JavaScript format)
 */
function validateDayIndices(days: number[]): boolean {
  if (!Array.isArray(days)) return false;
  return days.every((d) => Number.isInteger(d) && d >= 0 && d <= 6);
}

/**
 * Validate that night indices are in correct 0-6 range (JavaScript format)
 */
function validateNightIndices(nights: number[]): boolean {
  return validateDayIndices(nights); // Same validation logic
}

/**
 * Validate input for creating a new proposal
 * Throws ValidationError if any required field is missing or invalid
 *
 * NOTE: Uses camelCase to match frontend payload format
 */
export function validateCreateProposalInput(input: CreateProposalInput): void {
  // Debug logging for validation troubleshooting
  console.log('[validators] Validating input:', JSON.stringify({
    listingId: { value: input.listingId, type: typeof input.listingId },
    guestId: { value: input.guestId, type: typeof input.guestId },
    estimatedBookingTotal: { value: input.estimatedBookingTotal, type: typeof input.estimatedBookingTotal },
    moveInStartRange: { value: input.moveInStartRange, type: typeof input.moveInStartRange },
    moveInEndRange: { value: input.moveInEndRange, type: typeof input.moveInEndRange },
    reservationSpanWeeks: { value: input.reservationSpanWeeks, type: typeof input.reservationSpanWeeks },
    reservationSpan: { value: input.reservationSpan, type: typeof input.reservationSpan },
    daysSelected: { value: input.daysSelected, type: typeof input.daysSelected, isArray: Array.isArray(input.daysSelected) },
    nightsSelected: { value: input.nightsSelected, type: typeof input.nightsSelected, isArray: Array.isArray(input.nightsSelected) },
    checkIn: { value: input.checkIn, type: typeof input.checkIn },
    checkOut: { value: input.checkOut, type: typeof input.checkOut },
    proposalPrice: { value: input.proposalPrice, type: typeof input.proposalPrice },
  }, null, 2));

  // ─────────────────────────────────────────────────────────
  // Required Identifiers
  // ─────────────────────────────────────────────────────────

  if (!input.listingId || typeof input.listingId !== "string") {
    throw new ValidationError("listingId is required and must be a string");
  }

  if (!input.guestId || typeof input.guestId !== "string") {
    throw new ValidationError("guestId is required and must be a string");
  }

  // ─────────────────────────────────────────────────────────
  // Required Pricing
  // ─────────────────────────────────────────────────────────

  if (
    typeof input.estimatedBookingTotal !== "number" ||
    input.estimatedBookingTotal < 0
  ) {
    throw new ValidationError(
      "estimatedBookingTotal must be a non-negative number"
    );
  }

  // Optional guest preferences (guestFlexibility, preferredGender)
  // Tech-debt: These should be collected from user in the UI
  if (
    input.guestFlexibility !== undefined &&
    typeof input.guestFlexibility !== "string"
  ) {
    throw new ValidationError("guestFlexibility must be a string if provided");
  }

  if (
    input.preferredGender !== undefined &&
    typeof input.preferredGender !== "string"
  ) {
    throw new ValidationError("preferredGender must be a string if provided");
  }

  // ─────────────────────────────────────────────────────────
  // Date Validation
  // ─────────────────────────────────────────────────────────

  if (!input.moveInStartRange) {
    throw new ValidationError("moveInStartRange is required");
  }

  if (!input.moveInEndRange) {
    throw new ValidationError("moveInEndRange is required");
  }

  const startDate = new Date(input.moveInStartRange);
  const endDate = new Date(input.moveInEndRange);

  if (isNaN(startDate.getTime())) {
    throw new ValidationError("moveInStartRange must be a valid ISO date");
  }

  if (isNaN(endDate.getTime())) {
    throw new ValidationError("moveInEndRange must be a valid ISO date");
  }

  if (startDate > endDate) {
    throw new ValidationError(
      "moveInStartRange must be before or equal to moveInEndRange"
    );
  }

  // ─────────────────────────────────────────────────────────
  // Duration Validation
  // ─────────────────────────────────────────────────────────

  if (
    typeof input.reservationSpanWeeks !== "number" ||
    input.reservationSpanWeeks < 1
  ) {
    throw new ValidationError(
      "reservationSpanWeeks must be a positive number"
    );
  }

  if (
    !input.reservationSpan ||
    typeof input.reservationSpan !== "string"
  ) {
    throw new ValidationError(
      "reservationSpan is required and must be a string"
    );
  }

  // ─────────────────────────────────────────────────────────
  // Day/Night Selection Validation (JavaScript format: 0-6)
  // ─────────────────────────────────────────────────────────

  if (!Array.isArray(input.daysSelected) || input.daysSelected.length === 0) {
    throw new ValidationError("daysSelected must be a non-empty array");
  }

  if (!validateDayIndices(input.daysSelected)) {
    throw new ValidationError(
      "daysSelected must contain integer values 0-6 (Sun=0, Sat=6)"
    );
  }

  if (
    !Array.isArray(input.nightsSelected) ||
    input.nightsSelected.length === 0
  ) {
    throw new ValidationError("nightsSelected must be a non-empty array");
  }

  if (!validateNightIndices(input.nightsSelected)) {
    throw new ValidationError(
      "nightsSelected must contain integer values 0-6"
    );
  }

  // Check-in/out validation
  if (
    typeof input.checkIn !== "number" ||
    !validateDayIndices([input.checkIn])
  ) {
    throw new ValidationError("checkIn must be an integer value 0-6");
  }

  if (
    typeof input.checkOut !== "number" ||
    !validateDayIndices([input.checkOut])
  ) {
    throw new ValidationError("checkOut must be an integer value 0-6");
  }

  // ─────────────────────────────────────────────────────────
  // Pricing Validation
  // ─────────────────────────────────────────────────────────

  if (
    typeof input.proposalPrice !== "number" ||
    input.proposalPrice < 0
  ) {
    throw new ValidationError("proposalPrice must be a non-negative number");
  }

  // Optional pricing fields
  if (
    input.fourWeekRent !== undefined &&
    typeof input.fourWeekRent !== "number"
  ) {
    throw new ValidationError("fourWeekRent must be a number if provided");
  }

  if (
    input.hostCompensation !== undefined &&
    typeof input.hostCompensation !== "number"
  ) {
    throw new ValidationError("hostCompensation must be a number if provided");
  }
}

/**
 * Validate input for updating a proposal
 * Throws ValidationError if proposal_id is missing or fields are invalid
 */
export function validateUpdateProposalInput(input: UpdateProposalInput): void {
  // ─────────────────────────────────────────────────────────
  // Required: Proposal ID
  // ─────────────────────────────────────────────────────────

  if (!input.proposal_id || typeof input.proposal_id !== "string") {
    throw new ValidationError("proposal_id is required and must be a string");
  }

  // ─────────────────────────────────────────────────────────
  // Optional field validations (only if provided)
  // ─────────────────────────────────────────────────────────

  // Status
  if (input.status !== undefined && typeof input.status !== "string") {
    throw new ValidationError("status must be a string if provided");
  }

  // Pricing
  if (
    input.proposal_price !== undefined &&
    typeof input.proposal_price !== "number"
  ) {
    throw new ValidationError("proposal_price must be a number if provided");
  }

  // Dates
  if (input.move_in_start_range !== undefined) {
    const startDate = new Date(input.move_in_start_range);
    if (isNaN(startDate.getTime())) {
      throw new ValidationError(
        "move_in_start_range must be a valid ISO date if provided"
      );
    }
  }

  if (input.move_in_end_range !== undefined) {
    const endDate = new Date(input.move_in_end_range);
    if (isNaN(endDate.getTime())) {
      throw new ValidationError(
        "move_in_end_range must be a valid ISO date if provided"
      );
    }
  }

  // Day/Night selection
  if (input.days_selected !== undefined) {
    if (!Array.isArray(input.days_selected)) {
      throw new ValidationError("days_selected must be an array if provided");
    }
    if (
      input.days_selected.length > 0 &&
      !validateDayIndices(input.days_selected)
    ) {
      throw new ValidationError(
        "days_selected must contain integer values 0-6"
      );
    }
  }

  if (input.nights_selected !== undefined) {
    if (!Array.isArray(input.nights_selected)) {
      throw new ValidationError("nights_selected must be an array if provided");
    }
    if (
      input.nights_selected.length > 0 &&
      !validateNightIndices(input.nights_selected)
    ) {
      throw new ValidationError(
        "nights_selected must contain integer values 0-6"
      );
    }
  }

  // Duration
  if (
    input.reservation_span_weeks !== undefined &&
    (typeof input.reservation_span_weeks !== "number" ||
      input.reservation_span_weeks < 1)
  ) {
    throw new ValidationError(
      "reservation_span_weeks must be a positive number if provided"
    );
  }

  // ─────────────────────────────────────────────────────────
  // Host Counteroffer Fields
  // ─────────────────────────────────────────────────────────

  if (
    input.hc_nightly_price !== undefined &&
    typeof input.hc_nightly_price !== "number"
  ) {
    throw new ValidationError("hc_nightly_price must be a number if provided");
  }

  if (input.hc_days_selected !== undefined) {
    if (!Array.isArray(input.hc_days_selected)) {
      throw new ValidationError(
        "hc_days_selected must be an array if provided"
      );
    }
    if (
      input.hc_days_selected.length > 0 &&
      !validateDayIndices(input.hc_days_selected)
    ) {
      throw new ValidationError(
        "hc_days_selected must contain integer values 0-6"
      );
    }
  }

  if (input.hc_nights_selected !== undefined) {
    if (!Array.isArray(input.hc_nights_selected)) {
      throw new ValidationError(
        "hc_nights_selected must be an array if provided"
      );
    }
    if (
      input.hc_nights_selected.length > 0 &&
      !validateNightIndices(input.hc_nights_selected)
    ) {
      throw new ValidationError(
        "hc_nights_selected must contain integer values 0-6"
      );
    }
  }

  if (input.hc_move_in_date !== undefined) {
    const hcDate = new Date(input.hc_move_in_date);
    if (isNaN(hcDate.getTime())) {
      throw new ValidationError(
        "hc_move_in_date must be a valid ISO date if provided"
      );
    }
  }

  if (
    input.hc_reservation_span_weeks !== undefined &&
    typeof input.hc_reservation_span_weeks !== "number"
  ) {
    throw new ValidationError(
      "hc_reservation_span_weeks must be a number if provided"
    );
  }

  if (
    input.hc_cleaning_fee !== undefined &&
    typeof input.hc_cleaning_fee !== "number"
  ) {
    throw new ValidationError("hc_cleaning_fee must be a number if provided");
  }

  if (
    input.hc_damage_deposit !== undefined &&
    typeof input.hc_damage_deposit !== "number"
  ) {
    throw new ValidationError("hc_damage_deposit must be a number if provided");
  }

  if (
    input.hc_total_price !== undefined &&
    typeof input.hc_total_price !== "number"
  ) {
    throw new ValidationError("hc_total_price must be a number if provided");
  }
}

/**
 * Check if any update fields are provided
 * Returns true if at least one updatable field is present
 */
export function hasUpdateFields(input: UpdateProposalInput): boolean {
  const updateableFields = [
    "status",
    "proposal_price",
    "move_in_start_range",
    "move_in_end_range",
    "days_selected",
    "nights_selected",
    "reservation_span_weeks",
    "comment",
    "hc_nightly_price",
    "hc_days_selected",
    "hc_nights_selected",
    "hc_move_in_date",
    "hc_reservation_span_weeks",
    "hc_cleaning_fee",
    "hc_damage_deposit",
    "hc_total_price",
    "hc_four_week_rent",
    "hc_check_in",
    "hc_check_out",
    "reason_for_cancellation",
  ];

  return updateableFields.some(
    (field) => input[field as keyof UpdateProposalInput] !== undefined
  );
}
