/**
 * Error handling utilities for Supabase Edge Functions
 * Split Lease - Bubble API Migration
 *
 * NO FALLBACK PRINCIPLE: All errors fail fast without fallback logic
 */

export class BubbleApiError extends Error {
  constructor(
    message: string,
    public statusCode: number = 500,
    public bubbleResponse?: any
  ) {
    super(message);
    this.name = 'BubbleApiError';
  }
}

export class SupabaseSyncError extends Error {
  constructor(
    message: string,
    public originalError?: any
  ) {
    super(message);
    this.name = 'SupabaseSyncError';
  }
}

export class ValidationError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'ValidationError';
  }
}

export class AuthenticationError extends Error {
  constructor(message: string = 'Unauthorized') {
    super(message);
    this.name = 'AuthenticationError';
  }
}

/**
 * Format error for client response
 * NO FALLBACK: Returns actual error message without hiding details
 */
export function formatErrorResponse(error: Error): { success: false; error: string } {
  console.error('[Error Handler]', error);

  return {
    success: false,
    error: error.message || 'An error occurred',
  };
}

/**
 * Get HTTP status code from error type
 */
export function getStatusCodeFromError(error: Error): number {
  if (error instanceof BubbleApiError) {
    return error.statusCode;
  }
  if (error instanceof AuthenticationError) {
    return 401;
  }
  if (error instanceof ValidationError) {
    return 400;
  }
  return 500;
}
