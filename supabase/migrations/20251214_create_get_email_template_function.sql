-- Migration: Expose reference_table schema for Edge Function access
-- Purpose: Allow Edge Functions to query email templates from reference_table schema
--
-- IMPORTANT: You must also add 'reference_table' to the "Exposed schemas" list in:
-- Supabase Dashboard > Project Settings > API > Exposed schemas

-- Grant schema usage to service roles
GRANT USAGE ON SCHEMA reference_table TO anon, authenticated, service_role;

-- Grant SELECT on the email templates table (read-only access is sufficient)
GRANT SELECT ON reference_table.zat_email_html_template_eg_sendbasicemailwf_ TO anon, authenticated, service_role;

-- Set default privileges for future tables (optional, for consistency)
ALTER DEFAULT PRIVILEGES FOR ROLE postgres IN SCHEMA reference_table
GRANT SELECT ON TABLES TO anon, authenticated, service_role;
