# Borough Data Structure Analysis

**Date**: 2025-12-17
**Purpose**: Understand borough data structure for proper display in listing edit page

---

## Summary

The borough data follows a standard foreign key relationship pattern:

- **listing."Location - Borough"** stores a Bubble.io ID (e.g., `1607041299687x679479834266385900`)
- **reference_table.zat_geo_borough_toplevel._id** contains the matching IDs
- **reference_table.zat_geo_borough_toplevel."Display Borough"** contains the human-readable name

---

## Database Schema

### Table: `reference_table.zat_geo_borough_toplevel`

| Column | Data Type | Description |
|--------|-----------|-------------|
| `_id` | text | Primary key (Bubble.io format: `{timestamp}x{random}`) |
| `Display Borough` | text | Human-readable borough name |
| `Geo-Location` | text | Reference to location |
| `Geo-Hoods` | jsonb | Array of neighborhood IDs |
| `Geographics Centre` | jsonb | Geographic center coordinates |
| `Zip Codes` | jsonb | Array of zip codes |
| `Created By` | text | User who created |
| `Created Date` | timestamptz | Creation timestamp |
| `Modified Date` | timestamptz | Last modification timestamp |
| `created_at` | timestamptz | Supabase creation timestamp |
| `updated_at` | timestamptz | Supabase update timestamp |
| `pending` | boolean | Sync pending flag |

---

## Sample Data

### Borough Reference Table

```json
[
  {
    "_id": "1607041299687x679479834266385900",
    "Display Borough": "Manhattan"
  },
  {
    "_id": "1607041299715x741251947580746200",
    "Display Borough": "Bronx"
  },
  {
    "_id": "1607041299828x406969561802059650",
    "Display Borough": "Queens"
  },
  {
    "_id": "1607041299637x913970439175620100",
    "Display Borough": "Brooklyn"
  },
  {
    "_id": "1686596333255x514268093014903500",
    "Display Borough": "Bergen County NJ"
  },
  {
    "_id": "1686599616073x348655546878883200",
    "Display Borough": "Hudson County NJ"
  },
  {
    "_id": "1686674905048x436838997624262400",
    "Display Borough": "Essex County NJ"
  }
]
```

### Listing Table Samples

```json
[
  {
    "_id": "1637349440736x622780446630946800",
    "Name": "1 bedroom, 1 bathroom in East Harlem",
    "Location - Borough": "1607041299687x679479834266385900",
    "Location - Hood": "1686665230141x301148839537636900"
  },
  {
    "_id": "1727459051480x660125284704190500",
    "Name": "Listing Testing #1",
    "Location - Borough": "1607041299687x679479834266385900",
    "Location - Hood": "1686665230152x267314860159501250"
  },
  {
    "_id": "1637349484426x655116352715829500",
    "Name": "1 bedroom, 1 bathroom in West Queens",
    "Location - Borough": "1607041299828x406969561802059650",
    "Location - Hood": "1686663637989x188673775372895100"
  }
]
```

---

## SQL Join Pattern

### Query to Fetch Listing with Borough Name

```sql
SELECT
  l._id,
  l."Name",
  l."Location - Borough" as borough_id,
  b."Display Borough" as borough_name
FROM listing l
LEFT JOIN reference_table.zat_geo_borough_toplevel b
  ON l."Location - Borough" = b._id
WHERE l."Location - Borough" IS NOT NULL;
```

### Result

```json
[
  {
    "_id": "1637349440736x622780446630946800",
    "Name": "1 bedroom, 1 bathroom in East Harlem",
    "borough_id": "1607041299687x679479834266385900",
    "borough_name": "Manhattan"
  },
  {
    "_id": "1727459051480x660125284704190500",
    "Name": "Listing Testing #1",
    "borough_id": "1607041299687x679479834266385900",
    "borough_name": "Manhattan"
  },
  {
    "_id": "1637349484426x655116352715829500",
    "Name": "1 bedroom, 1 bathroom in West Queens",
    "borough_id": "1607041299828x406969561802059650",
    "borough_name": "Queens"
  }
]
```

---

## Foreign Key Constraint

The database has an established FK constraint:

```
fk_listing_borough:
  source: public.listing."Location - Borough"
  target: reference_table.zat_geo_borough_toplevel._id
```

This ensures referential integrity between listings and boroughs.

---

## Implementation Requirements

### For Listing Edit Page

1. **Fetch all boroughs** for dropdown:
   ```sql
   SELECT _id, "Display Borough"
   FROM reference_table.zat_geo_borough_toplevel
   ORDER BY "Display Borough";
   ```

2. **Display selected borough** in edit form:
   - Use `listing."Location - Borough"` as the dropdown value (the ID)
   - Join with `zat_geo_borough_toplevel."Display Borough"` to show the name

3. **Update borough**:
   - Send the `_id` value when updating `listing."Location - Borough"`
   - The FK constraint will validate the ID exists

### Data Flow

```
User sees:     "Manhattan" (from Display Borough)
Form stores:   "1607041299687x679479834266385900" (the _id)
DB updates:    listing."Location - Borough" = "1607041299687x679479834266385900"
```

---

## Key Findings

1. **What is stored in listing."Location - Borough"?**
   - A Bubble.io-format ID string (e.g., `1607041299687x679479834266385900`)
   - NOT a human-readable name

2. **What columns exist in zat_geo_borough_toplevel?**
   - `_id` (PK) - the unique identifier
   - `Display Borough` - the human-readable name to show in UI
   - `Geo-Location` - reference to location
   - Other metadata fields

3. **How to join them?**
   ```sql
   LEFT JOIN reference_table.zat_geo_borough_toplevel b
     ON l."Location - Borough" = b._id
   ```

4. **What to display in UI?**
   - Show: `b."Display Borough"` (e.g., "Manhattan", "Queens", "Brooklyn")
   - Store: `b._id` (the Bubble.io ID)

---

## Related Tables

The same pattern applies to neighborhoods:

```
listing."Location - Hood" → reference_table.zat_geo_hood_mediumlevel._id
zat_geo_hood_mediumlevel."Display" → Human-readable neighborhood name
```

---

## Recommendations

1. **Fetch Pattern**: Always join with reference tables to get display names
2. **Update Pattern**: Send only the `_id` value, not the display name
3. **Validation**: The FK constraint ensures only valid borough IDs can be saved
4. **Null Handling**: Use LEFT JOIN to handle listings with null borough values (legacy data)

---

## Files Involved

- **Frontend**: `app/src/islands/pages/EditListingPage.jsx`
- **API Logic**: `app/src/lib/api/listing.js` (if fetching borough options)
- **Database**: `reference_table.zat_geo_borough_toplevel`
