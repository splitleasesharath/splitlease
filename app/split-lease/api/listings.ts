/**
 * Listings API Client
 *
 * Provides type-safe API calls for listing data with runtime validation
 * and error handling
 */

import { z } from 'zod';

// Zod schemas for runtime validation
const ListingSchema = z.object({
  id: z.string(),
  title: z.string(),
  location: z.string(),
  bedrooms: z.number().int().min(0),
  bathrooms: z.number().optional(),
  pricePerNight: z.number().positive(),
  imageUrl: z.string().url(),
  availableDays: z.array(z.number().int().min(0).max(6)).optional(),
  rating: z.number().min(0).max(5).optional(),
  reviewCount: z.number().int().min(0).optional(),
});

const ListingsResponseSchema = z.object({
  success: z.boolean(),
  data: z.object({
    listings: z.array(ListingSchema),
    total: z.number().optional(),
    hasMore: z.boolean().optional(),
  }),
  meta: z.object({
    timestamp: z.string(),
    version: z.string(),
  }).optional(),
});

export type Listing = z.infer<typeof ListingSchema>;
export type ListingsResponse = z.infer<typeof ListingsResponseSchema>;

// API configuration
const API_BASE = import.meta.env.VITE_API_URL || 'http://localhost:3000/api';
const DEFAULT_TIMEOUT = 10000; // 10 seconds

/**
 * Application error class for API errors
 */
export class APIError extends Error {
  constructor(
    message: string,
    public code: string,
    public statusCode: number,
    public context?: Record<string, unknown>
  ) {
    super(message);
    this.name = 'APIError';
    Error.captureStackTrace(this, this.constructor);
  }
}

/**
 * Fetches popular listings from the API
 *
 * @param limit - Number of listings to fetch (default: 6)
 * @returns Promise resolving to array of listings
 * @throws APIError if request fails or validation fails
 */
export async function getPopularListings(limit: number = 6): Promise<Listing[]> {
  try {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), DEFAULT_TIMEOUT);

    const response = await fetch(`${API_BASE}/v1/listings/popular?limit=${limit}`, {
      signal: controller.signal,
      headers: {
        'Content-Type': 'application/json',
      },
    });

    clearTimeout(timeoutId);

    if (!response.ok) {
      throw new APIError(
        'Failed to fetch popular listings',
        'FETCH_ERROR',
        response.status
      );
    }

    const data = await response.json();

    // Runtime validation
    const validated = ListingsResponseSchema.parse(data);

    return validated.data.listings;
  } catch (error) {
    if (error instanceof z.ZodError) {
      throw new APIError(
        'Invalid API response format',
        'VALIDATION_ERROR',
        500,
        { zodError: error }
      );
    }

    if (error instanceof APIError) {
      throw error;
    }

    if (error instanceof Error && error.name === 'AbortError') {
      throw new APIError(
        'Request timeout',
        'TIMEOUT_ERROR',
        408
      );
    }

    throw new APIError(
      'Network error',
      'NETWORK_ERROR',
      500,
      { originalError: error }
    );
  }
}

/**
 * Search listings with filters
 *
 * @param params - Search parameters
 * @returns Promise resolving to search results
 */
export async function searchListings(params?: {
  days?: number[];
  location?: string;
  minPrice?: number;
  maxPrice?: number;
  bedrooms?: number;
  limit?: number;
}): Promise<Listing[]> {
  try {
    const searchParams = new URLSearchParams();

    if (params?.days) {
      searchParams.append('days', params.days.join(','));
    }
    if (params?.location) {
      searchParams.append('location', params.location);
    }
    if (params?.minPrice !== undefined) {
      searchParams.append('minPrice', params.minPrice.toString());
    }
    if (params?.maxPrice !== undefined) {
      searchParams.append('maxPrice', params.maxPrice.toString());
    }
    if (params?.bedrooms !== undefined) {
      searchParams.append('bedrooms', params.bedrooms.toString());
    }
    if (params?.limit !== undefined) {
      searchParams.append('limit', params.limit.toString());
    }

    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), DEFAULT_TIMEOUT);

    const response = await fetch(
      `${API_BASE}/v1/listings/search?${searchParams.toString()}`,
      {
        signal: controller.signal,
        headers: {
          'Content-Type': 'application/json',
        },
      }
    );

    clearTimeout(timeoutId);

    if (!response.ok) {
      throw new APIError(
        'Failed to search listings',
        'SEARCH_ERROR',
        response.status
      );
    }

    const data = await response.json();
    const validated = ListingsResponseSchema.parse(data);

    return validated.data.listings;
  } catch (error) {
    if (error instanceof z.ZodError) {
      throw new APIError(
        'Invalid API response format',
        'VALIDATION_ERROR',
        500,
        { zodError: error }
      );
    }

    if (error instanceof APIError) {
      throw error;
    }

    if (error instanceof Error && error.name === 'AbortError') {
      throw new APIError(
        'Request timeout',
        'TIMEOUT_ERROR',
        408
      );
    }

    throw new APIError(
      'Network error',
      'NETWORK_ERROR',
      500,
      { originalError: error }
    );
  }
}
