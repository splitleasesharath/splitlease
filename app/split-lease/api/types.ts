/**
 * API client specific types and interfaces
 */

import type {
  Listing,
  Booking,
  Proposal,
  Review,
  User,
  SearchFilters,
} from '../types/models';
import type {
  ApiResponse,
  PaginatedResponse,
  PaginationParams,
  AuthResponse,
} from '../types/api';

/**
 * Login request payload
 */
export interface LoginRequest {
  email: string;
  password: string;
  rememberMe?: boolean;
}

/**
 * Register request payload
 */
export interface RegisterRequest {
  email: string;
  password: string;
  firstName: string;
  lastName: string;
  phone?: string;
  agreeToTerms: boolean;
}

/**
 * Update user request payload
 */
export interface UpdateUserRequest {
  firstName?: string;
  lastName?: string;
  phone?: string;
  avatar?: string;
}

/**
 * Create listing request payload
 */
export interface CreateListingRequest
  extends Omit<Listing, 'id' | 'ownerId' | 'status' | 'createdAt' | 'updatedAt'> {}

/**
 * Update listing request payload
 */
export interface UpdateListingRequest extends Partial<CreateListingRequest> {}

/**
 * Create booking request payload
 */
export interface CreateBookingRequest
  extends Omit<Booking, 'id' | 'guestId' | 'status' | 'createdAt' | 'updatedAt'> {}

/**
 * Create proposal request payload
 */
export interface CreateProposalRequest
  extends Omit<Proposal, 'id' | 'guestId' | 'status' | 'createdAt' | 'updatedAt' | 'expiresAt'> {}

/**
 * Counter proposal request payload
 */
export interface CounterProposalRequest {
  proposedPrice: number;
  message?: string;
}

/**
 * Create review request payload
 */
export interface CreateReviewRequest
  extends Omit<Review, 'id' | 'reviewerId' | 'createdAt' | 'updatedAt'> {}

/**
 * Search listings request payload
 */
export interface SearchListingsRequest extends PaginationParams {
  filters?: SearchFilters;
}

/**
 * Listing list response
 */
export type ListingListResponse = ApiResponse<PaginatedResponse<Listing>>;

/**
 * Listing detail response
 */
export type ListingDetailResponse = ApiResponse<Listing>;

/**
 * Booking list response
 */
export type BookingListResponse = ApiResponse<PaginatedResponse<Booking>>;

/**
 * Booking detail response
 */
export type BookingDetailResponse = ApiResponse<Booking>;

/**
 * Proposal list response
 */
export type ProposalListResponse = ApiResponse<PaginatedResponse<Proposal>>;

/**
 * Proposal detail response
 */
export type ProposalDetailResponse = ApiResponse<Proposal>;

/**
 * Review list response
 */
export type ReviewListResponse = ApiResponse<PaginatedResponse<Review>>;

/**
 * User response
 */
export type UserResponse = ApiResponse<User>;

/**
 * Auth response wrapper
 */
export type AuthResponseWrapper = ApiResponse<AuthResponse>;
