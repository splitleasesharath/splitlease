# Supabase - Backend Infrastructure

**GENERATED**: 2025-11-26
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

## ### EDGE_FUNCTIONS_OVERVIEW ###

| Function | Purpose | Handlers |
|----------|---------|----------|
| bubble-proxy | General Bubble API proxy | listing, messaging, photos, referral, signup |
| bubble-auth-proxy | Authentication proxy | login, signup, logout, validate |
| ai-gateway | AI service gateway | complete, stream |
| ai-signup-guest | Guest market research | single handler |

---

## ### REQUIRED_SECRETS ###

Configure in Supabase Dashboard → Project Settings → Secrets:

### BUBBLE_API_BASE_URL
[VALUE]: https://app.split.lease/version-test/api/1.1
[USED_BY]: bubble-proxy, bubble-auth-proxy

### BUBBLE_API_KEY
[VALUE]: See SECRETS_SETUP.md
[USED_BY]: bubble-proxy, bubble-auth-proxy

### OPENAI_API_KEY
[VALUE]: OpenAI API key
[USED_BY]: ai-gateway, ai-signup-guest

### SUPABASE_SERVICE_ROLE_KEY
[VALUE]: From Supabase Dashboard
[USED_BY]: Server-side operations requiring elevated permissions

---

## ### DEPLOYMENT ###

```bash
# Deploy single function
supabase functions deploy bubble-proxy

# Deploy all functions
supabase functions deploy

# View logs
supabase functions logs bubble-proxy --tail

# Test locally
supabase functions serve
```

---

## ### DATABASE_OVERVIEW ###

[TOTAL_TABLES]: 93 Supabase PostgreSQL tables
[SCHEMA_REFERENCE]: ../DATABASE_SCHEMA_OVERVIEW.md

### Key Tables
- user/users: User accounts
- listing: Property listings
- proposal/proposals: Booking proposals
- virtualmeetingschedulesandlinks: Video call scheduling

### Lookup Tables (zat_*)
- zat_geo_borough_toplevel: NYC boroughs
- zat_geo_hood_mediumlevel: Neighborhoods
- zat_features_amenity: Amenities
- zat_features_houserule: House rules

---

## ### ARCHITECTURE_FLOW ###

```
Frontend (app/)
    │
    ▼
Supabase Edge Functions
    │
    ├─► bubble-proxy ──────► Bubble.io API
    │
    ├─► bubble-auth-proxy ──► Bubble.io Auth
    │
    ├─► ai-gateway ────────► OpenAI API
    │
    └─► ai-signup-guest ───► OpenAI API
```

---

## ### SECURITY_NOTES ###

[API_KEYS]: Never exposed to frontend
[VALIDATION]: All inputs validated before forwarding
[CORS]: Properly configured for split.lease domain
[RLS]: Row Level Security enabled on sensitive tables

---

## ### DOCUMENTATION ###

[SECRETS]: SECRETS_SETUP.md
[DEPLOYMENT]: ../docs/DEPLOY_EDGE_FUNCTION.md
[MIGRATION]: ../docs/MIGRATION_PLAN_BUBBLE_TO_EDGE.md

---

**SUBDIRECTORY_COUNT**: 1 (functions/)
**EDGE_FUNCTION_COUNT**: 4
**TOTAL_FILES**: 30+
