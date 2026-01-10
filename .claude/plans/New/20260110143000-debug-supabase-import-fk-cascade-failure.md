# Debug Analysis: Supabase Production-to-Dev Import FK Cascade Failure

**Created**: 2026-01-10 14:30:00
**Status**: Analysis Complete - Pending Implementation
**Severity**: High
**Affected Area**: Database data migration, sync infrastructure

---

## 1. System Context (From Onboarding)

### 1.1 Architecture Understanding
- **Architecture Pattern**: Supabase PostgreSQL with queue-based Bubble sync
- **Tech Stack**: PostgreSQL (Supabase), pg_cron, pg_net, Edge Functions
- **Data Flow**:
  - Production DB exports via `pg_dump`
  - Import via `psql` to development Supabase
  - Triggers fire during COPY operations, attempting to queue sync operations
  - FK constraints enforced at trigger execution time

### 1.2 Domain Context
- **Feature Purpose**: Replicate production data to development environment for testing
- **Related Documentation**:
  - `.claude/plans/New/20260110062821-supabase-prod-recon-for-replication.md`
  - `supabase/migrations/20251205_create_sync_queue_tables.sql`
  - `supabase/migrations/20251209_listing_bubble_sync_backend.sql`
- **Data Model**:
  - `sync_config` table defines which tables sync to Bubble
  - `sync_queue` table stores pending sync operations with FK to `sync_config.supabase_table`
  - `listing` table has trigger `listing_bubble_sync_trigger` that auto-queues INSERTs

### 1.3 Relevant Conventions
- **Queue-Based Sync**: Supabase -> Bubble sync via `sync_queue` table, processed by cron
- **FK Constraint Pattern**: `fk_sync_queue_sync_config` enforces referential integrity
- **Trigger Behavior**: `trigger_listing_sync_queue()` fires on listing INSERT when `bubble_id IS NULL`

### 1.4 Entry Points and Dependencies
- **Import Entry Point**: `psql` COPY command loading `production_data.sql`
- **Critical Path**:
  1. COPY loads `sync_config` data (only 5 rows, 'listing' may be present)
  2. COPY loads `listing` data
  3. Trigger fires, attempts INSERT to `sync_queue` with `table_name='listing'`
  4. FK check fails if 'listing' not in `sync_config`
  5. Entire listing INSERT fails, transaction rolls back
- **Dependencies**:
  - `sync_config` must have 'listing' entry BEFORE listing data loads
  - FK constraint `fk_sync_queue_sync_config` exists in production but NOT in migration files

---

## 2. Problem Statement

Data import from production to development Supabase failed due to a cascade of foreign key constraint violations:

1. **Primary Cause**: The `listing_bubble_sync_trigger` fired during data import, attempting to insert into `sync_queue` with `table_name='listing'`
2. **FK Violation**: `sync_queue.table_name` has an FK constraint to `sync_config.supabase_table`, but the 'listing' entry was not present when the trigger fired
3. **Cascade Effect**: Failed listing INSERTs caused dependent tables (`thread`, `_message`, `bookings_leases`, `user_lease`, `user_listing_favorite`) to fail their FK checks

**Key Insight**: The FK constraint `fk_sync_queue_sync_config` was added to production database **outside of migration files**. This constraint does not exist in the local migration definitions.

---

## 3. Reproduction Context

### Environment
- **Source**: Production Supabase (qcfifybkaddcoimjroca)
- **Target**: Development Supabase (qzsmhgyojmwvtjmnrdea)
- **Import Method**: `psql` with `--variable=ON_ERROR_STOP=0`

### Steps to Reproduce
1. Export production schema and data via `pg_dump`
2. Apply schema to dev database
3. Run `psql --file=production_data.sql --variable=ON_ERROR_STOP=0`
4. Observe FK violation errors in log

### Expected Behavior
- All 312 listings should import successfully
- All dependent tables (threads, messages, leases, favorites) should import
- No FK violations

### Actual Behavior
- FK violation at line 802: `sync_queue.table_name='listing'` not present in `sync_config`
- Listing rows failed to import (some may have succeeded before trigger fired)
- Dependent tables failed with cascading FK violations:
  - `thread.Listing_fkey` - listings missing
  - `_message.fk_message_thread` - threads missing
  - `thread_message.fk_thread_message_message` - messages missing
  - `thread_participant.fk_thread_participant_thread` - threads missing
  - `bookings_leases.fk_bookings_leases_listing` - listings missing
  - `user_lease.fk_user_lease_lease` - leases missing
  - `user_listing_favorite.fk_user_listing_favorite_listing` - listings missing
  - `listing_drafts.user_id_fkey` - users missing in `users` table (auth schema)

### Error Messages (from logs)
```
ERROR: insert or update on table "sync_queue" violates foreign key constraint "fk_sync_queue_sync_config"
DETAIL: Key (table_name)=(listing) is not present in table "sync_config".
CONTEXT: SQL statement "INSERT INTO sync_queue (table_name, record_id, operation, payload, status, idempotency_key) VALUES ('listing', NEW._id, 'INSERT', ...)"
PL/pgSQL function trigger_listing_sync_queue() line 5 at SQL statement
```

---

## 4. Investigation Summary

### 4.1 Files Examined
| File | Relevance |
|------|-----------|
| `supabase/migrations/20251205_create_sync_queue_tables.sql` | Defines sync_config and sync_queue tables, seed data |
| `supabase/migrations/20251209_listing_bubble_sync_backend.sql` | Creates listing trigger, enables sync_config for listing |
| `supabase-migrations/backups/20260110/data_import_log_1.txt` | Contains exact FK violation errors |
| `.claude/plans/New/20260110062821-supabase-prod-recon-for-replication.md` | Production DB reconnaissance |

### 4.2 Execution Flow Trace

```
1. psql executes COPY for sync_config
   - 5 rows copied (production has 'listing' entry, enabled=TRUE)

2. psql executes COPY for listing table
   |
   +---> FOR EACH ROW, trigger fires: trigger_listing_sync_queue()
         |
         +---> Checks if NEW.bubble_id IS NULL
               |
               +---> (YES) Attempts INSERT INTO sync_queue with table_name='listing'
                     |
                     +---> FK CHECK: Does sync_config have supabase_table='listing'?
                           |
                           +---> (NO) ERROR! FK violation
                                 |
                                 +---> Entire listing INSERT fails
                                       |
                                       +---> Listing row not in database
                                             |
                                             +---> Dependent tables fail FK checks
```

**Root Cause Discovery**: The sync_config COPY succeeded (5 rows), but the FK constraint `fk_sync_queue_sync_config` may have been checking during INSERT before sync_config was fully committed, OR the 'listing' row was not in the exported sync_config data.

### 4.3 Git History Analysis

Recent commits related to sync infrastructure:
- `c6f883a4` - feat: implement queue-based signup sync to Bubble
- `9065269d` - feat(sync): add Supabase -> Bubble push sync system

**Key Finding**: The FK constraint `fk_sync_queue_sync_config` is NOT defined in any migration file. It was added directly to production, likely via SQL Editor.

---

## 5. Hypotheses

### Hypothesis 1: Missing FK Constraint in Schema Export (Likelihood: 40%)
**Theory**: The FK constraint `fk_sync_queue_sync_config` exists in production but wasn't included in the schema export, so when data was imported, the constraint wasn't present to fail. But the trigger still failed because...

**Wait, re-analyzing**: The log shows the FK violation happened, so the constraint WAS present. This means:

### Hypothesis 1 (REVISED): Trigger Execution Before sync_config Fully Loaded (Likelihood: 75%)
**Theory**: During pg_dump export, data is ordered in a specific way. If `listing` table COPY executed BEFORE `sync_config` COPY completed (or if COPY operations are not atomic), the trigger firing on listing INSERT would fail FK check.

**Supporting Evidence**:
- Error occurs at line 802 in production_data.sql
- sync_config has only 5 rows, likely loaded early
- But triggers execute DURING COPY, not after

**Verification Steps**:
1. Check order of COPY statements in production_data.sql
2. Verify sync_config data includes 'listing' entry
3. Check if COPY is transactional per-table or per-row

**Potential Fix**:
- Disable triggers during import
- Ensure sync_config loaded before listing

### Hypothesis 2: sync_config Data Missing 'listing' Entry (Likelihood: 60%)
**Theory**: The production sync_config table was exported, but the 'listing' entry was disabled or missing.

**Supporting Evidence**:
- Production has 5 rows in sync_config
- Migration 20251209 should have created 'listing' entry with `enabled=TRUE`
- Log shows FK violation on `table_name='listing'`

**Verification Steps**:
1. Query production sync_config to verify 'listing' entry exists
2. Check if 'listing' entry was in the exported data

**Potential Fix**:
- Ensure sync_config includes 'listing' before listing import
- Insert 'listing' entry if missing

### Hypothesis 3: Untracked FK Constraint in Production (Likelihood: 85%)
**Theory**: The FK constraint `fk_sync_queue_sync_config` was added to production via SQL Editor but never committed to migration files. The schema export included this constraint, which then enforces referential integrity during import.

**Supporting Evidence**:
- Constraint name `fk_sync_queue_sync_config` not found in any migration file
- Original sync_queue migration (20251205) does NOT define this FK
- Production database has been modified outside of version-controlled migrations

**Verification Steps**:
1. Query production to list all constraints on sync_queue table
2. Compare with migration-defined constraints

**Potential Fix**:
- Document the FK constraint and add to migrations
- OR remove the FK constraint during import
- Ensure import strategy accounts for this constraint

### Hypothesis 4: Trigger Should Be Disabled During Imports (Likelihood: 90%)
**Theory**: The `listing_bubble_sync_trigger` is designed for runtime operation, not bulk imports. It should be disabled during data imports to prevent FK violations and unnecessary sync queue entries.

**Supporting Evidence**:
- Trigger fires for EVERY INSERT, including bulk imports
- Import data already exists in production Bubble, no need to re-sync
- Standard database migration practice: disable triggers during bulk loads

**Verification Steps**:
- This is a best practice, no verification needed

**Potential Fix**:
- Disable ALL triggers before import: `SET session_replication_role = replica;`
- Re-enable after import: `SET session_replication_role = DEFAULT;`

### Hypothesis 5: Import Order Incorrect (Likelihood: 45%)
**Theory**: Tables must be loaded in FK dependency order. If listing loaded before sync_config completed, or if dependent tables loaded before listing completed, FK violations occur.

**Supporting Evidence**:
- Multiple FK violations across different tables
- Error log shows listings missing when thread tried to load

**Verification Steps**:
1. Map all FK dependencies
2. Check pg_dump export order matches dependency order

**Potential Fix**:
- Use `--disable-triggers` with pg_restore
- Manually reorder COPY statements in SQL file
- Defer FK constraint checks until end of transaction

---

## 6. Recommended Action Plan

### Priority 1: Disable Triggers During Import (CRITICAL)

**SQL Commands to Disable Triggers**:
```sql
-- Option A: Disable ALL triggers (recommended for bulk import)
SET session_replication_role = replica;

-- Run import here

-- Re-enable triggers
SET session_replication_role = DEFAULT;
```

**Alternative - Disable specific trigger**:
```sql
ALTER TABLE listing DISABLE TRIGGER listing_bubble_sync_trigger;
-- Run import
ALTER TABLE listing ENABLE TRIGGER listing_bubble_sync_trigger;
```

### Priority 2: Verify and Fix sync_config Data

**Before importing listing data, ensure sync_config has the 'listing' entry**:
```sql
-- Check if listing entry exists
SELECT * FROM sync_config WHERE supabase_table = 'listing';

-- If missing, insert it
INSERT INTO sync_config (supabase_table, bubble_workflow, bubble_object_type, enabled, sync_on_insert, sync_on_update, sync_on_delete)
VALUES ('listing', 'sync_listing_from_supabase', 'listing', TRUE, TRUE, FALSE, FALSE)
ON CONFLICT (supabase_table) DO UPDATE SET enabled = TRUE;
```

### Priority 3: Clear and Re-import with Correct Order

**Step-by-step corrective workflow**:

1. **Clear dev database (optional, or truncate affected tables)**:
```sql
-- Truncate in reverse FK order
TRUNCATE TABLE user_listing_favorite CASCADE;
TRUNCATE TABLE user_lease CASCADE;
TRUNCATE TABLE bookings_leases CASCADE;
TRUNCATE TABLE thread_participant CASCADE;
TRUNCATE TABLE thread_message CASCADE;
TRUNCATE TABLE _message CASCADE;
TRUNCATE TABLE thread CASCADE;
TRUNCATE TABLE listing CASCADE;
TRUNCATE TABLE sync_queue CASCADE;
```

2. **Disable triggers**:
```sql
SET session_replication_role = replica;
```

3. **Import sync_config first** (or ensure it's in the SQL file before listing):
```sql
-- Import sync_config data from production
COPY sync_config FROM ... ;
```

4. **Import tables in FK dependency order**:
```
1. user (no FK dependencies)
2. sync_config (no FK dependencies)
3. listing (FK to user)
4. thread (FK to listing, user)
5. _message (FK to thread, user)
6. thread_message (FK to thread, _message)
7. thread_participant (FK to thread, user)
8. bookings_leases (FK to listing, user)
9. user_lease (FK to bookings_leases, user)
10. user_listing_favorite (FK to listing, user)
11. listing_drafts (FK to user, listing)
```

5. **Re-enable triggers**:
```sql
SET session_replication_role = DEFAULT;
```

6. **Clear sync_queue (imported data doesn't need re-sync)**:
```sql
DELETE FROM sync_queue WHERE status = 'pending';
```

### Priority 4: Update Import Script for Future Imports

**Create a reusable import script**:
```powershell
# import-production-data.ps1

# Step 1: Disable triggers
psql "postgresql://postgres:$($env:Passwd)@db.DEV_PROJECT.supabase.co:5432/postgres" -c "SET session_replication_role = replica;"

# Step 2: Import data
psql "postgresql://postgres:$($env:Passwd)@db.DEV_PROJECT.supabase.co:5432/postgres" `
  --file=production_data.sql `
  --set=ON_ERROR_STOP=1 `
  2>&1 | Tee-Object data_import_log.txt

# Step 3: Re-enable triggers
psql "postgresql://postgres:$($env:Passwd)@db.DEV_PROJECT.supabase.co:5432/postgres" -c "SET session_replication_role = DEFAULT;"

# Step 4: Clear sync_queue (optional)
psql "postgresql://postgres:$($env:Passwd)@db.DEV_PROJECT.supabase.co:5432/postgres" -c "DELETE FROM sync_queue WHERE status = 'pending';"
```

**Alternative using pg_restore with --disable-triggers**:
```bash
pg_restore --disable-triggers --data-only -d postgres production_data.dump
```

---

## 7. Prevention Recommendations

### 7.1 Add FK Constraint to Migration Files
The `fk_sync_queue_sync_config` constraint should be added to version-controlled migrations:

```sql
-- Create migration: supabase/migrations/20260110_add_sync_queue_fk.sql
ALTER TABLE sync_queue
ADD CONSTRAINT fk_sync_queue_sync_config
FOREIGN KEY (table_name) REFERENCES sync_config(supabase_table);
```

### 7.2 Document Import Workflow
Create a documented workflow in `.claude/Documentation/Database/` for:
- Production to dev replication
- Required pre-import steps (disable triggers)
- Post-import verification queries
- FK dependency order

### 7.3 Consider Deferred FK Constraints
For bulk imports, use deferred constraints:
```sql
SET CONSTRAINTS ALL DEFERRED;
-- Import data
SET CONSTRAINTS ALL IMMEDIATE;
```

### 7.4 Add Data Integrity Verification Queries
After import, run:
```sql
-- Check for orphaned threads (listing FK)
SELECT COUNT(*) FROM thread t
WHERE NOT EXISTS (SELECT 1 FROM listing l WHERE l._id = t."Listing");

-- Check for orphaned messages (thread FK)
SELECT COUNT(*) FROM _message m
WHERE NOT EXISTS (SELECT 1 FROM thread t WHERE t._id = m."Associated Thread/Conversation");

-- Continue for all FK relationships...
```

---

## 8. Related Files Reference

| File | Purpose | Potential Changes |
|------|---------|-------------------|
| `supabase/migrations/20251205_create_sync_queue_tables.sql` | sync_queue/config tables | Add FK constraint |
| `supabase/migrations/20251209_listing_bubble_sync_backend.sql` | listing trigger | Document trigger behavior |
| `.claude/plans/New/20260110062821-supabase-prod-recon-for-replication.md` | Prod DB reconnaissance | Reference for data volumes |
| `supabase-migrations/backups/20260110/production_data.sql` | Import file | Verify table order |
| `.claude/Documentation/Database/` | Database docs | Add import workflow doc |

---

## 9. Data Loss Assessment

### Tables with Partial/Failed Imports

| Table | Expected Rows | Likely Imported | Potential Loss |
|-------|---------------|-----------------|----------------|
| listing | 312 | Partial (unknown) | Some listings failed |
| thread | 800 | Partial | Threads referencing failed listings |
| _message | 6,074 | Partial | Messages in failed threads |
| bookings_leases | 197 | Partial | Leases for failed listings |
| user_listing_favorite | Unknown | Partial | Favorites for failed listings |
| listing_drafts | 6 | 0 | user_id FK violation (auth.users) |

### How to Measure Data Loss
```sql
-- Count current rows in dev
SELECT
  'listing' as table_name, COUNT(*) as dev_count, 312 as prod_count FROM listing
UNION ALL
SELECT 'thread', COUNT(*), 800 FROM thread
UNION ALL
SELECT '_message', COUNT(*), 6074 FROM "_message"
UNION ALL
SELECT 'bookings_leases', COUNT(*), 197 FROM bookings_leases;
```

---

## 10. Future Import Checklist

- [ ] Disable triggers: `SET session_replication_role = replica;`
- [ ] Verify sync_config has all required table entries
- [ ] Import tables in FK dependency order
- [ ] Use `ON_ERROR_STOP=1` to catch errors early
- [ ] Re-enable triggers after import
- [ ] Clear sync_queue of pending items (data already in Bubble)
- [ ] Run data integrity verification queries
- [ ] Compare row counts with production
- [ ] Test application functionality with imported data

---

**Analysis Complete. Ready for implementation upon request.**
