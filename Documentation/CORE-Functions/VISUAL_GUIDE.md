# Edge Functions - Visual Architecture Guide

---

## System Architecture Diagram

```
┌─────────────────────────────────────────────────────────────────┐
│                      CLIENT APPLICATION                          │
│                    (React Frontend - app/)                        │
└─────────────────────────────────────────────────────────────────┘
                             │
                             ▼
        ┌────────────────────────────────────────┐
        │  HTTP POST Request with CORS Headers   │
        │  Content: {action, payload}            │
        │  Auth: Optional Authorization header   │
        └────────────────────────────────────────┘
                             │
          ┌──────────────────┴──────────────────┐
          │                                     │
          ▼                                     ▼
    ┌─────────────────┐              ┌─────────────────┐
    │ CORS Preflight  │              │   POST Request  │
    │  (OPTIONS)      │              │  (Processed)    │
    │                 │              │                 │
    │ Return headers  │              │ Parse payload   │
    │ HTTP 200        │              │ Validate action │
    └─────────────────┘              │ Check auth      │
                                     │ Route to handler│
                                     └────────┬────────┘
                                              │
                    ┌─────────────────────────┼─────────────────────────┐
                    │                         │                         │
                    ▼                         ▼                         ▼
         ┌────────────────────┐    ┌─────────────────────┐   ┌──────────────────┐
         │  bubble-proxy      │    │ auth-user   │   │  ai-gateway      │
         │  (9 handlers)      │    │ (4 handlers)        │   │  (2 handlers)    │
         └────────┬───────────┘    └──────────┬──────────┘   └────────┬─────────┘
                  │                           │                       │
    ┌─────────────┼─────────────┐  ┌──────────┼──────────┐  ┌────────┼────────┐
    │             │             │  │          │          │  │        │        │
    ▼             ▼             ▼  ▼          ▼          ▼  ▼        ▼        ▼
 Handler1    Handler2       Handler9    Handler1    Handler2    Handler1  Handler2
 (action1)   (action2)      (action9)   (login)     (logout)    (complete) (stream)
                                       (signup)    (validate)
```

---

## Request Flow for Each Function Type

### Flow 1: bubble-proxy (General API Proxy)

```
REQUEST: {action: "create_listing", payload: {listing_name: "Apt"}}
    │
    ▼
INDEX.TS ROUTER
    │
    ├─→ if (req.method !== 'POST') → REJECT
    ├─→ Parse body
    ├─→ Validate action in allowedActions
    ├─→ Check if action is PUBLIC
    │   └─→ if PUBLIC: Skip auth
    │   └─→ if NOT PUBLIC: Require Authorization header
    ├─→ Initialize BubbleSyncService (with API secrets)
    ├─→ Switch on action
    │
    ├─→ case 'create_listing':
    │       ├─→ HANDLER: handleListingCreate()
    │       │       ├─→ Validate payload
    │       │       ├─→ Call: syncService.triggerWorkflow()
    │       │       │   └─→ BUBBLE API: Create listing
    │       │       │   └─→ Return: {id: "abc123"}
    │       │       ├─→ Call: syncService.fetchBubbleObject()
    │       │       │   └─→ BUBBLE API: Fetch full data
    │       │       │   └─→ Return: {_id, Name, Address, ...}
    │       │       ├─→ Call: syncService.syncToSupabase()
    │       │       │   └─→ SUPABASE: Upsert listing table
    │       │       │   └─→ Return: ✓ or log error
    │       │       └─→ Return: listing data
    │
    ├─→ case 'toggle_favorite':
    │       ├─→ HANDLER: handleFavorites()
    │       │       ├─→ Validate payload
    │       │       ├─→ Init: Supabase client (service role)
    │       │       ├─→ Fetch: Current favorites from user table
    │       │       ├─→ Transform: Add/remove listing from array
    │       │       ├─→ Update: user.favorites via RPC
    │       │       └─→ Return: {success: true, favorites: [...]}
    │
    └─→ WRAP RESPONSE
        ├─→ {success: true, data: {result}}
        ├─→ Add corsHeaders
        ├─→ Return HTTP 200
```

### Flow 2: auth-user (Authentication)

```
REQUEST: {action: "signup", payload: {email, password, retype}}
    │
    ▼
INDEX.TS ROUTER
    │
    ├─→ if (req.method !== 'POST') → REJECT
    ├─→ Parse body
    ├─→ Validate action (login|signup|logout|validate)
    ├─→ NO AUTHENTICATION (can't require auth to log in!)
    ├─→ Switch on action
    │
    ├─→ case 'signup':
    │       ├─→ HANDLER: handleSignup()
    │       │       ├─→ Validate: email, password, retype
    │       │       ├─→ Call: BUBBLE WORKFLOW (wf/signup-user)
    │       │       │   └─→ BUBBLE API: Create user
    │       │       │   └─→ Return: {token, user_id, expires}
    │       │       ├─→ Call: supabase.auth.admin.createUser()
    │       │       │   └─→ SUPABASE AUTH: Create auth user
    │       │       │   └─→ If fails: Log & continue (best-effort)
    │       │       ├─→ Call: supabase.from('user').upsert()
    │       │       │   └─→ SUPABASE: Create user profile
    │       │       │   └─→ MUST succeed
    │       │       └─→ Return: {token, user_id, expires}
    │
    ├─→ case 'login':
    │       ├─→ HANDLER: handleLogin()
    │       │       ├─→ Call: BUBBLE WORKFLOW (wf/login-user)
    │       │       └─→ Return: {token, user_id, expires}
    │
    └─→ WRAP RESPONSE
        ├─→ {success: true, data: {result}}
        ├─→ Add corsHeaders
        ├─→ Return HTTP 200
```

### Flow 3: ai-gateway (AI Service)

```
REQUEST: {action: "complete", payload: {prompt_key: "listing-description", variables: {...}}}
    │
    ▼
INDEX.TS ROUTER
    │
    ├─→ if (req.method !== 'POST') → REJECT
    ├─→ Parse body
    ├─→ Validate: action, payload, prompt_key
    ├─→ Check if prompt is PUBLIC
    │   ├─→ if PUBLIC (e.g., "listing-description"):
    │   │   └─→ Skip authentication
    │   └─→ if PROTECTED:
    │       └─→ Require Authorization header
    │       └─→ Validate JWT token
    ├─→ Initialize:
    │   ├─→ authClient (for JWT validation)
    │   └─→ serviceClient (for data loading)
    ├─→ Switch on action
    │
    ├─→ case 'complete':
    │       ├─→ HANDLER: handleComplete(context)
    │       │       ├─→ Get prompt config from REGISTRY
    │       │       │   └─→ prompts.get(payload.prompt_key)
    │       │       ├─→ Load required data
    │       │       │   ├─→ For each loader in promptConfig.requiredLoaders
    │       │       │   ├─→ Call: loader.load(context)
    │       │       │   └─→ Merge results
    │       │       ├─→ Build messages
    │       │       │   ├─→ systemPrompt: from config
    │       │       │   ├─→ userPrompt: interpolate template
    │       │       │   └─→ Substitute: {{variable}} → loaded data
    │       │       ├─→ Call: openai.complete(messages, options)
    │       │       │   └─→ OPENAI API: Get completion
    │       │       │   └─→ Return: {content, model, usage}
    │       │       └─→ Return: {content, model, usage}
    │
    ├─→ case 'stream':
    │       ├─→ HANDLER: handleStream(context)
    │       │       ├─→ Same as complete, but:
    │       │       └─→ Return: ReadableStream (SSE)
    │
    └─→ WRAP RESPONSE
        ├─→ {success: true, data: {result}}
        ├─→ Add corsHeaders
        ├─→ Return HTTP 200
```

---

## BubbleSyncService: Write-Read-Write Pattern

```
┌─────────────────────────────────────────────────────────────┐
│                 BubbleSyncService                            │
│        (Core Data Synchronization Pattern)                   │
└─────────────────────────────────────────────────────────────┘

CLIENT REQUEST
    │
    ▼
┌─────────────────────────────────────────┐
│ STEP 1: WRITE TO BUBBLE (Source Truth)  │
│                                         │
│ triggerWorkflow(name, params)           │
│     ├─→ POST /wf/{workflowName}         │
│     ├─→ Headers: Authorization: Bearer  │
│     ├─→ Body: {params}                  │
│     └─→ Returns: {id: "abc123"}         │
│                                         │
│ CRITICAL: Must succeed or FAIL          │
└────────────────────┬────────────────────┘
                     │
                     ▼
┌─────────────────────────────────────────┐
│ STEP 2: READ FROM BUBBLE (Full Data)    │
│                                         │
│ fetchBubbleObject(type, id)             │
│     ├─→ GET /obj/Listing?id=abc123      │
│     ├─→ Headers: Authorization: Bearer  │
│     └─→ Returns: {...all fields...}     │
│                                         │
│ CRITICAL: Must succeed or FAIL          │
│ (With fallback: return minimal data)    │
└────────────────────┬────────────────────┘
                     │
                     ▼
┌─────────────────────────────────────────┐
│ STEP 3: SYNC TO SUPABASE (Replica)      │
│                                         │
│ syncToSupabase(table, data)             │
│     ├─→ UPSERT INTO {table} VALUES({}) │
│     ├─→ ServiceClient (bypasses RLS)    │
│     └─→ Returns: {response}             │
│                                         │
│ BEST-EFFORT: Log error, continue       │
│ (Supabase out of sync is recoverable)   │
└────────────────────┬────────────────────┘
                     │
                     ▼
             RETURN TO CLIENT
             {success: true, data}
```

---

## Handler Organization: Layered Architecture

```
┌─────────────────────────────────────────────────────────────┐
│                    index.ts (Router)                         │
│                                                              │
│  ┌──────────────────────────────────────────────────────┐  │
│  │ LAYER 1: Request Parsing                             │  │
│  │ - Parse JSON body                                    │  │
│  │ - Extract action and payload                         │  │
│  │ - Check HTTP method                                  │  │
│  └──────────────────────────────────────────────────────┘  │
│                         │                                    │
│  ┌──────────────────────▼──────────────────────────────┐  │
│  │ LAYER 2: Validation & Authorization                 │  │
│  │ - Validate required fields                          │  │
│  │ - Validate action in allowed list                   │  │
│  │ - Check authentication (optional or required)       │  │
│  └──────────────────────────────────────────────────────┘  │
│                         │                                    │
│  ┌──────────────────────▼──────────────────────────────┐  │
│  │ LAYER 3: Service Initialization                     │  │
│  │ - Load secrets from Deno.env                        │  │
│  │ - Initialize BubbleSyncService                      │  │
│  │ - Initialize Supabase clients                       │  │
│  └──────────────────────────────────────────────────────┘  │
│                         │                                    │
│  ┌──────────────────────▼──────────────────────────────┐  │
│  │ LAYER 4: Action Dispatch                            │  │
│  │ - Switch on action                                  │  │
│  │ - Route to appropriate handler                      │  │
│  │ - Pass services and payload                         │  │
│  └──────────────────────────────────────────────────────┘  │
└─────────────────────────────────────────────────────────────┘
                         │
        ┌────────────────┼────────────────┐
        │                │                │
        ▼                ▼                ▼
   ┌─────────┐      ┌─────────┐      ┌─────────┐
   │ Handler │      │ Handler │      │ Handler │
   │    1    │      │    2    │      │    N    │
   │         │      │         │      │         │
   │ Payload │      │ Payload │      │ Payload │
   │Validate │      │Validate │      │Validate │
   │         │      │         │      │         │
   │Business │      │Business │      │Business │
   │ Logic   │      │ Logic   │      │ Logic   │
   │         │      │         │      │         │
   │ Return  │      │ Return  │      │ Return  │
   │ Result  │      │ Result  │      │ Result  │
   └────┬────┘      └────┬────┘      └────┬────┘
        │                │                │
        └────────────────┼────────────────┘
                         │
        ┌────────────────▼────────────────┐
        │    Error Handling & Response    │
        │  - Catch errors from handlers   │
        │  - Format error response        │
        │  - Get appropriate HTTP status  │
        │  - Add CORS headers             │
        └─────────────────────────────────┘
                         │
                         ▼
        ┌────────────────────────────────┐
        │   Return HTTP Response         │
        │   {success, data/error}        │
        │   + CORS Headers               │
        └────────────────────────────────┘
```

---

## Shared Utilities: Service Dependencies

```
┌────────────────────────────────────────────────────────────┐
│               Shared Utilities (_shared/)                   │
└────────────────────────────────────────────────────────────┘
          │           │           │           │           │
          ▼           ▼           ▼           ▼           ▼
    ┌──────────┐ ┌────────┐ ┌──────────┐ ┌───────────┐ ┌─────┐
    │ bubbleSync│ │ errors │ │validation│ │   types   │ │cors │
    │          │ │        │ │          │ │           │ │     │
    │• trigger │ │• Bubble│ │• Email   │ │• EdgeFunc │ │• AC- │
    │  Workflow│ │• Supabase•• Required│ │  Request  │ │  Allow│
    │• fetch   │ │• Validation         │ │• User     │ │• AC- │
    │  Object  │ │• Auth error         │ │• Response │ │  Allow│
    │• sync    │ │• OpenAI             │ │• BubbleWF │ │  Meth│
    │  ToSupab │ │                     │ │  Response │ │     │
    │          │ │                     │ │• WorkflowConfig    │
    └────┬─────┘ └────┬────┘ └────┬─────┘ └─────┬─────┘ └──┬──┘
         │             │          │             │        │
         └─────────────┼──────────┼─────────────┼────────┘
                       ▼          ▼             ▼
                    ┌────────────────────────────────────┐
                    │  All Handler Functions             │
                    │                                    │
                    │  Import as needed:                 │
                    │  - validateRequiredFields()        │
                    │  - BubbleApiError, etc             │
                    │  - corsHeaders                     │
                    │  - User, EdgeFunctionResponse      │
                    └────────────────────────────────────┘
```

---

## Error Handling Flow

```
Handler throws error
    │
    ▼
┌─────────────────────────────────────────┐
│  Catch in index.ts try-catch            │
│  console.error logs details             │
└────────────────┬────────────────────────┘
                 │
                 ▼
        ┌────────────────────┐
        │ Is error instance? │
        └────┬───────────────┘
            │
    ┌───────┼───────┬──────────┬────────────┬──────────┐
    │       │       │          │            │          │
    ▼       ▼       ▼          ▼            ▼          ▼
 BubbleApi  Supabase Validation Authen-   OpenAI    Default
  Error     Sync      Error     tication   Error     Error
  Error              Error
    │       │       │          │            │          │
    ▼       ▼       ▼          ▼            ▼          ▼
  500/     500     400        401         500/      500
  (var)                       (var)

All errors mapped to HTTP status code via
getStatusCodeFromError(error)

Formatted via formatErrorResponse(error) →
{
  success: false,
  error: "error.message"
}

Wrapped with CORS headers and returned to client
```

---

## Authentication Decision Tree

```
REQUEST ARRIVES
    │
    ▼
┌─────────────────────────────────────┐
│ What type of function?              │
└────────┬────────────────────────────┘
         │
    ┌────┴─────────────────┐
    │                      │
    ▼                      ▼
bubble-proxy        auth-user
    │                      │
    ├─ Get action          └─ ACTION IS LOGIN/SIGNUP
    │                          ├─ NO auth required
    │                          ├─ (Can't require auth to log in!)
    │                          └─ Validate payload only
    ├─ Is action public?
    │   (in PUBLIC_ACTIONS)
    │
    ├─ YES: Public Action
    │   ├─ Check for Authorization header
    │   ├─ If present AND valid: Use authenticated user
    │   ├─ If missing or invalid: Create guest {id: 'guest'}
    │   └─ PROCEED (no error)
    │
    └─ NO: Protected Action
        ├─ Check for Authorization header
        ├─ If missing: THROW AuthenticationError (401)
        ├─ If present:
        │   ├─ Validate JWT token
        │   ├─ If valid: Use authenticated user
        │   └─ If invalid: THROW AuthenticationError (401)


                        ai-gateway
                            │
                        Get prompt_key from payload
                            │
                    ┌───────┴────────┐
                    │                │
                    ▼                ▼
                Is PUBLIC?       Is PROTECTED?
                (in config)      (in config)
                    │                │
                    ├─ NO auth       ├─ REQUIRE auth
                    │   required     │ ├─ Check header
                    │   PROCEED      │ ├─ Validate JWT
                    │                │ └─ Use user ID
                    │                │
                    └────────┬───────┘
                             │
                        PROCEED with handler
```

---

## Data Flow: From Request to Response

```
CLIENT
  │
  ├─ Authorization: Bearer <token>        (Optional header)
  ├─ Content-Type: application/json       (Required)
  └─ Body: {                              (Required)
       "action": "create_listing",
       "payload": {
         "listing_name": "My Apartment"
       }
     }
  │
  ▼
HTTP POST to /functions/v1/bubble-proxy
  │
  ▼
SUPABASE EDGE RUNTIME
  ├─ Route to bubble-proxy/index.ts
  └─ Inject environment variables
  │
  ▼
INDEX.TS MAIN HANDLER
  │
  ├─ OPTIONS request? → Return 200 + headers
  ├─ Not POST? → Throw error
  ├─ Parse JSON body
  ├─ Validate action present
  ├─ Validate action supported
  ├─ Load secrets from Deno.env
  ├─ Check auth (if required)
  ├─ Initialize services
  └─ Switch to handler
     │
     ▼
  HANDLER (e.g., handleListingCreate)
     │
     ├─ Validate payload fields
     ├─ Build Bubble API request
     ├─ Call Bubble workflow
     ├─ Parse Bubble response
     ├─ Call Bubble Data API
     ├─ Transform data
     ├─ Call Supabase RPC/INSERT
     ├─ Log results
     └─ Return data object
     │
     ▼
  BACK TO INDEX.TS
     │
     ├─ Error? Catch in try-catch
     │ ├─ Format error response
     │ ├─ Get HTTP status code
     │ ├─ Wrap with cors headers
     │ └─ Return error Response
     │
     └─ Success? Wrap data
       ├─ {success: true, data: handler_result}
       ├─ Add cors headers
       ├─ Set status 200
       └─ Return Response
         │
         ▼
     HTTP RESPONSE
       ├─ Status: 200 (or error code)
       ├─ Headers: CORS + Content-Type: application/json
       └─ Body: {success: true/false, data: ..., error: ...}
         │
         ▼
     EDGE RUNTIME SENDS TO CLIENT
         │
         ▼
     CLIENT JAVASCRIPT
       ├─ Parse JSON response
       ├─ Check response.success
       ├─ Handle data or error
       └─ Update UI
```

---

## Adding New Handler: Step-by-Step

```
DECISION: Add "export_listing" action to bubble-proxy
    │
    ▼
┌─ Step 1: Create Handler File
│  └─ Create: supabase/functions/bubble-proxy/handlers/exportListing.ts
│     └─ Exports: async function handleExportListing(syncService, payload, user)
│
├─ Step 2: Update Router (index.ts)
│  ├─ Add import: import { handleExportListing } from './handlers/exportListing.ts'
│  ├─ Add to allowedActions: ['export_listing', ...]
│  ├─ Add to PUBLIC_ACTIONS or not (depends on auth)
│  └─ Add to switch statement:
│     case 'export_listing':
│       result = await handleExportListing(syncService, payload, user);
│       break;
│
├─ Step 3: Test Locally
│  ├─ supabase functions serve
│  └─ curl -X POST http://localhost:54321/functions/v1/bubble-proxy \
│     -H "Content-Type: application/json" \
│     -d '{"action": "export_listing", "payload": {...}}'
│
└─ Step 4: Deploy
   └─ supabase functions deploy bubble-proxy
```

---

**DIAGRAM_VERSION**: 1.0
**CREATED**: 2025-12-04

