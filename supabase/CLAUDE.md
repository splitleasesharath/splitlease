# Supabase Backend - LLM Reference

**GENERATED**: 2025-12-11
**SCOPE**: Edge Functions, Shared Utilities, Configuration
**OPTIMIZATION**: Semantic Searchability + Digestibility
**RUNTIME**: Deno 2

---

## QUICK_STATS

[TOTAL_EDGE_FUNCTIONS]: 9
[TOTAL_SHARED_UTILITIES]: 9
[PRIMARY_LANGUAGE]: TypeScript
[KEY_PATTERNS]: action-based-routing, atomic-sync, no-fallback, error-collection, queue-based-sync

---

## ARCHITECTURE_PRINCIPLES

[NO_FALLBACK_PRINCIPLE]: All functions fail fast without fallback logic or default values
[ATOMIC_OPERATIONS]: Write-Read-Write pattern ensures data consistency across Bubble and Supabase
[ERROR_COLLECTION]: One request = one Slack log (consolidated error reporting)
[QUEUE_BASED_SYNC]: Async sync operations via sync_queue table for non-blocking operations
[ACTION_ROUTING]: All functions use { action, payload } pattern for consistent API interface

---

## EDGE_FUNCTIONS_OVERVIEW

### functions/auth-user/index.ts
[INTENT]: Authentication operations via Supabase Auth (native) and Bubble (legacy)
[ACTIONS]: login, signup, logout, validate, request_password_reset, update_password
[AUTH_REQUIRED]: No (these ARE the auth endpoints)
[BACKEND]: Supabase Auth for login/signup/password, Bubble for validate (legacy)
[PUBLIC_ACTIONS]: All actions are public
[ENDPOINT]: POST /functions/v1/auth-user

### functions/bubble-proxy/index.ts
[INTENT]: Proxy for Bubble API operations with atomic sync
[ACTIONS]: send_message, ai_inquiry, upload_photos, submit_referral, toggle_favorite, get_favorites, parse_profile
[AUTH_REQUIRED]: Only for submit_referral
[PUBLIC_ACTIONS]: send_message, ai_inquiry, upload_photos, toggle_favorite, get_favorites, parse_profile
[DEPRECATED_ACTIONS]: create_proposal (use /proposal), create_listing (use /listing), get_listing (use /listing)
[ENDPOINT]: POST /functions/v1/bubble-proxy
[HANDLERS_DIR]: functions/bubble-proxy/handlers/

### functions/ai-gateway/index.ts
[INTENT]: OpenAI proxy with prompt templating and data loaders
[ACTIONS]: complete (non-streaming), stream (SSE streaming)
[AUTH_REQUIRED]: Yes, except for public prompts
[PUBLIC_PROMPTS]: listing-description, listing-title, echo-test
[PROMPT_REGISTRY]: functions/ai-gateway/prompts/_registry.ts
[ENDPOINT]: POST /functions/v1/ai-gateway
[HANDLERS_DIR]: functions/ai-gateway/handlers/
[PROMPTS_DIR]: functions/ai-gateway/prompts/

### functions/bubble_sync/index.ts
[INTENT]: Process sync_queue and push data FROM Supabase TO Bubble
[ACTIONS]: process_queue (Workflow API), process_queue_data_api (Data API), sync_single, retry_failed, get_status, cleanup, build_request, sync_signup_atomic
[AUTH_REQUIRED]: No (internal service)
[SYNC_MODES]: Workflow API (/wf/) for complex operations, Data API (/obj/) for direct CRUD
[QUEUE_TABLE]: sync_queue (status: pending/processing/completed/failed)
[CRON_JOB]: Runs every 5 minutes via pg_cron
[ENDPOINT]: POST /functions/v1/bubble_sync
[HANDLERS_DIR]: functions/bubble_sync/handlers/
[LIB_DIR]: functions/bubble_sync/lib/

### functions/proposal/index.ts
[INTENT]: Proposal CRUD operations
[ACTIONS]: create, update, get, suggest
[AUTH_REQUIRED]: Yes, except for get and create (temporarily public during migration)
[PUBLIC_ACTIONS]: get, create
[ENDPOINT]: POST /functions/v1/proposal
[HANDLERS_DIR]: functions/proposal/actions/
[LIB_DIR]: functions/proposal/lib/

### functions/listing/index.ts
[INTENT]: Listing CRUD operations
[ACTIONS]: create, get, submit
[AUTH_REQUIRED]: Only for submit
[PUBLIC_ACTIONS]: create, get
[ENDPOINT]: POST /functions/v1/listing
[HANDLERS_DIR]: functions/listing/handlers/

### functions/ai-signup-guest/index.ts
[INTENT]: AI-powered guest signup flow
[AUTH_REQUIRED]: No (public signup endpoint)
[ENDPOINT]: POST /functions/v1/ai-signup-guest

### functions/slack/index.ts
[INTENT]: Slack integration for FAQ inquiries
[ACTIONS]: faq_inquiry
[AUTH_REQUIRED]: No
[ENDPOINT]: POST /functions/v1/slack

### functions/communications/index.ts
[INTENT]: Placeholder for future communications (email, SMS, in-app messaging)
[ACTIONS]: health
[AUTH_REQUIRED]: No
[ENDPOINT]: POST /functions/v1/communications
[STATUS]: Placeholder

### functions/pricing/index.ts
[INTENT]: Placeholder for future pricing calculations
[ACTIONS]: health
[AUTH_REQUIRED]: No
[ENDPOINT]: POST /functions/v1/pricing
[STATUS]: Placeholder

---

## SHARED_UTILITIES

### functions/_shared/bubbleSync.ts
[INTENT]: Core atomic sync service implementing Write-Read-Write pattern
[EXPORTS]: BubbleSyncService class
[PATTERN]: 1) Create in Bubble (source of truth), 2) Fetch from Bubble Data API, 3) Sync to Supabase (replica)
[KEY_METHODS]: triggerWorkflow(), fetchBubbleObject(), syncToSupabase(), createAndSync(), triggerWorkflowOnly()
[USED_BY]: bubble-proxy handlers, listing handlers
[NO_FALLBACK]: Throws on any failure, no default values

### functions/_shared/queueSync.ts
[INTENT]: Standardized queue-based sync utility for async Bubble operations
[EXPORTS]: enqueueBubbleSync(), enqueueSingleItem(), triggerQueueProcessing(), enqueueSignupSync(), filterBubbleIncompatibleFields()
[QUEUE_TABLE]: sync_queue
[OPERATIONS]: INSERT, UPDATE, DELETE, SIGNUP_ATOMIC
[IDEMPOTENCY]: Uses correlation_id + table + record_id + sequence
[BUBBLE_INCOMPATIBLE_FIELDS]: bubble_id, created_at, updated_at, sync_status, bubble_sync_error, pending
[USED_BY]: proposal/actions/, listing/handlers/, auth-user/handlers/
[FIRE_AND_FORGET]: Non-blocking, errors don't fail main operation

### functions/_shared/slack.ts
[INTENT]: Centralized Slack webhook operations for error reporting
[EXPORTS]: ErrorCollector class, sendToSlack(), createErrorCollector()
[PATTERN]: ONE REQUEST = ONE LOG (consolidated error reporting)
[CHANNELS]: database (default), acquisition, general
[ENV_VARS]: SLACK_WEBHOOK_DATABASE_WEBHOOK, SLACK_WEBHOOK_ACQUISITION, SLACK_WEBHOOK_GENERAL
[USED_BY]: All edge functions
[FIRE_AND_FORGET]: Zero latency impact

### functions/_shared/errors.ts
[INTENT]: Custom error classes with HTTP status mapping
[EXPORTS]: BubbleApiError, SupabaseSyncError, ValidationError, AuthenticationError, OpenAIError, formatErrorResponse(), getStatusCodeFromError()
[HTTP_STATUS]: ValidationError=400, AuthenticationError=401, BubbleApiError=variable, SupabaseSyncError=500, OpenAIError=variable
[USED_BY]: All edge functions

### functions/_shared/validation.ts
[INTENT]: Input validation utilities
[EXPORTS]: validateEmail(), validatePhone(), validateRequired(), validateRequiredFields(), validateAction()
[THROWS]: ValidationError on failure
[USED_BY]: All edge functions

### functions/_shared/cors.ts
[INTENT]: CORS headers configuration
[EXPORTS]: corsHeaders object
[HEADERS]: Access-Control-Allow-Origin: *, Access-Control-Allow-Headers: authorization, x-client-info, apikey, content-type, Access-Control-Allow-Methods: POST, GET, OPTIONS, PUT, DELETE
[USED_BY]: All edge functions

### functions/_shared/openai.ts
[INTENT]: OpenAI API wrapper for completions
[EXPORTS]: complete() (non-streaming), stream() (SSE streaming)
[MODELS]: Configurable (default: gpt-4)
[RESPONSE_FORMATS]: text, json_object
[USED_BY]: ai-gateway handlers

### functions/_shared/types.ts
[INTENT]: General TypeScript interfaces for edge functions
[EXPORTS]: EdgeFunctionRequest, BubbleWorkflowResponse, User, etc.
[USED_BY]: All edge functions

### functions/_shared/aiTypes.ts
[INTENT]: AI-specific TypeScript types
[EXPORTS]: AIGatewayRequest, PromptConfig, DataLoader, DataLoaderContext, AIOptions
[USED_BY]: ai-gateway

### functions/_shared/jsonUtils.ts
[INTENT]: JSON parsing and normalization utilities
[EXPORTS]: Helper functions for JSON manipulation
[USED_BY]: Various edge functions

---

## BUBBLE_PROXY_HANDLERS

### functions/bubble-proxy/handlers/messaging.ts
[INTENT]: Send message to host (no sync, workflow only)
[EXPORTS]: handleSendMessage()
[WORKFLOW]: send-message-to-host (Bubble)
[AUTH_REQUIRED]: No

### functions/bubble-proxy/handlers/aiInquiry.ts
[INTENT]: AI-powered market research inquiry with atomic sync
[EXPORTS]: handleAiInquiry()
[WORKFLOW]: ai-inquiry (Bubble)
[SYNC]: Atomic sync to inquiries table
[AUTH_REQUIRED]: No

### functions/bubble-proxy/handlers/photos.ts
[INTENT]: Upload listing photos with atomic sync
[EXPORTS]: handlePhotoUpload()
[WORKFLOW]: upload-photos (Bubble)
[SYNC]: Atomic sync to photos table
[AUTH_REQUIRED]: No

### functions/bubble-proxy/handlers/referral.ts
[INTENT]: Submit referral with atomic sync
[EXPORTS]: handleReferral()
[WORKFLOW]: submit-referral (Bubble)
[SYNC]: Atomic sync to referrals table
[AUTH_REQUIRED]: Yes

### functions/bubble-proxy/handlers/favorites.ts
[INTENT]: Toggle favorite listing
[EXPORTS]: handleFavorites()
[WORKFLOW]: toggle-favorite (Bubble)
[AUTH_REQUIRED]: No (uses Bubble user ID)

### functions/bubble-proxy/handlers/getFavorites.ts
[INTENT]: Get user's favorited listings
[EXPORTS]: handleGetFavorites()
[WORKFLOW]: get-favorites (Bubble)
[AUTH_REQUIRED]: No (uses Bubble user ID)

### functions/bubble-proxy/handlers/parseProfile.ts
[INTENT]: Parse user profile during AI signup
[EXPORTS]: handleParseProfile()
[OPERATION]: Supabase query only (no Bubble API)
[AUTH_REQUIRED]: No

---

## AUTH_USER_HANDLERS

### functions/auth-user/handlers/login.ts
[INTENT]: User login via Supabase Auth native
[EXPORTS]: handleLogin()
[BACKEND]: Supabase Auth (signInWithPassword)
[RETURNS]: access_token, refresh_token, user_id, supabase_user_id, user_type, host_account_id, guest_account_id

### functions/auth-user/handlers/signup.ts
[INTENT]: User registration via Supabase Auth native
[EXPORTS]: handleSignup()
[BACKEND]: Supabase Auth (signUp)
[CREATES]: Supabase auth user, public.user record, host_account, guest_account
[SYNC_QUEUE]: Enqueues SIGNUP_ATOMIC operation for Bubble sync
[RETURNS]: Same as login

### functions/auth-user/handlers/logout.ts
[INTENT]: User logout (client-side Supabase Auth signOut)
[EXPORTS]: handleLogout()
[NOTE]: Stub handler, actual logout happens client-side

### functions/auth-user/handlers/validate.ts
[INTENT]: Validate token and fetch user data
[EXPORTS]: handleValidate()
[BACKEND]: Bubble API (legacy) + Supabase
[RETURNS]: User data with accounts

### functions/auth-user/handlers/resetPassword.ts
[INTENT]: Send password reset email
[EXPORTS]: handleRequestPasswordReset()
[BACKEND]: Supabase Auth (resetPasswordForEmail)
[SECURITY]: Always returns success to prevent email enumeration

### functions/auth-user/handlers/updatePassword.ts
[INTENT]: Update password after reset link clicked
[EXPORTS]: handleUpdatePassword()
[BACKEND]: Supabase Auth (updateUser)
[REQUIRES]: Valid access_token from reset link

---

## AI_GATEWAY_HANDLERS

### functions/ai-gateway/handlers/complete.ts
[INTENT]: Non-streaming OpenAI completion
[EXPORTS]: handleComplete()
[FLOW]: Get prompt config -> Load data -> Interpolate template -> Call OpenAI -> Return response
[RETURNS]: { response: string, usage: { prompt_tokens, completion_tokens, total_tokens } }

### functions/ai-gateway/handlers/stream.ts
[INTENT]: SSE streaming OpenAI completion
[EXPORTS]: handleStream()
[FLOW]: Get prompt config -> Load data -> Interpolate template -> Call OpenAI stream -> Return ReadableStream
[RETURNS]: Server-Sent Events stream

---

## AI_GATEWAY_PROMPTS

### functions/ai-gateway/prompts/_registry.ts
[INTENT]: Central registry for prompt configs and data loaders
[EXPORTS]: registerPrompt(), getPrompt(), listPrompts(), registerLoader(), getLoader(), loadAllData()
[BUILT_IN_PROMPTS]: echo-test
[BUILT_IN_LOADERS]: user-profile
[PATTERN]: Prompts registered via registerPrompt(), loaded via getPrompt()

### functions/ai-gateway/prompts/_template.ts
[INTENT]: Template interpolation for prompt variables
[EXPORTS]: interpolate()
[SYNTAX]: {{variable}} for user variables, {{loader.field}} for data loader fields
[USED_BY]: ai-gateway handlers

### functions/ai-gateway/prompts/listing-description.ts
[INTENT]: Generate listing description from structured data
[KEY]: listing-description
[PUBLIC]: Yes
[VARIABLES]: neighborhood, amenities, beds, bathrooms, etc.
[REGISTERS]: Via registerPrompt() in _registry.ts

### functions/ai-gateway/prompts/listing-title.ts
[INTENT]: Generate listing title
[KEY]: listing-title
[PUBLIC]: Yes
[REGISTERS]: Via registerPrompt() in _registry.ts

### functions/ai-gateway/prompts/proposal-summary.ts
[INTENT]: Generate proposal summary for AI analysis
[KEY]: proposal-summary
[PUBLIC]: No (requires auth)
[REGISTERS]: Via registerPrompt() in _registry.ts

---

## BUBBLE_SYNC_HANDLERS

### functions/bubble_sync/handlers/processQueue.ts
[INTENT]: Process sync_queue items using Workflow API
[EXPORTS]: handleProcessQueue()
[BATCH_SIZE]: Configurable (default: 10)
[STATUS_FLOW]: pending -> processing -> completed/failed
[RETRY]: Failed items can be retried via retry_failed action

### functions/bubble_sync/handlers/processQueueDataApi.ts
[INTENT]: Process sync_queue items using Data API (recommended)
[EXPORTS]: handleProcessQueueDataApi()
[ADVANTAGE]: Direct CRUD without Bubble-side logic
[USED_BY]: Cron job, triggerQueueProcessing()

### functions/bubble_sync/handlers/syncSingle.ts
[INTENT]: Manually sync a single record
[EXPORTS]: handleSyncSingle()
[USE_CASE]: Ad-hoc sync, testing, debugging

### functions/bubble_sync/handlers/retryFailed.ts
[INTENT]: Retry failed sync operations
[EXPORTS]: handleRetryFailed()
[RESETS]: Status from failed -> pending

### functions/bubble_sync/handlers/getStatus.ts
[INTENT]: Get sync queue statistics
[EXPORTS]: handleGetStatus()
[RETURNS]: Counts by status (pending, processing, completed, failed)

### functions/bubble_sync/handlers/cleanup.ts
[INTENT]: Clean up old completed sync items
[EXPORTS]: handleCleanup()
[DEFAULT_RETENTION]: 7 days

### functions/bubble_sync/handlers/buildRequest.ts
[INTENT]: Preview Bubble API request without executing
[EXPORTS]: handleBuildRequest()
[USE_CASE]: Debugging, testing payload structure

### functions/bubble_sync/handlers/syncSignupAtomic.ts
[INTENT]: Handle atomic signup sync (user + host_account + guest_account)
[EXPORTS]: handleSyncSignupAtomic()
[CREATES]: 3 Bubble objects in sequence
[CORRELATES]: Via signup:{userId}

### functions/bubble_sync/handlers/propagateListingFK.ts
[INTENT]: Propagate listing foreign keys after creation
[EXPORTS]: handlePropagateListingFK()
[USE_CASE]: Update related records with new listing ID

---

## BUBBLE_SYNC_LIB

### functions/bubble_sync/lib/bubblePush.ts
[INTENT]: Core Bubble API push operations
[EXPORTS]: pushToBubble() (Workflow API)
[HTTP_METHOD]: POST to /wf/{workflow}

### functions/bubble_sync/lib/bubbleDataApi.ts
[INTENT]: Bubble Data API client
[EXPORTS]: createRecord(), updateRecord(), deleteRecord(), getRecord()
[HTTP_METHODS]: POST (create), PATCH (update), DELETE (delete), GET (read)
[ENDPOINT]: /obj/{objectType}/{id?}

### functions/bubble_sync/lib/queueManager.ts
[INTENT]: Queue operations (fetch, update status, cleanup)
[EXPORTS]: fetchPendingItems(), updateItemStatus(), cleanupCompletedItems()
[USED_BY]: All bubble_sync handlers

### functions/bubble_sync/lib/tableMapping.ts
[INTENT]: Map Supabase table names to Bubble object types
[EXPORTS]: getBubbleObjectType()
[MAPPINGS]: listing -> zat_listings, user -> user, proposal -> proposal, etc.

### functions/bubble_sync/lib/fieldMapping.ts
[INTENT]: Map Supabase field names to Bubble field names
[EXPORTS]: mapSupabaseToBubbleFields()
[MAPPINGS]: _id -> _id, created_at -> Created Date, etc.

### functions/bubble_sync/lib/transformer.ts
[INTENT]: Transform data between Supabase and Bubble formats
[EXPORTS]: transformForBubble(), transformFromBubble()
[HANDLES]: Date formats, boolean conversions, null handling

---

## PROPOSAL_ACTIONS

### functions/proposal/actions/create.ts
[INTENT]: Create new proposal
[EXPORTS]: handleCreate()
[QUEUES]: Bubble sync via enqueueBubbleSync()
[RETURNS]: Proposal with calculated prices and status

### functions/proposal/actions/update.ts
[INTENT]: Update existing proposal
[EXPORTS]: handleUpdate()
[QUEUES]: Bubble sync via enqueueBubbleSync()
[VALIDATES]: User ownership

### functions/proposal/actions/get.ts
[INTENT]: Get proposal details
[EXPORTS]: handleGet()
[RETURNS]: Proposal with all related data

### functions/proposal/actions/suggest.ts
[INTENT]: Find and create suggestion proposals
[EXPORTS]: handleSuggest()
[TYPES]: weekly_match, same_address
[CREATES]: Proposal records for suggestions

---

## PROPOSAL_LIB

### functions/proposal/lib/calculations.ts
[INTENT]: Proposal price calculations
[EXPORTS]: calculateProposalPrices(), calculateNightlyRate(), calculateServiceFee(), etc.
[USED_BY]: proposal/actions/create.ts, proposal/actions/update.ts

### functions/proposal/lib/dayConversion.ts
[INTENT]: Day indexing conversion between JavaScript (0-6) and Bubble (1-7)
[EXPORTS]: adaptDaysFromBubble(), adaptDaysToBubble()
[CRITICAL]: Use at all Bubble API boundaries

### functions/proposal/lib/validators.ts
[INTENT]: Proposal data validation
[EXPORTS]: validateProposalData(), validateDateRange(), validateNightSelection()
[THROWS]: ValidationError on failure

### functions/proposal/lib/types.ts
[INTENT]: TypeScript types for proposals
[EXPORTS]: Proposal, ProposalStatus, CreateProposalPayload, etc.

### functions/proposal/lib/status.ts
[INTENT]: Proposal status management
[EXPORTS]: getProposalStatus(), canTransitionTo(), updateProposalStatus()
[STATUSES]: pending, accepted, rejected, expired, cancelled

### functions/proposal/lib/bubbleSyncQueue.ts
[INTENT]: Proposal-specific queue sync helpers
[EXPORTS]: enqueueProposalSync()
[WRAPS]: queueSync.ts functions with proposal-specific logic

---

## LISTING_HANDLERS

### functions/listing/handlers/create.ts
[INTENT]: Create new listing (minimal data)
[EXPORTS]: handleCreate()
[WORKFLOW]: listing_creation_in_code (Bubble)
[SYNC]: Atomic sync to listing table
[RETURNS]: Listing with ID

### functions/listing/handlers/get.ts
[INTENT]: Get listing details
[EXPORTS]: handleGet()
[SOURCE]: Bubble Data API
[RETURNS]: Full listing data

### functions/listing/handlers/submit.ts
[INTENT]: Full listing submission with all form data
[EXPORTS]: handleSubmit()
[WORKFLOW]: submit_listing_full (Bubble)
[SYNC]: Atomic sync to listing table
[VALIDATES]: User ownership via email

---

## CONFIG_FILES

### config.toml
[INTENT]: Supabase local development configuration
[DEFINES]: All edge function entrypoints, Deno version, API ports
[EDGE_FUNCTIONS]: bubble-proxy, auth-user, ai-signup-guest, slack, proposal, communications, pricing, bubble_sync, listing, ai-gateway
[DENO_VERSION]: 2
[VERIFY_JWT]: false (functions handle their own auth)
[POLICY]: per_worker (enables hot reload)

### functions/bubble-proxy/deno.json
[INTENT]: Import map for bubble-proxy function
[IMPORTS]: Supabase client, shared utilities

### functions/ai-gateway/deno.json
[INTENT]: Import map for ai-gateway function
[IMPORTS]: Supabase client, OpenAI, shared utilities

### functions/proposal/deno.json
[INTENT]: Import map for proposal function
[IMPORTS]: Supabase client, shared utilities

### functions/bubble_sync/deno.json
[INTENT]: Import map for bubble_sync function
[IMPORTS]: Supabase client, shared utilities

### functions/listing/deno.json
[INTENT]: Import map for listing function
[IMPORTS]: Supabase client, shared utilities

---

## MIGRATIONS

### migrations/20251205_create_sync_queue_tables.sql
[INTENT]: Create sync_queue and related tables
[TABLES]: sync_queue
[INDEXES]: status, created_at, idempotency_key
[TRIGGERS]: None

### migrations/20251209_listing_bubble_sync_backend.sql
[INTENT]: Add Bubble sync backend for listings
[ADDS]: bubble_id, sync_status, bubble_sync_error columns to listing table

### migrations/20251209_extend_sync_queue_for_signup.sql
[INTENT]: Extend sync_queue to support SIGNUP_ATOMIC operation
[ADDS]: SIGNUP_ATOMIC to operation enum

### migrations/20251209_fix_bubble_sync_payload_filtering.sql
[INTENT]: Fix payload filtering to remove Bubble-incompatible fields
[NOTE]: This is handled in queueSync.ts now

### migrations/20251210_queue_processing_cron.sql
[INTENT]: Setup pg_cron job to process sync_queue every 5 minutes
[JOB]: SELECT cron.schedule('process-bubble-sync-queue', '*/5 * * * *', $$SELECT net.http_post(...)$$)

---

## ENVIRONMENT_VARIABLES

[SUPABASE_URL]: Supabase project URL (auto-configured)
[SUPABASE_ANON_KEY]: Supabase anon key for client operations (auto-configured)
[SUPABASE_SERVICE_ROLE_KEY]: Supabase service role key for admin operations (SECRET)
[BUBBLE_API_BASE_URL]: Bubble API base URL (SECRET)
[BUBBLE_API_KEY]: Bubble API key (SECRET)
[OPENAI_API_KEY]: OpenAI API key for AI operations (SECRET)
[SLACK_WEBHOOK_DATABASE_WEBHOOK]: Slack webhook for database errors (SECRET)
[SLACK_WEBHOOK_ACQUISITION]: Slack webhook for acquisition channel (SECRET)
[SLACK_WEBHOOK_GENERAL]: Slack webhook for general channel (SECRET)

---

## REQUEST_RESPONSE_FORMAT

### Standard Request
```json
{
  "action": "action_name",
  "payload": {
    "field1": "value1",
    "field2": "value2"
  }
}
```

### Success Response
```json
{
  "success": true,
  "data": {
    "result_field1": "value1",
    "result_field2": "value2"
  }
}
```

### Error Response
```json
{
  "success": false,
  "error": "Error message describing what went wrong"
}
```

---

## DEPLOYMENT

### Local Development
```bash
supabase start                      # Start local Supabase
supabase functions serve            # Serve all functions
supabase functions serve <name>     # Serve specific function
supabase functions logs <name>      # View function logs
```

### Production Deployment
```bash
supabase functions deploy <name>    # Deploy specific function
supabase functions deploy            # Deploy all functions
```

### Post-Deployment
[REMINDER]: Supabase Edge Functions require manual deployment
[SECRETS]: Configured in Supabase Dashboard > Project Settings > Secrets
[VERIFICATION]: Test endpoints after deployment

---

## COMMON_PATTERNS

### Authentication Pattern
```typescript
// Optional auth
const authHeader = req.headers.get('Authorization');
let user = null;
if (authHeader) {
  const { data: { user: authUser } } = await supabase.auth.getUser();
  user = authUser;
}

// Required auth
if (!user) {
  throw new AuthenticationError('Authentication required');
}
```

### Error Collection Pattern
```typescript
const collector = createErrorCollector('function-name', action);
try {
  // ... operation
} catch (error) {
  collector.add(error, 'context description');
  collector.reportToSlack();
  throw error;
}
```

### Atomic Sync Pattern
```typescript
const syncService = new BubbleSyncService(bubbleBaseUrl, bubbleApiKey, supabaseUrl, supabaseServiceKey);
const syncedData = await syncService.createAndSync(
  'workflow_name',
  params,
  'BubbleObjectType',
  'supabase_table'
);
```

### Queue Sync Pattern
```typescript
await enqueueBubbleSync(supabase, {
  correlationId: `operation:${id}`,
  items: [{
    sequence: 1,
    table: 'table_name',
    recordId: id,
    operation: 'INSERT',
    payload: data,
  }],
});
await triggerQueueProcessing();
```

---

## CRITICAL_NOTES

[DAY_INDEXING]: JavaScript: Sun=0 to Sat=6 | Bubble: Sun=1 to Sat=7 | Use adaptDaysFromBubble/adaptDaysToBubble
[UNIQUE_ID_GENERATION]: Use supabaseAdmin.rpc('generate_bubble_id') for Bubble-compatible IDs
[NO_FALLBACK]: Never add fallback logic, default values, or compatibility layers
[ERROR_HANDLING]: Fail fast, let errors propagate, client can retry
[BUBBLE_SOURCE_OF_TRUTH]: Bubble is primary database, Supabase is replica
[SYNC_PATTERN]: Create in Bubble first, then sync to Supabase
[QUEUE_PROCESSING]: Async sync via sync_queue, processed by bubble_sync function + cron job
[CORS]: All functions return CORS headers, handle OPTIONS preflight
[LOGGING]: Extensive console logging for debugging, errors go to Slack

---

**DOCUMENT_VERSION**: 2.0
**LAST_UPDATED**: 2025-12-11
**OPTIMIZED_FOR**: LLM semantic search and context digestion
