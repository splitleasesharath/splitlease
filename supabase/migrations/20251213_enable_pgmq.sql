-- ============================================================================
-- Enable pgmq Extension for Workflow Queues
-- Split Lease - Workflow Orchestration System
-- Created: 2025-12-13
-- ============================================================================

-- Enable pgmq extension (Supabase has this pre-installed)
CREATE EXTENSION IF NOT EXISTS pgmq;

-- Create the workflow queue
SELECT pgmq.create('workflow_queue');

-- Create dead letter queue for failed workflows
SELECT pgmq.create('workflow_dlq');

-- Log completion
DO $$
BEGIN
  RAISE LOG 'pgmq extension enabled and workflow queues created';
END $$;
