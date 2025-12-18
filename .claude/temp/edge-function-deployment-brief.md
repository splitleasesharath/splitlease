# Edge Function Deployment Brief for MCP Tool Specialist

## Overview
Deploy three Supabase Edge Functions that were recently modified to use the unified user._id pattern for host lookups. These functions eliminate the legacy account_host table pattern.

## Functions to Deploy

### 1. auth-user
**Path:** `supabase/functions/auth-user/`
**Entry Point:** `index.ts`
**Changes:** Updated signup.ts handler to use unified user._id pattern where user IS their own host account

**Dependencies:**
- `handlers/login.ts`
- `handlers/signup.ts`
- `handlers/logout.ts`
- `handlers/validate.ts`
- `handlers/resetPassword.ts`
- `handlers/updatePassword.ts`
- `../_shared/cors.ts`
- `../_shared/errors.ts`
- `../_shared/validation.ts`
- `../_shared/slack.ts`
- `../_shared/queueSync.ts`

**Key Changes in signup.ts:**
- Line 260: `'Account - Host / Landlord': generatedHostId` - Same as user._id (user IS their own host account)
- Lines 289-290: Logs show user._id serves as both user ID and host account ID
- Line 242: Removed account_host table creation (DEPRECATED)

### 2. proposal
**Path:** `supabase/functions/proposal/`
**Entry Point:** `index.ts`
**Changes:** Updated create.ts to use user._id as primary host lookup (lines 133-147)

**Dependencies:**
- `actions/create.ts`
- `actions/update.ts`
- `actions/get.ts`
- `actions/suggest.ts`
- `lib/types.ts`
- `lib/validators.ts`
- `lib/calculations.ts`
- `lib/status.ts`
- `lib/bubbleSyncQueue.ts`
- `lib/dayConversion.ts`
- `../_shared/cors.ts`
- `../_shared/errors.ts`
- `../_shared/validation.ts`
- `../_shared/slack.ts`
- `../_shared/jsonUtils.ts`
- `../_shared/junctionHelpers.ts`

**Key Changes in create.ts:**
- Lines 133-137: Fetches host user directly via `"Account - Host / Landlord"` FK
- Line 146: Creates hostAccountData wrapper for backwards compatibility
- Line 237: Stores host user._id directly in `"Host - Account"` field (NEW PATTERN)

### 3. virtual-meeting
**Path:** `supabase/functions/virtual-meeting/`
**Entry Point:** `index.ts`
**Changes:** Updated create.ts to use user._id as primary host lookup with legacy fallback (lines 78-111)

**Dependencies:**
- `handlers/create.ts`
- `handlers/delete.ts`
- `lib/types.ts`
- `lib/validators.ts`
- `../_shared/cors.ts`
- `../_shared/errors.ts`
- `../_shared/validation.ts`
- `../_shared/slack.ts`
- `../_shared/queueSync.ts`

**Key Changes in create.ts:**
- Lines 84-91: PRIMARY pattern - Try user._id lookup first
- Lines 94-106: FALLBACK pattern - Legacy Account - Host / Landlord lookup
- Line 114: Creates hostAccountData wrapper for backwards compatibility

## Deployment Instructions

Use the Supabase MCP `deploy_edge_function` tool to deploy each function. The tool should handle:
1. Reading all files in the function directory
2. Resolving relative imports from `_shared`
3. Uploading to Supabase Edge Functions infrastructure
4. Verifying successful deployment

## Expected Outcome

All three functions should be deployed and immediately available at:
- `https://[project-ref].supabase.co/functions/v1/auth-user`
- `https://[project-ref].supabase.co/functions/v1/proposal`
- `https://[project-ref].supabase.co/functions/v1/virtual-meeting`

## Post-Deployment Verification

After deployment, the functions will:
1. Accept requests using the new unified user._id pattern
2. Handle legacy data gracefully through backwards-compatible lookups
3. Maintain existing API contracts without breaking changes
4. Continue logging debug information for troubleshooting

## Context

This deployment is part of the ongoing cleanup to eliminate the deprecated account_host table pattern. The changes ensure that:
- **auth-user/signup**: Creates users where user._id serves as both user ID and host account ID
- **proposal/create**: Looks up hosts directly via user._id (no account_host indirection)
- **virtual-meeting/create**: Prioritizes user._id lookup with legacy fallback

These changes were made in commit history:
- Recent cleanup focusing on user._id as primary host identifier
- Removal of account_host table dependencies
- Standardization of host lookup patterns across all edge functions
