/**
 * Type definitions for Proposal Edge Function
 * Split Lease - Supabase Edge Functions
 *
 * These types define the input/output contracts and internal data structures
 * for proposal creation and management.
 *
 * FP PATTERN: All interfaces use readonly modifiers for immutability
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
  readonly listingId: string;
  readonly guestId: string;

  // Required Pricing
  readonly estimatedBookingTotal: number;

  // Optional Guest Preferences (tech-debt: should be collected from user)
  readonly guestFlexibility?: string;
  readonly preferredGender?: string; // → os_gender_type.name

  // Dates & Duration
  readonly moveInStartRange: string; // ISO date
  readonly moveInEndRange: string; // ISO date
  readonly reservationSpanWeeks: number;
  readonly reservationSpan: string; // → os_stay_periods.name
  readonly actualWeeks?: number;

  // Day/Night Selection (Bubble indexing: 1-7, Sun=1)
  readonly daysSelected: readonly number[];
  readonly nightsSelected: readonly number[];
  readonly checkIn: number;
  readonly checkOut: number;

  // Pricing Details
  readonly proposalPrice: number;
  readonly fourWeekRent?: number;
  readonly fourWeekCompensation?: number;
  readonly hostCompensation?: number;

  // Guest Information
  readonly comment?: string;
  readonly needForSpace?: string;
  readonly aboutMe?: string;
  readonly specialNeeds?: string;

  // Optional Overrides
  readonly status?: string; // → os_proposal_status.name
  readonly suggestedReason?: string;
  readonly originProposalId?: string;
  readonly moveInRangeText?: string;
  readonly flexibleMoveIn?: boolean;
  readonly numberOfMatches?: number;

  // Custom schedule (user's freeform description of their preferred recurrent pattern)
  readonly customScheduleDescription?: string;
}

/**
 * Input for updating an existing proposal
 */
export interface UpdateProposalInput {
  readonly proposal_id: string;

  // All fields optional for partial update
  readonly status?: string;
  readonly proposal_price?: number;
  readonly move_in_start_range?: string;
  readonly move_in_end_range?: string;
  readonly days_selected?: readonly number[];
  readonly nights_selected?: readonly number[];
  readonly reservation_span_weeks?: number;
  readonly comment?: string;

  // Host counteroffer fields
  readonly hc_nightly_price?: number;
  readonly hc_days_selected?: readonly number[];
  readonly hc_nights_selected?: readonly number[];
  readonly hc_move_in_date?: string;
  readonly hc_reservation_span_weeks?: number;
  readonly hc_cleaning_fee?: number;
  readonly hc_damage_deposit?: number;
  readonly hc_total_price?: number;
  readonly hc_four_week_rent?: number;
  readonly hc_check_in?: number;
  readonly hc_check_out?: number;

  // Cancellation
  readonly reason_for_cancellation?: string;
}

/**
 * Input for getting proposal details
 */
export interface GetProposalInput {
  readonly proposal_id: string;
}

// ============================================
// OUTPUT TYPES
// ============================================

/**
 * Response after creating a proposal
 * NOTE: Uses camelCase to match frontend expectations
 */
export interface CreateProposalResponse {
  readonly proposalId: string;
  readonly status: string;
  readonly orderRanking: number;
  readonly listingId: string;
  readonly guestId: string;
  readonly hostId: string;
  readonly createdAt: string;
}

/**
 * Response after updating a proposal
 */
export interface UpdateProposalResponse {
  readonly proposal_id: string;
  readonly status: string;
  readonly updated_fields: readonly string[];
  readonly updated_at: string;
}

/**
 * Full proposal data for get request
 */
export interface ProposalData {
  readonly _id: string;
  readonly Listing: string;
  readonly Guest: string;
  readonly "Host User": string;
  readonly Status: string;
  readonly "proposal nightly price": number;
  readonly "Move in range start": string;
  readonly "Move in range end": string;
  readonly "Reservation Span (Weeks)": number;
  readonly "Reservation Span": string;
  readonly "Days Selected": readonly number[];
  readonly "Nights Selected (Nights list)": readonly number[];
  readonly "check in day": number;
  readonly "check out day": number;
  readonly "Total Price for Reservation (guest)": number;
  readonly "Total Compensation (proposal - host)": number;
  readonly "cleaning fee": number;
  readonly "damage deposit": number;
  readonly "Guest flexibility": string;
  readonly "preferred gender": string;
  readonly "need for space"?: string;
  readonly about_yourself?: string;      // snake_case column
  readonly special_needs?: string;       // snake_case column
  readonly Comment?: string;
  readonly "Order Ranking": number;
  readonly "Is Finalized": boolean;
  readonly Deleted: boolean;
  readonly "Created Date": string;
  readonly "Modified Date": string;
  // Host counteroffer fields
  readonly "hc nightly price"?: number;
  readonly "hc days selected"?: readonly number[];
  readonly "hc nights selected"?: readonly number[];
  readonly "hc move in date"?: string;
  readonly "hc reservation span (weeks)"?: number;
  readonly "counter offer happened"?: boolean;
}

// ============================================
// INTERNAL TYPES
// ============================================

/**
 * Listing data fetched from database
 */
export interface ListingData {
  readonly _id: string;
  readonly "Host User": string;
  readonly "rental type": string;
  readonly "Features - House Rules": readonly string[];
  readonly "💰Cleaning Cost / Maintenance Fee": number;
  readonly "💰Damage Deposit": number;
  readonly "Weeks offered": string;
  readonly "Days Available (List of Days)": readonly number[];
  readonly "Nights Available (List of Nights) ": readonly number[];
  readonly "Location - Address": Readonly<Record<string, unknown>>;
  readonly "Location - slightly different address": string;
  readonly "💰Weekly Host Rate": number;
  readonly "💰Nightly Host Rate for 2 nights": number;
  readonly "💰Nightly Host Rate for 3 nights": number;
  readonly "💰Nightly Host Rate for 4 nights": number;
  readonly "💰Nightly Host Rate for 5 nights": number;
  readonly "💰Nightly Host Rate for 7 nights": number;
  readonly "💰Monthly Host Rate": number;
}

/**
 * Guest user data fetched from database
 */
export interface GuestData {
  readonly _id: string;
  readonly email: string;
  readonly "Rental Application": string | null;
  readonly "Proposals List": readonly string[];  // Native text[] array from PostgreSQL (migrated from JSONB)
  readonly "Favorited Listings": readonly string[];  // Still JSONB - requires parseJsonArray
  readonly "About Me / Bio"?: string;
  readonly "need for Space"?: string;
  readonly "special needs"?: string;
  readonly "Tasks Completed"?: readonly string[];  // Still JSONB - requires parseJsonArray
}

/**
 * Host account data fetched from database
 */
export interface HostAccountData {
  readonly _id: string;
  readonly User: string;
}

/**
 * Host user data fetched from database
 */
export interface HostUserData {
  readonly _id: string;
  readonly email: string;
  readonly "Proposals List": readonly string[];  // Native text[] array from PostgreSQL (migrated from JSONB)
}

/**
 * Rental application data
 */
export interface RentalApplicationData {
  readonly _id: string;
  readonly submitted: boolean;
}

/**
 * Result of compensation calculation
 */
export interface CompensationResult {
  readonly total_compensation: number;
  readonly duration_months: number;
  readonly four_week_rent: number;
  readonly four_week_compensation: number;
  /** Host's per-night rate (used for "host compensation" field in proposal) */
  readonly host_compensation_per_night: number;
}

/**
 * User context from authentication
 */
export interface UserContext {
  readonly id: string;
  readonly email: string;
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
  readonly proposal_id: string;
  readonly guest_id: string;
  readonly host_id: string;
  readonly listing_id: string;
  readonly status: string;
  readonly has_rental_app: boolean;
}

/**
 * Payload for triggering async suggestions workflow
 */
export interface SuggestionsPayload {
  readonly proposal_id: string;
  readonly listing_id: string;
  readonly guest_id: string;
  readonly days_selected: readonly number[];
  readonly nights_selected: readonly number[];
  readonly move_in_start_range: string;
}

/**
 * Payload for triggering proposal summary generation
 */
export interface SummaryPayload {
  readonly proposal_id: string;
  readonly host_id: string;
  readonly guest_name: string;
  readonly listing_name: string;
  readonly move_in_start: string;
  readonly nights_per_week: number;
  readonly total_price: number;
  readonly duration_weeks: number;
}
