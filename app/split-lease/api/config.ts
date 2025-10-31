/**
 * API configuration constants and settings
 */

/**
 * Base API URL - should be set via environment variables in production
 */
export const API_BASE_URL =
  (typeof window !== 'undefined' && (window as any).__API_BASE_URL__) ||
  import.meta.env?.VITE_API_BASE_URL ||
  'http://localhost:3000/api';

/**
 * Default request timeout in milliseconds
 */
export const DEFAULT_TIMEOUT = 30000; // 30 seconds

/**
 * Maximum number of retry attempts for failed requests
 */
export const MAX_RETRIES = 3;

/**
 * Delay between retry attempts in milliseconds
 */
export const RETRY_DELAY = 1000; // 1 second

/**
 * HTTP status codes that should trigger a retry
 */
export const RETRYABLE_STATUS_CODES = [408, 429, 500, 502, 503, 504];

/**
 * API version
 */
export const API_VERSION = 'v1';

/**
 * Full API base path
 */
export const API_BASE_PATH = `${API_BASE_URL}/${API_VERSION}`;

/**
 * API endpoints
 */
export const API_ENDPOINTS = {
  // Authentication
  AUTH: {
    LOGIN: '/auth/login',
    LOGOUT: '/auth/logout',
    REGISTER: '/auth/register',
    REFRESH: '/auth/refresh',
    VERIFY_EMAIL: '/auth/verify-email',
    FORGOT_PASSWORD: '/auth/forgot-password',
    RESET_PASSWORD: '/auth/reset-password',
  },

  // Users
  USERS: {
    ME: '/users/me',
    BY_ID: (id: string) => `/users/${id}`,
    UPDATE: (id: string) => `/users/${id}`,
    DELETE: (id: string) => `/users/${id}`,
  },

  // Listings
  LISTINGS: {
    LIST: '/listings',
    SEARCH: '/listings/search',
    BY_ID: (id: string) => `/listings/${id}`,
    CREATE: '/listings',
    UPDATE: (id: string) => `/listings/${id}`,
    DELETE: (id: string) => `/listings/${id}`,
    MY_LISTINGS: '/listings/my-listings',
  },

  // Bookings
  BOOKINGS: {
    LIST: '/bookings',
    BY_ID: (id: string) => `/bookings/${id}`,
    CREATE: '/bookings',
    UPDATE: (id: string) => `/bookings/${id}`,
    CANCEL: (id: string) => `/bookings/${id}/cancel`,
    MY_BOOKINGS: '/bookings/my-bookings',
  },

  // Proposals
  PROPOSALS: {
    LIST: '/proposals',
    BY_ID: (id: string) => `/proposals/${id}`,
    CREATE: '/proposals',
    UPDATE: (id: string) => `/proposals/${id}`,
    ACCEPT: (id: string) => `/proposals/${id}/accept`,
    REJECT: (id: string) => `/proposals/${id}/reject`,
    COUNTER: (id: string) => `/proposals/${id}/counter`,
  },

  // Reviews
  REVIEWS: {
    LIST: '/reviews',
    BY_ID: (id: string) => `/reviews/${id}`,
    CREATE: '/reviews',
    BY_LISTING: (listingId: string) => `/reviews/listing/${listingId}`,
    BY_USER: (userId: string) => `/reviews/user/${userId}`,
  },
} as const;

/**
 * Storage keys for local/session storage
 */
export const STORAGE_KEYS = {
  ACCESS_TOKEN: 'splitlease_access_token',
  REFRESH_TOKEN: 'splitlease_refresh_token',
  USER: 'splitlease_user',
  PREFERENCES: 'splitlease_preferences',
} as const;

/**
 * Request headers
 */
export const DEFAULT_HEADERS = {
  'Content-Type': 'application/json',
  Accept: 'application/json',
} as const;
