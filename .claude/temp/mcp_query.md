# MCP Tool Request

Please execute the following Supabase SQL queries:

## Query 1: Column Structure
Get the column names and types from the user table that correspond to the migrated account_host fields:

```sql
SELECT column_name, data_type, is_nullable
FROM information_schema.columns
WHERE table_name = 'user'
AND column_name IN ('Listings', 'listings', 'host_listings', 'MedianHoursToReply', 'median_hours_to_reply', 'Receptivity', 'receptivity', 'Account - Host / Landlord')
ORDER BY column_name;
```

## Query 2: Sample Data
Get a sample of what these columns look like with actual data:

```sql
SELECT _id, "Listings", "MedianHoursToReply", "Receptivity", "Account - Host / Landlord"
FROM "user"
WHERE "Listings" IS NOT NULL
LIMIT 3;
```

Please execute both queries using `mcp__supabase__execute_sql` and return the results.
