/**
 * Type definitions for Proposal Edge Function
 * Split Lease - Supabase Edge Functions
 *
 * These types define the input/output contracts and internal data structures
 * for proposal creation and management.
 */

// ============================================
// INPUT TYPES
// ============================================

/**
 * Input for creating a new proposal
 * Maps to Bubble CORE-create_proposal-NEW workflow (37 parameters)
 */
export interface CreateProposalInput {
  // Required Identifiers
  listing_id: string;
  guest_id: string;

  // Required Pricing
  estimated_booking_total: number;
  guest_flexibility: string;
  preferred_gender: string; // → os_gender_type.name

  // Dates & Duration
  move_in_start_range: string; // ISO date
  move_in_end_range: string; // ISO date
  reservation_span_weeks: number;
  reservation_span: string; // → os_stay_periods.name
  actual_weeks?: number;

  // Day/Night Selection (Bubble indexing: 1-7, Sun=1)
  days_selected: number[];
  nights_selected: number[];
  check_in: number;
  check_out: number;

  // Pricing Details
  proposal_price: number;
  four_week_rent?: number;
  four_week_compensation?: number;
  host_compensation?: number;

  // Guest Information
  comment?: string;
  need_for_space?: string;
  about_me?: string;
  special_needs?: string;

  // Optional Overrides
  status?: string; // → os_proposal_status.name
  suggested_reason?: string;
  origin_proposal_id?: string;
  move_in_range_text?: string;
  flexible_move_in?: boolean;
  number_of_matches?: number;
}

/**
 * Input for updating an existing proposal
 */
export interface UpdateProposalInput {
  proposal_id: string;

  // All fields optional for partial update
  status?: string;
  proposal_price?: number;
  move_in_start_range?: string;
  move_in_end_range?: string;
  days_selected?: number[];
  nights_selected?: number[];
  reservation_span_weeks?: number;
  comment?: string;

  // Host counteroffer fields
  hc_nightly_price?: number;
  hc_days_selected?: number[];
  hc_nights_selected?: number[];
  hc_move_in_date?: string;
  hc_reservation_span_weeks?: number;
  hc_cleaning_fee?: number;
  hc_damage_deposit?: number;
  hc_total_price?: number;
  hc_four_week_rent?: number;
  hc_check_in?: number;
  hc_check_out?: number;

  // Cancellation
  reason_for_cancellation?: string;
}

/**
 * Input for getting proposal details
 */
export interface GetProposalInput {
  proposal_id: string;
}

// ============================================
// OUTPUT TYPES
// ============================================

/**
 * Response after creating a proposal
 */
export interface CreateProposalResponse {
  proposal_id: string;
  status: string;
  order_ranking: number;
  listing_id: string;
  guest_id: string;
  host_id: string;
  created_at: string;
}

/**
 * Response after updating a proposal
 */
export interface UpdateProposalResponse {
  proposal_id: string;
  status: string;
  updated_fields: string[];
  updated_at: string;
}

/**
 * Full proposal data for get request
 */
export interface ProposalData {
  _id: string;
  Listing: string;
  Guest: string;
  "Host - Account": string;
  Status: string;
  "proposal nightly price": number;
  "Move in range start": string;
  "Move in range end": string;
  "Reservation Span (Weeks)": number;
  "Reservation Span": string;
  "Days Selected": number[];
  "Nights Selected (Nights list)": number[];
  "check in day": number;
  "check out day": number;
  "Total Price for Reservation (guest)": number;
  "Total Compensation (proposal - host)": number;
  "cleaning fee": number;
  "damage deposit": number;
  "Guest flexibility": string;
  "preferred gender": string;
  "need for space"?: string;
  "About yourself"?: string;
  "Special needs"?: string;
  Comment?: string;
  "Order Ranking": number;
  "Is Finalized": boolean;
  Deleted: boolean;
  "Created Date": string;
  "Modified Date": string;
  // Host counteroffer fields
  "hc nightly price"?: number;
  "hc days selected"?: number[];
  "hc nights selected"?: number[];
  "hc move in date"?: string;
  "hc reservation span (weeks)"?: number;
  "counter offer happened"?: boolean;
}

// ============================================
// INTERNAL TYPES
// ============================================

/**
 * Listing data fetched from database
 */
export interface ListingData {
  _id: string;
  "Host / Landlord": string;
  "rental type": string;
  "Features - House Rules": string[];
  "💰Cleaning Cost / Maintenance Fee": number;
  "💰Damage Deposit": number;
  "Weeks offered": string;
  "Days Available (List of Days)": number[];
  "Nights Available (List of Nights)": number[];
  "Location - Address": Record<string, unknown>;
  "Location - slightly different address": string;
  "💰Weekly Host Rate": number;
  "💰Nightly Host Rate for 2 nights": number;
  "💰Nightly Host Rate for 3 nights": number;
  "💰Nightly Host Rate for 4 nights": number;
  "💰Nightly Host Rate for 5 nights": number;
  "💰Nightly Host Rate for 7 nights": number;
  "💰Monthly Host Rate": number;
}

/**
 * Guest user data fetched from database
 */
export interface GuestData {
  _id: string;
  "email as text": string;
  "Rental Application": string | null;
  "Proposals List": string[];
  "Favorited Listings": string[];
  "About Me / Bio"?: string;
  "need for Space"?: string;
  "special needs"?: string;
  "Tasks Completed"?: string[];
}

/**
 * Host account data fetched from database
 */
export interface HostAccountData {
  _id: string;
  User: string;
}

/**
 * Host user data fetched from database
 */
export interface HostUserData {
  _id: string;
  "email as text": string;
  "Proposals List": string[];
}

/**
 * Rental application data
 */
export interface RentalApplicationData {
  _id: string;
  submitted: boolean;
}

/**
 * Result of compensation calculation
 */
export interface CompensationResult {
  total_compensation: number;
  duration_months: number;
  four_week_rent: number;
  four_week_compensation: number;
}

/**
 * User context from authentication
 */
export interface UserContext {
  id: string;
  email: string;
}

// ============================================
// OPTION SET TYPES
// ============================================

/**
 * Proposal status names from os_proposal_status
 */
export type ProposalStatusName =
  | "sl_submitted_awaiting_rental_app"
  | "guest_submitted_awaiting_rental_app"
  | "sl_submitted_pending_confirmation"
  | "host_review"
  | "host_counteroffer"
  | "accepted_drafting_lease"
  | "lease_docs_for_review"
  | "lease_docs_for_signatures"
  | "lease_signed_awaiting_payment"
  | "payment_submitted_lease_activated"
  | "cancelled_by_guest"
  | "rejected_by_host"
  | "cancelled_by_sl"
  | "guest_ignored_suggestion";

/**
 * Rental type options
 */
export type RentalType = "nightly" | "weekly" | "monthly";

/**
 * Reservation span options from os_stay_periods
 */
export type ReservationSpan =
  | "1_week"
  | "2_weeks"
  | "1_month"
  | "2_months"
  | "3_months"
  | "6_months"
  | "1_year"
  | "other";

// ============================================
// ASYNC WORKFLOW TYPES
// ============================================

/**
 * Payload for triggering async communications workflow
 */
export interface CommunicationsPayload {
  proposal_id: string;
  guest_id: string;
  host_id: string;
  listing_id: string;
  status: string;
  has_rental_app: boolean;
}

/**
 * Payload for triggering async suggestions workflow
 */
export interface SuggestionsPayload {
  proposal_id: string;
  listing_id: string;
  guest_id: string;
  days_selected: number[];
  nights_selected: number[];
  move_in_start_range: string;
}

/**
 * Payload for triggering proposal summary generation
 */
export interface SummaryPayload {
  proposal_id: string;
  host_id: string;
  guest_name: string;
  listing_name: string;
  move_in_start: string;
  nights_per_week: number;
  total_price: number;
  duration_weeks: number;
}
