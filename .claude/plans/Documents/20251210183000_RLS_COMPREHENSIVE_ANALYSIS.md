# Comprehensive Row Level Security (RLS) Analysis for Split Lease

**GENERATED**: 2025-12-10T18:30:00
**AUTHOR**: Claude (Deep Analysis)
**STATUS**: Analysis Complete
**OBJECTIVE**: Determine feasibility and best practices for enforcing RLS based on authenticated users

---

## Executive Summary

**YES**, Supabase Row Level Security (RLS) can absolutely enforce data access policies based on the authenticated (logged-in) user. This is, in fact, the **primary and recommended** way to secure data in Supabase.

### Key Findings

| Question | Answer |
|----------|--------|
| Can RLS enforce policies based on auth user? | **YES** - This is the core purpose of RLS |
| What is the secure option? | Use `auth.uid()` or `auth.jwt()` in policy definitions |
| How to setup permissions? | SQL policy definitions with `USING` and `WITH CHECK` clauses |
| Current Split Lease Status | **65+ tables have NO RLS protection** - Critical security gap |

---

## 1. How RLS Works with Authenticated Users

### 1.1 Core Mechanism

Supabase provides built-in functions that identify the current authenticated user:

```sql
-- Returns the authenticated user's UUID from auth.users table
auth.uid()

-- Returns the full JWT payload with user data
auth.jwt()

-- Extract specific claims
auth.jwt() ->> 'email'                              -- User's email
auth.jwt() -> 'user_metadata' ->> 'user_type'       -- Custom metadata
auth.jwt() -> 'app_metadata' ->> 'role'             -- App-controlled metadata
```

### 1.2 Policy Enforcement Flow

```
┌─────────────────────────────────────────────────────────────────────┐
│ 1. Client Makes Request                                             │
│    supabase.from('proposal').select('*')                           │
└─────────────────────────────────────────────────────────────────────┘
                                ↓
┌─────────────────────────────────────────────────────────────────────┐
│ 2. Supabase Validates JWT Token                                     │
│    Authorization: Bearer <jwt_token>                                │
│    → Extracts user identity (auth.uid(), auth.jwt())               │
└─────────────────────────────────────────────────────────────────────┘
                                ↓
┌─────────────────────────────────────────────────────────────────────┐
│ 3. Database Evaluates RLS Policies                                  │
│    POLICY: USING ("Guest email" = auth.jwt() ->> 'email')          │
│    → Acts as implicit WHERE clause                                  │
└─────────────────────────────────────────────────────────────────────┘
                                ↓
┌─────────────────────────────────────────────────────────────────────┐
│ 4. Only Authorized Rows Returned                                    │
│    → User sees ONLY their own proposals                            │
└─────────────────────────────────────────────────────────────────────┘
```

---

## 2. Secure Options for User-Based Access Control

### 2.1 Option A: Direct auth.uid() Comparison (Standard Pattern)

**Best for:** Tables with UUID foreign key to `auth.users`

```sql
CREATE POLICY "users_own_data"
ON my_table
FOR ALL
TO authenticated
USING (user_id = auth.uid())
WITH CHECK (user_id = auth.uid());
```

**Pros:**
- Simplest pattern
- Best performance (no joins)
- Native Supabase design

**Cons:**
- Requires `auth.users.id` (UUID) column in table
- Split Lease uses Bubble-style TEXT IDs

### 2.2 Option B: Email-Based Matching (Recommended for Split Lease)

**Best for:** Tables with denormalized email fields (Split Lease pattern)

```sql
CREATE POLICY "user_own_profile"
ON public.user
FOR SELECT
TO authenticated
USING (LOWER(email) = LOWER(auth.jwt() ->> 'email'));
```

**Pros:**
- Works with existing Split Lease schema
- No schema migration required
- Case-insensitive comparison handles edge cases

**Cons:**
- Slightly slower than UUID comparison
- Email must be denormalized on related tables

### 2.3 Option C: Helper Function Pattern (Hybrid Approach)

**Best for:** Complex relationships or legacy schemas

```sql
-- Helper function resolves current user's Bubble ID
CREATE OR REPLACE FUNCTION public.current_user_bubble_id()
RETURNS TEXT
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT _id
  FROM public.user
  WHERE LOWER(email) = LOWER(auth.jwt() ->> 'email')
  LIMIT 1;
$$;

-- Use in policies
CREATE POLICY "favorites_own"
ON public.favorite
FOR ALL
TO authenticated
USING ("User" = public.current_user_bubble_id());
```

**Pros:**
- Single point of identity resolution
- Handles Bubble→Supabase dual-identity system
- Cacheable with `STABLE` keyword

**Cons:**
- Additional function call per row
- Requires maintenance

### 2.4 Option D: JWT Metadata Pattern (Performance Optimized)

**Best for:** When identity is stored in JWT metadata at login

```sql
-- Access user_id stored in JWT at login time
CREATE POLICY "proposal_own"
ON public.proposal
FOR SELECT
TO authenticated
USING (
  "Guest" = auth.jwt() -> 'user_metadata' ->> 'guest_account_id'
);
```

**Pros:**
- No database lookup for identity
- Fastest option
- Scales infinitely

**Cons:**
- Requires metadata to be set at login/signup
- If metadata is stale, policies fail

---

## 3. How to Set Up Permissions (Step-by-Step)

### 3.1 Enable RLS on Table

```sql
-- This is REQUIRED - without it, ALL data is exposed via API
ALTER TABLE public.user ENABLE ROW LEVEL SECURITY;
```

### 3.2 Define Policies by Operation

#### SELECT Policy (Reading Data)
```sql
CREATE POLICY "policy_name"
ON table_name
FOR SELECT
TO authenticated  -- or 'public', 'anon', 'service_role'
USING (condition);  -- Rows visible if TRUE
```

#### INSERT Policy (Creating Data)
```sql
CREATE POLICY "policy_name"
ON table_name
FOR INSERT
TO authenticated
WITH CHECK (condition);  -- New row allowed if TRUE
```

#### UPDATE Policy (Modifying Data)
```sql
CREATE POLICY "policy_name"
ON table_name
FOR UPDATE
TO authenticated
USING (condition)        -- Existing row must match
WITH CHECK (condition);  -- New row values must match
```

#### DELETE Policy (Removing Data)
```sql
CREATE POLICY "policy_name"
ON table_name
FOR DELETE
TO authenticated
USING (condition);  -- Can delete if TRUE
```

#### ALL Operations
```sql
CREATE POLICY "policy_name"
ON table_name
FOR ALL
TO authenticated
USING (condition)
WITH CHECK (condition);
```

### 3.3 Role-Based Targeting

```sql
-- Only authenticated users
TO authenticated

-- Only anonymous/unauthenticated
TO anon

-- Both authenticated and anonymous
TO public

-- Service role (bypasses RLS internally)
TO service_role

-- Multiple roles
TO authenticated, anon
```

### 3.4 Service Role Bypass (For Edge Functions)

```sql
-- Allow Edge Functions using service_role key to bypass RLS
CREATE POLICY "service_role_bypass"
ON table_name
FOR ALL
TO service_role
USING (true)
WITH CHECK (true);
```

---

## 4. Split Lease Specific Recommendations

### 4.1 Current Critical Issues

| Issue | Severity | Tables Affected |
|-------|----------|-----------------|
| RLS Disabled in Public Schema | **CRITICAL** | 65+ tables |
| Policy Exists but RLS Disabled | **ERROR** | `listing`, `informationaltexts` |
| RLS Enabled but No Policies | **WARNING** | `sync_config`, `sync_queue` |
| Dual-Identity System | **Design Challenge** | All tables |

### 4.2 Recommended Implementation Strategy

Given Split Lease's Bubble migration history, the **Email-Based + Helper Function** hybrid is recommended:

```sql
-- PHASE 1: Create Helper Function
CREATE OR REPLACE FUNCTION public.current_user_bubble_id()
RETURNS TEXT
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT _id
  FROM public.user
  WHERE LOWER(email) = LOWER(auth.jwt() ->> 'email')
  LIMIT 1;
$$;

-- PHASE 2: Apply to User Table
ALTER TABLE public.user ENABLE ROW LEVEL SECURITY;

CREATE POLICY "user_select_own" ON public.user
FOR SELECT TO authenticated
USING (LOWER(email) = LOWER(auth.jwt() ->> 'email'));

CREATE POLICY "user_service_role" ON public.user
FOR ALL TO service_role
USING (true) WITH CHECK (true);

-- PHASE 3: Apply to Proposal Table (Has Denormalized Emails)
CREATE POLICY "proposal_select_guest" ON public.proposal
FOR SELECT TO authenticated
USING (LOWER("Guest email") = LOWER(auth.jwt() ->> 'email'));

CREATE POLICY "proposal_select_host" ON public.proposal
FOR SELECT TO authenticated
USING (LOWER("host email") = LOWER(auth.jwt() ->> 'email'));
```

### 4.3 Tables Priority for RLS Implementation

| Priority | Tables | Reason |
|----------|--------|--------|
| **Critical** | `user`, `account_host`, `account_guest` | Personal data |
| **High** | `proposal`, `listing` | Business-critical |
| **High** | `bookings_leases`, `bookings_stays`, `paymentrecords` | Financial |
| **Medium** | `_message`, `favorite` | User content |
| **Low** | `zat_*`, `os_*` reference tables | Public data |

---

## 5. Security Best Practices

### 5.1 DO

- **Always enable RLS** on tables in public schema
- **Use `SECURITY DEFINER`** with `SET search_path` on helper functions
- **Wrap `auth.uid()` in `(SELECT ...)`** for performance caching
- **Add indexes** on columns used in RLS policies
- **Use service_role** only in Edge Functions, never in frontend
- **Test policies** thoroughly before production deployment

### 5.2 DON'T

- **Never expose** service role key to frontend
- **Never use** `user_metadata` for authorization (users can modify it)
- **Never skip** `WITH CHECK` for INSERT/UPDATE policies
- **Never assume** RLS protects data if not explicitly enabled
- **Never use** complex joins in policies (performance killer)

### 5.3 Performance Optimization

```sql
-- GOOD: Cached function result
CREATE POLICY "example"
ON my_table
FOR SELECT TO authenticated
USING ((SELECT auth.uid()) = user_id);  -- 95% faster!

-- BAD: Re-evaluated per row
CREATE POLICY "example"
ON my_table
FOR SELECT TO authenticated
USING (auth.uid() = user_id);  -- Called for EVERY row
```

---

## 6. Verification Queries

After implementing RLS, verify with:

```sql
-- Check RLS status on all tables
SELECT
  schemaname,
  tablename,
  rowsecurity AS rls_enabled
FROM pg_tables
WHERE schemaname = 'public'
ORDER BY tablename;

-- View all policies
SELECT
  tablename,
  policyname,
  cmd AS operation,
  roles,
  qual AS using_expression,
  with_check
FROM pg_policies
WHERE schemaname = 'public'
ORDER BY tablename;

-- Test current user resolution
SELECT auth.jwt() ->> 'email' AS current_email;
SELECT public.current_user_bubble_id() AS current_bubble_id;
```

---

## 7. Existing Documentation

The following plans have been prepared for Split Lease RLS implementation:

| Document | Purpose |
|----------|---------|
| `20251210074314_AUTH_USER_IDENTIFIERS_RLS_ANALYSIS.md` | Identity mapping analysis |
| `20251210_RLS_DATABASE_CONTEXT.md` | Current database state |
| `20251210_USER_LEVEL_RLS_IMPLEMENTATION_PLAN.md` | Comprehensive 6-week plan |
| `20251210_SIMPLIFIED_RLS_IMPLEMENTATION_PLAN.md` | Streamlined 2-week plan |

---

## Conclusion

Row Level Security based on authenticated users is not only possible but is the **gold standard** for securing data in Supabase. For Split Lease specifically:

1. **Current State**: Critical security gap with 65+ unprotected tables
2. **Recommended Approach**: Email-based RLS with helper function for Bubble ID resolution
3. **Implementation Effort**: ~8-20 hours depending on chosen approach
4. **Risk Mitigation**: Service role bypass ensures Edge Functions continue working

The existing implementation plans provide detailed SQL migrations ready for deployment.

---

**Document Version**: 1.0
**Analysis Depth**: Comprehensive
**Recommendation**: Proceed with Simplified RLS Implementation Plan
