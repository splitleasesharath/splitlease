/**
 * co-host-requests Edge Function
 * Admin tool for managing co-host assistance requests
 *
 * Actions:
 * - list: Get paginated, filtered co-host requests with related data
 * - getById: Get single request with full details
 * - updateStatus: Change request status
 * - assignCoHost: Assign a co-host user to a request
 * - addNotes: Add admin or request notes
 * - getStatistics: Get counts by status
 * - getAvailableCoHosts: Get list of users who can be co-hosts
 *
 * Database table: co_hostrequest
 * Related tables: user (for host and co-host info), listing (for property info)
 */

import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient, SupabaseClient } from "https://esm.sh/@supabase/supabase-js@2";

// CORS headers
const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'POST, GET, OPTIONS, PUT, DELETE',
};

// Status mapping: DB value -> display config
const STATUS_CONFIG: Record<string, { label: string; color: string; canAssign: boolean; canClose: boolean }> = {
  'Co-Host Requested': { label: 'Pending', color: 'yellow', canAssign: true, canClose: true },
  'Co-Host Selected': { label: 'Assigned', color: 'blue', canAssign: false, canClose: true },
  'Virtual Meeting Finished': { label: 'Meeting Done', color: 'green', canAssign: false, canClose: true },
  'Request closed': { label: 'Closed', color: 'gray', canAssign: false, canClose: false },
};

// Valid status values for transitions
const VALID_STATUSES = Object.keys(STATUS_CONFIG);

// Column name mapping: JavaScript key <-> Database column
const COLUMN_MAP = {
  // Request fields
  id: '_id',
  hostUserId: 'Host User',
  cohostUserId: 'Co-Host User',
  cohostSelectedOs: 'Co-Host selected (OS)',
  listingId: 'Listing',
  status: 'Status - Co-Host Request',
  subject: 'Subject',
  details: 'details submitted (optional)',
  requestNotes: 'Request notes',
  adminNotes: 'Admin Notes',
  rating: 'Rating ',
  ratingMessage: 'Rating message (optional)',
  virtualMeetingLink: 'virtual meeting link',
  meetingLink: 'Meeting link',
  googleMeetLink: 'Google Meet Link',
  datesAndTimesSuggested: 'Dates and times suggested',
  dateTimeSelected: 'Date and time selected',
  meetingDateTime: 'Meeting Date Time',
  showNotificationStatusChange: 'show notification status change',
  pending: 'pending',
  slackMessageTs: 'Slack Message TS',
  createdBy: 'Created By',
  createdDate: 'Created Date',
  modifiedDate: 'Modified Date',
};

// Select columns for request queries (with JOINs)
const REQUEST_SELECT_COLUMNS = `
  _id,
  "Host User",
  "Co-Host User",
  "Co-Host selected (OS)",
  "Listing",
  "Status - Co-Host Request",
  "Subject",
  "details submitted (optional)",
  "Request notes",
  "Admin Notes",
  "Rating ",
  "Rating message (optional)",
  "virtual meeting link",
  "Meeting link",
  "Google Meet Link",
  "Dates and times suggested",
  "Date and time selected",
  "Meeting Date Time",
  "show notification status change",
  "pending",
  "Slack Message TS",
  "Created By",
  "Created Date",
  "Modified Date"
`;

console.log("[co-host-requests] Edge Function initializing...");

Deno.serve(async (req: Request) => {
  try {
    console.log(`[co-host-requests] Request: ${req.method}`);

    // Handle CORS preflight
    if (req.method === 'OPTIONS') {
      return new Response(null, { status: 200, headers: corsHeaders });
    }

    // Parse request
    const body = await req.json();
    const action = body.action || 'unknown';
    const payload = body.payload || {};

    console.log(`[co-host-requests] Action: ${action}`);

    // Validate action
    const validActions = ['list', 'getById', 'updateStatus', 'assignCoHost', 'addNotes', 'getStatistics', 'getAvailableCoHosts'];

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
      case 'list':
        result = await handleList(payload, supabase);
        break;

      case 'getById':
        result = await handleGetById(payload, supabase);
        break;

      case 'updateStatus':
        result = await handleUpdateStatus(payload, supabase, user);
        break;

      case 'assignCoHost':
        result = await handleAssignCoHost(payload, supabase, user);
        break;

      case 'addNotes':
        result = await handleAddNotes(payload, supabase, user);
        break;

      case 'getStatistics':
        result = await handleGetStatistics(supabase);
        break;

      case 'getAvailableCoHosts':
        result = await handleGetAvailableCoHosts(payload, supabase);
        break;

      default:
        throw new Error(`Unhandled action: ${action}`);
    }

    console.log('[co-host-requests] Action completed successfully');

    return new Response(
      JSON.stringify({ success: true, data: result }),
      { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error) {
    console.error('[co-host-requests] Error:', error);
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
    console.error('[co-host-requests] Admin check failed:', error);
    return false;
  }

  return data['Toggle - Is Admin'] === true;
}

/**
 * Convert database row to JS object with friendly keys
 * Also enriches with joined data from host, cohost, and listing
 */
function toJsRequest(
  dbRow: Record<string, unknown>,
  hostData?: Record<string, unknown> | null,
  cohostData?: Record<string, unknown> | null,
  listingData?: Record<string, unknown> | null
): Record<string, unknown> {
  const status = dbRow['Status - Co-Host Request'] as string;
  const statusConfig = STATUS_CONFIG[status] || { label: status, color: 'gray', canAssign: false, canClose: false };

  return {
    id: dbRow._id,
    hostUserId: dbRow['Host User'],
    cohostUserId: dbRow['Co-Host User'],
    cohostSelectedOs: dbRow['Co-Host selected (OS)'],
    listingId: dbRow['Listing'],
    status: status,
    statusLabel: statusConfig.label,
    statusColor: statusConfig.color,
    canAssign: statusConfig.canAssign,
    canClose: statusConfig.canClose,
    subject: dbRow['Subject'],
    details: dbRow['details submitted (optional)'],
    requestNotes: dbRow['Request notes'],
    adminNotes: dbRow['Admin Notes'],
    rating: dbRow['Rating '],
    ratingMessage: dbRow['Rating message (optional)'],
    meetingLink: dbRow['Meeting link'] || dbRow['Google Meet Link'] || dbRow['virtual meeting link'],
    googleMeetLink: dbRow['Google Meet Link'],
    datesAndTimesSuggested: dbRow['Dates and times suggested'],
    dateTimeSelected: dbRow['Date and time selected'],
    meetingDateTime: dbRow['Meeting Date Time'],
    slackMessageTs: dbRow['Slack Message TS'],
    createdDate: dbRow['Created Date'],
    modifiedDate: dbRow['Modified Date'],
    // Joined data
    hostName: hostData ? `${hostData['Name - First'] || ''} ${hostData['Name - Last'] || ''}`.trim() || hostData['Name - Full'] || 'Unknown' : 'Unknown',
    hostEmail: hostData?.email || null,
    hostPhone: hostData?.['Phone Number (as text)'] || null,
    hostPhoto: hostData?.['Profile Photo'] || null,
    cohostName: cohostData ? `${cohostData['Name - First'] || ''} ${cohostData['Name - Last'] || ''}`.trim() || cohostData['Name - Full'] || null : null,
    cohostEmail: cohostData?.email || null,
    cohostPhoto: cohostData?.['Profile Photo'] || null,
    listingName: listingData?.['Name'] || null,
    listingBorough: listingData?.['Location - Borough'] || null,
  };
}

/**
 * Fetch related data for a list of requests
 */
async function enrichRequestsWithRelations(
  requests: Record<string, unknown>[],
  supabase: SupabaseClient
): Promise<Record<string, unknown>[]> {
  // Collect unique IDs
  const hostIds = new Set<string>();
  const cohostIds = new Set<string>();
  const listingIds = new Set<string>();

  for (const req of requests) {
    if (req['Host User']) hostIds.add(req['Host User'] as string);
    if (req['Co-Host User']) cohostIds.add(req['Co-Host User'] as string);
    if (req['Listing']) listingIds.add(req['Listing'] as string);
  }

  // Fetch all related data in parallel
  const [hostsResult, cohostsResult, listingsResult] = await Promise.all([
    hostIds.size > 0 ? supabase
      .from('user')
      .select('_id, email, "Name - Full", "Name - First", "Name - Last", "Phone Number (as text)", "Profile Photo"')
      .in('_id', Array.from(hostIds)) : { data: [] },
    cohostIds.size > 0 ? supabase
      .from('user')
      .select('_id, email, "Name - Full", "Name - First", "Name - Last", "Profile Photo"')
      .in('_id', Array.from(cohostIds)) : { data: [] },
    listingIds.size > 0 ? supabase
      .from('listing')
      .select('_id, "Name", "Location - Borough"')
      .in('_id', Array.from(listingIds)) : { data: [] },
  ]);

  // Create lookup maps
  const hostsMap = new Map((hostsResult.data || []).map(h => [h._id, h]));
  const cohostsMap = new Map((cohostsResult.data || []).map(c => [c._id, c]));
  const listingsMap = new Map((listingsResult.data || []).map(l => [l._id, l]));

  // Enrich requests
  return requests.map(req => toJsRequest(
    req,
    hostsMap.get(req['Host User'] as string),
    cohostsMap.get(req['Co-Host User'] as string),
    listingsMap.get(req['Listing'] as string)
  ));
}

// ===== ACTION HANDLERS =====

/**
 * List co-host requests with filtering, sorting, and pagination
 */
async function handleList(
  payload: {
    limit?: number;
    offset?: number;
    filters?: {
      status?: string;
      searchText?: string;
      dateRange?: { start: string; end: string };
    };
    sortField?: string;
    sortOrder?: 'asc' | 'desc';
  },
  supabase: SupabaseClient
) {
  const { limit = 25, offset = 0, filters = {}, sortField = 'Created Date', sortOrder = 'desc' } = payload;

  let query = supabase
    .from('co_hostrequest')
    .select(REQUEST_SELECT_COLUMNS, { count: 'exact' });

  // Apply filters
  if (filters.status) {
    query = query.eq('Status - Co-Host Request', filters.status);
  }

  if (filters.dateRange?.start) {
    query = query.gte('Created Date', filters.dateRange.start);
  }

  if (filters.dateRange?.end) {
    query = query.lte('Created Date', filters.dateRange.end);
  }

  // Apply sorting
  const dbSortField = sortField === 'createdDate' ? 'Created Date' :
                      sortField === 'modifiedDate' ? 'Modified Date' :
                      sortField === 'status' ? 'Status - Co-Host Request' :
                      sortField;

  query = query.order(dbSortField, { ascending: sortOrder === 'asc' });

  // Apply pagination
  query = query.range(offset, offset + limit - 1);

  const { data, error, count } = await query;

  if (error) {
    console.error('[co-host-requests] List error:', error);
    throw new Error(`Failed to fetch requests: ${error.message}`);
  }

  // Enrich with related data
  const enrichedRequests = await enrichRequestsWithRelations(data || [], supabase);

  // If there's search text, filter client-side after enrichment (to search across joined fields)
  let filteredRequests = enrichedRequests;
  if (filters.searchText) {
    const searchLower = filters.searchText.toLowerCase();
    filteredRequests = enrichedRequests.filter(req =>
      (req.hostName as string)?.toLowerCase().includes(searchLower) ||
      (req.hostEmail as string)?.toLowerCase().includes(searchLower) ||
      (req.cohostName as string)?.toLowerCase().includes(searchLower) ||
      (req.listingName as string)?.toLowerCase().includes(searchLower) ||
      (req.subject as string)?.toLowerCase().includes(searchLower) ||
      (req.details as string)?.toLowerCase().includes(searchLower)
    );
  }

  return {
    requests: filteredRequests,
    total: count || 0,
    limit,
    offset,
    statusConfig: STATUS_CONFIG,
  };
}

/**
 * Get a single co-host request by ID with full details
 */
async function handleGetById(
  payload: { requestId: string },
  supabase: SupabaseClient
) {
  const { requestId } = payload;

  if (!requestId) {
    throw new Error('requestId is required');
  }

  const { data, error } = await supabase
    .from('co_hostrequest')
    .select(REQUEST_SELECT_COLUMNS)
    .eq('_id', requestId)
    .single();

  if (error) {
    if (error.code === 'PGRST116') {
      throw new Error('Request not found');
    }
    console.error('[co-host-requests] Get by ID error:', error);
    throw new Error(`Failed to fetch request: ${error.message}`);
  }

  // Enrich with related data
  const [enriched] = await enrichRequestsWithRelations([data], supabase);

  return { request: enriched };
}

/**
 * Update the status of a co-host request
 */
async function handleUpdateStatus(
  payload: { requestId: string; newStatus: string; adminNotes?: string },
  supabase: SupabaseClient,
  adminUser: { id: string; email: string }
) {
  const { requestId, newStatus, adminNotes } = payload;

  if (!requestId) {
    throw new Error('requestId is required');
  }

  if (!newStatus || !VALID_STATUSES.includes(newStatus)) {
    throw new Error(`Invalid status. Must be one of: ${VALID_STATUSES.join(', ')}`);
  }

  const now = new Date().toISOString();

  const updateData: Record<string, unknown> = {
    'Status - Co-Host Request': newStatus,
    'Modified Date': now,
    'updated_at': now,
  };

  if (adminNotes !== undefined) {
    updateData['Admin Notes'] = adminNotes;
  }

  const { data, error } = await supabase
    .from('co_hostrequest')
    .update(updateData)
    .eq('_id', requestId)
    .select(REQUEST_SELECT_COLUMNS)
    .single();

  if (error) {
    console.error('[co-host-requests] Update status error:', error);
    throw new Error(`Failed to update status: ${error.message}`);
  }

  console.log('[co-host-requests] Status updated:', {
    requestId,
    newStatus,
    adminEmail: adminUser.email,
    timestamp: now,
  });

  const [enriched] = await enrichRequestsWithRelations([data], supabase);

  return { request: enriched };
}

/**
 * Assign a co-host user to a request
 */
async function handleAssignCoHost(
  payload: { requestId: string; cohostUserId: string },
  supabase: SupabaseClient,
  adminUser: { id: string; email: string }
) {
  const { requestId, cohostUserId } = payload;

  if (!requestId) {
    throw new Error('requestId is required');
  }

  if (!cohostUserId) {
    throw new Error('cohostUserId is required');
  }

  // Verify the co-host user exists
  const { data: cohostUser, error: cohostError } = await supabase
    .from('user')
    .select('_id, "Name - Full"')
    .eq('_id', cohostUserId)
    .single();

  if (cohostError || !cohostUser) {
    throw new Error('Co-host user not found');
  }

  const now = new Date().toISOString();

  const updateData: Record<string, unknown> = {
    'Co-Host User': cohostUserId,
    'Co-Host selected (OS)': cohostUser['Name - Full'] || 'Assigned',
    'Status - Co-Host Request': 'Co-Host Selected',
    'Modified Date': now,
    'updated_at': now,
  };

  const { data, error } = await supabase
    .from('co_hostrequest')
    .update(updateData)
    .eq('_id', requestId)
    .select(REQUEST_SELECT_COLUMNS)
    .single();

  if (error) {
    console.error('[co-host-requests] Assign co-host error:', error);
    throw new Error(`Failed to assign co-host: ${error.message}`);
  }

  console.log('[co-host-requests] Co-host assigned:', {
    requestId,
    cohostUserId,
    cohostName: cohostUser['Name - Full'],
    adminEmail: adminUser.email,
    timestamp: now,
  });

  const [enriched] = await enrichRequestsWithRelations([data], supabase);

  return { request: enriched };
}

/**
 * Add notes to a request
 */
async function handleAddNotes(
  payload: { requestId: string; adminNotes?: string; requestNotes?: string },
  supabase: SupabaseClient,
  adminUser: { id: string; email: string }
) {
  const { requestId, adminNotes, requestNotes } = payload;

  if (!requestId) {
    throw new Error('requestId is required');
  }

  if (adminNotes === undefined && requestNotes === undefined) {
    throw new Error('At least one of adminNotes or requestNotes is required');
  }

  const now = new Date().toISOString();

  const updateData: Record<string, unknown> = {
    'Modified Date': now,
    'updated_at': now,
  };

  if (adminNotes !== undefined) {
    updateData['Admin Notes'] = adminNotes;
  }

  if (requestNotes !== undefined) {
    updateData['Request notes'] = requestNotes;
  }

  const { data, error } = await supabase
    .from('co_hostrequest')
    .update(updateData)
    .eq('_id', requestId)
    .select(REQUEST_SELECT_COLUMNS)
    .single();

  if (error) {
    console.error('[co-host-requests] Add notes error:', error);
    throw new Error(`Failed to add notes: ${error.message}`);
  }

  console.log('[co-host-requests] Notes updated:', {
    requestId,
    adminEmail: adminUser.email,
    timestamp: now,
  });

  const [enriched] = await enrichRequestsWithRelations([data], supabase);

  return { request: enriched };
}

/**
 * Get statistics (counts by status)
 */
async function handleGetStatistics(supabase: SupabaseClient) {
  const { data, error } = await supabase
    .from('co_hostrequest')
    .select('"Status - Co-Host Request"');

  if (error) {
    console.error('[co-host-requests] Get statistics error:', error);
    throw new Error(`Failed to get statistics: ${error.message}`);
  }

  // Count by status
  const counts: Record<string, number> = {};
  for (const status of VALID_STATUSES) {
    counts[status] = 0;
  }

  for (const row of data || []) {
    const status = row['Status - Co-Host Request'];
    if (status in counts) {
      counts[status]++;
    } else {
      counts[status] = 1;
    }
  }

  // Add total
  const total = (data || []).length;

  return {
    counts,
    total,
    statusConfig: STATUS_CONFIG,
  };
}

/**
 * Get list of available co-hosts (users who can be assigned)
 */
async function handleGetAvailableCoHosts(
  payload: { searchText?: string; limit?: number },
  supabase: SupabaseClient
) {
  const { searchText, limit = 20 } = payload;

  let query = supabase
    .from('user')
    .select('_id, email, "Name - Full", "Name - First", "Name - Last", "Profile Photo"')
    .eq('Toggle - Is Admin', true) // Only admins can be co-hosts for now
    .order('Name - Full', { ascending: true })
    .limit(limit);

  if (searchText) {
    const searchLower = searchText.toLowerCase();
    query = query.or(`email.ilike.%${searchLower}%,"Name - Full".ilike.%${searchLower}%`);
  }

  const { data, error } = await query;

  if (error) {
    console.error('[co-host-requests] Get available co-hosts error:', error);
    throw new Error(`Failed to get co-hosts: ${error.message}`);
  }

  const cohosts = (data || []).map(user => ({
    id: user._id,
    email: user.email,
    name: `${user['Name - First'] || ''} ${user['Name - Last'] || ''}`.trim() || user['Name - Full'] || user.email,
    photo: user['Profile Photo'],
  }));

  return { cohosts };
}

console.log("[co-host-requests] Edge Function ready");
