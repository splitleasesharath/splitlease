/**
 * rental-applications Edge Function
 * Admin dashboard operations for rental application management
 *
 * Actions:
 * - list: Paginated list with filters and sorting
 * - get: Get single application with related data
 * - update: Update application fields
 * - update_status: Update application status
 * - add_occupant: Add an occupant to application
 * - delete_occupant: Remove an occupant
 *
 * Note: This function queries the existing rental_application table
 * which stores applications created by guests. The table uses a
 * unique_id field for human-readable IDs.
 */

import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient, SupabaseClient } from "https://esm.sh/@supabase/supabase-js@2";

// CORS headers
const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'POST, GET, OPTIONS, PUT, DELETE',
};

console.log("[rental-applications] Edge Function initializing...");

Deno.serve(async (req: Request) => {
  try {
    console.log(`[rental-applications] Request: ${req.method}`);

    // Handle CORS preflight
    if (req.method === 'OPTIONS') {
      return new Response(null, { status: 200, headers: corsHeaders });
    }

    // Parse request
    const body = await req.json();
    const action = body.action || 'unknown';
    const payload = body.payload || {};

    console.log(`[rental-applications] Action: ${action}`);

    // Validate action
    const validActions = [
      'list', 'get', 'update', 'update_status',
      'add_occupant', 'delete_occupant',
      'add_reference', 'delete_reference',
      'add_employment', 'delete_employment'
    ];

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

    // Check if user is admin
    const isAdmin = await checkAdminStatus(user.id, supabase);
    if (!isAdmin) {
      console.log(`[rental-applications] User ${user.id} is not an admin`);
      return errorResponse('Admin access required', 403);
    }

    let result: unknown;

    switch (action) {
      case 'list':
        result = await handleList(payload, supabase);
        break;

      case 'get':
        result = await handleGet(payload, supabase);
        break;

      case 'update':
        result = await handleUpdate(payload, supabase);
        break;

      case 'update_status':
        result = await handleUpdateStatus(payload, supabase);
        break;

      case 'add_occupant':
        result = await handleAddOccupant(payload, supabase);
        break;

      case 'delete_occupant':
        result = await handleDeleteOccupant(payload, supabase);
        break;

      case 'add_reference':
        result = await handleAddReference(payload, supabase);
        break;

      case 'delete_reference':
        result = await handleDeleteReference(payload, supabase);
        break;

      case 'add_employment':
        result = await handleAddEmployment(payload, supabase);
        break;

      case 'delete_employment':
        result = await handleDeleteEmployment(payload, supabase);
        break;

      default:
        throw new Error(`Unhandled action: ${action}`);
    }

    console.log('[rental-applications] Action completed successfully');

    return new Response(
      JSON.stringify({ success: true, ...result }),
      { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error) {
    console.error('[rental-applications] Error:', error);
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
): Promise<{ id: string; email: string; bubble_user_id?: string } | null> {
  const authHeader = headers.get('Authorization');
  if (!authHeader) return null;

  const authClient = createClient(supabaseUrl, supabaseAnonKey, {
    global: { headers: { Authorization: authHeader } },
  });

  const { data: { user }, error } = await authClient.auth.getUser();
  if (error || !user) return null;

  return {
    id: user.id,
    email: user.email ?? '',
    bubble_user_id: user.user_metadata?.bubble_user_id
  };
}

async function checkAdminStatus(
  userId: string,
  supabase: SupabaseClient
): Promise<boolean> {
  try {
    // First get the user's bubble_user_id from auth metadata
    const { data: { user }, error: authError } = await supabase.auth.admin.getUserById(userId);

    if (authError || !user) {
      console.error('[rental-applications] Failed to get user:', authError);
      return false;
    }

    const bubbleUserId = user.user_metadata?.bubble_user_id;
    if (!bubbleUserId) {
      console.log('[rental-applications] No bubble_user_id found for user');
      // Check user_metadata for admin flag as fallback
      return user.user_metadata?.is_admin === true;
    }

    // Check the user table for admin status
    const { data: userData, error: userError } = await supabase
      .from('user')
      .select('"Toggle - Is Admin"')
      .eq('_id', bubbleUserId)
      .single();

    if (userError) {
      console.error('[rental-applications] Failed to check admin status:', userError);
      // Fall back to user_metadata
      return user.user_metadata?.is_admin === true;
    }

    return userData?.['Toggle - Is Admin'] === true;
  } catch (err) {
    console.error('[rental-applications] Admin check error:', err);
    return false;
  }
}

// ===== ACTION HANDLERS =====

interface ListPayload {
  filters?: {
    status?: string;
    searchQuery?: string;
    isCompleted?: boolean;
    minIncome?: number;
  };
  sort?: {
    field: string;
    direction: 'asc' | 'desc';
  };
  pagination?: {
    page: number;
    pageSize: number;
  };
}

/**
 * List rental applications with filters, sorting, and pagination
 */
async function handleList(payload: ListPayload, supabase: SupabaseClient) {
  const { filters = {}, sort, pagination } = payload;
  const page = pagination?.page || 1;
  const pageSize = pagination?.pageSize || 20;
  const offset = (page - 1) * pageSize;

  // Build query - using rental_application table
  let query = supabase
    .from('rental_application')
    .select('*', { count: 'exact' });

  // Apply filters
  if (filters.status) {
    query = query.eq('Status', filters.status);
  }

  if (filters.isCompleted !== undefined) {
    query = query.eq('Is Completed', filters.isCompleted);
  }

  if (filters.searchQuery) {
    // Search across multiple fields using ilike
    const searchTerm = `%${filters.searchQuery}%`;
    query = query.or(`_id.ilike.${searchTerm},"Personal Info->First Name".ilike.${searchTerm},"Personal Info->Last Name".ilike.${searchTerm},"Personal Info->Email".ilike.${searchTerm}`);
  }

  if (filters.minIncome) {
    query = query.gte('Monthly Income', filters.minIncome);
  }

  // Apply sorting
  const sortField = sort?.field || 'Created Date';
  const sortDirection = sort?.direction === 'asc' ? { ascending: true } : { ascending: false };

  // Map frontend field names to database column names
  const fieldMapping: Record<string, string> = {
    'created_at': 'Created Date',
    'unique_id': '_id',
    'status': 'Status',
    'completion_percentage': 'Completion Percentage',
    'total_monthly_income': 'Monthly Income'
  };

  const dbField = fieldMapping[sortField] || sortField;
  query = query.order(dbField, sortDirection);

  // Apply pagination
  query = query.range(offset, offset + pageSize - 1);

  const { data, error, count } = await query;

  if (error) {
    console.error('[rental-applications] List error:', error);
    throw new Error(`Failed to fetch applications: ${error.message}`);
  }

  // Transform data to match frontend expectations
  const applications = (data || []).map(transformApplication);

  return {
    data: applications,
    pagination: {
      page,
      pageSize,
      total: count || 0,
      totalPages: Math.ceil((count || 0) / pageSize)
    }
  };
}

/**
 * Get a single rental application with all related data
 */
async function handleGet(
  payload: { id: string },
  supabase: SupabaseClient
) {
  const { id } = payload;

  if (!id) {
    throw new Error('id is required');
  }

  // Fetch the main application
  const { data, error } = await supabase
    .from('rental_application')
    .select('*')
    .eq('_id', id)
    .single();

  if (error) {
    console.error('[rental-applications] Get error:', error);
    throw new Error(`Failed to fetch application: ${error.message}`);
  }

  if (!data) {
    throw new Error('Application not found');
  }

  // Note: Related tables (occupants, references, employment) may be stored
  // as JSONB arrays within the main record or in separate tables.
  // Adjust based on actual schema.

  const application = transformApplication(data);

  // Parse JSONB fields that may contain arrays
  application.occupants = data['Occupants'] || [];
  application.references = data['References'] || [];
  application.employment = data['Employment History'] || [];

  return { data: application };
}

/**
 * Update application fields
 */
async function handleUpdate(
  payload: { id: string; updates: Record<string, unknown> },
  supabase: SupabaseClient
) {
  const { id, updates } = payload;

  if (!id) {
    throw new Error('id is required');
  }

  if (!updates || Object.keys(updates).length === 0) {
    throw new Error('updates object is required');
  }

  // Map frontend field names to database column names
  const dbUpdates: Record<string, unknown> = {};

  if (updates.personal_info !== undefined) {
    dbUpdates['Personal Info'] = updates.personal_info;
  }
  if (updates.current_address !== undefined) {
    dbUpdates['Current Address'] = updates.current_address;
  }
  if (updates.emergency_contact !== undefined) {
    dbUpdates['Emergency Contact'] = updates.emergency_contact;
  }
  if (updates.accessibility !== undefined) {
    dbUpdates['Accessibility'] = updates.accessibility;
  }
  if (updates.monthly_income !== undefined) {
    dbUpdates['Monthly Income'] = updates.monthly_income;
  }
  if (updates.additional_income !== undefined) {
    dbUpdates['Additional Income'] = updates.additional_income;
  }
  if (updates.has_eviction !== undefined) {
    dbUpdates['Has Eviction'] = updates.has_eviction;
  }
  if (updates.has_felony !== undefined) {
    dbUpdates['Has Felony'] = updates.has_felony;
  }
  if (updates.has_bankruptcy !== undefined) {
    dbUpdates['Has Bankruptcy'] = updates.has_bankruptcy;
  }

  // Always update modified date
  dbUpdates['Modified Date'] = new Date().toISOString();

  const { data, error } = await supabase
    .from('rental_application')
    .update(dbUpdates)
    .eq('_id', id)
    .select()
    .single();

  if (error) {
    console.error('[rental-applications] Update error:', error);
    throw new Error(`Failed to update application: ${error.message}`);
  }

  return { data: transformApplication(data) };
}

/**
 * Update application status
 */
async function handleUpdateStatus(
  payload: { id: string; status: string },
  supabase: SupabaseClient
) {
  const { id, status } = payload;

  if (!id || !status) {
    throw new Error('id and status are required');
  }

  const validStatuses = [
    'draft', 'in-progress', 'submitted', 'under-review',
    'approved', 'conditionally-approved', 'denied', 'withdrawn', 'expired'
  ];

  if (!validStatuses.includes(status)) {
    throw new Error(`Invalid status: ${status}. Valid statuses are: ${validStatuses.join(', ')}`);
  }

  const { data, error } = await supabase
    .from('rental_application')
    .update({
      'Status': status,
      'Modified Date': new Date().toISOString()
    })
    .eq('_id', id)
    .select()
    .single();

  if (error) {
    console.error('[rental-applications] Update status error:', error);
    throw new Error(`Failed to update status: ${error.message}`);
  }

  return { data: transformApplication(data) };
}

/**
 * Add an occupant to the application
 * (Modifies JSONB array if stored inline, or inserts to related table)
 */
async function handleAddOccupant(
  payload: { applicationId: string; occupant: Record<string, unknown> },
  supabase: SupabaseClient
) {
  const { applicationId, occupant } = payload;

  if (!applicationId || !occupant) {
    throw new Error('applicationId and occupant are required');
  }

  // Fetch current occupants
  const { data: app, error: fetchError } = await supabase
    .from('rental_application')
    .select('"Occupants"')
    .eq('_id', applicationId)
    .single();

  if (fetchError) {
    throw new Error(`Failed to fetch application: ${fetchError.message}`);
  }

  const currentOccupants = app?.['Occupants'] || [];
  const newOccupant = {
    id: crypto.randomUUID(),
    ...occupant,
    created_at: new Date().toISOString()
  };

  const updatedOccupants = [...currentOccupants, newOccupant];

  const { error: updateError } = await supabase
    .from('rental_application')
    .update({
      'Occupants': updatedOccupants,
      'Modified Date': new Date().toISOString()
    })
    .eq('_id', applicationId);

  if (updateError) {
    throw new Error(`Failed to add occupant: ${updateError.message}`);
  }

  return { data: newOccupant };
}

/**
 * Delete an occupant from the application
 */
async function handleDeleteOccupant(
  payload: { applicationId: string; occupantId: string },
  supabase: SupabaseClient
) {
  const { applicationId, occupantId } = payload;

  if (!applicationId || !occupantId) {
    throw new Error('applicationId and occupantId are required');
  }

  // Fetch current occupants
  const { data: app, error: fetchError } = await supabase
    .from('rental_application')
    .select('"Occupants"')
    .eq('_id', applicationId)
    .single();

  if (fetchError) {
    throw new Error(`Failed to fetch application: ${fetchError.message}`);
  }

  const currentOccupants = app?.['Occupants'] || [];
  const updatedOccupants = currentOccupants.filter(
    (o: { id: string }) => o.id !== occupantId
  );

  const { error: updateError } = await supabase
    .from('rental_application')
    .update({
      'Occupants': updatedOccupants,
      'Modified Date': new Date().toISOString()
    })
    .eq('_id', applicationId);

  if (updateError) {
    throw new Error(`Failed to delete occupant: ${updateError.message}`);
  }

  return { deleted: true };
}

/**
 * Add a reference to the application
 */
async function handleAddReference(
  payload: { applicationId: string; reference: Record<string, unknown> },
  supabase: SupabaseClient
) {
  const { applicationId, reference } = payload;

  if (!applicationId || !reference) {
    throw new Error('applicationId and reference are required');
  }

  const { data: app, error: fetchError } = await supabase
    .from('rental_application')
    .select('"References"')
    .eq('_id', applicationId)
    .single();

  if (fetchError) {
    throw new Error(`Failed to fetch application: ${fetchError.message}`);
  }

  const currentRefs = app?.['References'] || [];
  const newRef = {
    id: crypto.randomUUID(),
    ...reference,
    created_at: new Date().toISOString()
  };

  const updatedRefs = [...currentRefs, newRef];

  const { error: updateError } = await supabase
    .from('rental_application')
    .update({
      'References': updatedRefs,
      'Modified Date': new Date().toISOString()
    })
    .eq('_id', applicationId);

  if (updateError) {
    throw new Error(`Failed to add reference: ${updateError.message}`);
  }

  return { data: newRef };
}

/**
 * Delete a reference from the application
 */
async function handleDeleteReference(
  payload: { applicationId: string; referenceId: string },
  supabase: SupabaseClient
) {
  const { applicationId, referenceId } = payload;

  if (!applicationId || !referenceId) {
    throw new Error('applicationId and referenceId are required');
  }

  const { data: app, error: fetchError } = await supabase
    .from('rental_application')
    .select('"References"')
    .eq('_id', applicationId)
    .single();

  if (fetchError) {
    throw new Error(`Failed to fetch application: ${fetchError.message}`);
  }

  const currentRefs = app?.['References'] || [];
  const updatedRefs = currentRefs.filter(
    (r: { id: string }) => r.id !== referenceId
  );

  const { error: updateError } = await supabase
    .from('rental_application')
    .update({
      'References': updatedRefs,
      'Modified Date': new Date().toISOString()
    })
    .eq('_id', applicationId);

  if (updateError) {
    throw new Error(`Failed to delete reference: ${updateError.message}`);
  }

  return { deleted: true };
}

/**
 * Add employment history entry
 */
async function handleAddEmployment(
  payload: { applicationId: string; employment: Record<string, unknown> },
  supabase: SupabaseClient
) {
  const { applicationId, employment } = payload;

  if (!applicationId || !employment) {
    throw new Error('applicationId and employment are required');
  }

  const { data: app, error: fetchError } = await supabase
    .from('rental_application')
    .select('"Employment History"')
    .eq('_id', applicationId)
    .single();

  if (fetchError) {
    throw new Error(`Failed to fetch application: ${fetchError.message}`);
  }

  const currentEmployment = app?.['Employment History'] || [];
  const newEmployment = {
    id: crypto.randomUUID(),
    ...employment,
    created_at: new Date().toISOString()
  };

  const updatedEmployment = [...currentEmployment, newEmployment];

  const { error: updateError } = await supabase
    .from('rental_application')
    .update({
      'Employment History': updatedEmployment,
      'Modified Date': new Date().toISOString()
    })
    .eq('_id', applicationId);

  if (updateError) {
    throw new Error(`Failed to add employment: ${updateError.message}`);
  }

  return { data: newEmployment };
}

/**
 * Delete employment history entry
 */
async function handleDeleteEmployment(
  payload: { applicationId: string; employmentId: string },
  supabase: SupabaseClient
) {
  const { applicationId, employmentId } = payload;

  if (!applicationId || !employmentId) {
    throw new Error('applicationId and employmentId are required');
  }

  const { data: app, error: fetchError } = await supabase
    .from('rental_application')
    .select('"Employment History"')
    .eq('_id', applicationId)
    .single();

  if (fetchError) {
    throw new Error(`Failed to fetch application: ${fetchError.message}`);
  }

  const currentEmployment = app?.['Employment History'] || [];
  const updatedEmployment = currentEmployment.filter(
    (e: { id: string }) => e.id !== employmentId
  );

  const { error: updateError } = await supabase
    .from('rental_application')
    .update({
      'Employment History': updatedEmployment,
      'Modified Date': new Date().toISOString()
    })
    .eq('_id', applicationId);

  if (updateError) {
    throw new Error(`Failed to delete employment: ${updateError.message}`);
  }

  return { deleted: true };
}

// ===== DATA TRANSFORMATION =====

/**
 * Transform database record to frontend format
 * Maps Bubble-style column names to snake_case
 */
function transformApplication(record: Record<string, unknown>) {
  return {
    id: record['_id'],
    unique_id: record['_id'], // Use _id as unique_id for display
    guest_id: record['Guest'],
    listing_id: record['Listing'],
    status: record['Status'] || 'draft',
    completion_percentage: record['Completion Percentage'] || 0,
    is_completed: record['Is Completed'] || false,

    // Personal info (JSONB)
    personal_info: record['Personal Info'] || {},
    current_address: record['Current Address'] || {},
    previous_addresses: record['Previous Addresses'] || [],
    accessibility: record['Accessibility'] || {},
    emergency_contact: record['Emergency Contact'] || {},

    // Financial
    monthly_income: record['Monthly Income'] || 0,
    additional_income: record['Additional Income'] || 0,
    total_monthly_income: (record['Monthly Income'] as number || 0) + (record['Additional Income'] as number || 0),

    // Background
    has_eviction: record['Has Eviction'] || false,
    has_felony: record['Has Felony'] || false,
    has_bankruptcy: record['Has Bankruptcy'] || false,

    // Consents
    background_check_consent: record['Background Check Consent'] || false,
    credit_check_consent: record['Credit Check Consent'] || false,
    terms_accepted: record['Terms Accepted'] || false,
    signature_date: record['Signature Date'],

    // Timestamps
    created_at: record['Created Date'],
    updated_at: record['Modified Date'],
    submitted_at: record['Submitted Date'],

    // Related data (populated in handleGet)
    occupants: [],
    references: [],
    employment: [],

    // Guest info (if joined)
    guest: record['guest'] || null
  };
}

console.log("[rental-applications] Edge Function ready");
