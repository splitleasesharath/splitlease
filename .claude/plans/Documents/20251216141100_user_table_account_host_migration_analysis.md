# User Table Account Host Migration Analysis

**Date**: 2025-12-16
**Analysis Type**: Database Schema Investigation
**Focus**: account_host fields migration to user table

---

## Query Results

### Column Structure in User Table

Based on the database schema query, the following columns from the original `account_host` table exist in the `user` table:

| Column Name | Data Type | Nullable | Notes |
|-------------|-----------|----------|-------|
| `Account - Host / Landlord` | `text` | YES | Foreign key reference to account_host._id |
| `Listings` | `jsonb` | YES | Array of listing IDs |
| `MedianHoursToReply` | `integer` | YES | Response time metric |
| `Receptivity` | `numeric` | YES | Host receptivity score |

### Key Findings

1. **Column Naming Convention**: The migrated columns retain their **original Bubble.io naming style** with:
   - PascalCase (e.g., `Listings`, `MedianHoursToReply`)
   - Spaces in column names (e.g., `Account - Host / Landlord`)
   - This is consistent with the rest of the user table structure

2. **No Snake_Case Conversion**: The migration did **NOT** convert column names to PostgreSQL-standard snake_case. This means:
   - Queries must use double-quotes for column names with capitals or spaces
   - Column names match exactly as they appear in Bubble.io

3. **Data Types**:
   - `Listings`: Stored as `jsonb` (JSON array) - appropriate for array of IDs
   - `MedianHoursToReply`: Stored as `integer` - appropriate for hour counts
   - `Receptivity`: Stored as `numeric` - appropriate for decimal scores
   - `Account - Host / Landlord`: Stored as `text` - foreign key reference

### Sample Data

From 3 users with host data:

**User 1** (`1764956538168x24870006621412856`):
- Listings: 4 listings in array
- MedianHoursToReply: null
- Receptivity: "0" (stored as numeric)
- Account - Host / Landlord: `1764956538275x52999856139867488`

**User 2** (`1765655805408x65543300232234736`):
- Listings: 1 listing in array
- MedianHoursToReply: null
- Receptivity: null
- Account - Host / Landlord: `1765655805474x04845733540523245`

**User 3** (`1743201573897x627833604811198600`):
- Listings: 1 listing in array
- MedianHoursToReply: null
- Receptivity: "0"
- Account - Host / Landlord: `1743201574075x584234877278486500`

### Data Quality Observations

1. **MedianHoursToReply**: All sampled records have `null` values
   - This field may not have been populated in the source data
   - Or it may be calculated/updated asynchronously

2. **Receptivity**: Mixed null and "0" values
   - Stored as numeric type but appears as string "0" in some cases
   - May indicate default value or uninitialized state

3. **Listings Array**: Active and populated
   - Contains Bubble.io-style unique IDs
   - Array lengths vary (1-4 listings in sample)

4. **Foreign Key Pattern**: `Account - Host / Landlord` contains Bubble-style IDs
   - These reference the `account_host._id` field
   - Maintains referential integrity through text matching

---

## Migration Strategy Summary

The migration strategy appears to be:

1. **Flatten Relationship**: Move host-specific fields directly into user table
2. **Preserve Naming**: Keep original Bubble.io column names unchanged
3. **Foreign Key Reference**: Maintain link to account_host table via text ID
4. **Type Conversion**: Convert Bubble types to appropriate PostgreSQL types:
   - Arrays → jsonb
   - Numbers → integer/numeric
   - References → text

---

## SQL Query Examples

### Querying Host Data

```sql
-- Get all users who are hosts (have host account)
SELECT _id, "Account - Host / Landlord", "Listings"
FROM "user"
WHERE "Account - Host / Landlord" IS NOT NULL;

-- Get users with active listings
SELECT _id, jsonb_array_length("Listings") as listing_count
FROM "user"
WHERE "Listings" IS NOT NULL
  AND jsonb_array_length("Listings") > 0;

-- Get receptive hosts
SELECT _id, "Receptivity", "MedianHoursToReply"
FROM "user"
WHERE "Receptivity" IS NOT NULL
  AND "Receptivity" > 0;
```

### Joining with account_host

```sql
-- Get full host details
SELECT
  u._id as user_id,
  ah._id as host_account_id,
  ah."Name" as host_name,
  u."Listings",
  u."Receptivity"
FROM "user" u
JOIN "account_host" ah ON u."Account - Host / Landlord" = ah._id
WHERE u."Account - Host / Landlord" IS NOT NULL;
```

---

## Implications for Application Code

### Frontend (React/TypeScript)

When accessing host data from user records:

```typescript
// Type definition should match database structure
interface UserWithHostData {
  _id: string;
  'Account - Host / Landlord': string | null;
  Listings: string[] | null; // Array of listing IDs
  MedianHoursToReply: number | null;
  Receptivity: number | null;
}

// Check if user is a host
const isHost = (user: UserWithHostData): boolean => {
  return user['Account - Host / Landlord'] !== null;
};

// Get listing count
const getListingCount = (user: UserWithHostData): number => {
  return user.Listings?.length ?? 0;
};
```

### Edge Functions

When querying or updating host data:

```typescript
// Query with proper column quoting
const { data, error } = await supabase
  .from('user')
  .select(`
    _id,
    "Account - Host / Landlord",
    Listings,
    MedianHoursToReply,
    Receptivity
  `)
  .not('Account - Host / Landlord', 'is', null);
```

---

## Related Files

- Database Schema: `c:\Users\Split Lease\My Drive\!Agent Context and Tools\SL16\Split Lease\DATABASE_SCHEMA_OVERVIEW.md`
- Supabase Client: `c:\Users\Split Lease\My Drive\!Agent Context and Tools\SL16\Split Lease\app\src\lib\supabase.js`
- Edge Functions: `c:\Users\Split Lease\My Drive\!Agent Context and Tools\SL16\Split Lease\supabase\functions\`

---

## Recommendations

1. **Data Population**: Consider populating `MedianHoursToReply` for hosts with historical message data
2. **Receptivity Initialization**: Ensure new hosts have a default `Receptivity` value rather than null
3. **Type Safety**: When working with these fields in TypeScript, handle the non-standard naming carefully
4. **Documentation**: Update type definitions and documentation to reflect these column names
