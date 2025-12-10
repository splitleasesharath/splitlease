# Supabase Rollback & Disaster Recovery Capabilities

**Document Date**: December 3, 2025
**Status**: Exploration Summary (No Changes Made)

---

## Executive Summary

Supabase provides multiple layers of backup and recovery options depending on your plan level. The key distinction is between **Daily Backups** (all paid plans) and **Point-in-Time Recovery (PITR)** (paid plans with add-on). For disaster recovery from past hour incidents, PITR is the most relevant option.

---

## 1. Rollback Options Available in Supabase

### A. Daily Backups (Standard on All Paid Plans)

**What it is:**
- Automatic daily snapshots of your entire database
- Generated using PostgreSQL's `pg_dumpall` utility
- Stored as compressed SQL files

**Recovery Capability:**
- Restore to a specific day's backup (midnight UTC)
- RPO (Recovery Point Objective): Up to 24 hours of data loss
- Recovery Time Objective (RTO): Depends on database size (larger databases take longer)

**Backup Retention by Plan:**
- **Pro Plan**: 7 days of daily backups
- **Team Plan**: 14 days of daily backups
- **Enterprise Plan**: 30 days of daily backups

**Limitations:**
- Cannot restore to a specific time within a day
- Restores are full database operations (all-or-nothing)
- Password-protected custom roles are not stored in daily backups
- Not available on Free plan

**Access:**
- Available in Supabase Dashboard > Database > Backups > Scheduled backups
- Downloadable for manual backup purposes

---

### B. Point-in-Time Recovery (PITR) - **BEST FOR HOUR-LEVEL ROLLBACK**

**What it is:**
- Granular recovery capability down to seconds
- Uses a combination of:
  - Physical database snapshots (daily)
  - Write Ahead Log (WAL) file archiving via WAL-G
  - WAL files archived at 2-minute intervals (or immediately if size threshold exceeded)

**Recovery Capability:**
- Restore database to ANY point in time within your recovery window
- **RPO (Recovery Point Objective)**: As low as 2 minutes during active database use
- Granularity: Can specify exact date and time (down to seconds) for recovery
- **Perfect for:** Recovering from accidental changes within the past hour

**Backup Retention by Period:**
- 7-day window: $100/month ($0.137/hour)
- 14-day window: $200/month ($0.274/hour)
- 28-day window: $400/month ($0.55/hour)

**Plan Availability:**
- Available as an **add-on** for Pro, Team, and Enterprise plans
- Requires at least Small compute add-on for reliable functioning
- **Not available on Free plan**

**Key Advantages:**
- Most granular recovery option
- Can recover from data corruption, accidental deletions, or unintended updates
- WAL files ensure continuous capture of all changes
- Physical backups are more performant and less disruptive than logical backups

**Restoration Process:**
1. Navigate to Dashboard > Database > Backups > Point in Time
2. Select desired recovery date and time (within retention window)
3. Confirm restoration (causes project downtime)
4. System downloads latest physical backup and replays WAL files to recovery point
5. Dashboard notification when complete

**Important Notes:**
- Enabling PITR disables Daily Backups (redundant)
- When PITR is disabled, new backups are still physical but less granular
- PITR is hourly billing (charges for full hour even if enabled for partial hour)

---

### C. Database Branching (Preview/Development)

**What it is:**
- Feature for creating isolated database copies for testing
- Automatic schema migration replication
- Separate endpoints for each branch

**Recovery Capability:**
- Can delete a branch and recreate it to reset to a known state
- Branch deletion and recreation equivalent to `supabase db reset`
- Useful for testing changes before production

**Limitations:**
- Not a primary backup mechanism
- Branches are temporary development environments
- Data loss on deletion

**Availability:**
- Available on paid plans
- Currently in beta

---

### D. Restore to New Project (Clone/Duplicate)

**What it is:**
- Create a completely new Supabase project from a backup
- Useful for creating staging/testing environments
- Replicates key configurations (compute size, disk attributes, SSL, network restrictions)

**Recovery Capability:**
- Can restore from any available Daily Backup or PITR point
- Provides isolated copy for validation before applying to production
- Useful for complex scenario testing

**Plan Requirements:**
- Paid plans only (Pro, Team, Enterprise)
- Physical backups must be enabled
- PITR optional but recommended

**Use Cases:**
- Creating staging environments from production
- Testing recovery procedures
- Data analysis on a copy without affecting production
- Safe rollback validation (apply to new project first)

---

## 2. Plan-Level Features Comparison

| Feature | Free | Pro | Team | Enterprise |
|---------|------|-----|------|-----------|
| **Daily Backups** | ❌ | ✅ (7 days) | ✅ (14 days) | ✅ (30 days) |
| **PITR Add-on** | ❌ | ✅ Available | ✅ Available | ✅ Available |
| **Backup Type (0-15GB)** | — | Logical | Logical | Physical |
| **Backup Type (>15GB)** | — | Physical | Physical | Physical |
| **Restore to New Project** | ❌ | ✅ | ✅ | ✅ |
| **Database Branching** | ❌ | ✅ (Beta) | ✅ (Beta) | ✅ (Beta) |
| **Read Replicas** | ❌ | ✅ | ✅ | ✅ |

---

## 3. Current Split Lease Project Status

**Unable to Verify** - Authorization issues prevented direct access to:
- Current migration history
- Active branching configuration
- Current backup settings

**To Check Manually:**
1. Go to Supabase Dashboard
2. Navigate to: Database > Backups > Scheduled backups
3. If you can download backups → Using logical backups
4. Navigate to: Database > Backups > Point in Time
5. If section exists with active recovery dates → PITR is enabled

---

## 4. Recommended Disaster Recovery Strategy

### For Past-Hour Rollback:

**Option 1: PITR (Recommended)**
```
Requirement: Pro plan + PITR add-on (7-day minimum: $100/month)
Process:
1. Dashboard > Database > Backups > Point in Time
2. Select time 1 hour ago
3. Confirm restoration
4. Wait for database to restore (downtime = database size dependent)
5. Verify data integrity
```

**Option 2: Daily Backup (Fallback)**
```
Requirement: Pro/Team/Enterprise plan
Process:
1. Dashboard > Database > Backups > Scheduled backups
2. Select yesterday's backup
3. Confirm restoration
4. Wait for restore
5. Risk: Lose up to 24 hours of data
```

### For Safe Testing Before Rollback:

```
1. Use Restore to New Project feature
2. Create test clone at desired recovery point
3. Verify data integrity and application compatibility
4. Once validated, rollback production from same backup
5. Delete test project
```

---

## 5. Key Limitations & Constraints

### Rollback Limitations:

1. **Full Database Operations**
   - Restores are all-or-nothing (entire database, not selective tables)
   - Cannot restore individual tables or schemas
   - Must restore entire project

2. **Downtime Required**
   - Project becomes inaccessible during restoration
   - Duration = database size (larger = longer downtime)
   - No way to minimize downtime for rollback

3. **Custom Role Passwords**
   - Daily backups do not store passwords for custom Postgres roles
   - Must reset custom role passwords after restoration

4. **Read Replicas Block Operations**
   - Must delete all Read Replicas before restoration
   - Can recreate after restoration completes

5. **Data Loss Risk**
   - Daily backups = up to 24 hours potential data loss
   - PITR = up to 2 minutes potential data loss (at worst)
   - Older backups = more data loss if using older recovery point

6. **Storage Objects Not Included**
   - Database backups do NOT include Storage API files
   - File metadata is backed up, but actual files in Storage are NOT restored
   - Deleted files from before backup cannot be recovered

---

## 6. Backup Type Performance Considerations

### Logical Backups (0-15GB databases)
- **Pros**: Downloadable, human-readable SQL
- **Cons**: Takes longer, holds locks on objects, more disruptive
- **Use When**: Smaller databases (<15GB), need manual backup copies

### Physical Backups (>15GB or with PITR)
- **Pros**: More performant, less locking, less disruptive
- **Cons**: Cannot download from dashboard directly
- **Use When**: Large databases or PITR enabled
- **Note**: Automatically transitions at 15GB threshold

---

## 7. Disaster Recovery Workflow

### Step 1: Assess the Damage
```sql
-- Check recent changes
SELECT * FROM your_affected_table
ORDER BY modified_at DESC LIMIT 100;

-- Check for triggers or cascading deletes
SELECT * FROM your_transaction_log
WHERE timestamp > NOW() - INTERVAL '1 hour';
```

### Step 2: Choose Recovery Point
- **PITR Available?** → Use specific time (e.g., 30 minutes ago)
- **PITR Not Available?** → Use yesterday's backup (24-hour data loss)

### Step 3: Create Test Clone (Recommended)
```
1. Dashboard > Backups > Restore to New Project
2. Select recovery point
3. Create new project copy
4. Test application against clone
5. Verify data integrity
```

### Step 4: Perform Production Rollback
```
1. Notify team of 5-30 minute maintenance window
2. Delete all Read Replicas (if any)
3. Initiate restore from dashboard
4. Wait for completion
5. Verify critical data
6. Recreate Read Replicas
7. Reset custom role passwords (if used)
```

### Step 5: Post-Rollback
- Verify all data is correct
- Check application logs for errors
- Reapply any lost transactions manually if needed
- Document root cause and prevention measures

---

## 8. Cost Implications

### Baseline Backup Costs (Included in Plan)
- **Pro Plan**: $25/month - includes 7 daily backups
- **Team Plan**: $599/month - includes 14 daily backups
- **Enterprise**: Custom pricing - includes 30 daily backups

### PITR Add-On Costs (Hourly Billing)
```
7-day retention:   $0.137/hour  or $100/month
14-day retention:  $0.274/hour  or $200/month
28-day retention:  $0.55/hour   or $400/month
```

### Example: Split Lease with Pro + 7-day PITR
```
Monthly Cost = $25 (Pro) + $100 (PITR) = $125/month
Plus compute/disk costs
```

---

## 9. Security Considerations

### RLS Policies During Rollback
- Rollback includes RLS policies from backup point
- If RLS policies were wrong in backup, they stay wrong
- Solution: Update RLS policies separately after rollback

### Custom Extensions
- All enabled extensions are restored
- Some extensions (pg_cron, pg_net, wrappers) may perform external actions
- Disable suspicious extensions after rollback if they weren't the root cause

### Secrets & API Keys
- Environment variables NOT stored in database backups
- Edge Function secrets must be manually verified
- Application configuration NOT affected by rollback

---

## 10. Recommendations for Split Lease

### Immediate (No Cost)
1. **Document current backup status**
   - Check if PITR is enabled
   - Verify daily backup retention
   - Test restore process on staging (if available)

2. **Create runbook for disaster recovery**
   - Documented steps for team
   - Contact procedures
   - Communication plan for users

3. **Test restore procedures**
   - Create test database from backup
   - Verify application works with restored data
   - Document any custom steps needed

### Short Term ($100/month)
4. **Enable PITR with 7-day retention**
   - Changes RPO from 24 hours to 2 minutes
   - Enables hour-level rollback capability
   - Minimal cost for critical safety feature

### Medium Term
5. **Document current schema & migrations**
   - Know what migrations have been applied
   - Understand migration rollback process
   - Track migration history in git

6. **Set up monitoring for failed backups**
   - Supabase sends alerts
   - Verify alerts are being received
   - Have response procedure documented

### Long Term
7. **Consider Compute Add-Ons**
   - Better performance for PITR operations
   - Enables Read Replicas for redundancy
   - Better for production stability

---

## 11. Migration Rollback (Different from Database Rollback)

**Note**: This is for rolling back schema migrations, not data recovery:

### Using Supabase CLI
```bash
# List applied migrations
supabase migration list

# Reset to specific migration version
supabase db reset --version <migration_timestamp>

# This recreates database and re-runs migrations up to that point
```

### For Development Branches
```bash
# Delete preview branch
supabase branches delete <branch_id>

# Recreate it to reset to known state
# Migrations are reapplied in order
# Seed data is reapplied
```

### For Production Migrations
- Cannot easily roll back schema changes
- Solution: Create down migrations that reverse the change
- Always test migrations on staging first

---

## References

- **Supabase Backups Guide**: https://supabase.com/docs/guides/platform/backups
- **PITR Documentation**: https://supabase.com/docs/guides/platform/backups#point-in-time-recovery
- **Database Migrations**: https://supabase.com/docs/guides/deployment/database-migrations
- **Branching Guide**: https://supabase.com/docs/guides/deployment/branching/working-with-branches
- **Clone Project Guide**: https://supabase.com/docs/guides/platform/clone-project

---

## Contact & Support

For additional help:
- **Supabase Support**: https://supabase.com/dashboard/support/new
- **Status Page**: https://status.supabase.com/
- **GitHub Discussions**: https://github.com/orgs/supabase/discussions

---

**Document Status**: Complete Exploration
**Action Required**: Review recommendations and determine if PITR add-on aligns with disaster recovery requirements
