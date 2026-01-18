/**
 * Bubble Push Client - Pushes data TO Bubble via workflow endpoints
 *
 * NO FALLBACK PRINCIPLE:
 * - Real response or throw
 * - No silent failures
 * - No default values
 */

import { BubbleApiError } from '../../_shared/errors.ts';

export interface BubblePushConfig {
    bubbleBaseUrl: string;
    bubbleApiKey: string;
}

export interface PushPayload {
    _id: string;
    operation: 'INSERT' | 'UPDATE' | 'DELETE';
    data: Record<string, unknown>;
}

export interface BubblePushResponse {
    success: boolean;
    _id?: string;
    message?: string;
    [key: string]: unknown;
}

/**
 * Call a Bubble workflow endpoint to push data
 */
export async function callBubbleWorkflow(
    config: BubblePushConfig,
    workflowName: string,
    payload: PushPayload
): Promise<BubblePushResponse> {
    const url = `${config.bubbleBaseUrl}/wf/${workflowName}`;

    console.log(`[BubblePush] ========== PUSHING TO BUBBLE ==========`);
    console.log(`[BubblePush] Workflow: ${workflowName}`);
    console.log(`[BubblePush] URL: ${url}`);
    console.log(`[BubblePush] Operation: ${payload.operation}`);
    console.log(`[BubblePush] Record ID: ${payload._id}`);
    console.log(`[BubblePush] Data fields: ${Object.keys(payload.data).length}`);

    try {
        const response = await fetch(url, {
            method: 'POST',
            headers: {
                'Authorization': `Bearer ${config.bubbleApiKey}`,
                'Content-Type': 'application/json'
            },
            body: JSON.stringify(payload)
        });

        console.log(`[BubblePush] Response status: ${response.status} ${response.statusText}`);

        if (!response.ok) {
            const errorText = await response.text();
            console.error(`[BubblePush] Push failed at URL: ${url}`);
            console.error(`[BubblePush] Error response:`, errorText);

            throw new BubbleApiError(
                `Bubble workflow push failed: ${response.status} ${response.statusText} - URL: ${url} - Response: ${errorText}`,
                response.status,
                errorText
            );
        }

        // Handle 204 No Content (workflow completed but no data returned)
        if (response.status === 204) {
            console.log(`[BubblePush] Workflow completed (204 No Content)`);
            return { success: true, _id: payload._id };
        }

        const data = await response.json();
        console.log(`[BubblePush] Response:`, JSON.stringify(data, null, 2));
        console.log(`[BubblePush] ========== PUSH SUCCESS ==========`);

        return {
            success: true,
            _id: data?.response?._id || data?._id || payload._id,
            ...data
        };

    } catch (error) {
        if (error instanceof BubbleApiError) {
            throw error;
        }

        console.error(`[BubblePush] ========== PUSH ERROR ==========`);
        console.error(`[BubblePush] Error:`, error);

        throw new BubbleApiError(
            `Failed to push to Bubble workflow: ${error.message}`,
            500,
            error
        );
    }
}

/**
 * Validate that the Bubble workflow endpoint exists (optional pre-check)
 */
export async function validateWorkflowExists(
    config: BubblePushConfig,
    workflowName: string
): Promise<boolean> {
    // Note: Bubble doesn't have a direct way to check if a workflow exists
    // This is a placeholder for potential validation logic
    // For now, we just validate the URL format
    const url = `${config.bubbleBaseUrl}/wf/${workflowName}`;

    if (!workflowName || workflowName.includes(' ')) {
        console.warn(`[BubblePush] Invalid workflow name: ${workflowName}`);
        return false;
    }

    console.log(`[BubblePush] Workflow URL validated: ${url}`);
    return true;
}

/**
 * Batch push multiple records to the same workflow
 * Processes sequentially to respect Bubble rate limits
 */
export async function batchPushToWorkflow(
    config: BubblePushConfig,
    workflowName: string,
    payloads: PushPayload[],
    delayMs: number = 500
): Promise<{
    success: number;
    failed: number;
    results: Array<{ _id: string; success: boolean; error?: string }>;
}> {
    const results: Array<{ _id: string; success: boolean; error?: string }> = [];
    let success = 0;
    let failed = 0;

    console.log(`[BubblePush] Starting batch push of ${payloads.length} records`);

    for (let i = 0; i < payloads.length; i++) {
        const payload = payloads[i];

        try {
            await callBubbleWorkflow(config, workflowName, payload);
            results.push({ _id: payload._id, success: true });
            success++;
        } catch (error) {
            results.push({
                _id: payload._id,
                success: false,
                error: error.message
            });
            failed++;
        }

        // Rate limiting delay between requests
        if (i < payloads.length - 1 && delayMs > 0) {
            await new Promise(resolve => setTimeout(resolve, delayMs));
        }
    }

    console.log(`[BubblePush] Batch complete: ${success} success, ${failed} failed`);

    return { success, failed, results };
}
