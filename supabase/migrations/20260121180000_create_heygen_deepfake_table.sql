-- Migration: Create HeyGen Deepfake Table
-- Date: 2026-01-21 18:00:00
-- Purpose: Add support for HeyGen deepfake video generation
--
-- This table stores HeyGen deepfake video generation records
-- for house manual welcome videos. It tracks the video creation
-- process from script generation through HeyGen processing to
-- final video URL attachment.
--
-- NOTE: Jingle functionality uses the existing 'narration' table
-- with is_it_jingle flag, so no separate jingle table is needed.

-- =============================================================================
-- Create enum for deepfake status
-- =============================================================================

DO $$ BEGIN
  CREATE TYPE deepfake_status AS ENUM (
    'pending',
    'processing',
    'completed',
    'failed'
  );
EXCEPTION
  WHEN duplicate_object THEN NULL;
END $$;

-- =============================================================================
-- Create heygen_deepfake table
-- =============================================================================

CREATE TABLE IF NOT EXISTS heygen_deepfake (
  -- Primary identifiers
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  bubble_id text UNIQUE,

  -- Foreign keys
  house_manual_id uuid REFERENCES housemanual(id) ON DELETE CASCADE,

  -- HeyGen video configuration
  video_id text,              -- HeyGen video template ID
  voice_id text,              -- HeyGen voice ID
  script text,                -- Generated or edited script

  -- HeyGen processing
  video_token text,           -- HeyGen job token for status polling
  video_url text,             -- Final video URL when complete

  -- Status tracking
  status deepfake_status NOT NULL DEFAULT 'pending',
  error_message text,         -- Error details if failed

  -- Audit fields
  created_by uuid REFERENCES auth.users(id),
  attached_to_manual boolean DEFAULT false,

  -- Timestamps
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- =============================================================================
-- Create indexes for common queries
-- =============================================================================

-- Index for looking up deepfakes by house manual
CREATE INDEX IF NOT EXISTS idx_heygen_deepfake_house_manual
  ON heygen_deepfake(house_manual_id);

-- Index for finding pending/processing deepfakes
CREATE INDEX IF NOT EXISTS idx_heygen_deepfake_status
  ON heygen_deepfake(status)
  WHERE status IN ('pending', 'processing');

-- Index for Bubble sync (if needed)
CREATE INDEX IF NOT EXISTS idx_heygen_deepfake_bubble_id
  ON heygen_deepfake(bubble_id)
  WHERE bubble_id IS NOT NULL;

-- =============================================================================
-- Auto-update timestamp trigger
-- =============================================================================

CREATE OR REPLACE FUNCTION update_heygen_deepfake_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trigger_update_heygen_deepfake_timestamp ON heygen_deepfake;

CREATE TRIGGER trigger_update_heygen_deepfake_timestamp
  BEFORE UPDATE ON heygen_deepfake
  FOR EACH ROW
  EXECUTE FUNCTION update_heygen_deepfake_updated_at();

-- =============================================================================
-- Row Level Security (RLS)
-- =============================================================================

ALTER TABLE heygen_deepfake ENABLE ROW LEVEL SECURITY;

-- Admin users (via service role) can do everything
CREATE POLICY "Service role full access"
  ON heygen_deepfake
  FOR ALL
  TO service_role
  USING (true)
  WITH CHECK (true);

-- Authenticated users can view their own deepfakes
CREATE POLICY "Users can view own deepfakes"
  ON heygen_deepfake
  FOR SELECT
  TO authenticated
  USING (
    created_by = auth.uid()
    OR
    house_manual_id IN (
      SELECT id FROM housemanual
      WHERE Host = auth.uid()::text
    )
  );

-- =============================================================================
-- Comments for documentation
-- =============================================================================

COMMENT ON TABLE heygen_deepfake IS 'Stores HeyGen deepfake video generation records for house manual welcome videos';
COMMENT ON COLUMN heygen_deepfake.video_token IS 'HeyGen job token used for status polling';
COMMENT ON COLUMN heygen_deepfake.attached_to_manual IS 'Whether this deepfake has been attached to the house manual';
COMMENT ON COLUMN heygen_deepfake.status IS 'Current status: pending (created), processing (HeyGen generating), completed (ready), failed (error)';
