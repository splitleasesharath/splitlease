-- ============================================================================
-- Workflow Executions Table
-- Tracks each workflow execution instance for debugging and audit
-- Split Lease - Workflow Orchestration System
-- Created: 2025-12-13
-- ============================================================================

CREATE TABLE IF NOT EXISTS workflow_executions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),

    -- Workflow reference
    workflow_name TEXT NOT NULL,
    workflow_version INTEGER NOT NULL,

    -- Execution state
    status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN (
        'pending',      -- Queued, not started
        'running',      -- Currently executing
        'completed',    -- All steps finished successfully
        'failed',       -- Failed after retries
        'cancelled'     -- Manually cancelled
    )),
    current_step INTEGER DEFAULT 0,
    total_steps INTEGER NOT NULL,

    -- Input/Output
    input_payload JSONB NOT NULL,           -- Original payload from frontend
    context JSONB DEFAULT '{}',             -- Accumulated context from steps

    -- Error tracking
    error_message TEXT,
    error_step TEXT,
    retry_count INTEGER DEFAULT 0,

    -- Timing
    created_at TIMESTAMPTZ DEFAULT NOW(),
    started_at TIMESTAMPTZ,
    completed_at TIMESTAMPTZ,

    -- Correlation
    correlation_id TEXT UNIQUE,             -- For idempotency
    triggered_by TEXT                       -- 'frontend', 'cron', 'manual'
);

-- Indexes
CREATE INDEX IF NOT EXISTS idx_workflow_executions_status
    ON workflow_executions (status, created_at);
CREATE INDEX IF NOT EXISTS idx_workflow_executions_name
    ON workflow_executions (workflow_name, created_at);
CREATE INDEX IF NOT EXISTS idx_workflow_executions_correlation
    ON workflow_executions (correlation_id) WHERE correlation_id IS NOT NULL;

-- RLS
ALTER TABLE workflow_executions ENABLE ROW LEVEL SECURITY;

COMMENT ON TABLE workflow_executions IS 'Audit trail and status tracking for workflow executions';
