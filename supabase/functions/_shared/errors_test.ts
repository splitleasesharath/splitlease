/**
 * Unit tests for error classes
 * Split Lease - Supabase Edge Functions
 *
 * Tests cover:
 * - All custom error class instantiation
 * - Error inheritance from Error
 * - Custom properties (statusCode, etc.)
 * - formatErrorResponse() utility
 * - getStatusCodeFromError() utility
 */

import { assertEquals, assertInstanceOf } from 'jsr:@std/assert';
import {
  BubbleApiError,
  SupabaseSyncError,
  ValidationError,
  AuthenticationError,
  OpenAIError,
  formatErrorResponse,
  getStatusCodeFromError,
} from './errors.ts';

// ─────────────────────────────────────────────────────────────
// ValidationError Tests
// ─────────────────────────────────────────────────────────────

Deno.test('ValidationError extends Error', () => {
  const error = new ValidationError('Invalid input');
  assertInstanceOf(error, Error);
});

Deno.test('ValidationError has correct name', () => {
  const error = new ValidationError('Invalid input');
  assertEquals(error.name, 'ValidationError');
});

Deno.test('ValidationError has correct message', () => {
  const error = new ValidationError('Email is required');
  assertEquals(error.message, 'Email is required');
});

Deno.test('ValidationError can be caught as Error', () => {
  let caught = false;
  try {
    throw new ValidationError('test');
  } catch (e) {
    if (e instanceof Error) {
      caught = true;
    }
  }
  assertEquals(caught, true);
});

// ─────────────────────────────────────────────────────────────
// AuthenticationError Tests
// ─────────────────────────────────────────────────────────────

Deno.test('AuthenticationError extends Error', () => {
  const error = new AuthenticationError('Not authorized');
  assertInstanceOf(error, Error);
});

Deno.test('AuthenticationError has correct name', () => {
  const error = new AuthenticationError('Not authorized');
  assertEquals(error.name, 'AuthenticationError');
});

Deno.test('AuthenticationError has correct message', () => {
  const error = new AuthenticationError('Token expired');
  assertEquals(error.message, 'Token expired');
});

Deno.test('AuthenticationError uses default message', () => {
  const error = new AuthenticationError();
  assertEquals(error.message, 'Unauthorized');
});

// ─────────────────────────────────────────────────────────────
// BubbleApiError Tests
// ─────────────────────────────────────────────────────────────

Deno.test('BubbleApiError extends Error', () => {
  const error = new BubbleApiError('API failed');
  assertInstanceOf(error, Error);
});

Deno.test('BubbleApiError has correct name', () => {
  const error = new BubbleApiError('API failed');
  assertEquals(error.name, 'BubbleApiError');
});

Deno.test('BubbleApiError includes default status code', () => {
  const error = new BubbleApiError('API failed');
  assertEquals(error.statusCode, 500);
});

Deno.test('BubbleApiError includes custom status code', () => {
  const error = new BubbleApiError('Not found', 404);
  assertEquals(error.statusCode, 404);
});

Deno.test('BubbleApiError includes bubble response', () => {
  const response = { error: 'Internal error', code: 'BUBBLE_ERR' };
  const error = new BubbleApiError('API failed', 500, response);
  assertEquals(error.bubbleResponse, response);
});

Deno.test('BubbleApiError bubble response is undefined when not provided', () => {
  const error = new BubbleApiError('API failed', 500);
  assertEquals(error.bubbleResponse, undefined);
});

// ─────────────────────────────────────────────────────────────
// SupabaseSyncError Tests
// ─────────────────────────────────────────────────────────────

Deno.test('SupabaseSyncError extends Error', () => {
  const error = new SupabaseSyncError('Sync failed');
  assertInstanceOf(error, Error);
});

Deno.test('SupabaseSyncError has correct name', () => {
  const error = new SupabaseSyncError('Sync failed');
  assertEquals(error.name, 'SupabaseSyncError');
});

Deno.test('SupabaseSyncError has correct message', () => {
  const error = new SupabaseSyncError('Failed to sync user data');
  assertEquals(error.message, 'Failed to sync user data');
});

Deno.test('SupabaseSyncError includes original error', () => {
  const originalError = new Error('Connection timeout');
  const error = new SupabaseSyncError('Sync failed', originalError);
  assertEquals(error.originalError, originalError);
});

Deno.test('SupabaseSyncError original error is undefined when not provided', () => {
  const error = new SupabaseSyncError('Sync failed');
  assertEquals(error.originalError, undefined);
});

// ─────────────────────────────────────────────────────────────
// OpenAIError Tests
// ─────────────────────────────────────────────────────────────

Deno.test('OpenAIError extends Error', () => {
  const error = new OpenAIError('Rate limited');
  assertInstanceOf(error, Error);
});

Deno.test('OpenAIError has correct name', () => {
  const error = new OpenAIError('Rate limited');
  assertEquals(error.name, 'OpenAIError');
});

Deno.test('OpenAIError includes default status code', () => {
  const error = new OpenAIError('Rate limited');
  assertEquals(error.statusCode, 500);
});

Deno.test('OpenAIError includes custom status code', () => {
  const error = new OpenAIError('Rate limited', 429);
  assertEquals(error.statusCode, 429);
});

Deno.test('OpenAIError includes openai response', () => {
  const response = { error: { message: 'Rate limit exceeded', type: 'rate_limit_error' } };
  const error = new OpenAIError('Rate limited', 429, response);
  assertEquals(error.openaiResponse, response);
});

// ─────────────────────────────────────────────────────────────
// formatErrorResponse Tests
// ─────────────────────────────────────────────────────────────

Deno.test('formatErrorResponse() returns success: false', () => {
  const error = new Error('Something went wrong');
  const response = formatErrorResponse(error);
  assertEquals(response.success, false);
});

Deno.test('formatErrorResponse() includes error message', () => {
  const error = new Error('Something went wrong');
  const response = formatErrorResponse(error);
  assertEquals(response.error, 'Something went wrong');
});

Deno.test('formatErrorResponse() handles ValidationError', () => {
  const error = new ValidationError('Invalid email');
  const response = formatErrorResponse(error);
  assertEquals(response.error, 'Invalid email');
});

Deno.test('formatErrorResponse() handles AuthenticationError', () => {
  const error = new AuthenticationError('Token expired');
  const response = formatErrorResponse(error);
  assertEquals(response.error, 'Token expired');
});

Deno.test('formatErrorResponse() provides fallback for empty message', () => {
  const error = new Error('');
  const response = formatErrorResponse(error);
  assertEquals(response.error, 'An error occurred');
});

// ─────────────────────────────────────────────────────────────
// getStatusCodeFromError Tests
// ─────────────────────────────────────────────────────────────

Deno.test('getStatusCodeFromError() returns 400 for ValidationError', () => {
  const error = new ValidationError('Invalid input');
  assertEquals(getStatusCodeFromError(error), 400);
});

Deno.test('getStatusCodeFromError() returns 401 for AuthenticationError', () => {
  const error = new AuthenticationError('Unauthorized');
  assertEquals(getStatusCodeFromError(error), 401);
});

Deno.test('getStatusCodeFromError() returns status from BubbleApiError', () => {
  const error404 = new BubbleApiError('Not found', 404);
  assertEquals(getStatusCodeFromError(error404), 404);

  const error500 = new BubbleApiError('Server error', 500);
  assertEquals(getStatusCodeFromError(error500), 500);
});

Deno.test('getStatusCodeFromError() returns status from OpenAIError', () => {
  const error429 = new OpenAIError('Rate limited', 429);
  assertEquals(getStatusCodeFromError(error429), 429);
});

Deno.test('getStatusCodeFromError() returns 500 for generic Error', () => {
  const error = new Error('Unknown error');
  assertEquals(getStatusCodeFromError(error), 500);
});

Deno.test('getStatusCodeFromError() returns 500 for SupabaseSyncError', () => {
  const error = new SupabaseSyncError('Sync failed');
  assertEquals(getStatusCodeFromError(error), 500);
});
