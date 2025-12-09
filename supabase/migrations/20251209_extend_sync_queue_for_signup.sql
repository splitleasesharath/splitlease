-- ============================================================================
-- Migration: Extend sync_queue for Atomic Signup Sync
-- Created: 2025-12-09
-- Purpose: Support SIGNUP_ATOMIC operation type for queue-based signup sync
-- ============================================================================

-- Update operation constraint to include SIGNUP_ATOMIC
ALTER TABLE sync_queue
DROP CONSTRAINT IF EXISTS sync_queue_operation_check;

ALTER TABLE sync_queue
ADD CONSTRAINT sync_queue_operation_check
CHECK (operation IN ('INSERT', 'UPDATE', 'DELETE', 'SIGNUP_ATOMIC'));

-- Add index for SIGNUP_ATOMIC operations to improve query performance
CREATE INDEX IF NOT EXISTS idx_sync_queue_signup_atomic
    ON sync_queue (operation, created_at)
    WHERE operation = 'SIGNUP_ATOMIC' AND status = 'pending';

-- Add comment to document the extended operation types
COMMENT ON CONSTRAINT sync_queue_operation_check ON sync_queue IS
'Allowed operations: INSERT, UPDATE, DELETE (standard CRUD), SIGNUP_ATOMIC (special atomic signup sync)';
