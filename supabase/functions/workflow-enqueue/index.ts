/**
 * Workflow Enqueue Edge Function
 * Split Lease - Workflow Orchestration System
 *
 * Receives workflow requests from frontend, validates payload against
 * workflow definition, and enqueues to pgmq for orchestration.
 *
 * VALIDATION (Dual-level, fail-fast):
 * 1. required_fields - Explicit fields defined in workflow definition
 * 2. template_variables - ALL {{placeholders}} extracted from step payload_templates
 *
 * This dual validation ensures no workflow starts with missing data.
 *
 * Request: { action: "enqueue", payload: { workflow: "name", data: {...} } }
 * Response: { execution_id, workflow_name, status: "queued" }
 */

import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { corsHeaders } from "../_shared/cors.ts";
import { ValidationError, formatErrorResponse, getStatusCodeFromError } from "../_shared/errors.ts";
import { validateRequired } from "../_shared/validation.ts";

// ─────────────────────────────────────────────────────────────
// Constants
// ─────────────────────────────────────────────────────────────

const LOG_PREFIX = '[workflow-enqueue]'
const ALLOWED_ACTIONS = ["enqueue", "health", "status"] as const;

type Action = typeof ALLOWED_ACTIONS[number];

// ─────────────────────────────────────────────────────────────────────────────
// Template Variable Extraction & Validation
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Recursively extract all {{variable}} placeholders from any object/array/string
 * Supports nested paths like {{step_0_result.message_id}}
 */
function extractTemplateVariables(obj: unknown, variables: Set<string> = new Set()): Set<string> {
    if (typeof obj === "string") {
        // Match {{variable}} or {{nested.path}}
        const regex = /\{\{\s*([\w.]+)\s*\}\}/g;
        let match;
        while ((match = regex.exec(obj)) !== null) {
            variables.add(match[1]);
        }
    } else if (Array.isArray(obj)) {
        for (const item of obj) {
            extractTemplateVariables(item, variables);
        }
    } else if (typeof obj === "object" && obj !== null) {
        for (const value of Object.values(obj)) {
            extractTemplateVariables(value, variables);
        }
    }
    return variables;
}

/**
 * Validate that all template variables are provided in data
 * Excludes step_N_result variables (populated at runtime by orchestrator)
 */
function validateTemplateVariables(
    steps: unknown[],
    data: Record<string, unknown>
): { valid: boolean; missing: string[]; stepResultVars: string[] } {
    const allVariables = new Set<string>();

    // Extract from all steps
    for (const step of steps) {
        extractTemplateVariables(step, allVariables);
    }

    const missing: string[] = [];
    const stepResultVars: string[] = [];

    for (const variable of allVariables) {
        // Variables like step_0_result, step_1_result.message_id are populated at runtime
        if (variable.startsWith("step_")) {
            stepResultVars.push(variable);
            continue;
        }

        // Check if variable exists in data (handle nested paths)
        const value = getNestedValue(data, variable);
        if (value === undefined) {
            missing.push(variable);
        }
    }

    return {
        valid: missing.length === 0,
        missing,
        stepResultVars
    };
}

/**
 * Get nested value from object using dot notation
 * e.g., getNestedValue({ user: { email: 'x' } }, 'user.email') => 'x'
 */
function getNestedValue(obj: Record<string, unknown>, path: string): unknown {
    return path.split(".").reduce((current: unknown, key: string) => {
        if (current && typeof current === "object") {
            return (current as Record<string, unknown>)[key];
        }
        return undefined;
    }, obj);
}

// ─────────────────────────────────────────────────────────────────────────────
// Main Handler
// ─────────────────────────────────────────────────────────────────────────────

Deno.serve(async (req: Request) => {
    // CORS
    if (req.method === "OPTIONS") {
        return new Response("ok", { headers: corsHeaders });
    }

    if (req.method !== "POST") {
        return new Response(JSON.stringify({ success: false, error: "Method not allowed" }), {
            status: 405,
            headers: { ...corsHeaders, "Content-Type": "application/json" }
        });
    }

    try {
        const { action, payload } = await req.json();
        validateRequired(action, "action");

        const supabase = createClient(
            Deno.env.get("SUPABASE_URL")!,
            Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
        );

        let result;

        switch (action) {
            case "enqueue":
                result = await handleEnqueue(supabase, payload);
                break;
            case "status":
                result = await handleStatus(supabase, payload);
                break;
            case "health":
                result = { status: "healthy", timestamp: new Date().toISOString() };
                break;
            default:
                throw new ValidationError(`Unknown action: ${action}`);
        }

        return new Response(JSON.stringify({ success: true, data: result }), {
            status: 200,
            headers: { ...corsHeaders, "Content-Type": "application/json" }
        });

    } catch (error) {
        const statusCode = getStatusCodeFromError(error as Error);
        return new Response(JSON.stringify(formatErrorResponse(error as Error)), {
            status: statusCode,
            headers: { ...corsHeaders, "Content-Type": "application/json" }
        });
    }
});

// deno-lint-ignore no-explicit-any
async function handleEnqueue(supabase: any, payload: any) {
    const { workflow, data, correlation_id } = payload;

    validateRequired(workflow, "workflow");
    validateRequired(data, "data");

    // 1. Look up workflow definition
    const { data: definition, error: defError } = await supabase
        .from("workflow_definitions")
        .select("*")
        .eq("name", workflow)
        .eq("active", true)
        .single();

    if (defError || !definition) {
        throw new ValidationError(`Workflow not found: ${workflow}`);
    }

    // 2. Validate required_fields (explicit list in definition)
    const missingRequiredFields = (definition.required_fields || [])
        .filter((field: string) => data[field] === undefined);

    if (missingRequiredFields.length > 0) {
        throw new ValidationError(
            `Missing required fields: ${missingRequiredFields.join(", ")}`
        );
    }

    // 3. Validate ALL template variables in steps (comprehensive check)
    const templateValidation = validateTemplateVariables(definition.steps, data);

    if (!templateValidation.valid) {
        throw new ValidationError(
            `Missing template variables: ${templateValidation.missing.join(", ")}. ` +
            `These placeholders exist in workflow steps but were not provided in data.`
        );
    }

    console.log(`[workflow-enqueue] Validation passed for '${workflow}'`);
    console.log(`[workflow-enqueue] - Required fields: ${definition.required_fields?.length || 0}`);
    console.log(`[workflow-enqueue] - Template variables validated: ${templateValidation.stepResultVars.length} runtime vars skipped`);

    // 4. Generate correlation ID for idempotency
    const correlationId = correlation_id || `${workflow}:${Date.now()}:${crypto.randomUUID()}`;

    // 5. Check idempotency
    const { data: existing } = await supabase
        .from("workflow_executions")
        .select("id, status")
        .eq("correlation_id", correlationId)
        .single();

    if (existing) {
        return {
            execution_id: existing.id,
            workflow_name: workflow,
            status: existing.status,
            message: "Workflow already exists (idempotent)"
        };
    }

    // 6. Create execution record
    const { data: execution, error: execError } = await supabase
        .from("workflow_executions")
        .insert({
            workflow_name: workflow,
            workflow_version: definition.version,
            status: "pending",
            current_step: 0,
            total_steps: definition.steps.length,
            input_payload: data,
            context: {},
            correlation_id: correlationId,
            triggered_by: "frontend"
        })
        .select()
        .single();

    if (execError) {
        throw new Error(`Failed to create execution: ${execError.message}`);
    }

    // 7. Enqueue to pgmq
    const queueMessage = {
        execution_id: execution.id,
        workflow_name: workflow,
        workflow_version: definition.version,
        steps: definition.steps,
        current_step: 0,
        context: data,  // Initial context is the input data
        visibility_timeout: definition.visibility_timeout,
        max_retries: definition.max_retries
    };

    const { error: queueError } = await supabase
        .schema("pgmq_public")
        .rpc("send", {
            queue_name: "workflow_queue",
            message: queueMessage
        });

    if (queueError) {
        // Rollback execution record
        await supabase.from("workflow_executions").delete().eq("id", execution.id);
        throw new Error(`Failed to enqueue workflow: ${queueError.message}`);
    }

    return {
        execution_id: execution.id,
        workflow_name: workflow,
        status: "queued",
        total_steps: definition.steps.length
    };
}

// deno-lint-ignore no-explicit-any
async function handleStatus(supabase: any, payload: any) {
    const { execution_id } = payload;
    validateRequired(execution_id, "execution_id");

    const { data: execution, error } = await supabase
        .from("workflow_executions")
        .select("*")
        .eq("id", execution_id)
        .single();

    if (error || !execution) {
        throw new ValidationError(`Execution not found: ${execution_id}`);
    }

    return execution;
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
    ALLOWED_ACTIONS,

    // Template Variable Extraction (Pure)
    extractTemplateVariables,
    validateTemplateVariables,
    getNestedValue,

    // Action Handlers
    handleEnqueue,
    handleStatus,
})
