# AI Gateway Handlers

**GENERATED**: 2025-11-26
**RUNTIME**: Deno (Edge Function)
**PARENT**: supabase/functions/ai-gateway/

---

## ### DIRECTORY_INTENT ###

[PURPOSE]: Request handlers for AI completion and streaming operations
[RUNTIME]: Deno Edge Runtime
[PATTERN]: Each handler processes a specific AI request type

---

## ### FILE_INVENTORY ###

### complete.ts
[INTENT]: Handle non-streaming AI completions returning full response after OpenAI processing
[EXPORTS]: handleComplete
[IMPORTS]: _shared/openai, _shared/validation, ../prompts/_registry
[ENDPOINT]: POST /ai-gateway with type="complete"
[RETURNS]: { completion: string, tokens: number }

### stream.ts
[INTENT]: Handle streaming AI responses using Server-Sent Events for real-time token delivery
[EXPORTS]: handleStream
[IMPORTS]: _shared/openai, _shared/validation, ../prompts/_registry
[ENDPOINT]: POST /ai-gateway with type="stream"
[RETURNS]: SSE stream of completion tokens

---

## ### REQUEST_FLOW ###

```
Client Request
    │
    ▼
index.ts (router)
    │
    ├─► complete.ts → OpenAI API → Full response
    │
    └─► stream.ts → OpenAI API → SSE stream
```

---

## ### USAGE_PATTERN ###

[CALLER]: Frontend lib/aiGateway.js or direct fetch
[STREAM_USAGE]: EventSource or fetch with ReadableStream
[COMPLETE_USAGE]: Standard fetch with JSON response

---

**FILE_COUNT**: 2
**EXPORTS_COUNT**: 2
