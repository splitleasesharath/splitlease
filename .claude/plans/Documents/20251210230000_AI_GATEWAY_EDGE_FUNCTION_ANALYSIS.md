# AI Gateway Edge Function - Comprehensive Analysis

**Generated**: 2025-12-10
**Location**: `supabase/functions/ai-gateway/`
**Runtime**: Deno 2 (Supabase Edge Functions)

---

## Executive Summary

The `ai-gateway` Edge Function is a centralized AI service gateway that routes OpenAI requests through Supabase Edge Functions. It provides a flexible, prompt-based architecture with support for both streaming (SSE) and non-streaming completions, dynamic template interpolation, and optional authentication per prompt.

---

## Architecture Overview

```
┌─────────────────────────────────────────────────────────────────┐
│                      AI Gateway Edge Function                    │
├─────────────────────────────────────────────────────────────────┤
│                                                                  │
│  ┌─────────────┐    ┌───────────────────────────────────────┐  │
│  │   Client    │───>│            index.ts                    │  │
│  │   Request   │    │  - CORS handling                       │  │
│  └─────────────┘    │  - Request validation                  │  │
│                     │  - Auth check (per-prompt)             │  │
│                     │  - Action routing                      │  │
│                     └─────────────┬─────────────────────────┘  │
│                                   │                              │
│               ┌───────────────────┼───────────────────┐         │
│               ▼                   ▼                   ▼         │
│  ┌──────────────────┐ ┌──────────────────┐ ┌─────────────────┐ │
│  │  complete.ts     │ │   stream.ts      │ │  _registry.ts   │ │
│  │  (Non-streaming) │ │   (SSE Stream)   │ │  (Prompt Store) │ │
│  └────────┬─────────┘ └────────┬─────────┘ └────────┬────────┘ │
│           │                    │                    │           │
│           └────────────────────┴────────────────────┘           │
│                                │                                 │
│                     ┌──────────▼──────────┐                     │
│                     │  _shared/openai.ts  │                     │
│                     │  (OpenAI API calls) │                     │
│                     └──────────┬──────────┘                     │
│                                │                                 │
└────────────────────────────────┼────────────────────────────────┘
                                 ▼
                     ┌─────────────────────┐
                     │   OpenAI API        │
                     │ api.openai.com/v1/  │
                     └─────────────────────┘
```

---

## File Structure

```
supabase/functions/ai-gateway/
├── index.ts                    # Main entry point, router
├── deno.json                   # Import map (currently empty)
├── handlers/
│   ├── complete.ts             # Non-streaming completion handler
│   └── stream.ts               # SSE streaming completion handler
└── prompts/
    ├── _registry.ts            # Prompt & data loader registry
    ├── _template.ts            # Template interpolation engine
    ├── listing-description.ts  # Listing description generator
    ├── listing-title.ts        # Listing title generator
    └── proposal-summary.ts     # Proposal summary (with data loader)
```

---

## Core Components

### 1. Main Router (`index.ts`)

**Responsibilities**:
- CORS preflight handling
- Request validation
- Authentication (per-prompt basis)
- Action routing to handlers

**Allowed Actions**:
- `complete` - Non-streaming completion
- `stream` - SSE streaming completion

**Public Prompts** (no auth required):
- `listing-description`
- `listing-title`
- `echo-test`

**Authentication Flow**:
```typescript
// Public prompts skip authentication
if (PUBLIC_PROMPTS.includes(payload.prompt_key)) {
  // Skip auth, proceed directly
}

// Protected prompts require JWT
const authHeader = req.headers.get("Authorization");
const { data: { user } } = await authClient.auth.getUser();
```

---

### 2. Complete Handler (`handlers/complete.ts`)

**Purpose**: Non-streaming OpenAI completions

**Flow**:
1. Get prompt configuration from registry
2. Load required data (if loaders specified)
3. Interpolate template with variables
4. Call OpenAI API
5. Return JSON response

**Response Format**:
```json
{
  "success": true,
  "data": {
    "content": "Generated text...",
    "model": "gpt-4o-mini",
    "usage": {
      "prompt_tokens": 150,
      "completion_tokens": 200,
      "total_tokens": 350
    }
  }
}
```

---

### 3. Stream Handler (`handlers/stream.ts`)

**Purpose**: SSE streaming completions

**Flow**:
1. Get prompt configuration from registry
2. Load required data
3. Interpolate template
4. Call OpenAI with `stream: true`
5. Return raw SSE response (passthrough)

**Response Headers**:
```typescript
{
  "Content-Type": "text/event-stream",
  "Cache-Control": "no-cache",
  "Connection": "keep-alive"
}
```

---

### 4. Prompt Registry (`prompts/_registry.ts`)

**Purpose**: Central store for prompt configurations and data loaders

**Key Functions**:
| Function | Purpose |
|----------|---------|
| `registerPrompt(config)` | Register a new prompt |
| `getPrompt(key)` | Retrieve prompt config |
| `listPrompts()` | List all available prompts |
| `registerLoader(loader)` | Register data loader |
| `getLoader(key)` | Retrieve loader |
| `loadAllData(keys, context)` | Execute multiple loaders |

**Built-in Prompts**:
| Key | Description | Auth |
|-----|-------------|------|
| `echo-test` | Simple test prompt | No |
| `listing-description` | Generate listing descriptions | No |
| `listing-title` | Generate listing titles | No |
| `proposal-summary` | Summarize proposals | Yes |

**Built-in Loaders**:
| Key | Description | Data Source |
|-----|-------------|-------------|
| `user-profile` | Fetch user profile | `users` table |
| `proposal-data` | Fetch proposal details | `proposal` table |

---

### 5. Template Engine (`prompts/_template.ts`)

**Purpose**: Variable interpolation with `{{variable}}` syntax

**Features**:
- Simple variables: `{{name}}`
- Nested paths: `{{user.profile.name}}`
- Array/object JSON serialization
- Missing variable warnings: `[MISSING: path]`

**Functions**:
| Function | Purpose |
|----------|---------|
| `interpolate(template, context)` | Replace variables with values |
| `extractVariables(template)` | List all template variables |

---

## Prompt Configuration Schema

```typescript
interface PromptConfig {
  key: string;                          // Unique identifier
  name: string;                         // Display name
  description: string;                  // Description

  systemPrompt: string;                 // System instruction
  userPromptTemplate: string;           // User prompt with {{variables}}

  defaults: {
    model: "gpt-4o" | "gpt-4o-mini" | "gpt-4-turbo" | "gpt-3.5-turbo";
    temperature: number;                // 0.0 - 2.0
    maxTokens: number;                  // Max response tokens
  };

  requiredLoaders?: string[];           // Data loaders to execute
  responseFormat?: "text" | "json";     // Expected response format
  jsonSchema?: Record<string, unknown>; // JSON schema (if json format)
}
```

---

## Request/Response Formats

### Request

```json
{
  "action": "complete",
  "payload": {
    "prompt_key": "listing-description",
    "variables": {
      "listingName": "Cozy Studio",
      "neighborhood": "Williamsburg",
      "typeOfSpace": "Studio",
      "bedrooms": 0,
      "beds": 1,
      "bathrooms": 1,
      "kitchenType": "Full Kitchen",
      "amenitiesInsideUnit": "WiFi, AC, Washer",
      "amenitiesOutsideUnit": "Gym, Rooftop"
    },
    "options": {
      "model": "gpt-4o-mini",
      "temperature": 0.7,
      "max_tokens": 500
    }
  }
}
```

### Success Response

```json
{
  "success": true,
  "data": {
    "content": "Experience the charm of...",
    "model": "gpt-4o-mini",
    "usage": {
      "prompt_tokens": 200,
      "completion_tokens": 150,
      "total_tokens": 350
    }
  }
}
```

### Error Response

```json
{
  "success": false,
  "error": "Missing Authorization header"
}
```

---

## Shared Dependencies

### `_shared/openai.ts`
- `complete(messages, options)` - Non-streaming completion
- `stream(messages, options)` - Streaming completion

### `_shared/aiTypes.ts`
- Type definitions for all AI gateway interfaces
- `PromptConfig`, `DataLoader`, `AIGatewayRequest`, etc.

### `_shared/errors.ts`
- `OpenAIError` - OpenAI API failures
- `ValidationError` - Input validation failures
- `formatErrorResponse()` - Error formatting
- `getStatusCodeFromError()` - HTTP status mapping

### `_shared/cors.ts`
- `corsHeaders` - Standard CORS configuration

---

## Required Secrets

| Secret | Purpose |
|--------|---------|
| `OPENAI_API_KEY` | OpenAI API authentication |
| `SUPABASE_URL` | Supabase project URL |
| `SUPABASE_ANON_KEY` | Client-side Supabase key |
| `SUPABASE_SERVICE_ROLE_KEY` | Server-side bypass key |

---

## Usage Examples

### Example 1: Generate Listing Description

```bash
curl -X POST https://qcfifybkaddcoimjroca.supabase.co/functions/v1/ai-gateway \
  -H "Content-Type: application/json" \
  -H "apikey: <SUPABASE_ANON_KEY>" \
  -d '{
    "action": "complete",
    "payload": {
      "prompt_key": "listing-description",
      "variables": {
        "listingName": "Modern Loft",
        "neighborhood": "Bushwick",
        "typeOfSpace": "Private Room",
        "bedrooms": 1,
        "beds": 1,
        "bathrooms": 1,
        "kitchenType": "Shared Kitchen",
        "amenitiesInsideUnit": "WiFi, AC",
        "amenitiesOutsideUnit": "Gym"
      }
    }
  }'
```

### Example 2: Stream Completion (with Auth)

```bash
curl -X POST https://qcfifybkaddcoimjroca.supabase.co/functions/v1/ai-gateway \
  -H "Content-Type: application/json" \
  -H "apikey: <SUPABASE_ANON_KEY>" \
  -H "Authorization: Bearer <USER_JWT>" \
  -d '{
    "action": "stream",
    "payload": {
      "prompt_key": "proposal-summary",
      "variables": {
        "proposal_id": "abc123"
      }
    }
  }'
```

---

## Adding New Prompts

### Step 1: Create Prompt File

```typescript
// prompts/my-new-prompt.ts
import { registerPrompt } from "./_registry.ts";

registerPrompt({
  key: "my-new-prompt",
  name: "My New Prompt",
  description: "Description of what this prompt does",

  systemPrompt: `System instructions here...`,

  userPromptTemplate: `
    Variable 1: {{variable1}}
    Variable 2: {{variable2}}
    Generate output based on these variables.
  `,

  defaults: {
    model: "gpt-4o-mini",
    temperature: 0.7,
    maxTokens: 500,
  },

  responseFormat: "text",
});
```

### Step 2: Import in Registry

```typescript
// prompts/_registry.ts (add at bottom)
import "./my-new-prompt.ts";
```

### Step 3: Update PUBLIC_PROMPTS (if public)

```typescript
// index.ts
const PUBLIC_PROMPTS = ["listing-description", "listing-title", "echo-test", "my-new-prompt"];
```

---

## Adding Data Loaders

```typescript
// In prompts/my-prompt.ts or _registry.ts
registerLoader({
  key: "my-data",
  name: "My Data Loader",
  async load(context: DataLoaderContext): Promise<Record<string, unknown>> {
    const { variables, supabaseClient } = context;

    const { data, error } = await supabaseClient
      .from("my_table")
      .select("*")
      .eq("id", variables.id)
      .single();

    if (error) {
      return { loaded: false, error: error.message };
    }

    return { loaded: true, ...data };
  },
});

// Reference in prompt config
registerPrompt({
  key: "my-prompt",
  // ...
  requiredLoaders: ["my-data"],
});
```

---

## Design Principles

### NO FALLBACK PRINCIPLE

The ai-gateway adheres to the project's "No Fallback" principle:

1. **Unknown prompts throw errors** - No silent defaults
2. **Missing variables marked clearly** - `[MISSING: path]` for debugging
3. **API failures propagate** - No fake/cached responses
4. **Authentication enforced** - Protected prompts require valid JWT

### Separation of Concerns

| Layer | Responsibility |
|-------|----------------|
| `index.ts` | Request handling, auth, routing |
| `handlers/` | Business logic per action type |
| `prompts/` | Prompt definitions and data loading |
| `_shared/` | Reusable utilities |

---

## Key Files Reference

| File | Purpose | Lines |
|------|---------|-------|
| `index.ts` | Main router | 157 |
| `handlers/complete.ts` | Non-streaming handler | 117 |
| `handlers/stream.ts` | Streaming handler | 102 |
| `prompts/_registry.ts` | Registry + built-ins | 161 |
| `prompts/_template.ts` | Template engine | 61 |
| `prompts/listing-description.ts` | Listing prompt | 57 |
| `prompts/listing-title.ts` | Title prompt | 51 |
| `prompts/proposal-summary.ts` | Proposal prompt | 163 |
| `_shared/openai.ts` | OpenAI wrapper | 131 |
| `_shared/aiTypes.ts` | Type definitions | 107 |

---

## Deployment

```bash
# Deploy ai-gateway
supabase functions deploy ai-gateway

# View logs
supabase functions logs ai-gateway
```

---

**Document Version**: 1.0
**Last Updated**: 2025-12-10
