# Edge Functions - Backend Infrastructure

**GENERATED**: 2025-11-26
**RUNTIME**: Deno (Supabase Edge Functions)
**PARENT**: supabase/

---

## ### DIRECTORY_INTENT ###

[PURPOSE]: Serverless Edge Functions proxying API calls and handling AI services
[RUNTIME]: Deno TypeScript
[DEPLOYMENT]: Supabase Edge Runtime

---

## ### SUBDIRECTORIES ###

### _shared/
[INTENT]: Shared utilities across all Edge Functions
[FILES]: 7 utility modules
[KEY_EXPORTS]: cors, errors, validation, bubbleSync, openai, types

### ai-gateway/
[INTENT]: AI service gateway for completions and streaming
[SUBDIRS]: handlers/, prompts/
[ENDPOINT]: POST /ai-gateway

### ai-signup-guest/
[INTENT]: AI-powered guest signup market research
[FILES]: 1 index.ts
[ENDPOINT]: POST /ai-signup-guest

### bubble-auth-proxy/
[INTENT]: Authentication proxy to Bubble.io
[SUBDIRS]: handlers/
[ENDPOINT]: POST /bubble-auth-proxy
[OPERATIONS]: login, signup, logout, validate

### bubble-proxy/
[INTENT]: General API proxy to Bubble.io
[SUBDIRS]: handlers/
[ENDPOINT]: POST /bubble-proxy
[OPERATIONS]: listing, messaging, photos, referral, signup

---

## ### FUNCTION_OVERVIEW ###

| Function | Purpose | Handlers |
|----------|---------|----------|
| bubble-proxy | General Bubble API | listing, messaging, photos, referral, signup |
| bubble-auth-proxy | Authentication | login, signup, logout, validate |
| ai-gateway | AI services | complete, stream |
| ai-signup-guest | Guest market research | single handler |

---

## ### SHARED_PATTERN ###

```typescript
// All functions follow this pattern
import { corsHeaders, handleCors } from '../_shared/cors.ts';

Deno.serve(async (req) => {
  // 1. Handle CORS preflight
  if (req.method === 'OPTIONS') {
    return handleCors();
  }

  // 2. Parse request
  const body = await req.json();

  // 3. Route to handler
  const result = await handleRequest(body);

  // 4. Return response with CORS headers
  return new Response(JSON.stringify(result), {
    headers: { ...corsHeaders, 'Content-Type': 'application/json' }
  });
});
```

---

## ### REQUIRED_SECRETS ###

[BUBBLE_API_BASE_URL]: https://app.split.lease/version-test/api/1.1
[BUBBLE_API_KEY]: Bubble.io API key
[OPENAI_API_KEY]: For AI functions

---

## ### DEPLOYMENT ###

```bash
# Deploy single function
supabase functions deploy bubble-proxy

# Deploy all functions
supabase functions deploy

# View logs
supabase functions logs <function-name>
```

---

## ### DOCUMENTATION ###

[SECRETS_SETUP]: ../SECRETS_SETUP.md
[DEPLOYMENT_GUIDE]: ../../docs/DEPLOY_EDGE_FUNCTION.md

---

**SUBDIRECTORY_COUNT**: 5
**TOTAL_FILES**: 25+
