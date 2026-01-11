# Implementation Plan: Dev Supabase Project 1:1 Replication

## Overview

This plan provides step-by-step instructions to replicate the production Supabase project (`qcfifybkaddcoimjroca` / splitlease-backend-live) to the development project (`qzsmhgyojmwvtjmnrdea` / splitlease-backend-dev), including database schema, data, and all 19 Edge Functions.

## Success Criteria

- [ ] Dev database schema matches production exactly (tables, views, functions, types, triggers)
- [ ] Dev database RLS policies match production
- [ ] Dev database contains a complete snapshot of production data
- [ ] All 19 Edge Functions deployed to dev project with correct configuration
- [ ] Edge Function secrets configured in dev project
- [ ] Verification tests pass for schema, data integrity, and Edge Functions
- [ ] Rollback procedure documented and tested

## Context & References

### Project Information

| Property | Production | Development |
|----------|------------|-------------|
| Project ID | `qcfifybkaddcoimjroca` | `qzsmhgyojmwvtjmnrdea` |
| Project Name | splitlease-backend-live | splitlease-backend-dev |
| Region | us-east-2 | us-east-2 |
| PostgreSQL Version | 17 | 17 |
| API URL | `https://qcfifybkaddcoimjroca.supabase.co` | `https://qzsmhgyojmwvtjmnrdea.supabase.co` |

### Edge Functions to Deploy (19 total)

| Function | Import Map | JWT Verify |
|----------|------------|------------|
| ai-gateway | Yes | No |
| ai-parse-profile | No | No |
| ai-signup-guest | No | No |
| auth-user | No | No |
| bubble_sync | No | No |
| cohost-request | No | No |
| cohost-request-slack-callback | No | No |
| communications | No | No |
| listing | No | No |
| messages | No | No |
| pricing | No | No |
| proposal | Yes | No |
| rental-application | No | No |
| send-email | Yes | No |
| send-sms | Yes | No |
| slack | No | No |
| virtual-meeting | Yes | No |
| workflow-enqueue | Yes | No |
| workflow-orchestrator | Yes | No |

**Note**: `bubble-proxy` is deprecated and excluded from deployment.

### Required Secrets for Edge Functions

The following secrets must be configured in the dev project dashboard:

| Secret Name | Description | Source |
|-------------|-------------|--------|
| `BUBBLE_API_BASE_URL` | Bubble API endpoint | Copy from prod |
| `BUBBLE_API_KEY` | Bubble API authentication | Copy from prod |
| `OPENAI_API_KEY` | OpenAI API access | Copy from prod |
| `SLACK_WEBHOOK_DATABASE_WEBHOOK` | Slack webhook for DB errors | Copy from prod |
| `SLACK_WEBHOOK_ACQUISITION` | Slack acquisition channel | Copy from prod |
| `SLACK_WEBHOOK_GENERAL` | Slack general channel | Copy from prod |
| `TWILIO_ACCOUNT_SID` | Twilio SMS account | Copy from prod |
| `TWILIO_AUTH_TOKEN` | Twilio authentication | Copy from prod |
| `TWILIO_PHONE_NUMBER` | Twilio sender number | Copy from prod |
| `RESEND_API_KEY` | Email service | Copy from prod |
| `ZOOM_ACCOUNT_ID` | Zoom integration | Copy from prod |
| `ZOOM_CLIENT_ID` | Zoom OAuth client | Copy from prod |
| `ZOOM_CLIENT_SECRET` | Zoom OAuth secret | Copy from prod |

### Relevant Files

| File | Purpose | Role in Replication |
|------|---------|---------------------|
| `c:\Users\Split Lease\Documents\Split Lease\supabase\config.toml` | Edge Functions config | Reference for function settings |
| `c:\Users\Split Lease\Documents\Split Lease\supabase\functions\*\index.ts` | Function entrypoints | Deploy to dev |
| `c:\Users\Split Lease\Documents\Split Lease\supabase\functions\_shared\*` | Shared utilities | Deployed with functions |
| `c:\Users\Split Lease\Documents\Split Lease\.claude\plans\Documents\20260109143100-dev-environment-setup-guide-current.md` | Setup guide | Reference |

---

## Pre-Replication Checklist

### Authorization Verification

**CRITICAL**: Before proceeding, confirm:

- [ ] You have explicit authorization to copy production data to dev
- [ ] You understand production data contains REAL USER DATA
- [ ] Compliance/privacy requirements have been reviewed
- [ ] Dev project access is properly restricted

### Prerequisites

- [ ] Supabase CLI installed and authenticated (`supabase --version`)
- [ ] PostgreSQL client tools installed (`psql --version`, `pg_dump --version`)
- [ ] Access to both Supabase project dashboards
- [ ] Database passwords for both projects (Settings > Database > Connection string)
- [ ] Sufficient storage in dev project for data import

---

## Implementation Steps

### Phase 1: Pre-Replication Verification

#### Step 1.1: Verify Supabase CLI Authentication

**Purpose**: Ensure CLI can access both projects

**Commands**:
```bash
# Check CLI version
supabase --version

# List accessible projects
supabase projects list
```

**Expected Output**: Both `qcfifybkaddcoimjroca` and `qzsmhgyojmwvtjmnrdea` should appear in the list.

**Validation**: If projects don't appear, run `supabase login` to re-authenticate.

---

#### Step 1.2: Capture Production Schema Inventory

**Purpose**: Document current production state for verification

**MCP Tool Invocation** (via mcp-tool-specialist):
```
Use mcp__plugin_supabase_supabase__list_tables to list all tables in production:
- project_id: qcfifybkaddcoimjroca
- schemas: ["public", "auth"]
```

**Expected Output**: List of all tables with their schemas.

**Save Output**: Record table count and names for post-replication verification.

---

#### Step 1.3: Check Production Extensions

**Purpose**: Ensure dev will have required extensions enabled

**MCP Tool Invocation** (via mcp-tool-specialist):
```
Use mcp__plugin_supabase_supabase__list_extensions:
- project_id: qcfifybkaddcoimjroca
```

**Expected Extensions**:
- `uuid-ossp` (UUID generation)
- `pgcrypto` (Cryptographic functions)
- `pg_cron` (Scheduled jobs)
- `pg_net` (HTTP requests from SQL)
- `pgsodium` (Encryption)

**Validation**: Note any custom extensions that need manual enabling in dev.

---

#### Step 1.4: List Production Edge Functions

**Purpose**: Verify all functions to deploy

**MCP Tool Invocation** (via mcp-tool-specialist):
```
Use mcp__plugin_supabase_supabase__list_edge_functions:
- project_id: qcfifybkaddcoimjroca
```

**Expected Count**: At least 18-19 functions (excluding deprecated bubble-proxy if deployed).

---

### Phase 2: Database Schema Export

#### Step 2.1: Link CLI to Production Project

**Purpose**: Prepare CLI for schema export

**Commands**:
```bash
cd "c:\Users\Split Lease\Documents\Split Lease"
supabase link --project-ref qcfifybkaddcoimjroca
```

**Validation**: Run `supabase projects list` to confirm linked project.

---

#### Step 2.2: Pull Production Schema

**Purpose**: Export schema definitions to local migration files

**Commands**:
```bash
# Pull schema from production
supabase db pull

# This creates/updates files in supabase/migrations/
```

**Output**: New migration file(s) in `supabase/migrations/` containing:
- Table definitions
- Column types and constraints
- Foreign key relationships
- Indexes
- RLS policies
- Triggers
- Functions

**Validation**: Check `supabase/migrations/` for new files.

---

#### Step 2.3: Export Complete Schema via pg_dump (Schema Only)

**Purpose**: Capture complete schema including elements `db pull` might miss

**Commands**:
```bash
# Get connection string from Supabase Dashboard > Settings > Database
# Format: postgresql://postgres:[PASSWORD]@db.qcfifybkaddcoimjroca.supabase.co:5432/postgres

# Export schema only (no data)
pg_dump "postgresql://postgres:[PROD_PASSWORD]@db.qcfifybkaddcoimjroca.supabase.co:5432/postgres" \
  --schema-only \
  --no-owner \
  --no-privileges \
  --exclude-schema=auth \
  --exclude-schema=storage \
  --exclude-schema=supabase_functions \
  --exclude-schema=extensions \
  --exclude-schema=graphql \
  --exclude-schema=graphql_public \
  --exclude-schema=realtime \
  --exclude-schema=vault \
  --exclude-schema=pgsodium \
  --exclude-schema=pgsodium_masks \
  --exclude-schema=net \
  --exclude-schema=cron \
  > prod_schema_backup.sql
```

**Note**: Replace `[PROD_PASSWORD]` with actual database password from Supabase Dashboard.

**Validation**: Check file size is reasonable (> 10KB for non-trivial schema).

---

### Phase 3: Database Data Export

#### Step 3.1: Export Production Data

**Purpose**: Create complete data dump for import to dev

**Commands**:
```bash
# Export data only (no schema, since we have it separately)
pg_dump "postgresql://postgres:[PROD_PASSWORD]@db.qcfifybkaddcoimjroca.supabase.co:5432/postgres" \
  --data-only \
  --no-owner \
  --no-privileges \
  --exclude-schema=auth \
  --exclude-schema=storage \
  --exclude-schema=supabase_functions \
  --exclude-schema=extensions \
  --exclude-schema=graphql \
  --exclude-schema=graphql_public \
  --exclude-schema=realtime \
  --exclude-schema=vault \
  --exclude-schema=pgsodium \
  --exclude-schema=pgsodium_masks \
  --exclude-schema=net \
  --exclude-schema=cron \
  --disable-triggers \
  > prod_data_backup.sql
```

**Expected Output**: SQL file containing INSERT statements for all public tables.

**Validation**:
- Check file size (depends on data volume)
- Verify file contains INSERT statements: `head -100 prod_data_backup.sql`

---

#### Step 3.2: Export Auth Users (Optional, Handle Carefully)

**Purpose**: Copy user accounts to dev for testing

**WARNING**: This copies real user credentials. Only proceed if:
- You have explicit authorization
- Dev environment is properly secured
- Users will be notified or this is temporary for testing

**Commands**:
```bash
# Export auth.users table specifically
pg_dump "postgresql://postgres:[PROD_PASSWORD]@db.qcfifybkaddcoimjroca.supabase.co:5432/postgres" \
  --data-only \
  --table=auth.users \
  --no-owner \
  > prod_auth_users_backup.sql
```

**Alternative - Skip Auth Users**:
If privacy is a concern, skip this step. New users can be created in dev for testing.

---

### Phase 4: Database Import to Dev

#### Step 4.1: Link CLI to Dev Project

**Purpose**: Switch CLI target to dev project

**Commands**:
```bash
supabase link --project-ref qzsmhgyojmwvtjmnrdea
```

**Validation**: `supabase projects list` shows dev as linked.

---

#### Step 4.2: Clean Dev Database (Optional)

**Purpose**: Start fresh if dev has existing data

**MCP Tool Invocation** (via mcp-tool-specialist):
```
Use mcp__plugin_supabase_supabase__execute_sql:
- project_id: qzsmhgyojmwvtjmnrdea
- query: |
    -- WARNING: This drops all data in public schema
    DROP SCHEMA public CASCADE;
    CREATE SCHEMA public;
    GRANT ALL ON SCHEMA public TO postgres;
    GRANT ALL ON SCHEMA public TO public;
```

**CAUTION**: This destroys all existing dev data. Only run if intentional.

---

#### Step 4.3: Enable Required Extensions in Dev

**Purpose**: Ensure extensions match production

**MCP Tool Invocation** (via mcp-tool-specialist):
```
Use mcp__plugin_supabase_supabase__execute_sql:
- project_id: qzsmhgyojmwvtjmnrdea
- query: |
    CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
    CREATE EXTENSION IF NOT EXISTS "pgcrypto";
    -- pg_cron and pg_net are managed by Supabase, enable via dashboard if needed
```

---

#### Step 4.4: Import Schema to Dev

**Purpose**: Apply production schema structure

**Commands**:
```bash
# Import schema
psql "postgresql://postgres:[DEV_PASSWORD]@db.qzsmhgyojmwvtjmnrdea.supabase.co:5432/postgres" \
  < prod_schema_backup.sql
```

**Validation**: Check for errors in output. Some "already exists" warnings are normal.

---

#### Step 4.5: Import Data to Dev

**Purpose**: Populate dev with production data snapshot

**Commands**:
```bash
# Import data (may take time depending on volume)
psql "postgresql://postgres:[DEV_PASSWORD]@db.qzsmhgyojmwvtjmnrdea.supabase.co:5432/postgres" \
  < prod_data_backup.sql
```

**Validation**:
- Check for FK constraint errors
- Verify row counts match production

---

#### Step 4.6: Import Auth Users (If Exported)

**Purpose**: Copy user accounts

**Commands**:
```bash
psql "postgresql://postgres:[DEV_PASSWORD]@db.qzsmhgyojmwvtjmnrdea.supabase.co:5432/postgres" \
  < prod_auth_users_backup.sql
```

---

### Phase 5: Edge Functions Deployment

#### Step 5.1: Configure Dev Secrets

**Purpose**: Set up environment variables for Edge Functions

**Manual Step** (Supabase Dashboard):
1. Go to https://supabase.com/dashboard/project/qzsmhgyojmwvtjmnrdea/settings/functions
2. Click "Secrets" tab
3. Add each secret from the Required Secrets table above
4. Copy values from production project's secrets

**Verification**: All secrets listed in dashboard after adding.

---

#### Step 5.2: Deploy All Edge Functions

**Purpose**: Upload all functions to dev project

**Commands**:
```bash
# Ensure linked to dev
supabase link --project-ref qzsmhgyojmwvtjmnrdea

# Deploy all functions at once
supabase functions deploy
```

**Expected Output**:
```
Deploying function auth-user...
Deploying function ai-gateway...
... (all 19 functions)
```

**Alternative - Deploy Individually** (if batch fails):
```bash
supabase functions deploy auth-user
supabase functions deploy ai-gateway
supabase functions deploy ai-parse-profile
supabase functions deploy ai-signup-guest
supabase functions deploy bubble_sync
supabase functions deploy cohost-request
supabase functions deploy cohost-request-slack-callback
supabase functions deploy communications
supabase functions deploy listing
supabase functions deploy messages
supabase functions deploy pricing
supabase functions deploy proposal
supabase functions deploy rental-application
supabase functions deploy send-email
supabase functions deploy send-sms
supabase functions deploy slack
supabase functions deploy virtual-meeting
supabase functions deploy workflow-enqueue
supabase functions deploy workflow-orchestrator
```

---

#### Step 5.3: Verify Function Deployment

**Purpose**: Confirm all functions are active

**MCP Tool Invocation** (via mcp-tool-specialist):
```
Use mcp__plugin_supabase_supabase__list_edge_functions:
- project_id: qzsmhgyojmwvtjmnrdea
```

**Expected**: 19 functions listed with status "active".

---

### Phase 6: Post-Replication Verification

#### Step 6.1: Verify Table Count

**Purpose**: Confirm schema completeness

**MCP Tool Invocation** (via mcp-tool-specialist):
```
Use mcp__plugin_supabase_supabase__list_tables:
- project_id: qzsmhgyojmwvtjmnrdea
- schemas: ["public"]
```

**Validation**: Table count should match production (from Step 1.2).

---

#### Step 6.2: Verify Row Counts

**Purpose**: Confirm data integrity

**MCP Tool Invocation** (via mcp-tool-specialist):
```
Use mcp__plugin_supabase_supabase__execute_sql:
- project_id: qzsmhgyojmwvtjmnrdea
- query: |
    SELECT
      schemaname,
      relname as table_name,
      n_live_tup as row_count
    FROM pg_stat_user_tables
    WHERE schemaname = 'public'
    ORDER BY n_live_tup DESC;
```

**Validation**: Compare row counts with production values.

---

#### Step 6.3: Test Edge Function Health

**Purpose**: Verify functions respond correctly

**Test Commands**:
```bash
# Test auth-user function
curl -X POST "https://qzsmhgyojmwvtjmnrdea.supabase.co/functions/v1/auth-user" \
  -H "Content-Type: application/json" \
  -d '{"action": "health"}'

# Test proposal function
curl -X POST "https://qzsmhgyojmwvtjmnrdea.supabase.co/functions/v1/proposal" \
  -H "Content-Type: application/json" \
  -d '{"action": "get", "payload": {"id": "test"}}'

# Test communications function (should have health check)
curl -X POST "https://qzsmhgyojmwvtjmnrdea.supabase.co/functions/v1/communications" \
  -H "Content-Type: application/json" \
  -d '{"action": "health"}'
```

**Expected**: Functions return JSON responses (even errors are okay, confirms function is running).

---

#### Step 6.4: Verify RLS Policies

**Purpose**: Confirm security policies are in place

**MCP Tool Invocation** (via mcp-tool-specialist):
```
Use mcp__plugin_supabase_supabase__get_advisors:
- project_id: qzsmhgyojmwvtjmnrdea
- type: security
```

**Validation**: Review any security warnings. Missing RLS policies should be addressed.

---

#### Step 6.5: Test Frontend Connection

**Purpose**: Verify end-to-end connectivity

**Manual Steps**:
1. Update `app/.env` with dev credentials (already documented in setup guide)
2. Start dev server: `bun run dev`
3. Open browser to http://localhost:8000
4. Check browser Network tab for requests to `qzsmhgyojmwvtjmnrdea.supabase.co`
5. Attempt login with a test user

---

### Phase 7: pg_cron Job Setup (Critical)

#### Step 7.1: Verify pg_cron Extension

**Purpose**: Ensure cron jobs can be scheduled

**MCP Tool Invocation** (via mcp-tool-specialist):
```
Use mcp__plugin_supabase_supabase__execute_sql:
- project_id: qzsmhgyojmwvtjmnrdea
- query: |
    SELECT * FROM pg_extension WHERE extname = 'pg_cron';
```

**Validation**: Extension should exist. If not, enable via Supabase Dashboard > Database > Extensions.

---

#### Step 7.2: Recreate Bubble Sync Cron Job

**Purpose**: Set up scheduled queue processing

**MCP Tool Invocation** (via mcp-tool-specialist):
```
Use mcp__plugin_supabase_supabase__execute_sql:
- project_id: qzsmhgyojmwvtjmnrdea
- query: |
    -- Schedule bubble sync queue processing every 5 minutes
    SELECT cron.schedule(
      'process-bubble-sync-queue',
      '*/5 * * * *',
      $$
      SELECT net.http_post(
        url := 'https://qzsmhgyojmwvtjmnrdea.supabase.co/functions/v1/bubble_sync',
        headers := '{"Content-Type": "application/json"}'::jsonb,
        body := '{"action": "process_queue_data_api"}'::jsonb
      );
      $$
    );
```

**Validation**: Query should return the job ID.

---

#### Step 7.3: Verify Cron Job Active

**MCP Tool Invocation** (via mcp-tool-specialist):
```
Use mcp__plugin_supabase_supabase__execute_sql:
- project_id: qzsmhgyojmwvtjmnrdea
- query: |
    SELECT * FROM cron.job;
```

**Expected**: `process-bubble-sync-queue` job should be listed.

---

## Edge Cases & Error Handling

### Issue: Foreign Key Constraint Violations During Data Import

**Cause**: Data imported in wrong order (child before parent tables)

**Solution**:
1. Disable triggers during import: `SET session_replication_role = 'replica';`
2. Import data
3. Re-enable: `SET session_replication_role = 'origin';`

### Issue: Extension Not Available

**Cause**: Some extensions require Supabase Pro plan

**Solution**: Enable extension via Supabase Dashboard > Database > Extensions

### Issue: Edge Function Deployment Fails

**Cause**: Missing import map or syntax error

**Solution**:
1. Deploy individually to identify failing function
2. Check function logs: `supabase functions logs <name> --project-ref qzsmhgyojmwvtjmnrdea`
3. Fix syntax/import issues locally and redeploy

### Issue: Secrets Not Available

**Cause**: Secrets not configured or wrong names

**Solution**: Verify secret names in dashboard match what Edge Functions expect

### Issue: Data Too Large for pg_dump

**Cause**: Large blobs or many rows

**Solution**:
1. Exclude large tables: `--exclude-table=large_table_name`
2. Import large tables separately with smaller chunks

---

## Rollback Strategy

### Scenario: Dev Database Corrupted

**Action**:
```bash
# Re-import from backup files
psql "postgresql://postgres:[DEV_PASSWORD]@db.qzsmhgyojmwvtjmnrdea.supabase.co:5432/postgres" \
  -c "DROP SCHEMA public CASCADE; CREATE SCHEMA public;"

# Re-apply schema and data
psql "..." < prod_schema_backup.sql
psql "..." < prod_data_backup.sql
```

### Scenario: Edge Functions Broken

**Action**:
```bash
# Redeploy all functions
supabase functions deploy

# Or roll back to production state by linking to prod and comparing
```

### Scenario: Wrong Data Imported

**Action**:
1. Keep backup files (prod_schema_backup.sql, prod_data_backup.sql)
2. Re-execute Phase 4 with clean slate

### Scenario: Need to Revert to Pre-Replication State

**Preparation** (before starting):
```bash
# Export current dev state as backup
pg_dump "postgresql://postgres:[DEV_PASSWORD]@db.qzsmhgyojmwvtjmnrdea.supabase.co:5432/postgres" \
  > dev_backup_before_replication.sql
```

**Rollback**:
```bash
psql "..." < dev_backup_before_replication.sql
```

---

## Dependencies & Blockers

### Hard Dependencies

1. **Database Passwords**: Required for pg_dump/psql commands. Get from Supabase Dashboard.
2. **CLI Authentication**: `supabase login` must be completed.
3. **Network Access**: Both project endpoints must be reachable.

### Potential Blockers

1. **Large Data Volume**: If production has millions of rows, export/import may take hours.
2. **Storage Limits**: Dev project must have sufficient storage quota.
3. **Rate Limits**: Supabase may rate-limit large operations.

---

## Risk Assessment

| Risk | Likelihood | Impact | Mitigation |
|------|------------|--------|------------|
| Data corruption during import | Low | High | Keep backup files, verify checksums |
| Missing secrets break Edge Functions | Medium | Medium | Document all secrets, test each function |
| FK constraint violations | Medium | Low | Use `--disable-triggers` flag |
| Privacy compliance issues | Low | High | Get explicit authorization before copying user data |
| pg_cron jobs not created | Medium | Medium | Manually verify and create cron jobs |
| Import takes too long | Medium | Low | Run during low-traffic period, monitor progress |

---

## Estimated Time

| Phase | Duration |
|-------|----------|
| Phase 1: Pre-Replication | 15 minutes |
| Phase 2: Schema Export | 10 minutes |
| Phase 3: Data Export | 10-60 minutes (depends on data size) |
| Phase 4: Database Import | 15-90 minutes (depends on data size) |
| Phase 5: Edge Functions | 20 minutes |
| Phase 6: Verification | 20 minutes |
| Phase 7: pg_cron Setup | 10 minutes |
| **Total** | **1.5 - 4 hours** |

---

## Post-Completion Checklist

- [ ] All backup files stored securely (prod_schema_backup.sql, prod_data_backup.sql)
- [ ] Dev database schema matches production
- [ ] Dev database data verified
- [ ] All 19 Edge Functions deployed and responding
- [ ] All secrets configured in dev project
- [ ] pg_cron job active for bubble_sync
- [ ] Frontend tested against dev backend
- [ ] Documentation updated if process differed from plan

---

## File References Summary

| File Path | Purpose |
|-----------|---------|
| `c:\Users\Split Lease\Documents\Split Lease\supabase\config.toml` | Edge Functions configuration reference |
| `c:\Users\Split Lease\Documents\Split Lease\supabase\functions\*` | Edge Function source code (19 functions) |
| `c:\Users\Split Lease\Documents\Split Lease\supabase\functions\_shared\*` | Shared Edge Function utilities |
| `c:\Users\Split Lease\Documents\Split Lease\supabase\CLAUDE.md` | Edge Functions documentation |
| `c:\Users\Split Lease\Documents\Split Lease\.claude\plans\Documents\20260109143100-dev-environment-setup-guide-current.md` | Environment setup reference |
| `c:\Users\Split Lease\Documents\Split Lease\app\.env` | Frontend environment variables (update for dev) |
| `c:\Users\Split Lease\Documents\Split Lease\app\.env.example` | Environment variable template |

---

## MCP Tools Reference

All MCP tool invocations should go through `mcp-tool-specialist` subagent:

| Tool | Purpose |
|------|---------|
| `mcp__plugin_supabase_supabase__list_tables` | List database tables |
| `mcp__plugin_supabase_supabase__list_extensions` | List PostgreSQL extensions |
| `mcp__plugin_supabase_supabase__list_edge_functions` | List deployed Edge Functions |
| `mcp__plugin_supabase_supabase__execute_sql` | Run SQL queries |
| `mcp__plugin_supabase_supabase__get_advisors` | Check security/performance advisories |
| `mcp__plugin_supabase_supabase__deploy_edge_function` | Deploy individual Edge Function (alternative to CLI) |

---

**PLAN VERSION**: 1.0
**CREATED**: 2026-01-09 17:25:00
**AUTHOR**: Claude Implementation Planning Architect
**STATUS**: Ready for Execution
