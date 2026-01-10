-- Migration: Add blocked_at timestamp fields for throttling
-- These fields track when a user was blocked so the cron job can restore after 24 hours

-- Add blocked_at timestamp columns to bookings_leases
ALTER TABLE bookings_leases
ADD COLUMN IF NOT EXISTS "Throttling - guest blocked at" timestamptz DEFAULT NULL,
ADD COLUMN IF NOT EXISTS "Throttling - host blocked at" timestamptz DEFAULT NULL;

-- Add comments for documentation
COMMENT ON COLUMN bookings_leases."Throttling - guest blocked at" IS 'Timestamp when guest was blocked from creating date change requests';
COMMENT ON COLUMN bookings_leases."Throttling - host blocked at" IS 'Timestamp when host was blocked from creating date change requests';
