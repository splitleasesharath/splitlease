/**
 * Build Request Handler
 *
 * Builds and returns API request details WITHOUT executing them.
 * Useful for debugging, documentation, and testing.
 *
 * Returns:
 * - Full URL
 * - HTTP method
 * - Headers
 * - Request body (JSON)
 * - cURL command for manual testing
 */

import {
    BubbleDataApiConfig,
    BubbleApiRequest,
    buildCreateRequest,
    buildUpdateRequest,
    buildDeleteRequest,
    buildGetRequest,
    previewRequest,
    toCurlCommand,
} from '../lib/bubbleDataApi.ts';

export interface BuildRequestPayload {
    operation: 'CREATE' | 'UPDATE' | 'DELETE' | 'GET';
    table_name: string;
    bubble_id?: string;      // Required for UPDATE, DELETE, GET
    data?: Record<string, unknown>;  // Required for CREATE, UPDATE
    field_mapping?: Record<string, string>;
    include_curl?: boolean;  // Include curl command in response
}

export interface BuildRequestResult {
    request: {
        method: string;
        url: string;
        endpoint: string;
        headers: Record<string, string>;
        body?: Record<string, unknown>;
    };
    preview: string;
    curl?: string;
    notes: string[];
}

export async function handleBuildRequest(
    config: BubbleDataApiConfig,
    payload: BuildRequestPayload
): Promise<BuildRequestResult> {
    const {
        operation,
        table_name,
        bubble_id,
        data,
        field_mapping,
        include_curl = true,
    } = payload;

    console.log('[buildRequest] Building preview for:', operation, table_name);

    // Validate inputs
    const notes: string[] = [];

    if (!operation) {
        throw new Error('operation is required (CREATE, UPDATE, DELETE, GET)');
    }

    if (!table_name) {
        throw new Error('table_name is required');
    }

    if ((operation === 'UPDATE' || operation === 'DELETE' || operation === 'GET') && !bubble_id) {
        throw new Error(`bubble_id is required for ${operation} operation`);
    }

    if ((operation === 'CREATE' || operation === 'UPDATE') && !data) {
        throw new Error(`data is required for ${operation} operation`);
    }

    // Build the request
    let request: BubbleApiRequest;

    switch (operation) {
        case 'CREATE':
            request = buildCreateRequest(config, table_name, data!, field_mapping);
            notes.push('POST creates a new record and returns { status: "success", id: "<bubble_id>" }');
            notes.push('The returned id should be stored as _id in Supabase');
            break;

        case 'UPDATE':
            request = buildUpdateRequest(config, table_name, bubble_id!, data!, field_mapping);
            notes.push('PATCH updates existing record and returns { status: "success" }');
            notes.push('Only include fields that need to be updated');
            break;

        case 'DELETE':
            request = buildDeleteRequest(config, table_name, bubble_id!);
            notes.push('DELETE removes the record and returns { status: "success" }');
            notes.push('This cannot be undone');
            break;

        case 'GET':
            request = buildGetRequest(config, table_name, bubble_id!);
            notes.push('GET returns { response: { ...all_fields } }');
            break;

        default:
            throw new Error(`Unknown operation: ${operation}`);
    }

    // Add general notes
    notes.push('');
    notes.push('--- API Notes ---');
    notes.push('Base URL: ' + config.baseUrl);
    notes.push('Authorization: Bearer token required');
    notes.push('Read-only fields (_id, Created Date, Modified Date) are automatically excluded from body');

    // Build result
    const result: BuildRequestResult = {
        request: {
            method: request.method,
            url: request.fullUrl,
            endpoint: request.endpoint,
            headers: {
                ...request.headers,
                Authorization: 'Bearer [REDACTED]',
            },
            body: request.body,
        },
        preview: previewRequest(request),
        notes,
    };

    if (include_curl) {
        result.curl = toCurlCommand(request, true);
    }

    console.log('[buildRequest] Request built successfully');

    return result;
}
