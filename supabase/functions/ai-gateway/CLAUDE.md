# AI Gateway - Edge Function

**GENERATED**: 2025-11-26
**RUNTIME**: Deno (Edge Function)
**PARENT**: supabase/functions/

---

## ### FUNCTION_INTENT ###

[PURPOSE]: AI service gateway routing requests to completion or streaming handlers
[ENDPOINT]: POST /ai-gateway
[FEATURES]: Non-streaming completions, SSE streaming, prompt registry

---

## ### SUBDIRECTORIES ###

### handlers/
[INTENT]: Request handlers for complete and stream operations
[FILES]: 2 handlers
[KEY_EXPORTS]: handleComplete, handleStream

### prompts/
[INTENT]: Prompt templates and registry system
[FILES]: 2 files
[KEY_EXPORTS]: getPrompt, registerPrompt, createPrompt

---

## ### FILE_INVENTORY ###

### deno.json
[INTENT]: Deno runtime configuration with import maps and permissions

### index.ts
[INTENT]: Main entry point routing requests to handlers
[IMPORTS]: ./handlers/complete, ./handlers/stream, _shared/cors
[EXPORTS]: Deno.serve handler

---

## ### REQUEST_FORMAT ###

```typescript
// Non-streaming
POST /ai-gateway
{
  "type": "complete",
  "promptId": "market-research",
  "variables": { "neighborhood": "Brooklyn Heights" }
}

// Streaming
POST /ai-gateway
{
  "type": "stream",
  "promptId": "listing-description",
  "variables": { "propertyType": "studio" }
}
```

---

## ### RESPONSE_FORMAT ###

```typescript
// Complete response
{ "completion": "...", "tokens": 150 }

// Stream response (SSE)
data: {"token": "The"}
data: {"token": " market"}
data: {"token": " in"}
data: [DONE]
```

---

## ### REQUIRED_SECRETS ###

[OPENAI_API_KEY]: For OpenAI API calls

---

## ### DEPLOYMENT ###

```bash
supabase functions deploy ai-gateway
```

---

**SUBDIRECTORY_COUNT**: 2
**TOTAL_FILES**: 6
