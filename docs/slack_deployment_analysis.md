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
- No external import dependencies needed

### Existing Deployment
```
Function ID: 069ebf78-06ee-4cef-a1db-902bb8c51526
Version: 2
Status: ACTIVE
Created: 2025-11-29 (epoch 1764849599050)
Updated: 2025-11-29 (epoch 1764849599050)
Last Runtime: 2025-12-04 21:34:32 UTC (500 error)
```

## Issues Identified

### 1. MCP Deployment Error

**Error Message**:
```
InternalServerErrorException: Function deploy failed due to an internal error
```

**Attempts Made**:
1. Deployed with explicit `entrypoint_path: "index.ts"` - FAILED
2. Deployed without specifying `import_map_path` - FAILED
3. Both attempts returned identical internal server error

**Root Cause Analysis**:
- The Supabase MCP tool is encountering an unspecified internal error
- The error is not related to the function code (which is valid TypeScript)
- The error occurs during the MCP's communication with Supabase services
- CLI deployment not available in environment (`supabase` command not found)

### 2. JWT Configuration Mismatch

**Observation**: Remote deployment shows `verify_jwt: true`, but local config specifies `verify_jwt: false`

**Local Configuration** (`supabase/config.toml` lines 386-389):
```toml
[functions.slack]
enabled = true
verify_jwt = false
entrypoint = "./functions/slack/index.ts"
```

**Impact**: If `verify_jwt` is true on production, the function rejects unauthenticated requests, breaking the FAQ inquiry feature which requires no authentication per the code design.

## Recommendations

### Short Term
1. **Verify Remote Configuration**: Check Supabase Dashboard to confirm JWT settings
2. **Manual Deployment**: Consider alternative deployment methods:
   - Use GitHub Actions pipeline
   - Direct Supabase CLI when available
   - Supabase dashboard manual update
3. **Test Existing Function**: Verify if current deployment works despite the 500 error

### Medium Term
1. **MCP Issue Resolution**:
   - Report internal server error to Supabase support with full context
   - Check for known issues with `deploy_edge_function` MCP tool
   - Consider using alternative deployment mechanism

2. **Configuration Sync**:
   - Ensure `supabase/config.toml` is source of truth
   - Implement configuration validation in CI/CD
   - Add tests to verify JWT settings match expectations

## Function Specifications

**Endpoint**: `https://qcfifybkaddcoimjroca.supabase.co/functions/v1/slack`

**Request Format**:
```json
{
  "action": "faq_inquiry",
  "payload": {
    "name": "string",
    "email": "string (must be valid email)",
    "inquiry": "string"
  }
}
```

**Success Response** (HTTP 200):
```json
{
  "success": true,
  "data": {
    "message": "Inquiry sent successfully"
  }
}
```

**Error Response** (HTTP 400/500):
```json
{
  "success": false,
  "error": "Error message describing the issue"
}
```

**Required Environment Variables** (Supabase Dashboard > Secrets):
- `SLACK_WEBHOOK_ACQUISITION` - Webhook URL for acquisition channel
- `SLACK_WEBHOOK_GENERAL` - Webhook URL for general channel

## Files Involved

| File | Lines | Purpose |
|------|-------|---------|
| `supabase/functions/slack/index.ts` | 227 | Main function implementation |
| `supabase/config.toml` | 386-389 | Function configuration |

## Code Structure

The function implements:
- **Inlined Dependencies**: All shared utilities inlined to avoid bundling issues
  - CORS headers configuration
  - Custom error classes (ValidationError)
  - Validation utilities (email, required fields, actions)
  - Error formatting and status code mapping

- **Request Handler**:
  - Validates HTTP method (POST only)
  - Parses and validates request body
  - Routes to appropriate action handler
  - Consistent error responses

- **FAQ Inquiry Handler**:
  - Validates name, email, inquiry fields
  - Validates email format
  - Retrieves Slack webhook URLs from environment
  - Sends to both acquisition and general channels
  - Handles partial failures (at least one webhook must succeed)
  - Comprehensive logging for debugging

## Next Steps

1. Investigate why remote function shows `verify_jwt: true` when config has `verify_jwt: false`
2. Test the existing slack function endpoint to verify functionality
3. Document alternative deployment procedures for future updates
4. Consider implementing GitHub Actions deployment as fallback
5. Monitor for Supabase MCP tool updates that might resolve the internal error

## Related Issues

- Day indexing conversion: Not applicable to this function
- Authentication: Function explicitly handles no-auth public access
- Environment variables: Slack webhooks must be configured in Supabase Dashboard

---

**Created**: 2025-12-04
**Analysis Type**: Deployment Investigation
**Resolution Status**: Pending (awaiting alternative deployment method or MCP fix)
