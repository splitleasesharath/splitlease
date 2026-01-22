/**
 * leases-admin Edge Function
 * Admin dashboard operations for lease management
 *
 * Actions:
 * - CRUD: list, get, updateStatus
 * - Delete: softDelete, hardDelete
 * - Bulk: bulkUpdateStatus, bulkSoftDelete, bulkExport
 * - Documents: uploadDocument, deleteDocument, listDocuments
 */

import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient, SupabaseClient } from "https://esm.sh/@supabase/supabase-js@2";

// CORS headers
const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'POST, GET, OPTIONS, PUT, DELETE',
};

console.log("[leases-admin] Edge Function initializing...");

Deno.serve(async (req: Request) => {
  try {
    console.log(`[leases-admin] Request: ${req.method}`);

    // Handle CORS preflight
    if (req.method === 'OPTIONS') {
      return new Response(null, { status: 200, headers: corsHeaders });
    }

    // Parse request
    const body = await req.json();
    const action = body.action || 'unknown';
    const payload = body.payload || {};

    console.log(`[leases-admin] Action: ${action}`);

    // Validate action
    const validActions = [
      'list', 'get', 'updateStatus',
      'softDelete', 'hardDelete',
      'bulkUpdateStatus', 'bulkSoftDelete', 'bulkExport',
      'uploadDocument', 'deleteDocument', 'listDocuments'
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

    // TODO: Add admin role check here
    // For now, any authenticated user can access (should be behind /_internal route)

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

      case 'updateStatus':
        result = await handleUpdateStatus(payload, supabase);
        break;

      case 'softDelete':
        result = await handleSoftDelete(payload, supabase);
        break;

      case 'hardDelete':
        result = await handleHardDelete(payload, supabase);
        break;

      case 'bulkUpdateStatus':
        result = await handleBulkUpdateStatus(payload, supabase);
        break;

      case 'bulkSoftDelete':
        result = await handleBulkSoftDelete(payload, supabase);
        break;

      case 'bulkExport':
        result = await handleBulkExport(payload, supabase);
        break;

      case 'uploadDocument':
        result = await handleUploadDocument(payload, supabase);
        break;

      case 'deleteDocument':
        result = await handleDeleteDocument(payload, supabase);
        break;

      case 'listDocuments':
        result = await handleListDocuments(payload, supabase);
        break;

      default:
        throw new Error(`Unhandled action: ${action}`);
    }

    console.log('[leases-admin] Action completed successfully');

    return new Response(
      JSON.stringify({ success: true, data: result }),
      { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error) {
    console.error('[leases-admin] Error:', error);
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

// ===== ACTION HANDLERS =====

/**
 * List leases with optional pagination
 */
async function handleList(
  payload: { limit?: number; offset?: number },
  supabase: SupabaseClient
) {
  const { limit = 500, offset = 0 } = payload;

  const { data, error, count } = await supabase
    .from('bookings_leases')
    .select(`
      *,
      guest:Guest(
        _id,
        email,
        "First Name",
        "Last Name",
        Phone
      ),
      host:Host(
        _id,
        email,
        "First Name",
        "Last Name"
      ),
      listing:Listing(
        _id,
        "Listing Title",
        Address,
        Neighborhood,
        City,
        State,
        "Zip Code"
      )
    `, { count: 'exact' })
    .order('Created Date', { ascending: false })
    .range(offset, offset + limit - 1);

  if (error) {
    console.error('[leases-admin] List error:', error);
    throw new Error(`Failed to fetch leases: ${error.message}`);
  }

  // Fetch stays separately (since JSONB join is complex)
  const leaseIds = (data || []).map((l: { _id: string }) => l._id);

  let staysMap: Record<string, unknown[]> = {};

  if (leaseIds.length > 0) {
    const { data: stays, error: staysError } = await supabase
      .from('bookings_stays')
      .select('*')
      .in('Lease', leaseIds);

    if (!staysError && stays) {
      // Group stays by lease ID
      staysMap = stays.reduce((acc: Record<string, unknown[]>, stay: { Lease: string }) => {
        const leaseId = stay.Lease;
        if (!acc[leaseId]) acc[leaseId] = [];
        acc[leaseId].push(stay);
        return acc;
      }, {});
    }
  }

  // Attach stays to leases
  const leasesWithStays = (data || []).map((lease: { _id: string }) => ({
    ...lease,
    stays: staysMap[lease._id] || [],
  }));

  return leasesWithStays;
}

/**
 * Get a single lease with full details
 */
async function handleGet(
  payload: { leaseId: string },
  supabase: SupabaseClient
) {
  const { leaseId } = payload;

  if (!leaseId) {
    throw new Error('leaseId is required');
  }

  const { data, error } = await supabase
    .from('bookings_leases')
    .select(`
      *,
      guest:Guest(*),
      host:Host(*),
      listing:Listing(*),
      proposal:Proposal(*)
    `)
    .eq('_id', leaseId)
    .single();

  if (error) {
    throw new Error(`Failed to fetch lease: ${error.message}`);
  }

  // Fetch stays
  const { data: stays } = await supabase
    .from('bookings_stays')
    .select('*')
    .eq('Lease', leaseId);

  return { ...data, stays: stays || [] };
}

/**
 * Update lease status
 */
async function handleUpdateStatus(
  payload: { leaseId: string; status: string },
  supabase: SupabaseClient
) {
  const { leaseId, status } = payload;

  if (!leaseId || !status) {
    throw new Error('leaseId and status are required');
  }

  const validStatuses = ['active', 'completed', 'cancelled', 'pending', 'draft'];
  if (!validStatuses.includes(status.toLowerCase())) {
    throw new Error(`Invalid status: ${status}`);
  }

  // Capitalize status for Bubble compatibility
  const bubbleStatus = status.charAt(0).toUpperCase() + status.slice(1).toLowerCase();

  const { data, error } = await supabase
    .from('bookings_leases')
    .update({
      'Lease Status': bubbleStatus,
      'Modified Date': new Date().toISOString(),
    })
    .eq('_id', leaseId)
    .select()
    .single();

  if (error) {
    throw new Error(`Failed to update status: ${error.message}`);
  }

  return data;
}

/**
 * Soft delete - set status to cancelled
 */
async function handleSoftDelete(
  payload: { leaseId: string },
  supabase: SupabaseClient
) {
  const { leaseId } = payload;

  if (!leaseId) {
    throw new Error('leaseId is required');
  }

  const { data, error } = await supabase
    .from('bookings_leases')
    .update({
      'Lease Status': 'Cancelled',
      'Modified Date': new Date().toISOString(),
    })
    .eq('_id', leaseId)
    .select()
    .single();

  if (error) {
    throw new Error(`Failed to cancel lease: ${error.message}`);
  }

  return data;
}

/**
 * Hard delete - permanently remove record
 * WARNING: This is destructive and cannot be undone
 */
async function handleHardDelete(
  payload: { leaseId: string; confirmationToken?: string },
  supabase: SupabaseClient
) {
  const { leaseId } = payload;

  if (!leaseId) {
    throw new Error('leaseId is required');
  }

  // Verify lease is cancelled before hard delete
  const { data: lease, error: fetchError } = await supabase
    .from('bookings_leases')
    .select('_id, "Lease Status"')
    .eq('_id', leaseId)
    .single();

  if (fetchError || !lease) {
    throw new Error('Lease not found');
  }

  if (lease['Lease Status']?.toLowerCase() !== 'cancelled') {
    throw new Error('Only cancelled leases can be permanently deleted');
  }

  // Delete associated stays first
  const { error: staysError } = await supabase
    .from('bookings_stays')
    .delete()
    .eq('Lease', leaseId);

  if (staysError) {
    console.error('[leases-admin] Failed to delete stays:', staysError);
    // Continue anyway - orphaned stays are acceptable
  }

  // Delete the lease
  const { error: deleteError } = await supabase
    .from('bookings_leases')
    .delete()
    .eq('_id', leaseId);

  if (deleteError) {
    throw new Error(`Failed to delete lease: ${deleteError.message}`);
  }

  return { deleted: true, leaseId };
}

/**
 * Bulk update status for multiple leases
 */
async function handleBulkUpdateStatus(
  payload: { leaseIds: string[]; status: string },
  supabase: SupabaseClient
) {
  const { leaseIds, status } = payload;

  if (!leaseIds || !Array.isArray(leaseIds) || leaseIds.length === 0) {
    throw new Error('leaseIds array is required');
  }

  if (!status) {
    throw new Error('status is required');
  }

  const bubbleStatus = status.charAt(0).toUpperCase() + status.slice(1).toLowerCase();

  const { data, error } = await supabase
    .from('bookings_leases')
    .update({
      'Lease Status': bubbleStatus,
      'Modified Date': new Date().toISOString(),
    })
    .in('_id', leaseIds)
    .select();

  if (error) {
    throw new Error(`Failed to bulk update: ${error.message}`);
  }

  return { updated: data?.length || 0, leaseIds };
}

/**
 * Bulk soft delete (cancel) multiple leases
 */
async function handleBulkSoftDelete(
  payload: { leaseIds: string[] },
  supabase: SupabaseClient
) {
  const { leaseIds } = payload;

  if (!leaseIds || !Array.isArray(leaseIds) || leaseIds.length === 0) {
    throw new Error('leaseIds array is required');
  }

  const { data, error } = await supabase
    .from('bookings_leases')
    .update({
      'Lease Status': 'Cancelled',
      'Modified Date': new Date().toISOString(),
    })
    .in('_id', leaseIds)
    .select();

  if (error) {
    throw new Error(`Failed to bulk cancel: ${error.message}`);
  }

  return { cancelled: data?.length || 0, leaseIds };
}

/**
 * Export selected leases as CSV or JSON
 */
async function handleBulkExport(
  payload: { leaseIds: string[]; format?: 'csv' | 'json' },
  supabase: SupabaseClient
) {
  const { leaseIds, format = 'csv' } = payload;

  if (!leaseIds || !Array.isArray(leaseIds) || leaseIds.length === 0) {
    throw new Error('leaseIds array is required');
  }

  const { data, error } = await supabase
    .from('bookings_leases')
    .select(`
      _id,
      "Agreement Number",
      "Lease Status",
      "Reservation Period : Start",
      "Reservation Period : End",
      "Total Rent",
      "Total Compensation",
      "Paid to Date from Guest",
      "Created Date",
      guest:Guest(email, "First Name", "Last Name"),
      host:Host(email, "First Name", "Last Name"),
      listing:Listing("Listing Title", Address)
    `)
    .in('_id', leaseIds);

  if (error) {
    throw new Error(`Failed to fetch leases for export: ${error.message}`);
  }

  if (format === 'json') {
    return { content: JSON.stringify(data, null, 2), format: 'json' };
  }

  // Generate CSV
  const headers = [
    'ID', 'Agreement Number', 'Status', 'Start Date', 'End Date',
    'Total Rent', 'Paid to Date', 'Guest Email', 'Guest Name',
    'Host Email', 'Host Name', 'Listing', 'Address', 'Created Date'
  ];

  const rows = (data || []).map((lease: Record<string, unknown>) => {
    const guest = lease.guest as Record<string, string> | null;
    const host = lease.host as Record<string, string> | null;
    const listing = lease.listing as Record<string, string> | null;

    return [
      lease._id,
      lease['Agreement Number'] || '',
      lease['Lease Status'] || '',
      lease['Reservation Period : Start'] || '',
      lease['Reservation Period : End'] || '',
      lease['Total Rent'] || 0,
      lease['Paid to Date from Guest'] || 0,
      guest?.email || '',
      `${guest?.['First Name'] || ''} ${guest?.['Last Name'] || ''}`.trim(),
      host?.email || '',
      `${host?.['First Name'] || ''} ${host?.['Last Name'] || ''}`.trim(),
      listing?.['Listing Title'] || '',
      listing?.Address || '',
      lease['Created Date'] || '',
    ].map(v => `"${String(v).replace(/"/g, '""')}"`).join(',');
  });

  const csv = [headers.join(','), ...rows].join('\n');

  return { content: csv, format: 'csv' };
}

// ===== DOCUMENT HANDLERS (Placeholder - needs Supabase Storage bucket) =====

async function handleUploadDocument(
  payload: { leaseId: string; fileName: string; fileType: string; fileBase64: string },
  supabase: SupabaseClient
) {
  const { leaseId, fileName, fileType, fileBase64 } = payload;

  if (!leaseId || !fileName || !fileBase64) {
    throw new Error('leaseId, fileName, and fileBase64 are required');
  }

  // Decode base64
  const fileData = Uint8Array.from(atob(fileBase64), c => c.charCodeAt(0));

  // Upload to storage
  const filePath = `leases/${leaseId}/${Date.now()}-${fileName}`;

  const { data, error } = await supabase.storage
    .from('lease-documents')
    .upload(filePath, fileData, {
      contentType: fileType || 'application/octet-stream',
      upsert: false,
    });

  if (error) {
    throw new Error(`Failed to upload document: ${error.message}`);
  }

  // Get public URL
  const { data: { publicUrl } } = supabase.storage
    .from('lease-documents')
    .getPublicUrl(filePath);

  return {
    path: data.path,
    publicUrl,
    fileName,
    uploadedAt: new Date().toISOString(),
  };
}

async function handleDeleteDocument(
  payload: { leaseId: string; documentPath: string },
  supabase: SupabaseClient
) {
  const { documentPath } = payload;

  if (!documentPath) {
    throw new Error('documentPath is required');
  }

  const { error } = await supabase.storage
    .from('lease-documents')
    .remove([documentPath]);

  if (error) {
    throw new Error(`Failed to delete document: ${error.message}`);
  }

  return { deleted: true, path: documentPath };
}

async function handleListDocuments(
  payload: { leaseId: string },
  supabase: SupabaseClient
) {
  const { leaseId } = payload;

  if (!leaseId) {
    throw new Error('leaseId is required');
  }

  const { data, error } = await supabase.storage
    .from('lease-documents')
    .list(`leases/${leaseId}`);

  if (error) {
    throw new Error(`Failed to list documents: ${error.message}`);
  }

  // Get public URLs for each document
  const documents = (data || []).map((file: { name: string; created_at: string; metadata?: { size: number } }) => {
    const filePath = `leases/${leaseId}/${file.name}`;
    const { data: { publicUrl } } = supabase.storage
      .from('lease-documents')
      .getPublicUrl(filePath);

    return {
      name: file.name,
      path: filePath,
      publicUrl,
      createdAt: file.created_at,
      size: file.metadata?.size || 0,
    };
  });

  return documents;
}

console.log("[leases-admin] Edge Function ready");
