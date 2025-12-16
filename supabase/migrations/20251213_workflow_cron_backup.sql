-- ============================================================================
-- Backup Cron Job for Workflow Processing
-- Ensures workflows are processed even if pg_net trigger fails
-- Split Lease - Workflow Orchestration System
-- Created: 2025-12-13
-- ============================================================================

-- Function to invoke orchestrator via cron
CREATE OR REPLACE FUNCTION trigger_workflow_cron()
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    supabase_url TEXT;
    service_role_key TEXT;
    pending_count INTEGER;
BEGIN
    -- Check if there are pending workflows
    SELECT COUNT(*) INTO pending_count
    FROM pgmq.q_workflow_queue;

    IF pending_count = 0 THEN
        RETURN;
    END IF;

    -- Get secrets from Vault
    SELECT decrypted_secret INTO supabase_url
    FROM vault.decrypted_secrets WHERE name = 'supabase_url';

    SELECT decrypted_secret INTO service_role_key
    FROM vault.decrypted_secrets WHERE name = 'service_role_key';

    IF supabase_url IS NULL OR service_role_key IS NULL THEN
        RAISE WARNING 'Vault secrets not configured for workflow cron';
        RETURN;
    END IF;

    RAISE LOG 'workflow_cron: Found % pending workflows, triggering orchestrator', pending_count;

    PERFORM net.http_post(
        url := supabase_url || '/functions/v1/workflow-orchestrator',
        headers := jsonb_build_object(
            'Content-Type', 'application/json',
            'Authorization', 'Bearer ' || service_role_key
        ),
        body := jsonb_build_object(
            'action', 'process',
            'payload', jsonb_build_object('triggered_by', 'cron_backup')
        ),
        timeout_milliseconds := 10000
    );

EXCEPTION
    WHEN OTHERS THEN
        RAISE WARNING 'trigger_workflow_cron failed: %', SQLERRM;
END;
$$;

-- Schedule cron job: every 30 seconds
SELECT cron.unschedule('workflow-orchestrator-backup')
WHERE EXISTS (SELECT 1 FROM cron.job WHERE jobname = 'workflow-orchestrator-backup');

SELECT cron.schedule(
    'workflow-orchestrator-backup',
    '30 seconds',
    'SELECT trigger_workflow_cron()'
);

-- DLQ cleanup: move workflows with read_ct >= 5 to DLQ
CREATE OR REPLACE FUNCTION move_failed_workflows_to_dlq()
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    moved_count INTEGER := 0;
BEGIN
    -- Move messages that have been read 5+ times to DLQ
    WITH failed_messages AS (
        SELECT msg_id, message
        FROM pgmq.q_workflow_queue
        WHERE read_ct >= 5
    ),
    archived AS (
        SELECT pgmq.send('workflow_dlq', message)
        FROM failed_messages
    )
    SELECT COUNT(*) INTO moved_count FROM failed_messages;

    -- Delete from main queue
    DELETE FROM pgmq.q_workflow_queue WHERE read_ct >= 5;

    IF moved_count > 0 THEN
        RAISE LOG 'move_failed_workflows_to_dlq: Moved % workflows to DLQ', moved_count;
    END IF;
END;
$$;

-- Schedule DLQ cleanup: every 5 minutes
SELECT cron.unschedule('workflow-dlq-cleanup')
WHERE EXISTS (SELECT 1 FROM cron.job WHERE jobname = 'workflow-dlq-cleanup');

SELECT cron.schedule(
    'workflow-dlq-cleanup',
    '*/5 * * * *',
    'SELECT move_failed_workflows_to_dlq()'
);

GRANT EXECUTE ON FUNCTION trigger_workflow_cron() TO service_role;
GRANT EXECUTE ON FUNCTION move_failed_workflows_to_dlq() TO service_role;
