# MCP Task: Query Parking Options Table from supabase-dev

## Objective
Query the `zat_features_parkingoptions` table in the **supabase-dev** MCP server to retrieve all valid FK IDs and their corresponding names.

## MCP Server
**supabase-dev** (development database - this is the default)

## Required Operations

### Step 1: List Tables
Use the `list_tables` tool to find tables matching "parking":
- This will confirm the exact table name
- Expected table: `zat_features_parkingoptions`

### Step 2: Query the Table
Use the `run_sql` tool with this query:
```sql
SELECT * FROM zat_features_parkingoptions ORDER BY id;
```

Return all columns including:
- ID (the FK ID value)
- Any name/label columns
- Any other descriptive columns

## Expected Output Format

Please structure your response as:

**Tables Found:**
- [list of tables matching "parking"]

**Parking Options Records:**
| ID | Name/Label | [Other Columns] |
|----|------------|-----------------|
| ... | ... | ... |

## Context
The `listing` table has a foreign key constraint `listing_Features - Parking type_fkey` that references this table. We need the actual FK ID values to update the `PARKING_OPTIONS` constant in the codebase from display strings to proper FK IDs.

## Success Criteria
- All records from the parking options table retrieved
- Clear mapping of ID (FK value) to display name
- Data returned in a format ready for updating constants
