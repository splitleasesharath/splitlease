/**
 * Orchestration - Shared Request/Response Utilities
 * Split Lease - FP Utilities
 *
 * Pure functions for request parsing, validation, routing, and response formatting.
 * These replace the imperative patterns in edge function entry points.
 *
 * Pattern: All functions are pure; side effects happen only at boundaries
 */

import { Result, ok, err } from './result.ts';
import { corsHeaders } from '../cors.ts';
import {
  ValidationError,
  AuthenticationError,
  formatErrorResponse,
  getStatusCodeFromError,
} from '../errors.ts';

// ─────────────────────────────────────────────────────────────
// Types
// ─────────────────────────────────────────────────────────────

/**
 * Parsed and validated request data
 */
export interface ParsedRequest {
  readonly method: string;
  readonly action: string;
  readonly payload: Record<string, unknown>;
  readonly headers: Headers;
}

/**
 * Request context with authentication info
 */
export interface AuthenticatedContext<U> extends ParsedRequest {
  readonly user: U | null;
}

/**
 * Handler function signature
 */
export type Handler<TPayload = Record<string, unknown>, TResult = unknown, TUser = unknown> =
  (payload: TPayload, user: TUser | null, ...deps: unknown[]) => Promise<TResult>;

// ─────────────────────────────────────────────────────────────
// Signal Classes (Control Flow, Not Errors)
// ─────────────────────────────────────────────────────────────

/**
 * Signal for CORS preflight requests
 * Not an error - just a control flow signal
 */
export class CorsPreflightSignal extends Error {
  constructor() {
    super('CORS_PREFLIGHT');
    this.name = 'CorsPreflightSignal';
  }
}

// ─────────────────────────────────────────────────────────────
// Request Parsing (Pure)
// ─────────────────────────────────────────────────────────────

/**
 * Parse and validate incoming request
 * Returns Result instead of throwing
 */
export const parseRequest = async (req: Request): Promise<Result<ParsedRequest, Error>> => {
  // Handle CORS preflight
  if (req.method === 'OPTIONS') {
    return err(new CorsPreflightSignal());
  }

  // Validate HTTP method
  if (req.method !== 'POST') {
    return err(new ValidationError('Method not allowed. Use POST.'));
  }

  // Parse JSON body
  try {
    const body = await req.json();

    if (!body.action) {
      return err(new ValidationError('action is required'));
    }

    return ok({
      method: req.method,
      action: body.action,
      payload: body.payload ?? {},
      headers: req.headers,
    });
  } catch (_e) {
    return err(new ValidationError('Invalid JSON body'));
  }
};

// ─────────────────────────────────────────────────────────────
// Action Validation (Pure)
// ─────────────────────────────────────────────────────────────

/**
 * Validate action is in allowed list
 * Returns the action if valid, error otherwise
 */
export const validateAction = (
  allowed: readonly string[],
  action: string
): Result<string, ValidationError> =>
  allowed.includes(action)
    ? ok(action)
    : err(new ValidationError(
        `Unknown action: ${action}. Allowed: ${allowed.join(', ')}`
      ));

/**
 * Check if action is public (doesn't require auth)
 */
export const isPublicAction = (
  publicActions: ReadonlySet<string> | readonly string[],
  action: string
): boolean =>
  publicActions instanceof Set
    ? publicActions.has(action)
    : publicActions.includes(action);

// ─────────────────────────────────────────────────────────────
// Handler Routing (Pure)
// ─────────────────────────────────────────────────────────────

/**
 * Get handler for action from handler map
 * Pure lookup - no execution
 */
export const routeToHandler = <H>(
  handlers: Readonly<Record<string, H>>,
  action: string
): Result<H, ValidationError> => {
  const handler = handlers[action];
  return handler
    ? ok(handler)
    : err(new ValidationError(`No handler for action: ${action}`));
};

// ─────────────────────────────────────────────────────────────
// Environment Configuration (Pure with env read)
// ─────────────────────────────────────────────────────────────

/**
 * Standard Supabase environment configuration
 */
export interface SupabaseConfig {
  readonly supabaseUrl: string;
  readonly supabaseAnonKey: string;
  readonly supabaseServiceKey: string;
}

/**
 * Get Supabase configuration from environment
 * Pure function that reads env vars
 */
export const getSupabaseConfig = (): Result<SupabaseConfig, Error> => {
  const supabaseUrl = Deno.env.get('SUPABASE_URL');
  const supabaseAnonKey = Deno.env.get('SUPABASE_ANON_KEY');
  const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY');

  if (!supabaseUrl || !supabaseServiceKey) {
    return err(new Error('Missing required Supabase environment variables'));
  }

  return ok({
    supabaseUrl,
    supabaseAnonKey: supabaseAnonKey ?? '',
    supabaseServiceKey,
  });
};

/**
 * Bubble API configuration
 */
export interface BubbleConfig {
  readonly bubbleBaseUrl: string;
  readonly bubbleApiKey: string;
}

/**
 * Get Bubble configuration from environment
 */
export const getBubbleConfig = (): Result<BubbleConfig, Error> => {
  const bubbleBaseUrl = Deno.env.get('BUBBLE_API_BASE_URL');
  const bubbleApiKey = Deno.env.get('BUBBLE_API_KEY');

  if (!bubbleBaseUrl || !bubbleApiKey) {
    return err(new Error('Missing required Bubble environment variables'));
  }

  return ok({ bubbleBaseUrl, bubbleApiKey });
};

// ─────────────────────────────────────────────────────────────
// Response Formatting (Pure)
// ─────────────────────────────────────────────────────────────

/**
 * Format a success response
 */
export const formatSuccessResponse = <T>(data: T): Response =>
  new Response(
    JSON.stringify({ success: true, data }),
    {
      status: 200,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    }
  );

/**
 * Format an error response from an Error object
 */
export const formatErrorResponseHttp = (error: Error): Response =>
  new Response(
    JSON.stringify(formatErrorResponse(error)),
    {
      status: getStatusCodeFromError(error),
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    }
  );

/**
 * Format CORS preflight response
 */
export const formatCorsResponse = (): Response =>
  new Response(null, { status: 200, headers: corsHeaders });

/**
 * Format a method not allowed response
 */
export const formatMethodNotAllowedResponse = (): Response =>
  new Response(
    JSON.stringify({ success: false, error: 'Method not allowed' }),
    {
      status: 405,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    }
  );

// ─────────────────────────────────────────────────────────────
// Result-to-Response Conversion
// ─────────────────────────────────────────────────────────────

/**
 * Convert a Result to an HTTP Response
 * Used at effect boundary to transform Result to Response
 */
export const resultToResponse = <T>(result: Result<T, Error>): Response =>
  result.ok
    ? formatSuccessResponse(result.value)
    : formatErrorResponseHttp(result.error);

// ─────────────────────────────────────────────────────────────
// Authentication Helpers (Pure functions, async due to auth call)
// ─────────────────────────────────────────────────────────────

/**
 * Standard user type for authenticated requests
 */
export interface AuthenticatedUser {
  readonly id: string;
  readonly email: string;
}

/**
 * Extract auth token from headers
 */
export const extractAuthToken = (headers: Headers): Result<string, AuthenticationError> => {
  const authHeader = headers.get('Authorization');
  if (!authHeader) {
    return err(new AuthenticationError('Missing Authorization header'));
  }
  return ok(authHeader);
};
