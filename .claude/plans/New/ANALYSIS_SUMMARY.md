# Edge Functions Architecture - Analysis Summary

**Date**: 2025-12-04
**Status**: Analysis Complete - Ready for Implementation
**Location**: `Documentation/EdgeFunctions/`

---

## What Was Analyzed

Comprehensive exploration of the Split Lease Supabase Edge Functions architecture, covering:

1. **5 Edge Functions** with 18 total handlers
2. **7 Shared Utilities** providing reusable services
3. **Action-based routing pattern** used across all functions
4. **Handler organization** and responsibility separation
5. **Authentication models** (optional, required, per-prompt)
6. **Error handling** with custom error classes
7. **Validation framework** for input safety
8. **Data synchronization** patterns (Write-Read-Write)
9. **Design principles** (No Fallback, Atomic, Direct)

---

## Key Findings

### Architecture Pattern: Action-Based Routing

Every Edge Function follows the same structure:

```
REQUEST: {action: "name", payload: {...}}
    ↓
ROUTER: Parse, validate, authenticate
    ↓
DISPATCH: Switch on action → handler
    ↓
HANDLER: Business logic, return result
    ↓
RESPONSE: {success: true|false, data|error}
```

**Benefit**: Standardized, easy to understand, scales well

### Five Main Functions

| Function | Purpose | Handlers | Pattern |
|----------|---------|----------|---------|
| bubble-proxy | API proxy | 9 | Sync + Workflow |
| bubble-auth-proxy | Authentication | 4 | Bubble workflows |
| ai-gateway | AI completions | 2 | Registry + loaders |
| ai-signup-guest | Guest signup | 1 | AI powered |
| slack | Notifications | 1 | Simple dispatch |

### Shared Services Library

Located in `_shared/`, these utilities handle cross-cutting concerns:

1. **BubbleSyncService** - Atomic Write-Read-Write pattern
2. **Error Classes** - Custom errors with HTTP status mapping
3. **Validation** - Input validation utilities
4. **CORS** - Cross-origin headers
5. **Types** - TypeScript interfaces
6. **OpenAI** - AI API wrapper
7. **AI Types** - Prompt registry and loaders

### Design Principles Applied

1. **No Fallback Mechanism**
   - Real data or errors, never defaults
   - Fail fast on validation failures
   - Errors propagate, not hidden

2. **Atomic Operations**
   - Write to Bubble (source of truth)
   - Read full data from Bubble
   - Sync to Supabase (replica)
   - Return synced data

3. **Action-Based Routing**
   - Standardized request format
   - Explicit switch dispatch
   - Easy to add new actions

4. **Authentication Flexibility**
   - Public actions (no auth)
   - Protected actions (auth required)
   - Per-prompt authentication (ai-gateway)

5. **Service Layering**
   - Separation of concerns
   - Testable, maintainable code
   - Reusable utilities

---

## Handler Organization Patterns

### Pattern 1: Simple Handler
Return data after processing
- Example: `favorites.ts`, `getListing.ts`

### Pattern 2: Workflow Handler
Trigger Bubble workflow, fetch data, sync to Supabase
- Example: `listing.ts`, `signup.ts`

### Pattern 3: Multi-Step Handler
Complex orchestration across multiple systems
- Example: `submitListing.ts`, auth handlers

### Pattern 4: AI Handler
Use registry + loaders + template interpolation
- Example: `complete.ts`, `stream.ts`

---

## File Structure Overview

```
supabase/functions/
├── _shared/                    # Reusable utilities
│   ├── bubbleSync.ts          # Core sync service
│   ├── errors.ts              # Error classes
│   ├── validation.ts          # Input validation
│   ├── cors.ts                # CORS headers
│   ├── types.ts               # TypeScript types
│   ├── aiTypes.ts             # AI types
│   └── openai.ts              # OpenAI wrapper
│
├── bubble-proxy/              # 9 handlers
│   ├── index.ts               # Router + dispatch
│   └── handlers/
│       ├── listing.ts         # Create listing
│       ├── getListing.ts      # Get listing
│       ├── favorites.ts       # Toggle favorite
│       ├── messaging.ts       # Send message
│       ├── photos.ts          # Upload photos
│       ├── referral.ts        # Submit referral
│       ├── signup.ts          # AI signup
│       ├── submitListing.ts   # Full submission
│       ├── getFavorites.ts    # Get favorites
│       └── listingSync.ts     # Sync utilities
│
├── bubble-auth-proxy/         # 4 handlers
│   ├── index.ts               # Router
│   └── handlers/
│       ├── login.ts           # User login
│       ├── signup.ts          # User registration
│       ├── logout.ts          # User logout
│       └── validate.ts        # Token validation
│
├── ai-gateway/                # 2 handlers + registry
│   ├── index.ts               # Router
│   ├── handlers/
│   │   ├── complete.ts        # Non-streaming
│   │   └── stream.ts          # SSE streaming
│   └── prompts/
│       ├── _registry.ts       # Prompt registry
│       ├── _template.ts       # Template interpolation
│       └── listing-description.ts
│
├── ai-signup-guest/           # 1 handler
│   └── index.ts
│
└── slack/                     # 1 handler
    └── index.ts
```

---

## Request-Response Lifecycle

### Example: Create Listing (bubble-proxy)

**Request**:
```json
{
  "action": "create_listing",
  "payload": {"listing_name": "My Apartment"}
}
```

**Processing**:
1. Router validates action in `allowedActions`
2. Checks if public action (yes, no auth needed)
3. Initializes `BubbleSyncService`
4. Routes to `handleListingCreate()`
5. Handler validates `listing_name` present
6. Calls `syncService.triggerWorkflow('listing_creation_in_code', params)`
7. Bubble creates listing, returns `{id: "abc123"}`
8. Handler calls `syncService.fetchBubbleObject('Listing', 'abc123')`
9. Bubble returns full listing data
10. Handler calls `syncService.syncToSupabase('listing', data)`
11. Supabase upserts listing (best-effort)
12. Handler returns listing data
13. Router wraps: `{success: true, data: listing}`
14. Returns HTTP 200 with CORS headers

**Response**:
```json
{
  "success": true,
  "data": {
    "_id": "abc123",
    "Name": "My Apartment",
    "Address": "...",
    "...": "..."
  }
}
```

---

## Error Handling Strategy

**Error Classification**:
- `ValidationError` (400) - Invalid input
- `AuthenticationError` (401) - Missing/invalid token
- `BubbleApiError` (500+) - Bubble API failures
- `SupabaseSyncError` (500) - Supabase failures
- `OpenAIError` (500+) - OpenAI failures

**Pattern**:
1. Handler throws specific error type
2. Router catches in try-catch
3. `getStatusCodeFromError()` maps to HTTP status
4. `formatErrorResponse()` formats message
5. Returns `{success: false, error: "message"}` with status

**No Fallback**:
- Never return default/fallback data
- Always fail with descriptive error
- Client gets clear indication of what failed

---

## Documentation Delivered

**In `Documentation/EdgeFunctions/`**:

1. **README.md** (2 KB)
   - Navigation guide
   - Overview of all functions
   - Quick task reference

2. **QUICK_REFERENCE.md** (15 KB)
   - Curl examples for all actions
   - Copy-paste handler templates
   - Common patterns and mistakes
   - Debugging tips
   - Error scenarios

3. **ARCHITECTURE_ANALYSIS.md** (30 KB)
   - Detailed breakdown of each function
   - Handler organization patterns
   - Shared utilities deep dive
   - Error handling flow
   - Request-response lifecycle
   - Design principles explained
   - Adding new handlers guide

4. **VISUAL_GUIDE.md** (28 KB)
   - System architecture diagram
   - Request flow diagrams (3 types)
   - BubbleSyncService pattern diagram
   - Layered architecture diagram
   - Service dependencies diagram
   - Error handling flowchart
   - Authentication decision tree
   - Data flow end-to-end
   - Step-by-step: add new handler

---

## Key Insights

### 1. Consistency Through Patterns

All 5 functions follow the same routing pattern. This makes the system:
- **Predictable**: Every function works the same way
- **Maintainable**: Same structure everywhere
- **Extensible**: Easy to add new actions

### 2. Separation of Concerns

Three layers:
- **Router** (index.ts): Request handling and dispatch
- **Handlers** (handlers/*.ts): Business logic
- **Services** (_shared/*.ts): Reusable utilities

This separation makes code:
- **Testable**: Handlers are pure functions
- **Reusable**: Services used by multiple handlers
- **Maintainable**: Changes isolated to one layer

### 3. Atomic Sync Pattern

The Write-Read-Write pattern ensures:
- **Data Consistency**: Supabase always in sync with Bubble
- **Reliability**: Failures are explicit, not hidden
- **Traceability**: Clear logs of each step

### 4. Authentication Model

Different functions use different auth models:
- **bubble-proxy**: Mix of public and protected actions
- **bubble-auth-proxy**: No auth (endpoints ARE auth)
- **ai-gateway**: Per-prompt configuration

This flexibility allows:
- **Public APIs**: For unauthenticated users
- **Protected APIs**: For authenticated operations
- **Conditional Auth**: Based on resource type

### 5. No Fallback Principle

This core principle means:
- **Transparency**: No hidden defaults
- **Safety**: Bad data doesn't silently corrupt system
- **Debugging**: Real errors, not mysterious empty responses

---

## Common Implementation Scenarios

### Scenario 1: Add Public Action to bubble-proxy
1. Create handler in `handlers/newAction.ts`
2. Import in `index.ts`
3. Add to `allowedActions`
4. Add to `PUBLIC_ACTIONS`
5. Add case to switch
6. Test and deploy

### Scenario 2: Add Protected Action to bubble-proxy
1-3. Same as above
4. Skip adding to `PUBLIC_ACTIONS`
5-6. Same as above

### Scenario 3: Add AI Prompt
1. Create prompt config in `ai-gateway/prompts/myPrompt.ts`
2. Import and register in `_registry.ts`
3. Add loaders if needed in `_registry.ts`
4. Deploy

### Scenario 4: Debug Failing Handler
1. Check function logs: `supabase functions logs function-name`
2. Look for handler console.log statements
3. Check error type in response
4. Verify secrets in Supabase Dashboard
5. Test locally with `supabase functions serve`

---

## Next Steps

### For New Development
1. Read `QUICK_REFERENCE.md` for templates
2. Read `ARCHITECTURE_ANALYSIS.md` for patterns
3. Follow handler template
4. Test locally before deploying

### For Maintenance
1. Check `VISUAL_GUIDE.md` for architecture diagrams
2. Use error classes from `_shared/errors.ts`
3. Leverage validation from `_shared/validation.ts`
4. Use BubbleSyncService for data operations

### For Learning
1. Start with `README.md` for overview
2. Read `QUICK_REFERENCE.md` for examples
3. Study handler implementations in code
4. Reference `ARCHITECTURE_ANALYSIS.md` for deep understanding
5. Use `VISUAL_GUIDE.md` to see request flows

---

## Critical Files Reference

**Core Router Files**:
- `/supabase/functions/bubble-proxy/index.ts` (222 lines)
- `/supabase/functions/bubble-auth-proxy/index.ts` (144 lines)
- `/supabase/functions/ai-gateway/index.ts` (157 lines)

**Core Service Files**:
- `/supabase/functions/_shared/bubbleSync.ts` (200+ lines)
- `/supabase/functions/_shared/errors.ts` (85 lines)
- `/supabase/functions/_shared/validation.ts` (68 lines)

**Example Handler Files**:
- `/supabase/functions/bubble-proxy/handlers/listing.ts` (80+ lines)
- `/supabase/functions/bubble-proxy/handlers/favorites.ts` (135 lines)
- `/supabase/functions/ai-gateway/handlers/complete.ts` (117 lines)

---

## Metrics

- **Total Edge Functions**: 5
- **Total Handlers**: 18
- **Shared Utilities**: 7
- **Lines of Analysis**: 2,000+
- **Diagrams Created**: 9
- **Code Examples**: 50+
- **Documentation Pages**: 4

---

## Document Cross-References

**Related Documentation**:
- `CLAUDE.md` - Root project guide
- `supabase/CLAUDE.md` - Supabase-specific docs
- `app/CLAUDE.md` - Frontend documentation
- `DATABASE_SCHEMA_OVERVIEW.md` - Database schema
- `Documentation/Auth/` - Authentication flows
- `Documentation/Database/` - Database details

---

## Version History

- **v1.0** (2025-12-04) - Initial analysis completed
  - Explored all 5 functions
  - Analyzed routing patterns
  - Documented handler organization
  - Created visual guides
  - Provided quick reference

---

**STATUS**: ✅ Analysis Complete

All four comprehensive documentation files have been created and committed to the repository in `Documentation/EdgeFunctions/`. The architecture is well-understood and documented for future developers.

**Next Action**: Use these documents when:
- Implementing new handlers
- Adding new Edge Functions
- Debugging function issues
- Onboarding new developers
- Making architectural decisions

