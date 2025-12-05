/**
 * Input validation utilities for Proposal Edge Function
 * Split Lease - Supabase Edge Functions
 *
 * NO FALLBACK PRINCIPLE: Validation failures throw errors immediately
 */

import { ValidationError } from "../../_shared/errors.ts";
import { CreateProposalInput, UpdateProposalInput } from "./types.ts";
import { validateDayIndices, validateNightIndices } from "./dayConversion.ts";

/**
 * Validate input for creating a new proposal
 * Throws ValidationError if any required field is missing or invalid
 */
export function validateCreateProposalInput(input: CreateProposalInput): void {
  // ─────────────────────────────────────────────────────────
  // Required Identifiers
  // ─────────────────────────────────────────────────────────

  if (!input.listing_id || typeof input.listing_id !== "string") {
    throw new ValidationError("listing_id is required and must be a string");
  }

  if (!input.guest_id || typeof input.guest_id !== "string") {
    throw new ValidationError("guest_id is required and must be a string");
  }

  // ─────────────────────────────────────────────────────────
  // Required Pricing
  // ─────────────────────────────────────────────────────────

  if (
    typeof input.estimated_booking_total !== "number" ||
    input.estimated_booking_total < 0
  ) {
    throw new ValidationError(
      "estimated_booking_total must be a non-negative number"
    );
  }

  if (!input.guest_flexibility || typeof input.guest_flexibility !== "string") {
    throw new ValidationError(
      "guest_flexibility is required and must be a string"
    );
  }

  if (!input.preferred_gender || typeof input.preferred_gender !== "string") {
    throw new ValidationError(
      "preferred_gender is required and must be a string"
    );
  }

  // ─────────────────────────────────────────────────────────
  // Date Validation
  // ─────────────────────────────────────────────────────────

  if (!input.move_in_start_range) {
    throw new ValidationError("move_in_start_range is required");
  }

  if (!input.move_in_end_range) {
    throw new ValidationError("move_in_end_range is required");
  }

  const startDate = new Date(input.move_in_start_range);
  const endDate = new Date(input.move_in_end_range);

  if (isNaN(startDate.getTime())) {
    throw new ValidationError("move_in_start_range must be a valid ISO date");
  }

  if (isNaN(endDate.getTime())) {
    throw new ValidationError("move_in_end_range must be a valid ISO date");
  }

  if (startDate > endDate) {
    throw new ValidationError(
      "move_in_start_range must be before or equal to move_in_end_range"
    );
  }

  // ─────────────────────────────────────────────────────────
  // Duration Validation
  // ─────────────────────────────────────────────────────────

  if (
    typeof input.reservation_span_weeks !== "number" ||
    input.reservation_span_weeks < 1
  ) {
    throw new ValidationError(
      "reservation_span_weeks must be a positive number"
    );
  }

  if (
    !input.reservation_span ||
    typeof input.reservation_span !== "string"
  ) {
    throw new ValidationError(
      "reservation_span is required and must be a string"
    );
  }

  // ─────────────────────────────────────────────────────────
  // Day/Night Selection Validation (Bubble format: 1-7)
  // ─────────────────────────────────────────────────────────

  if (!Array.isArray(input.days_selected) || input.days_selected.length === 0) {
    throw new ValidationError("days_selected must be a non-empty array");
  }

  if (!validateDayIndices(input.days_selected, "bubble")) {
    throw new ValidationError(
      "days_selected must contain integer values 1-7 (Bubble format: Sun=1, Sat=7)"
    );
  }

  if (
    !Array.isArray(input.nights_selected) ||
    input.nights_selected.length === 0
  ) {
    throw new ValidationError("nights_selected must be a non-empty array");
  }

  if (!validateNightIndices(input.nights_selected, "bubble")) {
    throw new ValidationError(
      "nights_selected must contain integer values 1-7 (Bubble format)"
    );
  }

  // Check-in/out validation
  if (
    typeof input.check_in !== "number" ||
    !validateDayIndices([input.check_in], "bubble")
  ) {
    throw new ValidationError("check_in must be an integer value 1-7");
  }

  if (
    typeof input.check_out !== "number" ||
    !validateDayIndices([input.check_out], "bubble")
  ) {
    throw new ValidationError("check_out must be an integer value 1-7");
  }

  // ─────────────────────────────────────────────────────────
  // Pricing Validation
  // ─────────────────────────────────────────────────────────

  if (
    typeof input.proposal_price !== "number" ||
    input.proposal_price < 0
  ) {
    throw new ValidationError("proposal_price must be a non-negative number");
  }

  // Optional pricing fields
  if (
    input.four_week_rent !== undefined &&
    typeof input.four_week_rent !== "number"
  ) {
    throw new ValidationError("four_week_rent must be a number if provided");
  }

  if (
    input.host_compensation !== undefined &&
    typeof input.host_compensation !== "number"
  ) {
    throw new ValidationError("host_compensation must be a number if provided");
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
      !validateDayIndices(input.days_selected, "bubble")
    ) {
      throw new ValidationError(
        "days_selected must contain integer values 1-7"
      );
    }
  }

  if (input.nights_selected !== undefined) {
    if (!Array.isArray(input.nights_selected)) {
      throw new ValidationError("nights_selected must be an array if provided");
    }
    if (
      input.nights_selected.length > 0 &&
      !validateNightIndices(input.nights_selected, "bubble")
    ) {
      throw new ValidationError(
        "nights_selected must contain integer values 1-7"
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
      !validateDayIndices(input.hc_days_selected, "bubble")
    ) {
      throw new ValidationError(
        "hc_days_selected must contain integer values 1-7"
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
      !validateNightIndices(input.hc_nights_selected, "bubble")
    ) {
      throw new ValidationError(
        "hc_nights_selected must contain integer values 1-7"
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
