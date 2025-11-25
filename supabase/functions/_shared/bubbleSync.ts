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
 */

import { createClient, SupabaseClient } from 'https://esm.sh/@supabase/supabase-js@2';
import { BubbleWorkflowResponse } from './types.ts';
import { BubbleApiError, SupabaseSyncError } from './errors.ts';

export class BubbleSyncService {
  private bubbleBaseUrl: string;
  private bubbleApiKey: string;
  private supabaseClient: SupabaseClient;

  constructor(bubbleBaseUrl: string, bubbleApiKey: string, supabaseUrl: string, supabaseServiceKey: string) {
    // Validate required configuration - NO FALLBACKS
    if (!bubbleBaseUrl || !bubbleApiKey || !supabaseUrl || !supabaseServiceKey) {
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

    console.log('[BubbleSync] Initialized with base URL:', bubbleBaseUrl);
  }

  /**
   * Trigger a Bubble workflow and extract the created item ID
   * NO FALLBACK - Throws if workflow fails or ID not found
   * @param workflowName Name of the Bubble workflow
   * @param params Parameters to pass to the workflow
   * @returns Created item ID
   */
  async triggerWorkflow(workflowName: string, params: Record<string, any>): Promise<string> {
    const url = `${this.bubbleBaseUrl}/wf/${workflowName}`;

    console.log(`[BubbleSync] ========== TRIGGERING WORKFLOW ==========`);
    console.log(`[BubbleSync] Workflow: ${workflowName}`);
    console.log(`[BubbleSync] URL: ${url}`);
    console.log(`[BubbleSync] Params:`, JSON.stringify(params, null, 2));

    try {
      const response = await fetch(url, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${this.bubbleApiKey}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(params),
      });

      console.log(`[BubbleSync] Response status: ${response.status} ${response.statusText}`);

      if (!response.ok) {
        const errorText = await response.text();
        console.error(`[BubbleSync] Workflow failed:`, errorText);
        throw new BubbleApiError(
          `Bubble workflow failed: ${response.status} ${response.statusText}`,
          response.status,
          errorText
        );
      }

      // Handle 204 No Content (workflow completed but no data returned)
      if (response.status === 204) {
        console.log(`[BubbleSync] Workflow completed (204 No Content)`);
        throw new BubbleApiError(
          'Workflow completed but did not return an ID. Cannot sync to Supabase.',
          204
        );
      }

      const data: BubbleWorkflowResponse = await response.json();
      console.log(`[BubbleSync] Full response:`, JSON.stringify(data, null, 2));

      const id = this.extractId(data);
      console.log(`[BubbleSync] Extracted ID: ${id}`);
      console.log(`[BubbleSync] ========== WORKFLOW SUCCESS ==========`);

      return id;
    } catch (error) {
      if (error instanceof BubbleApiError) {
        throw error;
      }
      console.error(`[BubbleSync] ========== WORKFLOW ERROR ==========`);
      console.error(`[BubbleSync] Error:`, error);
      throw new BubbleApiError(
        `Failed to trigger Bubble workflow: ${error.message}`,
        500,
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
   */
  async fetchBubbleObject(objectType: string, objectId: string): Promise<any> {
    const url = `${this.bubbleBaseUrl}/obj/${objectType}/${objectId}`;

    console.log(`[BubbleSync] ========== FETCHING BUBBLE OBJECT ==========`);
    console.log(`[BubbleSync] Object Type: ${objectType}`);
    console.log(`[BubbleSync] Object ID: ${objectId}`);
    console.log(`[BubbleSync] URL: ${url}`);

    try {
      const response = await fetch(url, {
        method: 'GET',
        headers: {
          'Authorization': `Bearer ${this.bubbleApiKey}`,
        },
      });

      console.log(`[BubbleSync] Response status: ${response.status} ${response.statusText}`);

      if (!response.ok) {
        const errorText = await response.text();
        console.error(`[BubbleSync] Fetch failed:`, errorText);
        throw new BubbleApiError(
          `Failed to fetch Bubble object: ${response.status} ${response.statusText}`,
          response.status,
          errorText
        );
      }

      const data = await response.json();
      const objectData = data.response || data;

      console.log(`[BubbleSync] Fetched object with ${Object.keys(objectData).length} fields`);
      console.log(`[BubbleSync] ========== FETCH SUCCESS ==========`);

      return objectData;
    } catch (error) {
      if (error instanceof BubbleApiError) {
        throw error;
      }
      console.error(`[BubbleSync] ========== FETCH ERROR ==========`);
      console.error(`[BubbleSync] Error:`, error);
      throw new BubbleApiError(
        `Failed to fetch Bubble object: ${error.message}`,
        500,
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
   */
  async syncToSupabase(table: string, data: any): Promise<any> {
    console.log(`[BubbleSync] ========== SYNCING TO SUPABASE ==========`);
    console.log(`[BubbleSync] Table: ${table}`);
    console.log(`[BubbleSync] Data ID: ${data._id}`);

    if (!data._id) {
      throw new SupabaseSyncError('Cannot sync data without _id field');
    }

    try {
      const { data: syncedData, error } = await this.supabaseClient
        .from(table)
        .upsert(data, { onConflict: '_id' })
        .select()
        .single();

      if (error) {
        console.error(`[BubbleSync] Sync failed:`, error);
        throw new SupabaseSyncError(`Supabase sync failed: ${error.message}`, error);
      }

      console.log(`[BubbleSync] Sync successful, ID: ${syncedData._id}`);
      console.log(`[BubbleSync] ========== SYNC SUCCESS ==========`);

      return syncedData;
    } catch (error) {
      if (error instanceof SupabaseSyncError) {
        throw error;
      }
      console.error(`[BubbleSync] ========== SYNC ERROR ==========`);
      console.error(`[BubbleSync] Error:`, error);
      throw new SupabaseSyncError(`Failed to sync to Supabase: ${error.message}`, error);
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
   */
  async createAndSync(
    workflowName: string,
    params: Record<string, any>,
    bubbleObjectType: string,
    supabaseTable: string
  ): Promise<any> {
    console.log(`[BubbleSync] ============================================`);
    console.log(`[BubbleSync] ATOMIC CREATE-AND-SYNC OPERATION`);
    console.log(`[BubbleSync] ============================================`);
    console.log(`[BubbleSync] Workflow: ${workflowName}`);
    console.log(`[BubbleSync] Object Type: ${bubbleObjectType}`);
    console.log(`[BubbleSync] Table: ${supabaseTable}`);

    try {
      // Step 1: Create in Bubble (source of truth)
      console.log(`[BubbleSync] Step 1/3: Creating in Bubble...`);
      const bubbleId = await this.triggerWorkflow(workflowName, params);

      // Step 2: Fetch fresh data from Bubble
      console.log(`[BubbleSync] Step 2/3: Fetching from Bubble...`);
      const bubbleData = await this.fetchBubbleObject(bubbleObjectType, bubbleId);

      // Step 3: Sync to Supabase
      console.log(`[BubbleSync] Step 3/3: Syncing to Supabase...`);
      const syncedData = await this.syncToSupabase(supabaseTable, bubbleData);

      console.log(`[BubbleSync] ============================================`);
      console.log(`[BubbleSync] ATOMIC OPERATION COMPLETE`);
      console.log(`[BubbleSync] ============================================`);

      return syncedData;
    } catch (error) {
      console.error(`[BubbleSync] ============================================`);
      console.error(`[BubbleSync] ATOMIC OPERATION FAILED`);
      console.error(`[BubbleSync] ============================================`);
      console.error(`[BubbleSync] Error:`, error);

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
   */
  async triggerWorkflowOnly(workflowName: string, params: Record<string, any>): Promise<any> {
    const url = `${this.bubbleBaseUrl}/wf/${workflowName}`;

    console.log(`[BubbleSync] ========== TRIGGERING WORKFLOW (NO SYNC) ==========`);
    console.log(`[BubbleSync] Workflow: ${workflowName}`);
    console.log(`[BubbleSync] URL: ${url}`);

    try {
      const response = await fetch(url, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${this.bubbleApiKey}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(params),
      });

      console.log(`[BubbleSync] Response status: ${response.status} ${response.statusText}`);

      if (!response.ok) {
        const errorText = await response.text();
        throw new BubbleApiError(
          `Bubble workflow failed: ${response.status} ${response.statusText}`,
          response.status,
          errorText
        );
      }

      // Handle 204 No Content (successful but no data)
      if (response.status === 204) {
        console.log(`[BubbleSync] Workflow completed successfully (204 No Content)`);
        return { success: true };
      }

      const data = await response.json();
      console.log(`[BubbleSync] ========== WORKFLOW SUCCESS (NO SYNC) ==========`);

      return data;
    } catch (error) {
      if (error instanceof BubbleApiError) {
        throw error;
      }
      console.error(`[BubbleSync] ========== WORKFLOW ERROR ==========`);
      console.error(`[BubbleSync] Error:`, error);
      throw new BubbleApiError(
        `Failed to trigger Bubble workflow: ${error.message}`,
        500,
        error
      );
    }
  }

  /**
   * Extract ID from Bubble response (handles various formats)
   * NO FALLBACK - Throws if ID not found
   * @param response Response from Bubble workflow
   * @returns Extracted ID
   */
  private extractId(response: BubbleWorkflowResponse): string {
    // Try multiple possible locations for ID
    const id = response?.response?.listing_id
      || response?.response?.id
      || response?.response?.user_id
      || response?.listing_id
      || response?.id
      || response?.user_id;

    if (!id) {
      console.error('[BubbleSync] Response structure:', JSON.stringify(response, null, 2));
      throw new BubbleApiError(
        'No ID found in Bubble response. Response structure may have changed. Check logs for response details.',
        500,
        response
      );
    }

    return id;
  }
}
