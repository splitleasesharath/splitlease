/**
 * SplitLease API Client
 *
 * Type-safe API client for interacting with the SplitLease backend.
 * Provides methods for all API endpoints with proper error handling,
 * retries, and response validation.
 */

import type {
  APIConfig,
  APIResponse,
  PaginatedResponse,
  SearchParams,
} from '../types/api';
import { ErrorCode as ErrorCodeEnum, HttpStatus as HttpStatusEnum } from '../types/api';
import type {
  SplitLease,
  Booking,
  SearchFilters,
} from '../types/models';

/**
 * Default API configuration
 */
const DEFAULT_CONFIG: APIConfig = {
  baseURL: import.meta.env.VITE_API_BASE_URL || 'http://localhost:3000/api',
  timeout: 30000,
  retryAttempts: 3,
  retryDelay: 1000,
  headers: {
    'Content-Type': 'application/json',
  },
};

/**
 * SplitLease API Client Class
 */
export class SplitLeaseAPI {
  private config: APIConfig;
  private authToken: string | null = null;

  constructor(config?: Partial<APIConfig>) {
    this.config = { ...DEFAULT_CONFIG, ...config };
  }

  /**
   * Set authentication token for authenticated requests
   */
  setAuthToken(token: string | null): void {
    this.authToken = token;
  }

  /**
   * Get current authentication token
   */
  getAuthToken(): string | null {
    return this.authToken;
  }

  /**
   * Private method to make HTTP requests with error handling and retries
   */
  private async request<T>(
    endpoint: string,
    options: RequestInit = {},
    attempt = 1
  ): Promise<APIResponse<T>> {
    const url = `${this.config.baseURL}${endpoint}`;

    // Build headers
    const headers: Record<string, string> = {
      ...(this.config.headers || {}),
      ...(options.headers as Record<string, string> || {}),
    };

    if (this.authToken) {
      headers['Authorization'] = `Bearer ${this.authToken}`;
    }

    try {
      const controller = new AbortController();
      const timeoutId = setTimeout(
        () => controller.abort(),
        this.config.timeout
      );

      const response = await fetch(url, {
        ...options,
        headers,
        signal: controller.signal,
      });

      clearTimeout(timeoutId);

      // Parse response
      const data = await response.json();

      // Handle HTTP errors
      if (!response.ok) {
        return {
          success: false,
          error: {
            code: this.mapStatusToErrorCode(response.status),
            message: data.error?.message || response.statusText,
            details: data.error?.details,
            statusCode: response.status,
          },
        };
      }

      return {
        success: true,
        data: data.data || data,
        timestamp: new Date().toISOString(),
      };
    } catch (error) {
      // Retry on network errors
      if (attempt < (this.config.retryAttempts || 3)) {
        await this.delay(this.config.retryDelay || 1000);
        return this.request<T>(endpoint, options, attempt + 1);
      }

      // Return error response
      return {
        success: false,
        error: {
          code: ErrorCodeEnum.NETWORK_ERROR,
          message: error instanceof Error ? error.message : 'Network error',
          statusCode: 0,
        },
      };
    }
  }

  /**
   * Map HTTP status codes to error codes
   */
  private mapStatusToErrorCode(status: number): string {
    switch (status) {
      case HttpStatusEnum.BAD_REQUEST:
      case HttpStatusEnum.UNPROCESSABLE_ENTITY:
        return ErrorCodeEnum.VALIDATION_ERROR;
      case HttpStatusEnum.UNAUTHORIZED:
        return ErrorCodeEnum.UNAUTHORIZED;
      case HttpStatusEnum.FORBIDDEN:
        return ErrorCodeEnum.FORBIDDEN;
      case HttpStatusEnum.NOT_FOUND:
        return ErrorCodeEnum.NOT_FOUND;
      case HttpStatusEnum.CONFLICT:
        return ErrorCodeEnum.CONFLICT;
      case HttpStatusEnum.TOO_MANY_REQUESTS:
        return ErrorCodeEnum.RATE_LIMIT_EXCEEDED;
      case HttpStatusEnum.SERVICE_UNAVAILABLE:
        return ErrorCodeEnum.SERVICE_UNAVAILABLE;
      default:
        return ErrorCodeEnum.INTERNAL_ERROR;
    }
  }

  /**
   * Delay helper for retries
   */
  private delay(ms: number): Promise<void> {
    return new Promise((resolve) => setTimeout(resolve, ms));
  }

  // ==========================================================================
  // Listings API Methods
  // ==========================================================================

  /**
   * Search listings with filters and pagination
   */
  async searchListings(
    filters: SearchFilters,
    params?: SearchParams
  ): Promise<PaginatedResponse<SplitLease>> {
    const queryParams = new URLSearchParams({
      ...(params?.page && { page: params.page.toString() }),
      ...(params?.limit && { limit: params.limit.toString() }),
      ...(filters.query && { query: filters.query }),
      ...(filters.city && { city: filters.city }),
      ...(filters.state && { state: filters.state }),
      ...(filters.minPrice && { minPrice: filters.minPrice.toString() }),
      ...(filters.maxPrice && { maxPrice: filters.maxPrice.toString() }),
      ...(filters.bedrooms && { bedrooms: filters.bedrooms.toString() }),
    });

    return this.request<PaginatedResponse<SplitLease>['data']>(
      `/listings/search?${queryParams}`,
      { method: 'GET' }
    );
  }

  /**
   * Get a single listing by ID
   */
  async getListing(id: string): Promise<APIResponse<SplitLease>> {
    return this.request<SplitLease>(`/listings/${id}`, { method: 'GET' });
  }

  /**
   * Create a new listing (requires authentication)
   */
  async createListing(
    data: Partial<SplitLease>
  ): Promise<APIResponse<SplitLease>> {
    return this.request<SplitLease>('/listings', {
      method: 'POST',
      body: JSON.stringify(data),
    });
  }

  /**
   * Update an existing listing (requires authentication)
   */
  async updateListing(
    id: string,
    data: Partial<SplitLease>
  ): Promise<APIResponse<SplitLease>> {
    return this.request<SplitLease>(`/listings/${id}`, {
      method: 'PUT',
      body: JSON.stringify(data),
    });
  }

  /**
   * Delete a listing (requires authentication)
   */
  async deleteListing(id: string): Promise<APIResponse<void>> {
    return this.request<void>(`/listings/${id}`, { method: 'DELETE' });
  }

  // ==========================================================================
  // Bookings API Methods
  // ==========================================================================

  /**
   * Create a new booking (requires authentication)
   */
  async createBooking(data: {
    listingId: string;
    checkIn: string;
    checkOut: string;
    guests: number;
  }): Promise<APIResponse<Booking>> {
    return this.request<Booking>('/bookings', {
      method: 'POST',
      body: JSON.stringify(data),
    });
  }

  /**
   * Get a booking by ID (requires authentication)
   */
  async getBooking(id: string): Promise<APIResponse<Booking>> {
    return this.request<Booking>(`/bookings/${id}`, { method: 'GET' });
  }

  /**
   * Get user's bookings (requires authentication)
   */
  async getUserBookings(): Promise<PaginatedResponse<Booking>> {
    return this.request<PaginatedResponse<Booking>['data']>(
      '/bookings/my-bookings',
      { method: 'GET' }
    );
  }

  /**
   * Cancel a booking (requires authentication)
   */
  async cancelBooking(
    id: string,
    reason?: string
  ): Promise<APIResponse<Booking>> {
    return this.request<Booking>(`/bookings/${id}/cancel`, {
      method: 'POST',
      body: JSON.stringify({ reason }),
    });
  }

  // ==========================================================================
  // User API Methods (stubs for future implementation)
  // ==========================================================================

  /**
   * Get current user profile (requires authentication)
   */
  async getCurrentUser(): Promise<APIResponse<any>> {
    return this.request('/users/me', { method: 'GET' });
  }

  /**
   * Update user profile (requires authentication)
   */
  async updateUserProfile(data: any): Promise<APIResponse<any>> {
    return this.request('/users/me', {
      method: 'PUT',
      body: JSON.stringify(data),
    });
  }
}

/**
 * Default API client instance
 */
export const apiClient = new SplitLeaseAPI();
