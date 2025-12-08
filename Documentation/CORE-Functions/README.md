# Edge Functions Documentation

**Location**: `supabase/functions/`
**Runtime**: Deno 2
**Updated**: 2025-12-04

---

## Quick Navigation

### For Getting Started
Start here if you're new to the Edge Functions architecture:
- **[QUICK_REFERENCE.md](./QUICK_REFERENCE.md)** - Copy-paste templates, curl examples, common patterns

### For Understanding the Architecture
Deep dive into how everything works:
- **[ARCHITECTURE_ANALYSIS.md](./ARCHITECTURE_ANALYSIS.md)** - Complete breakdown of patterns, handlers, and utilities
- **[VISUAL_GUIDE.md](./VISUAL_GUIDE.md)** - Diagrams and visual explanations

---

## Five Edge Functions Overview

| Function | Purpose | Handlers | Auth | Status |
|----------|---------|----------|------|--------|
| **bubble-proxy** | General Bubble API proxy | 9 handlers | Optional per action | Active |
| **auth-user** | Native Supabase Auth (login/signup) + Bubble (logout/validate) | 4 handlers | None (IS auth) | Active |
| **ai-gateway** | AI completions service | 2 handlers | Optional per prompt | Active |
| **ai-signup-guest** | AI-powered guest signup | 1 handler | None | Active |
| **slack** | Slack notifications | 1 handler | None | Active |

---

## Architecture at a Glance

**Every Edge Function**:
1. Receives `{action, payload}`
2. Validates and authenticates (if required)
3. Routes to appropriate handler
4. Returns `{success, data|error}` with HTTP status

**Key Principles**:
- **No Fallback Mechanism** - Real data or errors, never defaults
- **Atomic Operations** - Write to Bubble, read full data, sync to Supabase
- **Action-Based Routing** - Standardized dispatch pattern across all functions
- **Strict Validation** - Fail fast on invalid input
- **Service Layering** - Handlers delegate to reusable services

---

## Core Services (Shared Utilities)

Located in `supabase/functions/_shared/`:

| Service | Purpose |
|---------|---------|
| **bubbleSync.ts** | Atomic Write-Read-Write pattern for data sync |
| **errors.ts** | Custom error classes and HTTP status mapping |
| **validation.ts** | Input validation utilities |
| **cors.ts** | CORS headers configuration |
| **types.ts** | TypeScript interfaces |
| **aiTypes.ts** | AI-specific types and prompt registry |
| **openai.ts** | OpenAI API wrapper |

---

## Request Format (Universal)

All functions accept POST requests with this structure:

```json
{
  "action": "action_name",
  "payload": { /* action-specific data */ }
}
```

With optional Authorization header:
```
Authorization: Bearer <jwt_token>
```

---

## Response Format (Standard)

Success:
```json
{
  "success": true,
  "data": { /* handler result */ }
}
```

Error:
```json
{
  "success": false,
  "error": "Descriptive error message"
}
```

HTTP Status Codes:
- `200` - Success
- `400` - ValidationError (bad input)
- `401` - AuthenticationError (missing/invalid token)
- `500` - Server error (Bubble, Supabase, OpenAI failures)

---

## Getting Started: Add a New Handler

1. Create handler file: `supabase/functions/bubble-proxy/handlers/myAction.ts`
2. Implement handler function (see QUICK_REFERENCE.md for template)
3. Import in `index.ts`: `import { handleMyAction } from './handlers/myAction.ts'`
4. Add action to `allowedActions` array
5. Add case to switch statement
6. If public: Add to `PUBLIC_ACTIONS` array
7. Test locally: `supabase functions serve`
8. Deploy: `supabase functions deploy bubble-proxy`

---

## Document Structure

### QUICK_REFERENCE.md (15 KB)
**Best for**: Developers who want to quickly get things done
- Curl examples for all main actions
- Copy-paste handler templates
- Common patterns and mistakes
- Debugging tips
- Where to find things

### ARCHITECTURE_ANALYSIS.md (30 KB)
**Best for**: Understanding how everything works
- Detailed breakdown of each function's routing logic
- Handler organization patterns
- Shared utilities deep dive
- Error handling flow
- Request-response lifecycle
- Design principles explained
- Handler file structure

### VISUAL_GUIDE.md (28 KB)
**Best for**: Visual learners
- System architecture diagram
- Request flow diagrams for each function
- BubbleSyncService pattern visualization
- Layered architecture diagram
- Service dependencies
- Error handling flowchart
- Authentication decision tree
- Handler addition step-by-step

---

## Key Files in the Project

**Edge Function Code**:
- `supabase/functions/bubble-proxy/index.ts` - Main router
- `supabase/functions/auth-user/index.ts` - Auth router (native Supabase Auth)
- `supabase/functions/ai-gateway/index.ts` - AI router
- `supabase/functions/_shared/bubbleSync.ts` - Core sync service
- `supabase/functions/_shared/errors.ts` - Error handling

**Configuration**:
- `supabase/config.toml` - Function definitions
- `supabase/SECRETS_SETUP.md` - Secret configuration
- `supabase/CLAUDE.md` - Supabase-specific documentation

**Other Documentation**:
- `CLAUDE.md` - Root project guide
- `app/CLAUDE.md` - Frontend documentation
- `app/src/logic/CLAUDE.md` - Four-layer logic system

---

## Common Tasks

### View Function Logs
```bash
supabase functions logs bubble-proxy --tail
```

### Test Function Locally
```bash
supabase start
supabase functions serve
# In another terminal:
curl -X POST http://localhost:54321/functions/v1/bubble-proxy \
  -H "Content-Type: application/json" \
  -d '{"action": "create_listing", "payload": {"listing_name": "Test"}}'
```

### Deploy Function
```bash
supabase functions deploy bubble-proxy
```

### Set Secrets
```bash
supabase secrets set BUBBLE_API_KEY=abc123
supabase secrets set OPENAI_API_KEY=sk-...
```

---

## Design Principles (Core)

### 1. No Fallback Mechanism
Real data or nothing. No fallback logic, hardcoded values, or workarounds.

```typescript
// CORRECT
if (!data) {
  throw new BubbleApiError('Data not found', 404);
}
return data;

// WRONG
if (!data) {
  return { fallback: 'default' };  // NO!
}
```

### 2. Atomic Operations
Write-Read-Write pattern ensures Supabase stays in sync with Bubble.

1. Create in Bubble (source of truth)
2. Fetch full data from Bubble
3. Sync to Supabase (replica)
4. Return to client

### 3. Standardized Routing
All functions use action-based dispatch with the same structure.

### 4. Authentication Flexibility
- Public actions work without auth
- Protected actions require Authorization header
- Handlers receive authenticated user or guest object

### 5. Service Layering
- Router handles request/auth/dispatch
- Handlers implement business logic
- Services provide reusable utilities

---

## Troubleshooting

### Issue: "Unknown action" error
**Solution**: Check that action is in `allowedActions` array and has a case in switch statement

### Issue: Auth not working
**Solution**: For public actions, ensure action is in `PUBLIC_ACTIONS` array; for protected actions, ensure Authorization header is sent

### Issue: Supabase sync failing silently
**Solution**: This is by design (best-effort); check `supabase/functions/_shared/bubbleSync.ts` to see which operations are critical vs best-effort

### Issue: Secrets not accessible
**Solution**: Set in Supabase Dashboard > Project Settings > Secrets, not in .env files

### Issue: CORS errors in browser
**Solution**: All functions return CORS headers automatically from `_shared/cors.ts`

---

## Related Documentation

- **Project Root Guide**: See `CLAUDE.md` in project root
- **Supabase Guide**: See `supabase/CLAUDE.md` for detailed Supabase docs
- **Frontend Guide**: See `app/CLAUDE.md` for React frontend
- **Logic Architecture**: See `app/src/logic/CLAUDE.md` for four-layer logic system
- **Database Schema**: See `DATABASE_SCHEMA_OVERVIEW.md` for table definitions

---

## Version & Status

**Document Version**: 3.0
**Last Updated**: 2025-12-04
**Status**: Complete and ready for use

**Included Files**:
- QUICK_REFERENCE.md - Quick lookup for common tasks
- ARCHITECTURE_ANALYSIS.md - Complete architecture breakdown
- VISUAL_GUIDE.md - Visual diagrams and explanations
- README.md - This navigation guide

**Next Steps**:
- Read QUICK_REFERENCE.md if adding a new handler
- Read ARCHITECTURE_ANALYSIS.md for deep understanding
- Check VISUAL_GUIDE.md if you prefer visual learning

