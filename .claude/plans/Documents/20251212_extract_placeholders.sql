-- Extract placeholders from email templates and update the Placeholders field
-- Run this in Supabase SQL Editor (Dashboard > SQL Editor > New query)

-- First, verify the column exists (creates it if not)
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns
        WHERE table_name = 'zat_email_html_template_eg_sendbasicemailwf_'
        AND column_name = 'Placeholders'
    ) THEN
        ALTER TABLE zat_email_html_template_eg_sendbasicemailwf_
        ADD COLUMN "Placeholders" text[];
    END IF;
END $$;

-- Function to extract placeholders from HTML content
CREATE OR REPLACE FUNCTION extract_placeholders(html_content text)
RETURNS text[] AS $$
DECLARE
    matches text[];
    unique_matches text[];
BEGIN
    IF html_content IS NULL THEN
        RETURN ARRAY[]::text[];
    END IF;

    -- Extract all $$placeholder$$ patterns
    SELECT ARRAY(
        SELECT DISTINCT match[1]
        FROM regexp_matches(html_content, '\$\$[a-zA-Z0-9_]+\$\$', 'g') AS match
    ) INTO unique_matches;

    RETURN COALESCE(unique_matches, ARRAY[]::text[]);
END;
$$ LANGUAGE plpgsql;

-- Update all rows with extracted placeholders
UPDATE zat_email_html_template_eg_sendbasicemailwf_
SET "Placeholders" = extract_placeholders("HTML");

-- Verify the results
SELECT
    "_id",
    "Template Name",
    "Placeholders",
    array_length("Placeholders", 1) as placeholder_count
FROM zat_email_html_template_eg_sendbasicemailwf_
ORDER BY "Template Name";

-- Clean up the function (optional - comment out if you want to keep it)
-- DROP FUNCTION IF EXISTS extract_placeholders(text);
