# Pure CLI Replication Workflow - Supabase Production to Dev

**Date**: 2026-01-10
**Purpose**: Executable CLI-only workflow to replicate production to development
**Platform**: Windows PowerShell + Supabase CLI + PostgreSQL tools
**Total Time**: 1.5-2 hours

---

## Database Overview (from Reconnaissance)

| Metric | Value |
|--------|-------|
| **Total Tables** | 67 |
| **Total Rows** | 67,200 |
| **Top Table** | `num` (22,973 rows) |
| **Edge Functions** | 22 active |
| **Extensions** | 9 standard |

**Estimated Export Size**: ~500 MB - 1 GB (database dump)

---

## Prerequisites (One-Time Setup)

### Install PostgreSQL Tools

```powershell
# Install via Windows Package Manager
winget install PostgreSQL.PostgreSQL

# Verify installation (restart PowerShell first)
psql --version
pg_dump --version
```

**Expected**: `psql (PostgreSQL) 17.x` and `pg_dump (PostgreSQL) 17.x`

---

## Step-by-Step Execution

### PHASE 1: Get Database Credentials (5 min)

#### 1.1 Get Production Password

1. Go to: https://supabase.com/dashboard/project/qcfifybkaddcoimjroca/settings/database
2. Find "Connection string" section
3. Click "Reset database password" if you don't have it
4. Copy the password

#### 1.2 Get Development Password

1. Go to: https://supabase.com/dashboard/project/qzsmhgyojmwvtjmnrdea/settings/database
2. Get the password (same process as above)

#### 1.3 Set Environment Variables

```powershell
# Set these in your current PowerShell session
$env:PROD_PASS = "your_production_password_here"
$env:DEV_PASS = "your_development_password_here"

# Verify
echo "Production password set: $($env:PROD_PASS.Length) characters"
echo "Development password set: $($env:DEV_PASS.Length) characters"
```

---

### PHASE 2: Export Production Database (15-30 min)

#### 2.1 Create Backup Directory

```powershell
cd "C:\Users\Split Lease\Documents\Split Lease"
mkdir -p backups\$(Get-Date -Format 'yyyyMMdd')
cd backups\$(Get-Date -Format 'yyyyMMdd')
```

#### 2.2 Export Complete Database (Schema + Data)

```powershell
# Single command to export everything
pg_dump "postgresql://postgres:$($env:PROD_PASS)@db.qcfifybkaddcoimjroca.supabase.co:5432/postgres" `
  --no-owner `
  --no-privileges `
  --clean `
  --if-exists `
  --exclude-schema=auth `
  --exclude-schema=storage `
  --exclude-schema=supabase_functions `
  --exclude-schema=extensions `
  --exclude-schema=graphql `
  --exclude-schema=graphql_public `
  --exclude-schema=realtime `
  --exclude-schema=vault `
  --exclude-schema=pgsodium `
  --exclude-schema=pgsodium_masks `
  --exclude-schema=net `
  --exclude-schema=cron `
  --file=production_full_backup.sql

echo "✓ Production database exported"
```

**What this does**:
- Exports all tables, data, functions, RLS policies, triggers
- Excludes Supabase system schemas (managed by Supabase)
- Creates a single `.sql` file (~500 MB - 1 GB)

#### 2.3 Verify Export

```powershell
# Check file size
ls -lh production_full_backup.sql

# Preview first 100 lines
Get-Content production_full_backup.sql -Head 100
```

**Expected**: File should contain `CREATE TABLE`, `INSERT INTO`, `CREATE FUNCTION` statements.

---

### PHASE 3: Import to Development Database (15-45 min)

#### 3.1 Import Full Backup to Dev

```powershell
# Import everything in one command
psql "postgresql://postgres:$($env:DEV_PASS)@db.qzsmhgyojmwvtjmnrdea.supabase.co:5432/postgres" `
  --file=production_full_backup.sql `
  2>&1 | Tee-Object import_log.txt

echo "✓ Import complete (check import_log.txt for any errors)"
```

**What this does**:
- Drops existing tables (if any)
- Creates all tables with correct schema
- Inserts all data from production
- Creates all functions, triggers, RLS policies

#### 3.2 Check Import Log for Errors

```powershell
# Search for errors (some warnings are normal)
Select-String -Path import_log.txt -Pattern "ERROR" | Select-Object -First 20

# Count errors
(Select-String -Path import_log.txt -Pattern "ERROR").Count
```

**Normal warnings** (ignore these):
- `role "postgres" does not exist` (expected with `--no-owner`)
- `extension "uuid-ossp" already exists` (expected)

**Real errors** to fix:
- FK constraint violations
- Data type mismatches
- Missing dependencies

---

### PHASE 4: Verify Database Replication (10 min)

#### 4.1 Compare Table Counts

```powershell
# Production table count
psql "postgresql://postgres:$($env:PROD_PASS)@db.qcfifybkaddcoimjroca.supabase.co:5432/postgres" `
  -c "SELECT COUNT(*) as prod_tables FROM information_schema.tables WHERE table_schema = 'public';"

# Development table count
psql "postgresql://postgres:$($env:DEV_PASS)@db.qzsmhgyojmwvtjmnrdea.supabase.co:5432/postgres" `
  -c "SELECT COUNT(*) as dev_tables FROM information_schema.tables WHERE table_schema = 'public';"
```

**Expected**: Both should return `67 tables`

#### 4.2 Compare Row Counts for Top Tables

```powershell
# Production row counts
psql "postgresql://postgres:$($env:PROD_PASS)@db.qcfifybkaddcoimjroca.supabase.co:5432/postgres" `
  -c "SELECT schemaname, relname, n_live_tup FROM pg_stat_user_tables WHERE schemaname = 'public' ORDER BY n_live_tup DESC LIMIT 10;"

# Development row counts (should match)
psql "postgresql://postgres:$($env:DEV_PASS)@db.qzsmhgyojmwvtjmnrdea.supabase.co:5432/postgres" `
  -c "SELECT schemaname, relname, n_live_tup FROM pg_stat_user_tables WHERE schemaname = 'public' ORDER BY n_live_tup DESC LIMIT 10;"
```

**Expected**: `num` table should have ~22,973 rows in both, `bookings_stays` ~17,601, etc.

#### 4.3 Verify RLS Policies

```powershell
# List all RLS policies in dev
psql "postgresql://postgres:$($env:DEV_PASS)@db.qzsmhgyojmwvtjmnrdea.supabase.co:5432/postgres" `
  -c "SELECT schemaname, tablename, policyname FROM pg_policies WHERE schemaname = 'public' ORDER BY tablename;"
```

**Expected**: Should see policies for tables like `listing`, `proposal`, `user`, etc.

---

### PHASE 5: Deploy Edge Functions (20 min)

#### 5.1 Configure Secrets in Dev Dashboard

**Manual Step** (Supabase Dashboard):

1. Open prod secrets: https://supabase.com/dashboard/project/qcfifybkaddcoimjroca/settings/functions → "Secrets"
2. Copy all secret values
3. Open dev secrets: https://supabase.com/dashboard/project/qzsmhgyojmwvtjmnrdea/settings/functions → "Secrets"
4. Paste all 13 secrets:

| Secret Name | Action |
|-------------|--------|
| `BUBBLE_API_BASE_URL` | Copy from prod |
| `BUBBLE_API_KEY` | Copy from prod |
| `OPENAI_API_KEY` | Copy from prod |
| `SLACK_WEBHOOK_DATABASE_WEBHOOK` | Copy from prod |
| `SLACK_WEBHOOK_ACQUISITION` | Copy from prod |
| `SLACK_WEBHOOK_GENERAL` | Copy from prod |
| `TWILIO_ACCOUNT_SID` | Copy from prod |
| `TWILIO_AUTH_TOKEN` | Copy from prod |
| `TWILIO_PHONE_NUMBER` | Copy from prod |
| `RESEND_API_KEY` | Copy from prod |
| `ZOOM_ACCOUNT_ID` | Copy from prod |
| `ZOOM_CLIENT_ID` | Copy from prod |
| `ZOOM_CLIENT_SECRET` | Copy from prod |

#### 5.2 Link Supabase CLI to Dev Project

```powershell
cd "C:\Users\Split Lease\Documents\Split Lease"

# Link to dev project
supabase link --project-ref qzsmhgyojmwvtjmnrdea

# Verify
supabase projects list
```

**Expected**: Dev project shows as linked

#### 5.3 Deploy All Edge Functions

```powershell
# Deploy all 22 functions at once
supabase functions deploy

echo "✓ Edge Functions deployed"
```

**Expected output**:
```
Deploying ai-gateway...
Deploying ai-parse-profile...
Deploying ai-signup-guest...
... (22 total)
✓ All functions deployed
```

**If batch fails**, deploy individually (see troubleshooting section).

#### 5.4 Verify Functions Deployed

```powershell
# List all functions
supabase functions list --project-ref qzsmhgyojmwvtjmnrdea
```

**Expected**: 22 functions listed, all with status "ACTIVE"

#### 5.5 Test a Function

```powershell
# Test auth-user function
curl -X POST "https://qzsmhgyojmwvtjmnrdea.supabase.co/functions/v1/auth-user" `
  -H "Content-Type: application/json" `
  -d '{\"action\": \"health\"}'
```

**Expected**: JSON response (even an error confirms function runs)

---

### PHASE 6: Configure pg_cron Job (5 min)

#### 6.1 Enable pg_cron Extension

**Manual Step** (if not already enabled):
1. Go to: https://supabase.com/dashboard/project/qzsmhgyojmwvtjmnrdea/database/extensions
2. Search: `pg_cron`
3. Click "Enable"

#### 6.2 Create Bubble Sync Cron Job

```powershell
# Create cron job that runs every 5 minutes
psql "postgresql://postgres:$($env:DEV_PASS)@db.qzsmhgyojmwvtjmnrdea.supabase.co:5432/postgres" `
  -c "SELECT cron.schedule('process-bubble-sync-queue', '*/5 * * * *', \$\$SELECT net.http_post(url := 'https://qzsmhgyojmwvtjmnrdea.supabase.co/functions/v1/bubble_sync', headers := '{\"Content-Type\": \"application/json\"}'::jsonb, body := '{\"action\": \"process_queue_data_api\"}'::jsonb);\$\$);"

echo "✓ Cron job created"
```

#### 6.3 Verify Cron Job

```powershell
# List all cron jobs
psql "postgresql://postgres:$($env:DEV_PASS)@db.qzsmhgyojmwvtjmnrdea.supabase.co:5432/postgres" `
  -c "SELECT * FROM cron.job;"
```

**Expected**: Job named `process-bubble-sync-queue` with schedule `*/5 * * * *`

---

### PHASE 7: Update Frontend Configuration (5 min)

#### 7.1 Get Dev Anon Key

1. Go to: https://supabase.com/dashboard/project/qzsmhgyojmwvtjmnrdea/settings/api
2. Copy the **anon / public** key

#### 7.2 Update Frontend .env

```powershell
cd "C:\Users\Split Lease\Documents\Split Lease\app"

# Backup current .env
Copy-Item .env .env.backup

# Update .env (use notepad or VS Code)
notepad .env
```

**Update to**:
```env
VITE_SUPABASE_URL=https://qzsmhgyojmwvtjmnrdea.supabase.co
VITE_SUPABASE_ANON_KEY=<paste_dev_anon_key_here>
```

#### 7.3 Test Frontend

```powershell
# Start dev server
bun run dev
```

**Manual verification**:
1. Open http://localhost:8000
2. Open DevTools → Network tab
3. Verify requests go to `qzsmhgyojmwvtjmnrdea.supabase.co`
4. Try logging in with a test user

---

## Final Verification Checklist

Run these checks to confirm replication success:

- [ ] **Database schema matches**: 67 tables in both prod and dev
- [ ] **Row counts match**: Top tables have matching row counts
- [ ] **RLS policies present**: `SELECT COUNT(*) FROM pg_policies WHERE schemaname = 'public';` returns same count
- [ ] **Edge Functions deployed**: 22 functions active in dev
- [ ] **Secrets configured**: All 13 secrets set in dev dashboard
- [ ] **pg_cron job active**: Job listed in `cron.job` table
- [ ] **Frontend connects**: Requests go to dev Supabase project

---

## Troubleshooting

### Issue: Import shows FK constraint errors

```powershell
# Re-run import with triggers disabled
psql "postgresql://postgres:$($env:DEV_PASS)@db.qzsmhgyojmwvtjmnrdea.supabase.co:5432/postgres" `
  -c "SET session_replication_role = 'replica';" `
  -f production_full_backup.sql

# Re-enable triggers after
psql "postgresql://postgres:$($env:DEV_PASS)@db.qzsmhgyojmwvtjmnrdea.supabase.co:5432/postgres" `
  -c "SET session_replication_role = 'origin';"
```

### Issue: Individual Edge Function deployment

```powershell
# Deploy functions one by one
supabase functions deploy ai-gateway
supabase functions deploy ai-parse-profile
supabase functions deploy ai-signup-guest
supabase functions deploy auth-user
supabase functions deploy bubble_sync
supabase functions deploy cohost-request
supabase functions deploy cohost-request-slack-callback
supabase functions deploy communications
supabase functions deploy create-booking
supabase functions deploy date-change-request
supabase functions deploy listing
supabase functions deploy messages
supabase functions deploy otp
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

### Issue: pg_dump/psql not found after install

```powershell
# Add PostgreSQL to PATH manually
$env:Path += ";C:\Program Files\PostgreSQL\17\bin"

# Verify
psql --version
```

### Issue: Password authentication failed

**Solution**: Reset database password in Supabase Dashboard and update `$env:PROD_PASS` / `$env:DEV_PASS`

---

## Rollback Strategy

If you need to restore dev to pre-replication state:

### Option 1: Database Reset (Dashboard)

1. Go to: https://supabase.com/dashboard/project/qzsmhgyojmwvtjmnrdea/settings/general
2. Scroll to "Danger Zone"
3. Click "Reset database"

### Option 2: SQL Reset

```powershell
psql "postgresql://postgres:$($env:DEV_PASS)@db.qzsmhgyojmwvtjmnrdea.supabase.co:5432/postgres" `
  -c "DROP SCHEMA public CASCADE; CREATE SCHEMA public; GRANT ALL ON SCHEMA public TO postgres;"
```

---

## Time Breakdown

| Phase | Duration | Task |
|-------|----------|------|
| 1 | 5 min | Get credentials |
| 2 | 15-30 min | Export production (67K rows) |
| 3 | 15-45 min | Import to dev |
| 4 | 10 min | Verify database |
| 5 | 20 min | Deploy 22 Edge Functions |
| 6 | 5 min | pg_cron setup |
| 7 | 5 min | Frontend config |
| **Total** | **1.5-2 hours** | |

---

## Post-Completion

### Clean Up Backup Files

```powershell
# After successful replication, keep backups for 7 days
# Then delete to save space
cd "C:\Users\Split Lease\Documents\Split Lease\backups"
ls
```

### Schedule Regular Refreshes

Consider refreshing dev weekly to keep it in sync with production:

```powershell
# Re-run phases 2-3 weekly
# Saves: backups\YYYYMMDD\production_full_backup.sql
```

---

## Related Documentation

- [Supabase References Analysis](./../Documents/20260109143000-supabase-project-references-analysis-current.md)
- [Dev Environment Setup Guide](./../Documents/20260109143100-dev-environment-setup-guide-current.md)
- [Database Reconnaissance Report](./../New/20260110062821-supabase-prod-recon-for-replication.md)

---

**WORKFLOW VERSION**: 3.0 (Pure CLI)
**CREATED**: 2026-01-10
**STATUS**: Ready for Execution
**REQUIREMENTS**: PostgreSQL tools + Supabase CLI
