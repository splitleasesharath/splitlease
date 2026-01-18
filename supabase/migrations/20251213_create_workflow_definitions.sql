-- ============================================================================
-- Workflow Definitions Table
-- Stores named workflow configurations with their step sequences
-- Split Lease - Workflow Orchestration System
-- Created: 2025-12-13
-- ============================================================================

CREATE TABLE IF NOT EXISTS workflow_definitions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),

    -- Workflow identity
    name TEXT UNIQUE NOT NULL,              -- 'proposal_accepted', 'listing_submitted'
    description TEXT,                       -- Human-readable description

    -- Workflow configuration
    steps JSONB NOT NULL,                   -- Array of step definitions
    /*
    steps structure:
    [
      {
        "name": "send_acceptance_email",
        "function": "send-email",
        "action": "send",
        "payload_template": {
          "template_id": "proposal_accepted_template",
          "to_email": "{{guest_email}}",
          "variables": {
            "guest_name": "{{guest_name}}",
            "listing_address": "{{listing_address}}"
          }
        },
        "on_failure": "continue" | "abort" | "retry"
      },
      ...
    ]
    */

    -- Required input fields (validated on enqueue)
    required_fields TEXT[] DEFAULT '{}',    -- ['proposal_id', 'guest_email', ...]

    -- Execution settings
    timeout_seconds INTEGER DEFAULT 300,    -- Max time for entire workflow
    visibility_timeout INTEGER DEFAULT 60,  -- pgmq visibility timeout per step
    max_retries INTEGER DEFAULT 3,          -- Per-step retry limit

    -- Status
    active BOOLEAN DEFAULT true,

    -- Metadata
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    created_by TEXT,
    version INTEGER DEFAULT 1
);

-- Indexes
CREATE INDEX IF NOT EXISTS idx_workflow_definitions_name
    ON workflow_definitions (name) WHERE active = true;

-- Update timestamp trigger
CREATE OR REPLACE FUNCTION update_workflow_definitions_timestamp()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    NEW.version = OLD.version + 1;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER workflow_definitions_updated
    BEFORE UPDATE ON workflow_definitions
    FOR EACH ROW
    EXECUTE FUNCTION update_workflow_definitions_timestamp();

-- RLS
ALTER TABLE workflow_definitions ENABLE ROW LEVEL SECURITY;
-- No policies = service role only

COMMENT ON TABLE workflow_definitions IS 'Named workflow configurations with step sequences for orchestration';
