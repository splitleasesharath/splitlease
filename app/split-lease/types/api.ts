/**
 * API Types
 *
 * Type definitions for API requests, responses, and errors.
 * These types provide type safety for all API interactions.
 */

import { z } from 'zod';

// ============================================================================
// Generic API Response Types
// ============================================================================

export const APIErrorSchema = z.object({
  code: z.string(),
  message: z.string(),
  details: z.record(z.string(), z.unknown()).optional(),
  statusCode: z.number().optional(),
});

export type APIError = z.infer<typeof APIErrorSchema>;

export const APIResponseSchema = <T extends z.ZodTypeAny>(dataSchema: T) =>
  z.object({
    success: z.boolean(),
    data: dataSchema.optional(),
    error: APIErrorSchema.optional(),
    timestamp: z.string().datetime().optional(),
  });

export type APIResponse<T> = {
  success: boolean;
  data?: T;
  error?: APIError;
  timestamp?: string;
};

// ============================================================================
// Pagination Types
// ============================================================================

export const PaginationSchema = z.object({
  page: z.number().int().positive().default(1),
  limit: z.number().int().positive().max(100).default(10),
  total: z.number().int().nonnegative(),
  totalPages: z.number().int().nonnegative(),
});

export type Pagination = z.infer<typeof PaginationSchema>;

export const PaginatedResponseSchema = <T extends z.ZodTypeAny>(
  dataSchema: T
) =>
  z.object({
    success: z.boolean(),
    data: z.object({
      results: z.array(dataSchema),
      pagination: PaginationSchema,
    }),
    error: APIErrorSchema.optional(),
  });

export type PaginatedResponse<T> = {
  success: boolean;
  data?: {
    results: T[];
    pagination: Pagination;
  };
  error?: APIError;
};

// ============================================================================
// Search Parameters
// ============================================================================

export const SearchParamsSchema = z.object({
  query: z.string().optional(),
  page: z.number().int().positive().default(1),
  limit: z.number().int().positive().max(100).default(10),
  sortBy: z.string().optional(),
  sortOrder: z.enum(['asc', 'desc']).default('asc').optional(),
  filters: z.record(z.string(), z.unknown()).optional(),
});

export type SearchParams = z.infer<typeof SearchParamsSchema>;

// ============================================================================
// Common API Request Types
// ============================================================================

export interface CreateListingRequest {
  title: string;
  description: string;
  location: {
    address?: string;
    city: string;
    state: string;
    country: string;
    zipCode?: string;
  };
  price: number;
  availableFrom: string;
  availableTo: string;
  bedrooms: number;
  bathrooms: number;
  amenities: string[];
  images: Array<{
    url: string;
    alt: string;
  }>;
}

export interface UpdateListingRequest extends Partial<CreateListingRequest> {
  status?: 'draft' | 'active' | 'inactive' | 'archived';
}

export interface CreateBookingRequest {
  listingId: string;
  checkIn: string;
  checkOut: string;
  guests: number;
  specialRequests?: string;
}

export interface UpdateBookingRequest {
  status?: 'pending' | 'confirmed' | 'cancelled' | 'completed' | 'rejected';
  specialRequests?: string;
}

export interface CreateReviewRequest {
  bookingId: string;
  listingId: string;
  rating: number;
  comment: string;
}

export interface SendMessageRequest {
  recipientId: string;
  content: string;
  conversationId?: string;
}

// ============================================================================
// API Client Configuration
// ============================================================================

export interface APIConfig {
  baseURL: string;
  timeout?: number;
  headers?: Record<string, string>;
  retryAttempts?: number;
  retryDelay?: number;
}

export interface RequestConfig {
  method: 'GET' | 'POST' | 'PUT' | 'PATCH' | 'DELETE';
  endpoint: string;
  data?: unknown;
  params?: Record<string, string | number | boolean>;
  headers?: Record<string, string>;
}

// ============================================================================
// HTTP Status Codes
// ============================================================================

export enum HttpStatus {
  OK = 200,
  CREATED = 201,
  NO_CONTENT = 204,
  BAD_REQUEST = 400,
  UNAUTHORIZED = 401,
  FORBIDDEN = 403,
  NOT_FOUND = 404,
  CONFLICT = 409,
  UNPROCESSABLE_ENTITY = 422,
  TOO_MANY_REQUESTS = 429,
  INTERNAL_SERVER_ERROR = 500,
  SERVICE_UNAVAILABLE = 503,
}

// ============================================================================
// Error Codes
// ============================================================================

export enum ErrorCode {
  VALIDATION_ERROR = 'VALIDATION_ERROR',
  NOT_FOUND = 'NOT_FOUND',
  UNAUTHORIZED = 'UNAUTHORIZED',
  FORBIDDEN = 'FORBIDDEN',
  CONFLICT = 'CONFLICT',
  RATE_LIMIT_EXCEEDED = 'RATE_LIMIT_EXCEEDED',
  INTERNAL_ERROR = 'INTERNAL_ERROR',
  SERVICE_UNAVAILABLE = 'SERVICE_UNAVAILABLE',
  NETWORK_ERROR = 'NETWORK_ERROR',
  TIMEOUT = 'TIMEOUT',
}
