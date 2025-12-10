# Bubble-Migrated Schema: Ownership/Creator Relationship Analysis

**Date:** 2025-12-10
**Purpose:** Understand how tables reference their "creator" or "owner" for RLS implementation

---

## Executive Summary

The Bubble-migrated schema uses a **two-tier ownership model**:
1. **Guests** are referenced directly via `user._id`
2. **Hosts** are referenced via `account_host._id` (which links to `user._id` through `account_host.User`)

There is **NO `account_guest` table** - guests are tracked directly in the `user` table.

---

## Key Findings

### 1. Ownership/Creator Columns Across Key Tables

| Table | Column | Data Type | Purpose |
|-------|--------|-----------|---------|
| `listing` | `Created By` | text | Links to `user._id` |
| `listing` | `Host / Landlord` | text | Links to `account_host._id` |
| `listing` | `Host email` | text | Denormalized email |
| `listing` | `users with permission` | jsonb | Array of user IDs with access |
| `proposal` | `Created By` | text | Links to `user._id` |
| `proposal` | `Guest` | text | **Links directly to `user._id`** |
| `proposal` | `Guest email` | text | Denormalized email |
| `proposal` | `Host - Account` | text | Links to `account_host._id` |
| `proposal` | `host email` | text | Denormalized email |
| `bookings_leases` | `Created By` | text | Links to `user._id` |
| `bookings_leases` | `Guest` | text | Links to `user._id` |
| `bookings_leases` | `Host` | text | Links to `account_host._id` |
| `bookings_stays` | `Created By` | text | Links to `user._id` |
| `bookings_stays` | `Guest` | text | Links to `user._id` |
| `bookings_stays` | `Host` | text | Links to `account_host._id` |
| `_message` | `Created By` | text | Links to `user._id` |
| `_message` | `-Guest User` | text | Links to `user._id` |
| `_message` | `-Host User` | text | Links to `user._id` |
| `_message` | `-Originator User` | text | Links to `user._id` |
| `housemanual` | `Created By` | text | Links to `user._id` |
| `housemanual` | `Host` | text | Links to `account_host._id` |
| `mainreview` | `Created By` | text | Links to `user._id` |
| `paymentrecords` | `Created By` | text | Links to `user._id` |
| `datechangerequest` | `Created By` | text | Links to `user._id` |

---

### 2. Relationship Patterns (Verified with Sample Data)

#### Pattern A: Guest Relationships (Direct to `user._id`)

```
proposal.Guest = user._id
```

**Sample Data Verification:**
| proposal.Guest | user._id | Emails Match |
|----------------|----------|--------------|
| `1751052526471x730004712227235700` | `1751052526471x730004712227235700` | Yes (splitleasesharath+2641@gmail.com) |
| `1689183713781x221643516035888740` | `1689183713781x221643516035888740` | Yes (tech+new@gmail.com) |
| `1694009563154x205736137832370980` | `1694009563154x205736137832370980` | Yes (splitleasejacques@gmail.com) |

**Conclusion:** `proposal.Guest` links **directly** to `user._id`.

---

#### Pattern B: Host Relationships (Via `account_host`)

```
proposal."Host - Account" = account_host._id
account_host.User = user._id
```

**Sample Data Verification:**
| proposal."Host - Account" | account_host._id | account_host.User | user._id | Emails Match |
|---------------------------|------------------|-------------------|----------|--------------|
| `1701179770838x960504318282747900` | `1701179770838x960504318282747900` | `1701179770076x101444346184731860` | `1701179770076x101444346184731860` | Yes (robertschmertzler@outlook.com) |
| `1642603569798x394377109560468700` | `1642603569798x394377109560468700` | `1642603569264x277287068228452500` | `1642603569264x277287068228452500` | Yes (tech+fred5@rtcbook.com) |

**Conclusion:** Host ownership requires a **JOIN through `account_host`**.

---

#### Pattern C: Listing Ownership (Mixed)

```sql
-- Some listings: Host / Landlord = account_host._id
-- Some listings: Host / Landlord = user._id (when Created By = Host / Landlord)
```

**Sample Data Shows Two Patterns:**

| listing_id | Host / Landlord | Created By | account_host match? | user match? |
|------------|-----------------|------------|---------------------|-------------|
| `1765300389292x...` | `1764956538168x...` | `1764956538168x...` | No | Yes (same as Created By) |
| `1637349440736x...` | `1642603569798x...` | `1584738152510x...` | Yes | No |

**Conclusion:** `listing."Host / Landlord"` can be either:
- `account_host._id` (older listings, admin-created)
- `user._id` (newer listings where creator = host)

---

### 3. User Table Structure

The `user` table has **no direct Supabase auth UUID column**. Key columns:

| Column | Type | Purpose |
|--------|------|---------|
| `_id` | text | Bubble unique ID (primary identifier) |
| `email` | text | User email address |
| `authentication` | jsonb | Bubble auth metadata (not Supabase auth) |
| `Account - Host / Landlord` | text | Links to `account_host._id` if user is a host |
| `Type - User Current` | text | Current user type (guest/host) |
| `Type - User Signup` | text | Original signup type |

---

### 4. Account Host Table Structure

| Column | Type | Purpose |
|--------|------|---------|
| `_id` | text | Bubble unique ID |
| `User` | text | Links to `user._id` |
| `Created By` | text | Links to `user._id` |
| `Listings` | jsonb | Array of listing IDs |

---

## RLS Implementation Strategy

### The Auth-to-User Bridge Problem

Currently, there's no direct link between `auth.users.id` (Supabase UUID) and `user._id` (Bubble ID).

**Options:**

1. **Add `auth_uuid` column to `user` table** - Store Supabase auth UUID
2. **Create mapping table** - `user_auth_mapping(auth_uuid, bubble_user_id)`
3. **Use email matching** - `auth.users.email = user.email` (already denormalized)

**Recommended:** Option 3 (email matching) for simplicity since emails are already present.

---

### Simplified RLS Policies

#### For Guest Access (Direct Pattern):
```sql
-- User can see their own proposals as guest
CREATE POLICY "guest_own_proposals" ON proposal
FOR SELECT USING (
  "Guest email" = auth.jwt()->>'email'
);
```

#### For Host Access (Via account_host):
```sql
-- User can see proposals for their listings as host
CREATE POLICY "host_own_proposals" ON proposal
FOR SELECT USING (
  "host email" = auth.jwt()->>'email'
);
```

#### Alternative Using User Table Join:
```sql
-- Get current user's bubble _id
CREATE OR REPLACE FUNCTION get_current_user_bubble_id()
RETURNS text AS $$
  SELECT _id FROM public.user WHERE email = auth.jwt()->>'email' LIMIT 1;
$$ LANGUAGE sql SECURITY DEFINER STABLE;

-- Then use in policies
CREATE POLICY "guest_own_proposals" ON proposal
FOR SELECT USING (
  "Guest" = get_current_user_bubble_id()
);
```

---

## Relationship Diagram

```
┌─────────────────┐
│   auth.users    │
│  (Supabase)     │
│                 │
│  id (UUID)      │
│  email          │◄─────────────────────────────────────┐
└────────┬────────┘                                      │
         │ email = email                                 │
         ▼                                               │
┌─────────────────┐          ┌──────────────────┐       │
│     user        │          │   account_host   │       │
│  (Bubble)       │◄─────────│                  │       │
│                 │  User    │  _id             │       │
│  _id            │          │  User ──────────►│       │
│  email ─────────┼──────────┼──────────────────┼───────┘
│  Account - Host │──────────►  _id             │
└────────┬────────┘          └────────┬─────────┘
         │                            │
         │ Guest                      │ Host - Account
         │                            │ Host / Landlord
         ▼                            ▼
┌─────────────────────────────────────────────────┐
│                    proposal                      │
│                                                  │
│  Guest ─────────────► user._id                  │
│  Guest email ────────► user.email               │
│  Host - Account ─────► account_host._id         │
│  host email ─────────► user.email (via ah)      │
└─────────────────────────────────────────────────┘
```

---

## Summary Table: How to Find Owner

| Table | Guest Owner | Host Owner |
|-------|-------------|------------|
| `proposal` | `Guest` = `user._id` | `Host - Account` = `account_host._id` → `account_host.User` = `user._id` |
| `listing` | N/A | `Host / Landlord` = `account_host._id` OR `user._id` |
| `bookings_leases` | `Guest` = `user._id` | `Host` = `account_host._id` |
| `bookings_stays` | `Guest` = `user._id` | `Host` = `account_host._id` |
| `_message` | `-Guest User` = `user._id` | `-Host User` = `user._id` |
| `housemanual` | N/A | `Host` = `account_host._id` |

---

## Recommendations

1. **Use email-based RLS** for simplicity (emails are denormalized on most tables)
2. **Create helper function** `get_current_user_bubble_id()` for complex queries
3. **For listings**, handle the dual pattern (`account_host._id` OR `user._id`)
4. **Consider adding `auth_uuid`** to `user` table for future-proofing

---

## Files Referenced

- Database schema: All tables in `public` schema
- Related docs: `.claude/plans/Documents/20251209*_RLS_*.md` (previous RLS analysis)
