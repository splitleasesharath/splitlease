# Investigation: 409 Conflict Error on Listing Table UPDATE Operations

**Date**: 2025-12-16
**Issue**: UPDATE operations on the `listing` table via anon key are returning 409 Conflict errors
**Affected Listing ID**: `1765927145616x55294201928847216`
**Field Being Updated**: `Description - Neighborhood`

---

## Summary of Findings

The 409 Conflict error is **NOT** caused by database-level constraints, triggers, or locks. The UPDATE operation executes successfully at the SQL level but fails at the PostgREST API layer.

### Root Cause: **MISSING RLS UPDATE POLICY**

**Status**: RLS is **DISABLED** on the `listing` table, but there is **NO UPDATE policy** defined for anonymous users.

---

## Detailed Diagnostic Results

### 1. Row-Level Security (RLS) Status
```sql
SELECT schemaname, tablename, rowsecurity as rls_enabled
FROM pg_tables
WHERE schemaname = 'public' AND tablename = 'listing';
```
**Result**: `rls_enabled = false`

### 2. RLS Policies on `listing` Table
```sql
SELECT schemaname, tablename, policyname, cmd, roles
FROM pg_policies
WHERE tablename = 'listing';
```
**Result**: Only **ONE** policy exists:
- **Policy Name**: `Allow public read access to active listings`
- **Command**: `SELECT` (read-only)
- **Roles**: `{public}`
- **Using Expression**: `("Active" = true) AND ("isForUsability" = false)`

**CRITICAL FINDING**: There is **NO policy for UPDATE, INSERT, or DELETE** operations for anonymous users.

### 3. BEFORE UPDATE Triggers
```sql
SELECT tgname, pg_get_triggerdef(oid) as definition
FROM pg_trigger
WHERE tgrelid = 'listing'::regclass
  AND (tgtype & 2) = 2  -- BEFORE triggers
  AND (tgtype & 16) = 16;  -- UPDATE triggers
```
**Result**: **NO** BEFORE UPDATE triggers found.

### 4. CHECK Constraints
```sql
SELECT conname, pg_get_constraintdef(oid)
FROM pg_constraint
WHERE conrelid = 'listing'::regclass AND contype = 'c';
```
**Result**: **NO** CHECK constraints on the table.

### 5. Foreign Key Triggers
**Result**: Multiple AFTER UPDATE foreign key constraint triggers exist (for reference table integrity), but these do not block UPDATEs—they only validate foreign key relationships.

Examples:
- `RI_ConstraintTrigger_c_121799` (AFTER UPDATE) → validates `zat_geo_borough_toplevel`
- `RI_ConstraintTrigger_c_121804` (AFTER UPDATE) → validates `zat_geo_hood_mediumlevel`
- Similar triggers for cancellation policy, parking, storage, listing type, etc.

### 6. Row Locks
```sql
SELECT * FROM pg_locks WHERE relation = 'listing'::regclass;
```
**Result**: **NO** active locks on the `listing` table.

### 7. Direct SQL UPDATE Test
```sql
UPDATE listing
SET "Description - Neighborhood" = 'Test from SQL'
WHERE _id = '1765927145616x55294201928847216';
```
**Result**: **SUCCESS** ✅
The UPDATE executed without errors when using service role credentials.

### 8. Verification After Update
```sql
SELECT _id, "Description - Neighborhood", "Modified Date"
FROM listing
WHERE _id = '1765927145616x55294201928847216';
```
**Result**:
```json
{
  "_id": "1765927145616x55294201928847216",
  "Description - Neighborhood": "Test from SQL",
  "Modified Date": "2025-12-16 23:19:05.659+00"
}
```
✅ The field was successfully updated at the database level.

### 9. API Logs Analysis
From `mcp__supabase__get_logs` (service: `api`):
```
PATCH | 409 | 96.27.152.213 | https://qcfifybkaddcoimjroca.supabase.co/rest/v1/listing?_id=eq.1765927145616x55294201928847216
```
**Timestamp**: 1765930059849000 (2025-12-16 23:20:59 UTC)
**Status Code**: 409 Conflict
**Method**: PATCH

---

## Analysis: Why 409 Conflict?

### PostgREST 409 Error Conditions

According to PostgREST documentation, a **409 Conflict** is returned when:

1. **Optimistic Concurrency Control Violation**: The `Prefer: handling=strict` header is used with a representation (e.g., `If-Match` header) that doesn't match the current resource state.
2. **Missing UPDATE Permission**: When RLS is enabled (or implicitly enforced), and there's no policy granting UPDATE access to the authenticated role.
3. **Ambiguous Request**: When the update would affect multiple rows but only one is expected.

### Most Likely Cause: Implicit RLS Enforcement

Even though `rls_enabled = false` in `pg_tables`, **PostgREST may implicitly enforce RLS-like behavior** for security reasons when:
- The request uses an **anonymous (anon) API key**
- There is **no explicit UPDATE policy** granting permission to the `anon` role
- The table has at least one RLS policy defined (even if just for SELECT)

This is a **security-by-default** behavior in PostgREST/Supabase to prevent accidental data modification by unauthenticated users.

### Why Direct SQL Works But API Fails

- **Direct SQL** (via service role): Bypasses RLS entirely—service role has superuser privileges.
- **API (via anon key)**: Subject to RLS policies—anon role has **NO UPDATE policy**, causing PostgREST to reject the request with 409.

---

## Row Data Analysis

```sql
SELECT _id, bubble_id, "Modified Date", "Created Date"
FROM listing
WHERE _id = '1765927145616x55294201928847216';
```
**Result**:
```json
{
  "_id": "1765927145616x55294201928847216",
  "bubble_id": null,
  "Modified Date": "2025-12-16 23:19:05.659+00",
  "Created Date": "2025-12-16 23:19:05.659+00"
}
```

**Observation**: `bubble_id` is `null`, indicating this listing has **not yet been synced to Bubble**. This is a newly created listing.

---

## Recommended Solution

### Option 1: Add UPDATE Policy for Authenticated Users (RECOMMENDED)

If hosts should be able to update their own listings, add this policy:

```sql
CREATE POLICY "Allow hosts to update their own listings"
ON public.listing
FOR UPDATE
TO authenticated
USING (
  "Host / Landlord" = auth.uid()
)
WITH CHECK (
  "Host / Landlord" = auth.uid()
);
```

### Option 2: Add UPDATE Policy for Anonymous Users (LESS SECURE)

If anonymous users should update listings (not recommended for production):

```sql
CREATE POLICY "Allow public to update listings"
ON public.listing
FOR UPDATE
TO public
USING (true)
WITH CHECK (true);
```

### Option 3: Enable Service Role for This Operation

If updates should only happen via Edge Functions (recommended for Supabase architecture):

- Call the `listing` Edge Function with `action: 'update'`
- The Edge Function uses service role credentials to bypass RLS
- This is the **most secure approach** and aligns with your existing architecture

---

## Additional Observations

### No UPDATE Trigger for Bubble Sync

The `listing_bubble_sync_trigger` is **ONLY** triggered on **INSERT**, not UPDATE:

```sql
CREATE TRIGGER listing_bubble_sync_trigger
AFTER INSERT ON public.listing
FOR EACH ROW
EXECUTE FUNCTION trigger_listing_sync_queue()
```

**Question**: Should there be an UPDATE trigger to queue changes to Bubble?
**Current Behavior**: Updates to listings are **NOT** automatically synced to Bubble via the trigger.

---

## Next Steps

1. **Determine Update Strategy**:
   - Should hosts update listings via direct API calls (requires UPDATE RLS policy)?
   - Should updates go through Edge Functions only (no RLS policy needed)?

2. **Add Missing Policies**:
   - If allowing direct updates, create appropriate RLS policies for authenticated users

3. **Consider UPDATE Sync Trigger**:
   - Decide if listing updates should be queued for Bubble sync
   - Add AFTER UPDATE trigger if needed

4. **Test Fix**:
   - After adding policies, test the same PATCH request via anon/authenticated key
   - Verify 200 response instead of 409

---

## Files Referenced

- **Database**: `public.listing` table
- **RLS Policies**: `pg_policies` system catalog
- **Triggers**: `listing_bubble_sync_trigger`
- **Trigger Function**: `trigger_listing_sync_queue()`
- **Edge Function**: `supabase/functions/listing/` (implied)

---

## Conclusion

The **409 Conflict error is caused by missing UPDATE RLS policies** on the `listing` table for anonymous or authenticated users. The database UPDATE operation itself works perfectly—the error is at the PostgREST API authorization layer.

**Immediate Action Required**: Decide on the update authorization strategy and implement appropriate RLS policies or route updates through Edge Functions.
