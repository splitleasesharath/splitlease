# Supabase Production to Dev Replication - Windows CLI Workflow

**Date**: 2026-01-09 (Updated)
**Purpose**: Replication workflow using Supabase CLI + MCP tools (no PostgreSQL tools required)
**Status**: Ready for Execution

---

## Quick Reference

**Production**: `qcfifybkaddcoimjroca` (splitlease-backend-live)
**Development**: `qzsmhgyojmwvtjmnrdea` (splitlease-backend-dev)
**Estimated Time**: 2-3 hours
**Platform**: Windows PowerShell

---

## Prerequisites Checklist

- [x] Supabase CLI installed and working (`supabase --version`)
- [ ] Authorization to copy production data confirmed
- [ ] Access to Claude Code (for MCP tool operations via mcp-tool-specialist)

**Note**: This workflow uses Supabase MCP tools for database operations, so PostgreSQL client tools (psql/pg_dump) are NOT required.

---

## Phase 1: Pre-Flight Checks (5 minutes)

### 1.1 Verify Supabase CLI Access

```powershell
# Check Supabase CLI version
supabase --version

# Login if needed
supabase login

# List projects (should see both prod and dev)
supabase projects list
```

**Expected Output**: Both `qcfifybkaddcoimjroca` and `qzsmhgyojmwvtjmnrdea` listed.

### 1.2 Verify Project Access via Claude

**Request to Claude**:
> "Use mcp-tool-specialist to list my Supabase projects and confirm both production (qcfifybkaddcoimjroca) and development (qzsmhgyojmwvtjmnrdea) are accessible."

**Expected Result**: Both projects show status "ACTIVE_HEALTHY".

---

## Phase 2: Database Schema Replication (20 minutes)

### 2.1 Export Production Schema Using Supabase CLI

```powershell
# Navigate to project root
cd "C:\Users\Split Lease\Documents\Split Lease"

# Link CLI to production project
supabase link --project-ref qcfifybkaddcoimjroca

# Pull schema from production (creates migration file)
supabase db pull
```

**What happens**:
- Creates a new migration file in `supabase/migrations/` with production schema
- File will be named like `20260109_remote_schema.sql`

**Verification**:
```powershell
# List migrations
supabase migration list

# Check the latest migration file
ls supabase\migrations\
```

### 2.2 Review Schema Migration (Optional)

```powershell
# View the latest migration file
code supabase\migrations\<latest-file>.sql

# Or use notepad
notepad supabase\migrations\<latest-file>.sql
```

**What to check**: Ensure it contains tables, functions, RLS policies, triggers.

---

## Phase 3: Database Data Export (30-60 minutes)

**Note**: Since we don't have pg_dump, we'll use MCP tools through Claude to export data table by table.

### 3.1 Get List of All Tables

**Request to Claude**:
> "Use mcp-tool-specialist to list all tables in the production project (qcfifybkaddcoimjroca) in the public schema. Save the list for data export."

**Expected Result**: List of table names with row counts.

### 3.2 Export Table Data

**Request to Claude**:
> "Use mcp-tool-specialist to export all data from each table in the production project to a local backup. For each table, execute a SELECT query and save results to JSON files in a 'backups' directory."

**Alternative - Manual Table Export** (if needed):

For critical tables, you can request Claude to export specific tables:
> "Use mcp-tool-specialist to export all data from the 'users' table in production and save to backups/users.json"

Repeat for each table you need.

---

## Phase 4: Apply Schema to Dev (15 minutes)

### 4.1 Link CLI to Development Project

```powershell
# Link to dev project
supabase link --project-ref qzsmhgyojmwvtjmnrdea

# Verify linked project
supabase projects list
```

**Verification**: Dev project should show as linked.

### 4.2 Apply Schema Migration to Dev

```powershell
# Push migrations to dev (applies the schema we pulled from prod)
supabase db push
```

**What happens**:
- Applies all migration files in `supabase/migrations/` to dev database
- Creates tables, functions, RLS policies, etc.

**Verification**:
```powershell
# Check migration status
supabase migration list
```

All migrations should show as "Applied" in dev.

### 4.3 Verify Schema in Dev

**Request to Claude**:
> "Use mcp-tool-specialist to list all tables in the development project (qzsmhgyojmwvtjmnrdea) and compare table count with production."

**Expected**: Table count matches production.

---

## Phase 5: Import Data to Dev (30-90 minutes)

### 5.1 Import Table Data via MCP

**Request to Claude**:
> "Use mcp-tool-specialist to import all the data from the backups directory into the development project (qzsmhgyojmwvtjmnrdea). Process tables in dependency order to avoid FK constraint violations."

**What happens**:
- Claude will use MCP tools to execute INSERT statements for each table
- Data from production is replicated to dev

### 5.2 Verify Row Counts

**Request to Claude**:
> "Use mcp-tool-specialist to compare row counts between production and development for all tables. Report any discrepancies."

**Expected**: Row counts match between prod and dev.

---

## Phase 6: Deploy Edge Functions (20 minutes)

### 6.1 Configure Secrets in Dev Project

**Manual Step** (Supabase Dashboard):

1. Open: https://supabase.com/dashboard/project/qzsmhgyojmwvtjmnrdea/settings/functions
2. Click **"Secrets"** tab
3. Add the following secrets (copy values from production):

| Secret Name | Copy From Production |
|-------------|---------------------|
| `BUBBLE_API_BASE_URL` | ✓ |
| `BUBBLE_API_KEY` | ✓ |
| `OPENAI_API_KEY` | ✓ |
| `SLACK_WEBHOOK_DATABASE_WEBHOOK` | ✓ |
| `SLACK_WEBHOOK_ACQUISITION` | ✓ |
| `SLACK_WEBHOOK_GENERAL` | ✓ |
| `TWILIO_ACCOUNT_SID` | ✓ |
| `TWILIO_AUTH_TOKEN` | ✓ |
| `TWILIO_PHONE_NUMBER` | ✓ |
| `RESEND_API_KEY` | ✓ |
| `ZOOM_ACCOUNT_ID` | ✓ |
| `ZOOM_CLIENT_ID` | ✓ |
| `ZOOM_CLIENT_SECRET` | ✓ |

**To copy from production**:
1. Open prod secrets: https://supabase.com/dashboard/project/qcfifybkaddcoimjroca/settings/functions
2. Click **"Secrets"**
3. Copy each value to dev project

### 6.2 Deploy All Edge Functions

```powershell
# Ensure linked to dev
supabase link --project-ref qzsmhgyojmwvtjmnrdea

# Deploy all functions
supabase functions deploy
```

**Expected Output**:
```
Deploying auth-user...
Deploying ai-gateway...
Deploying ai-parse-profile...
... (19 total functions)
```

**If batch deployment fails**, deploy individually:

```powershell
supabase functions deploy ai-gateway
supabase functions deploy ai-parse-profile
supabase functions deploy ai-signup-guest
supabase functions deploy auth-user
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

### 6.3 Verify Edge Functions Deployed

```powershell
# List deployed functions
supabase functions list --project-ref qzsmhgyojmwvtjmnrdea
```

**Expected**: All 19 functions listed.

### 6.4 Test Edge Function

```powershell
# Test auth-user health check
curl -X POST "https://qzsmhgyojmwvtjmnrdea.supabase.co/functions/v1/auth-user" `
  -H "Content-Type: application/json" `
  -d '{\"action\": \"health\"}'
```

**Expected**: JSON response (even an error confirms function is running).

---

## Phase 7: Configure pg_cron Jobs (10 minutes)

### 7.1 Enable pg_cron Extension

**Manual Step** (if not enabled):
1. Go to: https://supabase.com/dashboard/project/qzsmhgyojmwvtjmnrdea/database/extensions
2. Search for `pg_cron`
3. Enable it

### 7.2 Create Bubble Sync Cron Job

**Request to Claude**:
> "Use mcp-tool-specialist to create a pg_cron job in the development project (qzsmhgyojmwvtjmnrdea) that calls the bubble_sync Edge Function every 5 minutes. Use the job name 'process-bubble-sync-queue'."

**Expected SQL**:
```sql
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

### 7.3 Verify Cron Job

**Request to Claude**:
> "Use mcp-tool-specialist to list all pg_cron jobs in the development project and confirm 'process-bubble-sync-queue' is active."

**Expected**: Cron job listed with schedule `*/5 * * * *`.

---

## Phase 8: Frontend Configuration (5 minutes)

### 8.1 Update Frontend Environment

```powershell
cd "C:\Users\Split Lease\Documents\Split Lease\app"

# Backup current .env
copy .env .env.backup

# Update .env for dev (use notepad or code editor)
notepad .env
```

**Update to**:
```env
VITE_SUPABASE_URL=https://qzsmhgyojmwvtjmnrdea.supabase.co
VITE_SUPABASE_ANON_KEY=<your_dev_anon_key_here>
```

**Get dev anon key**:
1. Go to: https://supabase.com/dashboard/project/qzsmhgyojmwvtjmnrdea/settings/api
2. Copy the **anon** / **public** key

### 8.2 Test Frontend Connection

```powershell
# Start dev server
bun run dev
```

**Manual Test**:
1. Open http://localhost:8000
2. Open browser DevTools → Network tab
3. Verify requests go to `qzsmhgyojmwvtjmnrdea.supabase.co`
4. Try logging in with a test user

---

## Phase 9: Final Verification (10 minutes)

### 9.1 Verify Database Replication

**Request to Claude**:
> "Use mcp-tool-specialist to verify the development project replication:
> 1. Compare table counts between prod and dev
> 2. Compare row counts for top 10 largest tables
> 3. List all RLS policies in dev
> 4. Check for any security advisories"

### 9.2 Verify Edge Functions

**Request to Claude**:
> "Use mcp-tool-specialist to list all Edge Functions in the development project and confirm all 19 are deployed and active."

### 9.3 Test Complete User Flow

**Manual Test**:
1. Create a new user in dev (signup flow)
2. Create a listing
3. Create a proposal
4. Check database to verify data was saved
5. Check Edge Function logs for errors

---

## Post-Completion Checklist

- [ ] Database schema matches production
- [ ] Database row counts verified
- [ ] All 19 Edge Functions deployed
- [ ] All secrets configured in dev
- [ ] pg_cron job active
- [ ] Frontend connects to dev successfully
- [ ] Login/signup works
- [ ] Complete user flow tested

---

## Rollback Procedure

If you need to revert dev to its pre-replication state:

### Option A: Reset Database via Dashboard

1. Go to: https://supabase.com/dashboard/project/qzsmhgyojmwvtjmnrdea/settings/general
2. Scroll to "Danger Zone"
3. Use "Reset Database" (this deletes ALL data)

### Option B: Drop and Recreate Public Schema

**Request to Claude**:
> "Use mcp-tool-specialist to drop the public schema in development project and recreate it fresh."

**SQL**:
```sql
DROP SCHEMA IF EXISTS public CASCADE;
CREATE SCHEMA public;
GRANT ALL ON SCHEMA public TO postgres;
GRANT ALL ON SCHEMA public TO public;
```

---

## Troubleshooting

### Issue: Supabase CLI not linking to project

**Solution**:
```powershell
# Re-login
supabase login

# Try linking again
supabase link --project-ref qzsmhgyojmwvtjmnrdea
```

### Issue: Edge Function deployment fails

**Solution**:
```powershell
# Check logs for specific function
supabase functions logs <function-name> --project-ref qzsmhgyojmwvtjmnrdea

# Deploy individually
supabase functions deploy <function-name>
```

### Issue: MCP tool timeout during data import

**Solution**: Import tables in smaller batches. Request Claude to import 5-10 tables at a time instead of all at once.

### Issue: Frontend can't connect to dev

**Solution**:
1. Verify `app\.env` has correct `VITE_SUPABASE_URL`
2. Restart dev server
3. Clear browser cache (Ctrl+Shift+Del)
4. Hard reload (Ctrl+Shift+R)

---

## Time Estimates

| Phase | Duration | Method |
|-------|----------|--------|
| Phase 1: Pre-flight | 5 min | CLI |
| Phase 2: Schema export | 10 min | CLI |
| Phase 3: Data export | 30-60 min | MCP |
| Phase 4: Schema import | 10 min | CLI |
| Phase 5: Data import | 30-90 min | MCP |
| Phase 6: Edge Functions | 20 min | CLI |
| Phase 7: pg_cron setup | 10 min | MCP |
| Phase 8: Frontend config | 5 min | Manual |
| Phase 9: Verification | 10 min | MCP + Manual |
| **Total** | **2-3 hours** | |

---

## Key Differences from Standard Workflow

✅ **Uses Supabase CLI** for:
- Project management
- Schema migrations (db pull / db push)
- Edge Functions deployment

✅ **Uses MCP tools (via mcp-tool-specialist)** for:
- Database data export/import
- SQL execution
- Row count verification
- pg_cron job setup

✅ **No PostgreSQL client tools required**:
- No pg_dump
- No psql
- Works on Windows without additional installs

---

## Claude Request Templates

Copy-paste these requests to Claude during execution:

### Schema Verification
```
Use mcp-tool-specialist to list all tables in both production (qcfifybkaddcoimjroca)
and development (qzsmhgyojmwvtjmnrdea) projects and compare the table counts.
```

### Data Export
```
Use mcp-tool-specialist to export all data from the production project
(qcfifybkaddcoimjroca) public schema tables to JSON files in a 'backups' directory.
Export tables in dependency order to handle foreign keys correctly.
```

### Data Import
```
Use mcp-tool-specialist to import all data from the 'backups' directory into the
development project (qzsmhgyojmwvtjmnrdea). Process tables in the same dependency
order used during export.
```

### Row Count Verification
```
Use mcp-tool-specialist to compare row counts between production and development
for all tables in the public schema. Report any discrepancies.
```

### pg_cron Setup
```
Use mcp-tool-specialist to create a pg_cron job in development (qzsmhgyojmwvtjmnrdea)
that calls the bubble_sync Edge Function every 5 minutes.
```

### Final Verification
```
Use mcp-tool-specialist to verify the development project:
1. List all tables and compare with production
2. Check row counts for top 10 largest tables
3. List all RLS policies
4. Check for security advisories
5. List all Edge Functions
```

---

## Related Documentation

- [Dev Environment Setup Guide](./../Documents/20260109143100-dev-environment-setup-guide-current.md)
- [Supabase References Analysis](./../Documents/20260109143000-supabase-project-references-analysis-current.md)
- [Detailed Implementation Plan (pg_dump version)](./20260109172500-dev-project-replication-plan.md)

---

**WORKFLOW VERSION**: 2.0 (Windows + MCP)
**CREATED**: 2026-01-09
**UPDATED**: 2026-01-09 (Adapted for Windows + Supabase CLI + MCP tools)
**STATUS**: Ready for Execution
