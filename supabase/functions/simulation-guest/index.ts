/**
 * Simulation Guest Edge Function
 *
 * Handles all guest-side simulation actions for the usability test workflow.
 * Uses action-based routing pattern with lazy-loaded handlers.
 *
 * Actions:
 * - initialize: Set up simulation context and test data
 * - step_a_lease_documents: Simulate lease signing
 * - step_b_house_manual: Grant house manual access
 * - step_c_date_change: Simulate date change request
 * - step_d_lease_ending: Simulate lease nearing end
 * - step_e_host_sms: Simulate host SMS receipt
 * - step_f_complete: Mark simulation complete
 * - cleanup: Remove simulation test data
 */

import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'POST, GET, OPTIONS, PUT, DELETE',
};

const ALLOWED_ACTIONS = [
  'initialize',
  'step_a_lease_documents',
  'step_b_house_manual',
  'step_c_date_change',
  'step_d_lease_ending',
  'step_e_host_sms',
  'step_f_complete',
  'cleanup'
] as const;

type Action = typeof ALLOWED_ACTIONS[number];

console.log('[simulation-guest] Edge Function initializing...');

Deno.serve(async (req: Request) => {
  try {
    console.log(`[simulation-guest] Request: ${req.method}`);

    // Handle CORS preflight
    if (req.method === 'OPTIONS') {
      return new Response(null, { status: 200, headers: corsHeaders });
    }

    // Parse request body
    const body = await req.json();
    const action = body.action as Action;
    const payload = body.payload || {};

    console.log(`[simulation-guest] Action: ${action}`);

    // Validate action
    if (!ALLOWED_ACTIONS.includes(action)) {
      return new Response(
        JSON.stringify({ success: false, error: `Invalid action: ${action}` }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Initialize Supabase client
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;

    if (!supabaseUrl || !supabaseServiceKey) {
      throw new Error('Missing Supabase configuration');
    }

    const supabase = createClient(supabaseUrl, supabaseServiceKey, {
      auth: { autoRefreshToken: false, persistSession: false }
    });

    let result: unknown;

    // Dynamic imports - load only the handler needed
    switch (action) {
      case 'initialize': {
        console.log('[simulation-guest] Loading initialize handler...');
        const { handleInitialize } = await import("./actions/initialize.ts");
        result = await handleInitialize(supabase, payload);
        break;
      }

      case 'step_a_lease_documents': {
        console.log('[simulation-guest] Loading step A handler...');
        const { handleStepA } = await import("./actions/stepALeaseDocuments.ts");
        result = await handleStepA(supabase, payload);
        break;
      }

      case 'step_b_house_manual': {
        console.log('[simulation-guest] Loading step B handler...');
        const { handleStepB } = await import("./actions/stepBHouseManual.ts");
        result = await handleStepB(supabase, payload);
        break;
      }

      case 'step_c_date_change': {
        console.log('[simulation-guest] Loading step C handler...');
        const { handleStepC } = await import("./actions/stepCDateChange.ts");
        result = await handleStepC(supabase, payload);
        break;
      }

      case 'step_d_lease_ending': {
        console.log('[simulation-guest] Loading step D handler...');
        const { handleStepD } = await import("./actions/stepDLeaseEnding.ts");
        result = await handleStepD(supabase, payload);
        break;
      }

      case 'step_e_host_sms': {
        console.log('[simulation-guest] Loading step E handler...');
        const { handleStepE } = await import("./actions/stepEHostSms.ts");
        result = await handleStepE(supabase, payload);
        break;
      }

      case 'step_f_complete': {
        console.log('[simulation-guest] Loading step F handler...');
        const { handleStepF } = await import("./actions/stepFComplete.ts");
        result = await handleStepF(supabase, payload);
        break;
      }

      case 'cleanup': {
        console.log('[simulation-guest] Loading cleanup handler...');
        const { handleCleanup } = await import("./actions/cleanup.ts");
        result = await handleCleanup(supabase, payload);
        break;
      }
    }

    console.log('[simulation-guest] Action completed successfully');

    return new Response(
      JSON.stringify({ success: true, data: result }),
      { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error) {
    console.error('[simulation-guest] Error:', error);

    return new Response(
      JSON.stringify({
        success: false,
        error: (error as Error).message || 'An unexpected error occurred'
      }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
