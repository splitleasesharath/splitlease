/**
 * Host Payment Records Edge Function
 * Split Lease - Supabase Edge Functions
 *
 * Creates host payment records for leases based on calculated payment schedules.
 * Replaces Bubble's CORE-create-host-payment-records-recursive-javascript workflow.
 *
 * Actions:
 * - generate: Create payment records for a lease
 *
 * Request Format:
 * POST /functions/v1/host-payment-records
 * {
 *   "action": "generate",
 *   "payload": {
 *     "leaseId": "...",
 *     "rentalType": "Monthly" | "Weekly" | "Nightly",
 *     "moveInDate": "2026-01-15",
 *     "reservationSpanWeeks": 12, // for Weekly/Nightly
 *     "reservationSpanMonths": 3, // for Monthly
 *     "weekPattern": "Every week",
 *     "fourWeekRent": 2000, // for Weekly/Nightly
 *     "rentPerMonth": 2000, // for Monthly
 *     "maintenanceFee": 100,
 *     "damageDeposit": 500 // optional
 *   }
 * }
 */

import { createClient } from '@supabase/supabase-js';
import { corsHeaders } from '../_shared/cors.ts';
import {
  formatErrorResponse,
  getStatusCodeFromError,
  ValidationError,
} from '../_shared/errors.ts';
import { handleGenerate } from './handlers/generate.ts';
import { UserContext } from './lib/types.ts';

// ================================================
// CONFIGURATION
// ================================================

const ALLOWED_ACTIONS = ['generate'] as const;
type Action = (typeof ALLOWED_ACTIONS)[number];

// Actions that don't require authentication
const PUBLIC_ACTIONS = new Set<Action>(['generate']);

// Handler registry
const handlers: Readonly<Record<Action, typeof handleGenerate>> = {
  generate: handleGenerate,
};

// ================================================
// MAIN ENTRY POINT
// ================================================

Deno.serve(async (req: Request): Promise<Response> => {
  // Handle CORS preflight
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  // Only allow POST
  if (req.method !== 'POST') {
    return new Response(
      JSON.stringify({ success: false, error: 'Method not allowed' }),
      {
        status: 405,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      }
    );
  }

  try {
    // ================================================
    // PARSE REQUEST
    // ================================================

    let body: { action?: string; payload?: Record<string, unknown> };
    try {
      body = await req.json();
    } catch {
      throw new ValidationError('Invalid JSON body');
    }

    const { action, payload } = body;

    if (!action || typeof action !== 'string') {
      throw new ValidationError('action is required');
    }

    if (!ALLOWED_ACTIONS.includes(action as Action)) {
      throw new ValidationError(
        `Invalid action: ${action}. Allowed actions: ${ALLOWED_ACTIONS.join(', ')}`
      );
    }

    const typedAction = action as Action;
    console.log(`[host-payment-records] Action: ${typedAction}`);

    // ================================================
    // AUTHENTICATION (optional for public actions)
    // ================================================

    let user: UserContext | null = null;

    if (!PUBLIC_ACTIONS.has(typedAction)) {
      const authHeader = req.headers.get('Authorization');
      if (!authHeader) {
        throw new ValidationError('Authorization header required');
      }

      const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
      const supabaseAnonKey = Deno.env.get('SUPABASE_ANON_KEY')!;

      const authClient = createClient(supabaseUrl, supabaseAnonKey, {
        global: { headers: { Authorization: authHeader } },
      });

      const {
        data: { user: authUser },
        error: authError,
      } = await authClient.auth.getUser();

      if (authError || !authUser) {
        throw new ValidationError('Invalid or expired token');
      }

      user = {
        id: authUser.id,
        email: authUser.email || '',
      };
    }

    // ================================================
    // CREATE SERVICE CLIENT
    // ================================================

    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;

    const supabase = createClient(supabaseUrl, supabaseServiceKey, {
      auth: { persistSession: false },
    });

    // ================================================
    // ROUTE TO HANDLER
    // ================================================

    const handler = handlers[typedAction];
    const result = await handler(payload || {}, user, supabase);

    // ================================================
    // SUCCESS RESPONSE
    // ================================================

    return new Response(JSON.stringify({ success: true, data: result }), {
      status: 200,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });

  } catch (error) {
    // ================================================
    // ERROR RESPONSE
    // ================================================

    const status = getStatusCodeFromError(error);
    const errorMessage = formatErrorResponse(error);

    console.error(`[host-payment-records] Error:`, error);

    return new Response(JSON.stringify({ success: false, error: errorMessage }), {
      status,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});
