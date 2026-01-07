-- Migration: Create cancellation_reasons reference table
-- Purpose: Store proposal cancellation/rejection reasons for both guests and hosts
-- Date: 2026-01-06

-- Create the table in reference_table schema
CREATE TABLE IF NOT EXISTS reference_table.cancellation_reasons (
  id BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  user_type TEXT NOT NULL CHECK (user_type IN ('guest', 'host')),
  reason TEXT NOT NULL,
  display_order INTEGER NOT NULL DEFAULT 0,
  is_active BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE (user_type, reason)
);

-- Add comment for documentation
COMMENT ON TABLE reference_table.cancellation_reasons IS 'Proposal cancellation/rejection reason options for dropdown selection, segmented by user type (guest or host)';

-- Grant access to roles
GRANT SELECT ON reference_table.cancellation_reasons TO anon, authenticated, service_role;

-- Enable RLS
ALTER TABLE reference_table.cancellation_reasons ENABLE ROW LEVEL SECURITY;

-- Create read-only policy for all users
CREATE POLICY "Allow read access for all users"
  ON reference_table.cancellation_reasons
  FOR SELECT
  USING (true);

-- Create index for efficient filtering by user_type
CREATE INDEX idx_cancellation_reasons_user_type
  ON reference_table.cancellation_reasons (user_type, display_order);

-- Seed with existing guest cancellation reasons
INSERT INTO reference_table.cancellation_reasons (user_type, reason, display_order) VALUES
  ('guest', 'Found another property', 1),
  ('guest', 'Changed move-in dates', 2),
  ('guest', 'Changed budget', 3),
  ('guest', 'Changed location preference', 4),
  ('guest', 'No longer need housing', 5),
  ('guest', 'Host not responsive', 6),
  ('guest', 'Terms not acceptable', 7),
  ('guest', 'Other', 99);

-- Seed with existing host rejection reasons
INSERT INTO reference_table.cancellation_reasons (user_type, reason, display_order) VALUES
  ('host', 'Already have another guest', 1),
  ('host', 'Decided to change the price of my listing for that time frame', 2),
  ('host', 'Want a different schedule', 3),
  ('host', 'Other / Do not want to say', 99);
