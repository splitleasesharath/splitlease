# Workflow System Edge Functions

**GENERATED**: 2026-01-20
**VERSION**: 1.0
**LOCATION**:
- `supabase/functions/workflow-enqueue/index.ts`
- `supabase/functions/workflow-orchestrator/index.ts`

---

## Overview

A two-part workflow orchestration system using pgmq (Postgres Message Queue). The system enables declarative, multi-step workflows that can call any Edge Function.

- **workflow-enqueue**: Receives workflow requests, validates payloads, and queues for execution
- **workflow-orchestrator**: Processes queued workflows step-by-step (hollow orchestrator pattern)

---

## workflow-enqueue

### Endpoint

`POST /functions/v1/workflow-enqueue`

### Actions

| Action | Purpose | Auth Required |
|--------|---------|---------------|
| `enqueue` | Queue a new workflow execution | No |
| `status` | Check execution status | No |
| `health` | Health check | No |

### Dual-Level Validation

The enqueue function performs comprehensive validation:

1. **required_fields**: Explicit fields defined in workflow definition
2. **template_variables**: ALL `{{placeholders}}` extracted from step payload_templates

```typescript
// Example: If a step has payload_template: { "to": "{{guest_email}}" }
// Then "guest_email" must be provided in the data

function validateTemplateVariables(
  steps: unknown[],
  data: Record<string, unknown>
): { valid: boolean; missing: string[]; stepResultVars: string[] }
```

### Request Format

```json
{
  "action": "enqueue",
  "payload": {
    "workflow": "proposal_accepted",
    "data": {
      "proposal_id": "uuid",
      "guest_email": "guest@example.com",
      "host_email": "host@example.com",
      "listing_name": "Cozy Brooklyn Apartment"
    },
    "correlation_id": "optional-idempotency-key"
  }
}
```

### Response Format

```json
{
  "success": true,
  "data": {
    "execution_id": "uuid",
    "workflow_name": "proposal_accepted",
    "status": "queued",
    "total_steps": 4
  }
}
```

### Idempotency

Using `correlation_id` prevents duplicate executions:

```json
{
  "success": true,
  "data": {
    "execution_id": "uuid",
    "workflow_name": "proposal_accepted",
    "status": "pending",
    "message": "Workflow already exists (idempotent)"
  }
}
```

---

## workflow-orchestrator

### Endpoint

`POST /functions/v1/workflow-orchestrator`

### Trigger Methods

1. **pg_net trigger**: Immediate execution on `workflow_executions` INSERT
2. **pg_cron backup**: Every 30 seconds for reliability

### Hollow Orchestrator Pattern

The orchestrator contains **NO workflow logic**. It simply:

1. Reads workflow steps from pgmq messages
2. Interpolates payload templates with context
3. Calls the target Edge Function
4. Merges results into context
5. Enqueues next step or marks complete

```typescript
// Step execution - calls any Edge Function
async function executeStep(
  functionName: string,
  action: string,
  payload: Record<string, unknown>
): Promise<Record<string, unknown>> {
  const response = await fetch(`${supabaseUrl}/functions/v1/${functionName}`, {
    method: "POST",
    headers: {
      "Authorization": `Bearer ${serviceKey}`,
      "Content-Type": "application/json"
    },
    body: JSON.stringify({ action, payload })
  });
  // ...
}
```

### Template Interpolation

Supports `{{variable}}` and `{{nested.path}}` syntax:

```typescript
// Input template
{
  "to": "{{guest_email}}",
  "subject": "Your booking at {{listing_name}}",
  "proposal_id": "{{step_0_result.proposal_id}}"
}

// After interpolation with context
{
  "to": "guest@example.com",
  "subject": "Your booking at Cozy Brooklyn Apartment",
  "proposal_id": "abc-123"
}
```

### Error Handling Policies

Each step can define `on_failure`:

| Policy | Behavior |
|--------|----------|
| `abort` | Mark workflow failed, stop execution |
| `continue` | Skip step, continue to next (error stored in context) |
| `retry` | Let visibility timeout expire, retry on reappear |

```json
{
  "name": "send_notification",
  "function": "send-email",
  "action": "send",
  "on_failure": "continue",
  "payload_template": {...}
}
```

---

## Workflow Definition Schema

Workflows are stored in `workflow_definitions` table:

```json
{
  "name": "proposal_accepted",
  "version": 1,
  "active": true,
  "required_fields": ["proposal_id", "guest_email", "host_email"],
  "max_retries": 3,
  "visibility_timeout": 60,
  "steps": [
    {
      "name": "update_proposal_status",
      "function": "proposal",
      "action": "update",
      "on_failure": "abort",
      "payload_template": {
        "proposal_id": "{{proposal_id}}",
        "status": "accepted"
      }
    },
    {
      "name": "send_guest_email",
      "function": "send-email",
      "action": "send",
      "on_failure": "continue",
      "payload_template": {
        "to": "{{guest_email}}",
        "template": "proposal_accepted_guest"
      }
    }
  ]
}
```

---

## Execution Flow

```
┌────────────────┐
│ Frontend calls │
│ workflow-enqueue│
└────────┬───────┘
         │
         ▼
┌────────────────┐
│ Validate data  │
│ against schema │
└────────┬───────┘
         │
         ▼
┌────────────────┐
│ Create execution│
│ record + enqueue│
│ to pgmq         │
└────────┬───────┘
         │
         ▼
┌────────────────┐
│ pg_net trigger │
│ calls orchestrator│
└────────┬───────┘
         │
         ▼
┌────────────────┐
│ Read message   │
│ from pgmq      │
└────────┬───────┘
         │
         ▼
┌────────────────┐
│ Execute step   │
│ (call Edge Fn) │
└────────┬───────┘
         │
         ▼
┌────────────────┐
│ Merge result   │
│ into context   │
└────────┬───────┘
         │
    ┌────┴────┐
    │ More    │
    │ steps?  │
    └────┬────┘
    Yes  │  No
    │    │
    ▼    ▼
Enqueue  Mark
next     complete
step
```

---

## Related Tables

| Table | Purpose |
|-------|---------|
| `workflow_definitions` | Workflow schemas and steps |
| `workflow_executions` | Execution records and status |
| `pgmq.workflow_queue` | Message queue (pgmq schema) |

---

## Execution Statuses

| Status | Description |
|--------|-------------|
| `pending` | Queued, not yet started |
| `running` | Currently executing |
| `completed` | All steps finished successfully |
| `failed` | Aborted due to step failure |

---

**LAST_UPDATED**: 2026-01-20
