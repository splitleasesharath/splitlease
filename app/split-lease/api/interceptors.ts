/**
 * Request and response interceptors for authentication, logging, and error handling
 */

import { STORAGE_KEYS } from './config';
import { ApiError, ApiErrorCode } from '../types/api';

/**
 * Request interceptor to add authentication token
 */
export function addAuthToken(headers: HeadersInit = {}): HeadersInit {
  const token = localStorage.getItem(STORAGE_KEYS.ACCESS_TOKEN);

  if (token) {
    return {
      ...headers,
      Authorization: `Bearer ${token}`,
    };
  }

  return headers;
}

/**
 * Request interceptor for logging
 */
export function logRequest(method: string, url: string, body?: unknown): void {
  if (import.meta.env?.DEV) {
    console.log(`[API Request] ${method} ${url}`, body ? { body } : '');
  }
}

/**
 * Response interceptor for logging
 */
export function logResponse(method: string, url: string, response: Response, data?: unknown): void {
  if (import.meta.env?.DEV) {
    console.log(
      `[API Response] ${method} ${url} - ${response.status}`,
      data ? { data } : ''
    );
  }
}

/**
 * Response interceptor for error handling
 */
export function handleResponseError(response: Response, data?: unknown): ApiError {
  const statusCode = response.status;

  // Map HTTP status codes to ApiErrorCode
  let errorCode: ApiErrorCode;
  let message = 'An unexpected error occurred';

  switch (statusCode) {
    case 400:
      errorCode = ApiErrorCode.BAD_REQUEST;
      message = 'Bad request';
      break;
    case 401:
      errorCode = ApiErrorCode.UNAUTHORIZED;
      message = 'Unauthorized - please log in';
      break;
    case 403:
      errorCode = ApiErrorCode.FORBIDDEN;
      message = 'Access forbidden';
      break;
    case 404:
      errorCode = ApiErrorCode.NOT_FOUND;
      message = 'Resource not found';
      break;
    case 409:
      errorCode = ApiErrorCode.CONFLICT;
      message = 'Resource conflict';
      break;
    case 422:
      errorCode = ApiErrorCode.VALIDATION_ERROR;
      message = 'Validation error';
      break;
    case 429:
      errorCode = ApiErrorCode.RATE_LIMIT_EXCEEDED;
      message = 'Too many requests - please try again later';
      break;
    case 500:
      errorCode = ApiErrorCode.INTERNAL_ERROR;
      message = 'Internal server error';
      break;
    case 503:
      errorCode = ApiErrorCode.SERVICE_UNAVAILABLE;
      message = 'Service temporarily unavailable';
      break;
    case 504:
      errorCode = ApiErrorCode.GATEWAY_TIMEOUT;
      message = 'Gateway timeout';
      break;
    default:
      errorCode = ApiErrorCode.INTERNAL_ERROR;
      message = `HTTP ${statusCode} error`;
  }

  // Extract error message from response data if available
  if (data && typeof data === 'object') {
    const errorData = data as any;
    if (errorData.error?.message) {
      message = errorData.error.message;
    } else if (errorData.message) {
      message = errorData.message;
    }
  }

  return new ApiError(errorCode, message, statusCode, data);
}

/**
 * Handle token refresh on 401 responses
 */
export async function handleTokenRefresh(): Promise<string | null> {
  const refreshToken = localStorage.getItem(STORAGE_KEYS.REFRESH_TOKEN);

  if (!refreshToken) {
    return null;
  }

  try {
    // This is a placeholder - implement actual token refresh logic
    const response = await fetch('/api/auth/refresh', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ refreshToken }),
    });

    if (!response.ok) {
      throw new Error('Token refresh failed');
    }

    const data = await response.json();
    const newAccessToken = data.accessToken;

    localStorage.setItem(STORAGE_KEYS.ACCESS_TOKEN, newAccessToken);

    if (data.refreshToken) {
      localStorage.setItem(STORAGE_KEYS.REFRESH_TOKEN, data.refreshToken);
    }

    return newAccessToken;
  } catch (error) {
    // Clear tokens on refresh failure
    localStorage.removeItem(STORAGE_KEYS.ACCESS_TOKEN);
    localStorage.removeItem(STORAGE_KEYS.REFRESH_TOKEN);
    localStorage.removeItem(STORAGE_KEYS.USER);

    return null;
  }
}

/**
 * Clear authentication data
 */
export function clearAuth(): void {
  localStorage.removeItem(STORAGE_KEYS.ACCESS_TOKEN);
  localStorage.removeItem(STORAGE_KEYS.REFRESH_TOKEN);
  localStorage.removeItem(STORAGE_KEYS.USER);
}

/**
 * Check if error is retryable
 */
export function isRetryableError(statusCode: number): boolean {
  return [408, 429, 500, 502, 503, 504].includes(statusCode);
}

/**
 * Calculate retry delay with exponential backoff
 */
export function getRetryDelay(attempt: number, baseDelay: number = 1000): number {
  return Math.min(baseDelay * Math.pow(2, attempt), 10000); // Max 10 seconds
}
