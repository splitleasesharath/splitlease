/**
 * simulation-admin Edge Function
 * Admin tool for managing usability testing simulation testers
 *
 * Actions:
 * - listTesters: Get all usability testers with pagination and search
 * - getTester: Get single tester by ID
 * - resetToDay1: Reset tester to step 0 (not_started)
 * - advanceToDay2: Advance tester to step 4 (day_2_intro)
 * - getStatistics: Get tester distribution by step
 *
 * Database table: user (using existing columns)
 * Relevant columns: is usability tester, Usability Step, Name - First, Name - Last, email, Modified Date
 */

import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient, SupabaseClient } from "https://esm.sh/@supabase/supabase-js@2";

// CORS headers
const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'POST, GET, OPTIONS, PUT, DELETE',
};

/**
 * Usability Step Configuration
 * Maps integer step (0-7) to workflow stage details
 */
const USABILITY_STEP_CONFIG: Record<number, { key: string; label: string; canAdvance: boolean; canReset: boolean }> = {
  0: { key: 'not_started', label: 'Not Started', canAdvance: true, canReset: false },
  1: { key: 'day_1_intro', label: 'Day 1 - Introduction', canAdvance: true, canReset: true },
  2: { key: 'day_1_tasks', label: 'Day 1 - Tasks', canAdvance: true, canReset: true },
  3: { key: 'day_1_complete', label: 'Day 1 - Complete', canAdvance: true, canReset: true },
  4: { key: 'day_2_intro', label: 'Day 2 - Introduction', canAdvance: true, canReset: true },
  5: { key: 'day_2_tasks', label: 'Day 2 - Tasks', canAdvance: true, canReset: true },
  6: { key: 'day_2_complete', label: 'Day 2 - Complete', canAdvance: false, canReset: true },
  7: { key: 'completed', label: 'Completed', canAdvance: false, canReset: true },
};

// Valid actions for this function
const VALID_ACTIONS = ['listTesters', 'getTester', 'resetToDay1', 'advanceToDay2', 'getStatistics'];

console.log("[simulation-admin] Edge Function initializing...");

Deno.serve(async (req: Request) => {
  try {
    console.log(`[simulation-admin] Request: ${req.method}`);

    // Handle CORS preflight
    if (req.method === 'OPTIONS') {
      return new Response(null, { status: 200, headers: corsHeaders });
    }

    // Parse request
    const body = await req.json();
    const action = body.action || 'unknown';
    const payload = body.payload || {};

    console.log(`[simulation-admin] Action: ${action}`);

    // Validate action
    if (!VALID_ACTIONS.includes(action)) {
      return errorResponse(`Invalid action: ${action}. Valid actions: ${VALID_ACTIONS.join(', ')}`, 400);
    }

    // Get Supabase config
    const supabaseUrl = Deno.env.get('SUPABASE_URL');
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY');
    const supabaseAnonKey = Deno.env.get('SUPABASE_ANON_KEY');

    if (!supabaseUrl || !supabaseServiceKey || !supabaseAnonKey) {
      throw new Error('Missing Supabase configuration');
    }

    // Authenticate user
    const user = await authenticateFromHeaders(req.headers, supabaseUrl, supabaseAnonKey);
    if (!user) {
      return errorResponse('Authentication required', 401);
    }

    // Create service client for database operations
    const supabase = createClient(supabaseUrl, supabaseServiceKey, {
      auth: { autoRefreshToken: false, persistSession: false },
    });

    // Verify user is admin or corporate user
    const isAuthorized = await checkAdminOrCorporateStatus(supabase, user.email);
    if (!isAuthorized) {
      return errorResponse('Admin or corporate access required', 403);
    }

    let result: unknown;

    switch (action) {
      case 'listTesters':
        result = await handleListTesters(payload, supabase);
        break;

      case 'getTester':
        result = await handleGetTester(payload, supabase);
        break;

      case 'resetToDay1':
        result = await handleResetToDay1(payload, supabase);
        break;

      case 'advanceToDay2':
        result = await handleAdvanceToDay2(payload, supabase);
        break;

      case 'getStatistics':
        result = await handleGetStatistics(supabase);
        break;

      default:
        throw new Error(`Unhandled action: ${action}`);
    }

    console.log('[simulation-admin] Action completed successfully');

    return new Response(
      JSON.stringify({ success: true, data: result }),
      { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error) {
    console.error('[simulation-admin] Error:', error);
    return errorResponse((error as Error).message, 500);
  }
});

// ===== HELPER FUNCTIONS =====

function errorResponse(message: string, status: number) {
  return new Response(
    JSON.stringify({ success: false, error: message }),
    { status, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
  );
}

async function authenticateFromHeaders(
  headers: Headers,
  supabaseUrl: string,
  supabaseAnonKey: string
): Promise<{ id: string; email: string } | null> {
  const authHeader = headers.get('Authorization');
  if (!authHeader) return null;

  const authClient = createClient(supabaseUrl, supabaseAnonKey, {
    global: { headers: { Authorization: authHeader } },
  });

  const { data: { user }, error } = await authClient.auth.getUser();
  if (error || !user) return null;

  return { id: user.id, email: user.email ?? '' };
}

async function checkAdminOrCorporateStatus(
  supabase: SupabaseClient,
  email: string
): Promise<boolean> {
  const { data, error } = await supabase
    .from('user')
    .select('"Toggle - Is Admin", "Toggle - Is Corporate User"')
    .eq('email', email)
    .single();

  if (error || !data) {
    console.error('[simulation-admin] Admin/corporate check failed:', error);
    return false;
  }

  return data['Toggle - Is Admin'] === true || data['Toggle - Is Corporate User'] === true;
}

/**
 * Format database user record to tester object
 */
function formatTester(dbUser: Record<string, unknown>) {
  const step = (dbUser['Usability Step'] as number) ?? 0;
  const stepConfig = USABILITY_STEP_CONFIG[step] || USABILITY_STEP_CONFIG[0];

  return {
    id: dbUser._id,
    email: dbUser.email || '',
    firstName: dbUser['Name - First'] || '',
    lastName: dbUser['Name - Last'] || '',
    usabilityStep: step,
    stepKey: stepConfig.key,
    stepLabel: stepConfig.label,
    canAdvance: stepConfig.canAdvance,
    canReset: stepConfig.canReset,
    modifiedDate: dbUser['Modified Date'] || null,
  };
}

// ===== ACTION HANDLERS =====

/**
 * List all usability testers with pagination and search
 */
async function handleListTesters(
  payload: { limit?: number; offset?: number; search?: string },
  supabase: SupabaseClient
) {
  const { limit = 50, offset = 0, search = '' } = payload;

  let query = supabase
    .from('user')
    .select('_id, email, "Name - First", "Name - Last", "Usability Step", "Modified Date"', { count: 'exact' })
    .eq('is usability tester', true)
    .order('"Name - First"', { ascending: true });

  // Apply search filter across name and email fields
  if (search) {
    const searchPattern = `%${search}%`;
    query = query.or(`"Name - First".ilike.${searchPattern},"Name - Last".ilike.${searchPattern},email.ilike.${searchPattern}`);
  }

  // Apply pagination
  const { data, error, count } = await query.range(offset, offset + limit - 1);

  if (error) {
    console.error('[simulation-admin] List testers error:', error);
    throw new Error(`Failed to fetch testers: ${error.message}`);
  }

  const testers = (data || []).map(formatTester);

  return {
    testers,
    total: count || 0,
    limit,
    offset,
    stepConfig: USABILITY_STEP_CONFIG,
  };
}

/**
 * Get a single tester by ID
 */
async function handleGetTester(
  payload: { testerId: string },
  supabase: SupabaseClient
) {
  const { testerId } = payload;

  if (!testerId) {
    throw new Error('testerId is required');
  }

  const { data, error } = await supabase
    .from('user')
    .select('_id, email, "Name - First", "Name - Last", "Usability Step", "Modified Date"')
    .eq('_id', testerId)
    .single();

  if (error) {
    if (error.code === 'PGRST116') {
      throw new Error('Tester not found');
    }
    console.error('[simulation-admin] Get tester error:', error);
    throw new Error(`Failed to fetch tester: ${error.message}`);
  }

  return { tester: formatTester(data) };
}

/**
 * Reset tester to Day 1 (step 0 - not_started)
 */
async function handleResetToDay1(
  payload: { testerId: string },
  supabase: SupabaseClient
) {
  const { testerId } = payload;

  if (!testerId) {
    throw new Error('testerId is required');
  }

  const now = new Date().toISOString();

  const { data, error } = await supabase
    .from('user')
    .update({
      'Usability Step': 0,
      'Modified Date': now,
    })
    .eq('_id', testerId)
    .select('_id, email, "Name - First", "Name - Last", "Usability Step", "Modified Date"')
    .single();

  if (error) {
    console.error('[simulation-admin] Reset to Day 1 error:', error);
    throw new Error(`Failed to reset tester: ${error.message}`);
  }

  console.log('[simulation-admin] Tester reset to Day 1:', { testerId, timestamp: now });

  return { tester: formatTester(data) };
}

/**
 * Advance tester to Day 2 (step 4 - day_2_intro)
 */
async function handleAdvanceToDay2(
  payload: { testerId: string },
  supabase: SupabaseClient
) {
  const { testerId } = payload;

  if (!testerId) {
    throw new Error('testerId is required');
  }

  const now = new Date().toISOString();

  const { data, error } = await supabase
    .from('user')
    .update({
      'Usability Step': 4, // day_2_intro
      'Modified Date': now,
    })
    .eq('_id', testerId)
    .select('_id, email, "Name - First", "Name - Last", "Usability Step", "Modified Date"')
    .single();

  if (error) {
    console.error('[simulation-admin] Advance to Day 2 error:', error);
    throw new Error(`Failed to advance tester: ${error.message}`);
  }

  console.log('[simulation-admin] Tester advanced to Day 2:', { testerId, timestamp: now });

  return { tester: formatTester(data) };
}

/**
 * Get statistics showing tester distribution by step
 */
async function handleGetStatistics(supabase: SupabaseClient) {
  const { data, error } = await supabase
    .from('user')
    .select('"Usability Step"')
    .eq('is usability tester', true);

  if (error) {
    console.error('[simulation-admin] Get statistics error:', error);
    throw new Error(`Failed to get statistics: ${error.message}`);
  }

  // Initialize counts for all steps
  const stepCounts: Record<number, number> = {};
  for (let i = 0; i <= 7; i++) {
    stepCounts[i] = 0;
  }

  // Count testers by step
  for (const row of data || []) {
    const step = (row['Usability Step'] as number) ?? 0;
    if (stepCounts[step] !== undefined) {
      stepCounts[step]++;
    } else {
      // Handle any unexpected step values
      stepCounts[step] = 1;
    }
  }

  // Build stats array with step config
  const stats = Object.entries(USABILITY_STEP_CONFIG).map(([stepStr, config]) => {
    const step = parseInt(stepStr, 10);
    return {
      step,
      key: config.key,
      label: config.label,
      count: stepCounts[step] || 0,
    };
  });

  return {
    stats,
    total: (data || []).length,
    stepConfig: USABILITY_STEP_CONFIG,
  };
}

console.log("[simulation-admin] Edge Function ready");
