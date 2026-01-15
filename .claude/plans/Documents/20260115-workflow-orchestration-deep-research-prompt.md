# Deep Research Prompt: Serverless Function Orchestration for Supabase Edge Functions

**Generated**: 2026-01-15
**Purpose**: Gather comprehensive solutions for daisy-chaining backend functions with idempotency, queuing, scheduling, iterability, and inspectability
**Constraint**: Solutions must work within Supabase Edge Functions (Deno runtime) environment

---

## Research Objective

Design an optimal orchestration system for sequencing multiple Supabase Edge Functions where:
- Each edge function remains pure and single-responsibility
- Multi-step workflows can chain functions in sequence
- The system is idempotent (duplicate requests produce same result)
- Operations can be queued and optionally scheduled
- Workflow state is inspectable at-a-glance
- Problem sources are readily identifiable
- The solution is iterable (can evolve incrementally)

---

## Technical Environment

### Runtime
- **Platform**: Supabase Edge Functions
- **Runtime**: Deno 2 (TypeScript)
- **Database**: PostgreSQL (Supabase)
- **Execution Model**: Serverless (cold starts, no persistent connections)
- **Max Execution Time**: 150 seconds per invocation
- **Concurrency**: Multiple instances can run simultaneously

### Available Infrastructure
- **PostgreSQL Extensions**: pg_cron (scheduling), pg_net (HTTP calls), pgmq (message queue)
- **Database Triggers**: Can invoke edge functions via pg_net
- **Realtime**: Supabase Realtime for change subscriptions

### Constraints
- No persistent processes (serverless)
- No WebSocket connections from edge functions
- Functions must complete within timeout
- No shared memory between invocations
- Must handle cold starts gracefully

---

## Current Codebase Architecture

### Existing Edge Functions (16 total)

| Function | Actions | Purpose |
|----------|---------|---------|
| auth-user | login, signup, logout, validate, request_password_reset, update_password, generate_magic_link, oauth_signup, oauth_login | Authentication operations |
| proposal | create, update, get, suggest | Booking proposal CRUD |
| listing | create, get, submit | Property listing CRUD |
| messages | send_message, get_messages, send_guest_inquiry, create_proposal_thread, send_splitbot_message | Messaging system |
| bubble_sync | process_queue, process_queue_data_api, sync_single, retry_failed, get_status, cleanup, build_request, sync_signup_atomic | Queue-based sync to external system |
| bubble-proxy | send_message, ai_inquiry, upload_photos, submit_referral, toggle_favorite, get_favorites, parse_profile | External API proxy |
| ai-gateway | complete, stream | OpenAI proxy with templating |
| send-email | send, health | SendGrid email delivery |
| virtual-meeting | create, delete, accept, decline, send_calendar_invite, notify_participants | Meeting coordination |
| cohost-request | create, rate, notify-host | Co-host request management |
| slack | faq_inquiry | Slack notifications |
| communications | health | Placeholder |
| pricing | health | Placeholder |
| ai-signup-guest | (single action) | AI-powered signup |
| workflow-enqueue | enqueue, status, health | Workflow entry point |
| workflow-orchestrator | process | Workflow step executor |

### Common Request/Response Pattern

All edge functions use action-based routing:

```typescript
// Request
{ action: "action_name", payload: { ...data } }

// Success Response
{ success: true, data: { ...result } }

// Error Response
{ success: false, error: "Error message" }
```

### Existing Queue Infrastructure

#### sync_queue Table
```sql
CREATE TABLE sync_queue (
  id UUID PRIMARY KEY,
  table_name TEXT NOT NULL,
  record_id TEXT NOT NULL,
  operation TEXT NOT NULL,  -- INSERT, UPDATE, DELETE, SIGNUP_ATOMIC
  status TEXT NOT NULL,     -- pending, processing, completed, failed, skipped
  payload JSONB,
  bubble_response JSONB,
  error_message TEXT,
  error_details JSONB,
  retry_count INTEGER DEFAULT 0,
  max_retries INTEGER DEFAULT 3,
  next_retry_at TIMESTAMPTZ,
  idempotency_key TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  processed_at TIMESTAMPTZ
);
```

#### sync_config Table
```sql
CREATE TABLE sync_config (
  id UUID PRIMARY KEY,
  supabase_table TEXT NOT NULL,
  bubble_workflow TEXT NOT NULL,
  bubble_object_type TEXT,
  field_mapping JSONB,
  excluded_fields TEXT[],
  sync_on_insert BOOLEAN DEFAULT TRUE,
  sync_on_update BOOLEAN DEFAULT TRUE,
  sync_on_delete BOOLEAN DEFAULT TRUE,
  enabled BOOLEAN DEFAULT TRUE,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ
);
```

#### workflow_definitions Table
```sql
CREATE TABLE workflow_definitions (
  id UUID PRIMARY KEY,
  name TEXT NOT NULL UNIQUE,
  description TEXT,
  steps JSONB NOT NULL,           -- Array of step definitions
  required_fields TEXT[],         -- Required input fields
  max_retries INTEGER DEFAULT 3,
  timeout_seconds INTEGER DEFAULT 120,
  visibility_timeout INTEGER DEFAULT 60,
  version INTEGER DEFAULT 1,
  active BOOLEAN DEFAULT TRUE,
  created_by TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ
);
```

#### workflow_executions Table
```sql
CREATE TABLE workflow_executions (
  id UUID PRIMARY KEY,
  workflow_name TEXT NOT NULL,
  workflow_version INTEGER NOT NULL,
  input_payload JSONB NOT NULL,
  status TEXT NOT NULL,           -- pending, running, completed, failed
  current_step INTEGER DEFAULT 0,
  total_steps INTEGER NOT NULL,
  context JSONB DEFAULT '{}',     -- Accumulated execution context
  error_message TEXT,
  error_step TEXT,
  retry_count INTEGER DEFAULT 0,
  correlation_id TEXT,
  triggered_by TEXT,
  started_at TIMESTAMPTZ,
  completed_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT NOW()
);
```

### Current Orchestration Implementation (First Attempt)

#### workflow-enqueue/index.ts
```typescript
/**
 * Workflow Enqueue Edge Function
 *
 * Receives workflow requests from frontend, validates payload against
 * workflow definition, and enqueues to pgmq for orchestration.
 *
 * VALIDATION (Dual-level, fail-fast):
 * 1. required_fields - Explicit fields defined in workflow definition
 * 2. template_variables - ALL {{placeholders}} extracted from step payload_templates
 */

// Key functions:
// - extractTemplateVariables(obj) - Recursively finds {{variable}} placeholders
// - validateTemplateVariables(steps, data) - Ensures all placeholders have values
// - handleEnqueue(supabase, payload) - Validates, creates execution, queues to pgmq

// Flow:
// 1. Look up workflow definition by name
// 2. Validate required_fields from definition
// 3. Validate ALL template variables in steps exist in data
// 4. Generate correlation_id for idempotency
// 5. Check if workflow already exists (idempotent)
// 6. Create workflow_executions record
// 7. Enqueue to pgmq workflow_queue
```

#### workflow-orchestrator/index.ts
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

// Key functions:
// - executeStep(functionName, action, payload) - Calls edge function via HTTP
// - interpolateTemplate(template, context) - Replaces {{var}} with context values

// Flow:
// 1. Read message from pgmq with visibility timeout (60s)
// 2. Update execution status to "running"
// 3. Get current step definition
// 4. Interpolate payload_template with accumulated context
// 5. Execute step by calling target edge function
// 6. Merge result into context
// 7. If more steps: enqueue next step message
// 8. If last step: mark execution completed
// 9. Handle failures based on on_failure policy (abort/continue/retry)
```

#### WorkflowStep Interface
```typescript
interface WorkflowStep {
    name: string;
    function: string;                    // Edge function name
    action: string;                      // Action to call
    payload_template: Record<string, unknown>;  // Template with {{variables}}
    on_failure: "continue" | "abort" | "retry";
}
```

### Example Workflow Definition
```json
{
  "name": "proposal-created",
  "description": "Actions after proposal creation",
  "steps": [
    {
      "name": "create_thread",
      "function": "messages",
      "action": "create_proposal_thread",
      "payload_template": {
        "proposalId": "{{proposal_id}}",
        "guestId": "{{guest_id}}",
        "hostId": "{{host_id}}",
        "listingId": "{{listing_id}}",
        "proposalStatus": "{{status}}"
      },
      "on_failure": "continue"
    },
    {
      "name": "notify_host",
      "function": "send-email",
      "action": "send",
      "payload_template": {
        "template_id": "new_proposal",
        "recipient_email": "{{host_email}}",
        "variables": {
          "guest_name": "{{guest_name}}",
          "listing_name": "{{listing_name}}"
        }
      },
      "on_failure": "continue"
    }
  ],
  "required_fields": ["proposal_id", "guest_id", "host_id", "listing_id"],
  "max_retries": 3,
  "timeout_seconds": 120,
  "visibility_timeout": 60
}
```

---

## Real-World Use Cases Requiring Orchestration

### Use Case 1: Proposal Status Change
When a proposal status changes from "pending" to "accepted":
1. Update proposal record in database
2. Create/update message thread
3. Send SplitBot messages to both parties
4. Send email notification to guest
5. Send SMS notification to guest
6. Sync to external system (Bubble)
7. Update analytics/tracking

### Use Case 2: User Signup
When a new user signs up:
1. Create Supabase Auth user
2. Create user record in public.user table
3. Create host_account record
4. Create guest_account record
5. Send welcome email
6. Sync all records to external system (atomic)
7. Track conversion event

### Use Case 3: Virtual Meeting Accepted
When a host accepts a virtual meeting request:
1. Update meeting status to "accepted"
2. Create calendar event via external API
3. Send calendar invite to both parties
4. Send confirmation email to guest
5. Send confirmation SMS to guest
6. Update meeting record with calendar link
7. Create message thread notification

### Use Case 4: Listing Published
When a listing is published:
1. Update listing status to "published"
2. Sync to external system
3. Send confirmation email to host
4. Trigger SEO indexing request
5. Update host's listing count
6. Send to listing distribution channels

---

## Key Requirements

### 1. Function Purity
- Each edge function must remain single-responsibility
- No function should know about workflows it participates in
- Functions receive input, produce output, no side-chaining

### 2. Idempotency
- Same request with same correlation_id produces same result
- Safe to retry failed workflows
- Duplicate webhook deliveries handled gracefully

### 3. Queuing
- Async execution (caller doesn't wait for completion)
- Ordered step execution within workflow
- Parallel workflow execution across different workflows

### 4. Scheduling
- Ability to schedule workflows for future execution
- Delayed step execution (e.g., "send reminder in 24 hours")
- Recurring workflows (optional)

### 5. Observability/Inspectability
- At-a-glance view of workflow status
- Clear indication of which step failed
- Full execution history with timing
- Easy correlation between related operations

### 6. Problem Identification
- Clear error messages at each step
- Step-level retry visibility
- Dead letter queue for unrecoverable failures
- Alerting for stuck workflows

### 7. Iterability
- Easy to add new workflows via database records
- Easy to modify existing workflows
- Version control for workflow definitions
- Backward compatibility during updates

---

## Questions to Research

### Architecture Questions
1. What is the optimal pattern for serverless workflow orchestration in PostgreSQL-backed systems?
2. How do AWS Step Functions, Temporal, and similar systems handle step sequencing?
3. What are the tradeoffs between push-based (triggers) vs pull-based (polling) orchestration?
4. How should workflow state be persisted for maximum inspectability?
5. What is the best way to handle long-running workflows in a serverless context?

### Implementation Questions
1. Should pgmq be used for step-level queuing or workflow-level queuing?
2. How should step results be accumulated and passed between steps?
3. What is the optimal visibility timeout strategy?
4. How should conditional branching be handled (if step A fails, do X instead of Y)?
5. What is the best pattern for sub-workflows (workflow calling another workflow)?

### Reliability Questions
1. How to guarantee exactly-once execution in a distributed serverless environment?
2. What is the best retry strategy (immediate, exponential backoff, with jitter)?
3. How to handle poison messages that consistently fail?
4. What is the optimal dead letter queue strategy?
5. How to detect and handle stuck workflows?

### Observability Questions
1. What metrics should be tracked for workflow health?
2. How to structure logs for easy debugging?
3. What is the optimal data model for execution history?
4. How to enable efficient querying of workflow status?
5. What alerting thresholds make sense?

---

## Existing Patterns in Codebase

### Pattern 1: Fire-and-Forget Queue (sync_queue)
```typescript
await enqueueBubbleSync(supabase, {
  correlationId: `proposal_update:${id}:${Date.now()}`,
  items: [{
    sequence: 1,
    table: 'proposal',
    recordId: id,
    operation: 'UPDATE',
    payload: cleanUpdates,
  }]
});
triggerQueueProcessing();  // Fire-and-forget, pg_cron backup
```

### Pattern 2: Atomic Multi-Record Sync (SIGNUP_ATOMIC)
```typescript
// Enqueues a single queue item that triggers a handler
// which creates 3 records atomically in sequence
await enqueueSignupSync(supabase, {
  userId,
  hostAccountId,
  guestAccountId,
  userData,
});
```

### Pattern 3: Immediate Edge Function Calls
```typescript
// From cohost-request/handlers/create.ts
// After creating cohost request, immediately sends Slack notification
// (not queued, executed in same request)
const slackResult = await sendInteractiveMessage(channelId, blocks, fallbackText);
```

### Pattern 4: Multi-Step with Promise.all (messages)
```typescript
// From messages/handlers/createProposalThread.ts
// Parallel execution within single function
const [guestProfile, hostProfile, listingName] = await Promise.all([
  getUserProfile(supabase, input.guestId),
  getUserProfile(supabase, input.hostId),
  getListingName(supabase, input.listingId),
]);
```

---

## Database Schema Reference

### Workflow Tables (Current)
- `workflow_definitions` - Workflow blueprints/templates
- `workflow_executions` - Individual workflow runs

### Queue Tables (Current)
- `sync_queue` - Item-level sync queue
- `sync_config` - Table-level sync configuration

### Core Business Tables
- `user` - User accounts (100+ columns)
- `listing` - Property listings (90+ columns)
- `proposal` - Booking proposals (90+ columns)
- `thread` - Message threads
- `_message` - Individual messages
- `co_hostrequest` - Co-host assistance requests
- `virtualmeetingschedulesandlinks` - Meeting coordination

### Analytics Tables
- `ai_parsing_queue` - AI text parsing queue
- `datacollection_searchlogging` - Search analytics

---

## Research Areas

### 1. Orchestration Patterns
- Saga pattern for distributed transactions
- Choreography vs Orchestration
- Event sourcing for workflow state
- CQRS for workflow queries

### 2. Queue Technologies
- pgmq capabilities and limitations
- PostgreSQL LISTEN/NOTIFY
- Advisory locks for coordination
- FOR UPDATE SKIP LOCKED pattern

### 3. Serverless Patterns
- Step Functions-like patterns in PostgreSQL
- Durable execution in serverless
- Compensation/rollback patterns
- Checkpoint and resume

### 4. Observability
- OpenTelemetry for distributed tracing
- Structured logging patterns
- Metric collection strategies
- Dashboard design for workflows

### 5. Similar Systems
- Temporal.io architecture
- AWS Step Functions
- Azure Durable Functions
- Inngest
- Trigger.dev
- Windmill

---

## Deliverable Expectations

Research should provide:

1. **Architecture Recommendation**: High-level design with rationale
2. **Data Model**: Table schemas for workflow state management
3. **Execution Model**: How steps are triggered and sequenced
4. **Error Handling**: Retry, compensation, dead letter strategies
5. **Observability**: Logging, metrics, alerting approach
6. **Migration Path**: How to evolve from current implementation
7. **Trade-offs**: What compromises each approach makes
8. **Code Patterns**: Example implementations where helpful

---

## Context Files for Reference

If detailed code context is needed:

- Current orchestration: `supabase/functions/workflow-orchestrator/index.ts`
- Current enqueue: `supabase/functions/workflow-enqueue/index.ts`
- Queue management: `supabase/functions/_shared/queueSync.ts`
- FP utilities: `supabase/functions/_shared/fp/orchestration.ts`
- Bubble sync: `supabase/functions/bubble_sync/handlers/processQueueDataApi.ts`
- Messages example: `supabase/functions/messages/handlers/createProposalThread.ts`
- Proposal update: `supabase/functions/proposal/actions/update.ts`

---

**END OF RESEARCH PROMPT**
