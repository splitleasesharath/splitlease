# Implementation Plan: Edge Function Deployment Integration

## Overview

Integrate Supabase Edge Function deployment into the production deployment workflow. When `bun run deploy` is executed from the project root, it will build the frontend, deploy all edge functions to the `splitlease-backend-live` production Supabase project, and then deploy to Cloudflare Pages.

## Success Criteria

- [ ] Running `bun run deploy` from project root deploys edge functions to production (`qcfifybkaddcoimjroca`)
- [ ] Edge functions deploy ONLY to production project (not development)
- [ ] Deployment sequence: build frontend -> deploy edge functions -> deploy to Cloudflare Pages
- [ ] Edge function deployment failures are reported clearly
- [ ] Decision on blocking behavior is documented and implemented

## Context & References

### Relevant Files

| File | Purpose | Changes Needed |
|------|---------|----------------|
| `package.json` (root) | Root monorepo scripts | Add edge function deploy step to `deploy` script |
| `app/package.json` | Frontend package scripts | No changes needed (current `deploy` stays as fallback) |
| `.pages.toml` | Cloudflare Pages configuration | No changes needed (informational) |
| `supabase/config.toml` | Supabase project configuration (local dev) | No changes needed (informational) |

### Related Documentation

- `.claude/Documentation/miniCLAUDE.md` - Project structure overview
- `supabase/CLAUDE.md` - Edge Functions reference

### Existing Patterns to Follow

- **Sequential command chaining**: Use `&&` to chain dependent commands
- **Explicit project targeting**: Use `--project-ref` flag for Supabase CLI
- **bun script pattern**: Consistent with existing `bun run` scripts

## Current State Analysis

### Current Deploy Script (Root `package.json`)
```json
"deploy": "cd app && wrangler pages deploy dist --project-name splitlease"
```

This script:
1. Changes to `app/` directory
2. Deploys `dist/` to Cloudflare Pages

### Supabase Projects

| Project | Reference ID | Purpose | Environment |
|---------|--------------|---------|-------------|
| `splitlease-backend-live` | `qcfifybkaddcoimjroca` | Production | PRODUCTION |
| `splitlease-backend-dev` | `qzsmhgyojmwvtjmnrdea` | Development | PREVIEW |

Currently linked project: `splitlease-backend-live` (marked with `●` in `supabase projects list`)

### Edge Functions to Deploy (19 functions)

Based on `supabase/functions/*/index.ts`:
1. `ai-gateway`
2. `ai-parse-profile`
3. `ai-signup-guest`
4. `auth-user`
5. `bubble_sync`
6. `cohost-request-slack-callback`
7. `cohost-request`
8. `communications`
9. `listing`
10. `messages`
11. `pricing`
12. `proposal`
13. `rental-application`
14. `send-email`
15. `send-sms`
16. `slack`
17. `virtual-meeting`
18. `workflow-enqueue`
19. `workflow-orchestrator`

## Design Decisions

### Decision 1: Error Handling Strategy

**Question**: Should edge function deployment failure block frontend deployment?

**Recommendation**: **YES, block frontend deployment**

**Rationale**:
- Frontend may depend on new/updated edge function endpoints
- Deploying frontend without backend creates inconsistent state
- Easier to diagnose issues when deployments are atomic
- Aligns with "no fallback mechanisms" principle from CLAUDE.md

**Alternative (if needed later)**: Add `--continue-on-error` flag for emergency frontend-only deploys

### Decision 2: Deployment Approach

**Option A**: Modify root `package.json` deploy script (RECOMMENDED)
- Single command: `bun run deploy`
- Consistent with current workflow
- All logic in one place

**Option B**: Create separate deploy script file
- More flexibility for complex logic
- Adds maintenance overhead
- Not needed for simple sequential deployment

**Chosen**: Option A

### Decision 3: Project Targeting

Use explicit `--project-ref qcfifybkaddcoimjroca` flag instead of relying on linked project.

**Rationale**:
- Prevents accidental deployment to wrong project
- Works regardless of local linked state
- Self-documenting (project ref visible in script)

## Implementation Steps

### Step 1: Update Root package.json Deploy Script

**Files:** `c:\Users\Split Lease\Documents\Split Lease\package.json`

**Purpose:** Add edge function deployment to the deploy command

**Current:**
```json
{
  "scripts": {
    "deploy": "cd app && wrangler pages deploy dist --project-name splitlease"
  }
}
```

**New:**
```json
{
  "scripts": {
    "deploy": "bun run build && supabase functions deploy --project-ref qcfifybkaddcoimjroca && cd app && wrangler pages deploy dist --project-name splitlease",
    "deploy:frontend-only": "bun run build && cd app && wrangler pages deploy dist --project-name splitlease",
    "deploy:edge-functions": "supabase functions deploy --project-ref qcfifybkaddcoimjroca"
  }
}
```

**Details:**
- `deploy`: Full deployment - build, edge functions, then Cloudflare Pages
- `deploy:frontend-only`: Emergency fallback for frontend-only deploy (use with caution)
- `deploy:edge-functions`: Deploy only edge functions (useful for backend-only changes)

**Validation:**
- Run `bun run deploy:edge-functions` to verify Supabase CLI works with project ref
- Run full `bun run deploy` to verify complete workflow

### Step 2: Verify Supabase CLI Authentication

**Files:** None (CLI configuration)

**Purpose:** Ensure Supabase CLI can authenticate for deployment

**Details:**
- Supabase CLI requires `SUPABASE_ACCESS_TOKEN` environment variable OR logged-in session
- For CI/CD, set `SUPABASE_ACCESS_TOKEN` as environment secret
- For local deployment, ensure `supabase login` has been run

**Validation:**
```bash
# Check if logged in
supabase projects list

# If not logged in, run:
supabase login
```

### Step 3: Test Deployment Flow

**Files:** None

**Purpose:** Verify the complete deployment workflow

**Details:**
1. Ensure working directory is project root (`c:\Users\Split Lease\Documents\Split Lease`)
2. Run `bun run deploy`
3. Verify output shows:
   - Build success
   - Edge function deployment (19 functions)
   - Cloudflare Pages deployment

**Expected Output Pattern:**
```
> bun run build
✓ Frontend built successfully

> supabase functions deploy --project-ref qcfifybkaddcoimjroca
Deploying function ai-gateway...
Deploying function ai-parse-profile...
... (17 more functions)
Deployed 19 functions

> wrangler pages deploy dist --project-name splitlease
✓ Uploaded to Cloudflare Pages
```

**Validation:**
- All 19 edge functions appear in Supabase Dashboard > Edge Functions
- Frontend is live on Cloudflare Pages

## Edge Cases & Error Handling

### Edge Case 1: Supabase CLI Not Authenticated

**Symptom:** Error message about missing access token or not logged in

**Handling:** Command will fail with clear error message. User must run `supabase login` first.

**No fallback needed** - aligns with "no fallback mechanisms" principle.

### Edge Case 2: Edge Function Has Syntax Error

**Symptom:** Deployment fails for specific function

**Handling:**
- Supabase CLI reports which function failed
- Deployment stops (blocks frontend deployment)
- Fix the syntax error and retry

### Edge Case 3: Network Timeout During Deployment

**Symptom:** Deployment hangs or times out

**Handling:**
- Retry the command
- Consider adding `--jobs` flag for parallel deployment (faster)

### Edge Case 4: Partial Edge Function Deployment

**Symptom:** Some functions deployed, others failed

**Handling:**
- Re-run `bun run deploy:edge-functions` to retry
- Already-deployed functions will be updated (idempotent)

## Testing Considerations

### Pre-Deployment Testing
- Run `deno lint supabase/functions/` to catch TypeScript errors before deployment
- Run `supabase functions serve` locally to verify functions work

### Post-Deployment Verification
- Check Supabase Dashboard > Edge Functions for all 19 functions
- Test a critical endpoint (e.g., `/functions/v1/auth-user` with `action: "validate"`)
- Verify frontend can call edge functions without CORS errors

### Suggested Test Script
```bash
# Add to package.json if needed
"test:edge-functions": "supabase functions serve &>/dev/null & sleep 5 && curl -X POST http://localhost:54321/functions/v1/slack -H 'Content-Type: application/json' -d '{\"action\": \"health\"}' && kill %1"
```

## Rollback Strategy

### If Edge Function Deployment Breaks Production

1. **Identify broken function(s)** via Supabase Dashboard > Logs
2. **Revert code** to previous working version
3. **Re-deploy edge functions only**: `bun run deploy:edge-functions`

### If Frontend Deployment Breaks Production

1. Use Cloudflare Pages dashboard to roll back to previous deployment
2. Or: `git checkout <previous-commit> && cd app && wrangler pages deploy dist --project-name splitlease`

### If Both Need Rollback

1. Roll back Cloudflare Pages first (faster)
2. Then re-deploy edge functions from previous working commit

## Dependencies & Blockers

### Prerequisites
- [ ] Supabase CLI installed and authenticated (`supabase login`)
- [ ] Wrangler CLI installed and authenticated (`wrangler login`)
- [ ] All edge functions have valid TypeScript (pass `deno lint`)

### No Blockers Identified

The implementation is straightforward and uses existing CLI tools.

## Risk Assessment

| Risk | Likelihood | Impact | Mitigation |
|------|------------|--------|------------|
| Edge function deployment takes too long | Medium | Low | Use `--jobs 4` for parallel deployment |
| Wrong Supabase project deployed to | Low | High | Explicit `--project-ref` in command |
| Supabase CLI not authenticated | Low | Low | Clear error message, easy to fix |
| Partial deployment (some functions fail) | Low | Medium | Re-run command (idempotent) |
| Network issues during deployment | Low | Low | Retry command |

## Implementation Notes

### Why Not Use a Dedicated Deploy Script?

A shell script would add:
- Cross-platform concerns (bash vs PowerShell)
- Another file to maintain
- No significant benefit for sequential commands

The `package.json` script approach is:
- Declarative and visible
- Cross-platform (bun handles it)
- Consistent with existing patterns

### Future Considerations

If deployment becomes more complex, consider:
1. **GitHub Actions workflow** for automated deployment on merge to main
2. **Deployment preview comments** on PRs
3. **Slack notifications** on deployment success/failure

These are out of scope for this plan but noted for future enhancement.

---

## File References Summary

| File Path | Type | Action |
|-----------|------|--------|
| `c:\Users\Split Lease\Documents\Split Lease\package.json` | Configuration | MODIFY - Update deploy scripts |
| `c:\Users\Split Lease\Documents\Split Lease\app\package.json` | Configuration | NO CHANGE - Reference only |
| `c:\Users\Split Lease\Documents\Split Lease\.pages.toml` | Configuration | NO CHANGE - Reference only |
| `c:\Users\Split Lease\Documents\Split Lease\supabase\config.toml` | Configuration | NO CHANGE - Reference only |
| `c:\Users\Split Lease\Documents\Split Lease\.claude\Documentation\miniCLAUDE.md` | Documentation | NO CHANGE - Reference only |
| `c:\Users\Split Lease\Documents\Split Lease\supabase\CLAUDE.md` | Documentation | NO CHANGE - Reference only |

---

**PLAN VERSION**: 1.0
**CREATED**: 2026-01-10T14:35:00
**STATUS**: Ready for Implementation
