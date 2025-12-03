# Supabase - Backend Infrastructure

**GENERATED**: 2025-12-02
**PARENT**: / (project root)

---

## ### DIRECTORY_INTENT ###

[PURPOSE]: Backend infrastructure with Edge Functions and database configuration
[RUNTIME]: Deno (Edge Functions), PostgreSQL (Database)
[PATTERN]: Serverless functions proxying to Bubble.io and handling AI services

---

## ### SUBDIRECTORIES ###

### functions/
[INTENT]: Deno Edge Functions for API proxying and AI services
[SUBDIRS]: _shared/, ai-gateway/, ai-signup-guest/, bubble-auth-proxy/, bubble-proxy/
[FILES]: 25+ TypeScript files
[ENDPOINT_COUNT]: 4 main functions

---

## ### FILE_INVENTORY ###

### config.toml
[INTENT]: Supabase project configuration
[CONTAINS]: Project ID, API settings, database connection, Edge Function options

### SECRETS_SETUP.md
[INTENT]: Documentation for configuring required secrets in Supabase Dashboard

### .gitignore
[INTENT]: Git ignore rules for Supabase CLI artifacts

---

## ### REQUIRED_SECRETS ###

Configure in **Supabase Dashboard → Project Settings → Edge Functions → Secrets**:

| Secret Name | Value | Used By |
|-------------|-------|---------|
| `BUBBLE_API_BASE_URL` | `https://app.split.lease/version-test/api/1.1` | bubble-proxy, bubble-auth-proxy, ai-signup-guest |
| `BUBBLE_API_KEY` | (stored in Supabase Dashboard) | bubble-proxy, bubble-auth-proxy, ai-signup-guest |
| `OPENAI_API_KEY` | (stored in Supabase Dashboard) | ai-gateway |
| `SUPABASE_URL` | Auto-provided by Supabase | All functions |
| `SUPABASE_ANON_KEY` | Auto-provided by Supabase | bubble-proxy, ai-gateway |
| `SUPABASE_SERVICE_ROLE_KEY` | Auto-provided by Supabase | bubble-proxy, bubble-auth-proxy, ai-gateway |

**IMPORTANT**: `app.split.lease` and `upgradefromstr.bubbleapps.io` point to the same Bubble application. Use `BUBBLE_API_BASE_URL` for all Bubble API calls.

---

## ### EDGE_FUNCTIONS_OVERVIEW ###

| Function | Version | Purpose | Auth Required |
|----------|---------|---------|---------------|
| bubble-auth-proxy | v22 | Authentication (login, signup, logout, validate) | No (these ARE auth endpoints) |
| bubble-proxy | v26 | General Bubble API proxy | Optional (some actions public) |
| ai-gateway | v12 | AI completions and streaming | Optional (some prompts public) |
| ai-signup-guest | v11 | Guest market research signup | No |

---

## ### BUBBLE-AUTH-PROXY ###

**Endpoint**: `POST /bubble-auth-proxy`
**Purpose**: Authentication proxy handling login, signup, logout, and token validation

### Actions

#### login
**Bubble Workflow**: `{BUBBLE_API_BASE_URL}/wf/login-user`
**Request**:
```json
{
  "action": "login",
  "payload": {
    "email": "user@example.com",
    "password": "userpassword"
  }
}
```
**Response**:
```json
{
  "success": true,
  "data": {
    "token": "...",
    "user_id": "...",
    "expires": 86400
  }
}
```

#### signup
**Bubble Workflow**: `{BUBBLE_API_BASE_URL}/wf/signup-user`

**CRITICAL**: All parameters use **camelCase** (not snake_case). All fields are **required** by Bubble.

**Request**:
```json
{
  "action": "signup",
  "payload": {
    "email": "user@example.com",
    "password": "userpassword",
    "retype": "userpassword",
    "additionalData": {
      "firstName": "John",
      "lastName": "Doe",
      "userType": "Guest",
      "birthDate": "1990-05-15",
      "phoneNumber": "+1234567890"
    }
  }
}
```

**Parameters sent to Bubble** (all camelCase, all required):
| Parameter | Type | Format |
|-----------|------|--------|
| `email` | string | Valid email |
| `password` | string | Min 4 characters |
| `retype` | string | Must match password |
| `firstName` | string | User's first name |
| `lastName` | string | User's last name |
| `userType` | string | "Host" or "Guest" |
| `birthDate` | string | ISO format: YYYY-MM-DD |
| `phoneNumber` | string | Phone number |

**Response**:
```json
{
  "success": true,
  "data": {
    "token": "...",
    "user_id": "...",
    "expires": 86400
  }
}
```

**Error Reasons from Bubble**:
- `NOT_VALID_EMAIL`: Invalid email format
- `USED_EMAIL`: Email already registered
- `DO_NOT_MATCH`: Passwords don't match

#### logout
**Bubble Workflow**: `{BUBBLE_API_BASE_URL}/wf/logout-user`
**Note**: Always succeeds locally even if Bubble API fails (ensures users can clear session)
**Request**:
```json
{
  "action": "logout",
  "payload": {
    "token": "user_auth_token"
  }
}
```

#### validate
**Purpose**: Validates session and fetches user data from Supabase
**Note**: Token validation against Bubble is skipped; user existence is verified in Supabase
**Request**:
```json
{
  "action": "validate",
  "payload": {
    "token": "user_auth_token",
    "user_id": "bubble_user_id"
  }
}
```
**Response**:
```json
{
  "success": true,
  "data": {
    "userId": "...",
    "firstName": "John",
    "fullName": "John Doe",
    "profilePhoto": "https://...",
    "userType": "Guest"
  }
}
```

---

## ### BUBBLE-PROXY ###

**Endpoint**: `POST /bubble-proxy`
**Purpose**: General API proxy for Bubble workflows

### Public Actions (No Auth Required)
- `create_listing` - Create new listing with Supabase sync
- `get_listing` - Fetch listing data from Bubble
- `send_message` - Send message to host
- `signup_ai` - AI-powered signup
- `upload_photos` - Upload listing photos

### Protected Actions (Auth Required)
- `submit_listing` - Full listing submission with all form data
- `submit_referral` - Submit referral

### Request Format
```json
{
  "action": "get_listing",
  "payload": {
    "listing_id": "..."
  }
}
```

---

## ### AI-GATEWAY ###

**Endpoint**: `POST /ai-gateway`
**Purpose**: AI service gateway for completions and streaming

### Actions
- `complete` - Non-streaming completion
- `stream` - SSE streaming completion

### Public Prompts (No Auth Required)
- `listing-description`
- `echo-test`

### Request Format
```json
{
  "action": "complete",
  "payload": {
    "prompt_key": "listing-description",
    "variables": {
      "propertyType": "studio",
      "neighborhood": "Brooklyn"
    }
  }
}
```

---

## ### AI-SIGNUP-GUEST ###

**Endpoint**: `POST /ai-signup-guest`
**Purpose**: Guest market research signup (no authentication)

**Bubble Workflow**: `{BUBBLE_API_BASE_URL}/wf/ai-signup-guest`

### Request Format
```json
{
  "email": "user@example.com",
  "phone": "+1234567890",
  "text_inputted": "Looking for a studio in Brooklyn..."
}
```

### Parameters sent to Bubble
| Parameter | Required | Description |
|-----------|----------|-------------|
| `email` | Yes | Valid email address |
| `phone` | No | Phone number |
| `text inputted` | Yes | Market research description (note: space in key name) |

---

## ### ARCHITECTURE_FLOW ###

```
Frontend (app/)
    │
    ▼
Supabase Edge Functions
    │
    ├─► bubble-auth-proxy ──► Bubble.io Auth Workflows
    │   └─► /wf/login-user
    │   └─► /wf/signup-user
    │   └─► /wf/logout-user
    │
    ├─► bubble-proxy ──────► Bubble.io Data Workflows
    │   └─► /wf/listing_creation_in_code
    │   └─► /wf/core-contact-host-send-message
    │   └─► /wf/referral-index-lite
    │
    ├─► ai-gateway ────────► OpenAI API
    │
    └─► ai-signup-guest ───► Bubble.io + OpenAI
        └─► /wf/ai-signup-guest
```

---

## ### DEPLOYMENT ###

**Preferred Method**: Use Supabase MCP to deploy directly

**Alternative** (requires SUPABASE_ACCESS_TOKEN):
```bash
# Deploy single function
supabase functions deploy bubble-auth-proxy

# Deploy all functions
supabase functions deploy

# View logs
supabase functions logs bubble-auth-proxy --tail

# Test locally
supabase functions serve
```

---

## ### DATABASE_OVERVIEW ###

[TOTAL_TABLES]: 93 Supabase PostgreSQL tables
[SCHEMA_REFERENCE]: ../DATABASE_SCHEMA_OVERVIEW.md

### Key Tables
- `user` / `users`: User accounts (synced from Bubble)
- `listing`: Property listings
- `proposal` / `proposals`: Booking proposals
- `virtualmeetingschedulesandlinks`: Video call scheduling

### Lookup Tables (zat_*)
- `zat_geo_borough_toplevel`: NYC boroughs
- `zat_geo_hood_mediumlevel`: Neighborhoods
- `zat_features_amenity`: Amenities
- `zat_features_houserule`: House rules

---

## ### SECURITY_NOTES ###

[API_KEYS]: Never exposed to frontend - stored in Supabase Secrets
[VALIDATION]: All inputs validated before forwarding to Bubble
[CORS]: Configured for split.lease domain
[RLS]: Row Level Security enabled on sensitive tables
[AUTH_ENDPOINTS]: bubble-auth-proxy requires NO authentication (these ARE the auth endpoints)

---

## ### COMMON_ISSUES ###

### "date of birth is missing" Error
**Cause**: Parameters sent to Bubble using wrong field names (snake_case instead of camelCase)
**Solution**: Always use camelCase for Bubble API parameters: `firstName`, `lastName`, `birthDate`, `phoneNumber`, `userType`

### 500 Errors on Edge Functions
**Check**:
1. Secrets configured in Supabase Dashboard
2. CORS preflight handler returns 200 for OPTIONS
3. Check logs: `supabase functions logs <function-name>`

### 401/403 Errors
**Check**:
1. Token passed in Authorization header
2. Token not expired
3. Action requires auth but user not authenticated

---

## ### DOCUMENTATION ###

[SECRETS]: SECRETS_SETUP.md
[DEPLOYMENT]: ../docs/DEPLOY_EDGE_FUNCTION.md
[MIGRATION]: ../docs/MIGRATION_PLAN_BUBBLE_TO_EDGE.md

---

**SUBDIRECTORY_COUNT**: 1 (functions/)
**EDGE_FUNCTION_COUNT**: 4
**TOTAL_FILES**: 30+
