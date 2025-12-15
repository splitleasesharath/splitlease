-- ============================================================================
-- Immediate Workflow Trigger via pg_net
-- Fires orchestrator Edge Function when a workflow is enqueued
-- Split Lease - Workflow Orchestration System
-- Created: 2025-12-13
-- ============================================================================

-- NOTE: Vault secrets must be created manually after migration:
-- SELECT vault.create_secret('https://YOUR-PROJECT.supabase.co', 'supabase_url');
-- SELECT vault.create_secret('YOUR-SERVICE-ROLE-KEY', 'service_role_key');

-- Function to trigger orchestrator immediately
CREATE OR REPLACE FUNCTION trigger_workflow_orchestrator()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    supabase_url TEXT;
    service_role_key TEXT;
BEGIN
    -- Get secrets from Vault
    SELECT decrypted_secret INTO supabase_url
    FROM vault.decrypted_secrets WHERE name = 'supabase_url';

    SELECT decrypted_secret INTO service_role_key
    FROM vault.decrypted_secrets WHERE name = 'service_role_key';

    -- Skip if secrets not configured
    IF supabase_url IS NULL OR service_role_key IS NULL THEN
        RAISE WARNING 'Vault secrets not configured, skipping immediate trigger';
        RETURN NEW;
    END IF;

    -- Fire orchestrator via pg_net (non-blocking)
    PERFORM net.http_post(
        url := supabase_url || '/functions/v1/workflow-orchestrator',
        headers := jsonb_build_object(
            'Content-Type', 'application/json',
            'Authorization', 'Bearer ' || service_role_key
        ),
        body := jsonb_build_object(
            'action', 'process',
            'payload', jsonb_build_object('triggered_by', 'pg_net_trigger')
        ),
        timeout_milliseconds := 5000
    );

    RETURN NEW;
EXCEPTION
    WHEN OTHERS THEN
        -- Log but don't fail - cron will pick up the workflow
        RAISE WARNING 'trigger_workflow_orchestrator failed: %', SQLERRM;
        RETURN NEW;
END;
$$;

-- Trigger on new pending workflow executions
CREATE TRIGGER workflow_executions_pending_trigger
    AFTER INSERT ON workflow_executions
    FOR EACH ROW
    WHEN (NEW.status = 'pending')
    EXECUTE FUNCTION trigger_workflow_orchestrator();

-- Grant permissions
GRANT EXECUTE ON FUNCTION trigger_workflow_orchestrator() TO service_role;
