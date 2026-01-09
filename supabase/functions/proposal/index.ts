/**
 * Proposal Edge Function - MINIMAL TEST VERSION
 * Testing if basic CORS handling works
 */

import "jsr:@supabase/functions-js/edge-runtime.d.ts";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'POST, GET, OPTIONS, PUT, DELETE',
};

console.log("[proposal] MINIMAL TEST - Edge Function starting...");

Deno.serve(async (req: Request) => {
  console.log(`[proposal] MINIMAL TEST - Method: ${req.method}`);

  // Handle CORS preflight
  if (req.method === 'OPTIONS') {
    console.log("[proposal] MINIMAL TEST - Returning CORS preflight response");
    return new Response(null, { status: 200, headers: corsHeaders });
  }

  // Parse body
  try {
    const body = await req.json();
    console.log(`[proposal] MINIMAL TEST - Action: ${body.action}`);

    return new Response(
      JSON.stringify({
        success: true,
        message: "MINIMAL TEST WORKS!",
        action: body.action
      }),
      {
        status: 200,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      }
    );
  } catch (e) {
    return new Response(
      JSON.stringify({ success: false, error: "Invalid request" }),
      {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      }
    );
  }
});
