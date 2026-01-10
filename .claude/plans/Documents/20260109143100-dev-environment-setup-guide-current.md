# Dev Environment Setup Guide

**Date**: 2026-01-09
**Purpose**: Step-by-step instructions for configuring Split Lease to use the development Supabase project
**Status**: Current

---

## Overview

This guide walks you through switching your local development environment from the production Supabase project (`qcfifybkaddcoimjroca`) to the development project (`qzsmhgyojmwvtjmnrdea`).

### Prerequisites

- You have both Supabase projects set up:
  - **Production**: `qcfifybkaddcoimjroca` (splitlease-backend-live)
  - **Development**: `qzsmhgyojmwvtjmnrdea` (splitlease-backend-dev)
- You have access to both projects in the Supabase dashboard
- You have the Supabase CLI installed (`supabase --version`)

---

## Part 1: Get Development Project Credentials

### Step 1: Get Dev Project URL

The development project URL follows this format:
```
https://qzsmhgyojmwvtjmnrdea.supabase.co
```

✅ **Confirmed**: This is your dev project ID.

### Step 2: Get Dev Anon Key

1. Go to [Supabase Dashboard](https://supabase.com/dashboard)
2. Select the **splitlease-backend-dev** project
3. Navigate to **Settings** → **API**
4. Copy the **anon** / **public** key (starts with `eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...`)

**Important**: This is NOT a secret key. The anon key is safe to use client-side.

### Step 3: Get Service Role Key (Optional)

If you need elevated permissions for admin operations or scripts:

1. In the same **Settings** → **API** section
2. Copy the **service_role** key (also starts with `eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...`)

**⚠️ Warning**: The service_role key has full database access. Never commit it or expose it client-side.

---

## Part 2: Update Local Frontend Environment

### Step 1: Update `app/.env`

Open `app/.env` and replace the production values:

**Before (Production)**:
```env
VITE_SUPABASE_URL=https://qcfifybkaddcoimjroca.supabase.co
VITE_SUPABASE_ANON_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9... (prod key)
```

**After (Development)**:
```env
VITE_SUPABASE_URL=https://qzsmhgyojmwvtjmnrdea.supabase.co
VITE_SUPABASE_ANON_KEY=<your_dev_anon_key_here>
```

### Step 2: Verify `.gitignore`

Ensure `app/.env` is in your `.gitignore`:

```bash
# From project root
grep "\.env" .gitignore
```

If not present, add it:
```bash
echo "app/.env" >> .gitignore
```

**⚠️ Critical**: Never commit `.env` files with credentials.

### Step 3: Restart Dev Server

After changing environment variables, restart Vite:

```bash
# Kill existing dev server (Ctrl+C)
# Then restart
bun run dev
```

**Verification**: Check the browser console. Any Supabase API calls should now go to `qzsmhgyojmwvtjmnrdea.supabase.co`.

---

## Part 3: Configure Edge Functions for Dev

### Understanding Edge Function Environment Variables

Edge Functions receive environment variables **at runtime from Supabase**:
- `SUPABASE_URL` - Auto-injected based on deployment target
- `SUPABASE_ANON_KEY` - Auto-injected based on deployment target
- `SUPABASE_SERVICE_ROLE_KEY` - Auto-injected based on deployment target

**You don't need to manually configure these.** When you deploy to dev, they point to dev. When you deploy to prod, they point to prod.

### Step 1: Test Edge Functions Locally

To test Edge Functions with your local Supabase setup:

```bash
# From project root
supabase start  # Starts local Supabase (takes ~2 minutes first time)
```

This command:
- Spins up a local PostgreSQL database
- Starts local Auth service
- Provides local Edge Functions runtime
- Outputs local URLs and keys

**Local URLs**:
```
API URL: http://localhost:54321
Anon Key: <local_anon_key>
Service Role Key: <local_service_role_key>
```

### Step 2: Serve Edge Functions Locally

```bash
# Serve all functions
supabase functions serve

# Or serve a specific function
supabase functions serve proposal
```

**Hot Reload**: Changes to Edge Function code are automatically picked up.

### Step 3: Update Frontend to Use Local Edge Functions (Optional)

If you want to test against local Edge Functions:

**In `app/.env`**:
```env
VITE_SUPABASE_URL=http://localhost:54321
VITE_SUPABASE_ANON_KEY=<local_anon_key_from_supabase_start>
```

**To switch back to remote dev**:
```env
VITE_SUPABASE_URL=https://qzsmhgyojmwvtjmnrdea.supabase.co
VITE_SUPABASE_ANON_KEY=<dev_anon_key>
```

---

## Part 4: Deploy Edge Functions to Dev

### Step 1: Link Supabase CLI to Dev Project

```bash
# From project root
supabase link --project-ref qzsmhgyojmwvtjmnrdea
```

This links your local Supabase CLI to the dev project.

**Verification**:
```bash
supabase projects list
```

Should show `qzsmhgyojmwvtjmnrdea` as the linked project.

### Step 2: Deploy Edge Functions

```bash
# Deploy all functions to dev
supabase functions deploy

# Or deploy a specific function
supabase functions deploy proposal
```

**What happens**:
- Functions are built and uploaded to the dev project
- Dev environment variables are automatically injected
- Functions are immediately available at `https://qzsmhgyojmwvtjmnrdea.supabase.co/functions/v1/`

### Step 3: Verify Deployment

Test an Edge Function:

```bash
curl https://qzsmhgyojmwvtjmnrdea.supabase.co/functions/v1/proposal \
  -H "Content-Type: application/json" \
  -d '{"action": "list"}'
```

Or use the browser dev tools to check Network requests.

---

## Part 5: Database Migration (Dev vs Prod)

### Current Status: ✅ COMPLETED

Your **dev database** (`qzsmhgyojmwvtjmnrdea`) has been cloned from **prod** (`qcfifybkaddcoimjroca`), including:
- ✅ Full schema (tables, functions, policies, indexes)
- ✅ Production data (as of clone date: ~2026-01-09)

Both databases are now running **PostgreSQL 17.6.1** in the **us-east-2** region.

### What Was Done

The production database was cloned to development using one of these methods:
1. Supabase Dashboard: Database → Settings → Clone Database
2. CLI-based dump and restore using `pg_dump` / `psql`

**Result**: Dev database is a snapshot of production at the time of cloning.

### Ongoing Maintenance

Since dev is now a static copy, consider these maintenance tasks:

#### Keep Schema in Sync

When schema changes are made in production:
```bash
# Pull latest schema from prod
supabase link --project-ref qcfifybkaddcoimjroca
supabase db pull

# Apply to dev
supabase link --project-ref qzsmhgyojmwvtjmnrdea
supabase db push
```

#### Refresh Data Periodically (Optional)

To re-sync dev data from prod (every 2-4 weeks):
```bash
# Export from prod
pg_dump "postgresql://postgres:<password>@db.qcfifybkaddcoimjroca.supabase.co:5432/postgres" > prod_snapshot_$(date +%Y%m%d).sql

# Import to dev
psql "postgresql://postgres:<password>@db.qzsmhgyojmwvtjmnrdea.supabase.co:5432/postgres" < prod_snapshot_*.sql
```

**⚠️ Data Privacy**: Dev database contains REAL USER DATA. Ensure compliance with privacy policies and restrict access appropriately.

#### Reset to Clean State (If Needed)

To clear dev database and start fresh:
```bash
supabase link --project-ref qzsmhgyojmwvtjmnrdea
supabase db reset  # Resets to migrations only, removes cloned data
```

---

## Part 6: Cloudflare Pages Environment Configuration

### Understanding Cloudflare Deployments

Cloudflare Pages reads environment variables from:
1. **Cloudflare Dashboard** → Project Settings → Environment Variables (highest priority)
2. Local `.env` files (only for local builds)

**Key Point**: To deploy to production with prod credentials, configure Cloudflare environment variables.

### Step 1: Access Cloudflare Pages Dashboard

1. Go to [Cloudflare Dashboard](https://dash.cloudflare.com/)
2. Navigate to **Pages** → **splitlease** (your project name)
3. Go to **Settings** → **Environment Variables**

### Step 2: Configure Production Build

For **Production** branch (main):

| Variable Name | Value |
|---------------|-------|
| `VITE_SUPABASE_URL` | `https://qcfifybkaddcoimjroca.supabase.co` |
| `VITE_SUPABASE_ANON_KEY` | `<prod_anon_key>` |

**Environment**: Select "Production"

### Step 3: Configure Preview Builds (Optional)

For **Preview** branches (all other branches):

| Variable Name | Value |
|---------------|-------|
| `VITE_SUPABASE_URL` | `https://qzsmhgyojmwvtjmnrdea.supabase.co` |
| `VITE_SUPABASE_ANON_KEY` | `<dev_anon_key>` |

**Environment**: Select "Preview"

**Result**: All non-main branches will use the dev Supabase project.

### Step 4: Redeploy After Changes

After updating environment variables:
1. Go to **Deployments**
2. Click **Retry Deployment** on the latest build

Or push a new commit to trigger a rebuild.

---

## Part 7: Verification Checklist

After completing the setup, verify everything works:

### Frontend Verification

- [ ] Dev server runs without errors (`bun run dev`)
- [ ] Browser console shows requests to `qzsmhgyojmwvtjmnrdea.supabase.co`
- [ ] No hardcoded production URLs in browser Network tab
- [ ] Login/signup works (creates users in dev project)
- [ ] Database queries work (check Supabase Dashboard → Table Editor)

### Edge Functions Verification

- [ ] Edge Functions deploy successfully (`supabase functions deploy`)
- [ ] Functions are listed in dev project dashboard
- [ ] Function logs show in Supabase Dashboard → Logs
- [ ] Edge Function calls return expected results (check Network tab)

### Database Verification

- [x] Tables exist in dev project (check Supabase Dashboard) - **Cloned from prod**
- [x] Production schema replicated successfully - **Verified on 2026-01-09**
- [x] Production data cloned (including users, listings, proposals)
- [ ] RLS policies are active (check Database → Policies)
- [ ] Test queries work against cloned data
- [ ] Dev database is NOT being modified by production traffic

### Cloudflare Verification

- [ ] Production deployments use prod Supabase project
- [ ] Preview deployments use dev Supabase project (if configured)
- [ ] Environment variables are set correctly

---

## Part 8: Common Issues and Troubleshooting

### Issue 1: "VITE_SUPABASE_URL is required" Error

**Cause**: Environment variable not loaded.

**Solution**:
1. Check `app/.env` exists and has correct values
2. Restart dev server (`bun run dev`)
3. Clear browser cache and hard reload (Ctrl+Shift+R)

---

### Issue 2: Edge Functions Still Use Production

**Cause**: Functions deployed to wrong project.

**Solution**:
```bash
# Verify linked project
supabase projects list

# Should show qzsmhgyojmwvtjmnrdea

# If not, re-link
supabase link --project-ref qzsmhgyojmwvtjmnrdea

# Redeploy
supabase functions deploy
```

---

### Issue 3: Authentication Doesn't Work

**Cause**: Mismatched auth keys or project.

**Solution**:
1. Verify anon key in `app/.env` matches dev project
2. Check Supabase Dashboard → Authentication → Users
3. Ensure user was created in the correct project

---

### Issue 4: Database Schema Doesn't Match

**Cause**: Migrations not applied to dev.

**Solution**:
```bash
# Reset dev database to migrations
supabase db reset

# Or apply specific migrations
supabase migration up
```

---

### Issue 5: Cloudflare Build Uses Wrong Environment

**Cause**: Environment variables not set in Cloudflare Dashboard.

**Solution**:
1. Go to Cloudflare Pages → Settings → Environment Variables
2. Ensure variables are set for correct environment (Production/Preview)
3. Trigger a new deployment

---

## Part 9: Switching Between Dev and Prod

### Quick Switch Script (Optional)

Create helper scripts to quickly switch environments:

**`scripts/use-dev.sh`**:
```bash
#!/bin/bash
echo "Switching to DEV environment..."
echo "VITE_SUPABASE_URL=https://qzsmhgyojmwvtjmnrdea.supabase.co" > app/.env
echo "VITE_SUPABASE_ANON_KEY=<dev_anon_key>" >> app/.env
echo "✅ Switched to DEV"
```

**`scripts/use-prod.sh`**:
```bash
#!/bin/bash
echo "Switching to PROD environment..."
echo "VITE_SUPABASE_URL=https://qcfifybkaddcoimjroca.supabase.co" > app/.env
echo "VITE_SUPABASE_ANON_KEY=<prod_anon_key>" >> app/.env
echo "✅ Switched to PROD"
```

**Usage**:
```bash
bash scripts/use-dev.sh
bun run dev
```

**⚠️ Important**: Add `scripts/*.sh` to `.gitignore` so keys aren't committed.

---

## Part 10: Best Practices

### 1. Never Commit Credentials

**Always in `.gitignore`**:
```
app/.env
scripts/use-*.sh
*.pem
*.key
```

### 2. Use Environment-Specific Naming

When testing, create test data with clear naming:
- Dev users: `test-user-1@example.com`, `dev-guest@example.com`
- Prod users: Real email addresses

This makes it obvious which environment you're in.

### 3. Use Git Branches for Environment Alignment

**Recommended workflow**:
- `main` branch → Always production-ready → Deploys to prod
- `develop` branch → Active development → Deploys to dev (via Cloudflare Preview)
- Feature branches → Deploy to dev for testing

### 4. Regular Data Refresh

Periodically refresh dev database from prod (without sensitive data):
```bash
# Every 2-4 weeks
bash scripts/refresh-dev-db.sh
```

This keeps dev close to production schema.

### 5. Monitor Edge Function Logs

When testing Edge Functions, always check logs:
```bash
supabase functions logs <function-name> --project-ref qzsmhgyojmwvtjmnrdea
```

Or view in Supabase Dashboard → Logs.

---

## Summary

You've successfully configured your development environment! Here's what you set up:

✅ **Frontend**: Uses `qzsmhgyojmwvtjmnrdea` via `app/.env`
✅ **Edge Functions**: Automatically use dev credentials when deployed to dev
✅ **Database**: Dev database cloned from production (schema + data as of ~2026-01-09)
✅ **Cloudflare**: Production builds use prod, previews use dev

**Current Environment Status**:
- **Production**: `qcfifybkaddcoimjroca` | PostgreSQL 17.6.1.011 | us-east-2 | ACTIVE_HEALTHY
- **Development**: `qzsmhgyojmwvtjmnrdea` | PostgreSQL 17.6.1.063 | us-east-2 | ACTIVE_HEALTHY

**Next Steps**:
1. Update `app/.env` to point to dev project (if not already done)
2. Test a full user flow against cloned data (login → view listing → create proposal)
3. Deploy Edge Functions to dev and test them
4. Verify RLS policies are enforced correctly
5. Set up Cloudflare environment variables for preview builds
6. Establish a schedule for periodic data refreshes (optional)

---

## Reference Links

- [Supabase CLI Documentation](https://supabase.com/docs/guides/cli)
- [Cloudflare Pages Environment Variables](https://developers.cloudflare.com/pages/platform/build-configuration/)
- [Vite Environment Variables](https://vitejs.dev/guide/env-and-mode.html)
- [Split Lease CLAUDE.md](./../../../CLAUDE.md)

---

## Related Files

- `app/.env` - Frontend environment variables (NOT committed)
- `app/.env.example` - Template for environment variables
- `app/src/lib/supabase.js` - Primary Supabase client initialization
- `supabase/config.toml` - Edge Functions configuration
- `.claude/plans/Documents/20260109143000-supabase-project-references-analysis-current.md` - Full reference analysis
