# Slack Edge Function Deployment Analysis

**Date**: 2025-12-04
**Status**: Investigation Complete - Deployment Blocked by MCP Internal Error
**Function**: slack (Edge Function)

## Summary

Attempted to deploy the slack Edge Function using `mcp__supabase__deploy_edge_function`, but encountered a persistent internal server error from the Supabase MCP. The function code is valid and ready to deploy, but the deployment mechanism is failing.

## Current State

### Function Details
- **Name**: slack
- **Location**: `supabase/functions/slack/index.ts`
- **Purpose**: Routes Slack integration requests (FAQ inquiries to Slack channels)
- **Status**: Already deployed (version 2, ACTIVE)
- **Configuration**: Correctly set in `supabase/config.toml` with `verify_jwt = false`

### Code Quality
The function file contains:
- All inlined dependencies (CORS, error handling, validation)
- Proper TypeScript types and interfaces
- Complete error handling with descriptive messages
- CORS configuration for cross-origin requests
- FAQ inquiry handler with Slack webhook integration
- No external import dependencies

### Existing Deployment
```
Function ID: 069ebf78-06ee-4cef-a1db-902bb8c51526
Version: 2
Status: ACTIVE
Created: 2025-11-29 (epoch 1764849599050)
Updated: 2025-11-29 (epoch 1764849599050)
```

### Recent Logs
- POST 500 error at `2025-12-04 21:34:32 UTC` (execution time: 117ms)
- OPTIONS 200 OK at `2025-12-04 21:34:32 UTC`

## Issues Identified

### 1. MCP Deployment Error
**Error**: `InternalServerErrorException: Function deploy failed due to an internal error`

**Attempts Made**:
1. Deployed with explicit `entrypoint_path`: "index.ts" - FAILED
2. Deployed without specifying import_map_path - FAILED
3. Both attempts returned identical internal server error

**Root Cause Analysis**:
- The Supabase MCP tool is encountering an unspecified internal error
- The error is not related to the function code (which is valid TypeScript)
- The error occurs during the MCP's communication with Supabase services
- CLI deployment not available in environment (supabase command not found)

### 2. JWT Configuration Mismatch
**Observation**: Remote deployment has `verify_jwt: true`, but local config specifies `verify_jwt: false`

**Location**: `supabase/config.toml` line 388
```toml
[functions.slack]
enabled = true
verify_jwt = false
entrypoint = "./functions/slack/index.ts"
```

**Impact**: If verify_jwt is true on production, the function would reject unauthenticated requests, breaking the FAQ inquiry feature (which requires no auth).

## Recommendations

### Short Term
1. **Verify Remote Configuration**: Check Supabase Dashboard to confirm JWT settings match local config
2. **Manual Deployment**: Since MCP is failing, consider:
   - Using GitHub Actions for deployment
   - Direct Supabase CLI deployment when available
   - Supabase dashboard manual update

### Medium Term
1. **MCP Issue Resolution**:
   - Report the internal server error to Supabase support
   - Check for recent changes to Supabase MCP tool
   - Consider using alternative deployment mechanism

2. **Configuration Sync**:
   - Ensure `supabase/config.toml` is the source of truth
   - Automate configuration validation
   - Add tests to verify JWT settings match expectations

## Function Endpoint

**URL**: `https://qcfifybkaddcoimjroca.supabase.co/functions/v1/slack`

**Request Format**:
```json
{
  "action": "faq_inquiry",
  "payload": {
    "name": "John Doe",
    "email": "john@example.com",
    "inquiry": "Question text here"
  }
}
```

**Required Environment Variables**:
- `SLACK_WEBHOOK_ACQUISITION`
- `SLACK_WEBHOOK_GENERAL`

## Files Involved

- `supabase/functions/slack/index.ts` - Main function file (227 lines)
- `supabase/config.toml` - Configuration (lines 386-389)

## Next Steps

1. Verify the remote function's JWT configuration
2. Test the existing function to ensure it works correctly
3. Document deployment procedure for future updates
4. Consider alternative deployment strategies if MCP continues to fail
