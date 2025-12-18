-- Export account_host table to JSON
-- Run this query and save the output to a file

SELECT json_agg(t)
FROM (
  SELECT * FROM account_host ORDER BY created_at
) t;
