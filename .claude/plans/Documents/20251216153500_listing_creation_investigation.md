# Listing Creation Investigation - Two Test Listings

**Date:** 2025-12-16
**Investigator:** Claude Code
**Status:** Critical Sync Issue Discovered

## Executive Summary

Investigation into two listings created via the self-listing flow has revealed a **critical sync issue**: The listings were successfully created in Bubble but **never synced to the Supabase database**. This prevents any analysis of the rental type, pricing fields, and availability data that should have been stored.

## Listings Under Investigation

1. **Listing 1:** `1765741563238x97726176939706896`
2. **Listing 2:** `1765740212180x79632006663058480`

## Key Findings

### 1. Database Sync Failure

**Query Executed:**
```sql
SELECT * FROM listing WHERE bubble_id IN ('1765741563238x97726176939706896', '1765740212180x79632006663058480');
```

**Result:** `[]` (Empty array - no listings found)

**Database Status:**
- Total listings in Supabase: 291
- Listings with bubble_id: 278
- Missing listings with bubble_id: 13 (including the two under investigation)

### 2. Implications

Since these listings don't exist in Supabase, we **cannot verify**:
- What value was stored in `rental type` field
- Whether `💰Weekly Host Rate` and `💰Monthly Host Rate` fields were populated
- Whether `available_days` vs `available_nights` arrays were used
- Any other pricing or availability fields

### 3. Root Cause Analysis Needed

This sync failure indicates one of the following scenarios:

#### Scenario A: Edge Function Never Called Bubble Sync
The `listing` edge function's `createListing` handler may not be triggering the bubble_sync webhook after creating the listing in Bubble.

**Relevant Code Location:**
- `c:\Users\Split Lease\My Drive\!Agent Context and Tools\SL16\Split Lease\supabase\functions\listing\handlers\createListing.ts`

#### Scenario B: Bubble Sync Webhook Not Configured
The Bubble backend workflow that syncs data to Supabase after listing creation may not be firing or may be failing silently.

#### Scenario C: Timing Issue
There may be a race condition where the sync happens asynchronously but hasn't completed yet (unlikely if these listings were created days/weeks ago).

### 4. Edge Function Logs

Examined the last 24 hours of edge function logs:
- Multiple `auth-user` calls (200 status)
- Several `bubble_sync` calls (200 status)
- No obvious error patterns
- **Missing:** Specific `listing` edge function calls for these two bubble_ids

## Required Next Steps

### Immediate Actions

1. **Query Bubble API Directly**
   - Use the Bubble Data API to fetch the full listing objects for both bubble_ids
   - Document the actual values for `rental type`, pricing fields, and availability arrays
   - This will answer the original question about what data was stored

2. **Verify Sync Architecture**
   - Review `createListing.ts` to confirm it triggers Bubble sync
   - Check Bubble backend workflows for the sync webhook configuration
   - Verify the `bubble_sync` edge function is receiving listing creation events

3. **Test Listing Creation Flow**
   - Create a new test listing via the self-listing flow
   - Monitor edge function logs in real-time
   - Verify the listing appears in Supabase within expected timeframe

### Medium-Term Fixes

1. **Add Sync Verification**
   - Implement a check in `createListing` handler to verify the listing was synced
   - Add retry logic if sync fails
   - Return sync status to the frontend

2. **Implement Sync Status Tracking**
   - Add a `sync_status` field to track whether listings are synced
   - Create a background job to identify and re-sync orphaned listings

3. **Improve Observability**
   - Add structured logging to track listing creation → sync pipeline
   - Set up alerts for sync failures

## Technical Context

### Current Sync Flow (Expected)

```
User submits listing
    ↓
Edge Function: listing (createListing)
    ↓
Bubble API: Create listing record
    ↓
Returns bubble_id (e.g., 1765741563238x97726176939706896)
    ↓
[MISSING STEP?] Trigger Bubble → Supabase sync
    ↓
Listing appears in Supabase with bubble_id
```

### Database Schema Reference

**Table:** `listing` (public schema)

**Key Fields for Investigation:**
- `bubble_id` (text, unique) - Bubble's unique identifier
- `rental type` (text) - Should be "Nightly", "Weekly", or "Monthly"
- `💰Weekly Host Rate` (numeric, nullable)
- `💰Monthly Host Rate` (integer, nullable)
- `Days Available (List of Days)` (jsonb) - Array of days (JS 0-6)
- `Nights Available (List of Nights)` (jsonb) - Array of nights
- `💰Nightly Host Rate for X nights` - Multiple fields for different durations

## Related Files

### Edge Functions
- `c:\Users\Split Lease\My Drive\!Agent Context and Tools\SL16\Split Lease\supabase\functions\listing\index.ts`
- `c:\Users\Split Lease\My Drive\!Agent Context and Tools\SL16\Split Lease\supabase\functions\listing\handlers\createListing.ts`
- `c:\Users\Split Lease\My Drive\!Agent Context and Tools\SL16\Split Lease\supabase\functions\bubble_sync\index.ts`

### Frontend
- `c:\Users\Split Lease\My Drive\!Agent Context and Tools\SL16\Split Lease\app\src\islands\pages\SelfListingPage.jsx`
- Self-listing logic hooks (to be identified)

### Bubble API Integration
- `c:\Users\Split Lease\My Drive\!Agent Context and Tools\SL16\Split Lease\supabase\functions\_shared\integrations\bubble\`

## Questions Requiring Investigation

1. **Original Question (Unanswered):** What rental type were these listings saved as, and what fields were populated?
   - **Answer:** Requires querying Bubble API directly since Supabase has no data

2. **New Critical Question:** Why aren't newly created listings syncing to Supabase?
   - Impacts all new listings, not just these two
   - May affect production users creating listings

3. **Data Integrity Question:** How many other listings are missing from Supabase?
   - 13 listings lack bubble_ids - are they orphaned or just very old?

## Recommendations

**Priority 1 (Immediate):**
- Query Bubble API to answer the original question
- Verify the sync issue is real (not just a timing problem)

**Priority 2 (This Week):**
- Fix the sync issue if confirmed
- Backfill the missing 13 listings
- Add monitoring for future sync failures

**Priority 3 (This Sprint):**
- Implement robust sync verification and retry logic
- Add comprehensive logging for the listing creation pipeline

---

**Investigation Status:** Blocked pending Bubble API access to retrieve full listing data.

**Next Action:** Query Bubble Data API for the two listings to determine actual field values.
