-- Migration: Add AI Suggestions Tracking Columns
-- Date: 2026-01-18
-- Purpose: Support AI suggestions review workflow with decision tracking and progress stages
--
-- Changes:
-- 1. Add "decision" column to zat_aisuggestions for tracking accept/ignore/combine
-- 2. Add "progress_stage" to housemanual for tracking AI generation progress
-- 3. Add "transcript" and "transcript_source" to housemanual for call transcripts
-- 4. Create index for efficient pending suggestions lookup

-- ─────────────────────────────────────────────────────────────
-- Step 1: Add decision tracking to zat_aisuggestions
-- ─────────────────────────────────────────────────────────────

-- Add decision column with default 'pending'
-- Valid values: 'pending', 'accepted', 'ignored', 'combined'
ALTER TABLE zat_aisuggestions
ADD COLUMN IF NOT EXISTS "decision" text DEFAULT 'pending';

-- Add constraint for valid decision values
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint
    WHERE conname = 'check_decision_valid'
  ) THEN
    ALTER TABLE zat_aisuggestions
    ADD CONSTRAINT check_decision_valid
    CHECK ("decision" IN ('pending', 'accepted', 'ignored', 'combined'));
  END IF;
END$$;

-- ─────────────────────────────────────────────────────────────
-- Step 2: Add progress tracking to housemanual
-- ─────────────────────────────────────────────────────────────

-- Add progress_stage column for tracking AI generation state
-- Valid values: 'idle', 'transcribing', 'analyzing', 'generating', 'ready', 'complete', 'error'
ALTER TABLE housemanual
ADD COLUMN IF NOT EXISTS "progress_stage" text DEFAULT 'idle';

-- Add transcript column for storing call transcripts
ALTER TABLE housemanual
ADD COLUMN IF NOT EXISTS "transcript" text;

-- Add transcript_source to track where transcript came from
ALTER TABLE housemanual
ADD COLUMN IF NOT EXISTS "transcript_source" text;

-- Add constraint for valid progress_stage values
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint
    WHERE conname = 'check_progress_stage_valid'
  ) THEN
    ALTER TABLE housemanual
    ADD CONSTRAINT check_progress_stage_valid
    CHECK ("progress_stage" IN ('idle', 'transcribing', 'analyzing', 'generating', 'ready', 'complete', 'error'));
  END IF;
END$$;

-- ─────────────────────────────────────────────────────────────
-- Step 3: Create indexes for efficient queries
-- ─────────────────────────────────────────────────────────────

-- Index for fetching pending suggestions by house manual
-- Uses partial index to only index pending suggestions (most common query)
CREATE INDEX IF NOT EXISTS idx_aisuggestions_pending_by_manual
ON zat_aisuggestions ("House Manual", "decision")
WHERE "decision" = 'pending';

-- Index for fetching non-ignored suggestions (for display)
CREATE INDEX IF NOT EXISTS idx_aisuggestions_active_by_manual
ON zat_aisuggestions ("House Manual", "decision")
WHERE "decision" != 'ignored';

-- ─────────────────────────────────────────────────────────────
-- Step 4: Update existing rows
-- ─────────────────────────────────────────────────────────────

-- Set existing suggestions without decision to 'pending'
UPDATE zat_aisuggestions
SET "decision" = 'pending'
WHERE "decision" IS NULL;

-- Set existing house manuals without progress_stage to 'idle'
UPDATE housemanual
SET "progress_stage" = 'idle'
WHERE "progress_stage" IS NULL;

-- ─────────────────────────────────────────────────────────────
-- Migration complete
-- ─────────────────────────────────────────────────────────────

COMMENT ON COLUMN zat_aisuggestions."decision" IS 'AI suggestion decision status: pending, accepted, ignored, or combined';
COMMENT ON COLUMN housemanual."progress_stage" IS 'AI generation progress: idle, transcribing, analyzing, generating, ready, complete, error';
COMMENT ON COLUMN housemanual."transcript" IS 'Call transcript text from AI phone interviews';
COMMENT ON COLUMN housemanual."transcript_source" IS 'Source of transcript: call, audio_upload, etc.';
