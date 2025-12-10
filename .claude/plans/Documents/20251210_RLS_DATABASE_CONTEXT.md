# RLS Database Context Analysis

**Date:** 2025-12-10
**Purpose:** Comprehensive database context for implementing Row Level Security (RLS) policies

---

## 1. Key Table Structures

### 1.1 public.user Table

The `user` table is the central user profile table with **107 columns**. Key columns for RLS:

| Column | Data Type | Nullable | Notes |
|--------|-----------|----------|-------|
| `_id` | text | NO | Primary key (Bubble ID format) |
| `email` | text | YES | User email |
| `email as text` | text | YES | Legacy email field |
| `authentication` | jsonb | NO | Auth data |
| `Account - Host / Landlord` | text | YES | FK to account_host |
| `Toggle - Is Admin` | boolean | YES | Admin flag |
| `user_signed_up` | boolean | NO | Signup completion flag |
| `created_at` | timestamptz | YES | Default: now() |
| `updated_at` | timestamptz | YES | Default: now() |
| `bubble_id` | text | YES | Unique bubble identifier |

**Note:** The `public.user` table uses `_id` (text) as primary key, NOT a UUID. This is different from `auth.users.id` (uuid).

### 1.2 auth.users Table (Supabase Auth)

Standard Supabase auth table with 35 columns. Key columns:

| Column | Data Type | Nullable | Notes |
|--------|-----------|----------|-------|
| `id` | uuid | NO | Primary key, used by `auth.uid()` |
| `email` | varchar | YES | User email |
| `raw_user_meta_data` | jsonb | YES | Custom metadata |
| `raw_app_meta_data` | jsonb | YES | App metadata |
| `created_at` | timestamptz | YES | |
| `is_anonymous` | boolean | NO | Default: false |

### 1.3 public.proposal Table

The proposal table has **104 columns**. Key columns for RLS:

| Column | Data Type | Nullable | Notes |
|--------|-----------|----------|-------|
| `_id` | text | NO | Primary key |
| `Guest` | text | YES | FK to user._id (guest who created proposal) |
| `Guest email` | text | NO | Guest's email |
| `Listing` | text | YES | FK to listing._id |
| `Host - Account` | text | YES | FK to account_host._id |
| `host email` | text | YES | Host's email |
| `Status` | text | NO | Proposal status |
| `Created Date` | timestamptz | NO | |
| `bubble_id` | text | YES | Unique |

### 1.4 public.listing Table

The listing table has **116 columns**. Key columns for RLS:

| Column | Data Type | Nullable | Notes |
|--------|-----------|----------|-------|
| `_id` | text | NO | Primary key |
| `Created By` | text | NO | FK to user._id (creator) |
| `Host / Landlord` | text | YES | FK to account_host._id |
| `Host email` | text | YES | |
| `Active` | boolean | YES | Is listing active |
| `Approved` | boolean | YES | Is listing approved |
| `isForUsability` | boolean | YES | Test listing flag |
| `is private?` | boolean | YES | Private listing flag |
| `bubble_id` | text | YES | Unique |

---

## 2. Current RLS Status

### 2.1 RLS Enabled/Disabled on Key Tables

| Table | RLS Enabled | RLS Forced |
|-------|-------------|------------|
| `user` | **false** | false |
| `proposal` | **true** | false |
| `listing` | **false** | false |
| `account_host` | **false** | false |

**Note:** `account_guest` and `favorite` tables were not found in the query results.

### 2.2 Existing RLS Policies

#### proposal table (4 policies)
```sql
-- Allow anonymous proposal inserts for testing
CREATE POLICY "Allow anonymous proposal inserts for testing" ON proposal
  FOR INSERT TO anon WITH CHECK (true);

-- Allow anonymous to view proposals for testing
CREATE POLICY "Allow anonymous to view proposals for testing" ON proposal
  FOR SELECT TO anon USING (true);

-- Allow authenticated users to insert proposals
CREATE POLICY "Allow authenticated users to insert proposals" ON proposal
  FOR INSERT TO authenticated WITH CHECK ((auth.uid())::text = "Guest");

-- Users can view own proposals
CREATE POLICY "Users can view own proposals" ON proposal
  FOR SELECT TO authenticated USING ((auth.uid())::text = "Guest");
```

#### listing table (1 policy - RLS NOT ENABLED!)
```sql
-- Allow public read access to active listings
CREATE POLICY "Allow public read access to active listings" ON listing
  FOR SELECT TO public USING (("Active" = true) AND ("isForUsability" = false));
```
**WARNING:** This policy exists but RLS is NOT enabled on the listing table!

#### listing_drafts table (4 policies - full CRUD for owners)
```sql
-- Users can view own drafts
USING (auth.uid() = user_id)

-- Users can insert own drafts
WITH CHECK (auth.uid() = user_id)

-- Users can update own drafts
USING (auth.uid() = user_id)

-- Users can delete own drafts
USING (auth.uid() = user_id)
```

#### notification_preferences table (4 policies - full CRUD for owners)
Uses `(auth.uid())::text = user_id` pattern.

---

## 3. Foreign Key Relationships to User Table

Only ONE explicit FK relationship found:

| Table | Column | References |
|-------|--------|------------|
| `notification_preferences` | `user_id` | `user._id` |

**Important:** Many tables reference users through TEXT fields (Bubble ID format) rather than formal FK constraints:
- `proposal.Guest` -> `user._id`
- `listing."Created By"` -> `user._id`
- `account_host.User` -> `user._id`

---

## 4. Security Advisors - Critical Issues

### 4.1 ERROR Level Issues

#### Policy Exists but RLS Disabled (2 tables)
- `public.informationaltexts` - Has policies but RLS not enabled
- `public.listing` - Has policies but RLS not enabled

#### RLS Disabled in Public Schema (62+ tables)
Major tables without RLS:
- `public.user`
- `public.listing`
- `public.account_host`
- `public.bookings_leases`
- `public.bookings_stays`
- `public._message`
- `public.datechangerequest`
- `public.housemanual`
- `public.paymentrecords`
- And many more...

### 4.2 WARN Level Issues

#### Functions with Mutable Search Path (10 functions)
- `update_updated_at_column`
- `update_notification_preferences_updated_at`
- `get_neighborhood_by_zip`
- `generate_bubble_id`
- `update_sync_config_timestamp`
- `update_user_favorites`
- `trigger_sync_queue`
- `get_host_listings`
- `invoke_bubble_sync_processor`
- `invoke_bubble_sync_retry`

#### Leaked Password Protection Disabled
Auth configuration should enable HaveIBeenPwned check.

### 4.3 INFO Level Issues

#### RLS Enabled but No Policies (2 tables)
- `public.sync_config`
- `public.sync_queue`

---

## 5. Key Considerations for RLS Implementation

### 5.1 Identity Mapping Challenge

The system uses TWO identity systems:
1. **Supabase Auth:** `auth.users.id` (uuid)
2. **Bubble Legacy:** `public.user._id` (text, Bubble ID format)

**Current pattern in proposal policies:**
```sql
(auth.uid())::text = "Guest"
```
This assumes the `Guest` field contains the auth.uid() cast to text, which may not be correct for Bubble-synced data.

### 5.2 Recommended Approaches

**Option A: Link auth.users to public.user**
Create a mapping column in `public.user` that stores `auth.users.id`:
```sql
ALTER TABLE public.user ADD COLUMN auth_user_id uuid REFERENCES auth.users(id);
```

**Option B: Use email matching**
```sql
auth.jwt() ->> 'email' = "email as text"
```

**Option C: Store user._id in auth metadata**
Store the Bubble user ID in `raw_user_meta_data` during signup.

### 5.3 Tables Requiring RLS (Priority Order)

1. **Critical (User Data)**
   - `user` - Personal profile data
   - `proposal` - Already has RLS, needs policy review
   - `account_host` - Host account data

2. **High (Financial/Booking)**
   - `bookings_leases` - Lease agreements
   - `bookings_stays` - Stay records
   - `paymentrecords` - Payment data
   - `datechangerequest` - Date change requests

3. **Medium (Communication)**
   - `_message` - Messages between users
   - `multimessage` - Bulk messages

4. **Lower (Reference Data)**
   - Most `os_*` tables - Already have public read policies
   - Most `zat_*` tables - Configuration/reference data

---

## 6. Existing Policy Patterns to Follow

### Pattern 1: Owner Access (listing_drafts)
```sql
CREATE POLICY "policy_name" ON table_name
  FOR ALL TO public
  USING (auth.uid() = user_id);
```

### Pattern 2: Public Read for Active Items (listing)
```sql
CREATE POLICY "policy_name" ON table_name
  FOR SELECT TO public
  USING (("Active" = true) AND (other_condition = false));
```

### Pattern 3: Role-Based Insert (proposal)
```sql
CREATE POLICY "policy_name" ON table_name
  FOR INSERT TO authenticated
  WITH CHECK ((auth.uid())::text = owner_column);
```

### Pattern 4: Service Role Bypass (listing_trial)
```sql
CREATE POLICY "Allow service role full access" ON table_name
  FOR ALL TO service_role
  USING (true) WITH CHECK (true);
```

---

## 7. Remediation Links

- [RLS Disabled in Public](https://supabase.com/docs/guides/database/database-linter?lint=0013_rls_disabled_in_public)
- [Policy Exists RLS Disabled](https://supabase.com/docs/guides/database/database-linter?lint=0007_policy_exists_rls_disabled)
- [Function Search Path Mutable](https://supabase.com/docs/guides/database/database-linter?lint=0011_function_search_path_mutable)
- [RLS Enabled No Policy](https://supabase.com/docs/guides/database/database-linter?lint=0008_rls_enabled_no_policy)

---

## 8. Next Steps

1. **Determine identity mapping strategy** - How to link `auth.uid()` to `user._id`
2. **Enable RLS on listing table** - Already has policy, just needs `ALTER TABLE listing ENABLE ROW LEVEL SECURITY`
3. **Enable RLS on informationaltexts** - Same situation
4. **Design policies for user table** - Users should only see their own profile
5. **Design policies for account_host** - Hosts should only see their own account
6. **Review proposal policies** - Current policies may have identity mismatch issues
7. **Create policies for booking tables** - Access based on guest/host relationship
8. **Add policies to sync_config and sync_queue** - Currently RLS enabled but no policies
