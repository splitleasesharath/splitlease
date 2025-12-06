/**
 * Pricing - Edge Function
 * Split Lease
 *
 * Placeholder for pricing-related functionality
 * Future actions may include:
 * - Price calculations
 * - Fee breakdowns
 * - Discount calculations
 * - Dynamic pricing
 * - Payment estimates
 *
 * NO AUTHENTICATION REQUIRED - Public endpoint (auth handled per action)
 */

import "jsr:@supabase/functions-js/edge-runtime.d.ts";

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
  console.error('[pricing] Error:', error);
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

// ============ Allowed Actions ============
const ALLOWED_ACTIONS = ['health'];

// ============ Action Handlers ============

/**
 * Health check endpoint
 */
function handleHealth(): { status: string; timestamp: string; message: string } {
  return {
    status: 'healthy',
    timestamp: new Date().toISOString(),
    message: 'Pricing edge function is running. This is a placeholder - implement specific actions as needed.',
  };
}

// ============ Main Handler ============
Deno.serve(async (req: Request) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response(null, {
      status: 200,
      headers: corsHeaders,
    });
  }

  try {
    console.log(`[pricing] ========== NEW REQUEST ==========`);
    console.log(`[pricing] Method: ${req.method}`);
    console.log(`[pricing] URL: ${req.url}`);

    // Only accept POST requests
    if (req.method !== 'POST') {
      throw new ValidationError('Method not allowed. Use POST.');
    }

    // Parse request body
    const body = await req.json();
    console.log(`[pricing] Request body:`, JSON.stringify(body, null, 2));

    validateRequiredFields(body, ['action']);
    const { action, payload } = body;

    // Validate action is supported
    validateAction(action, ALLOWED_ACTIONS);

    console.log(`[pricing] Action: ${action}`);

    // Route to appropriate handler
    let result;

    switch (action) {
      case 'health':
        result = handleHealth();
        break;

      default:
        throw new ValidationError(`Unknown action: ${action}`);
    }

    console.log(`[pricing] Handler completed successfully`);
    console.log(`[pricing] ========== REQUEST COMPLETE ==========`);

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
    console.error('[pricing] ========== ERROR ==========');
    console.error('[pricing] Error:', error);

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
