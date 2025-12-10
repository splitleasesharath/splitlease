# Schema Comparison: `listing` vs `listing_trial` Tables

**Date**: 2025-12-05
**Purpose**: Detailed analysis of structural differences between the two listing table implementations in Supabase

---

## Executive Summary

Both tables have nearly identical schemas with 159+ shared columns. However, key differences exist in:

1. **Primary Key Strategy**: `listing` uses `_id` (from Bubble); `listing_trial` uses a Supabase-generated `id`
2. **Data Type Variations**: One field differs in type (`Features - Qty Bathrooms`)
3. **Unique Constraints**: `listing_trial` has additional uniqueness constraint on `_id`
4. **New Columns in `listing_trial`**: 9 additional columns supporting enhanced functionality
5. **Default Values**: `listing_trial` has more default value configurations
6. **Foreign Key Constraints**: Only present in `listing`, not in `listing_trial`

---

## Detailed Findings

### 1. PRIMARY KEY COMPARISON

#### listing table
- **Primary Key**: `_id` (text, NOT NULL)
- **Type**: Bubble-supplied identifier
- **Default**: None
- **Pattern**: Unique constraint on `bubble_id`

#### listing_trial table
- **Primary Key**: `id` (text, NOT NULL)
- **Type**: Supabase-generated using `generate_bubble_id()`
- **Default**: `generate_bubble_id()`
- **Also Contains**: `_id` (text, NOT NULL) as a regular column with unique constraint
- **Additional**: UNIQUE constraint on `_id`

**Implication**: `listing_trial` has dual-key approach: Supabase-managed `id` + Bubble-imported `_id` with uniqueness

---

### 2. COLUMN TYPE DIFFERENCES

Only **ONE** column differs in data type:

| Column | listing | listing_trial | Impact |
|--------|---------|---------------|--------|
| Features - Qty Bathrooms | integer | numeric | `numeric` allows decimals (e.g., 2.5 bathrooms) |

All other 159+ columns maintain identical types.

---

### 3. NOT NULL CONSTRAINT DIFFERENCES

#### Constraints ONLY in `listing_trial` (not in `listing`):
- `id` - NOT NULL (Supabase primary key)
- `address_validated` - NOT NULL (but has default: false)
- `weekly_pattern` - NOT NULL (but nullable in listing)
- `subsidy_agreement` - NOT NULL (but has default: false)

#### Constraints in BOTH tables:
- `_id` - NOT NULL
- `Created By` - NOT NULL
- `Created Date` - NOT NULL
- `Days Available (List of Days)` - NOT NULL
- `Features - Trial Periods Allowed` - NOT NULL
- `Maximum Weeks` - NOT NULL
- `Minimum Nights` - NOT NULL
- `Modified Date` - NOT NULL
- `NEW Date Check-in Time` - NOT NULL
- `NEW Date Check-out Time` - NOT NULL
- `Nights Available (List of Nights)` - NOT NULL
- `Preferred Gender` - NOT NULL
- `Weeks offered` - NOT NULL

---

### 4. UNIQUE CONSTRAINTS

#### listing table
- Primary Key: `_id`
- Unique: `bubble_id`

#### listing_trial table
- Primary Key: `id`
- Unique: `bubble_id`
- Unique: `_id` (NEW)

**Interpretation**: `listing_trial` enforces uniqueness on the imported Bubble ID at the database level

---

### 5. FOREIGN KEY CONSTRAINTS

#### listing table
- `fk_listing_hood` - References hood lookup table
- `fk_listing_borough` - References borough lookup table

#### listing_trial table
- **NONE** - No foreign key constraints defined

**Implication**: `listing_trial` is independent from geographic lookup tables; `listing` enforces referential integrity

---

### 6. NEW COLUMNS IN `listing_trial` (Not in `listing`)

```
1. id                          - text, NOT NULL, DEFAULT generate_bubble_id()
2. address_validated           - boolean, NOT NULL, DEFAULT false
3. weekly_pattern              - text
4. subsidy_agreement           - boolean, NOT NULL, DEFAULT false
5. nightly_pricing             - jsonb
6. ideal_min_duration          - integer
7. ideal_max_duration          - integer
8. agreed_to_terms             - boolean, NOT NULL, DEFAULT false
9. optional_notes              - text
10. previous_reviews_link       - text
11. form_metadata               - jsonb
12. source_type                 - text, NOT NULL, DEFAULT 'bubble-sync'::text
13. Location - Coordinates      - jsonb (moved from late position in listing)
```

**What They Enable**:
- **address_validated**: Track if address has been validated
- **weekly_pattern**: Store repeating availability patterns
- **subsidy_agreement**: Flag for subsidized listings
- **nightly_pricing**: Store complex pricing structures (jsonb)
- **ideal_min_duration** / **ideal_max_duration**: Define preferred rental duration ranges
- **agreed_to_terms**: Track user consent
- **optional_notes**: Additional context from users
- **previous_reviews_link**: Link to external review history
- **form_metadata**: Capture form completion metadata (timestamps, etc.)
- **source_type**: Track data origin ('bubble-sync', etc.)

---

### 7. DEFAULT VALUE DIFFERENCES

#### listing table defaults:
```sql
created_at        DEFAULT now()
updated_at        DEFAULT now()
pending            DEFAULT false
market_strategy    DEFAULT 'private'::text
```

#### listing_trial table defaults:
```sql
created_at         DEFAULT now()
updated_at         DEFAULT now()
address_validated  DEFAULT false
subsidy_agreement  DEFAULT false
agreed_to_terms    DEFAULT false
pending             DEFAULT false
source_type        DEFAULT 'bubble-sync'::text
market_strategy    DEFAULT 'private'::text
id                 DEFAULT generate_bubble_id()
```

**Additional defaults in listing_trial**: address_validated, subsidy_agreement, agreed_to_terms, source_type

---

### 8. COLUMN ORDERING

#### listing table column sequence:
`_id` → shared columns → pricing columns → timestamps → additional fields → bubble_id

#### listing_trial table column sequence:
`id` → `_id` → shared columns → pricing columns → timestamps → Location - Coordinates → new fields → source_type → bubble_id

**Change**: Location - Coordinates moved to immediately after timestamps in `listing_trial`

---

## Summary of Key Differences

| Aspect | listing | listing_trial |
|--------|---------|---------------|
| **Primary Key** | `_id` (text) | `id` (text, auto-generated) |
| **Total Columns** | 150 | 163 |
| **New Columns** | - | 13 |
| **Data Type Variance** | 0 | 1 (Features - Qty Bathrooms: integer vs numeric) |
| **Foreign Keys** | 2 (hood, borough) | 0 |
| **Unique Constraints** | 1 (`bubble_id`) | 2 (`bubble_id`, `_id`) |
| **NOT NULL Fields** | 13 | 16 |
| **Default Values** | 4 | 9 |

---

## Strategic Assessment

**listing_trial** appears to be a refactored version designed for:

1. **Better Data Governance**: Supabase-managed primary key (`id`) instead of relying solely on Bubble IDs
2. **Enhanced Metadata Tracking**: New fields for validation status, agreements, source tracking, and form metadata
3. **Pricing Flexibility**: Support for decimal bathrooms and complex JSON pricing structures
4. **Improved Availability Management**: Repeating patterns for weekly availability
5. **Independence from Geographic Hierarchy**: Removed foreign key dependencies on borough/hood tables
6. **User Consent Tracking**: Explicit fields for terms agreement and validation

---

## Migration Implications

If migrating data from `listing` to `listing_trial`:

1. **Handle `id` generation**: Use `generate_bubble_id()` or generate UUIDs
2. **Map `_id` values**: These will be duplicated in both primary key position and as a regular column
3. **Populate new fields**: Provide sensible defaults or derive from existing data:
   - `address_validated`: Probably `false` for imported data
   - `subsidy_agreement`: Check if available in original `listing` data
   - `agreed_to_terms`: Likely `false` for imported records
   - `weekly_pattern`: Can be derived from Days Available
4. **Set source_type**: Mark as `'bubble-sync'` for migrated records
5. **Remove foreign key validation**: If copying data, bypass borough/hood validation
6. **Update Location - Coordinates**: Ensure this field is properly set during migration

---

## Files Referenced

- Supabase Project: Split Lease
- Tables Analyzed:
  - `listing` (public.listing)
  - `listing_trial` (public.listing_trial)
- Analysis Tool: Supabase MCP SQL queries
- Schema Query: information_schema.columns and information_schema.table_constraints

---

**Document Status**: Complete - Ready for implementation or further analysis
