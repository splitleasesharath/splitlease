# Junction Tables Schema Convention

## Overview

All junction tables (many-to-many relationship tables) in this project **MUST** be created under the `junctions` schema in Supabase, NOT in the `public` schema.

## Schema Structure

```
Supabase Database
├── public              # Entity tables (users, listings, proposals, etc.)
├── junctions           # Junction/pivot tables ONLY
├── auth                # Supabase Auth (managed)
└── storage             # Supabase Storage (managed)
```

## Current Junction Tables

| Table | Purpose |
|-------|---------|
| `junctions.thread_message` | Links threads ↔ messages |
| `junctions.thread_participant` | Links threads ↔ users |
| `junctions.user_guest_reason` | Links users ↔ guest reasons |
| `junctions.user_lease` | Links users ↔ leases |
| `junctions.user_listing_favorite` | Links users ↔ favorited listings |
| `junctions.user_permission` | Links users ↔ permissions |
| `junctions.user_preferred_hood` | Links users ↔ preferred neighborhoods |
| `junctions.user_proposal` | Links users ↔ proposals |
| `junctions.user_rental_type_search` | Links users ↔ rental type searches |
| `junctions.user_storage_item` | Links users ↔ storage items |

## Rules for Junction Tables

### DO
- Always create junction tables in the `junctions` schema
- Name junction tables as `{entity1}_{entity2}` (alphabetical or logical order)
- Include foreign keys to both related tables
- Add appropriate indexes for query performance
- Grant necessary permissions (usually same as public schema tables)

### DON'T
- Create junction tables in `public` schema
- Mix entity data with junction table data (junctions should ONLY contain foreign keys + metadata)
- Forget to add RLS policies if the table contains user-sensitive relationships

## Creating a New Junction Table

```sql
-- Example: Creating a new junction table
CREATE TABLE junctions.listing_amenity (
    listing_id UUID NOT NULL REFERENCES public.listings(id) ON DELETE CASCADE,
    amenity_id UUID NOT NULL REFERENCES public.amenities(id) ON DELETE CASCADE,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    PRIMARY KEY (listing_id, amenity_id)
);

-- Add indexes for reverse lookups
CREATE INDEX idx_listing_amenity_amenity_id ON junctions.listing_amenity(amenity_id);

-- Grant permissions (match your public schema grants)
GRANT SELECT, INSERT, DELETE ON junctions.listing_amenity TO authenticated;
```

## Querying Junction Tables

Always use the fully qualified name when querying:

```sql
-- Correct
SELECT * FROM junctions.user_listing_favorite WHERE user_id = $1;

-- Also correct (with search_path set)
SET search_path TO public, junctions;
SELECT * FROM user_listing_favorite WHERE user_id = $1;
```

## When to Use Junction Tables

Use a junction table when:
- Two entities have a **many-to-many** relationship
- You need to store **metadata** about the relationship (e.g., timestamps, status)
- The relationship can be **created/destroyed independently** of the entities

Do NOT use a junction table when:
- The relationship is **one-to-many** (use a foreign key on the "many" side)
- The relationship is **one-to-one** (embed in one of the tables)
- The "junction" would only ever have one row per entity (that's just a foreign key)

---

**Last Updated**: 2025-12-17
