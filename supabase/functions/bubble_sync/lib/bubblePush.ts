/**
 * Bubble Push Client - Pushes data TO Bubble via workflow endpoints
 * Split Lease - bubble_sync/lib
 *
 * NO FALLBACK PRINCIPLE:
 * - Real response or throw
 * - No silent failures
 * - No default values
 *
 * @module bubble_sync/lib/bubblePush
 */

import { BubbleApiError } from '../../_shared/errors.ts';

// ─────────────────────────────────────────────────────────────
// Constants
// ─────────────────────────────────────────────────────────────

const LOG_PREFIX = '[BubblePush]'
const HTTP_NO_CONTENT = 204
const DEFAULT_BATCH_DELAY_MS = 500
const DEFAULT_BATCH_SIZE = 0

// ─────────────────────────────────────────────────────────────
// Types
// ─────────────────────────────────────────────────────────────

export interface BubblePushConfig {
  readonly bubbleBaseUrl: string;
  readonly bubbleApiKey: string;
}

export interface PushPayload {
  readonly _id: string;
  readonly operation: 'INSERT' | 'UPDATE' | 'DELETE';
  readonly data: Readonly<Record<string, unknown>>;
}

export interface BubblePushResponse {
  readonly success: boolean;
  readonly _id?: string;
  readonly message?: string;
  readonly [key: string]: unknown;
}

interface BatchResult {
  readonly _id: string;
  readonly success: boolean;
  readonly error?: string;
}

interface BatchPushResult {
  readonly success: number;
  readonly failed: number;
  readonly results: readonly BatchResult[];
}

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
 * Check if response is No Content (204)
 * @pure
 */
const isNoContentResponse = (response: Response): boolean =>
  response.status === HTTP_NO_CONTENT

/**
 * Check if workflow name is valid
 * @pure
 */
const isValidWorkflowName = (workflowName: string): boolean =>
  Boolean(workflowName) && !workflowName.includes(' ')

// ─────────────────────────────────────────────────────────────
// URL Builders
// ─────────────────────────────────────────────────────────────

/**
 * Build workflow URL
 * @pure
 */
const buildWorkflowUrl = (baseUrl: string, workflowName: string): string =>
  `${baseUrl}/wf/${workflowName}`

// ─────────────────────────────────────────────────────────────
// Request Builders
// ─────────────────────────────────────────────────────────────

/**
 * Build request headers
 * @pure
 */
const buildRequestHeaders = (apiKey: string): HeadersInit =>
  Object.freeze({
    'Authorization': `Bearer ${apiKey}`,
    'Content-Type': 'application/json'
  })

/**
 * Build request options
 * @pure
 */
const buildRequestOptions = (apiKey: string, payload: PushPayload): RequestInit =>
  Object.freeze({
    method: 'POST',
    headers: buildRequestHeaders(apiKey),
    body: JSON.stringify(payload)
  })

// ─────────────────────────────────────────────────────────────
// Result Builders
// ─────────────────────────────────────────────────────────────

/**
 * Build success response for no content
 * @pure
 */
const buildNoContentResponse = (recordId: string): BubblePushResponse =>
  Object.freeze({
    success: true,
    _id: recordId
  })

/**
 * Build success response from API data
 * @pure
 */
const buildSuccessResponse = (data: Record<string, unknown>, recordId: string): BubblePushResponse =>
  Object.freeze({
    success: true,
    _id: data?.response?._id as string || data?._id as string || recordId,
    ...data
  })

/**
 * Build batch result entry for success
 * @pure
 */
const buildBatchSuccessEntry = (recordId: string): BatchResult =>
  Object.freeze({
    _id: recordId,
    success: true
  })

/**
 * Build batch result entry for failure
 * @pure
 */
const buildBatchFailureEntry = (recordId: string, errorMessage: string): BatchResult =>
  Object.freeze({
    _id: recordId,
    success: false,
    error: errorMessage
  })

/**
 * Build final batch result
 * @pure
 */
const buildBatchPushResult = (
  successCount: number,
  failedCount: number,
  results: readonly BatchResult[]
): BatchPushResult =>
  Object.freeze({
    success: successCount,
    failed: failedCount,
    results: Object.freeze([...results])
  })

// ─────────────────────────────────────────────────────────────
// Async Helpers
// ─────────────────────────────────────────────────────────────

/**
 * Delay execution
 * @effectful
 */
const delay = (ms: number): Promise<void> =>
  new Promise(resolve => setTimeout(resolve, ms))

// ─────────────────────────────────────────────────────────────
// Public API
// ─────────────────────────────────────────────────────────────

/**
 * Call a Bubble workflow endpoint to push data
 * @effectful (HTTP request, console logging)
 */
export async function callBubbleWorkflow(
  config: BubblePushConfig,
  workflowName: string,
  payload: PushPayload
): Promise<BubblePushResponse> {
  const url = buildWorkflowUrl(config.bubbleBaseUrl, workflowName)

  console.log(`${LOG_PREFIX} ========== PUSHING TO BUBBLE ==========`)
  console.log(`${LOG_PREFIX} Workflow: ${workflowName}`)
  console.log(`${LOG_PREFIX} URL: ${url}`)
  console.log(`${LOG_PREFIX} Operation: ${payload.operation}`)
  console.log(`${LOG_PREFIX} Record ID: ${payload._id}`)
  console.log(`${LOG_PREFIX} Data fields: ${Object.keys(payload.data).length}`)

  try {
    const response = await fetch(url, buildRequestOptions(config.bubbleApiKey, payload))

    console.log(`${LOG_PREFIX} Response status: ${response.status} ${response.statusText}`)

    if (!isSuccessResponse(response)) {
      const errorText = await response.text()
      console.error(`${LOG_PREFIX} Push failed at URL: ${url}`)
      console.error(`${LOG_PREFIX} Error response:`, errorText)

      throw new BubbleApiError(
        `Bubble workflow push failed: ${response.status} ${response.statusText} - URL: ${url} - Response: ${errorText}`,
        response.status,
        errorText
      )
    }

    // Handle 204 No Content (workflow completed but no data returned)
    if (isNoContentResponse(response)) {
      console.log(`${LOG_PREFIX} Workflow completed (204 No Content)`)
      return buildNoContentResponse(payload._id)
    }

    const data = await response.json()
    console.log(`${LOG_PREFIX} Response:`, JSON.stringify(data, null, 2))
    console.log(`${LOG_PREFIX} ========== PUSH SUCCESS ==========`)

    return buildSuccessResponse(data, payload._id)

  } catch (error) {
    if (error instanceof BubbleApiError) {
      throw error
    }

    console.error(`${LOG_PREFIX} ========== PUSH ERROR ==========`)
    console.error(`${LOG_PREFIX} Error:`, error)

    throw new BubbleApiError(
      `Failed to push to Bubble workflow: ${(error as Error).message}`,
      500,
      error
    )
  }
}

/**
 * Validate that the Bubble workflow endpoint exists (optional pre-check)
 * @pure (with console logging)
 */
export async function validateWorkflowExists(
  config: BubblePushConfig,
  workflowName: string
): Promise<boolean> {
  // Note: Bubble doesn't have a direct way to check if a workflow exists
  // This is a placeholder for potential validation logic
  // For now, we just validate the URL format
  const url = buildWorkflowUrl(config.bubbleBaseUrl, workflowName)

  if (!isValidWorkflowName(workflowName)) {
    console.warn(`${LOG_PREFIX} Invalid workflow name: ${workflowName}`)
    return false
  }

  console.log(`${LOG_PREFIX} Workflow URL validated: ${url}`)
  return true
}

/**
 * Batch push multiple records to the same workflow
 * Processes sequentially to respect Bubble rate limits
 * @effectful (HTTP requests, console logging)
 */
export async function batchPushToWorkflow(
  config: BubblePushConfig,
  workflowName: string,
  payloads: readonly PushPayload[],
  delayMs: number = DEFAULT_BATCH_DELAY_MS
): Promise<BatchPushResult> {
  const results: BatchResult[] = []
  let successCount = DEFAULT_BATCH_SIZE
  let failedCount = DEFAULT_BATCH_SIZE

  console.log(`${LOG_PREFIX} Starting batch push of ${payloads.length} records`)

  for (let i = 0; i < payloads.length; i++) {
    const payload = payloads[i]

    try {
      await callBubbleWorkflow(config, workflowName, payload)
      results.push(buildBatchSuccessEntry(payload._id))
      successCount++
    } catch (error) {
      results.push(buildBatchFailureEntry(payload._id, (error as Error).message))
      failedCount++
    }

    // Rate limiting delay between requests
    if (i < payloads.length - 1 && delayMs > 0) {
      await delay(delayMs)
    }
  }

  console.log(`${LOG_PREFIX} Batch complete: ${successCount} success, ${failedCount} failed`)

  return buildBatchPushResult(successCount, failedCount, results)
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
  HTTP_NO_CONTENT,
  DEFAULT_BATCH_DELAY_MS,
  DEFAULT_BATCH_SIZE,

  // Predicates
  isSuccessResponse,
  isNoContentResponse,
  isValidWorkflowName,

  // Builders
  buildWorkflowUrl,
  buildRequestHeaders,
  buildRequestOptions,
  buildNoContentResponse,
  buildSuccessResponse,
  buildBatchSuccessEntry,
  buildBatchFailureEntry,
  buildBatchPushResult,

  // Helpers
  delay,
})
