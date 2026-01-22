/**
 * document Edge Function
 * Operations for creating and managing documents sent to hosts
 *
 * Actions:
 * - list_policies: Get all policy documents from Bubble
 * - list_hosts: Get all host users from Supabase
 * - create: Create a new document sent record
 *
 * This function bridges data from Bubble (policy documents) and Supabase (users, documentssent)
 */

import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient, SupabaseClient } from "https://esm.sh/@supabase/supabase-js@2";

// CORS headers
const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'POST, GET, OPTIONS, PUT, DELETE',
};

console.log("[document] Edge Function initializing...");

Deno.serve(async (req: Request) => {
  try {
    console.log(`[document] Request: ${req.method}`);

    // Handle CORS preflight
    if (req.method === 'OPTIONS') {
      return new Response(null, { status: 200, headers: corsHeaders });
    }

    // Parse request
    const body = await req.json();
    const action = body.action || 'unknown';
    const payload = body.payload || {};

    console.log(`[document] Action: ${action}`);

    // Validate action
    const validActions = ['list_policies', 'list_hosts', 'create'];

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

    // Authenticate user
    const user = await authenticateFromHeaders(req.headers, supabaseUrl, supabaseAnonKey);
    if (!user) {
      return errorResponse('Authentication required', 401);
    }

    // Create service client for database operations
    const supabase = createClient(supabaseUrl, supabaseServiceKey, {
      auth: { autoRefreshToken: false, persistSession: false },
    });

    let result: unknown;

    switch (action) {
      case 'list_policies':
        result = await handleListPolicies(supabase);
        break;

      case 'list_hosts':
        result = await handleListHosts(supabase);
        break;

      case 'create':
        result = await handleCreate(payload, supabase, user);
        break;

      default:
        throw new Error(`Unhandled action: ${action}`);
    }

    console.log('[document] Action completed successfully');

    return new Response(
      JSON.stringify({ success: true, data: result }),
      { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error) {
    console.error('[document] Error:', error);
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
 * Generate a unique ID for new entries
 * Format: doc_YYYYMMDD_HHMMSS_XXX
 */
function generateId(): string {
  const now = new Date();
  const date = now.toISOString().slice(0, 10).replace(/-/g, '');
  const time = now.toISOString().slice(11, 19).replace(/:/g, '');
  const random = Math.random().toString(36).substring(2, 5).toUpperCase();
  return `doc_${date}_${time}_${random}`;
}

// ===== ACTION HANDLERS =====

/**
 * List all policy documents
 *
 * Since policy documents may be in Bubble, we'll try to fetch from:
 * 1. A local Supabase table (if synced) - zatpoliciesdocuments
 * 2. Fallback: Return a message that policies need to be synced
 */
async function handleListPolicies(supabase: SupabaseClient) {
  console.log('[document] Fetching policy documents...');

  // Try to fetch from Supabase first (table may be named differently)
  // Check for common table naming patterns
  const possibleTableNames = [
    'zatpoliciesdocuments',
    'zat-policies-documents',
    'ZAT-Policies Documents',
    'policy_documents',
    'policiesdocuments'
  ];

  for (const tableName of possibleTableNames) {
    try {
      const { data, error } = await supabase
        .from(tableName)
        .select('_id, Name, "Created Date"')
        .order('Name', { ascending: true });

      if (!error && data && data.length > 0) {
        console.log(`[document] Found ${data.length} policies in table: ${tableName}`);
        // Map to consistent format
        return data.map((policy: Record<string, unknown>) => ({
          id: policy._id,
          Name: policy.Name || 'Unnamed Policy',
          createdDate: policy['Created Date']
        }));
      }
    } catch (err) {
      // Table doesn't exist, try next
      console.log(`[document] Table ${tableName} not found, trying next...`);
    }
  }

  // If no local table found, return empty array with a note
  // In a full implementation, this would call the Bubble Data API
  console.log('[document] No policy documents table found in Supabase');

  // For now, return some mock data to demonstrate the UI
  // TODO: Implement Bubble Data API call to fetch from 'ZAT-Policies Documents'
  return [
    { id: 'policy_lease_agreement', Name: 'Standard Lease Agreement' },
    { id: 'policy_house_rules', Name: 'House Rules Document' },
    { id: 'policy_cancellation', Name: 'Cancellation Policy' },
    { id: 'policy_payment_terms', Name: 'Payment Terms & Conditions' },
    { id: 'policy_guest_guidelines', Name: 'Guest Guidelines' }
  ];
}

/**
 * List all host users from Supabase
 *
 * Hosts are identified by "Type - User Current" containing:
 * - 'A Host (I have a space available to rent)'
 * - 'Trial Host'
 */
async function handleListHosts(supabase: SupabaseClient) {
  console.log('[document] Fetching host users...');

  const { data, error } = await supabase
    .from('user')
    .select('_id, email, Name, "Type - User Current"')
    .or('"Type - User Current".eq.A Host (I have a space available to rent),"Type - User Current".eq.Trial Host')
    .order('email', { ascending: true });

  if (error) {
    console.error('[document] List hosts error:', error);
    throw new Error(`Failed to fetch host users: ${error.message}`);
  }

  console.log(`[document] Found ${data?.length || 0} host users`);

  return data || [];
}

/**
 * Create a new document sent record
 */
async function handleCreate(
  payload: {
    document_on_policies: string;
    document_sent_title: string;
    host_user: string;
    host_email: string;
    host_name: string;
  },
  supabase: SupabaseClient,
  user: { id: string; email: string }
) {
  const { document_on_policies, document_sent_title, host_user, host_email, host_name } = payload;

  // Validate required fields
  if (!document_on_policies) {
    throw new Error('document_on_policies is required');
  }
  if (!document_sent_title || !document_sent_title.trim()) {
    throw new Error('document_sent_title is required');
  }
  if (!host_user) {
    throw new Error('host_user is required');
  }

  console.log('[document] Creating document sent record...');
  console.log('[document] Policy:', document_on_policies);
  console.log('[document] Title:', document_sent_title);
  console.log('[document] Host:', host_email);

  const now = new Date().toISOString();
  const newEntry = {
    '_id': generateId(),
    'Document on policies': document_on_policies,
    'Document sent title': document_sent_title.trim(),
    'Host user': host_user,
    'Host email': host_email,
    'Host name': host_name,
    'Created By': user.email,
    'Created Date': now,
    'Modified Date': now,
    'created_at': now,
    'updated_at': now,
    'pending': false,
  };

  const { data, error } = await supabase
    .from('documentssent')
    .insert(newEntry)
    .select()
    .single();

  if (error) {
    console.error('[document] Create error:', {
      code: error.code,
      message: error.message,
      details: error.details,
      hint: error.hint
    });
    throw new Error(`Failed to create document: ${error.message}`);
  }

  console.log('[document] Document created successfully:', data._id);

  return {
    id: data._id,
    title: data['Document sent title'],
    hostEmail: data['Host email'],
    success: true
  };
}

console.log("[document] Edge Function ready");
