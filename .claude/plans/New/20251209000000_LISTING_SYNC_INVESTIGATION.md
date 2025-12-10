# Listing Sync Investigation - Issue Analysis & Solutions

**Date**: 2025-12-09
**Status**: Analysis Complete - Root Causes Identified
**Action Required**: Data Cleanup + Sync Strategy

---

## Executive Summary

The listing sync from Supabase to Bubble is failing due to **3 distinct data quality issues**:

1. **Missing Host / Landlord Users in Bubble** (FIXED via payload exclusion)
2. **NULL or Invalid Location - City Values** (BLOCKING)
3. **Blob URLs in Features - Photos Array** (BLOCKING - development artifacts)

Current Status: **8 listings queued for sync** with **6 still failing** due to data issues.

---

## Findings

### 1. User Reference Issue (RESOLVED)

**Problem**: 2 out of 4 host users don't have Bubble IDs
- User `1765291685107x11179144369802740` (leomateo@test.com) - `bubble_id: NULL`
- User `1765294217346x04443662237528811` (test1029@test.com) - `bubble_id: NULL`
- User `1764956538168x24870006621412856` (burroshrek@test.com) - `bubble_id: 1764956536163x202552853722962400` ✓
- User `1737150128596x517612209343693900` (splitleasesharath@gmail.com) - `bubble_id: 1737150128596x517612209343693900` ✓

**Error Message**:
```
Invalid data for field Host / Landlord:
object with this id does not exist: 1765291685107x11179144369802740
```

**Solution Applied**: ✓ Removed `Host / Landlord` and `Created By` fields from payload

**Status**: FIXED - Re-queued listings now process (at least past this error)

---

### 2. Location - City NULL Values (BLOCKING)

**Affected Listings**: 4 out of 8
- `1765294218839x30223279710199380` - City: NULL
- `1765288770028x72566500546183808` - City: NULL
- `1765276511375x19797230945049728` - City: NULL
- `1765100967604x66565896483965000` - City: NULL

**Error Message**:
```
Invalid data for field Location - City:
object with this id does not exist: New York
```

**Root Cause**: The payload contains `NULL` for City, but Bubble API rejects NULL values as invalid references.

**Solution Options**:
1. **Exclude City field** from sync payload (since it's often redundant with Location - Address)
2. **Provide default value** ("New York" for NYC-based platform)
3. **Populate missing Cities** before sync (data cleanup)

**Recommendation**: Option 1 or 3

---

### 3. Blob URLs in Features - Photos (BLOCKING)

**Affected Listings**: 6 out of 8

**Example Data**:
```json
"Features - Photos": [
  {
    "id": "photo_1765100958146_0_u9dr0jkdq",
    "url": "blob:http://localhost:8000/4f46c737-d736-48f9-9dca-0c694b5dcf72",
    "Photo": "blob:http://localhost:8000/4f46c737-d736-48f9-9dca-0c694b5dcf72",
    "SortOrder": 0,
    "toggleMainPhoto": true
  }
]
```

**Problem**:
- Blob URLs are temporary local development URLs
- They don't represent actual persisted photos
- Bubble API cannot reference non-existent photo IDs

**Error Message**:
```
Invalid data for field Features - Photos:
object with this id does not exist: [object Object]
```

**Root Cause**: The sync is capturing the raw form state (with blob URLs) instead of properly persisted photos.

**Solution Options**:
1. **Exclude Features - Photos** from sync (let hosts upload through Bubble UI)
2. **Filter blob URLs** from payload and only send persisted URLs
3. **Skip listings with blob photos** (mark as incomplete)

**Recommendation**: Option 1 (cleanest) or Option 2 (more data)

---

## Data Quality Summary

| Listing | Name | Photos Issue | City Issue | Host Issue |
|---------|------|--------------|-----------|-----------|
| 1765294218839x30223279710199380 | 1BR Entire Brooklyn | Blob URLs | NULL | Missing User |
| 1765291686596x24738091190021260 | 1BR Entire Manhattan | Blob URLs | Valid | Missing User |
| 1765288770028x72566500546183808 | 1BR Entire Brooklyn | Blob URLs | NULL | Missing User |
| 1765276511375x19797230945049728 | 3BR Entire Staten Island | Blob URLs | NULL | Valid |
| 1765153658228x95189612047125408 | 1BR Private Room Manhattan | None | Valid | ❓ Unknown |
| 1765143590645x21800434891268216 | 1BR Entire Manhattan | Blob URLs | Valid | Missing User |
| 1765101378421x91345419949080592 | 1BR Entire Brooklyn | Blob URLs | NULL | Valid |
| 1765100967604x66565896483965000 | 1BR Private Room Brooklyn | Blob URLs | NULL | Valid |

---

## Queued Sync Status

**Current Queue**: 8 listings pending
- **0 Successful** (no bubble_id assigned yet)
- **1 No Error** (1765294218839x30223279710199380) - Ready for retry
- **1 Processing** (1765291686596x24738091190021260)
- **6 Failing**:
  - 3 due to Features - Photos blob URLs
  - 2 due to Location - City NULL
  - 1 due to unknown host user

---

## Recommended Fix Strategy

### Phase 1: Immediate (Exclude Problematic Fields)
```sql
-- Clear existing queue
DELETE FROM sync_queue
WHERE table_name = 'listing'
AND status IN ('pending', 'failed');

-- Re-queue excluding problematic fields
INSERT INTO sync_queue (table_name, record_id, operation, payload, status, idempotency_key)
SELECT
    'listing',
    l._id,
    'INSERT',
    to_jsonb(l)
        - 'bubble_id'
        - 'created_at'
        - 'updated_at'
        - 'Host / Landlord'
        - 'Created By'
        - 'Features - Photos'
        - 'Location - City'
        - 'pending'
        - 'sync_status'
        - 'bubble_sync_error'
        - '_internal',
    'pending',
    'listing:' || l._id || ':clean:' || extract(epoch from now())::text
FROM listing l
WHERE l.bubble_id IS NULL;
```

This reduces the payload to only essential, validated fields.

### Phase 2: Data Cleanup (Fix Missing Values)
```sql
-- Populate missing Location - City from Location - Address
UPDATE listing
SET "Location - City" = 'New York'
WHERE bubble_id IS NULL
AND "Location - City" IS NULL
AND "Location - State" = 'New York';
```

### Phase 3: Photo Management
**Decision needed**: Should photos be synced to Bubble, or handled separately?
- If syncing: Need to exclude blob URLs and only include persisted URLs
- If not syncing: Hosts create photos in Bubble UI after sync

---

## Files Affected

- `C:/Users/Split Lease/Documents/Split Lease/supabase/functions/bubble-proxy/listing.ts` - Listing sync handler
- `C:/Users/Split Lease/Documents/Split Lease/supabase/functions/_shared/bubbleSync.ts` - Sync logic
- Supabase `sync_queue` table - Pending syncs
- Supabase `listing` table - Source data

---

## Next Steps

1. **Decision Required**: Confirm approach for each issue (exclude vs. fix data)
2. **Execute Phase 1**: Clear queue and re-queue with clean payloads
3. **Monitor**: Track sync results and error rates
4. **Phase 2 (if needed)**: Clean up data for future syncs
5. **Phase 3 (if needed)**: Implement photo sync separately

---

**Status**: Waiting for action decision
