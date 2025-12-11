# Shared Utilities

**SOURCE**: `supabase/functions/_shared/`

---

## Overview

Shared utility modules used across all edge functions. Located in `supabase/functions/_shared/`.

---

## bubbleSync.ts

Core atomic sync service implementing Write-Read-Write pattern.

### BubbleSyncService Class

```typescript
class BubbleSyncService {
  constructor(
    bubbleBaseUrl: string,
    bubbleApiKey: string,
    supabaseUrl: string,
    supabaseServiceKey: string
  );

  // Trigger workflow and extract ID
  async triggerWorkflow(workflowName: string, params: Record<string, any>): Promise<string>;

  // Fetch full object from Bubble Data API
  async fetchBubbleObject(objectType: string, objectId: string): Promise<any>;

  // Sync data to Supabase table
  async syncToSupabase(table: string, data: any): Promise<any>;

  // Atomic create-and-sync (all-or-nothing)
  async createAndSync(
    workflowName: string,
    params: Record<string, any>,
    bubbleObjectType: string,
    supabaseTable: string
  ): Promise<any>;

  // Trigger workflow without sync
  async triggerWorkflowOnly(workflowName: string, params: Record<string, any>): Promise<any>;
}
```

### Atomic Sync Pattern

```
1. Create in Bubble (source of truth)
2. Fetch full data from Bubble Data API
3. Sync to Supabase (replica)
4. Return synced data
```

If any step fails, the entire operation fails. Client can retry.

---

## queueSync.ts

Standardized queue-based sync utility for async Bubble operations.

### Exports

```typescript
// Enqueue multiple items for sync
async function enqueueBubbleSync(
  supabase: SupabaseClient,
  options: {
    correlationId: string;
    items: Array<{
      sequence: number;
      table: string;
      recordId: string;
      operation: 'INSERT' | 'UPDATE' | 'DELETE' | 'SIGNUP_ATOMIC';
      payload: Record<string, any>;
    }>;
  }
): Promise<void>;

// Enqueue single item
async function enqueueSingleItem(...): Promise<void>;

// Trigger queue processing (fire-and-forget)
async function triggerQueueProcessing(): Promise<void>;

// Enqueue signup sync (special case)
async function enqueueSignupSync(...): Promise<void>;

// Filter Bubble-incompatible fields from payload
function filterBubbleIncompatibleFields(payload: Record<string, any>): Record<string, any>;
```

### Bubble-Incompatible Fields

These fields are automatically filtered from sync payloads:
- `bubble_id`
- `created_at`
- `updated_at`
- `sync_status`
- `bubble_sync_error`
- `pending`

### Usage Example

```typescript
import { enqueueBubbleSync, triggerQueueProcessing } from '../_shared/queueSync.ts';

// After creating a proposal in Supabase
await enqueueBubbleSync(supabase, {
  correlationId: `proposal:${proposalId}`,
  items: [{
    sequence: 1,
    table: 'proposal',
    recordId: proposalId,
    operation: 'INSERT',
    payload: proposalData,
  }],
});

// Optionally trigger immediate processing
await triggerQueueProcessing();
```

---

## slack.ts

Centralized Slack webhook operations for error reporting.

### ErrorCollector Class

Pattern: ONE REQUEST = ONE LOG (consolidated error reporting)

```typescript
import { createErrorCollector, ErrorCollector } from '../_shared/slack.ts';

// Create collector
const collector = createErrorCollector('function-name', 'action');

// Add errors as they occur
collector.add(error, 'context description');

// Set context (user info, etc.)
collector.setContext({ userId: user.id });

// Report all collected errors to Slack (fire-and-forget)
collector.reportToSlack();
```

### sendToSlack Function

```typescript
async function sendToSlack(
  message: string,
  channel: 'database' | 'acquisition' | 'general' = 'database'
): Promise<void>;
```

### Environment Variables

| Variable | Channel |
|----------|---------|
| `SLACK_WEBHOOK_DATABASE_WEBHOOK` | database (default) |
| `SLACK_WEBHOOK_ACQUISITION` | acquisition |
| `SLACK_WEBHOOK_GENERAL` | general |

---

## errors.ts

Custom error classes with HTTP status mapping.

### Error Classes

```typescript
class BubbleApiError extends Error {
  status: number;
  response?: any;
}

class SupabaseSyncError extends Error {
  originalError?: any;
}

class ValidationError extends Error {}

class AuthenticationError extends Error {}

class OpenAIError extends Error {
  status?: number;
}
```

### Utility Functions

```typescript
// Format error for response
function formatErrorResponse(error: Error): { success: false; error: string };

// Get HTTP status from error
function getStatusCodeFromError(error: Error): number;
// - ValidationError → 400
// - AuthenticationError → 401
// - BubbleApiError → error.status
// - SupabaseSyncError → 500
// - OpenAIError → error.status || 500
// - Default → 500
```

---

## validation.ts

Input validation utilities.

### Functions

```typescript
// Validate email format
function validateEmail(email: string): void;

// Validate US phone format
function validatePhone(phone: string): void;

// Validate single required field
function validateRequired(value: any, fieldName: string): void;

// Validate multiple required fields
function validateRequiredFields(obj: object, fields: string[]): void;

// Validate action is in allowed list
function validateAction(action: string, allowedActions: string[]): void;
```

All throw `ValidationError` on failure.

---

## cors.ts

CORS headers configuration.

### Export

```typescript
export const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'POST, GET, OPTIONS, PUT, DELETE',
};
```

### Usage in Functions

```typescript
import { corsHeaders } from '../_shared/cors.ts';

// Handle preflight
if (req.method === 'OPTIONS') {
  return new Response(null, { status: 200, headers: corsHeaders });
}

// Include in all responses
return new Response(JSON.stringify(data), {
  status: 200,
  headers: { ...corsHeaders, 'Content-Type': 'application/json' },
});
```

---

## openai.ts

OpenAI API wrapper for completions.

### Functions

```typescript
// Non-streaming completion
async function complete(options: {
  messages: Array<{ role: string; content: string }>;
  model?: string;
  temperature?: number;
  maxTokens?: number;
  responseFormat?: 'text' | 'json_object';
}): Promise<{
  response: string;
  usage: { prompt_tokens: number; completion_tokens: number; total_tokens: number };
}>;

// Streaming completion (SSE)
async function stream(options: {
  messages: Array<{ role: string; content: string }>;
  model?: string;
  temperature?: number;
  maxTokens?: number;
}): Promise<ReadableStream>;
```

---

## types.ts

General TypeScript interfaces.

### Key Types

```typescript
interface EdgeFunctionRequest {
  action: string;
  payload: Record<string, any>;
}

interface BubbleWorkflowResponse {
  response?: {
    id?: string;
    listing?: string;
    listing_id?: string;
    user_id?: string;
    [key: string]: any;
  };
  [key: string]: any;
}

interface User {
  id: string;
  email: string;
  [key: string]: any;
}
```

---

## aiTypes.ts

AI-specific TypeScript types.

### Key Types

```typescript
interface AIGatewayRequest {
  action: 'complete' | 'stream';
  payload: {
    prompt_key: string;
    variables?: Record<string, any>;
  };
}

interface PromptConfig {
  key: string;
  template: string;
  systemMessage?: string;
  model?: string;
  temperature?: number;
  maxTokens?: number;
  dataLoaders?: string[];
}

interface DataLoader {
  name: string;
  load: (context: DataLoaderContext) => Promise<Record<string, any>>;
}

interface DataLoaderContext {
  user: User | null;
  serviceClient: SupabaseClient;
  request: AIGatewayRequest;
}

interface AIOptions {
  model?: string;
  temperature?: number;
  maxTokens?: number;
}
```

---

## jsonUtils.ts

JSON parsing and normalization utilities.

### Functions

```typescript
// Parse JSON safely
function parseJsonSafe(value: any): any;

// Normalize JSONB arrays
function normalizeJsonbArray(value: any): any[];
```

---

**LAST_UPDATED**: 2025-12-11
