/**
 * Quick Match Type Definitions
 * Split Lease - Supabase Edge Functions
 *
 * TypeScript interfaces for the Quick Match feature
 */

// ─────────────────────────────────────────────────────────────
// Request/Response Types
// ─────────────────────────────────────────────────────────────

export interface GetProposalPayload {
  readonly proposal_id: string;
}

export interface SearchCandidatesPayload {
  readonly proposal_id: string;
  readonly filters?: SearchFilters;
  readonly limit?: number;
}

export interface SaveChoicePayload {
  readonly proposal_id: string;
  readonly matched_listing_id: string;
  readonly match_score: number;
  readonly match_reason?: string;
}

export interface SearchFilters {
  readonly borough?: string;
  readonly max_price?: number;
  readonly min_score?: number;
}

// ─────────────────────────────────────────────────────────────
// Domain Types
// ─────────────────────────────────────────────────────────────

export interface GuestInfo {
  readonly id: string;
  readonly firstName: string | null;
  readonly lastName: string | null;
  readonly fullName: string | null;
  readonly email: string | null;
}

export interface ListingInfo {
  readonly id: string;
  readonly title: string | null;
  readonly borough: string | null;
  readonly boroughName: string | null;
  readonly hood: string | null;
  readonly hoodName: string | null;
  readonly address: unknown;
  readonly nightlyRates: NightlyRates;
  readonly cleaningFee: number | null;
  readonly damageDeposit: number | null;
  readonly minimumNights: number | null;
  readonly maximumNights: number | null;
  readonly daysAvailable: number[];
  readonly nightsAvailable: number[];
  readonly active: boolean;
}

export interface NightlyRates {
  readonly rate1: number | null;
  readonly rate2: number | null;
  readonly rate3: number | null;
  readonly rate4: number | null;
  readonly rate5: number | null;
  readonly rate6: number | null;
  readonly rate7: number | null;
}

export interface HostInfo {
  readonly id: string;
  readonly firstName: string | null;
  readonly fullName: string | null;
  readonly linkedInVerified: boolean;
  readonly phoneVerified: boolean;
  readonly userVerified: boolean;
}

export interface ProposalDetails {
  readonly id: string;
  readonly guest: GuestInfo;
  readonly listing: ListingInfo;
  readonly daysSelected: number[];
  readonly nightsPerWeek: number;
  readonly nightlyPrice: number;
  readonly moveInStart: string | null;
  readonly moveInEnd: string | null;
  readonly status: string | null;
  readonly reservationWeeks: number | null;
}

// ─────────────────────────────────────────────────────────────
// Scoring Types
// ─────────────────────────────────────────────────────────────

export interface ScoreBreakdown {
  readonly borough: ScoreComponent;
  readonly price: ScoreComponent;
  readonly schedule: ScoreComponent;
  readonly weeklyStay: ScoreComponent;
  readonly duration: ScoreComponent;
  readonly host: ScoreComponent;
}

export interface ScoreComponent {
  readonly score: number;
  readonly max: number;
  readonly label: string;
}

export type MatchTier = 'excellent' | 'good' | 'fair' | 'poor';

export interface CandidateMatch {
  readonly listing: ListingInfo;
  readonly host: HostInfo;
  readonly score: number;
  readonly breakdown: ScoreBreakdown;
  readonly tier: MatchTier;
}

export interface SearchCandidatesResult {
  readonly candidates: CandidateMatch[];
  readonly total: number;
  readonly filtersApplied: SearchFilters;
}

export interface SaveChoiceResult {
  readonly success: boolean;
  readonly matchId: string;
}

// ─────────────────────────────────────────────────────────────
// Database Row Types (from Supabase)
// ─────────────────────────────────────────────────────────────

export interface ProposalRow {
  readonly _id: string;
  readonly Guest: string | null;
  readonly Listing: string | null;
  readonly 'Guest email': string;
  readonly 'Host User': string | null;
  readonly Status: string | null;
  readonly 'Move in range start': string;
  readonly 'Move in range end': string;
  readonly 'Reservation Span (Weeks)': number;
  readonly 'Days Selected': number[] | null;
  readonly 'Nights Selected (Nights list)': number[] | null;
  readonly 'nights per week (num)': number;
  readonly 'proposal nightly price': number | null;
  readonly 'cleaning fee': number | null;
  readonly 'damage deposit': number | null;
  readonly Deleted: boolean | null;
}

export interface ListingRow {
  readonly _id: string;
  readonly Name: string | null;
  readonly 'Host User': string | null;
  readonly 'Location - Borough': string | null;
  readonly 'Location - Hood': string | null;
  readonly 'Location - Address': unknown;
  readonly 'Days Available (List of Days)': number[];
  readonly 'Nights Available (List of Nights)': number[];
  readonly 'Minimum Nights': number;
  readonly 'Maximum Nights': number | null;
  readonly '\u{1F4B0}Nightly Host Rate for 1 night': number | null;
  readonly '\u{1F4B0}Nightly Host Rate for 2 nights': number | null;
  readonly '\u{1F4B0}Nightly Host Rate for 3 nights': number | null;
  readonly '\u{1F4B0}Nightly Host Rate for 4 nights': number | null;
  readonly '\u{1F4B0}Nightly Host Rate for 5 nights': number | null;
  readonly '\u{1F4B0}Nightly Host Rate for 6 nights': number | null;
  readonly '\u{1F4B0}Nightly Host Rate for 7 nights': number | null;
  readonly '\u{1F4B0}Cleaning Cost / Maintenance Fee': number | null;
  readonly '\u{1F4B0}Damage Deposit': number;
  readonly Active: boolean | null;
  readonly Deleted: boolean | null;
  // Joined fields
  readonly boroughName?: string | null;
  readonly hoodName?: string | null;
}

export interface UserRow {
  readonly _id: string;
  readonly 'Name - First': string | null;
  readonly 'Name - Last': string | null;
  readonly 'Name - Full': string | null;
  readonly email: string | null;
  readonly 'Verify - Linked In ID': boolean | null;
  readonly 'Verify - Phone': boolean | null;
  readonly 'user verified?': boolean | null;
}
