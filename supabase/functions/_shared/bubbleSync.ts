/**
 * Bubble Sync Service - Core atomic sync implementation
 * Split Lease - Bubble API Migration
 *
 * NO FALLBACK PRINCIPLE:
 * - Real data or nothing
 * - No fallback mechanisms
 * - No hardcoded values
 * - Atomic operations only
 *
 * Pattern: Write-Read-Write
 * 1. Create in Bubble (source of truth)
 * 2. Fetch full data from Bubble Data API
 * 3. Sync to Supabase (replica)
 * 4. Return synced data to client
 *
 * @module _shared/bubbleSync
 */

import { createClient, SupabaseClient } from 'https://esm.sh/@supabase/supabase-js@2';
import { BubbleWorkflowResponse } from './types.ts';
import { BubbleApiError, SupabaseSyncError } from './errors.ts';

// ─────────────────────────────────────────────────────────────
// Constants
// ─────────────────────────────────────────────────────────────

const LOG_PREFIX = '[BubbleSync]'
const HTTP_STATUS_NO_CONTENT = 204
const HTTP_STATUS_INTERNAL_ERROR = 500

/**
 * HTTP methods used by Bubble API
 * @immutable
 */
const HTTP_METHODS = Object.freeze({
  POST: 'POST',
  GET: 'GET',
} as const)

/**
 * Content type headers
 * @immutable
 */
const CONTENT_TYPES = Object.freeze({
  JSON: 'application/json',
} as const)

// ─────────────────────────────────────────────────────────────
// Validation Predicates
// ─────────────────────────────────────────────────────────────

/**
 * Check if string is non-empty
 * @pure
 */
const isNonEmptyString = (value: unknown): value is string =>
  typeof value === 'string' && value.length > 0

/**
 * Check if all required config values are present
 * @pure
 */
const hasRequiredConfig = (
  bubbleBaseUrl: unknown,
  bubbleApiKey: unknown,
  supabaseUrl: unknown,
  supabaseServiceKey: unknown
): boolean =>
  isNonEmptyString(bubbleBaseUrl) &&
  isNonEmptyString(bubbleApiKey) &&
  isNonEmptyString(supabaseUrl) &&
  isNonEmptyString(supabaseServiceKey)

/**
 * Check if response status is OK (2xx)
 * @pure
 */
const isSuccessStatus = (response: Response): boolean =>
  response.ok

/**
 * Check if response is No Content (204)
 * @pure
 */
const isNoContentStatus = (status: number): boolean =>
  status === HTTP_STATUS_NO_CONTENT

/**
 * Check if data has _id field
 * @pure
 */
const hasIdField = (data: Record<string, unknown>): boolean =>
  data._id !== undefined && data._id !== null

// ─────────────────────────────────────────────────────────────
// URL Builders
// ─────────────────────────────────────────────────────────────

/**
 * Build workflow URL
 * @pure
 */
const buildWorkflowUrl = (baseUrl: string, workflowName: string): string =>
  `${baseUrl}/wf/${workflowName}`

/**
 * Build object fetch URL
 * @pure
 */
const buildObjectUrl = (baseUrl: string, objectType: string, objectId: string): string =>
  `${baseUrl}/obj/${objectType}/${objectId}`

/**
 * Build auth headers for Bubble API
 * @pure
 */
const buildAuthHeaders = (apiKey: string): Record<string, string> =>
  Object.freeze({
    'Authorization': `Bearer ${apiKey}`,
  })

/**
 * Build request headers with content type
 * @pure
 */
const buildJsonHeaders = (apiKey: string): Record<string, string> =>
  Object.freeze({
    'Authorization': `Bearer ${apiKey}`,
    'Content-Type': CONTENT_TYPES.JSON,
  })

export class BubbleSyncService {
  private readonly bubbleBaseUrl: string;
  private readonly bubbleApiKey: string;
  private readonly supabaseClient: SupabaseClient;

  /**
   * @effectful (creates Supabase client, console logging)
   */
  constructor(bubbleBaseUrl: string, bubbleApiKey: string, supabaseUrl: string, supabaseServiceKey: string) {
    // Validate required configuration - NO FALLBACKS
    if (!hasRequiredConfig(bubbleBaseUrl, bubbleApiKey, supabaseUrl, supabaseServiceKey)) {
      throw new Error('BubbleSyncService: Missing required configuration. All parameters are required.');
    }

    this.bubbleBaseUrl = bubbleBaseUrl;
    this.bubbleApiKey = bubbleApiKey;

    // Initialize Supabase client with service role key (bypasses RLS)
    this.supabaseClient = createClient(
      supabaseUrl,
      supabaseServiceKey,
      {
        auth: {
          autoRefreshToken: false,
          persistSession: false,
        },
      }
    );

    console.log(`${LOG_PREFIX} Initialized with base URL:`, bubbleBaseUrl);
    console.log(`${LOG_PREFIX} Supabase URL:`, supabaseUrl);
    console.log(`${LOG_PREFIX} API Key present:`, bubbleApiKey ? 'Yes (length: ' + bubbleApiKey.length + ')' : 'NO');
  }

  /**
   * Trigger a Bubble workflow and extract the created item ID
   * NO FALLBACK - Throws if workflow fails or ID not found
   * @param workflowName Name of the Bubble workflow
   * @param params Parameters to pass to the workflow
   * @returns Created item ID
   * @effectful (network I/O, console logging)
   */
  async triggerWorkflow(workflowName: string, params: Record<string, unknown>): Promise<string> {
    const url = buildWorkflowUrl(this.bubbleBaseUrl, workflowName);

    console.log(`${LOG_PREFIX} ========== TRIGGERING WORKFLOW ==========`);
    console.log(`${LOG_PREFIX} Workflow: ${workflowName}`);
    console.log(`${LOG_PREFIX} URL: ${url}`);
    console.log(`${LOG_PREFIX} Params:`, JSON.stringify(params, null, 2));

    try {
      const response = await fetch(url, {
        method: HTTP_METHODS.POST,
        headers: buildJsonHeaders(this.bubbleApiKey),
        body: JSON.stringify(params),
      });

      console.log(`${LOG_PREFIX} Response status: ${response.status} ${response.statusText}`);

      if (!isSuccessStatus(response)) {
        const errorText = await response.text();
        console.error(`${LOG_PREFIX} Workflow failed at URL: ${url}`);
        console.error(`${LOG_PREFIX} Error response:`, errorText);
        throw new BubbleApiError(
          `Bubble workflow failed: ${response.status} ${response.statusText} - URL: ${url} - Response: ${errorText}`,
          response.status,
          errorText
        );
      }

      // Handle 204 No Content (workflow completed but no data returned)
      if (isNoContentStatus(response.status)) {
        console.log(`${LOG_PREFIX} Workflow completed (204 No Content)`);
        throw new BubbleApiError(
          'Workflow completed but did not return an ID. Cannot sync to Supabase.',
          HTTP_STATUS_NO_CONTENT
        );
      }

      const data: BubbleWorkflowResponse = await response.json();
      console.log(`${LOG_PREFIX} Full response:`, JSON.stringify(data, null, 2));

      const id = this.extractId(data);
      console.log(`${LOG_PREFIX} Extracted ID: ${id}`);
      console.log(`${LOG_PREFIX} ========== WORKFLOW SUCCESS ==========`);

      return id;
    } catch (error) {
      if (error instanceof BubbleApiError) {
        throw error;
      }
      console.error(`${LOG_PREFIX} ========== WORKFLOW ERROR ==========`);
      console.error(`${LOG_PREFIX} Error:`, error);
      throw new BubbleApiError(
        `Failed to trigger Bubble workflow: ${(error as Error).message}`,
        HTTP_STATUS_INTERNAL_ERROR,
        error
      );
    }
  }

  /**
   * Fetch full object data from Bubble Data API
   * NO FALLBACK - Throws if fetch fails
   * @param objectType Bubble object type (e.g., 'zat_listings', 'user')
   * @param objectId ID of the object to fetch
   * @returns Full object data from Bubble
   * @effectful (network I/O, console logging)
   */
  async fetchBubbleObject(objectType: string, objectId: string): Promise<Record<string, unknown>> {
    const url = buildObjectUrl(this.bubbleBaseUrl, objectType, objectId);

    console.log(`${LOG_PREFIX} ========== FETCHING BUBBLE OBJECT ==========`);
    console.log(`${LOG_PREFIX} Object Type: ${objectType}`);
    console.log(`${LOG_PREFIX} Object ID: ${objectId}`);
    console.log(`${LOG_PREFIX} URL: ${url}`);

    try {
      const response = await fetch(url, {
        method: HTTP_METHODS.GET,
        headers: buildAuthHeaders(this.bubbleApiKey),
      });

      console.log(`${LOG_PREFIX} Response status: ${response.status} ${response.statusText}`);

      if (!isSuccessStatus(response)) {
        const errorText = await response.text();
        console.error(`${LOG_PREFIX} Fetch failed at URL: ${url}`);
        console.error(`${LOG_PREFIX} Error response:`, errorText);
        throw new BubbleApiError(
          `Failed to fetch Bubble object: ${response.status} ${response.statusText} - URL: ${url} - Response: ${errorText}`,
          response.status,
          errorText
        );
      }

      const data = await response.json();
      const objectData = data.response || data;

      console.log(`${LOG_PREFIX} Fetched object with ${Object.keys(objectData).length} fields`);
      console.log(`${LOG_PREFIX} ========== FETCH SUCCESS ==========`);

      return objectData;
    } catch (error) {
      if (error instanceof BubbleApiError) {
        throw error;
      }
      console.error(`${LOG_PREFIX} ========== FETCH ERROR ==========`);
      console.error(`${LOG_PREFIX} Error:`, error);
      throw new BubbleApiError(
        `Failed to fetch Bubble object: ${(error as Error).message}`,
        HTTP_STATUS_INTERNAL_ERROR,
        error
      );
    }
  }

  /**
   * Sync Bubble object to Supabase table using service role (bypasses RLS)
   * NO FALLBACK - Throws if sync fails
   * @param table Supabase table name
   * @param data Data to sync (must include _id field as conflict resolution key)
   * @returns Synced data from Supabase
   * @effectful (database I/O, console logging)
   */
  async syncToSupabase(table: string, data: Record<string, unknown>): Promise<Record<string, unknown>> {
    console.log(`${LOG_PREFIX} ========== SYNCING TO SUPABASE ==========`);
    console.log(`${LOG_PREFIX} Table: ${table}`);
    console.log(`${LOG_PREFIX} Data ID: ${data._id}`);

    if (!hasIdField(data)) {
      throw new SupabaseSyncError('Cannot sync data without _id field');
    }

    try {
      const { data: syncedData, error } = await this.supabaseClient
        .from(table)
        .upsert(data, { onConflict: '_id' })
        .select()
        .single();

      if (error) {
        console.error(`${LOG_PREFIX} Sync failed:`, error);
        throw new SupabaseSyncError(`Supabase sync failed: ${error.message}`, error);
      }

      console.log(`${LOG_PREFIX} Sync successful, ID: ${syncedData._id}`);
      console.log(`${LOG_PREFIX} ========== SYNC SUCCESS ==========`);

      return syncedData;
    } catch (error) {
      if (error instanceof SupabaseSyncError) {
        throw error;
      }
      console.error(`${LOG_PREFIX} ========== SYNC ERROR ==========`);
      console.error(`${LOG_PREFIX} Error:`, error);
      throw new SupabaseSyncError(`Failed to sync to Supabase: ${(error as Error).message}`, error);
    }
  }

  /**
   * Atomic create-and-sync operation
   * NO FALLBACK - All-or-nothing transaction
   *
   * Steps:
   * 1. Create in Bubble (source of truth)
   * 2. Fetch full data from Bubble
   * 3. Sync to Supabase (replica)
   * 4. Return synced data
   *
   * If any step fails, the entire operation fails.
   * Client will receive error and can retry the entire operation.
   *
   * @param workflowName Name of the Bubble workflow
   * @param params Parameters to pass to the workflow
   * @param bubbleObjectType Bubble object type for Data API fetch
   * @param supabaseTable Supabase table for sync
   * @returns Synced data from Supabase
   * @effectful (network I/O, database I/O, console logging)
   */
  async createAndSync(
    workflowName: string,
    params: Record<string, unknown>,
    bubbleObjectType: string,
    supabaseTable: string
  ): Promise<Record<string, unknown>> {
    console.log(`${LOG_PREFIX} ============================================`);
    console.log(`${LOG_PREFIX} ATOMIC CREATE-AND-SYNC OPERATION`);
    console.log(`${LOG_PREFIX} ============================================`);
    console.log(`${LOG_PREFIX} Workflow: ${workflowName}`);
    console.log(`${LOG_PREFIX} Object Type: ${bubbleObjectType}`);
    console.log(`${LOG_PREFIX} Table: ${supabaseTable}`);

    try {
      // Step 1: Create in Bubble (source of truth)
      console.log(`${LOG_PREFIX} Step 1/3: Creating in Bubble...`);
      const bubbleId = await this.triggerWorkflow(workflowName, params);

      // Step 2: Fetch fresh data from Bubble
      console.log(`${LOG_PREFIX} Step 2/3: Fetching from Bubble...`);
      const bubbleData = await this.fetchBubbleObject(bubbleObjectType, bubbleId);

      // Step 3: Sync to Supabase
      console.log(`${LOG_PREFIX} Step 3/3: Syncing to Supabase...`);
      const syncedData = await this.syncToSupabase(supabaseTable, bubbleData);

      console.log(`${LOG_PREFIX} ============================================`);
      console.log(`${LOG_PREFIX} ATOMIC OPERATION COMPLETE`);
      console.log(`${LOG_PREFIX} ============================================`);

      return syncedData;
    } catch (error) {
      console.error(`${LOG_PREFIX} ============================================`);
      console.error(`${LOG_PREFIX} ATOMIC OPERATION FAILED`);
      console.error(`${LOG_PREFIX} ============================================`);
      console.error(`${LOG_PREFIX} Error:`, error);

      // Re-throw the error - let it fail
      // Client can retry the entire operation
      throw error;
    }
  }

  /**
   * Trigger workflow without sync (for workflows that don't create data)
   * Examples: send email, logout, notifications
   * NO FALLBACK - Throws if workflow fails
   * @param workflowName Name of the Bubble workflow
   * @param params Parameters to pass to the workflow
   * @returns Response from Bubble workflow
   * @effectful (network I/O, console logging)
   */
  async triggerWorkflowOnly(workflowName: string, params: Record<string, unknown>): Promise<Record<string, unknown>> {
    const url = buildWorkflowUrl(this.bubbleBaseUrl, workflowName);

    console.log(`${LOG_PREFIX} ========== TRIGGERING WORKFLOW (NO SYNC) ==========`);
    console.log(`${LOG_PREFIX} Workflow: ${workflowName}`);
    console.log(`${LOG_PREFIX} URL: ${url}`);

    try {
      const response = await fetch(url, {
        method: HTTP_METHODS.POST,
        headers: buildJsonHeaders(this.bubbleApiKey),
        body: JSON.stringify(params),
      });

      console.log(`${LOG_PREFIX} Response status: ${response.status} ${response.statusText}`);

      if (!isSuccessStatus(response)) {
        const errorText = await response.text();
        throw new BubbleApiError(
          `Bubble workflow failed: ${response.status} ${response.statusText}`,
          response.status,
          errorText
        );
      }

      // Handle 204 No Content (successful but no data)
      if (isNoContentStatus(response.status)) {
        console.log(`${LOG_PREFIX} Workflow completed successfully (204 No Content)`);
        return Object.freeze({ success: true });
      }

      const data = await response.json();
      console.log(`${LOG_PREFIX} ========== WORKFLOW SUCCESS (NO SYNC) ==========`);

      return data;
    } catch (error) {
      if (error instanceof BubbleApiError) {
        throw error;
      }
      console.error(`${LOG_PREFIX} ========== WORKFLOW ERROR ==========`);
      console.error(`${LOG_PREFIX} Error:`, error);
      throw new BubbleApiError(
        `Failed to trigger Bubble workflow: ${(error as Error).message}`,
        HTTP_STATUS_INTERNAL_ERROR,
        error
      );
    }
  }

  /**
   * Extract ID from Bubble response (handles various formats)
   * NO FALLBACK - Throws if ID not found
   * @param response Response from Bubble workflow
   * @returns Extracted ID
   * @pure (throws on error, but no side effects)
   */
  private extractId(response: BubbleWorkflowResponse): string {
    // Try multiple possible locations for ID
    // NOTE: Bubble workflows return different field names based on what they create
    // - listing_creation_in_code returns: { response: { listing: "id" } }
    // - other workflows may use: listing_id, id, user_id
    const id = response?.response?.listing
      || response?.response?.listing_id
      || response?.response?.id
      || response?.response?.user_id
      || response?.listing
      || response?.listing_id
      || response?.id
      || response?.user_id;

    if (!id) {
      console.error(`${LOG_PREFIX} Response structure:`, JSON.stringify(response, null, 2));
      throw new BubbleApiError(
        'No ID found in Bubble response. Response structure may have changed. Check logs for response details.',
        HTTP_STATUS_INTERNAL_ERROR,
        response
      );
    }

    return id;
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
  HTTP_STATUS_NO_CONTENT,
  HTTP_STATUS_INTERNAL_ERROR,
  HTTP_METHODS,
  CONTENT_TYPES,

  // Validation predicates
  isNonEmptyString,
  hasRequiredConfig,
  isSuccessStatus,
  isNoContentStatus,
  hasIdField,

  // URL builders
  buildWorkflowUrl,
  buildObjectUrl,
  buildAuthHeaders,
  buildJsonHeaders,
})
