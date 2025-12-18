# Supabase Database Investigation Request

## Objective
Investigate why listings are not being fetched for a host user in the Split Lease application.

## Required MCP Operations

Execute the following Supabase MCP queries in sequence and report all findings:

### 1. Check get_host_listings Function Definition
```sql
SELECT prosrc, proargtypes FROM pg_proc WHERE proname = 'get_host_listings';
```

### 2. Check Listing Table Structure
```sql
SELECT column_name, data_type FROM information_schema.columns WHERE table_name = 'listing' ORDER BY ordinal_position;
```

### 3. Find Listings for Specific Host
```sql
SELECT _id, title, host_account_id, status FROM listing WHERE host_account_id = '1765898163442x19586482615483680';
```

### 4. Check User Record with Bubble ID
```sql
SELECT id, email, bubble_id, user_type FROM "user" WHERE bubble_id = '1765898163442x19586482615483680';
```

### 5. Check Auth User ID for Email
```sql
SELECT id, email FROM auth.users WHERE email = 'philfoden@test.com';
```

## Expected Output

For each query, report:
- The query executed
- The results returned
- Any errors encountered
- Observations about the data model

## Context

The user is experiencing a 400 error when the RPC `get_host_listings` is called. We need to understand:
1. Does the function exist and what does it do?
2. What is the listing table structure?
3. Are there actual listings for this host_account_id?
4. How are user records mapped (bubble_id vs auth.users.id)?
5. What is the correct user ID for the test account?
