# Debug Analysis: Double-Encoded JSON in thread.Participants Column

**Created**: 2025-12-16 23:55:00
**Status**: Analysis Complete - Pending Implementation
**Severity**: Medium
**Affected Area**: Database - public.thread table, Messaging system

## 1. System Context (From Onboarding)

### 1.1 Architecture Understanding
- **Architecture Pattern**: Islands Architecture with Supabase Edge Functions backend
- **Tech Stack**: React 18 + Vite frontend, Supabase PostgreSQL, Edge Functions (Deno)
- **Data Flow**: Frontend -> Edge Functions -> Supabase PostgreSQL (with some Bubble.io legacy sync)

### 1.2 Domain Context
- **Feature Purpose**: The `thread` table stores messaging conversation threads between hosts and guests
- **Related Documentation**:
  - `supabase/CLAUDE.md` - Edge Functions reference
  - `.claude/Documentation/Database/DATABASE_RELATIONS.md` - Thread relationships
  - `.claude/plans/Documents/20251216220000_JSONB_FIELD_USAGE_ANALYSIS.md` - Field usage analysis
- **Data Model**:
  - `public.thread` - Conversation threads
  - `public._message` - Individual messages in threads
  - `junctions.thread_participant` - Junction table (already populated correctly)
  - `junctions.user_thread` - User-thread relationships

### 1.3 Relevant Conventions
- **Key Patterns**:
  - JSONB fields store arrays but often come from Bubble.io as stringified JSON
  - Junction tables exist as normalized alternatives to JSONB arrays
  - `parseJsonArray()` utility handles double-encoded JSONB in frontend
- **Layer Boundaries**: Edge Functions handle data writes, frontend reads via Supabase client
- **Shared Utilities**: `supabase/functions/_shared/messagingHelpers.ts` handles thread creation

### 1.4 Entry Points & Dependencies
- **Write Entry Point**: `supabase/functions/_shared/messagingHelpers.ts` line 125
- **Critical Path**: Thread creation via `createThread()` function
- **Dependencies**: Bubble.io data import (historical data source)

## 2. Problem Statement

The `Participants` column in `public.thread` table stores double-encoded JSON strings instead of native JSONB arrays.

**Current format** (WRONG):
```
"[\"1689183713781x221643516035888740\", \"1642603569264x277287068228452500\"]"
```
- `jsonb_typeof()` returns `'string'` - it's a string inside JSONB

**Expected format** (CORRECT):
```
["1689183713781x221643516035888740", "1642603569264x277287068228452500"]
```
- `jsonb_typeof()` should return `'array'` - a native JSONB array

## 3. Reproduction Context

- **Environment**: Production Supabase database
- **Affected Records**:
  - Total threads: 803
  - Double-encoded (string): 795 (99%)
  - Already correct (array): 0
  - NULL values: 8
- **Error messages/logs**: No runtime errors - the data is technically valid JSONB, just semantically wrong

## 4. Investigation Summary

### 4.1 Files Examined

| File | Relevance |
|------|-----------|
| `supabase/functions/_shared/messagingHelpers.ts` | **ROOT CAUSE** - Line 125 uses `JSON.stringify()` when inserting |
| `app/src/lib/supabaseUtils.js` | Contains `parseJsonArray()` workaround for reading double-encoded data |
| `.claude/plans/Documents/20251216220000_JSONB_FIELD_USAGE_ANALYSIS.md` | Confirms no active code reads `Participants` directly |
| `supabase/CLAUDE.md` | Architecture documentation |

### 4.2 Execution Flow Trace

**Thread Creation Flow:**
1. Frontend calls messaging Edge Function
2. Edge Function calls `createThread()` in `messagingHelpers.ts`
3. Line 125: `"Participants": JSON.stringify([params.hostUserId, params.guestUserId])`
4. Supabase receives a JSON string, stores it as a JSONB string value
5. Result: Double-encoded - a string representation stored inside JSONB

**Data Import Flow (Historical):**
1. Data originally in Bubble.io where arrays are stored as JSON strings
2. Migrated to Supabase via import/sync
3. String values preserved as-is in JSONB column

### 4.3 Git History Analysis

- Migration `20251216213210_fix_chat_threads_jsonb_double_encoding` exists in migration list
- However, no corresponding SQL file was found in the local migrations directory
- Current data shows the fix was NOT applied (795 records still double-encoded)
- This suggests the migration was either:
  - A no-op migration
  - Failed silently
  - Applied to a different environment

## 5. Hypotheses

### Hypothesis 1: JSON.stringify() in messagingHelpers.ts (Likelihood: 95%)

**Theory**: The `createThread()` function explicitly uses `JSON.stringify()` on line 125, which converts the JavaScript array to a JSON string before insertion. Supabase then stores this string inside the JSONB column.

**Supporting Evidence**:
- Line 125: `"Participants": JSON.stringify([params.hostUserId, params.guestUserId])`
- All 795 records have consistent double-encoding pattern
- This is a common mistake when inserting into JSONB columns

**Contradicting Evidence**:
- None - the code clearly shows the issue

**Verification Steps**:
1. Remove `JSON.stringify()` from line 125
2. Test thread creation
3. Verify new threads have native arrays

**Potential Fix**:
```typescript
// BEFORE (line 125):
"Participants": JSON.stringify([params.hostUserId, params.guestUserId]),

// AFTER:
"Participants": [params.hostUserId, params.guestUserId],
```

**Convention Check**: This aligns with Supabase conventions - JSONB columns accept native JavaScript objects/arrays directly.

### Hypothesis 2: Historical Bubble.io Import (Likelihood: 90% for existing data)

**Theory**: Data was imported from Bubble.io where arrays are stored as JSON strings. During migration, the string values were preserved rather than parsed.

**Supporting Evidence**:
- User IDs in Participants follow Bubble ID format (`1689183713781x221643516035888740`)
- `.claude/plans/Documents/20251216220000_JSONB_FIELD_USAGE_ANALYSIS.md` confirms Bubble origin
- Junction table `thread_participant` was created to normalize this data

**Contradicting Evidence**:
- None - this explains the historical data

**Verification Steps**:
1. Compare thread creation dates with Bubble sync timestamps
2. Check if any threads created after migration still have double-encoding

**Potential Fix**: Data migration to unwrap existing double-encoded values.

### Hypothesis 3: Previous Migration Failed/Incomplete (Likelihood: 70%)

**Theory**: Migration `20251216213210_fix_chat_threads_jsonb_double_encoding` was intended to fix this but didn't work.

**Supporting Evidence**:
- Migration exists in the list but no SQL file found locally
- Data still shows 795 double-encoded records
- Naming suggests it was meant to fix this exact issue

**Contradicting Evidence**:
- Migration might be in remote only
- Could have been applied to different environment

**Verification Steps**:
1. Check Supabase dashboard for migration content
2. Review migration logs

**Potential Fix**: Create new migration with correct SQL.

## 6. Recommended Action Plan

### Priority 1: Fix the Data (Data Migration)

Create and apply a Supabase migration to convert all double-encoded values to native arrays:

```sql
-- Migration: fix_thread_participants_double_encoding_v2
-- Purpose: Convert double-encoded JSON strings to native JSONB arrays

-- Step 1: Update double-encoded Participants to native arrays
UPDATE public.thread
SET "Participants" = ("Participants" #>> '{}')::jsonb
WHERE "Participants" IS NOT NULL
  AND jsonb_typeof("Participants") = 'string'
  AND ("Participants" #>> '{}') IS NOT NULL;

-- Step 2: Verify the fix
-- Expected: 0 rows with jsonb_typeof = 'string'
-- SELECT COUNT(*) FROM public.thread WHERE jsonb_typeof("Participants") = 'string';
```

**Explanation of the SQL:**
- `"Participants" #>> '{}'` extracts the string content from the JSONB (unwraps the outer quotes)
- `::jsonb` casts the unwrapped JSON string back to native JSONB
- The WHERE clause ensures we only update double-encoded records

### Priority 2: Fix the Source Code (Prevent Future Issues)

Update `supabase/functions/_shared/messagingHelpers.ts` line 125:

```typescript
// CURRENT (line 125):
"Participants": JSON.stringify([params.hostUserId, params.guestUserId]),

// FIX:
"Participants": [params.hostUserId, params.guestUserId],
```

**Note**: After fixing the Edge Function, it will require manual deployment:
```bash
supabase functions deploy messages
```

### Priority 3: Verification Steps

After applying fixes:

```sql
-- Verify no double-encoded records remain
SELECT
    COUNT(*) FILTER (WHERE jsonb_typeof("Participants") = 'string') as still_double_encoded,
    COUNT(*) FILTER (WHERE jsonb_typeof("Participants") = 'array') as correctly_formatted,
    COUNT(*) FILTER (WHERE "Participants" IS NULL) as null_values
FROM public.thread;

-- Expected: still_double_encoded = 0, correctly_formatted = 795
```

## 7. Prevention Recommendations

### 7.1 Code Review Checklist
- When inserting into JSONB columns, NEVER use `JSON.stringify()` on the value
- Supabase client handles JavaScript objects/arrays natively
- Add ESLint rule or code review check for `JSON.stringify` near JSONB column names

### 7.2 Documentation Update
Add to `supabase/CLAUDE.md`:
```markdown
### JSONB Column Insertion
[CRITICAL]: Never use JSON.stringify() when inserting into JSONB columns
[CORRECT]: Insert JavaScript arrays/objects directly: `{ "Participants": [userId1, userId2] }`
[WRONG]: `{ "Participants": JSON.stringify([userId1, userId2]) }` - causes double-encoding
```

### 7.3 Consider Using Junction Tables
The `junctions.thread_participant` table already exists with correct data (1566 rows).
Consider deprecating the `Participants` JSONB column in favor of the junction table for:
- Better query performance
- Referential integrity
- Easier maintenance

## 8. Related Files Reference

| File | Line Numbers | Purpose |
|------|--------------|---------|
| `c:\Users\Split Lease\Documents\Split Lease\supabase\functions\_shared\messagingHelpers.ts` | 125 | **ROOT CAUSE** - JSON.stringify usage |
| `c:\Users\Split Lease\Documents\Split Lease\app\src\lib\supabaseUtils.js` | 25-48 | `parseJsonArray()` workaround function |
| `c:\Users\Split Lease\Documents\Split Lease\supabase\CLAUDE.md` | Full file | Architecture documentation |
| `c:\Users\Split Lease\Documents\Split Lease\.claude\plans\Documents\20251216220000_JSONB_FIELD_USAGE_ANALYSIS.md` | 427-469 | Confirms Participants field has no active code |

## 9. Migration SQL (Ready to Execute)

```sql
-- ================================================
-- Migration: fix_thread_participants_double_encoding_v2
-- ================================================
-- Purpose: Convert double-encoded JSON strings in thread.Participants
--          to native JSONB arrays
--
-- Problem: Values are stored as: "[\"id1\", \"id2\"]" (string inside JSONB)
-- Solution: Convert to native arrays: ["id1", "id2"] (JSONB array)
--
-- Safety:
--   - Only updates records where jsonb_typeof = 'string'
--   - Preserves NULL values
--   - Preserves already-correct arrays (none exist currently)
-- ================================================

-- Update double-encoded Participants to native JSONB arrays
UPDATE public.thread
SET "Participants" = ("Participants" #>> '{}')::jsonb
WHERE "Participants" IS NOT NULL
  AND jsonb_typeof("Participants") = 'string'
  AND ("Participants" #>> '{}') IS NOT NULL;

-- Verification query (run separately after migration):
-- SELECT
--     COUNT(*) FILTER (WHERE jsonb_typeof("Participants") = 'string') as still_double_encoded,
--     COUNT(*) FILTER (WHERE jsonb_typeof("Participants") = 'array') as correctly_formatted
-- FROM public.thread
-- WHERE "Participants" IS NOT NULL;
```

## 10. Summary

| Aspect | Details |
|--------|---------|
| **Root Cause** | `JSON.stringify()` used on line 125 of `messagingHelpers.ts` + historical Bubble.io import |
| **Affected Records** | 795 out of 803 threads (99%) |
| **Fix Required** | 1) Data migration to unwrap existing records 2) Code fix to prevent new issues |
| **Risk Level** | Low - straightforward SQL transformation with clear verification |
| **Junction Table** | `junctions.thread_participant` exists with correct data as backup/alternative |

---

**Next Steps for Implementation:**
1. Apply the data migration using Supabase MCP `apply_migration` tool
2. Update `messagingHelpers.ts` line 125 to remove `JSON.stringify()`
3. Deploy the Edge Function: `supabase functions deploy messages`
4. Run verification query to confirm fix
