/**
 * Error handling utilities for Supabase Edge Functions
 * Split Lease - Bubble API Migration
 *
 * NO FALLBACK PRINCIPLE: All errors fail fast without fallback logic
 *
 * @module _shared/errors
 */

// ─────────────────────────────────────────────────────────────
// Constants
// ─────────────────────────────────────────────────────────────

const LOG_PREFIX = '[Error Handler]'

const HTTP_STATUS = Object.freeze({
  BAD_REQUEST: 400,
  UNAUTHORIZED: 401,
  INTERNAL_SERVER_ERROR: 500
})

// ─────────────────────────────────────────────────────────────
// Custom Error Classes
// ─────────────────────────────────────────────────────────────

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

export class OpenAIError extends Error {
  constructor(
    message: string,
    public statusCode: number = HTTP_STATUS.INTERNAL_SERVER_ERROR,
    public openaiResponse?: unknown
  ) {
    super(message);
    this.name = 'OpenAIError';
  }
}

// ─────────────────────────────────────────────────────────────
// Type Guards (Predicates)
// ─────────────────────────────────────────────────────────────

/**
 * Check if error is a BubbleApiError
 * @pure
 */
export const isBubbleApiError = (error: Error): error is BubbleApiError =>
  error instanceof BubbleApiError

/**
 * Check if error is an AuthenticationError
 * @pure
 */
export const isAuthenticationError = (error: Error): error is AuthenticationError =>
  error instanceof AuthenticationError

/**
 * Check if error is a ValidationError
 * @pure
 */
export const isValidationError = (error: Error): error is ValidationError =>
  error instanceof ValidationError

/**
 * Check if error is an OpenAIError
 * @pure
 */
export const isOpenAIError = (error: Error): error is OpenAIError =>
  error instanceof OpenAIError

// ─────────────────────────────────────────────────────────────
// Pure Functions
// ─────────────────────────────────────────────────────────────

/**
 * Format error for client response
 * NO FALLBACK: Returns actual error message without hiding details
 * @effectful (logging)
 */
export function formatErrorResponse(error: Error): { success: false; error: string } {
  console.error(LOG_PREFIX, error)

  return Object.freeze({
    success: false as const,
    error: error.message || 'An error occurred',
  })
}

/**
 * Get HTTP status code from error type
 * @pure
 */
export function getStatusCodeFromError(error: Error): number {
  if (isBubbleApiError(error)) {
    return error.statusCode
  }
  if (isAuthenticationError(error)) {
    return HTTP_STATUS.UNAUTHORIZED
  }
  if (isValidationError(error)) {
    return HTTP_STATUS.BAD_REQUEST
  }
  if (isOpenAIError(error)) {
    return error.statusCode
  }
  return HTTP_STATUS.INTERNAL_SERVER_ERROR
}

// ─────────────────────────────────────────────────────────────
// Exported Test Constants
// ─────────────────────────────────────────────────────────────

/**
 * Exported for testing purposes
 * @test
 */
export const __test__ = Object.freeze({
  LOG_PREFIX,
  HTTP_STATUS,
  isBubbleApiError,
  isAuthenticationError,
  isValidationError,
  isOpenAIError
})
