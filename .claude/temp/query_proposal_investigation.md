# Proposal Investigation for rodtesthost@test.com

## Task
Query Supabase dev database to:
1. Find user ID for email 'rodtesthost@test.com'
2. Find all proposals for listings owned by that host
3. Check Guest field values in proposals
4. Compare with Leo DiCaprio's expected ID: '1697550315775x613621430341750000'

## Expected Operations
1. Query user table: `SELECT id, email FROM user WHERE email = 'rodtesthost@test.com'`
2. Query listing table: `SELECT id FROM listing WHERE Host = <host_id>`
3. Query proposal table: `SELECT id, Guest, Listing FROM proposal WHERE Listing IN (<listing_ids>)`
4. Analyze Guest IDs to understand why Leo's data might not be showing

## MCP Server
Use supabase-dev (development database)
