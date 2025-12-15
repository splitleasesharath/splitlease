/**
 * Workflow Orchestrator Edge Function
 * Split Lease - Workflow Orchestration System
 *
 * HOLLOW ORCHESTRATOR - Contains NO workflow logic.
 * Reads workflow steps from pgmq messages and executes them sequentially.
 *
 * Triggered by:
 * - pg_net trigger (immediate, on workflow_executions INSERT)
 * - pg_cron backup (every 30 seconds)
 */

import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { corsHeaders } from "../_shared/cors.ts";
import { createErrorCollector } from "../_shared/slack.ts";
import type { WorkflowStep, QueueMessage } from "./lib/types.ts";

Deno.serve(async (req: Request) => {
    if (req.method === "OPTIONS") {
        return new Response("ok", { headers: corsHeaders });
    }

    const collector = createErrorCollector("workflow-orchestrator", "process");

    try {
        const supabase = createClient(
            Deno.env.get("SUPABASE_URL")!,
            Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
        );

        const { payload } = await req.json();
        const triggeredBy = payload?.triggered_by || "unknown";

        console.log(`[orchestrator] Triggered by: ${triggeredBy}`);

        // Read from queue with visibility timeout
        const { data: messages, error: readError } = await supabase
            .schema("pgmq_public")
            .rpc("read", {
                queue_name: "workflow_queue",
                sleep_seconds: 60,  // Visibility timeout
                n: 1                // Process one at a time for now
            });

        if (readError) {
            throw new Error(`Failed to read queue: ${readError.message}`);
        }

        if (!messages || messages.length === 0) {
            console.log("[orchestrator] Queue empty");
            return new Response(JSON.stringify({ success: true, data: { processed: 0 } }), {
                headers: { ...corsHeaders, "Content-Type": "application/json" }
            });
        }

        const msg = messages[0] as QueueMessage;
        const { execution_id, steps, current_step, context } = msg.message;

        console.log(`[orchestrator] Processing execution ${execution_id}, step ${current_step + 1}/${steps.length}`);

        // Update execution status to running
        await supabase
            .from("workflow_executions")
            .update({
                status: "running",
                current_step,
                started_at: new Date().toISOString()
            })
            .eq("id", execution_id);

        // Get current step definition
        const step = steps[current_step];

        try {
            // Interpolate payload template with context
            const interpolatedPayload = interpolateTemplate(step.payload_template, context);

            // Execute the step by calling the target Edge Function
            const result = await executeStep(step.function, step.action, interpolatedPayload);

            // Merge result into context for next step
            const newContext = { ...context, [`step_${current_step}_result`]: result, ...result };

            // Check if there are more steps
            if (current_step + 1 < steps.length) {
                // Enqueue next step
                await supabase.schema("pgmq_public").rpc("send", {
                    queue_name: "workflow_queue",
                    message: {
                        ...msg.message,
                        current_step: current_step + 1,
                        context: newContext
                    }
                });

                // Update execution
                await supabase
                    .from("workflow_executions")
                    .update({ current_step: current_step + 1, context: newContext })
                    .eq("id", execution_id);

            } else {
                // Workflow complete
                await supabase
                    .from("workflow_executions")
                    .update({
                        status: "completed",
                        context: newContext,
                        completed_at: new Date().toISOString()
                    })
                    .eq("id", execution_id);

                console.log(`[orchestrator] Workflow ${execution_id} completed`);
            }

            // Delete message from queue (success)
            await supabase.schema("pgmq_public").rpc("delete", {
                queue_name: "workflow_queue",
                message_id: msg.msg_id
            });

        } catch (stepError) {
            console.error(`[orchestrator] Step ${step.name} failed:`, stepError);

            // Handle based on on_failure policy
            if (step.on_failure === "abort") {
                await supabase
                    .from("workflow_executions")
                    .update({
                        status: "failed",
                        error_message: (stepError as Error).message,
                        error_step: step.name,
                        completed_at: new Date().toISOString()
                    })
                    .eq("id", execution_id);

                // Delete from queue
                await supabase.schema("pgmq_public").rpc("delete", {
                    queue_name: "workflow_queue",
                    message_id: msg.msg_id
                });

            } else if (step.on_failure === "continue") {
                // Skip this step, continue to next
                const newContext = {
                    ...context,
                    [`step_${current_step}_error`]: (stepError as Error).message
                };

                if (current_step + 1 < steps.length) {
                    await supabase.schema("pgmq_public").rpc("send", {
                        queue_name: "workflow_queue",
                        message: { ...msg.message, current_step: current_step + 1, context: newContext }
                    });
                } else {
                    // Last step failed but policy is continue, mark as completed with error context
                    await supabase
                        .from("workflow_executions")
                        .update({
                            status: "completed",
                            context: newContext,
                            completed_at: new Date().toISOString()
                        })
                        .eq("id", execution_id);
                }

                await supabase.schema("pgmq_public").rpc("delete", {
                    queue_name: "workflow_queue",
                    message_id: msg.msg_id
                });

            } else {
                // retry - let visibility timeout expire, message will reappear
                // read_ct will increment, after 5 reads DLQ cleanup will move it
                await supabase
                    .from("workflow_executions")
                    .update({
                        retry_count: msg.read_ct,
                        error_message: (stepError as Error).message,
                        error_step: step.name
                    })
                    .eq("id", execution_id);
            }

            collector.add(stepError as Error, `Step ${step.name} in workflow ${execution_id}`);
        }

        return new Response(JSON.stringify({ success: true, data: { processed: 1 } }), {
            headers: { ...corsHeaders, "Content-Type": "application/json" }
        });

    } catch (error) {
        console.error("[orchestrator] Fatal error:", error);
        collector.add(error as Error, "Fatal orchestrator error");
        collector.reportToSlack();

        return new Response(JSON.stringify({ success: false, error: (error as Error).message }), {
            status: 500,
            headers: { ...corsHeaders, "Content-Type": "application/json" }
        });
    }
});

/**
 * Execute a workflow step by calling an Edge Function
 */
async function executeStep(
    functionName: string,
    action: string,
    payload: Record<string, unknown>
): Promise<Record<string, unknown>> {
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const serviceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;

    console.log(`[orchestrator] Executing ${functionName}/${action}`);

    const response = await fetch(`${supabaseUrl}/functions/v1/${functionName}`, {
        method: "POST",
        headers: {
            "Authorization": `Bearer ${serviceKey}`,
            "Content-Type": "application/json"
        },
        body: JSON.stringify({ action, payload })
    });

    const result = await response.json();

    if (!response.ok || result.success === false) {
        throw new Error(result.error || `${functionName}/${action} failed with status ${response.status}`);
    }

    return result.data || result;
}

/**
 * Interpolate template variables with context values
 * Supports {{variable}} and {{nested.path}} syntax
 */
function interpolateTemplate(
    template: Record<string, unknown>,
    context: Record<string, unknown>
): Record<string, unknown> {
    const interpolated: Record<string, unknown> = {};

    for (const [key, value] of Object.entries(template)) {
        if (typeof value === "string") {
            // Replace {{variable}} or {{nested.path}} with context value
            interpolated[key] = value.replace(/\{\{\s*([\w.]+)\s*\}\}/g, (_, varPath) => {
                const result = getNestedValue(context, varPath);
                return result !== undefined ? String(result) : "";
            });
        } else if (Array.isArray(value)) {
            interpolated[key] = value.map(item =>
                typeof item === "object" && item !== null
                    ? interpolateTemplate(item as Record<string, unknown>, context)
                    : item
            );
        } else if (typeof value === "object" && value !== null) {
            interpolated[key] = interpolateTemplate(value as Record<string, unknown>, context);
        } else {
            interpolated[key] = value;
        }
    }

    return interpolated;
}

/**
 * Get nested value from object using dot notation
 */
function getNestedValue(obj: Record<string, unknown>, path: string): unknown {
    return path.split(".").reduce((current: unknown, key: string) => {
        if (current && typeof current === "object") {
            return (current as Record<string, unknown>)[key];
        }
        return undefined;
    }, obj);
}
