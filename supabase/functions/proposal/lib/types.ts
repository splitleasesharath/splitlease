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
 *
 * NOTE: Uses camelCase to match frontend payload format
 */
export interface CreateProposalInput {
  // Required Identifiers
  listingId: string;
  guestId: string;

  // Required Pricing
  estimatedBookingTotal: number;

  // Optional Guest Preferences (tech-debt: should be collected from user)
  guestFlexibility?: string;
  preferredGender?: string; // → os_gender_type.name

  // Dates & Duration
  moveInStartRange: string; // ISO date
  moveInEndRange: string; // ISO date
  reservationSpanWeeks: number;
  reservationSpan: string; // → os_stay_periods.name
  actualWeeks?: number;

  // Day/Night Selection (Bubble indexing: 1-7, Sun=1)
  daysSelected: number[];
  nightsSelected: number[];
  checkIn: number;
  checkOut: number;

  // Pricing Details
  proposalPrice: number;
  fourWeekRent?: number;
  fourWeekCompensation?: number;
  hostCompensation?: number;

  // Guest Information
  comment?: string;
  needForSpace?: string;
  aboutMe?: string;
  specialNeeds?: string;

  // Optional Overrides
  status?: string; // → os_proposal_status.name
  suggestedReason?: string;
  originProposalId?: string;
  moveInRangeText?: string;
  flexibleMoveIn?: boolean;
  numberOfMatches?: number;
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
 * NOTE: Uses camelCase to match frontend expectations
 */
export interface CreateProposalResponse {
  proposalId: string;
  status: string;
  orderRanking: number;
  listingId: string;
  guestId: string;
  hostId: string;
  createdAt: string;
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
  about_yourself?: string;      // snake_case column
  special_needs?: string;       // snake_case column
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
  "Nights Available (List of Nights) ": number[];
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
  email: string;
  "Rental Application": string | null;
  "Proposals List": string[];  // Native text[] array from PostgreSQL (migrated from JSONB)
  "Favorited Listings": string[];  // Still JSONB - requires parseJsonArray
  "About Me / Bio"?: string;
  "need for Space"?: string;
  "special needs"?: string;
  "Tasks Completed"?: string[];  // Still JSONB - requires parseJsonArray
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
  email: string;
  "Proposals List": string[];  // Native text[] array from PostgreSQL (migrated from JSONB)
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
 * Proposal status display values from os_proposal_status
 * IMPORTANT: Use Bubble's display format for compatibility with Bubble Data API
 */
export type ProposalStatusName =
  | "Proposal Submitted for guest by Split Lease - Awaiting Rental Application"
  | "Proposal Submitted by guest - Awaiting Rental Application"
  | "Proposal Submitted for guest by Split Lease - Pending Confirmation"
  | "Host Review"
  | "Host Counteroffer Submitted / Awaiting Guest Review"
  | "Proposal or Counteroffer Accepted / Drafting Lease Documents"
  | "Lease Documents Sent for Review"
  | "Lease Documents Sent for Signatures"
  | "Lease Documents Signed / Awaiting Initial payment"
  | "Initial Payment Submitted / Lease activated "
  | "Proposal Cancelled by Guest"
  | "Proposal Rejected by Host"
  | "Proposal Cancelled by Split Lease"
  | "Guest Ignored Suggestion";

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
