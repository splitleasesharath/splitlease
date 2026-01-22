/**
 * informational-texts Edge Function
 * CRUD operations for informational text content management
 *
 * Actions:
 * - list: Get all entries (paginated)
 * - get: Get single entry by ID
 * - create: Insert new entry
 * - update: Update existing entry (partial updates)
 * - delete: Hard delete entry
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
  tagTitle: 'Information Tag-Title',
  desktop: 'Desktop copy',
  desktopPlus: 'Desktop+ copy',
  mobile: 'Mobile copy',
  ipad: 'iPad copy',
  showMore: 'show more available?',
  hasLink: 'Link',
  createdBy: 'Created By',
  createdDate: 'Created Date',
  modifiedDate: 'Modified Date',
};

// Reverse mapping for DB -> JS conversion
const REVERSE_COLUMN_MAP: Record<string, string> = {};
for (const [jsKey, dbCol] of Object.entries(COLUMN_MAP)) {
  REVERSE_COLUMN_MAP[dbCol] = jsKey;
}

console.log("[informational-texts] Edge Function initializing...");

Deno.serve(async (req: Request) => {
  try {
    console.log(`[informational-texts] Request: ${req.method}`);

    // Handle CORS preflight
    if (req.method === 'OPTIONS') {
      return new Response(null, { status: 200, headers: corsHeaders });
    }

    // Parse request
    const body = await req.json();
    const action = body.action || 'unknown';
    const payload = body.payload || {};

    console.log(`[informational-texts] Action: ${action}`);

    // Validate action
    const validActions = ['list', 'get', 'create', 'update', 'delete'];

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
      case 'list':
        result = await handleList(payload, supabase);
        break;

      case 'get':
        result = await handleGet(payload, supabase);
        break;

      case 'create':
        result = await handleCreate(payload, supabase, user);
        break;

      case 'update':
        result = await handleUpdate(payload, supabase);
        break;

      case 'delete':
        result = await handleDelete(payload, supabase);
        break;

      default:
        throw new Error(`Unhandled action: ${action}`);
    }

    console.log('[informational-texts] Action completed successfully');

    return new Response(
      JSON.stringify({ success: true, data: result }),
      { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error) {
    console.error('[informational-texts] Error:', error);
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
 * Convert JS object keys to database column names
 */
function toDbColumns(jsData: Record<string, unknown>): Record<string, unknown> {
  const dbData: Record<string, unknown> = {};
  for (const [jsKey, value] of Object.entries(jsData)) {
    const dbCol = COLUMN_MAP[jsKey as keyof typeof COLUMN_MAP];
    if (dbCol) {
      dbData[dbCol] = value;
    } else if (jsKey === '_id') {
      dbData['_id'] = value;
    }
  }
  return dbData;
}

/**
 * Convert database row to JS object with friendly keys
 */
function toJsKeys(dbRow: Record<string, unknown>): Record<string, unknown> {
  const jsData: Record<string, unknown> = {};
  for (const [dbCol, value] of Object.entries(dbRow)) {
    const jsKey = REVERSE_COLUMN_MAP[dbCol];
    if (jsKey) {
      jsData[jsKey] = value;
    } else {
      // Pass through unmapped columns as-is (_id, created_at, updated_at, etc.)
      jsData[dbCol] = value;
    }
  }
  return jsData;
}

/**
 * Generate a unique ID for new entries
 * Format: text_YYYYMMDD_HHMMSS_XXX (matches existing Bubble-style IDs)
 */
function generateId(): string {
  const now = new Date();
  const date = now.toISOString().slice(0, 10).replace(/-/g, '');
  const time = now.toISOString().slice(11, 19).replace(/:/g, '');
  const random = Math.random().toString(36).substring(2, 5).toUpperCase();
  return `text_${date}_${time}_${random}`;
}

// ===== ACTION HANDLERS =====

/**
 * List all informational texts with optional pagination
 */
async function handleList(
  payload: { limit?: number; offset?: number; search?: string },
  supabase: SupabaseClient
) {
  const { limit = 100, offset = 0, search } = payload;

  let query = supabase
    .from('informationaltexts')
    .select('*', { count: 'exact' })
    .order('Created Date', { ascending: false })
    .range(offset, offset + limit - 1);

  // Optional search by tag title
  if (search && search.trim()) {
    query = query.ilike('Information Tag-Title', `%${search}%`);
  }

  const { data, error, count } = await query;

  if (error) {
    console.error('[informational-texts] List error:', error);
    throw new Error(`Failed to fetch entries: ${error.message}`);
  }

  // Convert to JS-friendly keys
  const entries = (data || []).map(toJsKeys);

  return { entries, total: count || 0, limit, offset };
}

/**
 * Get a single informational text by ID
 */
async function handleGet(
  payload: { id: string },
  supabase: SupabaseClient
) {
  const { id } = payload;

  if (!id) {
    throw new Error('id is required');
  }

  const { data, error } = await supabase
    .from('informationaltexts')
    .select('*')
    .eq('_id', id)
    .single();

  if (error) {
    if (error.code === 'PGRST116') {
      throw new Error('Entry not found');
    }
    throw new Error(`Failed to fetch entry: ${error.message}`);
  }

  return toJsKeys(data);
}

/**
 * Create a new informational text entry
 */
async function handleCreate(
  payload: {
    tagTitle: string;
    desktop: string;
    desktopPlus?: string;
    mobile?: string;
    ipad?: string;
    showMore?: boolean;
    hasLink?: boolean;
  },
  supabase: SupabaseClient,
  user: { id: string; email: string }
) {
  const { tagTitle, desktop, desktopPlus, mobile, ipad, showMore, hasLink } = payload;

  // Validate required fields
  if (!tagTitle || !tagTitle.trim()) {
    throw new Error('tagTitle is required');
  }
  if (!desktop || !desktop.trim()) {
    throw new Error('desktop content is required');
  }

  // Check for duplicate tag title
  const { data: existing } = await supabase
    .from('informationaltexts')
    .select('_id')
    .eq('Information Tag-Title', tagTitle.trim())
    .maybeSingle();

  if (existing) {
    throw new Error(`Entry with tag title "${tagTitle}" already exists`);
  }

  const now = new Date().toISOString();
  const newEntry = {
    '_id': generateId(),
    'Information Tag-Title': tagTitle.trim(),
    'Desktop copy': desktop,
    'Desktop+ copy': desktopPlus || null,
    'Mobile copy': mobile || null,
    'iPad copy': ipad || null,
    'show more available?': showMore || false,
    'Link': hasLink || false,
    'Created By': user.email,
    'Created Date': now,
    'Modified Date': now,
    'created_at': now,
    'updated_at': now,
  };

  const { data, error } = await supabase
    .from('informationaltexts')
    .insert(newEntry)
    .select()
    .single();

  if (error) {
    console.error('[informational-texts] Create error:', error);
    throw new Error(`Failed to create entry: ${error.message}`);
  }

  return toJsKeys(data);
}

/**
 * Update an existing informational text entry (partial update)
 */
async function handleUpdate(
  payload: {
    id: string;
    tagTitle?: string;
    desktop?: string;
    desktopPlus?: string;
    mobile?: string;
    ipad?: string;
    showMore?: boolean;
    hasLink?: boolean;
  },
  supabase: SupabaseClient
) {
  const { id, tagTitle, ...rest } = payload;

  if (!id) {
    throw new Error('id is required');
  }

  // Build update object with only provided fields
  const updateData: Record<string, unknown> = {
    'Modified Date': new Date().toISOString(),
    'updated_at': new Date().toISOString(),
  };

  if (tagTitle !== undefined) {
    if (!tagTitle.trim()) {
      throw new Error('tagTitle cannot be empty');
    }
    // Check for duplicate if changing tag title
    const { data: existing } = await supabase
      .from('informationaltexts')
      .select('_id')
      .eq('Information Tag-Title', tagTitle.trim())
      .neq('_id', id)
      .maybeSingle();

    if (existing) {
      throw new Error(`Entry with tag title "${tagTitle}" already exists`);
    }
    updateData['Information Tag-Title'] = tagTitle.trim();
  }

  if (rest.desktop !== undefined) {
    if (!rest.desktop.trim()) {
      throw new Error('desktop content cannot be empty');
    }
    updateData['Desktop copy'] = rest.desktop;
  }

  if (rest.desktopPlus !== undefined) {
    updateData['Desktop+ copy'] = rest.desktopPlus || null;
  }

  if (rest.mobile !== undefined) {
    updateData['Mobile copy'] = rest.mobile || null;
  }

  if (rest.ipad !== undefined) {
    updateData['iPad copy'] = rest.ipad || null;
  }

  if (rest.showMore !== undefined) {
    updateData['show more available?'] = rest.showMore;
  }

  if (rest.hasLink !== undefined) {
    updateData['Link'] = rest.hasLink;
  }

  const { data, error } = await supabase
    .from('informationaltexts')
    .update(updateData)
    .eq('_id', id)
    .select()
    .single();

  if (error) {
    if (error.code === 'PGRST116') {
      throw new Error('Entry not found');
    }
    console.error('[informational-texts] Update error:', error);
    throw new Error(`Failed to update entry: ${error.message}`);
  }

  return toJsKeys(data);
}

/**
 * Delete an informational text entry (hard delete)
 */
async function handleDelete(
  payload: { id: string },
  supabase: SupabaseClient
) {
  const { id } = payload;

  if (!id) {
    throw new Error('id is required');
  }

  // Verify entry exists
  const { data: existing, error: fetchError } = await supabase
    .from('informationaltexts')
    .select('_id, "Information Tag-Title"')
    .eq('_id', id)
    .single();

  if (fetchError || !existing) {
    throw new Error('Entry not found');
  }

  const { error: deleteError } = await supabase
    .from('informationaltexts')
    .delete()
    .eq('_id', id);

  if (deleteError) {
    console.error('[informational-texts] Delete error:', deleteError);
    throw new Error(`Failed to delete entry: ${deleteError.message}`);
  }

  return { deleted: true, id, tagTitle: existing['Information Tag-Title'] };
}

console.log("[informational-texts] Edge Function ready");
