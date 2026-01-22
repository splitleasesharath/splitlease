/**
 * AI Room Redesign Edge Function
 * Split Lease - Supabase Edge Functions
 *
 * Proxies Gemini Vision API calls for AI-powered room redesign.
 * This Edge Function keeps the API key secure on the server side.
 *
 * NO FALLBACK PRINCIPLE: All errors fail fast without fallback logic
 *
 * Supported Actions:
 * - generate: Generate a redesigned room image from input + style
 *
 * FP ARCHITECTURE:
 * - Pure functions for validation and routing
 * - Side effects isolated to boundaries
 * - Result type pattern for error propagation
 */

import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { ValidationError } from "../_shared/errors.ts";
import {
  validateAction,
  formatErrorResponseHttp,
  formatCorsResponse,
  CorsPreflightSignal,
} from "../_shared/functional/orchestration.ts";
import { handleGenerate } from "./handlers/generate.ts";

// ─────────────────────────────────────────────────────────────
// Configuration (Immutable)
// ─────────────────────────────────────────────────────────────

const ALLOWED_ACTIONS = ["generate"] as const;

type Action = typeof ALLOWED_ACTIONS[number];

// Handler map (immutable record)
const handlers: Readonly<Record<Action, Function>> = {
  generate: handleGenerate,
};

// ─────────────────────────────────────────────────────────────
// Request Parsing
// ─────────────────────────────────────────────────────────────

interface AIRoomRedesignRequest {
  action: string;
  payload: unknown;
}

/**
 * Parse and validate request body
 */
const parseRequest = async (
  req: Request
): Promise<AIRoomRedesignRequest | null> => {
  // Handle CORS preflight
  if (req.method === "OPTIONS") {
    throw new CorsPreflightSignal();
  }

  // Validate HTTP method
  if (req.method !== "POST") {
    throw new ValidationError("Method not allowed. Use POST.");
  }

  try {
    const body = await req.json();

    if (!body.action) {
      throw new ValidationError("action is required");
    }

    if (!body.payload) {
      throw new ValidationError("payload is required");
    }

    return body as AIRoomRedesignRequest;
  } catch (e) {
    if (e instanceof ValidationError || e instanceof CorsPreflightSignal) {
      throw e;
    }
    throw new ValidationError("Invalid JSON body");
  }
};

// ─────────────────────────────────────────────────────────────
// Effect Boundary (Side Effects Isolated Here)
// ─────────────────────────────────────────────────────────────

console.log("[ai-room-redesign] Edge Function started");

Deno.serve(async (req: Request) => {
  try {
    console.log(`[ai-room-redesign] ========== REQUEST ==========`);
    console.log(`[ai-room-redesign] Method: ${req.method}`);

    // Parse request
    const request = await parseRequest(req);

    if (!request) {
      throw new ValidationError("Failed to parse request");
    }

    const { action, payload } = request;

    console.log(`[ai-room-redesign] Action: ${action}`);

    // Validate action
    const actionResult = validateAction(ALLOWED_ACTIONS, action);
    if (!actionResult.ok) {
      throw actionResult.error;
    }

    // Route to handler
    const handler = handlers[action as Action];
    if (!handler) {
      throw new ValidationError(`Unknown action: ${action}`);
    }

    // Execute handler
    return await handler({ request: { payload } });
  } catch (error) {
    // Handle CORS preflight
    if (error instanceof CorsPreflightSignal) {
      return formatCorsResponse();
    }

    console.error(`[ai-room-redesign] ========== ERROR ==========`);
    console.error(`[ai-room-redesign]`, error);

    return formatErrorResponseHttp(error as Error);
  }
});
