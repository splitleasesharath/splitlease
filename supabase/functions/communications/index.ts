/**
 * Communications - Edge Function
 * Split Lease
 *
 * Placeholder for communications-related functionality
 * Future actions may include:
 * - Email notifications
 * - SMS notifications
 * - In-app messaging
 * - Push notifications
 *
 * NO AUTHENTICATION REQUIRED - Public endpoint (auth handled per action)
 */

import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createErrorCollector, ErrorCollector } from '../_shared/slack.ts';

// ============ CORS Headers ============
const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'POST, GET, OPTIONS, PUT, DELETE',
};

// ============ Error Classes ============
class ValidationError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'ValidationError';
  }
}

function formatErrorResponse(error: Error): { success: false; error: string } {
  console.error('[communications] Error:', error);
  return {
    success: false,
    error: error.message || 'An error occurred',
  };
}

function getStatusCodeFromError(error: Error): number {
  if (error instanceof ValidationError) {
    return 400;
  }
  return 500;
}

// ============ Validation Functions ============
function validateRequiredFields(
  obj: Record<string, unknown>,
  requiredFields: string[]
): void {
  for (const field of requiredFields) {
    if (!(field in obj) || obj[field] === undefined || obj[field] === null || obj[field] === '') {
      throw new ValidationError(`Missing required field: ${field}`);
    }
  }
}

function validateAction(action: string, allowedActions: string[]): void {
  if (!allowedActions.includes(action)) {
    throw new ValidationError(`Unknown action: ${action}. Allowed actions: ${allowedActions.join(', ')}`);
  }
}

// ─────────────────────────────────────────────────────────────
// Constants
// ─────────────────────────────────────────────────────────────

const LOG_PREFIX = '[communications]'
const ALLOWED_ACTIONS = ['health'] as const;

type Action = typeof ALLOWED_ACTIONS[number];

// ─────────────────────────────────────────────────────────────
// Types
// ─────────────────────────────────────────────────────────────

interface HealthResponse {
  readonly status: string;
  readonly timestamp: string;
  readonly message: string;
}

// ─────────────────────────────────────────────────────────────
// Pure Data Builders
// ─────────────────────────────────────────────────────────────

/**
 * Build health response
 * @pure
 */
const buildHealthResponse = (): HealthResponse =>
  Object.freeze({
    status: 'healthy',
    timestamp: new Date().toISOString(),
    message: 'Communications edge function is running. This is a placeholder - implement specific actions as needed.',
  })

// ─────────────────────────────────────────────────────────────
// Action Handlers
// ─────────────────────────────────────────────────────────────

/**
 * Health check endpoint
 * @pure
 */
const handleHealth = (): HealthResponse => buildHealthResponse()

// Handler map (immutable record) - replaces switch statement
const handlers: Readonly<Record<Action, () => HealthResponse>> = Object.freeze({
  health: handleHealth,
})

// ─────────────────────────────────────────────────────────────
// Main Handler
// ─────────────────────────────────────────────────────────────

Deno.serve(async (req: Request) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response(null, {
      status: 200,
      headers: corsHeaders,
    });
  }

  // Error collector for consolidated error reporting (ONE RUN = ONE LOG)
  let collector: ErrorCollector | null = null;
  let action = 'unknown';

  try {
    console.log(`${LOG_PREFIX} ========== NEW REQUEST ==========`);
    console.log(`${LOG_PREFIX} Method: ${req.method}`);
    console.log(`${LOG_PREFIX} URL: ${req.url}`);

    // Only accept POST requests
    if (req.method !== 'POST') {
      throw new ValidationError('Method not allowed. Use POST.');
    }

    // Parse request body
    const body = await req.json();
    console.log(`${LOG_PREFIX} Request body:`, JSON.stringify(body, null, 2));

    validateRequiredFields(body, ['action']);
    action = body.action;

    // Create error collector after we know the action
    collector = createErrorCollector('communications', action);

    // Validate action is supported
    validateAction(action, [...ALLOWED_ACTIONS]);

    console.log(`${LOG_PREFIX} Action: ${action}`);

    // Route to handler
    const handler = handlers[action as Action];
    const result = handler();

    console.log(`${LOG_PREFIX} Handler completed successfully`);
    console.log(`${LOG_PREFIX} ========== REQUEST COMPLETE ==========`);

    // Return success response
    return new Response(
      JSON.stringify({
        success: true,
        data: result,
      }),
      {
        status: 200,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      }
    );

  } catch (error) {
    console.error(`${LOG_PREFIX} ========== ERROR ==========`);
    console.error(`${LOG_PREFIX} Error:`, error);

    // Report to Slack (ONE RUN = ONE LOG, fire-and-forget)
    if (collector) {
      collector.add(error as Error, 'Fatal error in main handler');
      collector.reportToSlack();
    }

    const statusCode = getStatusCodeFromError(error as Error);
    const errorResponse = formatErrorResponse(error as Error);

    return new Response(
      JSON.stringify(errorResponse),
      {
        status: statusCode,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      }
    );
  }
});

// ─────────────────────────────────────────────────────────────
// Exported Test Constants
// ─────────────────────────────────────────────────────────────

/**
 * Exported for testing purposes
 * @test
 */
export const __test__ = Object.freeze({
  // Constants
  LOG_PREFIX,
  ALLOWED_ACTIONS,
  handlers,

  // Inlined Utilities
  corsHeaders,
  ValidationError,
  formatErrorResponse,
  getStatusCodeFromError,
  validateRequiredFields,
  validateAction,

  // Pure Data Builders
  buildHealthResponse,

  // Action Handlers
  handleHealth,
})
