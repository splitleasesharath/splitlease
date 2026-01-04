-- Add 1-night base rate column to listing table
-- This stores the base price from which longer-stay discounts are calculated

ALTER TABLE public.listing
ADD COLUMN IF NOT EXISTS "💰Nightly Host Rate for 1 night" numeric;

COMMENT ON COLUMN public.listing."💰Nightly Host Rate for 1 night" IS 'Base nightly rate for 1-night stays (no discount)';
