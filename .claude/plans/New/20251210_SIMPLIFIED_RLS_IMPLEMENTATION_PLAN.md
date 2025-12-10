# Simplified RLS Implementation Plan (Email-Based)

**GENERATED**: 2025-12-10
**STATUS**: Ready for Implementation
**OBJECTIVE**: Implement "current user's thing" RLS using denormalized email fields

---

## Executive Summary

This simplified plan leverages the **denormalized email fields** already present in Bubble-migrated tables to implement Row Level Security without complex joins or helper functions.

### Key Simplifications

| Previous Approach | Simplified Approach |
|-------------------|---------------------|
| Helper function `current_user_id()` | Direct `auth.jwt()->>'email'` |
| Join through `account_host` for host access | Use denormalized `host email` field |
| Multiple identity resolution strategies | Single email-based strategy |
| 6-week phased rollout | 2-week implementation |

### Why Email-Based RLS Works

1. **Emails are unique** - enforced at auth level
2. **Emails are already denormalized** on key tables:
   - `proposal."Guest email"` and `proposal."host email"`
   - `listing."Host email"`
   - `user.email`
3. **No joins required** - direct column comparison
4. **Works for both Bubble-synced and native users**

---

## 1. Core RLS Pattern

### The Single Helper Function (Optional but Recommended)

```sql
-- For tables that only have user._id (not email), we need one helper
CREATE OR REPLACE FUNCTION public.current_user_bubble_id()
RETURNS TEXT
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT _id
  FROM public.user
  WHERE LOWER(email) = LOWER(auth.jwt()->>'email')
  LIMIT 1;
$$;

GRANT EXECUTE ON FUNCTION public.current_user_bubble_id() TO authenticated;
```

### Email Extraction

```sql
-- Get current user's email from JWT
auth.jwt()->>'email'

-- Case-insensitive comparison (recommended)
LOWER(column_name) = LOWER(auth.jwt()->>'email')
```

---

## 2. Table-by-Table RLS Implementation

### 2.1 `public.user` Table

Users can only see/edit their own profile.

```sql
-- Enable RLS
ALTER TABLE public.user ENABLE ROW LEVEL SECURITY;

-- User can see their own profile
CREATE POLICY "user_select_own"
ON public.user
FOR SELECT
TO authenticated
USING (LOWER(email) = LOWER(auth.jwt()->>'email'));

-- User can update their own profile
CREATE POLICY "user_update_own"
ON public.user
FOR UPDATE
TO authenticated
USING (LOWER(email) = LOWER(auth.jwt()->>'email'))
WITH CHECK (LOWER(email) = LOWER(auth.jwt()->>'email'));

-- Service role bypasses RLS (for Edge Functions)
CREATE POLICY "user_service_role"
ON public.user
FOR ALL
TO service_role
USING (true)
WITH CHECK (true);
```

---

### 2.2 `public.proposal` Table

Guests see proposals they created; Hosts see proposals for their listings.

```sql
-- Fix: Drop existing broken policies first
DROP POLICY IF EXISTS "Allow anonymous proposal inserts for testing" ON public.proposal;
DROP POLICY IF EXISTS "Allow anonymous to view proposals for testing" ON public.proposal;
DROP POLICY IF EXISTS "Allow authenticated users to insert proposals" ON public.proposal;
DROP POLICY IF EXISTS "Users can view own proposals" ON public.proposal;

-- RLS is already enabled on proposal

-- Guest: View own proposals
CREATE POLICY "proposal_select_guest"
ON public.proposal
FOR SELECT
TO authenticated
USING (LOWER("Guest email") = LOWER(auth.jwt()->>'email'));

-- Guest: Create proposals (must be their email)
CREATE POLICY "proposal_insert_guest"
ON public.proposal
FOR INSERT
TO authenticated
WITH CHECK (LOWER("Guest email") = LOWER(auth.jwt()->>'email'));

-- Guest: Update own proposals
CREATE POLICY "proposal_update_guest"
ON public.proposal
FOR UPDATE
TO authenticated
USING (LOWER("Guest email") = LOWER(auth.jwt()->>'email'))
WITH CHECK (LOWER("Guest email") = LOWER(auth.jwt()->>'email'));

-- Host: View proposals for their listings
CREATE POLICY "proposal_select_host"
ON public.proposal
FOR SELECT
TO authenticated
USING (LOWER("host email") = LOWER(auth.jwt()->>'email'));

-- Host: Update proposals (accept/reject/counter)
CREATE POLICY "proposal_update_host"
ON public.proposal
FOR UPDATE
TO authenticated
USING (LOWER("host email") = LOWER(auth.jwt()->>'email'))
WITH CHECK (LOWER("host email") = LOWER(auth.jwt()->>'email'));

-- Service role bypass
CREATE POLICY "proposal_service_role"
ON public.proposal
FOR ALL
TO service_role
USING (true)
WITH CHECK (true);

-- Anonymous can create proposals (pre-signup flow)
CREATE POLICY "proposal_insert_anon"
ON public.proposal
FOR INSERT
TO anon
WITH CHECK (true);
```

---

### 2.3 `public.listing` Table

Public can view active listings; Hosts can manage their own.

```sql
-- Enable RLS (has policy but RLS not enabled!)
ALTER TABLE public.listing ENABLE ROW LEVEL SECURITY;

-- Keep existing public read policy (or recreate if needed)
-- "Allow public read access to active listings"

-- Host: Full access to own listings
CREATE POLICY "listing_all_host"
ON public.listing
FOR ALL
TO authenticated
USING (LOWER("Host email") = LOWER(auth.jwt()->>'email'))
WITH CHECK (LOWER("Host email") = LOWER(auth.jwt()->>'email'));

-- Service role bypass
CREATE POLICY "listing_service_role"
ON public.listing
FOR ALL
TO service_role
USING (true)
WITH CHECK (true);
```

---

### 2.4 `public.listing_photo` Table

Public can view photos of active listings; Hosts can manage photos.

```sql
-- Enable RLS
ALTER TABLE public.listing_photo ENABLE ROW LEVEL SECURITY;

-- Public: View photos of active listings
CREATE POLICY "listing_photo_select_public"
ON public.listing_photo
FOR SELECT
TO public
USING (
  EXISTS (
    SELECT 1 FROM public.listing l
    WHERE l._id = listing_photo."Listing"
    AND l."Active" = true
  )
);

-- Host: Manage photos for own listings
CREATE POLICY "listing_photo_all_host"
ON public.listing_photo
FOR ALL
TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM public.listing l
    WHERE l._id = listing_photo."Listing"
    AND LOWER(l."Host email") = LOWER(auth.jwt()->>'email')
  )
)
WITH CHECK (
  EXISTS (
    SELECT 1 FROM public.listing l
    WHERE l._id = listing_photo."Listing"
    AND LOWER(l."Host email") = LOWER(auth.jwt()->>'email')
  )
);

-- Service role bypass
CREATE POLICY "listing_photo_service_role"
ON public.listing_photo
FOR ALL
TO service_role
USING (true)
WITH CHECK (true);
```

---

### 2.5 `public.bookings_leases` Table

Guests and Hosts can view their own leases.

```sql
-- Enable RLS
ALTER TABLE public.bookings_leases ENABLE ROW LEVEL SECURITY;

-- Guest: View own leases
CREATE POLICY "bookings_leases_select_guest"
ON public.bookings_leases
FOR SELECT
TO authenticated
USING (LOWER("Guest Email") = LOWER(auth.jwt()->>'email'));

-- Host: View leases for their properties
CREATE POLICY "bookings_leases_select_host"
ON public.bookings_leases
FOR SELECT
TO authenticated
USING (LOWER("Host Email") = LOWER(auth.jwt()->>'email'));

-- Service role bypass
CREATE POLICY "bookings_leases_service_role"
ON public.bookings_leases
FOR ALL
TO service_role
USING (true)
WITH CHECK (true);
```

---

### 2.6 `public.bookings_stays` Table

```sql
-- Enable RLS
ALTER TABLE public.bookings_stays ENABLE ROW LEVEL SECURITY;

-- Guest: View own stays
CREATE POLICY "bookings_stays_select_guest"
ON public.bookings_stays
FOR SELECT
TO authenticated
USING (LOWER("Guest Email") = LOWER(auth.jwt()->>'email'));

-- Host: View stays at their properties
CREATE POLICY "bookings_stays_select_host"
ON public.bookings_stays
FOR SELECT
TO authenticated
USING (LOWER("Host Email") = LOWER(auth.jwt()->>'email'));

-- Service role bypass
CREATE POLICY "bookings_stays_service_role"
ON public.bookings_stays
FOR ALL
TO service_role
USING (true)
WITH CHECK (true);
```

---

### 2.7 `public._message` Table

Users can view messages they sent or received.

```sql
-- Enable RLS
ALTER TABLE public._message ENABLE ROW LEVEL SECURITY;

-- View messages where user is participant (using user._id via helper)
CREATE POLICY "_message_select_participant"
ON public._message
FOR SELECT
TO authenticated
USING (
  "-Guest User" = public.current_user_bubble_id() OR
  "-Host User" = public.current_user_bubble_id() OR
  "-Originator User" = public.current_user_bubble_id()
);

-- Send messages (user must be originator)
CREATE POLICY "_message_insert_sender"
ON public._message
FOR INSERT
TO authenticated
WITH CHECK ("-Originator User" = public.current_user_bubble_id());

-- Service role bypass
CREATE POLICY "_message_service_role"
ON public._message
FOR ALL
TO service_role
USING (true)
WITH CHECK (true);
```

---

### 2.8 `public.favorite` Table

Users can manage their own favorites.

```sql
-- Enable RLS
ALTER TABLE public.favorite ENABLE ROW LEVEL SECURITY;

-- User: View own favorites
CREATE POLICY "favorite_select_own"
ON public.favorite
FOR SELECT
TO authenticated
USING ("User" = public.current_user_bubble_id());

-- User: Add favorites
CREATE POLICY "favorite_insert_own"
ON public.favorite
FOR INSERT
TO authenticated
WITH CHECK ("User" = public.current_user_bubble_id());

-- User: Remove favorites
CREATE POLICY "favorite_delete_own"
ON public.favorite
FOR DELETE
TO authenticated
USING ("User" = public.current_user_bubble_id());

-- Service role bypass
CREATE POLICY "favorite_service_role"
ON public.favorite
FOR ALL
TO service_role
USING (true)
WITH CHECK (true);
```

---

## 3. Complete Migration Script

```sql
-- ============================================================
-- SIMPLIFIED RLS MIGRATION
-- Run this in Supabase SQL Editor
-- ============================================================

-- ============================================================
-- STEP 1: Create Helper Function
-- ============================================================

CREATE OR REPLACE FUNCTION public.current_user_bubble_id()
RETURNS TEXT
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT _id
  FROM public.user
  WHERE LOWER(email) = LOWER(auth.jwt()->>'email')
  LIMIT 1;
$$;

GRANT EXECUTE ON FUNCTION public.current_user_bubble_id() TO authenticated;
GRANT EXECUTE ON FUNCTION public.current_user_bubble_id() TO anon;

-- ============================================================
-- STEP 2: USER TABLE
-- ============================================================

ALTER TABLE public.user ENABLE ROW LEVEL SECURITY;

CREATE POLICY "user_select_own" ON public.user
FOR SELECT TO authenticated
USING (LOWER(email) = LOWER(auth.jwt()->>'email'));

CREATE POLICY "user_update_own" ON public.user
FOR UPDATE TO authenticated
USING (LOWER(email) = LOWER(auth.jwt()->>'email'))
WITH CHECK (LOWER(email) = LOWER(auth.jwt()->>'email'));

CREATE POLICY "user_service_role" ON public.user
FOR ALL TO service_role
USING (true) WITH CHECK (true);

-- ============================================================
-- STEP 3: PROPOSAL TABLE (Fix Existing)
-- ============================================================

-- Drop broken policies
DROP POLICY IF EXISTS "Allow anonymous proposal inserts for testing" ON public.proposal;
DROP POLICY IF EXISTS "Allow anonymous to view proposals for testing" ON public.proposal;
DROP POLICY IF EXISTS "Allow authenticated users to insert proposals" ON public.proposal;
DROP POLICY IF EXISTS "Users can view own proposals" ON public.proposal;

-- Create proper policies
CREATE POLICY "proposal_select_guest" ON public.proposal
FOR SELECT TO authenticated
USING (LOWER("Guest email") = LOWER(auth.jwt()->>'email'));

CREATE POLICY "proposal_insert_guest" ON public.proposal
FOR INSERT TO authenticated
WITH CHECK (LOWER("Guest email") = LOWER(auth.jwt()->>'email'));

CREATE POLICY "proposal_update_guest" ON public.proposal
FOR UPDATE TO authenticated
USING (LOWER("Guest email") = LOWER(auth.jwt()->>'email'))
WITH CHECK (LOWER("Guest email") = LOWER(auth.jwt()->>'email'));

CREATE POLICY "proposal_select_host" ON public.proposal
FOR SELECT TO authenticated
USING (LOWER("host email") = LOWER(auth.jwt()->>'email'));

CREATE POLICY "proposal_update_host" ON public.proposal
FOR UPDATE TO authenticated
USING (LOWER("host email") = LOWER(auth.jwt()->>'email'))
WITH CHECK (LOWER("host email") = LOWER(auth.jwt()->>'email'));

CREATE POLICY "proposal_service_role" ON public.proposal
FOR ALL TO service_role
USING (true) WITH CHECK (true);

CREATE POLICY "proposal_insert_anon" ON public.proposal
FOR INSERT TO anon
WITH CHECK (true);

-- ============================================================
-- STEP 4: LISTING TABLE
-- ============================================================

ALTER TABLE public.listing ENABLE ROW LEVEL SECURITY;

-- Keep existing public policy if it exists, otherwise create:
-- CREATE POLICY "listing_select_public_active" ON public.listing
-- FOR SELECT TO public
-- USING ("Active" = true AND "isForUsability" = false);

CREATE POLICY "listing_all_host" ON public.listing
FOR ALL TO authenticated
USING (LOWER("Host email") = LOWER(auth.jwt()->>'email'))
WITH CHECK (LOWER("Host email") = LOWER(auth.jwt()->>'email'));

CREATE POLICY "listing_service_role" ON public.listing
FOR ALL TO service_role
USING (true) WITH CHECK (true);

-- ============================================================
-- STEP 5: LISTING_PHOTO TABLE
-- ============================================================

ALTER TABLE public.listing_photo ENABLE ROW LEVEL SECURITY;

CREATE POLICY "listing_photo_select_public" ON public.listing_photo
FOR SELECT TO public
USING (
  EXISTS (
    SELECT 1 FROM public.listing l
    WHERE l._id = listing_photo."Listing"
    AND l."Active" = true
  )
);

CREATE POLICY "listing_photo_all_host" ON public.listing_photo
FOR ALL TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM public.listing l
    WHERE l._id = listing_photo."Listing"
    AND LOWER(l."Host email") = LOWER(auth.jwt()->>'email')
  )
)
WITH CHECK (
  EXISTS (
    SELECT 1 FROM public.listing l
    WHERE l._id = listing_photo."Listing"
    AND LOWER(l."Host email") = LOWER(auth.jwt()->>'email')
  )
);

CREATE POLICY "listing_photo_service_role" ON public.listing_photo
FOR ALL TO service_role
USING (true) WITH CHECK (true);

-- ============================================================
-- STEP 6: FAVORITE TABLE
-- ============================================================

ALTER TABLE public.favorite ENABLE ROW LEVEL SECURITY;

CREATE POLICY "favorite_select_own" ON public.favorite
FOR SELECT TO authenticated
USING ("User" = public.current_user_bubble_id());

CREATE POLICY "favorite_insert_own" ON public.favorite
FOR INSERT TO authenticated
WITH CHECK ("User" = public.current_user_bubble_id());

CREATE POLICY "favorite_delete_own" ON public.favorite
FOR DELETE TO authenticated
USING ("User" = public.current_user_bubble_id());

CREATE POLICY "favorite_service_role" ON public.favorite
FOR ALL TO service_role
USING (true) WITH CHECK (true);

-- ============================================================
-- STEP 7: MESSAGE TABLE
-- ============================================================

ALTER TABLE public._message ENABLE ROW LEVEL SECURITY;

CREATE POLICY "_message_select_participant" ON public._message
FOR SELECT TO authenticated
USING (
  "-Guest User" = public.current_user_bubble_id() OR
  "-Host User" = public.current_user_bubble_id() OR
  "-Originator User" = public.current_user_bubble_id()
);

CREATE POLICY "_message_insert_sender" ON public._message
FOR INSERT TO authenticated
WITH CHECK ("-Originator User" = public.current_user_bubble_id());

CREATE POLICY "_message_service_role" ON public._message
FOR ALL TO service_role
USING (true) WITH CHECK (true);

-- ============================================================
-- DONE! Run verification queries below
-- ============================================================
```

---

## 4. Verification Queries

Run these after applying the migration to verify RLS is working:

```sql
-- Check RLS is enabled on all tables
SELECT
  schemaname,
  tablename,
  rowsecurity
FROM pg_tables
WHERE schemaname = 'public'
AND tablename IN ('user', 'proposal', 'listing', 'listing_photo', 'favorite', '_message')
ORDER BY tablename;

-- Check all policies exist
SELECT
  tablename,
  policyname,
  cmd,
  roles
FROM pg_policies
WHERE schemaname = 'public'
AND tablename IN ('user', 'proposal', 'listing', 'listing_photo', 'favorite', '_message')
ORDER BY tablename, policyname;

-- Test helper function (replace with actual email)
SELECT public.current_user_bubble_id();
```

---

## 5. Rollback Script

If issues occur, run this to disable RLS:

```sql
-- Emergency rollback: Disable RLS on all tables
ALTER TABLE public.user DISABLE ROW LEVEL SECURITY;
ALTER TABLE public.proposal DISABLE ROW LEVEL SECURITY;
ALTER TABLE public.listing DISABLE ROW LEVEL SECURITY;
ALTER TABLE public.listing_photo DISABLE ROW LEVEL SECURITY;
ALTER TABLE public.favorite DISABLE ROW LEVEL SECURITY;
ALTER TABLE public._message DISABLE ROW LEVEL SECURITY;

-- Note: Policies remain but are inactive when RLS is disabled
-- To fully remove, also drop individual policies
```

---

## 6. Frontend Impact

### No Changes Required If:
- Using service role key in Edge Functions (bypasses RLS)
- Queries already filter by user context

### Changes Required If:
- Direct Supabase client queries from frontend
- Ensure user is authenticated before queries

```javascript
// Example: Ensure authenticated session before query
const { data: { session } } = await supabase.auth.getSession();
if (!session) {
  throw new Error('Must be logged in');
}

// This query now automatically filters to current user's proposals
const { data: proposals } = await supabase
  .from('proposal')
  .select('*');
// Returns ONLY proposals where Guest email = logged-in user's email
```

---

## 7. Tables NOT Requiring Email (Using Helper Function)

These tables don't have denormalized email fields, so they use the helper function:

| Table | Owner Column | Policy Pattern |
|-------|--------------|----------------|
| `favorite` | `User` | `"User" = public.current_user_bubble_id()` |
| `_message` | `-Guest User`, `-Host User` | Multiple column check |

---

## 8. Implementation Timeline

| Day | Task | Effort |
|-----|------|--------|
| Day 1 | Create helper function, apply user + proposal policies | 2 hours |
| Day 2 | Apply listing + listing_photo policies | 1 hour |
| Day 3 | Apply favorite + message policies | 1 hour |
| Day 4 | Testing and verification | 2 hours |
| Day 5 | Frontend testing, edge cases | 2 hours |

**Total: ~8 hours over 1-2 weeks**

---

## 9. Security Notes

1. **Service role key** must NEVER be exposed to frontend
2. **Edge Functions** using service role bypass RLS (intended)
3. **Email comparison** is case-insensitive using `LOWER()`
4. **Anonymous insert** on proposals allows pre-signup flow
5. **No DELETE policies** on user table (account deletion handled by support)

---

## 10. Files Reference

| File | Relevance |
|------|-----------|
| `supabase/functions/auth-user/handlers/signup.ts` | Sets user email in auth |
| `app/src/lib/supabase.js` | Frontend Supabase client |
| `.claude/plans/Documents/20251210153500_OWNERSHIP_CREATOR_RELATIONSHIP_ANALYSIS.md` | Data relationship analysis |

---

**Document Version**: 1.0
**Approach**: Email-based RLS with single helper function
**Complexity**: Low
**Risk**: Low (uses existing denormalized fields)
