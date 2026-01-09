/**
 * Date Change Request Types
 * Split Lease - Supabase Edge Functions
 */

// ─────────────────────────────────────────────────────────────
// Request Types
// ─────────────────────────────────────────────────────────────

export type RequestType = 'adding' | 'removing' | 'swapping';

export type RequestStatus =
  | 'waiting_for_answer'
  | 'Approved'
  | 'Rejected'
  | 'expired'
  | 'cancelled';

// ─────────────────────────────────────────────────────────────
// Input Types (from API requests)
// ─────────────────────────────────────────────────────────────

export interface CreateDateChangeRequestInput {
  leaseId: string;
  typeOfRequest: RequestType;
  dateAdded?: string | null;
  dateRemoved?: string | null;
  message?: string;
  priceRate?: number;
  percentageOfRegular?: number;
  requestedById: string;
  receiverId: string;
}

export interface GetDateChangeRequestsInput {
  leaseId: string;
}

export interface AcceptRequestInput {
  requestId: string;
  message?: string;
}

export interface DeclineRequestInput {
  requestId: string;
  reason?: string;
}

export interface CancelRequestInput {
  requestId: string;
}

export interface GetThrottleStatusInput {
  userId: string;
}

// ─────────────────────────────────────────────────────────────
// Response Types
// ─────────────────────────────────────────────────────────────

export interface CreateDateChangeRequestResponse {
  requestId: string;
  leaseId: string;
  createdAt: string;
}

export interface GetDateChangeRequestsResponse {
  requests: DateChangeRequestData[];
}

export interface AcceptRequestResponse {
  requestId: string;
  status: RequestStatus;
  answeredAt: string;
}

export interface DeclineRequestResponse {
  requestId: string;
  status: RequestStatus;
  answeredAt: string;
}

export interface CancelRequestResponse {
  requestId: string;
  status: RequestStatus;
}

export interface ThrottleStatusResponse {
  requestCount: number;
  limit: number;
  isThrottled: boolean;
  windowResetTime: string;
}

// ─────────────────────────────────────────────────────────────
// Database Types (matching Bubble column names)
// ─────────────────────────────────────────────────────────────

export interface DateChangeRequestData {
  _id: string;
  'Lease': string | null;
  'Requested by': string | null;
  'Request receiver': string | null;
  'type of request': RequestType;
  'date added': string | null;
  'date removed': string | null;
  'Message from Requested by': string | null;
  'Price/Rate of the night': number | null;
  '%compared to regular nightly price': number | null;
  'request status': RequestStatus;
  'expiration date': string | null;
  'visible to the guest?': boolean;
  'visible to the host?': boolean;
  'Created Date': string;
  'Created By': string | null;
  'Modified Date': string;
  'answer date': string | null;
  'Answer to Request': string | null;
  'Stay Associated 1': string | null;
  'Stay Associated 2': string | null;
  'LIST of NEW Dates in the stay': string[] | null;
  'LIST of OLD Dates in the stay': string[] | null;
  pending: boolean;
}

export interface LeaseData {
  _id: string;
  'Agreement Number': string | null;
  'Guest': string | null;
  'Host': string | null;
  'Listing': string | null;
  'Reservation Period : Start': string | null;
  'Reservation Period : End': string | null;
  'List of Booked Dates': string[] | null;
  'Date Change Requests': string[] | null;
  'Lease Status': string | null;
}

export interface UserData {
  _id: string;
  email: string | null;
  'Name - First': string | null;
  'Name - Full': string | null;
}

// ─────────────────────────────────────────────────────────────
// User Context (from authentication)
// ─────────────────────────────────────────────────────────────

export interface UserContext {
  id: string;
  email: string;
}

// ─────────────────────────────────────────────────────────────
// Constants
// ─────────────────────────────────────────────────────────────

export const THROTTLE_LIMIT = 5; // Max requests per 24 hours
export const THROTTLE_WINDOW_HOURS = 24;
export const EXPIRATION_HOURS = 48;
