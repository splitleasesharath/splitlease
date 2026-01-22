# MCP Database Investigation Task

Execute the following SQL queries against **supabase-dev** to find the mysterious $220.22 price pin at Null Island (0,0):

## Query 1: Find listings with price $220.22
```sql
SELECT _id, "Name", "Active", "Standarized Minimum Nightly Price (Filter)", "Location - Coordinates", "Location - Address" 
FROM listing 
WHERE "Standarized Minimum Nightly Price (Filter)" = 220.22
OR "Standarized Minimum Nightly Price (Filter)" BETWEEN 220 AND 221
ORDER BY "Standarized Minimum Nightly Price (Filter)";
```

## Query 2: Find listings with coordinates near (0,0) - Null Island
```sql
SELECT _id, "Name", "Active", "Location - Coordinates", "Standarized Minimum Nightly Price (Filter)", "Location - Address"
FROM listing 
WHERE "Location - Coordinates" IS NOT NULL
AND ("Location - Coordinates"->>'lat')::numeric BETWEEN -5 AND 5
AND ("Location - Coordinates"->>'lng')::numeric BETWEEN -5 AND 5;
```

## Query 3: Find Active listings with missing location data
```sql
SELECT _id, "Name", "Active", "Location - Coordinates", "Location - Address", "Location - Borough", "Location - Hood"
FROM listing 
WHERE "Active" = true 
AND ("Location - Coordinates" IS NULL OR "Location - Address" IS NULL)
ORDER BY _id;
```

**Target Database**: supabase-dev (development)
**Purpose**: Identify which listing appears as a ghost price pin at Null Island coordinates
