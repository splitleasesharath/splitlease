-- Migration: Create get_email_template function
-- Purpose: Allow Edge Functions to query email templates from reference_table schema
-- The Supabase JS client only allows public and graphql_public schemas by default,
-- so we need an RPC function to access reference_table schema.

CREATE OR REPLACE FUNCTION public.get_email_template(p_template_id TEXT)
RETURNS JSON
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  result JSON;
BEGIN
  SELECT json_build_object(
    '_id', t._id,
    'Name', t."Name",
    'Email Template JSON', t."Email Template JSON",
    'Description', t."Description",
    'Email Reference', t."Email Reference",
    'Logo', t."Logo",
    'Placeholder', t."Placeholder"
  ) INTO result
  FROM reference_table.zat_email_html_template_eg_sendbasicemailwf_ t
  WHERE t._id = p_template_id;

  RETURN result;
END;
$$;

-- Grant execute permission to authenticated and service_role
GRANT EXECUTE ON FUNCTION public.get_email_template(TEXT) TO authenticated;
GRANT EXECUTE ON FUNCTION public.get_email_template(TEXT) TO service_role;
GRANT EXECUTE ON FUNCTION public.get_email_template(TEXT) TO anon;

COMMENT ON FUNCTION public.get_email_template IS 'Fetch email template from reference_table schema by _id. Used by send-email Edge Function.';
