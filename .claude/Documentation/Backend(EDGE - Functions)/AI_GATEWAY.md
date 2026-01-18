# ai-gateway Edge Function

**ENDPOINT**: `POST /functions/v1/ai-gateway`
**AUTH_REQUIRED**: Mixed (public prompts don't require auth)
**SOURCE**: `supabase/functions/ai-gateway/`

---

## Purpose

OpenAI proxy with prompt templating and data loaders. Supports both streaming (SSE) and non-streaming completions with dynamic variable interpolation.

---

## Actions

| Action | Handler | Description |
|--------|---------|-------------|
| `complete` | `handlers/complete.ts` | Non-streaming OpenAI completion |
| `stream` | `handlers/stream.ts` | SSE streaming OpenAI completion |

---

## Public Prompts (No Auth Required)

| Prompt Key | Description | File |
|------------|-------------|------|
| `listing-description` | Generate listing description | `prompts/listing-description.ts` |
| `listing-title` | Generate listing title | `prompts/listing-title.ts` |
| `echo-test` | Test prompt (built-in) | `prompts/_registry.ts` |

All other prompts require authentication.

---

## Request Format

### Non-Streaming Completion

```json
{
  "action": "complete",
  "payload": {
    "prompt_key": "listing-description",
    "variables": {
      "neighborhood": "Upper West Side",
      "amenities": "WiFi, Kitchen, Washer/Dryer",
      "beds": 2,
      "bathrooms": 1
    }
  }
}
```

### Streaming Completion

```json
{
  "action": "stream",
  "payload": {
    "prompt_key": "listing-description",
    "variables": {
      "neighborhood": "Upper West Side",
      "amenities": "WiFi, Kitchen, Washer/Dryer"
    }
  }
}
```

---

## Response Format

### Non-Streaming Response

```json
{
  "success": true,
  "data": {
    "response": "Generated text here...",
    "usage": {
      "prompt_tokens": 150,
      "completion_tokens": 200,
      "total_tokens": 350
    }
  }
}
```

### Streaming Response

Returns Server-Sent Events (SSE) stream:
```
data: {"content": "Generated "}
data: {"content": "text "}
data: {"content": "here..."}
data: [DONE]
```

---

## Prompt System

### Prompt Registry

Central registry at `prompts/_registry.ts`:
- `registerPrompt(key, config)` - Register a prompt
- `getPrompt(key)` - Get prompt config
- `listPrompts()` - List all registered prompts

### Prompt Configuration

```typescript
interface PromptConfig {
  key: string;
  template: string;
  systemMessage?: string;
  model?: string;
  temperature?: number;
  maxTokens?: number;
  dataLoaders?: string[];
}
```

### Variable Interpolation

Template syntax uses double curly braces:
- `{{variable}}` - User-provided variables
- `{{loader.field}}` - Data loader fields

Example template:
```
Generate a compelling description for a {{beds}}-bedroom apartment
in {{neighborhood}} with these amenities: {{amenities}}.
```

### Data Loaders

Built-in loaders:
- `user-profile` - Load authenticated user's profile data

Custom loaders can fetch data from Supabase and inject into prompts.

---

## File Structure

```
ai-gateway/
├── index.ts                    # Main router
├── handlers/
│   ├── complete.ts            # handleComplete() - Non-streaming
│   └── stream.ts              # handleStream() - SSE streaming
├── prompts/
│   ├── _registry.ts           # Central registry
│   ├── _template.ts           # Template interpolation
│   ├── listing-description.ts # Listing description prompt
│   ├── listing-title.ts       # Listing title prompt
│   └── proposal-summary.ts    # Proposal summary (auth required)
└── deno.json                  # Import map
```

---

## Handler Flow

1. **Parse request** - Extract action, prompt_key, variables
2. **Check auth** - Skip for public prompts
3. **Get prompt config** - From registry
4. **Load data** - Run data loaders if configured
5. **Interpolate template** - Replace variables
6. **Call OpenAI** - Complete or stream
7. **Return response** - JSON or SSE stream

---

## Adding New Prompts

1. Create file in `prompts/` directory:

```typescript
// prompts/my-prompt.ts
import { registerPrompt } from "./_registry.ts";

registerPrompt("my-prompt", {
  key: "my-prompt",
  template: "Generate {{thing}} for {{purpose}}",
  systemMessage: "You are a helpful assistant.",
  temperature: 0.7,
  maxTokens: 500,
});
```

2. Import in `index.ts`:

```typescript
import "./prompts/my-prompt.ts";
```

3. Add to `PUBLIC_PROMPTS` if no auth required:

```typescript
const PUBLIC_PROMPTS = ["listing-description", "listing-title", "my-prompt"];
```

---

## Dependencies

- `_shared/cors.ts`
- `_shared/errors.ts`
- `_shared/validation.ts`
- `_shared/openai.ts` - OpenAI API wrapper
- `_shared/aiTypes.ts` - TypeScript types

---

## Error Handling

- Missing prompt_key: 400 (ValidationError)
- Invalid prompt_key: 400 (ValidationError)
- Missing auth for protected prompt: 401 (ValidationError)
- OpenAI API errors: Pass through with status

---

**LAST_UPDATED**: 2025-12-11
