# User Table Junction Table Analysis

**Date**: 2025-12-16
**Purpose**: Analyze `public.user` table and related tables to plan junction table creation for normalizing many-to-many relationships

---

## 1. Tables in Public Schema

The following tables currently exist in the `public` schema:

| Table Name | Rows | RLS Enabled | Description |
|------------|------|-------------|-------------|
| `_message` | 6,244 | No | Messages in conversations |
| `account_host` | 885 | No | Host account details |
| `bookings_leases` | 197 | No | Lease/booking records |
| `bookings_stays` | 17,601 | No | Individual stay records |
| `co_hostrequest` | 26 | No | Co-host requests |
| `dailycounter` | 205 | No | Daily counters |
| `datacollection_searchlogging` | 1,682 | No | Search logs |
| `datechangerequest` | 99 | No | Date change requests |
| `documentssent` | 13 | No | Sent documents |
| `email` | 0 | No | Email records |
| `emailtemplate_postmark_` | 15 | No | Email templates |
| `emergencyreports` | 34 | No | Emergency reports |
| `experiencesurvey` | 2 | No | Experience surveys |
| `fieldsforleasedocuments` | 14 | No | Lease document fields |
| `file` | 128 | No | File records |
| `hostrestrictions` | 33 | No | Host restrictions |
| `housemanual` | 195 | No | House manuals |
| `housemanualphotos` | 4 | No | House manual photos |
| `informationaltexts` | 84 | No | Informational texts |
| `internalfiles` | 2 | No | Internal files |
| `invoices` | 2 | No | Invoices |
| `knowledgebase` | 56 | No | Knowledge base articles |
| `knowledgebaselineitem` | 272 | No | KB line items |
| `listing` | 277 | No | Property listings |
| `listing_photo` | 4,604 | Yes | Listing photos |
| `mailing_list_opt_in` | 39 | No | Mailing list opt-ins |
| `mainreview` | 32 | No | Reviews |
| `multimessage` | 359 | No | Multi-channel messages |
| `narration` | 252 | No | Audio narrations |
| `negotiationsummary` | 375 | No | Negotiation summaries |
| `notificationsettingsos_lists_` | 126 | No | Notification settings |
| `proposal` | ~500+ | No | Rental proposals |
| `thread` | ~1000+ | No | Conversation threads |
| `user` | ~2000+ | No | User accounts |
| `visit` | ~500+ | No | House manual visits |

---

## 2. User Table Column Details

The `public.user` table has **107 columns**. Key columns relevant for junction tables:

### Primary Key
- `_id` (text, NOT NULL) - Primary identifier

### JSONB Array Fields (Potential Many-to-Many Relationships)

| Column Name | Data Type | Contains |
|-------------|-----------|----------|
| `Chat - Threads` | jsonb | Array of thread IDs |
| `Favorited Listings` | jsonb | Array of listing IDs |
| `Leases` | jsonb | Array of lease IDs |
| `Listings` | jsonb | Array of listing IDs (owned) |
| `Preferred Hoods` | jsonb | Array of hood/neighborhood IDs |
| `Promo - Codes Seen` | jsonb | Array of promo code IDs |
| `Reasons to Host me` | jsonb | Array of reason IDs |
| `Tasks Completed` | jsonb | Array of task IDs |
| `Users with permission to see sensitive info` | jsonb | Array of user IDs |
| `Message Forwarding Preference(list)` | jsonb | Array of preference IDs |
| `emails-txt-sent` | jsonb | Array of email records |
| `my emails history` | jsonb | Array of email history records |

### TEXT ARRAY Fields
| Column Name | Data Type | Contains |
|-------------|-----------|----------|
| `Proposals List` | ARRAY (text[]) | Array of proposal IDs |

### Foreign Key References (Single Values)
| Column Name | Data Type | References |
|-------------|-----------|------------|
| `Account - Host / Landlord` | text | account_host._id |
| `Notification Settings OS(lisits)` | text | notificationsettingsos_lists_._id |
| `Rental Application` | text | rental application record |
| `Saved Search` | text | saved search record |
| `Curated listing page` | text | curated page record |

---

## 3. Existing Junction Tables

**Result**: No existing junction tables found matching patterns:
- `user_%`
- `%_user%`
- `%_junction%`

---

## 4. Related Tables Structure

### 4.1 Thread Table
| Column | Type | Notes |
|--------|------|-------|
| `_id` | text (PK) | Primary key |
| `-Guest User` | text | FK to user |
| `-Host User` | text | FK to user |
| `Listing` | text | FK to listing |
| `Proposal` | text | FK to proposal |
| `Participants` | jsonb | Array of user IDs |
| `Message list` | jsonb | Array of message IDs |

### 4.2 Proposal Table
| Column | Type | Notes |
|--------|------|-------|
| `_id` | text (PK) | Primary key |
| `Guest` | text | FK to user |
| `Host - Account` | text | FK to account_host |
| `Listing` | text | FK to listing |

### 4.3 Visit Table
| Column | Type | Notes |
|--------|------|-------|
| `_id` | text (PK) | Primary key |
| `Created By` | text (NOT NULL) | FK to user |
| `User shared with (guest)` | text | FK to user |
| `house manual` | text | FK to housemanual |
| `Review from Guest` | text | FK to mainreview |

### 4.4 Bookings/Leases Table
| Column | Type | Notes |
|--------|------|-------|
| `_id` | text (PK) | Primary key |
| `Guest` | text | FK to user |
| `Host` | text | FK to user |
| `Listing` | text | FK to listing |
| `Proposal` | text | FK to proposal |
| `Thread` | text | FK to thread |
| `Participants` | jsonb | Array of user IDs |

### 4.5 Main Review Table
| Column | Type | Notes |
|--------|------|-------|
| `_id` | text (PK) | Primary key |
| `Reviewer` | text | FK to user |
| `Reviewee/Target` | text | FK to user |
| `Lease` | text | FK to bookings_leases |
| `Stay` | text | FK to bookings_stays |
| `Visit` | text | FK to visit |

---

## 5. Sample Data Analysis

### Listings field in User table
Sample values show Bubble.io style IDs:
```json
["1764957231545x45695519790456296", "1765100967604x66565896483965000", ...]
```

### Proposals List field
Currently empty arrays `[]` in sampled records.

---

## 6. Recommended Junction Tables

Based on the analysis, the following junction tables should be created:

### Priority 1: Core Many-to-Many Relationships

| Junction Table | Left Table | Right Table | Purpose |
|----------------|------------|-------------|---------|
| `user_thread` | user | thread | User's chat threads |
| `user_listing_favorite` | user | listing | User's favorited listings |
| `user_listing_owned` | user | listing | Host's owned listings |
| `user_lease` | user | bookings_leases | User's leases (as guest/host) |
| `user_proposal` | user | proposal | User's proposals |

### Priority 2: Permission/Access Relationships

| Junction Table | Left Table | Right Table | Purpose |
|----------------|------------|-------------|---------|
| `user_permission` | user | user | Users with sensitive info access |
| `listing_permission` | listing | user | Users with listing access |

### Priority 3: Preference/Configuration

| Junction Table | Left Table | Right Table | Purpose |
|----------------|------------|-------------|---------|
| `user_preferred_hood` | user | zat_geo_hood | Preferred neighborhoods |
| `user_promo_code` | user | promo_code | Promo codes seen |
| `user_task_completed` | user | task | Completed tasks |

### Priority 4: Thread Participants (Complex)

| Junction Table | Left Table | Right Table | Purpose |
|----------------|------------|-------------|---------|
| `thread_participant` | thread | user | Thread participants |
| `lease_participant` | bookings_leases | user | Lease participants |

---

## 7. Junction Table Schema Template

```sql
-- Example: user_listing_favorite
CREATE TABLE public.user_listing_favorite (
    id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
    user_id text NOT NULL REFERENCES public."user"(_id) ON DELETE CASCADE,
    listing_id text NOT NULL REFERENCES public.listing(_id) ON DELETE CASCADE,
    created_at timestamptz DEFAULT now(),
    UNIQUE(user_id, listing_id)
);

-- Indexes for efficient lookups
CREATE INDEX idx_user_listing_favorite_user ON public.user_listing_favorite(user_id);
CREATE INDEX idx_user_listing_favorite_listing ON public.user_listing_favorite(listing_id);
```

---

## 8. Migration Strategy

1. **Create junction tables** with proper foreign keys
2. **Migrate data** from JSONB arrays to junction tables
3. **Create views** that mimic the old JSONB structure for backward compatibility
4. **Update application code** to use junction tables
5. **Deprecate** JSONB array columns (mark as legacy)
6. **Remove** JSONB columns after full migration

---

## 9. Key Observations

1. **No existing junction tables** - All many-to-many relationships are stored as JSONB arrays
2. **Bubble.io IDs** - The `_id` fields use Bubble.io's unique ID format (timestamp + random)
3. **Dual references** - Some tables have both single FK and JSONB array (e.g., Thread has `-Guest User` and `Participants`)
4. **Mixed data types** - Most arrays are JSONB, but `Proposals List` is a native PostgreSQL text array
5. **No RLS on most tables** - Only `listing_photo` has Row Level Security enabled

---

## 10. Files Referenced

- Database schema via Supabase MCP
- Tables: `public.user`, `public.thread`, `public.proposal`, `public.visit`, `public.bookings_leases`, `public.mainreview`, `public.listing`

---

## Next Steps

1. Review this analysis and confirm junction table priorities
2. Create detailed migration plan for each junction table
3. Determine if backward-compatible views are needed
4. Plan data migration scripts
5. Update Edge Functions and frontend code
