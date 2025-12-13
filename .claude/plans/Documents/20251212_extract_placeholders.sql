-- Extract placeholders from email templates and update the Placeholder field
-- Run this in Supabase SQL Editor (Dashboard > SQL Editor > New query)
--
-- Table: zat_email_html_template_eg_sendbasicemailwf_
-- Input field: Email Template JSON
-- Target field: Placeholder
--
-- Placeholder format: $placeholder$ (single dollar signs, allows spaces)
-- Examples: $to$, $from email$, $body text$, $logo url$

-- First, verify the column exists (creates it if not)
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns
        WHERE table_name = 'zat_email_html_template_eg_sendbasicemailwf_'
        AND column_name = 'Placeholder'
    ) THEN
        ALTER TABLE zat_email_html_template_eg_sendbasicemailwf_
        ADD COLUMN "Placeholder" text[];
    END IF;
END $$;

-- Function to extract placeholders from JSON/HTML content
-- Pattern: $word$ or $word word$ (single $ delimiters, alphanumeric with spaces/underscores)
CREATE OR REPLACE FUNCTION extract_email_placeholders(content text)
RETURNS text[] AS $$
DECLARE
    unique_matches text[];
BEGIN
    IF content IS NULL THEN
        RETURN ARRAY[]::text[];
    END IF;

    -- Extract all $placeholder$ patterns (single $, allows spaces and underscores)
    -- Pattern matches: $ followed by word chars/spaces, followed by $
    SELECT ARRAY(
        SELECT DISTINCT match[1]
        FROM regexp_matches(content, E'\\$([a-zA-Z][a-zA-Z0-9_ ]*)\\$', 'g') AS match
    ) INTO unique_matches;

    -- Convert back to full placeholder format with $ delimiters
    SELECT ARRAY(
        SELECT '$' || unnest || '$'
        FROM unnest(unique_matches)
    ) INTO unique_matches;

    RETURN COALESCE(unique_matches, ARRAY[]::text[]);
END;
$$ LANGUAGE plpgsql;

-- Update all rows with extracted placeholders from Email Template JSON field
UPDATE zat_email_html_template_eg_sendbasicemailwf_
SET "Placeholder" = extract_email_placeholders("Email Template JSON");

-- Verify the results
SELECT
    "_id",
    "Placeholder",
    array_length("Placeholder", 1) as placeholder_count
FROM zat_email_html_template_eg_sendbasicemailwf_;

-- Optional: Clean up the function after use
-- DROP FUNCTION IF EXISTS extract_email_placeholders(text);
