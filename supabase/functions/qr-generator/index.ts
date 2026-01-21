/**
 * QR Code Generator - Edge Function
 * Split Lease
 *
 * Generates branded QR codes with the Split Lease logo
 *
 * Actions:
 * - generate: Create QR code image (returns PNG binary)
 * - health: Check function status
 *
 * NO AUTHENTICATION REQUIRED - Public endpoint
 *
 * FP ARCHITECTURE:
 * - Pure functions for validation, routing, and response formatting
 * - Side effects isolated to boundaries (entry/exit of handler)
 * - Result type for error propagation
 */

import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import {
  ValidationError,
} from "../_shared/errors.ts";
import {
  parseRequest,
  validateAction,
  formatSuccessResponse,
  formatErrorResponseHttp,
  formatCorsResponse,
  CorsPreflightSignal,
} from "../_shared/functional/orchestration.ts";
import { createErrorLog, addError, setAction, ErrorLog } from "../_shared/functional/errorLog.ts";
import { reportErrorLog } from "../_shared/slack.ts";
import { corsHeaders } from "../_shared/cors.ts";

import { handleGenerate } from "./handlers/generate.ts";

// ─────────────────────────────────────────────────────────────
// Configuration (Immutable)
// ─────────────────────────────────────────────────────────────

const ALLOWED_ACTIONS = ["generate", "health"] as const;
type Action = typeof ALLOWED_ACTIONS[number];

// ─────────────────────────────────────────────────────────────
// Pure Functions
// ─────────────────────────────────────────────────────────────

/**
 * Health check handler
 */
const handleHealth = (): { status: string; timestamp: string; actions: readonly string[] } => ({
  status: 'healthy',
  timestamp: new Date().toISOString(),
  actions: ALLOWED_ACTIONS,
});

/**
 * Format binary (PNG) response
 */
const formatBinaryResponse = (
  buffer: Uint8Array,
  filename: string
): Response =>
  new Response(buffer, {
    status: 200,
    headers: {
      ...corsHeaders,
      'Content-Type': 'image/png',
      'Content-Disposition': `attachment; filename="${filename}"`,
      'Content-Length': String(buffer.length),
    },
  });

/**
 * Generate timestamped filename for download
 */
const generateFilename = (): string => {
  const timestamp = new Date().toISOString().replace(/[:.]/g, '-').slice(0, 19);
  return `splitlease-qr-${timestamp}.png`;
};

// ─────────────────────────────────────────────────────────────
// Effect Boundary
// ─────────────────────────────────────────────────────────────

console.log("[qr-generator] Edge Function started (FP mode)");

Deno.serve(async (req: Request) => {
  const correlationId = crypto.randomUUID().slice(0, 8);
  let errorLog: ErrorLog = createErrorLog('qr-generator', 'unknown', correlationId);

  try {
    console.log(`[qr-generator] ========== REQUEST ==========`);
    console.log(`[qr-generator] Method: ${req.method}`);

    // Parse request (handles CORS preflight)
    const parseResult = await parseRequest(req);

    if (!parseResult.ok) {
      if (parseResult.error instanceof CorsPreflightSignal) {
        return formatCorsResponse();
      }
      throw parseResult.error;
    }

    const { action, payload } = parseResult.value;
    errorLog = setAction(errorLog, action);
    console.log(`[qr-generator] Action: ${action}`);

    // Validate action
    const actionResult = validateAction(ALLOWED_ACTIONS, action);
    if (!actionResult.ok) {
      throw actionResult.error;
    }

    // Route to handler
    switch (action as Action) {
      case 'health': {
        const result = handleHealth();
        console.log(`[qr-generator] ========== SUCCESS (health) ==========`);
        return formatSuccessResponse(result);
      }

      case 'generate': {
        const pngBuffer = await handleGenerate(payload);
        const filename = generateFilename();
        console.log(`[qr-generator] ========== SUCCESS (generate) ==========`);
        return formatBinaryResponse(pngBuffer, filename);
      }

      default: {
        // TypeScript exhaustiveness check
        const _exhaustive: never = action as never;
        throw new ValidationError(`Unknown action: ${action}`);
      }
    }

  } catch (error) {
    console.error(`[qr-generator] ========== ERROR ==========`);
    console.error(`[qr-generator]`, error);

    errorLog = addError(errorLog, error as Error, 'Fatal error in main handler');
    reportErrorLog(errorLog);

    return formatErrorResponseHttp(error as Error);
  }
});
