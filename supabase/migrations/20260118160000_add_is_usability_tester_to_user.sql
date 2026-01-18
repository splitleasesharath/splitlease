-- Migration: add_is_usability_tester_to_user
-- Add column to track which users are usability testers
-- This flag determines who sees the UsabilityPopup for mobile testing

-- Add the is_usability_tester column
ALTER TABLE public.user
ADD COLUMN IF NOT EXISTS is_usability_tester BOOLEAN DEFAULT false;

-- Add partial index for efficient filtering (only indexes true values)
CREATE INDEX IF NOT EXISTS idx_user_is_usability_tester
ON public.user(is_usability_tester)
WHERE is_usability_tester = true;

-- Add column comment for documentation
COMMENT ON COLUMN public.user.is_usability_tester IS
'Flag indicating user participates in usability testing. Synced from Bubble ''is usability tester'' field. When true and user is on desktop, shows UsabilityPopup prompting mobile testing via SMS magic link.';
