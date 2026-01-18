-- Add 6-night rate column to listing table
-- This stores the nightly rate for 6-night stays

ALTER TABLE public.listing
ADD COLUMN IF NOT EXISTS "💰Nightly Host Rate for 6 nights" numeric;

COMMENT ON COLUMN public.listing."💰Nightly Host Rate for 6 nights" IS 'Nightly rate for 6-night stays';
