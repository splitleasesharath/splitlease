/**
 * Build Request Handler
 * Split Lease - bubble_sync/handlers
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
 *
 * @module bubble_sync/handlers/buildRequest
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

// ─────────────────────────────────────────────────────────────
// Constants
// ─────────────────────────────────────────────────────────────

const LOG_PREFIX = '[buildRequest]'
const REDACTED_AUTH = 'Bearer [REDACTED]'

const OPERATION_NOTES = Object.freeze({
    CREATE: Object.freeze([
        'POST creates a new record and returns { status: "success", id: "<bubble_id>" }',
        'The returned id should be stored as _id in Supabase',
    ]),
    UPDATE: Object.freeze([
        'PATCH updates existing record and returns { status: "success" }',
        'Only include fields that need to be updated',
    ]),
    DELETE: Object.freeze([
        'DELETE removes the record and returns { status: "success" }',
        'This cannot be undone',
    ]),
    GET: Object.freeze([
        'GET returns { response: { ...all_fields } }',
    ]),
}) as const

const OPERATIONS_REQUIRING_ID = Object.freeze(new Set(['UPDATE', 'DELETE', 'GET']))
const OPERATIONS_REQUIRING_DATA = Object.freeze(new Set(['CREATE', 'UPDATE']))

// ─────────────────────────────────────────────────────────────
// Types
// ─────────────────────────────────────────────────────────────

type OperationType = 'CREATE' | 'UPDATE' | 'DELETE' | 'GET'

export interface BuildRequestPayload {
    readonly operation: OperationType;
    readonly table_name: string;
    readonly bubble_id?: string;      // Required for UPDATE, DELETE, GET
    readonly data?: Readonly<Record<string, unknown>>;  // Required for CREATE, UPDATE
    readonly field_mapping?: Readonly<Record<string, string>>;
    readonly include_curl?: boolean;  // Include curl command in response
}

export interface BuildRequestResult {
    readonly request: {
        readonly method: string;
        readonly url: string;
        readonly endpoint: string;
        readonly headers: Readonly<Record<string, string>>;
        readonly body?: Readonly<Record<string, unknown>>;
    };
    readonly preview: string;
    readonly curl?: string;
    readonly notes: readonly string[];
}

// ─────────────────────────────────────────────────────────────
// Validation Predicates
// ─────────────────────────────────────────────────────────────

/**
 * Check if operation requires bubble_id
 * @pure
 */
const requiresBubbleId = (operation: OperationType): boolean =>
    OPERATIONS_REQUIRING_ID.has(operation)

/**
 * Check if operation requires data
 * @pure
 */
const requiresData = (operation: OperationType): boolean =>
    OPERATIONS_REQUIRING_DATA.has(operation)

/**
 * Check if operation is valid
 * @pure
 */
const isValidOperation = (operation: string): operation is OperationType =>
    operation in OPERATION_NOTES

// ─────────────────────────────────────────────────────────────
// Builders
// ─────────────────────────────────────────────────────────────

/**
 * Build general API notes
 * @pure
 */
const buildGeneralNotes = (baseUrl: string): readonly string[] =>
    Object.freeze([
        '',
        '--- API Notes ---',
        `Base URL: ${baseUrl}`,
        'Authorization: Bearer token required',
        'Read-only fields (_id, Created Date, Modified Date) are automatically excluded from body',
    ])

/**
 * Build redacted headers for display
 * @pure
 */
const buildRedactedHeaders = (headers: Readonly<Record<string, string>>): Readonly<Record<string, string>> =>
    Object.freeze({
        ...headers,
        Authorization: REDACTED_AUTH,
    })

/**
 * Build the result object
 * @pure
 */
const buildResult = (
    request: BubbleApiRequest,
    notes: readonly string[],
    includeCurl: boolean
): BuildRequestResult => {
    const result: BuildRequestResult = Object.freeze({
        request: Object.freeze({
            method: request.method,
            url: request.fullUrl,
            endpoint: request.endpoint,
            headers: buildRedactedHeaders(request.headers as Record<string, string>),
            body: request.body,
        }),
        preview: previewRequest(request),
        notes,
        ...(includeCurl ? { curl: toCurlCommand(request, true) } : {}),
    })
    return result
}

// ─────────────────────────────────────────────────────────────
// Main Handler
// ─────────────────────────────────────────────────────────────

/**
 * Build request handler - builds API request without executing
 * @effectful (console logging)
 */
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
    } = payload

    console.log(`${LOG_PREFIX} Building preview for: ${operation} ${table_name}`)

    // Validate inputs
    if (!operation) {
        throw new Error('operation is required (CREATE, UPDATE, DELETE, GET)')
    }

    if (!table_name) {
        throw new Error('table_name is required')
    }

    if (!isValidOperation(operation)) {
        throw new Error(`Unknown operation: ${operation}`)
    }

    if (requiresBubbleId(operation) && !bubble_id) {
        throw new Error(`bubble_id is required for ${operation} operation`)
    }

    if (requiresData(operation) && !data) {
        throw new Error(`data is required for ${operation} operation`)
    }

    // Build the request based on operation
    const request = buildRequestForOperation(config, operation, table_name, bubble_id, data, field_mapping)

    // Combine operation-specific notes with general notes
    const operationNotes = OPERATION_NOTES[operation]
    const generalNotes = buildGeneralNotes(config.baseUrl)
    const allNotes = Object.freeze([...operationNotes, ...generalNotes])

    console.log(`${LOG_PREFIX} Request built successfully`)

    return buildResult(request, allNotes, include_curl)
}

/**
 * Build request for specific operation
 * @pure (delegates to request builders)
 */
function buildRequestForOperation(
    config: BubbleDataApiConfig,
    operation: OperationType,
    tableName: string,
    bubbleId: string | undefined,
    data: Readonly<Record<string, unknown>> | undefined,
    fieldMapping: Readonly<Record<string, string>> | undefined
): BubbleApiRequest {
    switch (operation) {
        case 'CREATE':
            return buildCreateRequest(config, tableName, data!, fieldMapping as Record<string, string>)
        case 'UPDATE':
            return buildUpdateRequest(config, tableName, bubbleId!, data!, fieldMapping as Record<string, string>)
        case 'DELETE':
            return buildDeleteRequest(config, tableName, bubbleId!)
        case 'GET':
            return buildGetRequest(config, tableName, bubbleId!)
    }
}

// ─────────────────────────────────────────────────────────────
// Exported Test Constants
// ─────────────────────────────────────────────────────────────

/**
 * Exported for testing purposes
 * @test
 */
export const __test__ = Object.freeze({
    // Constants
    LOG_PREFIX,
    REDACTED_AUTH,
    OPERATION_NOTES,
    OPERATIONS_REQUIRING_ID,
    OPERATIONS_REQUIRING_DATA,

    // Predicates
    requiresBubbleId,
    requiresData,
    isValidOperation,

    // Builders
    buildGeneralNotes,
    buildRedactedHeaders,
    buildResult,
    buildRequestForOperation,
})
