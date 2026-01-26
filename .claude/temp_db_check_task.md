# Database Verification Task

Check the Supabase development database (supabase-dev) for:

1. Does the table `zfut_safetyfeatures` exist in the public schema?
2. Does the RPC function `count_user_threads` exist?

Use the following MCP tools through supabase-dev:
- list_tables (to check for the table)
- execute_sql (to check for the RPC function with a query like: `SELECT proname FROM pg_proc WHERE proname = 'count_user_threads'`)

Return findings in a clear format showing whether each item exists or not.
