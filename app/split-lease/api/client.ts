/**
 * Main API client class with methods for all endpoints
 * Implements request/response handling, retries, and error management
 */

import {
  API_BASE_PATH,
  API_ENDPOINTS,
  DEFAULT_TIMEOUT,
  MAX_RETRIES,
  DEFAULT_HEADERS,
} from './config';
import {
  addAuthToken,
  logRequest,
  logResponse,
  handleResponseError,
  handleTokenRefresh,
  clearAuth,
  isRetryableError,
  getRetryDelay,
} from './interceptors';
import type { RequestConfig } from '../types/api';
import type {
  LoginRequest,
  RegisterRequest,
  UpdateUserRequest,
  CreateListingRequest,
  UpdateListingRequest,
  CreateBookingRequest,
  CreateProposalRequest,
  CounterProposalRequest,
  CreateReviewRequest,
  SearchListingsRequest,
  ListingListResponse,
  ListingDetailResponse,
  BookingListResponse,
  BookingDetailResponse,
  ProposalListResponse,
  ProposalDetailResponse,
  ReviewListResponse,
  UserResponse,
  AuthResponseWrapper,
} from './types';
import type { PaginationParams } from '../types/api';

/**
 * API Client class
 */
export class ApiClient {
  private baseUrl: string;
  private defaultTimeout: number;

  constructor(baseUrl: string = API_BASE_PATH, timeout: number = DEFAULT_TIMEOUT) {
    this.baseUrl = baseUrl;
    this.defaultTimeout = timeout;
  }

  /**
   * Generic request method with retry logic
   */
  private async request<T>(
    method: string,
    endpoint: string,
    data?: unknown,
    config: RequestConfig = {}
  ): Promise<T> {
    const url = `${this.baseUrl}${endpoint}`;
    const timeout = config.timeout || this.defaultTimeout;
    const maxRetries = config.retries !== undefined ? config.retries : MAX_RETRIES;

    let lastError: Error | null = null;

    for (let attempt = 0; attempt <= maxRetries; attempt++) {
      try {
        logRequest(method, url, data);

        const controller = new AbortController();
        const timeoutId = setTimeout(() => controller.abort(), timeout);

        const headers = {
          ...DEFAULT_HEADERS,
          ...addAuthToken(config.headers),
        };

        const requestOptions: RequestInit = {
          method,
          headers,
          signal: controller.signal,
        };

        if (data && (method === 'POST' || method === 'PUT' || method === 'PATCH')) {
          requestOptions.body = JSON.stringify(data);
        }

        const response = await fetch(url, requestOptions);
        clearTimeout(timeoutId);

        // Handle 401 Unauthorized - attempt token refresh
        if (response.status === 401 && attempt === 0) {
          const newToken = await handleTokenRefresh();
          if (newToken) {
            // Retry request with new token
            continue;
          } else {
            clearAuth();
            throw handleResponseError(response);
          }
        }

        let responseData: any;
        const contentType = response.headers.get('content-type');

        if (contentType && contentType.includes('application/json')) {
          responseData = await response.json();
        } else {
          responseData = await response.text();
        }

        logResponse(method, url, response, responseData);

        if (!response.ok) {
          const error = handleResponseError(response, responseData);

          // Retry on retryable errors
          if (attempt < maxRetries && isRetryableError(response.status)) {
            const delay = getRetryDelay(attempt, config.retryDelay);
            await new Promise((resolve) => setTimeout(resolve, delay));
            continue;
          }

          throw error;
        }

        return responseData as T;
      } catch (error) {
        lastError = error as Error;

        // Don't retry on non-retryable errors
        if (error instanceof Error && error.name === 'AbortError') {
          throw new Error('Request timeout');
        }

        if (attempt >= maxRetries) {
          break;
        }

        // Wait before retry
        const delay = getRetryDelay(attempt, config.retryDelay);
        await new Promise((resolve) => setTimeout(resolve, delay));
      }
    }

    throw lastError || new Error('Request failed');
  }

  // Authentication Methods

  /**
   * Login user
   */
  async login(data: LoginRequest): Promise<AuthResponseWrapper> {
    return this.request<AuthResponseWrapper>('POST', API_ENDPOINTS.AUTH.LOGIN, data);
  }

  /**
   * Logout user
   */
  async logout(): Promise<void> {
    await this.request('POST', API_ENDPOINTS.AUTH.LOGOUT);
    clearAuth();
  }

  /**
   * Register new user
   */
  async register(data: RegisterRequest): Promise<AuthResponseWrapper> {
    return this.request<AuthResponseWrapper>('POST', API_ENDPOINTS.AUTH.REGISTER, data);
  }

  // User Methods

  /**
   * Get current user profile
   */
  async getCurrentUser(): Promise<UserResponse> {
    return this.request<UserResponse>('GET', API_ENDPOINTS.USERS.ME);
  }

  /**
   * Get user by ID
   */
  async getUserById(id: string): Promise<UserResponse> {
    return this.request<UserResponse>('GET', API_ENDPOINTS.USERS.BY_ID(id));
  }

  /**
   * Update user profile
   */
  async updateUser(id: string, data: UpdateUserRequest): Promise<UserResponse> {
    return this.request<UserResponse>('PUT', API_ENDPOINTS.USERS.UPDATE(id), data);
  }

  // Listing Methods

  /**
   * Search listings
   */
  async searchListings(params: SearchListingsRequest): Promise<ListingListResponse> {
    const queryString = new URLSearchParams(params as any).toString();
    return this.request<ListingListResponse>(
      'GET',
      `${API_ENDPOINTS.LISTINGS.SEARCH}?${queryString}`
    );
  }

  /**
   * Get listing by ID
   */
  async getListingById(id: string): Promise<ListingDetailResponse> {
    return this.request<ListingDetailResponse>('GET', API_ENDPOINTS.LISTINGS.BY_ID(id));
  }

  /**
   * Create new listing
   */
  async createListing(data: CreateListingRequest): Promise<ListingDetailResponse> {
    return this.request<ListingDetailResponse>('POST', API_ENDPOINTS.LISTINGS.CREATE, data);
  }

  /**
   * Update listing
   */
  async updateListing(
    id: string,
    data: UpdateListingRequest
  ): Promise<ListingDetailResponse> {
    return this.request<ListingDetailResponse>('PUT', API_ENDPOINTS.LISTINGS.UPDATE(id), data);
  }

  /**
   * Delete listing
   */
  async deleteListing(id: string): Promise<void> {
    return this.request('DELETE', API_ENDPOINTS.LISTINGS.DELETE(id));
  }

  /**
   * Get my listings
   */
  async getMyListings(params?: PaginationParams): Promise<ListingListResponse> {
    const queryString = params ? new URLSearchParams(params as any).toString() : '';
    return this.request<ListingListResponse>(
      'GET',
      `${API_ENDPOINTS.LISTINGS.MY_LISTINGS}${queryString ? `?${queryString}` : ''}`
    );
  }

  // Booking Methods

  /**
   * Create booking
   */
  async createBooking(data: CreateBookingRequest): Promise<BookingDetailResponse> {
    return this.request<BookingDetailResponse>('POST', API_ENDPOINTS.BOOKINGS.CREATE, data);
  }

  /**
   * Get booking by ID
   */
  async getBookingById(id: string): Promise<BookingDetailResponse> {
    return this.request<BookingDetailResponse>('GET', API_ENDPOINTS.BOOKINGS.BY_ID(id));
  }

  /**
   * Cancel booking
   */
  async cancelBooking(id: string): Promise<BookingDetailResponse> {
    return this.request<BookingDetailResponse>('POST', API_ENDPOINTS.BOOKINGS.CANCEL(id));
  }

  /**
   * Get my bookings
   */
  async getMyBookings(params?: PaginationParams): Promise<BookingListResponse> {
    const queryString = params ? new URLSearchParams(params as any).toString() : '';
    return this.request<BookingListResponse>(
      'GET',
      `${API_ENDPOINTS.BOOKINGS.MY_BOOKINGS}${queryString ? `?${queryString}` : ''}`
    );
  }

  // Proposal Methods

  /**
   * Create proposal
   */
  async createProposal(data: CreateProposalRequest): Promise<ProposalDetailResponse> {
    return this.request<ProposalDetailResponse>('POST', API_ENDPOINTS.PROPOSALS.CREATE, data);
  }

  /**
   * Get proposal by ID
   */
  async getProposalById(id: string): Promise<ProposalDetailResponse> {
    return this.request<ProposalDetailResponse>('GET', API_ENDPOINTS.PROPOSALS.BY_ID(id));
  }

  /**
   * Accept proposal
   */
  async acceptProposal(id: string): Promise<ProposalDetailResponse> {
    return this.request<ProposalDetailResponse>('POST', API_ENDPOINTS.PROPOSALS.ACCEPT(id));
  }

  /**
   * Reject proposal
   */
  async rejectProposal(id: string): Promise<ProposalDetailResponse> {
    return this.request<ProposalDetailResponse>('POST', API_ENDPOINTS.PROPOSALS.REJECT(id));
  }

  /**
   * Counter proposal
   */
  async counterProposal(
    id: string,
    data: CounterProposalRequest
  ): Promise<ProposalDetailResponse> {
    return this.request<ProposalDetailResponse>(
      'POST',
      API_ENDPOINTS.PROPOSALS.COUNTER(id),
      data
    );
  }

  // Review Methods

  /**
   * Create review
   */
  async createReview(data: CreateReviewRequest): Promise<ApiResponse<Review>> {
    return this.request<ApiResponse<Review>>('POST', API_ENDPOINTS.REVIEWS.CREATE, data);
  }

  /**
   * Get reviews by listing ID
   */
  async getReviewsByListing(
    listingId: string,
    params?: PaginationParams
  ): Promise<ReviewListResponse> {
    const queryString = params ? new URLSearchParams(params as any).toString() : '';
    return this.request<ReviewListResponse>(
      'GET',
      `${API_ENDPOINTS.REVIEWS.BY_LISTING(listingId)}${queryString ? `?${queryString}` : ''}`
    );
  }

  /**
   * Get reviews by user ID
   */
  async getReviewsByUser(
    userId: string,
    params?: PaginationParams
  ): Promise<ReviewListResponse> {
    const queryString = params ? new URLSearchParams(params as any).toString() : '';
    return this.request<ReviewListResponse>(
      'GET',
      `${API_ENDPOINTS.REVIEWS.BY_USER(userId)}${queryString ? `?${queryString}` : ''}`
    );
  }
}

/**
 * Default API client instance
 */
export const apiClient = new ApiClient();
