/**
 * verify-users Edge Function
 * Admin tool for identity verification of users
 *
 * Actions:
 * - list_users: Get recent users (paginated)
 * - search_users: Search users by email or name
 * - get_user: Get single user with verification documents
 * - toggle_verification: Update user verification status
 *
 * Database fields used (from public.user table):
 * - `user verified?` - boolean verification status
 * - `Profile Photo` - profile photo URL
 * - `Selfie with ID` - selfie with ID URL
 * - `ID front` - front of ID URL
 * - `ID Back` - back of ID URL
 * - `profile completeness` - percentage (0-100)
 * - `Tasks Completed` - JSON array of completed tasks
 */

import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient, SupabaseClient } from "https://esm.sh/@supabase/supabase-js@2";

// CORS headers
const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'POST, GET, OPTIONS, PUT, DELETE',
};

// Column name mapping: JavaScript key <-> Database column
// Database uses Bubble-style column names with spaces
const COLUMN_MAP = {
  // JS key: DB column
  fullName: 'Name - Full',
  firstName: 'Name - First',
  lastName: 'Name - Last',
  email: 'email',
  phoneNumber: 'Phone Number (as text)',
  profilePhoto: 'Profile Photo',
  selfieWithId: 'Selfie with ID',
  idFront: 'ID front',
  idBack: 'ID Back',
  isVerified: 'user verified?',
  idDocumentsSubmitted: 'ID documents submitted?',
  profileCompleteness: 'profile completeness',
  tasksCompleted: 'Tasks Completed',
  createdDate: 'Created Date',
  modifiedDate: 'Modified Date',
  isAdmin: 'Toggle - Is Admin',
};

// Reverse mapping for DB -> JS conversion
const REVERSE_COLUMN_MAP: Record<string, string> = {};
for (const [jsKey, dbCol] of Object.entries(COLUMN_MAP)) {
  REVERSE_COLUMN_MAP[dbCol] = jsKey;
}

// Select columns for user queries
const USER_SELECT_COLUMNS = `
  _id,
  "email",
  "Name - Full",
  "Name - First",
  "Name - Last",
  "Phone Number (as text)",
  "Profile Photo",
  "Selfie with ID",
  "ID front",
  "ID Back",
  "user verified?",
  "ID documents submitted?",
  "profile completeness",
  "Tasks Completed",
  "Created Date",
  "Modified Date"
`;

console.log("[verify-users] Edge Function initializing...");

Deno.serve(async (req: Request) => {
  try {
    console.log(`[verify-users] Request: ${req.method}`);

    // Handle CORS preflight
    if (req.method === 'OPTIONS') {
      return new Response(null, { status: 200, headers: corsHeaders });
    }

    // Parse request
    const body = await req.json();
    const action = body.action || 'unknown';
    const payload = body.payload || {};

    console.log(`[verify-users] Action: ${action}`);

    // Validate action
    const validActions = ['list_users', 'search_users', 'get_user', 'toggle_verification'];

    if (!validActions.includes(action)) {
      return errorResponse(`Invalid action: ${action}`, 400);
    }

    // Get Supabase config
    const supabaseUrl = Deno.env.get('SUPABASE_URL');
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY');
    const supabaseAnonKey = Deno.env.get('SUPABASE_ANON_KEY');

    if (!supabaseUrl || !supabaseServiceKey || !supabaseAnonKey) {
      throw new Error('Missing Supabase configuration');
    }

    // Authenticate user and verify admin status
    const user = await authenticateFromHeaders(req.headers, supabaseUrl, supabaseAnonKey);
    if (!user) {
      return errorResponse('Authentication required', 401);
    }

    // Create service client for database operations
    const supabase = createClient(supabaseUrl, supabaseServiceKey, {
      auth: { autoRefreshToken: false, persistSession: false },
    });

    // Verify user is admin
    const isAdmin = await checkAdminStatus(supabase, user.email);
    if (!isAdmin) {
      return errorResponse('Admin access required', 403);
    }

    let result: unknown;

    switch (action) {
      case 'list_users':
        result = await handleListUsers(payload, supabase);
        break;

      case 'search_users':
        result = await handleSearchUsers(payload, supabase);
        break;

      case 'get_user':
        result = await handleGetUser(payload, supabase);
        break;

      case 'toggle_verification':
        result = await handleToggleVerification(payload, supabase, user);
        break;

      default:
        throw new Error(`Unhandled action: ${action}`);
    }

    console.log('[verify-users] Action completed successfully');

    return new Response(
      JSON.stringify({ success: true, data: result }),
      { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error) {
    console.error('[verify-users] Error:', error);
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

/**
 * Check if user has admin privileges
 */
async function checkAdminStatus(
  supabase: SupabaseClient,
  email: string
): Promise<boolean> {
  const { data, error } = await supabase
    .from('user')
    .select('"Toggle - Is Admin"')
    .eq('email', email)
    .single();

  if (error || !data) {
    console.error('[verify-users] Admin check failed:', error);
    return false;
  }

  return data['Toggle - Is Admin'] === true;
}

/**
 * Convert database row to JS object with friendly keys
 */
function toJsUser(dbRow: Record<string, unknown>): Record<string, unknown> {
  const jsData: Record<string, unknown> = {
    _id: dbRow._id,
  };

  for (const [dbCol, value] of Object.entries(dbRow)) {
    const jsKey = REVERSE_COLUMN_MAP[dbCol];
    if (jsKey) {
      jsData[jsKey] = value;
    }
  }

  // Ensure tasksCompleted is always an array
  if (!Array.isArray(jsData.tasksCompleted)) {
    jsData.tasksCompleted = jsData.tasksCompleted ? [jsData.tasksCompleted] : [];
  }

  return jsData;
}

// ===== ACTION HANDLERS =====

/**
 * List recent users (paginated)
 */
async function handleListUsers(
  payload: { limit?: number; offset?: number },
  supabase: SupabaseClient
) {
  const { limit = 20, offset = 0 } = payload;

  const { data, error, count } = await supabase
    .from('user')
    .select(USER_SELECT_COLUMNS, { count: 'exact' })
    .order('Created Date', { ascending: false })
    .range(offset, offset + limit - 1);

  if (error) {
    console.error('[verify-users] List users error:', error);
    throw new Error(`Failed to fetch users: ${error.message}`);
  }

  const users = (data || []).map(toJsUser);

  return { users, total: count || 0, limit, offset };
}

/**
 * Search users by email or name
 */
async function handleSearchUsers(
  payload: { query: string },
  supabase: SupabaseClient
) {
  const { query } = payload;

  if (!query || query.trim().length < 2) {
    throw new Error('Search query must be at least 2 characters');
  }

  const searchTerm = query.trim().toLowerCase();

  // Search by email or full name
  const { data, error } = await supabase
    .from('user')
    .select(USER_SELECT_COLUMNS)
    .or(`email.ilike.%${searchTerm}%,"Name - Full".ilike.%${searchTerm}%`)
    .order('Created Date', { ascending: false })
    .limit(20);

  if (error) {
    console.error('[verify-users] Search users error:', error);
    throw new Error(`Failed to search users: ${error.message}`);
  }

  const users = (data || []).map(toJsUser);

  return { users, query: searchTerm };
}

/**
 * Get a single user by ID
 */
async function handleGetUser(
  payload: { userId: string },
  supabase: SupabaseClient
) {
  const { userId } = payload;

  if (!userId) {
    throw new Error('userId is required');
  }

  const { data, error } = await supabase
    .from('user')
    .select(USER_SELECT_COLUMNS)
    .eq('_id', userId)
    .single();

  if (error) {
    if (error.code === 'PGRST116') {
      throw new Error('User not found');
    }
    console.error('[verify-users] Get user error:', error);
    throw new Error(`Failed to fetch user: ${error.message}`);
  }

  return { user: toJsUser(data) };
}

/**
 * Toggle user verification status
 *
 * Side effects:
 * - Updates 'user verified?' field
 * - Updates 'Tasks Completed' (adds/removes 'identity')
 * - Updates 'profile completeness' (+/- 15%)
 * - Logs verification change for audit trail
 */
async function handleToggleVerification(
  payload: { userId: string; isVerified: boolean; notes?: string },
  supabase: SupabaseClient,
  adminUser: { id: string; email: string }
) {
  const { userId, isVerified, notes } = payload;

  if (!userId) {
    throw new Error('userId is required');
  }

  if (typeof isVerified !== 'boolean') {
    throw new Error('isVerified must be a boolean');
  }

  // Fetch current user data
  const { data: currentUser, error: fetchError } = await supabase
    .from('user')
    .select(`
      _id,
      "email",
      "Name - Full",
      "user verified?",
      "profile completeness",
      "Tasks Completed"
    `)
    .eq('_id', userId)
    .single();

  if (fetchError || !currentUser) {
    throw new Error('User not found');
  }

  // Calculate new values
  const currentCompleteness = currentUser['profile completeness'] || 0;
  let currentTasks = currentUser['Tasks Completed'];

  // Ensure currentTasks is an array
  if (!Array.isArray(currentTasks)) {
    currentTasks = currentTasks ? [currentTasks] : [];
  }

  let newCompleteness: number;
  let newTasks: string[];

  if (isVerified) {
    // Adding verification
    newCompleteness = Math.min(currentCompleteness + 15, 100);
    newTasks = [...new Set([...currentTasks, 'identity'])];
  } else {
    // Removing verification
    newCompleteness = Math.max(currentCompleteness - 15, 0);
    newTasks = currentTasks.filter((t: string) => t !== 'identity');
  }

  const now = new Date().toISOString();

  // Update user record
  const { data: updatedUser, error: updateError } = await supabase
    .from('user')
    .update({
      'user verified?': isVerified,
      'profile completeness': newCompleteness,
      'Tasks Completed': newTasks,
      'Modified Date': now,
      'updated_at': now,
    })
    .eq('_id', userId)
    .select(USER_SELECT_COLUMNS)
    .single();

  if (updateError) {
    console.error('[verify-users] Update error:', updateError);
    throw new Error(`Failed to update verification: ${updateError.message}`);
  }

  // Log verification change (audit trail)
  console.log('[verify-users] Verification changed:', {
    userId,
    userEmail: currentUser.email,
    userName: currentUser['Name - Full'],
    isVerified,
    previousVerified: currentUser['user verified?'],
    adminEmail: adminUser.email,
    timestamp: now,
    notes,
  });

  // TODO: Trigger notification workflows
  // - Send confirmation email to user
  // - Send SMS notification to user
  // - Send internal Slack notification
  // - Cancel scheduled API reminders if profile completeness >= 80%

  if (isVerified) {
    console.log('[verify-users] Verification workflow triggered:');
    console.log('  1. User marked as verified');
    console.log('  2. Profile completeness updated:', newCompleteness);
    console.log('  3. Tasks completed updated:', newTasks);
    // console.log('  4. Internal email sent to team');
    // console.log('  5. Magic login link sent to user');
    // console.log('  6. Confirmation email sent to user');
    // console.log('  7. SMS confirmation sent to user');

    if (newCompleteness >= 80) {
      console.log('  8. Profile completeness >= 80% - Reminder cancellation would be triggered');
    }
  } else {
    console.log('[verify-users] Verification revoked for user:', currentUser.email);
  }

  return { user: toJsUser(updatedUser) };
}

console.log("[verify-users] Edge Function ready");
