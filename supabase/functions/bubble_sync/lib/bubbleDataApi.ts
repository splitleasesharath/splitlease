/**
 * Bubble Data API Client
 *
 * Handles direct CRUD operations on Bubble's database via the Data API.
 * Base URL: https://upgradefromstr.bubbleapps.io/api/1.1/obj
 *
 * Operations:
 * - POST /obj/{table}           → Create new thing
 * - PATCH /obj/{table}/{id}     → Update existing thing
 * - DELETE /obj/{table}/{id}    → Delete thing
 * - GET /obj/{table}/{id}       → Get single thing
 * - GET /obj/{table}            → Get list with pagination
 *
 * NO FALLBACK PRINCIPLE:
 * - Real response or throw
 * - No silent failures
 */

import { BubbleApiError } from '../../_shared/errors.ts';
import { getBubbleTableName } from './tableMapping.ts';
import { applyFieldMappingToBubble, BUBBLE_READ_ONLY_FIELDS, EXCLUDED_SYNC_FIELDS } from './fieldMapping.ts';
import { transformRecordForBubble } from './transformer.ts';

// ============================================================================
// TYPES
// ============================================================================

export interface BubbleDataApiConfig {
    baseUrl: string;        // e.g., 'https://upgradefromstr.bubbleapps.io/api/1.1'
    apiKey: string;
}

export interface BubbleApiRequest {
    method: 'GET' | 'POST' | 'PATCH' | 'DELETE';
    endpoint: string;
    fullUrl: string;
    headers: Record<string, string>;
    body?: Record<string, unknown>;
}

export interface BubbleCreateResponse {
    status: 'success';
    id: string;             // The Bubble _id of the created record
}

export interface BubbleUpdateResponse {
    status: 'success';
}

export interface BubbleDeleteResponse {
    status: 'success';
}

export interface BubbleGetResponse {
    response: Record<string, unknown>;
}

export interface BubbleListResponse {
    response: {
        results: Record<string, unknown>[];
        count: number;
        remaining: number;
    };
}

export type BubbleApiResponse =
    | BubbleCreateResponse
    | BubbleUpdateResponse
    | BubbleDeleteResponse
    | BubbleGetResponse
    | BubbleListResponse;

// ============================================================================
// REQUEST BUILDERS
// ============================================================================

/**
 * Build a CREATE (POST) request for Bubble Data API
 *
 * @param config - API configuration
 * @param supabaseTable - Supabase table name
 * @param data - Record data to create
 * @param fieldMapping - Optional custom field mapping
 * @returns Built request object
 */
export function buildCreateRequest(
    config: BubbleDataApiConfig,
    supabaseTable: string,
    data: Record<string, unknown>,
    fieldMapping?: Record<string, string>
): BubbleApiRequest {
    const bubbleTable = getBubbleTableName(supabaseTable);
    const endpoint = `/obj/${bubbleTable}`;
    const fullUrl = `${config.baseUrl}${endpoint}`;

    // Transform and map fields
    const transformedData = transformRecordForBubble(data, supabaseTable, fieldMapping);
    const mappedData = applyFieldMappingToBubble(transformedData, supabaseTable, fieldMapping);

    // Remove any read-only fields that might have slipped through
    for (const field of BUBBLE_READ_ONLY_FIELDS) {
        delete mappedData[field];
    }

    console.log('[BubbleDataApi] Building CREATE request');
    console.log('[BubbleDataApi] Table:', supabaseTable, '→', bubbleTable);
    console.log('[BubbleDataApi] Endpoint:', endpoint);
    console.log('[BubbleDataApi] Fields:', Object.keys(mappedData).length);

    return {
        method: 'POST',
        endpoint,
        fullUrl,
        headers: {
            'Authorization': `Bearer ${config.apiKey}`,
            'Content-Type': 'application/json',
        },
        body: mappedData,
    };
}

/**
 * Build an UPDATE (PATCH) request for Bubble Data API
 *
 * @param config - API configuration
 * @param supabaseTable - Supabase table name
 * @param bubbleId - The Bubble _id of the record to update
 * @param data - Record data to update
 * @param fieldMapping - Optional custom field mapping
 * @returns Built request object
 */
export function buildUpdateRequest(
    config: BubbleDataApiConfig,
    supabaseTable: string,
    bubbleId: string,
    data: Record<string, unknown>,
    fieldMapping?: Record<string, string>
): BubbleApiRequest {
    const bubbleTable = getBubbleTableName(supabaseTable);
    const endpoint = `/obj/${bubbleTable}/${bubbleId}`;
    const fullUrl = `${config.baseUrl}${endpoint}`;

    // Transform and map fields
    const transformedData = transformRecordForBubble(data, supabaseTable, fieldMapping);
    const mappedData = applyFieldMappingToBubble(transformedData, supabaseTable, fieldMapping);

    // Remove read-only fields
    for (const field of BUBBLE_READ_ONLY_FIELDS) {
        delete mappedData[field];
    }

    console.log('[BubbleDataApi] Building UPDATE request');
    console.log('[BubbleDataApi] Table:', supabaseTable, '→', bubbleTable);
    console.log('[BubbleDataApi] Bubble ID:', bubbleId);
    console.log('[BubbleDataApi] Endpoint:', endpoint);
    console.log('[BubbleDataApi] Fields:', Object.keys(mappedData).length);

    return {
        method: 'PATCH',
        endpoint,
        fullUrl,
        headers: {
            'Authorization': `Bearer ${config.apiKey}`,
            'Content-Type': 'application/json',
        },
        body: mappedData,
    };
}

/**
 * Build a DELETE request for Bubble Data API
 *
 * @param config - API configuration
 * @param supabaseTable - Supabase table name
 * @param bubbleId - The Bubble _id of the record to delete
 * @returns Built request object
 */
export function buildDeleteRequest(
    config: BubbleDataApiConfig,
    supabaseTable: string,
    bubbleId: string
): BubbleApiRequest {
    const bubbleTable = getBubbleTableName(supabaseTable);
    const endpoint = `/obj/${bubbleTable}/${bubbleId}`;
    const fullUrl = `${config.baseUrl}${endpoint}`;

    console.log('[BubbleDataApi] Building DELETE request');
    console.log('[BubbleDataApi] Table:', supabaseTable, '→', bubbleTable);
    console.log('[BubbleDataApi] Bubble ID:', bubbleId);
    console.log('[BubbleDataApi] Endpoint:', endpoint);

    return {
        method: 'DELETE',
        endpoint,
        fullUrl,
        headers: {
            'Authorization': `Bearer ${config.apiKey}`,
        },
    };
}

/**
 * Build a GET (single) request for Bubble Data API
 *
 * @param config - API configuration
 * @param supabaseTable - Supabase table name
 * @param bubbleId - The Bubble _id of the record to fetch
 * @returns Built request object
 */
export function buildGetRequest(
    config: BubbleDataApiConfig,
    supabaseTable: string,
    bubbleId: string
): BubbleApiRequest {
    const bubbleTable = getBubbleTableName(supabaseTable);
    const endpoint = `/obj/${bubbleTable}/${bubbleId}`;
    const fullUrl = `${config.baseUrl}${endpoint}`;

    console.log('[BubbleDataApi] Building GET request');
    console.log('[BubbleDataApi] Table:', supabaseTable, '→', bubbleTable);
    console.log('[BubbleDataApi] Bubble ID:', bubbleId);
    console.log('[BubbleDataApi] Endpoint:', endpoint);

    return {
        method: 'GET',
        endpoint,
        fullUrl,
        headers: {
            'Authorization': `Bearer ${config.apiKey}`,
        },
    };
}

// ============================================================================
// REQUEST EXECUTOR
// ============================================================================

/**
 * Execute a Bubble Data API request
 *
 * @param request - The built request object
 * @returns API response
 * @throws BubbleApiError on failure
 */
export async function executeRequest<T extends BubbleApiResponse>(
    request: BubbleApiRequest
): Promise<T> {
    console.log('[BubbleDataApi] ========== EXECUTING REQUEST ==========');
    console.log('[BubbleDataApi] Method:', request.method);
    console.log('[BubbleDataApi] URL:', request.fullUrl);
    if (request.body) {
        console.log('[BubbleDataApi] Body:', JSON.stringify(request.body, null, 2));
    }

    try {
        const fetchOptions: RequestInit = {
            method: request.method,
            headers: request.headers,
        };

        if (request.body) {
            fetchOptions.body = JSON.stringify(request.body);
        }

        const response = await fetch(request.fullUrl, fetchOptions);

        console.log('[BubbleDataApi] Response status:', response.status, response.statusText);

        if (!response.ok) {
            const errorText = await response.text();
            console.error('[BubbleDataApi] Error response:', errorText);

            throw new BubbleApiError(
                `Bubble Data API error: ${response.status} ${response.statusText} - ${errorText}`,
                response.status,
                errorText
            );
        }

        // Some successful operations return empty body
        const text = await response.text();
        if (!text) {
            console.log('[BubbleDataApi] Empty response body (success)');
            return { status: 'success' } as T;
        }

        const data = JSON.parse(text);
        console.log('[BubbleDataApi] Response:', JSON.stringify(data, null, 2));
        console.log('[BubbleDataApi] ========== REQUEST SUCCESS ==========');

        return data as T;

    } catch (error) {
        if (error instanceof BubbleApiError) {
            throw error;
        }

        console.error('[BubbleDataApi] ========== REQUEST ERROR ==========');
        console.error('[BubbleDataApi] Error:', error);

        throw new BubbleApiError(
            `Bubble Data API request failed: ${error.message}`,
            500,
            error
        );
    }
}

// ============================================================================
// HIGH-LEVEL OPERATIONS
// ============================================================================

/**
 * Create a new record in Bubble
 *
 * @param config - API configuration
 * @param supabaseTable - Supabase table name
 * @param data - Record data
 * @param fieldMapping - Optional field mapping
 * @returns The created record's Bubble _id
 */
export async function createRecord(
    config: BubbleDataApiConfig,
    supabaseTable: string,
    data: Record<string, unknown>,
    fieldMapping?: Record<string, string>
): Promise<string> {
    const request = buildCreateRequest(config, supabaseTable, data, fieldMapping);
    const response = await executeRequest<BubbleCreateResponse>(request);

    if (!response.id) {
        throw new BubbleApiError('Bubble create response missing id', 500, response);
    }

    console.log('[BubbleDataApi] Created record with Bubble ID:', response.id);
    return response.id;
}

/**
 * Update an existing record in Bubble
 *
 * @param config - API configuration
 * @param supabaseTable - Supabase table name
 * @param bubbleId - The Bubble _id
 * @param data - Record data to update
 * @param fieldMapping - Optional field mapping
 */
export async function updateRecord(
    config: BubbleDataApiConfig,
    supabaseTable: string,
    bubbleId: string,
    data: Record<string, unknown>,
    fieldMapping?: Record<string, string>
): Promise<void> {
    const request = buildUpdateRequest(config, supabaseTable, bubbleId, data, fieldMapping);
    await executeRequest<BubbleUpdateResponse>(request);
    console.log('[BubbleDataApi] Updated record:', bubbleId);
}

/**
 * Delete a record from Bubble
 *
 * @param config - API configuration
 * @param supabaseTable - Supabase table name
 * @param bubbleId - The Bubble _id
 */
export async function deleteRecord(
    config: BubbleDataApiConfig,
    supabaseTable: string,
    bubbleId: string
): Promise<void> {
    const request = buildDeleteRequest(config, supabaseTable, bubbleId);
    await executeRequest<BubbleDeleteResponse>(request);
    console.log('[BubbleDataApi] Deleted record:', bubbleId);
}

/**
 * Get a single record from Bubble
 *
 * @param config - API configuration
 * @param supabaseTable - Supabase table name
 * @param bubbleId - The Bubble _id
 * @returns The record data
 */
export async function getRecord(
    config: BubbleDataApiConfig,
    supabaseTable: string,
    bubbleId: string
): Promise<Record<string, unknown>> {
    const request = buildGetRequest(config, supabaseTable, bubbleId);
    const response = await executeRequest<BubbleGetResponse>(request);
    return response.response;
}

// ============================================================================
// UTILITY: REQUEST PREVIEW (FOR DEBUGGING)
// ============================================================================

/**
 * Generate a preview of what the API call will look like
 * Useful for debugging and documentation
 *
 * @param request - The built request
 * @returns Formatted string showing the request details
 */
export function previewRequest(request: BubbleApiRequest): string {
    const lines = [
        '═══════════════════════════════════════════════════════════════',
        'BUBBLE DATA API REQUEST PREVIEW',
        '═══════════════════════════════════════════════════════════════',
        '',
        `${request.method} ${request.fullUrl}`,
        '',
        '--- Headers ---',
        ...Object.entries(request.headers).map(([k, v]) =>
            `${k}: ${k === 'Authorization' ? 'Bearer [REDACTED]' : v}`
        ),
    ];

    if (request.body) {
        lines.push('', '--- Body ---', JSON.stringify(request.body, null, 2));
    }

    lines.push('', '═══════════════════════════════════════════════════════════════');

    return lines.join('\n');
}

/**
 * Generate curl command for the request (for manual testing)
 *
 * @param request - The built request
 * @param redactKey - Whether to redact the API key
 * @returns curl command string
 */
export function toCurlCommand(request: BubbleApiRequest, redactKey: boolean = true): string {
    const headers = Object.entries(request.headers)
        .map(([k, v]) => {
            const value = redactKey && k === 'Authorization' ? 'Bearer YOUR_API_KEY' : v;
            return `-H "${k}: ${value}"`;
        })
        .join(' \\\n  ');

    let cmd = `curl -X ${request.method} \\\n  "${request.fullUrl}" \\\n  ${headers}`;

    if (request.body) {
        const bodyJson = JSON.stringify(request.body);
        cmd += ` \\\n  -d '${bodyJson}'`;
    }

    return cmd;
}
