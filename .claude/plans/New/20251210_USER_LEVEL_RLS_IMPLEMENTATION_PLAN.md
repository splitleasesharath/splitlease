# User-Level Row Level Security (RLS) Implementation Plan

**GENERATED**: 2025-12-10
**AUTHOR**: Claude (Implementation Plan)
**STATUS**: Ready for Review
**OBJECTIVE**: Implement Bubble's "current user's thing" equivalent in Supabase

---

## Executive Summary

This document outlines a comprehensive plan to implement Row Level Security (RLS) policies in Supabase, enabling user-level data access control equivalent to Bubble's "current user's thing" pattern. The implementation addresses the **dual-identity challenge** between Supabase Auth (`auth.users.id` - UUID) and the legacy Bubble data model (`public.user._id` - TEXT).

### Current State
- **62+ tables** in the public schema have NO RLS enabled
- **`user` table**: RLS disabled - anyone can read all user data
- **`listing` table**: Has a policy but RLS NOT enabled
- **`proposal` table**: RLS enabled but policies may have identity mismatch issues
- **`account_host`/`account_guest`**: No RLS protection

### Proposed Solution
Implement a **phased RLS rollout** using a **user_metadata-based identity resolution** strategy that bridges `auth.uid()` to the existing Bubble-style `_id` fields.

---

## 1. Identity Mapping Strategy

### 1.1 The Dual-Identity Challenge

```
┌─────────────────────────────────────────────────────────────────────┐
│ SUPABASE AUTH (auth.users)                                          │
│ ├── id: UUID (e.g., "a1b2c3d4-e5f6-7890-...")                       │
│ ├── email: "user@example.com"                                       │
│ └── raw_user_meta_data: {                                           │
│       "user_id": "1734826...",           ← Bubble-style _id         │
│       "host_account_id": "1734826...",   ← account_host._id         │
│       "guest_account_id": "1734826..."   ← account_guest._id        │
│     }                                                               │
└─────────────────────────────────────────────────────────────────────┘
                              ↓
                    (References via metadata)
                              ↓
┌─────────────────────────────────────────────────────────────────────┐
│ PUBLIC.USER TABLE                                                   │
│ ├── _id: "1734826..." (Bubble-style, PRIMARY KEY)                   │
│ ├── email: "user@example.com"                                       │
│ ├── "Account - Host / Landlord": "1734826..."                       │
│ └── "Account - Guest": "1734826..."                                 │
└─────────────────────────────────────────────────────────────────────┘
```

### 1.2 Chosen Strategy: User Metadata + Helper Function

**Rationale**:
- The signup handler already stores `user_id`, `host_account_id`, `guest_account_id` in `user_metadata`
- A helper function provides clean, reusable identity resolution
- No schema migration required initially

**Implementation**:

```sql
-- Create a helper function to get the current user's Bubble-style _id
CREATE OR REPLACE FUNCTION public.current_user_id()
RETURNS TEXT
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT COALESCE(
    -- First: Try to get from user_metadata (native Supabase signups)
    auth.jwt() -> 'user_metadata' ->> 'user_id',
    -- Fallback: Look up by email (legacy Bubble users)
    (SELECT _id FROM public.user WHERE email = auth.jwt() ->> 'email' LIMIT 1)
  );
$$;

-- Create helper for host account ID
CREATE OR REPLACE FUNCTION public.current_host_account_id()
RETURNS TEXT
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT COALESCE(
    auth.jwt() -> 'user_metadata' ->> 'host_account_id',
    (SELECT "Account - Host / Landlord" FROM public.user WHERE email = auth.jwt() ->> 'email' LIMIT 1)
  );
$$;

-- Create helper for guest account ID
CREATE OR REPLACE FUNCTION public.current_guest_account_id()
RETURNS TEXT
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT COALESCE(
    auth.jwt() -> 'user_metadata' ->> 'guest_account_id',
    (SELECT "Account - Guest" FROM public.user WHERE email = auth.jwt() ->> 'email' LIMIT 1)
  );
$$;

-- Helper to check if current user is admin
CREATE OR REPLACE FUNCTION public.is_admin()
RETURNS BOOLEAN
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT COALESCE(
    (SELECT "Toggle - Is Admin" FROM public.user WHERE _id = public.current_user_id()),
    false
  );
$$;
```

### 1.3 Alternative: Add `supabase_auth_id` Column (Long-term)

For optimal performance and simpler policies, add a direct link column:

```sql
-- Phase 2: Add supabase_auth_id column to user table
ALTER TABLE public.user
ADD COLUMN supabase_auth_id UUID REFERENCES auth.users(id);

-- Create index for performance
CREATE INDEX idx_user_supabase_auth_id ON public.user(supabase_auth_id);

-- Backfill for existing users (via migration script)
UPDATE public.user u
SET supabase_auth_id = au.id
FROM auth.users au
WHERE LOWER(u.email) = LOWER(au.email);

-- Update signup handler to populate this field
-- (See Section 6 - Code Changes Required)
```

---

## 2. RLS Policy Design

### 2.1 Policy Naming Convention

```
{table}_{operation}_{role}_{description}
```

Examples:
- `user_select_authenticated_own_profile`
- `listing_select_public_active_only`
- `proposal_insert_authenticated_as_guest`

### 2.2 Core Policy Patterns

#### Pattern A: Owner-Only Access (User Profile)
```sql
CREATE POLICY "user_all_authenticated_own_profile"
ON public.user
FOR ALL
TO authenticated
USING (_id = public.current_user_id())
WITH CHECK (_id = public.current_user_id());
```

#### Pattern B: Public Read + Owner Write (Listings)
```sql
-- Public can view active listings
CREATE POLICY "listing_select_public_active"
ON public.listing
FOR SELECT
TO public
USING ("Active" = true AND "isForUsability" = false);

-- Hosts can manage their own listings
CREATE POLICY "listing_all_authenticated_own_listings"
ON public.listing
FOR ALL
TO authenticated
USING ("Host / Landlord" = public.current_host_account_id())
WITH CHECK ("Host / Landlord" = public.current_host_account_id());
```

#### Pattern C: Multi-Party Access (Proposals)
```sql
-- Guests can view/manage their own proposals
CREATE POLICY "proposal_all_guest_own"
ON public.proposal
FOR ALL
TO authenticated
USING ("Guest" = public.current_guest_account_id())
WITH CHECK ("Guest" = public.current_guest_account_id());

-- Hosts can view proposals for their listings
CREATE POLICY "proposal_select_host_received"
ON public.proposal
FOR SELECT
TO authenticated
USING ("Host - Account" = public.current_host_account_id());

-- Hosts can update proposals they received (accept/reject)
CREATE POLICY "proposal_update_host_received"
ON public.proposal
FOR UPDATE
TO authenticated
USING ("Host - Account" = public.current_host_account_id())
WITH CHECK ("Host - Account" = public.current_host_account_id());
```

#### Pattern D: Service Role Bypass
```sql
CREATE POLICY "tablename_all_service_role"
ON public.tablename
FOR ALL
TO service_role
USING (true)
WITH CHECK (true);
```

#### Pattern E: Admin Override
```sql
CREATE POLICY "tablename_all_admin"
ON public.tablename
FOR ALL
TO authenticated
USING (public.is_admin() = true)
WITH CHECK (public.is_admin() = true);
```

---

## 3. Table-by-Table RLS Implementation

### 3.1 Phase 1: Critical User Data (Week 1)

#### 3.1.1 `public.user` Table

```sql
-- Enable RLS
ALTER TABLE public.user ENABLE ROW LEVEL SECURITY;

-- Users can only see and modify their own profile
CREATE POLICY "user_select_authenticated_own"
ON public.user
FOR SELECT
TO authenticated
USING (_id = public.current_user_id());

CREATE POLICY "user_update_authenticated_own"
ON public.user
FOR UPDATE
TO authenticated
USING (_id = public.current_user_id())
WITH CHECK (_id = public.current_user_id());

-- Users cannot delete their own account (handled by support)
-- No DELETE policy for regular users

-- Service role can do everything (for Edge Functions)
CREATE POLICY "user_all_service_role"
ON public.user
FOR ALL
TO service_role
USING (true)
WITH CHECK (true);

-- Admins can view all users
CREATE POLICY "user_select_admin_all"
ON public.user
FOR SELECT
TO authenticated
USING (public.is_admin() = true);

-- Allow Edge Functions to insert new users during signup
CREATE POLICY "user_insert_service_role"
ON public.user
FOR INSERT
TO service_role
WITH CHECK (true);
```

#### 3.1.2 `public.account_host` Table

```sql
-- Enable RLS
ALTER TABLE public.account_host ENABLE ROW LEVEL SECURITY;

-- Hosts can view their own account
CREATE POLICY "account_host_select_own"
ON public.account_host
FOR SELECT
TO authenticated
USING (_id = public.current_host_account_id());

-- Hosts can update their own account
CREATE POLICY "account_host_update_own"
ON public.account_host
FOR UPDATE
TO authenticated
USING (_id = public.current_host_account_id())
WITH CHECK (_id = public.current_host_account_id());

-- Service role full access
CREATE POLICY "account_host_all_service_role"
ON public.account_host
FOR ALL
TO service_role
USING (true)
WITH CHECK (true);
```

#### 3.1.3 `public.account_guest` Table

```sql
-- Enable RLS
ALTER TABLE public.account_guest ENABLE ROW LEVEL SECURITY;

-- Guests can view their own account
CREATE POLICY "account_guest_select_own"
ON public.account_guest
FOR SELECT
TO authenticated
USING (_id = public.current_guest_account_id());

-- Guests can update their own account
CREATE POLICY "account_guest_update_own"
ON public.account_guest
FOR UPDATE
TO authenticated
USING (_id = public.current_guest_account_id())
WITH CHECK (_id = public.current_guest_account_id());

-- Service role full access
CREATE POLICY "account_guest_all_service_role"
ON public.account_guest
FOR ALL
TO service_role
USING (true)
WITH CHECK (true);
```

### 3.2 Phase 2: Listings & Proposals (Week 2)

#### 3.2.1 `public.listing` Table

```sql
-- Enable RLS (policy already exists but RLS not enabled!)
ALTER TABLE public.listing ENABLE ROW LEVEL SECURITY;

-- Keep existing policy for public read
-- "Allow public read access to active listings" already exists

-- Hosts can manage their own listings
CREATE POLICY "listing_all_host_own"
ON public.listing
FOR ALL
TO authenticated
USING ("Host / Landlord" = public.current_host_account_id())
WITH CHECK ("Host / Landlord" = public.current_host_account_id());

-- Service role full access (for Bubble sync, etc.)
CREATE POLICY "listing_all_service_role"
ON public.listing
FOR ALL
TO service_role
USING (true)
WITH CHECK (true);

-- Admins can view all listings
CREATE POLICY "listing_select_admin"
ON public.listing
FOR SELECT
TO authenticated
USING (public.is_admin() = true);
```

#### 3.2.2 `public.proposal` Table (Fix Existing Policies)

```sql
-- Drop existing problematic policies
DROP POLICY IF EXISTS "Allow anonymous proposal inserts for testing" ON public.proposal;
DROP POLICY IF EXISTS "Allow anonymous to view proposals for testing" ON public.proposal;
DROP POLICY IF EXISTS "Allow authenticated users to insert proposals" ON public.proposal;
DROP POLICY IF EXISTS "Users can view own proposals" ON public.proposal;

-- Guests can view their own proposals
CREATE POLICY "proposal_select_guest_own"
ON public.proposal
FOR SELECT
TO authenticated
USING ("Guest" = public.current_guest_account_id());

-- Guests can create proposals
CREATE POLICY "proposal_insert_guest"
ON public.proposal
FOR INSERT
TO authenticated
WITH CHECK ("Guest" = public.current_guest_account_id());

-- Guests can update their own proposals (edit/cancel)
CREATE POLICY "proposal_update_guest_own"
ON public.proposal
FOR UPDATE
TO authenticated
USING ("Guest" = public.current_guest_account_id())
WITH CHECK ("Guest" = public.current_guest_account_id());

-- Hosts can view proposals for their listings
CREATE POLICY "proposal_select_host"
ON public.proposal
FOR SELECT
TO authenticated
USING ("Host - Account" = public.current_host_account_id());

-- Hosts can update proposals (accept/reject/counter)
CREATE POLICY "proposal_update_host"
ON public.proposal
FOR UPDATE
TO authenticated
USING ("Host - Account" = public.current_host_account_id())
WITH CHECK ("Host - Account" = public.current_host_account_id());

-- Service role full access
CREATE POLICY "proposal_all_service_role"
ON public.proposal
FOR ALL
TO service_role
USING (true)
WITH CHECK (true);

-- Allow public insert for anonymous proposals (pre-signup flow)
-- This allows guests to create proposals before having an account
CREATE POLICY "proposal_insert_anon"
ON public.proposal
FOR INSERT
TO anon
WITH CHECK (true);
```

#### 3.2.3 `public.listing_photo` Table

```sql
-- Enable RLS
ALTER TABLE public.listing_photo ENABLE ROW LEVEL SECURITY;

-- Public can view photos of active listings
CREATE POLICY "listing_photo_select_public"
ON public.listing_photo
FOR SELECT
TO public
USING (
  EXISTS (
    SELECT 1 FROM public.listing l
    WHERE l._id = "Listing"
    AND l."Active" = true
  )
);

-- Hosts can manage photos of their own listings
CREATE POLICY "listing_photo_all_host"
ON public.listing_photo
FOR ALL
TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM public.listing l
    WHERE l._id = "Listing"
    AND l."Host / Landlord" = public.current_host_account_id()
  )
)
WITH CHECK (
  EXISTS (
    SELECT 1 FROM public.listing l
    WHERE l._id = "Listing"
    AND l."Host / Landlord" = public.current_host_account_id()
  )
);

-- Service role full access
CREATE POLICY "listing_photo_all_service_role"
ON public.listing_photo
FOR ALL
TO service_role
USING (true)
WITH CHECK (true);
```

### 3.3 Phase 3: Bookings & Financial (Week 3)

#### 3.3.1 `public.bookings_leases` Table

```sql
-- Enable RLS
ALTER TABLE public.bookings_leases ENABLE ROW LEVEL SECURITY;

-- Guests can view their leases
CREATE POLICY "bookings_leases_select_guest"
ON public.bookings_leases
FOR SELECT
TO authenticated
USING ("Guest - Account" = public.current_guest_account_id());

-- Hosts can view leases for their properties
CREATE POLICY "bookings_leases_select_host"
ON public.bookings_leases
FOR SELECT
TO authenticated
USING ("Host - Account" = public.current_host_account_id());

-- Service role full access
CREATE POLICY "bookings_leases_all_service_role"
ON public.bookings_leases
FOR ALL
TO service_role
USING (true)
WITH CHECK (true);
```

#### 3.3.2 `public.bookings_stays` Table

```sql
-- Enable RLS
ALTER TABLE public.bookings_stays ENABLE ROW LEVEL SECURITY;

-- Guests can view their stays
CREATE POLICY "bookings_stays_select_guest"
ON public.bookings_stays
FOR SELECT
TO authenticated
USING ("Guest - Account" = public.current_guest_account_id());

-- Hosts can view stays at their properties
CREATE POLICY "bookings_stays_select_host"
ON public.bookings_stays
FOR SELECT
TO authenticated
USING ("Host - Account" = public.current_host_account_id());

-- Service role full access
CREATE POLICY "bookings_stays_all_service_role"
ON public.bookings_stays
FOR ALL
TO service_role
USING (true)
WITH CHECK (true);
```

#### 3.3.3 `public.paymentrecords` Table

```sql
-- Enable RLS
ALTER TABLE public.paymentrecords ENABLE ROW LEVEL SECURITY;

-- Users can view their own payment records
CREATE POLICY "paymentrecords_select_own"
ON public.paymentrecords
FOR SELECT
TO authenticated
USING (
  "Payer" = public.current_user_id() OR
  "Payee" = public.current_user_id()
);

-- No direct modification allowed (handled by service)
-- Service role full access
CREATE POLICY "paymentrecords_all_service_role"
ON public.paymentrecords
FOR ALL
TO service_role
USING (true)
WITH CHECK (true);
```

### 3.4 Phase 4: Communication & Favorites (Week 4)

#### 3.4.1 `public._message` Table

```sql
-- Enable RLS
ALTER TABLE public._message ENABLE ROW LEVEL SECURITY;

-- Users can view messages they sent or received
CREATE POLICY "_message_select_participant"
ON public._message
FOR SELECT
TO authenticated
USING (
  "Sender" = public.current_user_id() OR
  "Recipient" = public.current_user_id()
);

-- Users can send messages
CREATE POLICY "_message_insert_sender"
ON public._message
FOR INSERT
TO authenticated
WITH CHECK ("Sender" = public.current_user_id());

-- Service role full access
CREATE POLICY "_message_all_service_role"
ON public._message
FOR ALL
TO service_role
USING (true)
WITH CHECK (true);
```

#### 3.4.2 `public.favorite` Table

```sql
-- Enable RLS
ALTER TABLE public.favorite ENABLE ROW LEVEL SECURITY;

-- Users can view their own favorites
CREATE POLICY "favorite_select_own"
ON public.favorite
FOR SELECT
TO authenticated
USING ("User" = public.current_user_id());

-- Users can add favorites
CREATE POLICY "favorite_insert_own"
ON public.favorite
FOR INSERT
TO authenticated
WITH CHECK ("User" = public.current_user_id());

-- Users can remove their favorites
CREATE POLICY "favorite_delete_own"
ON public.favorite
FOR DELETE
TO authenticated
USING ("User" = public.current_user_id());

-- Service role full access
CREATE POLICY "favorite_all_service_role"
ON public.favorite
FOR ALL
TO service_role
USING (true)
WITH CHECK (true);
```

### 3.5 Phase 5: Reference & Configuration Tables (Week 5)

Reference tables (`zat_*`, `os_*`) should generally be publicly readable:

```sql
-- Example for zat_geo_borough_toplevel
ALTER TABLE public.zat_geo_borough_toplevel ENABLE ROW LEVEL SECURITY;

CREATE POLICY "zat_geo_borough_select_public"
ON public.zat_geo_borough_toplevel
FOR SELECT
TO public
USING (true);

-- Only service role can modify
CREATE POLICY "zat_geo_borough_all_service_role"
ON public.zat_geo_borough_toplevel
FOR ALL
TO service_role
USING (true)
WITH CHECK (true);
```

---

## 4. Migration Scripts

### 4.1 Phase 1 Migration: Helper Functions & Critical Tables

```sql
-- Migration: 20251210_001_rls_helper_functions
-- Description: Create helper functions for RLS identity resolution

-- ==========================================
-- SECTION 1: Helper Functions
-- ==========================================

-- Function: Get current user's Bubble-style _id
CREATE OR REPLACE FUNCTION public.current_user_id()
RETURNS TEXT
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT COALESCE(
    auth.jwt() -> 'user_metadata' ->> 'user_id',
    (SELECT _id FROM public.user WHERE LOWER(email) = LOWER(auth.jwt() ->> 'email') LIMIT 1)
  );
$$;

-- Function: Get current user's host account ID
CREATE OR REPLACE FUNCTION public.current_host_account_id()
RETURNS TEXT
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT COALESCE(
    auth.jwt() -> 'user_metadata' ->> 'host_account_id',
    (SELECT "Account - Host / Landlord" FROM public.user WHERE LOWER(email) = LOWER(auth.jwt() ->> 'email') LIMIT 1)
  );
$$;

-- Function: Get current user's guest account ID
CREATE OR REPLACE FUNCTION public.current_guest_account_id()
RETURNS TEXT
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT COALESCE(
    auth.jwt() -> 'user_metadata' ->> 'guest_account_id',
    (SELECT "Account - Guest" FROM public.user WHERE LOWER(email) = LOWER(auth.jwt() ->> 'email') LIMIT 1)
  );
$$;

-- Function: Check if current user is admin
CREATE OR REPLACE FUNCTION public.is_admin()
RETURNS BOOLEAN
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT COALESCE(
    (SELECT "Toggle - Is Admin" FROM public.user WHERE _id = public.current_user_id()),
    false
  );
$$;

-- Grant execute permissions
GRANT EXECUTE ON FUNCTION public.current_user_id() TO authenticated;
GRANT EXECUTE ON FUNCTION public.current_host_account_id() TO authenticated;
GRANT EXECUTE ON FUNCTION public.current_guest_account_id() TO authenticated;
GRANT EXECUTE ON FUNCTION public.is_admin() TO authenticated;

-- ==========================================
-- SECTION 2: User Table RLS
-- ==========================================

ALTER TABLE public.user ENABLE ROW LEVEL SECURITY;

CREATE POLICY "user_select_authenticated_own"
ON public.user FOR SELECT TO authenticated
USING (_id = public.current_user_id());

CREATE POLICY "user_update_authenticated_own"
ON public.user FOR UPDATE TO authenticated
USING (_id = public.current_user_id())
WITH CHECK (_id = public.current_user_id());

CREATE POLICY "user_all_service_role"
ON public.user FOR ALL TO service_role
USING (true) WITH CHECK (true);

CREATE POLICY "user_select_admin_all"
ON public.user FOR SELECT TO authenticated
USING (public.is_admin() = true);

-- ==========================================
-- SECTION 3: Account Host Table RLS
-- ==========================================

ALTER TABLE public.account_host ENABLE ROW LEVEL SECURITY;

CREATE POLICY "account_host_select_own"
ON public.account_host FOR SELECT TO authenticated
USING (_id = public.current_host_account_id());

CREATE POLICY "account_host_update_own"
ON public.account_host FOR UPDATE TO authenticated
USING (_id = public.current_host_account_id())
WITH CHECK (_id = public.current_host_account_id());

CREATE POLICY "account_host_all_service_role"
ON public.account_host FOR ALL TO service_role
USING (true) WITH CHECK (true);

-- ==========================================
-- SECTION 4: Account Guest Table RLS
-- ==========================================

ALTER TABLE public.account_guest ENABLE ROW LEVEL SECURITY;

CREATE POLICY "account_guest_select_own"
ON public.account_guest FOR SELECT TO authenticated
USING (_id = public.current_guest_account_id());

CREATE POLICY "account_guest_update_own"
ON public.account_guest FOR UPDATE TO authenticated
USING (_id = public.current_guest_account_id())
WITH CHECK (_id = public.current_guest_account_id());

CREATE POLICY "account_guest_all_service_role"
ON public.account_guest FOR ALL TO service_role
USING (true) WITH CHECK (true);
```

### 4.2 Phase 2 Migration: Listings & Proposals

```sql
-- Migration: 20251210_002_rls_listings_proposals
-- Description: Enable RLS on listing and proposal tables

-- ==========================================
-- SECTION 1: Listing Table RLS
-- ==========================================

ALTER TABLE public.listing ENABLE ROW LEVEL SECURITY;

-- Note: Keep existing "Allow public read access to active listings" policy

CREATE POLICY "listing_all_host_own"
ON public.listing FOR ALL TO authenticated
USING ("Host / Landlord" = public.current_host_account_id())
WITH CHECK ("Host / Landlord" = public.current_host_account_id());

CREATE POLICY "listing_all_service_role"
ON public.listing FOR ALL TO service_role
USING (true) WITH CHECK (true);

CREATE POLICY "listing_select_admin"
ON public.listing FOR SELECT TO authenticated
USING (public.is_admin() = true);

-- ==========================================
-- SECTION 2: Proposal Table RLS (Fix Policies)
-- ==========================================

-- Drop problematic testing policies
DROP POLICY IF EXISTS "Allow anonymous proposal inserts for testing" ON public.proposal;
DROP POLICY IF EXISTS "Allow anonymous to view proposals for testing" ON public.proposal;
DROP POLICY IF EXISTS "Allow authenticated users to insert proposals" ON public.proposal;
DROP POLICY IF EXISTS "Users can view own proposals" ON public.proposal;

-- Guest policies
CREATE POLICY "proposal_select_guest_own"
ON public.proposal FOR SELECT TO authenticated
USING ("Guest" = public.current_guest_account_id());

CREATE POLICY "proposal_insert_guest"
ON public.proposal FOR INSERT TO authenticated
WITH CHECK ("Guest" = public.current_guest_account_id());

CREATE POLICY "proposal_update_guest_own"
ON public.proposal FOR UPDATE TO authenticated
USING ("Guest" = public.current_guest_account_id())
WITH CHECK ("Guest" = public.current_guest_account_id());

-- Host policies
CREATE POLICY "proposal_select_host"
ON public.proposal FOR SELECT TO authenticated
USING ("Host - Account" = public.current_host_account_id());

CREATE POLICY "proposal_update_host"
ON public.proposal FOR UPDATE TO authenticated
USING ("Host - Account" = public.current_host_account_id())
WITH CHECK ("Host - Account" = public.current_host_account_id());

-- Service role
CREATE POLICY "proposal_all_service_role"
ON public.proposal FOR ALL TO service_role
USING (true) WITH CHECK (true);

-- Allow anonymous insert for pre-signup proposal flow
CREATE POLICY "proposal_insert_anon"
ON public.proposal FOR INSERT TO anon
WITH CHECK (true);

-- ==========================================
-- SECTION 3: Listing Photo Table RLS
-- ==========================================

ALTER TABLE public.listing_photo ENABLE ROW LEVEL SECURITY;

CREATE POLICY "listing_photo_select_public"
ON public.listing_photo FOR SELECT TO public
USING (
  EXISTS (
    SELECT 1 FROM public.listing l
    WHERE l._id = "Listing" AND l."Active" = true
  )
);

CREATE POLICY "listing_photo_all_host"
ON public.listing_photo FOR ALL TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM public.listing l
    WHERE l._id = "Listing"
    AND l."Host / Landlord" = public.current_host_account_id()
  )
)
WITH CHECK (
  EXISTS (
    SELECT 1 FROM public.listing l
    WHERE l._id = "Listing"
    AND l."Host / Landlord" = public.current_host_account_id()
  )
);

CREATE POLICY "listing_photo_all_service_role"
ON public.listing_photo FOR ALL TO service_role
USING (true) WITH CHECK (true);
```

---

## 5. Testing Strategy

### 5.1 Test Cases for Each Table

#### User Table Tests
```sql
-- Test 1: User can select their own profile
-- Expected: Returns 1 row
SELECT * FROM public.user WHERE _id = public.current_user_id();

-- Test 2: User cannot see other profiles
-- Expected: Returns 0 rows
SELECT COUNT(*) FROM public.user WHERE _id != public.current_user_id();

-- Test 3: User can update their own profile
-- Expected: Success
UPDATE public.user SET "Modified Date" = NOW() WHERE _id = public.current_user_id();

-- Test 4: User cannot update others' profiles
-- Expected: 0 rows affected
UPDATE public.user SET "Modified Date" = NOW() WHERE _id != public.current_user_id();
```

#### Proposal Table Tests
```sql
-- Test 1: Guest can see their proposals
-- Expected: Returns rows where Guest = current_guest_account_id
SELECT * FROM public.proposal WHERE "Guest" = public.current_guest_account_id();

-- Test 2: Host can see received proposals
-- Expected: Returns rows where "Host - Account" = current_host_account_id
SELECT * FROM public.proposal WHERE "Host - Account" = public.current_host_account_id();

-- Test 3: User cannot see unrelated proposals
-- Run as user with no proposals
SELECT COUNT(*) FROM public.proposal; -- Should return 0 if user has no proposals
```

### 5.2 Automated Test Script

```javascript
// app/src/tests/rls-tests.js
import { supabase } from '../lib/supabase.js';

async function testRLS() {
  console.log('=== RLS Test Suite ===');

  // Test 1: Can read own profile
  const { data: profile, error: profileError } = await supabase
    .from('user')
    .select('_id, email')
    .single();

  console.log('Own profile:', profile ? 'PASS' : 'FAIL', profileError?.message || '');

  // Test 2: Cannot read all users (should be filtered)
  const { data: allUsers, error: allError } = await supabase
    .from('user')
    .select('_id');

  console.log('User filtering:', allUsers?.length <= 1 ? 'PASS' : 'FAIL',
    `Returned ${allUsers?.length} users`);

  // Test 3: Can read own proposals
  const { data: proposals } = await supabase
    .from('proposal')
    .select('_id, Status');

  console.log('Proposals accessible:', proposals !== null ? 'PASS' : 'FAIL');

  // Test 4: Can read active listings (public)
  const { data: listings } = await supabase
    .from('listing')
    .select('_id, Name')
    .eq('Active', true)
    .limit(5);

  console.log('Public listings:', listings?.length > 0 ? 'PASS' : 'FAIL');
}
```

---

## 6. Code Changes Required

### 6.1 Update Signup Handler

Update `supabase/functions/auth-user/handlers/signup.ts` to ensure metadata is properly set:

```typescript
// Ensure user_metadata contains all identity fields
const { data: authData, error: authError } = await supabaseAdmin.auth.admin.createUser({
  email: email,
  password: password,
  email_confirm: true,
  user_metadata: {
    user_id: generatedUserId,           // Critical for RLS
    host_account_id: generatedHostId,   // Critical for RLS
    guest_account_id: generatedGuestId, // Critical for RLS
    first_name: firstName,
    last_name: lastName,
    user_type: userType,
    birth_date: birthDate,
    phone_number: phoneNumber
  }
});
```

### 6.2 Update Frontend Supabase Client

Ensure the frontend uses authenticated sessions properly:

```javascript
// app/src/lib/supabase.js
import { createClient } from '@supabase/supabase-js';

export const supabase = createClient(
  import.meta.env.VITE_SUPABASE_URL,
  import.meta.env.VITE_SUPABASE_ANON_KEY,
  {
    auth: {
      persistSession: true,
      autoRefreshToken: true
    }
  }
);

// Helper to ensure authenticated queries
export async function getAuthenticatedClient() {
  const { data: { session } } = await supabase.auth.getSession();
  if (!session) {
    throw new Error('Not authenticated');
  }
  return supabase;
}
```

### 6.3 Update Edge Functions

Edge Functions using service role key are unaffected (bypass RLS). For client-authenticated calls, ensure proper token handling:

```typescript
// In Edge Function handler
const authHeader = req.headers.get('Authorization');

if (authHeader) {
  // Create client with user's auth context (RLS applies)
  const userClient = createClient(supabaseUrl, supabaseAnonKey, {
    global: { headers: { Authorization: authHeader } },
    auth: { persistSession: false }
  });

  // Queries via userClient will respect RLS
  const { data } = await userClient.from('proposal').select('*');
} else {
  // Use service role client (bypasses RLS)
  const { data } = await supabaseAdmin.from('proposal').select('*');
}
```

---

## 7. Rollback Plan

### 7.1 Disable RLS (Emergency Rollback)

```sql
-- Emergency: Disable RLS on all tables
ALTER TABLE public.user DISABLE ROW LEVEL SECURITY;
ALTER TABLE public.account_host DISABLE ROW LEVEL SECURITY;
ALTER TABLE public.account_guest DISABLE ROW LEVEL SECURITY;
ALTER TABLE public.listing DISABLE ROW LEVEL SECURITY;
ALTER TABLE public.proposal DISABLE ROW LEVEL SECURITY;
ALTER TABLE public.listing_photo DISABLE ROW LEVEL SECURITY;
```

### 7.2 Drop Policies (Full Rollback)

```sql
-- Drop all custom policies
DROP POLICY IF EXISTS "user_select_authenticated_own" ON public.user;
DROP POLICY IF EXISTS "user_update_authenticated_own" ON public.user;
DROP POLICY IF EXISTS "user_all_service_role" ON public.user;
DROP POLICY IF EXISTS "user_select_admin_all" ON public.user;
-- ... repeat for all tables
```

### 7.3 Remove Helper Functions

```sql
DROP FUNCTION IF EXISTS public.current_user_id();
DROP FUNCTION IF EXISTS public.current_host_account_id();
DROP FUNCTION IF EXISTS public.current_guest_account_id();
DROP FUNCTION IF EXISTS public.is_admin();
```

---

## 8. Implementation Timeline

| Phase | Week | Tables | Effort |
|-------|------|--------|--------|
| Phase 1 | Week 1 | Helper functions, user, account_host, account_guest | 4 hours |
| Phase 2 | Week 2 | listing, proposal, listing_photo | 4 hours |
| Phase 3 | Week 3 | bookings_leases, bookings_stays, paymentrecords | 3 hours |
| Phase 4 | Week 4 | _message, favorite, datechangerequest | 3 hours |
| Phase 5 | Week 5 | Reference tables (zat_*, os_*) | 2 hours |
| Testing | Week 6 | Full regression testing | 4 hours |

**Total Estimated Effort**: 20 hours over 6 weeks

---

## 9. Security Considerations

### 9.1 Service Role Key Protection

- **NEVER** expose service role key to frontend
- Service role bypasses ALL RLS - use only in Edge Functions
- Rotate keys periodically

### 9.2 RLS Performance

- Helper functions are `STABLE` and `SECURITY DEFINER` for optimal caching
- Consider adding indexes on columns used in RLS policies:
  ```sql
  CREATE INDEX idx_listing_host ON public.listing("Host / Landlord");
  CREATE INDEX idx_proposal_guest ON public.proposal("Guest");
  CREATE INDEX idx_proposal_host ON public.proposal("Host - Account");
  ```

### 9.3 Audit Logging

Consider enabling audit logging for sensitive tables:
```sql
-- Enable pgaudit for compliance (if needed)
ALTER SYSTEM SET pgaudit.log = 'write, ddl';
```

---

## 10. Files Reference

| File | Purpose | Modifications Required |
|------|---------|------------------------|
| `supabase/functions/auth-user/handlers/signup.ts` | User registration | Verify user_metadata fields |
| `supabase/functions/auth-user/handlers/login.ts` | User login | No changes |
| `app/src/lib/supabase.js` | Supabase client | Ensure auth persistence |
| `app/src/lib/auth.js` | Auth utilities | No changes |
| Database migrations | RLS policies | New migration files |

---

## 11. Conclusion

This implementation plan provides a comprehensive approach to implementing Bubble's "current user's thing" pattern in Supabase using Row Level Security. The key innovations are:

1. **Helper functions** that bridge the dual-identity system
2. **Phased rollout** to minimize risk
3. **Service role bypass** for Edge Functions
4. **Admin override** policies for support operations
5. **Comprehensive testing strategy**

After implementation, logged-in users will only have access to their own data by default, matching Bubble's security model while leveraging Supabase's native RLS capabilities.

---

**Document Version**: 1.0
**Last Updated**: 2025-12-10
**Next Review**: After Phase 1 completion
