# RLS Policy Verification and Update Testing

Execute the following SQL queries using Supabase MCP to diagnose the 409 error issue:

1. Verify RLS policies exist:
```sql
SELECT 
  schemaname, tablename, policyname, permissive, roles, cmd, qual, with_check
FROM pg_policies 
WHERE tablename = 'listing'
ORDER BY policyname;
```

2. Check RLS status:
```sql
SELECT relname, relrowsecurity, relforcerowsecurity 
FROM pg_class WHERE relname = 'listing';
```

3. Test an update as the service role:
```sql
UPDATE listing 
SET "Description" = 'Test description update'
WHERE _id = '1765927145616x55294201928847216'
RETURNING _id, "Description";
```

4. Check migrations table:
```sql
SELECT * FROM supabase_migrations.schema_migrations 
WHERE version LIKE '%listing%' OR name LIKE '%listing%'
ORDER BY version DESC
LIMIT 5;
```

Report all findings with full details.
