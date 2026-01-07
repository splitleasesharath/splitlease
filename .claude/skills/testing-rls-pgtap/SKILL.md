---
name: testing-rls-pgtap
description: Test Supabase Row-Level Security policies using pgTAP to verify multi-tenant data isolation. Use this skill when implementing or modifying RLS policies, adding new tables with user-scoped data, or auditing security for marketplace applications. Ensures sellers only see their listings, buyers only their bookings, and prevents cross-tenant data leakage.
license: MIT
---

This skill guides testing of PostgreSQL Row-Level Security (RLS) policies using pgTAP, the PostgreSQL unit testing framework. RLS is the security foundation for multi-tenant marketplaces—broken RLS means users can see or modify other users' data.

## When to Use This Skill

- Creating new tables with user-scoped data (listings, bookings, messages)
- Modifying existing RLS policies
- Adding new roles or permission levels
- Security audits before deployment
- Debugging data visibility issues

## Prerequisites

```sql
-- Enable pgTAP extension (run once per database)
create extension if not exists pgtap with schema extensions;
```

## Core Testing Pattern

Every RLS test follows this structure:

```sql
begin;
select plan(N);  -- N = number of assertions

-- 1. Set up test context (simulate authenticated user)
set local role authenticated;
set local request.jwt.claim.sub = 'user-uuid-here';

-- 2. Run assertions
select results_eq(...);
select is(...);

-- 3. Finish and rollback
select * from finish();
rollback;
```

The `rollback` at the end ensures tests don't pollute the database.

## Essential pgTAP Assertions

| Function | Purpose | Example |
|----------|---------|---------|
| `results_eq(query, expected_array, description)` | Verify query returns exact rows | `results_eq('select id from listings', ARRAY[1,2,3], 'returns 3 listings')` |
| `is(value, expected, description)` | Compare single values | `is(count, 0, 'no unauthorized access')` |
| `isnt(value, unexpected, description)` | Verify value differs | `isnt(count, 0, 'seller has listings')` |
| `ok(boolean, description)` | Assert condition is true | `ok(count > 0, 'has access')` |
| `throws_ok(query, error_code, description)` | Verify query throws error | `throws_ok('delete from users', '42501', 'cannot delete users')` |

## Testing Patterns for Split Lease

### Pattern 1: Seller Can Only See Own Listings

```sql
begin;
select plan(3);

-- Create two test sellers
set local role postgres;
insert into auth.users (id, email) values 
  ('seller-aaa', 'seller-a@test.com'),
  ('seller-bbb', 'seller-b@test.com');

insert into public.listings (id, title, seller_id) values
  ('listing-1', 'Downtown Room', 'seller-aaa'),
  ('listing-2', 'Suburb House', 'seller-aaa'),
  ('listing-3', 'Beach Condo', 'seller-bbb');

-- Test as Seller A
set local role authenticated;
set local request.jwt.claim.sub = 'seller-aaa';

-- Should see only their 2 listings
select is(
  (select count(*)::int from listings),
  2,
  'Seller A sees exactly 2 listings'
);

-- Should not see Seller B's listing
select is(
  (select count(*)::int from listings where id = 'listing-3'),
  0,
  'Seller A cannot see Seller B listing'
);

-- Verify correct listings returned
select results_eq(
  'select id from listings order by id',
  ARRAY['listing-1', 'listing-2'],
  'Returns only Seller A listings'
);

select * from finish();
rollback;
```

### Pattern 2: Buyers See Only Their Bookings

```sql
begin;
select plan(2);

set local role postgres;
insert into auth.users (id, email) values 
  ('buyer-aaa', 'buyer-a@test.com'),
  ('buyer-bbb', 'buyer-b@test.com');

insert into public.bookings (id, listing_id, buyer_id, status) values
  ('booking-1', 'listing-x', 'buyer-aaa', 'confirmed'),
  ('booking-2', 'listing-y', 'buyer-bbb', 'pending');

-- Test as Buyer A
set local role authenticated;
set local request.jwt.claim.sub = 'buyer-aaa';

select is(
  (select count(*)::int from bookings),
  1,
  'Buyer A sees only their booking'
);

select is(
  (select id from bookings limit 1),
  'booking-1',
  'Buyer A sees correct booking'
);

select * from finish();
rollback;
```

### Pattern 3: Testing INSERT Policies

```sql
begin;
select plan(2);

set local role postgres;
insert into auth.users (id, email) values ('user-aaa', 'user@test.com');

set local role authenticated;
set local request.jwt.claim.sub = 'user-aaa';

-- User can create listing for themselves
select lives_ok(
  $$insert into listings (title, seller_id) values ('My Room', 'user-aaa')$$,
  'User can create own listing'
);

-- User cannot create listing for another user
select throws_ok(
  $$insert into listings (title, seller_id) values ('Fake', 'other-user')$$,
  '42501',  -- insufficient_privilege
  'Cannot create listing for another user'
);

select * from finish();
rollback;
```

### Pattern 4: Testing UPDATE Policies

```sql
begin;
select plan(2);

set local role postgres;
insert into auth.users (id, email) values 
  ('seller-aaa', 'seller@test.com');
insert into listings (id, title, seller_id, price) values
  ('listing-1', 'My Room', 'seller-aaa', 100),
  ('listing-2', 'Other Room', 'other-seller', 200);

set local role authenticated;
set local request.jwt.claim.sub = 'seller-aaa';

-- Can update own listing
select lives_ok(
  $$update listings set price = 150 where id = 'listing-1'$$,
  'Seller can update own listing'
);

-- Cannot update other listing (RLS silently filters, returns 0 rows)
select is(
  (select count(*)::int from (
    update listings set price = 999 where id = 'listing-2' returning id
  ) as updated),
  0,
  'Cannot update other seller listing'
);

select * from finish();
rollback;
```

### Pattern 5: Testing DELETE Policies

```sql
begin;
select plan(2);

set local role postgres;
insert into auth.users (id, email) values ('seller-aaa', 'seller@test.com');
insert into listings (id, seller_id) values 
  ('listing-1', 'seller-aaa'),
  ('listing-2', 'other-seller');

set local role authenticated;
set local request.jwt.claim.sub = 'seller-aaa';

-- Can delete own
select is(
  (select count(*)::int from (
    delete from listings where id = 'listing-1' returning id
  ) as deleted),
  1,
  'Seller can delete own listing'
);

-- Cannot delete other (0 rows affected)
select is(
  (select count(*)::int from (
    delete from listings where id = 'listing-2' returning id
  ) as deleted),
  0,
  'Cannot delete other seller listing'
);

select * from finish();
rollback;
```

### Pattern 6: Testing Role-Based Access (Admin vs User)

```sql
begin;
select plan(3);

set local role postgres;
insert into auth.users (id, email, raw_app_meta_data) values 
  ('admin-aaa', 'admin@test.com', '{"role": "admin"}'),
  ('user-bbb', 'user@test.com', '{"role": "user"}');
insert into listings (id, seller_id) values 
  ('listing-1', 'seller-xxx'),
  ('listing-2', 'seller-yyy');

-- Admin sees all listings
set local role authenticated;
set local request.jwt.claim.sub = 'admin-aaa';
set local request.jwt.claims = '{"app_metadata": {"role": "admin"}}';

select is(
  (select count(*)::int from listings),
  2,
  'Admin sees all listings'
);

-- Regular user sees none (not their listings)
set local request.jwt.claim.sub = 'user-bbb';
set local request.jwt.claims = '{"app_metadata": {"role": "user"}}';

select is(
  (select count(*)::int from listings),
  0,
  'Regular user sees no listings (not seller)'
);

select * from finish();
rollback;
```

## Running Tests

### Via Supabase CLI

```bash
# Run all pgTAP tests in supabase/tests directory
supabase test db

# Run specific test file
supabase test db --file supabase/tests/rls_listings.sql
```

### Via psql

```bash
psql "$DATABASE_URL" -f tests/rls_listings.sql
```

### In CI/CD (GitHub Actions)

```yaml
- name: Run RLS Tests
  run: |
    supabase start
    supabase test db
```

## File Organization

```
supabase/
├── migrations/
│   ├── 20250101000000_create_listings.sql
│   └── 20250101000001_rls_policies.sql
└── tests/
    ├── rls_listings.sql      # Listing table RLS tests
    ├── rls_bookings.sql      # Booking table RLS tests
    ├── rls_messages.sql      # Message table RLS tests
    └── rls_admin_access.sql  # Admin override tests
```

## Anti-Patterns to Avoid

| ❌ Anti-Pattern | ✅ Correct Approach |
|----------------|---------------------|
| Testing without `rollback` | Always end with `rollback` to prevent test data pollution |
| Hardcoding UUIDs used in production | Generate test-specific UUIDs or use clearly fake ones |
| Only testing SELECT policies | Test all CRUD operations: SELECT, INSERT, UPDATE, DELETE |
| Testing only happy path | Test unauthorized access attempts explicitly |
| Skipping edge cases | Test: no data, null values, role transitions |
| Testing RLS only in pgTAP | Also test via application code (see `testing-supabase-auth` skill) |

## Helper Function for JWT Claims

Create a helper to reduce boilerplate:

```sql
-- migrations/20250101000000_test_helpers.sql
create or replace function test_helpers.set_auth_user(user_id uuid, role text default 'user')
returns void as $$
begin
  perform set_config('role', 'authenticated', true);
  perform set_config('request.jwt.claim.sub', user_id::text, true);
  perform set_config('request.jwt.claims', 
    json_build_object('app_metadata', json_build_object('role', role))::text, 
    true
  );
end;
$$ language plpgsql;

-- Usage in tests:
select test_helpers.set_auth_user('seller-aaa', 'seller');
```

## Debugging Failed Tests

When tests fail:

1. **Check policy definition**: `\d listings` then `select * from pg_policies where tablename = 'listings'`
2. **Test policy expression directly**: Run the USING clause as a standalone query
3. **Verify JWT claims are set**: `select current_setting('request.jwt.claim.sub', true)`
4. **Check role**: `select current_user, current_role`

## Critical Security Checklist

Before deploying RLS policies:

- [ ] SELECT: Users can only read their own data
- [ ] INSERT: Users can only create records for themselves
- [ ] UPDATE: Users can only modify their own records
- [ ] DELETE: Users can only delete their own records
- [ ] Admin bypass: Admins have appropriate elevated access
- [ ] Service role: Backend can access all data when needed
- [ ] Anon role: Unauthenticated access is properly restricted
- [ ] Cross-tenant: No way to access other users' data via joins or subqueries
