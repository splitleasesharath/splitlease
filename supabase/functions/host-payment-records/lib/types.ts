/**
 * Type definitions for Host Payment Records Edge Function
 * Split Lease - Supabase Edge Functions
 */

/**
 * Rental type determines payment cycle intervals:
 * - Monthly: 31-day intervals
 * - Weekly/Nightly: 28-day (4-week) intervals
 */
export type RentalType = 'Monthly' | 'Weekly' | 'Nightly';

/**
 * Week pattern affects how partial periods are calculated for Weekly rentals
 */
export type WeekPattern =
  | 'Every week'
  | 'One week on, one week off'
  | 'Two weeks on, two weeks off'
  | 'One week on, three weeks off';

/**
 * Input for generating host payment records
 * Mirrors the Bubble API Event inputs
 */
export interface GeneratePaymentRecordsInput {
  /** The lease/reservation ID (Bookings-Leases._id) */
  leaseId: string;

  /** Rental type: 'Nightly', 'Weekly', or 'Monthly' */
  rentalType: RentalType;

  /** Move-in date (start of the lease) */
  moveInDate: string;

  /** Reservation span in weeks (for Nightly/Weekly) */
  reservationSpanWeeks?: number;

  /** Reservation span in months (for Monthly) */
  reservationSpanMonths?: number;

  /** Week pattern for Weekly rentals */
  weekPattern: WeekPattern;

  /** Rent for a 4-week period (for Nightly/Weekly) */
  fourWeekRent?: number;

  /** Rent per month (for Monthly) */
  rentPerMonth?: number;

  /** Maintenance fee per payment period */
  maintenanceFee: number;

  /** Optional: Damage deposit (added to first payment only) */
  damageDeposit?: number;
}

/**
 * Calculated payment schedule entry
 */
export interface PaymentScheduleEntry {
  /** Payment number (1-indexed) */
  paymentNumber: number;

  /** Scheduled payment date */
  scheduledDate: Date;

  /** Rent amount for this period (without maintenance) */
  rent: number;

  /** Total amount including maintenance fee */
  total: number;
}

/**
 * Result of payment schedule calculation
 */
export interface PaymentScheduleResult {
  /** Array of payment dates (formatted as mm-dd-yyyy) */
  paymentDates: string[];

  /** Array of rent amounts (without maintenance) */
  rentList: number[];

  /** Array of total amounts (rent + maintenance) */
  totalRentList: number[];

  /** Sum of all payments */
  totalCompensationAmount: number;

  /** Number of payment cycles */
  numberOfPaymentCycles: number;
}

/**
 * Payment record as stored in the database
 */
export interface PaymentRecord {
  _id: string;

  /** Reference to the lease (Bookings-Leases) */
  'Booking - Reservation': string;

  /** Payment sequence number (1-indexed) */
  'Payment #': number;

  /** Scheduled payment date */
  'Scheduled Date': string;

  /** Rent amount for this period */
  Rent: number;

  /** Maintenance fee for this period */
  'Maintenance Fee': number;

  /** Total amount to be paid to host */
  'Total Paid to Host': number;

  /** Flag indicating this is a host payment */
  'Payment to Host?': boolean;

  /** Flag indicating this is NOT from guest (for host payments) */
  'Payment from guest?': boolean;

  /** Damage deposit (only on first payment, if applicable) */
  'Damage Deposit'?: number;

  /** Calculation source identifier */
  source_calculation: string;

  /** Timestamps */
  'Created Date': string;
  'Modified Date': string;
}

/**
 * Lease data needed for payment record generation
 */
export interface LeaseData {
  _id: string;
  Proposal?: string;
  'rental type'?: string;
  'Move In Date'?: string;
  'Reservation Span (weeks)'?: number;
  'Reservation Span (months)'?: number;
  'week pattern'?: string;
  '4 week rent'?: number;
  'rent per month'?: number;
  'Maintenance Fee'?: number;
  'Damage Deposit'?: number;
  'Payment Records SL-Hosts'?: string[];
  'Total Compensation'?: number;
}

/**
 * Proposal data for fetching additional payment details
 */
export interface ProposalData {
  _id: string;
  'hc cleaning fee'?: number;
  'hc damage deposit'?: number;
  '4 week compensation'?: number;
  'rental type'?: string;
}

/**
 * Response from generate action
 */
export interface GeneratePaymentRecordsResponse {
  /** IDs of created payment records */
  paymentRecordIds: string[];

  /** Total compensation amount */
  totalCompensation: number;

  /** Number of payment records created */
  recordCount: number;

  /** The lease ID */
  leaseId: string;
}

/**
 * User context from authentication
 */
export interface UserContext {
  id: string;
  email: string;
  role?: string;
}
