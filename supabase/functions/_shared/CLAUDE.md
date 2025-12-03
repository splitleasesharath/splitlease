# Shared Utilities - Edge Functions

**GENERATED**: 2025-11-26
**RUNTIME**: Deno (Edge Functions)
**PARENT**: supabase/functions/

---

## ### DIRECTORY_INTENT ###

[PURPOSE]: Shared utility modules used across all Edge Functions
[RUNTIME]: Deno TypeScript
[PATTERN]: Reusable utilities for CORS, errors, validation, API calls

---

## ### FILE_INVENTORY ###

### aiTypes.ts
[INTENT]: TypeScript type definitions for AI functionality
[EXPORTS]: AIPrompt, AICompletion, StreamChunk, AIGatewayRequest

### bubbleSync.ts
[INTENT]: Bubble.io API interaction utilities with authenticated fetch
[IMPORTS]: ./cors, ./errors
[EXPORTS]: bubbleFetch, bubblePost, bubblePut, bubbleDelete
[REQUIRED_SECRETS]: BUBBLE_API_KEY, BUBBLE_API_BASE_URL

### cors.ts
[INTENT]: CORS handling middleware for cross-origin requests
[EXPORTS]: corsHeaders, handleCors
[PATTERN]: Pre-flight OPTIONS + response headers

### errors.ts
[INTENT]: Error types and handlers for consistent error responses
[EXPORTS]: APIError, ValidationError, formatErrorResponse

### openai.ts
[INTENT]: OpenAI API integration for AI completions
[IMPORTS]: ./aiTypes
[EXPORTS]: createCompletion, createStreamingCompletion
[REQUIRED_SECRETS]: OPENAI_API_KEY

### types.ts
[INTENT]: Core TypeScript types shared across functions
[EXPORTS]: User, Listing, Proposal, APIResponse

### validation.ts
[INTENT]: Input validation utilities using Zod schemas
[EXPORTS]: validateRequest, schemas

---

## ### USAGE_PATTERN ###

```typescript
import { corsHeaders, handleCors } from '../_shared/cors.ts';
import { bubbleFetch } from '../_shared/bubbleSync.ts';
import { ValidationError } from '../_shared/errors.ts';

Deno.serve(async (req) => {
  // Handle CORS
  if (req.method === 'OPTIONS') {
    return handleCors();
  }

  // Process request
  const data = await bubbleFetch('/api/endpoint');

  return new Response(JSON.stringify(data), {
    headers: { ...corsHeaders, 'Content-Type': 'application/json' }
  });
});
```

---

## ### SECRETS_REQUIRED ###

[BUBBLE_API_KEY]: Required for bubbleSync.ts
[BUBBLE_API_BASE_URL]: Required for bubbleSync.ts
[BUBBLE_AUTH_BASE_URL]: Required for auth functions
[OPENAI_API_KEY]: Required for openai.ts

---

**FILE_COUNT**: 7
**EXPORTS_COUNT**: 15+
