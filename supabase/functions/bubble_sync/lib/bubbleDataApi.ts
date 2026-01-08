/**
 * Bubble Data API Client
 * Split Lease - bubble_sync/lib
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
 *
 * @module bubble_sync/lib/bubbleDataApi
 */

import { BubbleApiError } from '../../_shared/errors.ts';
import { getBubbleTableName } from './tableMapping.ts';
import { applyFieldMappingToBubble, BUBBLE_READ_ONLY_FIELDS } from './fieldMapping.ts';
import { transformRecordForBubble } from './transformer.ts';

// ─────────────────────────────────────────────────────────────
// Constants
// ─────────────────────────────────────────────────────────────

const LOG_PREFIX = '[BubbleDataApi]'
const HTTP_OK_MIN = 200
const HTTP_OK_MAX = 299
const AUTHORIZATION_HEADER = 'Authorization'
const CONTENT_TYPE_HEADER = 'Content-Type'
const CONTENT_TYPE_JSON = 'application/json'
const BEARER_PREFIX = 'Bearer '
const REDACTED_KEY = '[REDACTED]'
const YOUR_API_KEY_PLACEHOLDER = 'YOUR_API_KEY'

// ─────────────────────────────────────────────────────────────
// Types
// ─────────────────────────────────────────────────────────────

export interface BubbleDataApiConfig {
    readonly baseUrl: string;        // e.g., 'https://upgradefromstr.bubbleapps.io/api/1.1'
    readonly apiKey: string;
}

export interface BubbleApiRequest {
    readonly method: 'GET' | 'POST' | 'PATCH' | 'DELETE';
    readonly endpoint: string;
    readonly fullUrl: string;
    readonly headers: Readonly<Record<string, string>>;
    readonly body?: Readonly<Record<string, unknown>>;
}

export interface BubbleCreateResponse {
    readonly status: 'success';
    readonly id: string;             // The Bubble _id of the created record
}

export interface BubbleUpdateResponse {
    readonly status: 'success';
}

export interface BubbleDeleteResponse {
    readonly status: 'success';
}

export interface BubbleGetResponse {
    readonly response: Readonly<Record<string, unknown>>;
}

export interface BubbleListResponse {
    readonly response: {
        readonly results: readonly Readonly<Record<string, unknown>>[];
        readonly count: number;
        readonly remaining: number;
    };
}

export type BubbleApiResponse =
    | BubbleCreateResponse
    | BubbleUpdateResponse
    | BubbleDeleteResponse
    | BubbleGetResponse
    | BubbleListResponse;

// ─────────────────────────────────────────────────────────────
// Validation Predicates
// ─────────────────────────────────────────────────────────────

/**
 * Check if HTTP response is successful
 * @pure
 */
const isSuccessResponse = (response: Response): boolean =>
    response.ok

/**
 * Check if response has body content
 * @pure
 */
const hasResponseBody = (text: string): boolean =>
    Boolean(text && text.length > 0)

/**
 * Check if response has id field
 * @pure
 */
const hasResponseId = (response: BubbleCreateResponse): boolean =>
    Boolean(response.id)

/**
 * Check if header is authorization header
 * @pure
 */
const isAuthorizationHeader = (headerName: string): boolean =>
    headerName === AUTHORIZATION_HEADER

// ─────────────────────────────────────────────────────────────
// URL Builders
// ─────────────────────────────────────────────────────────────

/**
 * Build object endpoint URL
 * @pure
 */
const buildObjectEndpoint = (bubbleTable: string): string =>
    `/obj/${bubbleTable}`

/**
 * Build object endpoint URL with ID
 * @pure
 */
const buildObjectEndpointWithId = (bubbleTable: string, bubbleId: string): string =>
    `/obj/${bubbleTable}/${bubbleId}`

/**
 * Build full URL from base and endpoint
 * @pure
 */
const buildFullUrl = (baseUrl: string, endpoint: string): string =>
    `${baseUrl}${endpoint}`

// ─────────────────────────────────────────────────────────────
// Header Builders
// ─────────────────────────────────────────────────────────────

/**
 * Build authorization header value
 * @pure
 */
const buildAuthorizationValue = (apiKey: string): string =>
    `${BEARER_PREFIX}${apiKey}`

/**
 * Build headers with authorization only
 * @pure
 */
const buildAuthOnlyHeaders = (apiKey: string): Readonly<Record<string, string>> =>
    Object.freeze({
        [AUTHORIZATION_HEADER]: buildAuthorizationValue(apiKey),
    })

/**
 * Build headers with authorization and content type
 * @pure
 */
const buildJsonHeaders = (apiKey: string): Readonly<Record<string, string>> =>
    Object.freeze({
        [AUTHORIZATION_HEADER]: buildAuthorizationValue(apiKey),
        [CONTENT_TYPE_HEADER]: CONTENT_TYPE_JSON,
    })

// ─────────────────────────────────────────────────────────────
// Data Transformers
// ─────────────────────────────────────────────────────────────

/**
 * Remove read-only fields from data object
 * @pure
 */
const removeReadOnlyFields = (data: Record<string, unknown>): Record<string, unknown> => {
    const result: Record<string, unknown> = {}
    for (const [key, value] of Object.entries(data)) {
        if (!BUBBLE_READ_ONLY_FIELDS.has(key)) {
            result[key] = value
        }
    }
    return result
}

/**
 * Transform and map data for Bubble
 * @pure (with logging side effect)
 */
const prepareDataForBubble = (
    data: Record<string, unknown>,
    supabaseTable: string,
    fieldMapping?: Record<string, string>
): Record<string, unknown> => {
    const transformedData = transformRecordForBubble(data, supabaseTable, fieldMapping)
    const mappedData = applyFieldMappingToBubble(transformedData, supabaseTable, fieldMapping)
    return removeReadOnlyFields(mappedData)
}

// ─────────────────────────────────────────────────────────────
// Request Builders
// ─────────────────────────────────────────────────────────────

/**
 * Build a CREATE (POST) request for Bubble Data API
 * @pure (with logging side effect)
 */
export function buildCreateRequest(
    config: BubbleDataApiConfig,
    supabaseTable: string,
    data: Record<string, unknown>,
    fieldMapping?: Record<string, string>
): BubbleApiRequest {
    const bubbleTable = getBubbleTableName(supabaseTable)
    const endpoint = buildObjectEndpoint(bubbleTable)
    const fullUrl = buildFullUrl(config.baseUrl, endpoint)
    const body = prepareDataForBubble(data, supabaseTable, fieldMapping)

    console.log(`${LOG_PREFIX} Building CREATE request`)
    console.log(`${LOG_PREFIX} Table: ${supabaseTable} → ${bubbleTable}`)
    console.log(`${LOG_PREFIX} Endpoint: ${endpoint}`)
    console.log(`${LOG_PREFIX} Fields: ${Object.keys(body).length}`)

    return Object.freeze({
        method: 'POST',
        endpoint,
        fullUrl,
        headers: buildJsonHeaders(config.apiKey),
        body: Object.freeze(body),
    })
}

/**
 * Build an UPDATE (PATCH) request for Bubble Data API
 * @pure (with logging side effect)
 */
export function buildUpdateRequest(
    config: BubbleDataApiConfig,
    supabaseTable: string,
    bubbleId: string,
    data: Record<string, unknown>,
    fieldMapping?: Record<string, string>
): BubbleApiRequest {
    const bubbleTable = getBubbleTableName(supabaseTable)
    const endpoint = buildObjectEndpointWithId(bubbleTable, bubbleId)
    const fullUrl = buildFullUrl(config.baseUrl, endpoint)
    const body = prepareDataForBubble(data, supabaseTable, fieldMapping)

    console.log(`${LOG_PREFIX} Building UPDATE request`)
    console.log(`${LOG_PREFIX} Table: ${supabaseTable} → ${bubbleTable}`)
    console.log(`${LOG_PREFIX} Bubble ID: ${bubbleId}`)
    console.log(`${LOG_PREFIX} Endpoint: ${endpoint}`)
    console.log(`${LOG_PREFIX} Fields: ${Object.keys(body).length}`)

    return Object.freeze({
        method: 'PATCH',
        endpoint,
        fullUrl,
        headers: buildJsonHeaders(config.apiKey),
        body: Object.freeze(body),
    })
}

/**
 * Build a DELETE request for Bubble Data API
 * @pure (with logging side effect)
 */
export function buildDeleteRequest(
    config: BubbleDataApiConfig,
    supabaseTable: string,
    bubbleId: string
): BubbleApiRequest {
    const bubbleTable = getBubbleTableName(supabaseTable)
    const endpoint = buildObjectEndpointWithId(bubbleTable, bubbleId)
    const fullUrl = buildFullUrl(config.baseUrl, endpoint)

    console.log(`${LOG_PREFIX} Building DELETE request`)
    console.log(`${LOG_PREFIX} Table: ${supabaseTable} → ${bubbleTable}`)
    console.log(`${LOG_PREFIX} Bubble ID: ${bubbleId}`)
    console.log(`${LOG_PREFIX} Endpoint: ${endpoint}`)

    return Object.freeze({
        method: 'DELETE',
        endpoint,
        fullUrl,
        headers: buildAuthOnlyHeaders(config.apiKey),
    })
}

/**
 * Build a GET (single) request for Bubble Data API
 * @pure (with logging side effect)
 */
export function buildGetRequest(
    config: BubbleDataApiConfig,
    supabaseTable: string,
    bubbleId: string
): BubbleApiRequest {
    const bubbleTable = getBubbleTableName(supabaseTable)
    const endpoint = buildObjectEndpointWithId(bubbleTable, bubbleId)
    const fullUrl = buildFullUrl(config.baseUrl, endpoint)

    console.log(`${LOG_PREFIX} Building GET request`)
    console.log(`${LOG_PREFIX} Table: ${supabaseTable} → ${bubbleTable}`)
    console.log(`${LOG_PREFIX} Bubble ID: ${bubbleId}`)
    console.log(`${LOG_PREFIX} Endpoint: ${endpoint}`)

    return Object.freeze({
        method: 'GET',
        endpoint,
        fullUrl,
        headers: buildAuthOnlyHeaders(config.apiKey),
    })
}

// ─────────────────────────────────────────────────────────────
// Response Builders
// ─────────────────────────────────────────────────────────────

/**
 * Build success response for empty body
 * @pure
 */
const buildEmptySuccessResponse = <T extends BubbleApiResponse>(): T =>
    Object.freeze({ status: 'success' }) as T

// ─────────────────────────────────────────────────────────────
// Request Executor
// ─────────────────────────────────────────────────────────────

/**
 * Execute a Bubble Data API request
 * @effectful (HTTP request, console logging)
 */
export async function executeRequest<T extends BubbleApiResponse>(
    request: BubbleApiRequest
): Promise<T> {
    console.log(`${LOG_PREFIX} ========== EXECUTING REQUEST ==========`)
    console.log(`${LOG_PREFIX} Method: ${request.method}`)
    console.log(`${LOG_PREFIX} URL: ${request.fullUrl}`)
    if (request.body) {
        console.log(`${LOG_PREFIX} Body:`, JSON.stringify(request.body, null, 2))
    }

    try {
        const fetchOptions: RequestInit = {
            method: request.method,
            headers: request.headers as Record<string, string>,
        }

        if (request.body) {
            fetchOptions.body = JSON.stringify(request.body)
        }

        const response = await fetch(request.fullUrl, fetchOptions)

        console.log(`${LOG_PREFIX} Response status: ${response.status} ${response.statusText}`)

        if (!isSuccessResponse(response)) {
            const errorText = await response.text()
            console.error(`${LOG_PREFIX} Error response:`, errorText)

            throw new BubbleApiError(
                `Bubble Data API error: ${response.status} ${response.statusText} - ${errorText}`,
                response.status,
                errorText
            )
        }

        // Some successful operations return empty body
        const text = await response.text()
        if (!hasResponseBody(text)) {
            console.log(`${LOG_PREFIX} Empty response body (success)`)
            return buildEmptySuccessResponse<T>()
        }

        const data = JSON.parse(text)
        console.log(`${LOG_PREFIX} Response:`, JSON.stringify(data, null, 2))
        console.log(`${LOG_PREFIX} ========== REQUEST SUCCESS ==========`)

        return data as T

    } catch (error) {
        if (error instanceof BubbleApiError) {
            throw error
        }

        console.error(`${LOG_PREFIX} ========== REQUEST ERROR ==========`)
        console.error(`${LOG_PREFIX} Error:`, error)

        throw new BubbleApiError(
            `Bubble Data API request failed: ${(error as Error).message}`,
            500,
            error
        )
    }
}

// ─────────────────────────────────────────────────────────────
// High-Level Operations
// ─────────────────────────────────────────────────────────────

/**
 * Create a new record in Bubble
 * @effectful (HTTP request, console logging)
 */
export async function createRecord(
    config: BubbleDataApiConfig,
    supabaseTable: string,
    data: Record<string, unknown>,
    fieldMapping?: Record<string, string>
): Promise<string> {
    const request = buildCreateRequest(config, supabaseTable, data, fieldMapping)
    const response = await executeRequest<BubbleCreateResponse>(request)

    if (!hasResponseId(response)) {
        throw new BubbleApiError('Bubble create response missing id', 500, response)
    }

    console.log(`${LOG_PREFIX} Created record with Bubble ID: ${response.id}`)
    return response.id
}

/**
 * Update an existing record in Bubble
 * @effectful (HTTP request, console logging)
 */
export async function updateRecord(
    config: BubbleDataApiConfig,
    supabaseTable: string,
    bubbleId: string,
    data: Record<string, unknown>,
    fieldMapping?: Record<string, string>
): Promise<void> {
    const request = buildUpdateRequest(config, supabaseTable, bubbleId, data, fieldMapping)
    await executeRequest<BubbleUpdateResponse>(request)
    console.log(`${LOG_PREFIX} Updated record: ${bubbleId}`)
}

/**
 * Delete a record from Bubble
 * @effectful (HTTP request, console logging)
 */
export async function deleteRecord(
    config: BubbleDataApiConfig,
    supabaseTable: string,
    bubbleId: string
): Promise<void> {
    const request = buildDeleteRequest(config, supabaseTable, bubbleId)
    await executeRequest<BubbleDeleteResponse>(request)
    console.log(`${LOG_PREFIX} Deleted record: ${bubbleId}`)
}

/**
 * Get a single record from Bubble
 * @effectful (HTTP request, console logging)
 */
export async function getRecord(
    config: BubbleDataApiConfig,
    supabaseTable: string,
    bubbleId: string
): Promise<Record<string, unknown>> {
    const request = buildGetRequest(config, supabaseTable, bubbleId)
    const response = await executeRequest<BubbleGetResponse>(request)
    return response.response
}

// ─────────────────────────────────────────────────────────────
// Preview Utilities (for debugging)
// ─────────────────────────────────────────────────────────────

/**
 * Build redacted header value for display
 * @pure
 */
const buildRedactedHeaderValue = (key: string, value: string): string =>
    isAuthorizationHeader(key) ? `${BEARER_PREFIX}${REDACTED_KEY}` : value

/**
 * Build header display line
 * @pure
 */
const buildHeaderDisplayLine = (key: string, value: string): string =>
    `${key}: ${buildRedactedHeaderValue(key, value)}`

/**
 * Build curl header flag
 * @pure
 */
const buildCurlHeaderFlag = (key: string, value: string, redactKey: boolean): string => {
    const displayValue = redactKey && isAuthorizationHeader(key)
        ? `${BEARER_PREFIX}${YOUR_API_KEY_PLACEHOLDER}`
        : value
    return `-H "${key}: ${displayValue}"`
}

/**
 * Generate a preview of what the API call will look like
 * Useful for debugging and documentation
 * @pure
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
            buildHeaderDisplayLine(k, v)
        ),
    ]

    if (request.body) {
        lines.push('', '--- Body ---', JSON.stringify(request.body, null, 2))
    }

    lines.push('', '═══════════════════════════════════════════════════════════════')

    return lines.join('\n')
}

/**
 * Generate curl command for the request (for manual testing)
 * @pure
 */
export function toCurlCommand(request: BubbleApiRequest, redactKey: boolean = true): string {
    const headers = Object.entries(request.headers)
        .map(([k, v]) => buildCurlHeaderFlag(k, v, redactKey))
        .join(' \\\n  ')

    let cmd = `curl -X ${request.method} \\\n  "${request.fullUrl}" \\\n  ${headers}`

    if (request.body) {
        const bodyJson = JSON.stringify(request.body)
        cmd += ` \\\n  -d '${bodyJson}'`
    }

    return cmd
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
    HTTP_OK_MIN,
    HTTP_OK_MAX,
    AUTHORIZATION_HEADER,
    CONTENT_TYPE_HEADER,
    CONTENT_TYPE_JSON,
    BEARER_PREFIX,
    REDACTED_KEY,
    YOUR_API_KEY_PLACEHOLDER,

    // Predicates
    isSuccessResponse,
    hasResponseBody,
    hasResponseId,
    isAuthorizationHeader,

    // URL Builders
    buildObjectEndpoint,
    buildObjectEndpointWithId,
    buildFullUrl,

    // Header Builders
    buildAuthorizationValue,
    buildAuthOnlyHeaders,
    buildJsonHeaders,

    // Data Transformers
    removeReadOnlyFields,
    prepareDataForBubble,

    // Response Builders
    buildEmptySuccessResponse,

    // Preview Utilities
    buildRedactedHeaderValue,
    buildHeaderDisplayLine,
    buildCurlHeaderFlag,
})
