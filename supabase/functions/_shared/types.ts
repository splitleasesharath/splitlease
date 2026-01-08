/**
 * Shared TypeScript type definitions for Supabase Edge Functions
 * Split Lease - Bubble API Migration
 *
 * Provides immutable type definitions for Edge Function interfaces.
 * All types should be treated as readonly for FP compliance.
 *
 * @module _shared/types
 */

// ─────────────────────────────────────────────────────────────
// Bubble API Types
// ─────────────────────────────────────────────────────────────

export interface BubbleWorkflowResponse {
  readonly status?: string;
  readonly response?: {
    readonly listing_id?: string;
    readonly id?: string;
    readonly user_id?: string;
    readonly token?: string;
    readonly expires?: number;
    readonly [key: string]: unknown;
  };
  readonly listing_id?: string;
  readonly id?: string;
  readonly [key: string]: unknown;
}

// ─────────────────────────────────────────────────────────────
// Edge Function Request/Response Types
// ─────────────────────────────────────────────────────────────

export interface EdgeFunctionRequest {
  readonly action: string;
  readonly payload: Readonly<Record<string, unknown>>;
}

export interface EdgeFunctionResponse {
  readonly success: boolean;
  readonly data?: unknown;
  readonly error?: string;
}

// ─────────────────────────────────────────────────────────────
// User Types
// ─────────────────────────────────────────────────────────────

export interface User {
  readonly id: string;
  readonly email?: string;
  readonly [key: string]: unknown;
}

// ─────────────────────────────────────────────────────────────
// Configuration Types
// ─────────────────────────────────────────────────────────────

export interface BubbleSyncConfig {
  readonly bubbleBaseUrl: string;
  readonly bubbleApiKey: string;
  readonly supabaseServiceKey: string;
}

export interface WorkflowConfig {
  readonly workflowName: string;
  readonly bubbleObjectType: string;
  readonly supabaseTable: string;
}

// ─────────────────────────────────────────────────────────────
// Auth Types
// ─────────────────────────────────────────────────────────────

export interface AuthResponse {
  readonly success: boolean;
  readonly user_id?: string;
  readonly token?: string;
  readonly expires?: number;
  readonly error?: string;
  readonly reason?: string;
}

// ─────────────────────────────────────────────────────────────
// Type Guards (Predicates)
// ─────────────────────────────────────────────────────────────

/**
 * Check if response indicates success
 * @pure
 */
export const isSuccessResponse = (response: EdgeFunctionResponse): boolean =>
  response.success === true

/**
 * Check if response indicates failure
 * @pure
 */
export const isErrorResponse = (response: EdgeFunctionResponse): boolean =>
  response.success === false

/**
 * Check if auth response indicates success
 * @pure
 */
export const isAuthSuccess = (response: AuthResponse): boolean =>
  response.success === true && response.user_id !== undefined

// ─────────────────────────────────────────────────────────────
// Exported Test Constants
// ─────────────────────────────────────────────────────────────

/**
 * Exported for testing purposes
 * @test
 */
export const __test__ = Object.freeze({
  isSuccessResponse,
  isErrorResponse,
  isAuthSuccess,
})
