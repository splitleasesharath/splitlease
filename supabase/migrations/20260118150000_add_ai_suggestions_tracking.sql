-- Migration: Add AI Suggestions Tracking Columns
-- Date: 2026-01-18
-- Purpose: Add decision tracking to zat_aisuggestions and progress tracking to housemanual
--
-- NOTE: This migration requires manual execution via Supabase MCP or dashboard
-- The new columns support the AI Suggestions shared island component workflow

-- =============================================================================
-- Part 1: Add decision tracking to zat_aisuggestions
-- =============================================================================

-- Add decision column to track suggestion state
-- Values: 'pending' | 'accepted' | 'ignored' | 'combined'
ALTER TABLE zat_aisuggestions
ADD COLUMN IF NOT EXISTS "decision" text DEFAULT 'pending';

-- Add constraint to ensure only valid decision values
ALTER TABLE zat_aisuggestions
ADD CONSTRAINT check_decision_valid
CHECK ("decision" IN ('pending', 'accepted', 'ignored', 'combined'));

-- Create index for efficient pending suggestions lookup
CREATE INDEX IF NOT EXISTS idx_aisuggestions_pending
ON zat_aisuggestions ("House Manual", "decision")
WHERE "decision" = 'pending';

-- =============================================================================
-- Part 2: Add progress tracking to housemanual
-- =============================================================================

-- Add progress_stage column to track AI processing state
-- Values: 'idle' | 'transcribing' | 'analyzing' | 'generating' | 'ready' | 'complete' | 'error'
ALTER TABLE housemanual
ADD COLUMN IF NOT EXISTS "progress_stage" text DEFAULT 'idle';

-- Add transcript storage column
ALTER TABLE housemanual
ADD COLUMN IF NOT EXISTS "transcript" text;

-- Add transcript source column (call, audio, etc.)
ALTER TABLE housemanual
ADD COLUMN IF NOT EXISTS "transcript_source" text;

-- Add constraint for valid progress stages
ALTER TABLE housemanual
ADD CONSTRAINT check_progress_stage_valid
CHECK ("progress_stage" IN ('idle', 'transcribing', 'analyzing', 'generating', 'ready', 'complete', 'error'));

-- =============================================================================
-- Part 3: Create helper functions (optional)
-- =============================================================================

-- Function to get pending suggestions count for a house manual
CREATE OR REPLACE FUNCTION get_pending_suggestions_count(house_manual_id text)
RETURNS integer
LANGUAGE sql
STABLE
AS $$
  SELECT COUNT(*)::integer
  FROM zat_aisuggestions
  WHERE "House Manual" = house_manual_id
    AND "decision" = 'pending'
    AND "being processed?" = false;
$$;

-- =============================================================================
-- Bubble Sync Consideration
-- =============================================================================
-- These new columns (decision, progress_stage, transcript, transcript_source)
-- need to be:
-- 1. Added to Bubble.io as custom fields, OR
-- 2. Excluded from sync_queue processing
--
-- Recommendation: Mark as Supabase-only fields and do NOT sync to Bubble
