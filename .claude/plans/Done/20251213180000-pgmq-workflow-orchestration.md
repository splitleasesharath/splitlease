# Implementation Plan: pgmq Workflow Orchestration System

**Created**: 2025-12-13
**Status**: New
**Type**: BUILD
**Complexity**: High (Multi-phase infrastructure + Edge Function development)

---

## Executive Summary

This plan implements an event-driven workflow orchestration system using PostgreSQL's native `pgmq` extension. The system allows the frontend to trigger named workflows (e.g., "proposal_accepted") which are then executed as a sequence of Edge Function calls, managed by a hollow orchestrator that reads workflow definitions from the database.

### Architecture Overview

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                     EVENT-DRIVEN WORKFLOW ORCHESTRATION                      │
├─────────────────────────────────────────────────────────────────────────────┤
│                                                                             │
│  FRONTEND                                                                   │
│     │                                                                       │
│     │  POST: { workflow: "proposal_accepted", payload: {...} }              │
│     ▼                                                                       │
│  ┌─────────────────────────────────────────────────────────────────────┐    │
│  │  workflow-enqueue Edge Function                                     │    │
│  │  - Looks up workflow_definitions table                              │    │
│  │  - Validates payload against required_fields                        │    │
│  │  - Enqueues to pgmq with steps + context                            │    │
│  └─────────────────────────────────────────────────────────────────────┘    │
│                          │                                                  │
│                          ▼                                                  │
│  ┌─────────────────────────────────────────────────────────────────────┐    │
│  │  PGMQ: workflow_queue                                               │    │
│  │  - Visibility timeout (auto-reappear on failure)                    │    │
│  │  - Read count tracking (for DLQ logic)                              │    │
│  │  - Built-in metrics                                                 │    │
│  └─────────────────────────────────────────────────────────────────────┘    │
│                          │                                                  │
│                          │  pg_net trigger (immediate) OR pg_cron (backup)  │
│                          ▼                                                  │
│  ┌─────────────────────────────────────────────────────────────────────┐    │
│  │  workflow-orchestrator Edge Function (HOLLOW)                       │    │
│  │  - Reads message from queue                                         │    │
│  │  - Executes current_step                                            │    │
│  │  - Advances to next step or completes                               │    │
│  │  - Passes context forward between steps                             │    │
│  └─────────────────────────────────────────────────────────────────────┘    │
│                          │                                                  │
│            ┌─────────────┼─────────────┬─────────────┐                      │
│            ▼             ▼             ▼             ▼                      │
│       ┌─────────┐  ┌─────────┐  ┌─────────┐  ┌─────────┐                    │
│       │send-email│  │proposal │  │bubble-  │  │ slack   │                   │
│       │         │  │         │  │sync     │  │         │                    │
│       └─────────┘  └─────────┘  └─────────┘  └─────────┘                    │
│                                                                             │
└─────────────────────────────────────────────────────────────────────────────┘
```

---

## Context from Conversation

### Key Design Decisions Made

1. **pgmq over custom sync_queue for workflows** - Native visibility timeouts, metrics, and DLQ support
2. **Keep sync_queue for Bubble sync** - Existing pattern works, no migration needed
3. **Hollow orchestrator pattern** - No hardcoded workflow logic in Edge Function
4. **Workflow definitions in database** - Centralized, versionable, no redeploy to change
5. **Event-driven triggers** - pg_net for immediate execution, pg_cron as backup
6. **Frontend triggers workflows by name** - Decoupled from implementation details
7. **Template variable validation at enqueue** - Catch missing placeholders before workflow runs, fail fast

### Relationship to Existing Infrastructure

| Component | Status | Relationship |
|-----------|--------|--------------|
| `sync_queue` table | Exists (local migration) | **Keep separate** - for Bubble sync only |
| `pg_cron` | Migration exists (not pushed) | **Reuse** - will also power workflow backup |
| `pg_net` | Migration exists (not pushed) | **Reuse** - will trigger orchestrator |
| `bubble_sync` Edge Function | Exists | **Unchanged** - continues Bubble sync duties |
| `send-email` Edge Function | Exists | **Will be orchestrated** - called by workflows |

---

## Phase 1: Database Infrastructure

### 1.1 Enable pgmq Extension

**File**: `supabase/migrations/20251213_enable_pgmq.sql`

```sql
-- ============================================================================
-- Enable pgmq Extension for Workflow Queues
-- ============================================================================

CREATE EXTENSION IF NOT EXISTS pgmq;

-- Create the workflow queue
SELECT pgmq.create('workflow_queue');

-- Create dead letter queue for failed workflows
SELECT pgmq.create('workflow_dlq');

-- Log completion
DO $$
BEGIN
  RAISE LOG 'pgmq extension enabled and workflow queues created';
END $$;
```

### 1.2 Create Workflow Definitions Table

**File**: `supabase/migrations/20251213_create_workflow_definitions.sql`

```sql
-- ============================================================================
-- Workflow Definitions Table
-- Stores named workflow configurations with their step sequences
-- ============================================================================

CREATE TABLE IF NOT EXISTS workflow_definitions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),

    -- Workflow identity
    name TEXT UNIQUE NOT NULL,              -- 'proposal_accepted', 'listing_submitted'
    description TEXT,                       -- Human-readable description

    -- Workflow configuration
    steps JSONB NOT NULL,                   -- Array of step definitions
    /*
    steps structure:
    [
      {
        "name": "send_acceptance_email",
        "function": "send-email",
        "action": "send",
        "payload_template": {
          "template_id": "proposal_accepted_template",
          "to_email": "{{guest_email}}",
          "variables": {
            "guest_name": "{{guest_name}}",
            "listing_address": "{{listing_address}}"
          }
        },
        "on_failure": "continue" | "abort" | "retry"
      },
      ...
    ]
    */

    -- Required input fields (validated on enqueue)
    required_fields TEXT[] DEFAULT '{}',    -- ['proposal_id', 'guest_email', ...]

    -- Execution settings
    timeout_seconds INTEGER DEFAULT 300,    -- Max time for entire workflow
    visibility_timeout INTEGER DEFAULT 60,  -- pgmq visibility timeout per step
    max_retries INTEGER DEFAULT 3,          -- Per-step retry limit

    -- Status
    active BOOLEAN DEFAULT true,

    -- Metadata
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    created_by TEXT,
    version INTEGER DEFAULT 1
);

-- Indexes
CREATE INDEX IF NOT EXISTS idx_workflow_definitions_name
    ON workflow_definitions (name) WHERE active = true;

-- Update timestamp trigger
CREATE OR REPLACE FUNCTION update_workflow_definitions_timestamp()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    NEW.version = OLD.version + 1;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER workflow_definitions_updated
    BEFORE UPDATE ON workflow_definitions
    FOR EACH ROW
    EXECUTE FUNCTION update_workflow_definitions_timestamp();

-- RLS
ALTER TABLE workflow_definitions ENABLE ROW LEVEL SECURITY;
-- No policies = service role only

COMMENT ON TABLE workflow_definitions IS 'Named workflow configurations with step sequences for orchestration';
```

### 1.3 Create Workflow Executions Table (Audit/Status)

**File**: `supabase/migrations/20251213_create_workflow_executions.sql`

```sql
-- ============================================================================
-- Workflow Executions Table
-- Tracks each workflow execution instance for debugging and audit
-- ============================================================================

CREATE TABLE IF NOT EXISTS workflow_executions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),

    -- Workflow reference
    workflow_name TEXT NOT NULL,
    workflow_version INTEGER NOT NULL,

    -- Execution state
    status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN (
        'pending',      -- Queued, not started
        'running',      -- Currently executing
        'completed',    -- All steps finished successfully
        'failed',       -- Failed after retries
        'cancelled'     -- Manually cancelled
    )),
    current_step INTEGER DEFAULT 0,
    total_steps INTEGER NOT NULL,

    -- Input/Output
    input_payload JSONB NOT NULL,           -- Original payload from frontend
    context JSONB DEFAULT '{}',             -- Accumulated context from steps

    -- Error tracking
    error_message TEXT,
    error_step TEXT,
    retry_count INTEGER DEFAULT 0,

    -- Timing
    created_at TIMESTAMPTZ DEFAULT NOW(),
    started_at TIMESTAMPTZ,
    completed_at TIMESTAMPTZ,

    -- Correlation
    correlation_id TEXT UNIQUE,             -- For idempotency
    triggered_by TEXT                       -- 'frontend', 'cron', 'manual'
);

-- Indexes
CREATE INDEX IF NOT EXISTS idx_workflow_executions_status
    ON workflow_executions (status, created_at);
CREATE INDEX IF NOT EXISTS idx_workflow_executions_name
    ON workflow_executions (workflow_name, created_at);
CREATE INDEX IF NOT EXISTS idx_workflow_executions_correlation
    ON workflow_executions (correlation_id) WHERE correlation_id IS NOT NULL;

-- RLS
ALTER TABLE workflow_executions ENABLE ROW LEVEL SECURITY;

COMMENT ON TABLE workflow_executions IS 'Audit trail and status tracking for workflow executions';
```

### 1.4 Create pg_net Trigger for Immediate Execution

**File**: `supabase/migrations/20251213_workflow_immediate_trigger.sql`

```sql
-- ============================================================================
-- Immediate Workflow Trigger via pg_net
-- Fires orchestrator Edge Function when a workflow is enqueued
-- ============================================================================

-- Store secrets in Vault (must be done manually after migration)
-- SELECT vault.create_secret('https://YOUR-PROJECT.supabase.co', 'supabase_url');
-- SELECT vault.create_secret('YOUR-SERVICE-ROLE-KEY', 'service_role_key');

-- Function to trigger orchestrator immediately
CREATE OR REPLACE FUNCTION trigger_workflow_orchestrator()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    supabase_url TEXT;
    service_role_key TEXT;
BEGIN
    -- Get secrets from Vault
    SELECT decrypted_secret INTO supabase_url
    FROM vault.decrypted_secrets WHERE name = 'supabase_url';

    SELECT decrypted_secret INTO service_role_key
    FROM vault.decrypted_secrets WHERE name = 'service_role_key';

    -- Skip if secrets not configured
    IF supabase_url IS NULL OR service_role_key IS NULL THEN
        RAISE WARNING 'Vault secrets not configured, skipping immediate trigger';
        RETURN NEW;
    END IF;

    -- Fire orchestrator via pg_net (non-blocking)
    PERFORM net.http_post(
        url := supabase_url || '/functions/v1/workflow-orchestrator',
        headers := jsonb_build_object(
            'Content-Type', 'application/json',
            'Authorization', 'Bearer ' || service_role_key
        ),
        body := jsonb_build_object(
            'action', 'process',
            'payload', jsonb_build_object('triggered_by', 'pg_net_trigger')
        ),
        timeout_milliseconds := 5000
    );

    RETURN NEW;
EXCEPTION
    WHEN OTHERS THEN
        -- Log but don't fail - cron will pick up the workflow
        RAISE WARNING 'trigger_workflow_orchestrator failed: %', SQLERRM;
        RETURN NEW;
END;
$$;

-- Note: The trigger itself will be created by the enqueue function
-- when it inserts into workflow_executions with status='pending'

CREATE TRIGGER workflow_executions_pending_trigger
    AFTER INSERT ON workflow_executions
    FOR EACH ROW
    WHEN (NEW.status = 'pending')
    EXECUTE FUNCTION trigger_workflow_orchestrator();

-- Grant permissions
GRANT EXECUTE ON FUNCTION trigger_workflow_orchestrator() TO service_role;
```

### 1.5 Add pg_cron Backup Job

**File**: `supabase/migrations/20251213_workflow_cron_backup.sql`

```sql
-- ============================================================================
-- Backup Cron Job for Workflow Processing
-- Ensures workflows are processed even if pg_net trigger fails
-- ============================================================================

-- Function to invoke orchestrator via cron
CREATE OR REPLACE FUNCTION trigger_workflow_cron()
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    supabase_url TEXT;
    service_role_key TEXT;
    pending_count INTEGER;
BEGIN
    -- Check if there are pending workflows
    SELECT COUNT(*) INTO pending_count
    FROM pgmq.q_workflow_queue;

    IF pending_count = 0 THEN
        RETURN;
    END IF;

    -- Get secrets from Vault
    SELECT decrypted_secret INTO supabase_url
    FROM vault.decrypted_secrets WHERE name = 'supabase_url';

    SELECT decrypted_secret INTO service_role_key
    FROM vault.decrypted_secrets WHERE name = 'service_role_key';

    IF supabase_url IS NULL OR service_role_key IS NULL THEN
        RAISE WARNING 'Vault secrets not configured for workflow cron';
        RETURN;
    END IF;

    RAISE LOG 'workflow_cron: Found % pending workflows, triggering orchestrator', pending_count;

    PERFORM net.http_post(
        url := supabase_url || '/functions/v1/workflow-orchestrator',
        headers := jsonb_build_object(
            'Content-Type', 'application/json',
            'Authorization', 'Bearer ' || service_role_key
        ),
        body := jsonb_build_object(
            'action', 'process',
            'payload', jsonb_build_object('triggered_by', 'cron_backup')
        ),
        timeout_milliseconds := 10000
    );

EXCEPTION
    WHEN OTHERS THEN
        RAISE WARNING 'trigger_workflow_cron failed: %', SQLERRM;
END;
$$;

-- Schedule cron job: every 30 seconds
SELECT cron.unschedule('workflow-orchestrator-backup')
WHERE EXISTS (SELECT 1 FROM cron.job WHERE jobname = 'workflow-orchestrator-backup');

SELECT cron.schedule(
    'workflow-orchestrator-backup',
    '30 seconds',
    'SELECT trigger_workflow_cron()'
);

-- DLQ cleanup: move workflows with read_ct >= 5 to DLQ
CREATE OR REPLACE FUNCTION move_failed_workflows_to_dlq()
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    moved_count INTEGER := 0;
BEGIN
    -- Move messages that have been read 5+ times to DLQ
    WITH failed_messages AS (
        SELECT msg_id, message
        FROM pgmq.q_workflow_queue
        WHERE read_ct >= 5
    ),
    archived AS (
        SELECT pgmq.send('workflow_dlq', message)
        FROM failed_messages
    )
    SELECT COUNT(*) INTO moved_count FROM failed_messages;

    -- Delete from main queue
    DELETE FROM pgmq.q_workflow_queue WHERE read_ct >= 5;

    IF moved_count > 0 THEN
        RAISE LOG 'move_failed_workflows_to_dlq: Moved % workflows to DLQ', moved_count;
    END IF;
END;
$$;

-- Schedule DLQ cleanup: every 5 minutes
SELECT cron.unschedule('workflow-dlq-cleanup')
WHERE EXISTS (SELECT 1 FROM cron.job WHERE jobname = 'workflow-dlq-cleanup');

SELECT cron.schedule(
    'workflow-dlq-cleanup',
    '*/5 * * * *',
    'SELECT move_failed_workflows_to_dlq()'
);

GRANT EXECUTE ON FUNCTION trigger_workflow_cron() TO service_role;
GRANT EXECUTE ON FUNCTION move_failed_workflows_to_dlq() TO service_role;
```

---

## Phase 2: Edge Functions

### 2.1 Workflow Enqueue Edge Function

**File**: `supabase/functions/workflow-enqueue/index.ts`

This function receives workflow requests from the frontend, validates them against both `required_fields` AND all `{{template_variables}}` found in step definitions, then enqueues to pgmq.

```typescript
/**
 * Workflow Enqueue Edge Function
 *
 * Receives workflow requests from frontend, validates payload against
 * workflow definition, and enqueues to pgmq for orchestration.
 *
 * VALIDATION:
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

const ALLOWED_ACTIONS = ["enqueue", "health", "status"] as const;

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
```

### 2.1.1 Validation Behavior

The enqueue function now performs **two levels of validation**:

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                    DUAL VALIDATION AT ENQUEUE TIME                           │
├─────────────────────────────────────────────────────────────────────────────┤
│                                                                             │
│  LEVEL 1: required_fields (Explicit)                                        │
│  ────────────────────────────────────                                       │
│  Defined in workflow_definitions table:                                     │
│  required_fields: ['guest_email', 'guest_name', 'email_template_id']        │
│                                                                             │
│  ✓ Fast check against explicit list                                         │
│  ✓ Documents "must have" fields for the workflow                            │
│  ✗ May not catch all placeholders if definition is incomplete               │
│                                                                             │
│  LEVEL 2: template_variables (Comprehensive)                                │
│  ───────────────────────────────────────────                                │
│  Scans ALL {{placeholders}} in ALL steps:                                   │
│                                                                             │
│  steps: [                                                                   │
│    { payload_template: { "to_email": "{{guest_email}}" } },                 │
│    { payload_template: { "address": "{{listing_address}}" } }  ◄── FOUND    │
│  ]                                                                          │
│                                                                             │
│  ✓ Catches ALL placeholders regardless of required_fields                   │
│  ✓ Prevents silent "" values in emails                                      │
│  ✓ Skips step_N_result.* variables (populated at runtime)                   │
│                                                                             │
│  RESULT: If ANY variable is missing → 400 error with specific message       │
│                                                                             │
│  Error: "Missing template variables: listing_address. These placeholders    │
│          exist in workflow steps but were not provided in data."            │
│                                                                             │
└─────────────────────────────────────────────────────────────────────────────┘
```

### 2.1.2 Runtime Variables (Skipped)

Variables that start with `step_` are skipped during validation because they're populated by the orchestrator at runtime:

| Variable Pattern | Populated By | When |
|------------------|--------------|------|
| `{{step_0_result}}` | Orchestrator | After Step 0 completes |
| `{{step_0_result.message_id}}` | Orchestrator | After Step 0 completes |
| `{{step_1_result.sent_at}}` | Orchestrator | After Step 1 completes |

These are legitimate placeholders that can't be validated at enqueue time.

### 2.2 Workflow Orchestrator Edge Function

**File**: `supabase/functions/workflow-orchestrator/index.ts`

The hollow orchestrator that processes workflow steps.

```typescript
/**
 * Workflow Orchestrator Edge Function
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

interface WorkflowStep {
    name: string;
    function: string;
    action: string;
    payload_template: Record<string, unknown>;
    on_failure: "continue" | "abort" | "retry";
}

interface QueueMessage {
    msg_id: number;
    read_ct: number;
    message: {
        execution_id: string;
        workflow_name: string;
        workflow_version: number;
        steps: WorkflowStep[];
        current_step: number;
        context: Record<string, unknown>;
        visibility_timeout: number;
        max_retries: number;
    };
}

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
 * Supports {{variable}} syntax
 */
function interpolateTemplate(
    template: Record<string, unknown>,
    context: Record<string, unknown>
): Record<string, unknown> {
    const interpolated: Record<string, unknown> = {};

    for (const [key, value] of Object.entries(template)) {
        if (typeof value === "string") {
            // Replace {{variable}} with context value
            interpolated[key] = value.replace(/\{\{\s*(\w+)\s*\}\}/g, (_, varName) => {
                return String(context[varName] ?? "");
            });
        } else if (typeof value === "object" && value !== null) {
            interpolated[key] = interpolateTemplate(value as Record<string, unknown>, context);
        } else {
            interpolated[key] = value;
        }
    }

    return interpolated;
}
```

### 2.3 Shared Types

**File**: `supabase/functions/workflow-orchestrator/lib/types.ts`

```typescript
export interface WorkflowStep {
    name: string;
    function: string;
    action: string;
    payload_template: Record<string, unknown>;
    on_failure: "continue" | "abort" | "retry";
}

export interface WorkflowDefinition {
    id: string;
    name: string;
    description?: string;
    steps: WorkflowStep[];
    required_fields: string[];
    timeout_seconds: number;
    visibility_timeout: number;
    max_retries: number;
    active: boolean;
    version: number;
}

export interface WorkflowExecution {
    id: string;
    workflow_name: string;
    workflow_version: number;
    status: "pending" | "running" | "completed" | "failed" | "cancelled";
    current_step: number;
    total_steps: number;
    input_payload: Record<string, unknown>;
    context: Record<string, unknown>;
    error_message?: string;
    error_step?: string;
    retry_count: number;
    correlation_id?: string;
    triggered_by: string;
    created_at: string;
    started_at?: string;
    completed_at?: string;
}

export interface QueueMessage {
    msg_id: number;
    read_ct: number;
    vt: string;
    enqueued_at: string;
    message: {
        execution_id: string;
        workflow_name: string;
        workflow_version: number;
        steps: WorkflowStep[];
        current_step: number;
        context: Record<string, unknown>;
        visibility_timeout: number;
        max_retries: number;
    };
}
```

### 2.4 Config Files

**File**: `supabase/functions/workflow-enqueue/deno.json`

```json
{
  "imports": {
    "@supabase/supabase-js": "https://esm.sh/@supabase/supabase-js@2"
  }
}
```

**File**: `supabase/functions/workflow-orchestrator/deno.json`

```json
{
  "imports": {
    "@supabase/supabase-js": "https://esm.sh/@supabase/supabase-js@2"
  }
}
```

---

## Phase 3: Initial Workflow Definitions

### 3.1 Seed Workflow Definitions

**File**: `supabase/migrations/20251213_seed_workflow_definitions.sql`

```sql
-- ============================================================================
-- Seed Initial Workflow Definitions
-- ============================================================================

INSERT INTO workflow_definitions (name, description, steps, required_fields, timeout_seconds, visibility_timeout, max_retries)
VALUES
-- Proposal Accepted Workflow
(
    'proposal_accepted',
    'Sends email notification when a proposal is accepted',
    '[
        {
            "name": "send_acceptance_email",
            "function": "send-email",
            "action": "send",
            "payload_template": {
                "template_id": "{{email_template_id}}",
                "to_email": "{{guest_email}}",
                "to_name": "{{guest_name}}",
                "variables": {
                    "guest_name": "{{guest_name}}",
                    "host_name": "{{host_name}}",
                    "listing_address": "{{listing_address}}",
                    "start_date": "{{start_date}}",
                    "end_date": "{{end_date}}",
                    "monthly_rent": "{{monthly_rent}}"
                }
            },
            "on_failure": "retry"
        }
    ]'::jsonb,
    ARRAY['guest_email', 'guest_name', 'email_template_id'],
    300,
    60,
    3
),

-- Listing Submitted Workflow
(
    'listing_submitted',
    'Handles post-listing submission tasks: email confirmation, Slack notification, Bubble sync',
    '[
        {
            "name": "send_confirmation_email",
            "function": "send-email",
            "action": "send",
            "payload_template": {
                "template_id": "{{email_template_id}}",
                "to_email": "{{host_email}}",
                "to_name": "{{host_name}}",
                "variables": {
                    "host_name": "{{host_name}}",
                    "listing_address": "{{listing_address}}",
                    "listing_id": "{{listing_id}}"
                }
            },
            "on_failure": "continue"
        },
        {
            "name": "notify_slack",
            "function": "slack",
            "action": "faq_inquiry",
            "payload_template": {
                "message": "New listing submitted: {{listing_address}} by {{host_name}}",
                "channel": "acquisition"
            },
            "on_failure": "continue"
        }
    ]'::jsonb,
    ARRAY['host_email', 'host_name', 'listing_address', 'listing_id', 'email_template_id'],
    600,
    60,
    3
),

-- User Signup Workflow
(
    'user_signup_complete',
    'Post-signup tasks: welcome email, Bubble sync',
    '[
        {
            "name": "send_welcome_email",
            "function": "send-email",
            "action": "send",
            "payload_template": {
                "template_id": "{{welcome_email_template_id}}",
                "to_email": "{{user_email}}",
                "to_name": "{{user_name}}",
                "variables": {
                    "first_name": "{{first_name}}",
                    "signup_date": "{{signup_date}}"
                }
            },
            "on_failure": "retry"
        }
    ]'::jsonb,
    ARRAY['user_email', 'user_name', 'first_name', 'welcome_email_template_id'],
    300,
    60,
    3
)
ON CONFLICT (name) DO NOTHING;

-- Log completion
DO $$
BEGIN
    RAISE LOG 'Seeded % workflow definitions', (SELECT COUNT(*) FROM workflow_definitions);
END $$;
```

---

## Phase 4: Frontend Integration

### 4.1 Workflow Client Utility

**File**: `app/src/lib/workflowClient.ts`

```typescript
/**
 * Workflow Client
 *
 * Utility for triggering workflows from the frontend.
 * Abstracts the Edge Function call and provides type safety.
 */

import { supabase } from './supabase';

export interface WorkflowResult {
    execution_id: string;
    workflow_name: string;
    status: 'queued' | 'pending' | 'running' | 'completed' | 'failed';
    total_steps?: number;
    message?: string;
}

export interface WorkflowStatusResult {
    id: string;
    workflow_name: string;
    status: string;
    current_step: number;
    total_steps: number;
    context: Record<string, unknown>;
    error_message?: string;
    error_step?: string;
    created_at: string;
    started_at?: string;
    completed_at?: string;
}

/**
 * Trigger a named workflow with the provided data
 *
 * @param workflow - The workflow name (e.g., 'proposal_accepted')
 * @param data - The payload data required by the workflow
 * @param correlationId - Optional idempotency key
 */
export async function triggerWorkflow(
    workflow: string,
    data: Record<string, unknown>,
    correlationId?: string
): Promise<WorkflowResult> {
    const { data: session } = await supabase.auth.getSession();

    const response = await supabase.functions.invoke('workflow-enqueue', {
        body: {
            action: 'enqueue',
            payload: {
                workflow,
                data,
                correlation_id: correlationId
            }
        }
    });

    if (response.error) {
        throw new Error(response.error.message || 'Failed to trigger workflow');
    }

    return response.data.data;
}

/**
 * Check the status of a workflow execution
 *
 * @param executionId - The execution ID returned from triggerWorkflow
 */
export async function getWorkflowStatus(executionId: string): Promise<WorkflowStatusResult> {
    const response = await supabase.functions.invoke('workflow-enqueue', {
        body: {
            action: 'status',
            payload: { execution_id: executionId }
        }
    });

    if (response.error) {
        throw new Error(response.error.message || 'Failed to get workflow status');
    }

    return response.data.data;
}

/**
 * Poll workflow status until completion or timeout
 *
 * @param executionId - The execution ID to poll
 * @param options - Polling options
 */
export async function waitForWorkflow(
    executionId: string,
    options: {
        pollInterval?: number;
        timeout?: number;
        onProgress?: (status: WorkflowStatusResult) => void;
    } = {}
): Promise<WorkflowStatusResult> {
    const { pollInterval = 2000, timeout = 60000, onProgress } = options;
    const startTime = Date.now();

    while (Date.now() - startTime < timeout) {
        const status = await getWorkflowStatus(executionId);

        if (onProgress) {
            onProgress(status);
        }

        if (status.status === 'completed' || status.status === 'failed' || status.status === 'cancelled') {
            return status;
        }

        await new Promise(resolve => setTimeout(resolve, pollInterval));
    }

    throw new Error(`Workflow ${executionId} timed out after ${timeout}ms`);
}
```

### 4.2 Usage Example

```typescript
// In a proposal acceptance handler
import { triggerWorkflow, waitForWorkflow } from '@/lib/workflowClient';

async function handleProposalAccepted(proposal: Proposal) {
    // Trigger the workflow
    const result = await triggerWorkflow('proposal_accepted', {
        guest_email: proposal.guest.email,
        guest_name: proposal.guest.name,
        host_name: proposal.host.name,
        listing_address: proposal.listing.address,
        start_date: proposal.startDate,
        end_date: proposal.endDate,
        monthly_rent: proposal.monthlyRent,
        email_template_id: 'proposal_accepted_template'
    });

    console.log('Workflow queued:', result.execution_id);

    // Optionally wait for completion
    const finalStatus = await waitForWorkflow(result.execution_id, {
        onProgress: (status) => {
            console.log(`Step ${status.current_step + 1}/${status.total_steps}`);
        }
    });

    if (finalStatus.status === 'failed') {
        console.error('Workflow failed:', finalStatus.error_message);
    }
}
```

---

## Phase 5: Configuration & Deployment

### 5.1 Update config.toml

Add new Edge Functions to `supabase/config.toml`:

```toml
[functions.workflow-enqueue]
enabled = true
verify_jwt = false
import_map = "./functions/workflow-enqueue/deno.json"
entrypoint = "./functions/workflow-enqueue/index.ts"

[functions.workflow-orchestrator]
enabled = true
verify_jwt = false
import_map = "./functions/workflow-orchestrator/deno.json"
entrypoint = "./functions/workflow-orchestrator/index.ts"
```

### 5.2 Vault Secrets (Manual Step)

After migrations are pushed, run in Supabase SQL Editor:

```sql
-- Create vault secrets for pg_net triggers
SELECT vault.create_secret(
    'https://YOUR-PROJECT-REF.supabase.co',
    'supabase_url',
    'Supabase project URL for workflow orchestration'
);

SELECT vault.create_secret(
    'YOUR-SERVICE-ROLE-KEY',
    'service_role_key',
    'Service role key for workflow orchestration'
);
```

### 5.3 Deployment Checklist

1. [ ] Push all migrations: `npx supabase db push`
2. [ ] Verify extensions enabled: `SELECT extname FROM pg_extension WHERE extname IN ('pgmq', 'pg_cron', 'pg_net');`
3. [ ] Create Vault secrets (manual SQL)
4. [ ] Deploy Edge Functions: `supabase functions deploy workflow-enqueue workflow-orchestrator`
5. [ ] Verify cron jobs: `SELECT jobname, schedule FROM cron.job;`
6. [ ] Test health endpoint: `POST /functions/v1/workflow-enqueue { "action": "health" }`
7. [ ] Test workflow enqueue with a test workflow

---

## File References

### New Files to Create

| File | Purpose |
|------|---------|
| `supabase/migrations/20251213_enable_pgmq.sql` | Enable pgmq extension |
| `supabase/migrations/20251213_create_workflow_definitions.sql` | Workflow definitions table |
| `supabase/migrations/20251213_create_workflow_executions.sql` | Execution audit table |
| `supabase/migrations/20251213_workflow_immediate_trigger.sql` | pg_net trigger |
| `supabase/migrations/20251213_workflow_cron_backup.sql` | pg_cron backup job |
| `supabase/migrations/20251213_seed_workflow_definitions.sql` | Initial workflow seeds |
| `supabase/functions/workflow-enqueue/index.ts` | Enqueue Edge Function |
| `supabase/functions/workflow-enqueue/deno.json` | Import map |
| `supabase/functions/workflow-orchestrator/index.ts` | Orchestrator Edge Function |
| `supabase/functions/workflow-orchestrator/deno.json` | Import map |
| `supabase/functions/workflow-orchestrator/lib/types.ts` | Shared types |
| `app/src/lib/workflowClient.ts` | Frontend utility |

### Existing Files to Modify

| File | Modification |
|------|--------------|
| `supabase/config.toml` | Add workflow function entries |

### Reference Files (No Changes)

| File | Relevance |
|------|-----------|
| `supabase/functions/send-email/*` | Target for workflow steps |
| `supabase/functions/_shared/cors.ts` | Reuse CORS headers |
| `supabase/functions/_shared/errors.ts` | Reuse error utilities |
| `supabase/functions/_shared/slack.ts` | Reuse error collection |
| `supabase/functions/_shared/queueSync.ts` | Reference for queue patterns |
| `supabase/migrations/20251210_queue_processing_cron.sql` | Reference for cron patterns |

---

## Summary

This implementation creates a complete event-driven workflow orchestration system:

1. **Frontend** triggers workflows by name via `workflow-enqueue` Edge Function
2. **workflow_definitions** table stores step sequences (no code changes to add/modify workflows)
3. **pgmq** provides durable message queue with visibility timeouts and retry tracking
4. **workflow-orchestrator** (hollow) reads queue, executes steps, manages state
5. **pg_net trigger** provides immediate execution
6. **pg_cron backup** ensures processing even if triggers fail
7. **workflow_executions** provides audit trail and status tracking
8. **Dual validation** at enqueue catches missing data before workflow starts (required_fields + template variable scanning)

The architecture mirrors Bubble's Backend Workflows but with full control, PostgreSQL durability, and no vendor lock-in.

---

## Validation Summary

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                    FAIL-FAST VALIDATION STRATEGY                             │
├─────────────────────────────────────────────────────────────────────────────┤
│                                                                             │
│  WITHOUT VALIDATION:                                                        │
│  ───────────────────                                                        │
│  Frontend sends data ──► Workflow starts ──► Step 2 fails silently          │
│                                              (blank email sent)             │
│                                                                             │
│  WITH VALIDATION (This Plan):                                               │
│  ────────────────────────────                                               │
│  Frontend sends data ──► Enqueue validates ──► 400 Error (immediate)        │
│                          │                                                  │
│                          ├─ Check required_fields                           │
│                          └─ Scan ALL {{placeholders}} in ALL steps          │
│                                                                             │
│  Result: Bugs caught at trigger time, not at Step N execution time          │
│                                                                             │
└─────────────────────────────────────────────────────────────────────────────┘
```
