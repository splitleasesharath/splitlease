-- ============================================================================
-- pg_cron Signup Sync - Monitoring & Troubleshooting Queries
-- Date: 2025-12-09
-- Use these queries to monitor and troubleshoot the pg_cron setup
-- ============================================================================

-- ============================================================================
-- MONITORING: Check Cron Job Status
-- ============================================================================

-- View all scheduled cron jobs for bubble-sync
SELECT
    jobid,
    jobname,
    schedule,
    active,
    database,
    created,
    nodename
FROM cron.job
WHERE jobname LIKE 'bubble-sync%'
ORDER BY jobname;

-- ============================================================================
-- MONITORING: Check Recent Cron Job Execution Logs
-- ============================================================================

-- View the last 20 executions of the main processor
SELECT
    jobid,
    database,
    command,
    status,
    return_message,
    start_time,
    end_time
FROM cron.job_run_details
WHERE jobname = 'bubble-sync-processor'
ORDER BY start_time DESC
LIMIT 20;

-- View the last 20 executions of the retry processor
SELECT
    jobid,
    database,
    command,
    status,
    return_message,
    start_time,
    end_time
FROM cron.job_run_details
WHERE jobname = 'bubble-sync-retry'
ORDER BY start_time DESC
LIMIT 20;

-- ============================================================================
-- MONITORING: Check sync_queue Status
-- ============================================================================

-- Count items by status
SELECT
    status,
    operation,
    COUNT(*) as count,
    MIN(created_at) as oldest,
    MAX(created_at) as newest
FROM sync_queue
GROUP BY status, operation
ORDER BY status DESC, operation;

-- View pending items (next to be processed)
SELECT
    id,
    user_id,
    operation,
    data_type,
    status,
    created_at,
    retry_count,
    max_retries,
    next_retry_at,
    error_message
FROM sync_queue
WHERE status = 'pending'
ORDER BY created_at ASC
LIMIT 20;

-- View failed items (to be retried)
SELECT
    id,
    user_id,
    operation,
    data_type,
    status,
    created_at,
    retry_count,
    max_retries,
    next_retry_at,
    error_message
FROM sync_queue
WHERE status = 'failed'
ORDER BY retry_count DESC, created_at DESC
LIMIT 20;

-- View completed items (successfully synced)
SELECT
    id,
    user_id,
    operation,
    data_type,
    status,
    created_at,
    updated_at,
    external_id
FROM sync_queue
WHERE status = 'completed'
ORDER BY updated_at DESC
LIMIT 20;

-- ============================================================================
-- MONITORING: Check pg_net HTTP Requests
-- ============================================================================

-- View recent HTTP requests sent by pg_net
SELECT
    id,
    created_at,
    method,
    url,
    status_code,
    error_msg
FROM net.http_request_queue
ORDER BY id DESC
LIMIT 20;

-- Count HTTP requests by status
SELECT
    status_code,
    COUNT(*) as count,
    MAX(created_at) as latest
FROM net.http_request_queue
GROUP BY status_code
ORDER BY latest DESC;

-- ============================================================================
-- MONITORING: Check Vault Secrets
-- ============================================================================

-- Verify vault secrets exist
SELECT
    name,
    description,
    created_at,
    updated_at
FROM vault.secrets
WHERE name IN ('supabase_url', 'service_role_key');

-- Check secret access logs (if available)
-- SELECT * FROM vault.audit_log WHERE secret_name IN ('supabase_url', 'service_role_key');

-- ============================================================================
-- MONITORING: Check Functions Status
-- ============================================================================

-- List the two functions
SELECT
    proname,
    pronargs,
    prosrc
FROM pg_proc
WHERE proname IN ('invoke_bubble_sync_processor', 'invoke_bubble_sync_retry')
ORDER BY proname;

-- Check function execution stats (if available)
SELECT * FROM pg_stat_user_functions
WHERE funcname IN ('invoke_bubble_sync_processor', 'invoke_bubble_sync_retry');

-- ============================================================================
-- TROUBLESHOOTING: Manual Function Execution
-- ============================================================================

-- Manually trigger the main processor
-- SELECT invoke_bubble_sync_processor();

-- Manually trigger the retry processor
-- SELECT invoke_bubble_sync_retry();

-- ============================================================================
-- TROUBLESHOOTING: Check for Extension Issues
-- ============================================================================

-- Verify extensions are installed
SELECT extname, extversion, extschema
FROM pg_extension
WHERE extname IN ('pg_cron', 'pg_net')
ORDER BY extname;

-- Check extension availability
SELECT * FROM pg_available_extensions
WHERE name IN ('pg_cron', 'pg_net');

-- ============================================================================
-- TROUBLESHOOTING: Monitor Specific User Signups
-- ============================================================================

-- Find all sync queue items for a specific user
-- Replace 'USER_ID' with actual user ID
-- SELECT * FROM sync_queue WHERE user_id = 'USER_ID' ORDER BY created_at DESC;

-- Check signup to sync queue journey
-- Replace 'USER_ID' with actual user ID
SELECT
    'user' as table_name,
    COUNT(*) as record_count
FROM "user"
WHERE id = 'USER_ID'
UNION ALL
SELECT
    'sync_queue' as table_name,
    COUNT(*) as record_count
FROM sync_queue
WHERE user_id = 'USER_ID';

-- ============================================================================
-- TROUBLESHOOTING: Performance Metrics
-- ============================================================================

-- Calculate queue processing time
SELECT
    DATE_TRUNC('hour', created_at) as hour,
    COUNT(*) as items_created,
    COUNT(CASE WHEN status = 'completed' THEN 1 END) as items_completed,
    COUNT(CASE WHEN status = 'failed' THEN 1 END) as items_failed,
    COUNT(CASE WHEN status = 'pending' THEN 1 END) as items_pending
FROM sync_queue
WHERE created_at >= NOW() - INTERVAL '24 hours'
GROUP BY DATE_TRUNC('hour', created_at)
ORDER BY hour DESC;

-- Average processing time for completed items
SELECT
    operation,
    COUNT(*) as count,
    AVG(EXTRACT(EPOCH FROM (updated_at - created_at))) as avg_seconds,
    MIN(EXTRACT(EPOCH FROM (updated_at - created_at))) as min_seconds,
    MAX(EXTRACT(EPOCH FROM (updated_at - created_at))) as max_seconds
FROM sync_queue
WHERE status = 'completed'
  AND created_at >= NOW() - INTERVAL '24 hours'
GROUP BY operation;

-- ============================================================================
-- TROUBLESHOOTING: Error Analysis
-- ============================================================================

-- Find most common error messages
SELECT
    error_message,
    COUNT(*) as count,
    COUNT(DISTINCT user_id) as affected_users,
    MAX(updated_at) as latest_occurrence
FROM sync_queue
WHERE status = 'failed'
  AND error_message IS NOT NULL
GROUP BY error_message
ORDER BY count DESC
LIMIT 10;

-- Find users with repeated failures
SELECT
    user_id,
    COUNT(*) as total_failures,
    COUNT(DISTINCT operation) as operations_failed,
    MAX(updated_at) as latest_failure
FROM sync_queue
WHERE status = 'failed'
GROUP BY user_id
HAVING COUNT(*) > 1
ORDER BY total_failures DESC
LIMIT 10;

-- ============================================================================
-- RECOVERY: Force Reprocess Failed Items
-- ============================================================================

-- Update failed items back to pending (use with caution!)
-- UPDATE sync_queue
-- SET status = 'pending', retry_count = 0, next_retry_at = NOW()
-- WHERE status = 'failed' AND retry_count >= max_retries
-- AND error_message LIKE '%transient error%';

-- ============================================================================
-- RECOVERY: Cleanup Old Completed Items
-- ============================================================================

-- View how many completed items can be archived
SELECT
    operation,
    COUNT(*) as count,
    MIN(created_at) as oldest
FROM sync_queue
WHERE status = 'completed'
  AND created_at < NOW() - INTERVAL '30 days'
GROUP BY operation;

-- Archive old completed items (optional cleanup)
-- DELETE FROM sync_queue
-- WHERE status = 'completed'
--   AND created_at < NOW() - INTERVAL '30 days';

-- ============================================================================
-- DASHBOARD: Overall System Health
-- ============================================================================

-- Single query to check overall system health
SELECT
    'Cron Jobs' as component,
    COUNT(*) as active_jobs,
    'Check "MONITORING: Check Cron Job Status" for details' as details
FROM cron.job
WHERE jobname LIKE 'bubble-sync%' AND active = true
UNION ALL
SELECT
    'Pending Items' as component,
    COUNT(*) as active_jobs,
    'Items waiting to be processed' as details
FROM sync_queue
WHERE status = 'pending'
UNION ALL
SELECT
    'Failed Items' as component,
    COUNT(*) as active_jobs,
    'Items waiting for retry' as details
FROM sync_queue
WHERE status = 'failed' AND retry_count < max_retries
UNION ALL
SELECT
    'Completed Items (24h)' as component,
    COUNT(*) as active_jobs,
    'Successfully processed today' as details
FROM sync_queue
WHERE status = 'completed' AND created_at >= NOW() - INTERVAL '24 hours'
UNION ALL
SELECT
    'Vault Secrets' as component,
    COUNT(*) as active_jobs,
    'Configuration secrets available' as details
FROM vault.secrets
WHERE name IN ('supabase_url', 'service_role_key');

-- ============================================================================
-- EXPORT: Query Results for Analysis
-- ============================================================================

-- Export sync_queue summary as JSON
SELECT
    jsonb_object_agg(
        status,
        jsonb_object_agg(
            operation,
            count
        )
    ) as queue_summary
FROM (
    SELECT
        status,
        operation,
        COUNT(*) as count
    FROM sync_queue
    GROUP BY status, operation
) t;

-- ============================================================================
-- END OF MONITORING QUERIES
-- ============================================================================
