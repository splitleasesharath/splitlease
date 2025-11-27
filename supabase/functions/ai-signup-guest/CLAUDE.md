# AI Signup Guest - Edge Function

**GENERATED**: 2025-11-26
**RUNTIME**: Deno (Edge Function)
**PARENT**: supabase/functions/

---

## ### FUNCTION_INTENT ###

[PURPOSE]: Generate AI-powered personalized market research reports during guest signup
[ENDPOINT]: POST /ai-signup-guest
[FEATURE]: Real-time streaming market analysis based on neighborhood preferences

---

## ### FILE_INVENTORY ###

### index.ts
[INTENT]: Main handler generating AI market research reports
[IMPORTS]: _shared/openai, _shared/cors, _shared/validation
[EXPORTS]: Deno.serve handler

---

## ### REQUEST_FORMAT ###

```typescript
POST /ai-signup-guest
{
  "neighborhood": "Williamsburg",
  "propertyType": "studio",
  "budget": 1500,
  "moveInDate": "2024-03-01"
}
```

---

## ### RESPONSE_FORMAT ###

```typescript
// Streaming SSE response with market insights
data: {"section": "overview", "content": "Williamsburg is..."}
data: {"section": "pricing", "content": "Average rent..."}
data: {"section": "availability", "content": "Current inventory..."}
data: [DONE]
```

---

## ### AI_PROMPT_STRUCTURE ###

[SYSTEM]: You are a NYC real estate market analyst...
[USER]: Generate market research for {neighborhood}...
[OUTPUT]: Structured sections (overview, pricing, availability, recommendations)

---

## ### REQUIRED_SECRETS ###

[OPENAI_API_KEY]: For OpenAI API calls

---

## ### DEPLOYMENT ###

```bash
supabase functions deploy ai-signup-guest
```

---

**FILE_COUNT**: 1
