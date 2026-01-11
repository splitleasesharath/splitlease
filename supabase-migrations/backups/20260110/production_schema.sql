--
-- PostgreSQL database dump
--

\restrict frbiVfSiMH3H3hhSXMJLrGeR8mqfUgERcrJHPIM7gmiCnmVWi4ZXFf7DeqQdYdm

-- Dumped from database version 17.6
-- Dumped by pg_dump version 17.7

SET statement_timeout = 0;
SET lock_timeout = 0;
SET idle_in_transaction_session_timeout = 0;
SET transaction_timeout = 0;
SET client_encoding = 'UTF8';
SET standard_conforming_strings = on;
SELECT pg_catalog.set_config('search_path', '', false);
SET check_function_bodies = false;
SET xmloption = content;
SET client_min_messages = warning;
SET row_security = off;

--
-- Name: pg_cron; Type: EXTENSION; Schema: -; Owner: -
--

CREATE EXTENSION IF NOT EXISTS pg_cron WITH SCHEMA pg_catalog;


--
-- Name: EXTENSION pg_cron; Type: COMMENT; Schema: -; Owner: -
--

COMMENT ON EXTENSION pg_cron IS 'Job scheduler for PostgreSQL';


--
-- Name: junctions; Type: SCHEMA; Schema: -; Owner: -
--

CREATE SCHEMA junctions;


--
-- Name: migration_backup; Type: SCHEMA; Schema: -; Owner: -
--

CREATE SCHEMA migration_backup;


--
-- Name: pg_net; Type: EXTENSION; Schema: -; Owner: -
--

CREATE EXTENSION IF NOT EXISTS pg_net WITH SCHEMA extensions;


--
-- Name: EXTENSION pg_net; Type: COMMENT; Schema: -; Owner: -
--

COMMENT ON EXTENSION pg_net IS 'Async HTTP';


--
-- Name: pgbouncer; Type: SCHEMA; Schema: -; Owner: -
--

CREATE SCHEMA pgbouncer;


--
-- Name: pgmq; Type: SCHEMA; Schema: -; Owner: -
--

CREATE SCHEMA pgmq;


--
-- Name: reference_table; Type: SCHEMA; Schema: -; Owner: -
--

CREATE SCHEMA reference_table;


--
-- Name: supabase_migrations; Type: SCHEMA; Schema: -; Owner: -
--

CREATE SCHEMA supabase_migrations;


--
-- Name: workflows; Type: SCHEMA; Schema: -; Owner: -
--

CREATE SCHEMA workflows;


--
-- Name: pg_graphql; Type: EXTENSION; Schema: -; Owner: -
--

CREATE EXTENSION IF NOT EXISTS pg_graphql WITH SCHEMA graphql;


--
-- Name: EXTENSION pg_graphql; Type: COMMENT; Schema: -; Owner: -
--

COMMENT ON EXTENSION pg_graphql IS 'pg_graphql: GraphQL support';


--
-- Name: pg_stat_statements; Type: EXTENSION; Schema: -; Owner: -
--

CREATE EXTENSION IF NOT EXISTS pg_stat_statements WITH SCHEMA extensions;


--
-- Name: EXTENSION pg_stat_statements; Type: COMMENT; Schema: -; Owner: -
--

COMMENT ON EXTENSION pg_stat_statements IS 'track planning and execution statistics of all SQL statements executed';


--
-- Name: pgcrypto; Type: EXTENSION; Schema: -; Owner: -
--

CREATE EXTENSION IF NOT EXISTS pgcrypto WITH SCHEMA extensions;


--
-- Name: EXTENSION pgcrypto; Type: COMMENT; Schema: -; Owner: -
--

COMMENT ON EXTENSION pgcrypto IS 'cryptographic functions';


--
-- Name: pgmq; Type: EXTENSION; Schema: -; Owner: -
--

CREATE EXTENSION IF NOT EXISTS pgmq WITH SCHEMA pgmq;


--
-- Name: EXTENSION pgmq; Type: COMMENT; Schema: -; Owner: -
--

COMMENT ON EXTENSION pgmq IS 'A lightweight message queue. Like AWS SQS and RSMQ but on Postgres.';


--
-- Name: supabase_vault; Type: EXTENSION; Schema: -; Owner: -
--

CREATE EXTENSION IF NOT EXISTS supabase_vault WITH SCHEMA vault;


--
-- Name: EXTENSION supabase_vault; Type: COMMENT; Schema: -; Owner: -
--

COMMENT ON EXTENSION supabase_vault IS 'Supabase Vault Extension';


--
-- Name: uuid-ossp; Type: EXTENSION; Schema: -; Owner: -
--

CREATE EXTENSION IF NOT EXISTS "uuid-ossp" WITH SCHEMA extensions;


--
-- Name: EXTENSION "uuid-ossp"; Type: COMMENT; Schema: -; Owner: -
--

COMMENT ON EXTENSION "uuid-ossp" IS 'generate universally unique identifiers (UUIDs)';


--
-- Name: thread_message_type; Type: TYPE; Schema: junctions; Owner: -
--

CREATE TYPE junctions.thread_message_type AS ENUM (
    'all',
    'slbot_to_host',
    'slbot_to_guest',
    'host_sent',
    'guest_sent'
);


--
-- Name: Notification Preferences; Type: TYPE; Schema: public; Owner: -
--

CREATE TYPE public."Notification Preferences" AS ENUM (
    'Email',
    'SMS',
    'In-App Message'
);


--
-- Name: User Type; Type: TYPE; Schema: public; Owner: -
--

CREATE TYPE public."User Type" AS ENUM (
    'A Host (I have a space available to rent)',
    'A Guest (I would like to rent a space)',
    'Split Lease',
    'Trial Host'
);


--
-- Name: get_auth(text); Type: FUNCTION; Schema: pgbouncer; Owner: -
--

CREATE FUNCTION pgbouncer.get_auth(p_usename text) RETURNS TABLE(username text, password text)
    LANGUAGE plpgsql SECURITY DEFINER
    SET search_path TO ''
    AS $_$
  BEGIN
      RAISE DEBUG 'PgBouncer auth request: %', p_usename;

      RETURN QUERY
      SELECT
          rolname::text,
          CASE WHEN rolvaliduntil < now()
              THEN null
              ELSE rolpassword::text
          END
      FROM pg_authid
      WHERE rolname=$1 and rolcanlogin;
  END;
  $_$;


--
-- Name: add_user_to_thread(text, text, text); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.add_user_to_thread(p_user_id text, p_thread_id text, p_role text DEFAULT 'participant'::text) RETURNS void
    LANGUAGE plpgsql SECURITY DEFINER
    AS $$
BEGIN
  -- Insert into user_thread junction (if table exists)
  BEGIN
    INSERT INTO junctions.user_thread (user_id, thread_id, role, joined_at)
    VALUES (p_user_id, p_thread_id, p_role, NOW())
    ON CONFLICT (user_id, thread_id) DO NOTHING;
  EXCEPTION
    WHEN undefined_table THEN
      RAISE WARNING 'junctions.user_thread table does not exist';
  END;

  -- Insert into thread_participant junction (if table exists)
  BEGIN
    INSERT INTO junctions.thread_participant (thread_id, user_id, role, joined_at)
    VALUES (p_thread_id, p_user_id, p_role, NOW())
    ON CONFLICT (thread_id, user_id) DO NOTHING;
  EXCEPTION
    WHEN undefined_table THEN
      RAISE WARNING 'junctions.thread_participant table does not exist';
  END;
END;
$$;


--
-- Name: FUNCTION add_user_to_thread(p_user_id text, p_thread_id text, p_role text); Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON FUNCTION public.add_user_to_thread(p_user_id text, p_thread_id text, p_role text) IS 'Helper function to add a user to a thread via junction tables';


--
-- Name: broadcast_new_message(); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.broadcast_new_message() RETURNS trigger
    LANGUAGE plpgsql SECURITY DEFINER
    AS $$
DECLARE
  thread_record RECORD;
  sender_record RECORD;
  channel_name TEXT;
  broadcast_payload JSONB;
BEGIN
  -- Get thread info for channel name
  SELECT _id, "-Host User", "-Guest User", "Listing"
  INTO thread_record
  FROM public.thread
  WHERE _id = NEW."Associated Thread/Conversation";

  -- Get sender info
  SELECT _id, "First Name", "Last Name", "Profile Photo"
  INTO sender_record
  FROM public."user"
  WHERE _id = NEW."-Originator User";

  -- Build channel name
  channel_name := 'thread-' || NEW."Associated Thread/Conversation";

  -- Build broadcast payload
  broadcast_payload := jsonb_build_object(
    'type', 'new_message',
    'message', jsonb_build_object(
      '_id', NEW._id,
      'thread_id', NEW."Associated Thread/Conversation",
      'message_body', NEW."Message Body",
      'sender_id', NEW."-Originator User",
      'sender_name', COALESCE(sender_record."First Name", '') || ' ' || COALESCE(sender_record."Last Name", ''),
      'sender_avatar', sender_record."Profile Photo",
      'is_split_bot', COALESCE(NEW."is Split Bot", false),
      'created_at', NEW."Created Date",
      'call_to_action', NEW."Call to Action",
      'split_bot_warning', NEW."Split Bot Warning"
    ),
    'host_user', thread_record."-Host User",
    'guest_user', thread_record."-Guest User"
  );

  -- Broadcast to thread-specific channel using realtime.send
  PERFORM realtime.send(
    broadcast_payload,
    'new_message',
    channel_name,
    false
  );

  RETURN NEW;
EXCEPTION
  WHEN OTHERS THEN
    -- Log error but don't fail the insert
    RAISE WARNING 'broadcast_new_message failed: %', SQLERRM;
    RETURN NEW;
END;
$$;


--
-- Name: FUNCTION broadcast_new_message(); Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON FUNCTION public.broadcast_new_message() IS 'Broadcasts new messages to Realtime channel for instant delivery';


--
-- Name: check_proposals_list_integrity(); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.check_proposals_list_integrity() RETURNS TABLE(user_id text, orphaned_proposal_id text)
    LANGUAGE plpgsql
    AS $$
BEGIN
  RETURN QUERY
  SELECT
    u._id as user_id,
    unnest(u."Proposals List") as orphaned_proposal_id
  FROM public."user" u
  WHERE u."Proposals List" IS NOT NULL
    AND array_length(u."Proposals List", 1) > 0
  EXCEPT
  SELECT
    u._id as user_id,
    p._id as orphaned_proposal_id
  FROM public."user" u
  CROSS JOIN LATERAL unnest(u."Proposals List") as proposal_id
  JOIN public.proposal p ON p._id = proposal_id
  WHERE u."Proposals List" IS NOT NULL;
END;
$$;


--
-- Name: extract_email_placeholders(text); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.extract_email_placeholders(content text) RETURNS text[]
    LANGUAGE plpgsql
    AS $_$
DECLARE
    unique_matches text[];
BEGIN
    IF content IS NULL THEN
        RETURN ARRAY[]::text[];
    END IF;

    -- Extract placeholder patterns (double dollar signs, allows spaces and underscores)
    SELECT ARRAY(
        SELECT DISTINCT match[1]
        FROM regexp_matches(content, E'\\$\\$([a-zA-Z][a-zA-Z0-9_ ]*)\\$\\$', 'g') AS match
    ) INTO unique_matches;

    -- Convert back to full placeholder format with double dollar delimiters
    SELECT ARRAY(
        SELECT chr(36) || chr(36) || unnest || chr(36) || chr(36)
        FROM unnest(unique_matches)
    ) INTO unique_matches;

    RETURN COALESCE(unique_matches, ARRAY[]::text[]);
END;
$_$;


--
-- Name: generate_bubble_id(); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.generate_bubble_id() RETURNS text
    LANGUAGE plpgsql
    AS $$
DECLARE
  timestamp_part bigint;
  random_part bigint;
BEGIN
  -- 13-digit millisecond timestamp
  timestamp_part := (EXTRACT(EPOCH FROM clock_timestamp()) * 1000)::bigint;
  
  -- 17-digit random number (safe for bigint)
  random_part := floor(random() * 1e17)::bigint;
  
  RETURN timestamp_part::text || 'x' || lpad(random_part::text, 17, '0');
END;
$$;


--
-- Name: get_host_listings(text); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.get_host_listings(host_user_id text) RETURNS TABLE(id text, _id text, "Name" text, "Created By" text, "Host User" text, "Complete" boolean, "Location - Borough" text, "Location - City" text, "Location - State" text, "Location - Address" jsonb, "Features - Photos" jsonb, rental_type text, min_nightly numeric, rate_2_nights numeric, rate_3_nights numeric, rate_4_nights numeric, rate_5_nights numeric, rate_7_nights numeric, weekly_rate numeric, monthly_rate numeric, cleaning_fee numeric, damage_deposit numeric, pricing_list jsonb, source text, bedrooms numeric, bathrooms numeric, hood text)
    LANGUAGE plpgsql STABLE
    AS $$
BEGIN
  RETURN QUERY
  -- Get from listing table only (listing_trial table has been removed)
  SELECT 
    l._id::TEXT as id,
    l._id,
    l."Name",
    l."Created By",
    l."Host User",
    l."Complete",
    l."Location - Borough",
    l."Location - City",
    l."Location - State",
    l."Location - Address",
    l."Features - Photos",
    l."rental type" as rental_type,
    l."Standarized Minimum Nightly Price (Filter)"::NUMERIC as min_nightly,
    l."💰Nightly Host Rate for 2 nights"::NUMERIC as rate_2_nights,
    l."💰Nightly Host Rate for 3 nights"::NUMERIC as rate_3_nights,
    l."💰Nightly Host Rate for 4 nights"::NUMERIC as rate_4_nights,
    l."💰Nightly Host Rate for 5 nights"::NUMERIC as rate_5_nights,
    l."💰Nightly Host Rate for 7 nights"::NUMERIC as rate_7_nights,
    l."💰Weekly Host Rate"::NUMERIC as weekly_rate,
    l."💰Monthly Host Rate"::NUMERIC as monthly_rate,
    l."💰Cleaning Cost / Maintenance Fee"::NUMERIC as cleaning_fee,
    l."💰Damage Deposit"::NUMERIC as damage_deposit,
    l.pricing_list::jsonb,
    'listing'::TEXT as source,
    l."Features - Qty Bedrooms"::NUMERIC as bedrooms,
    l."Features - Qty Bathrooms"::NUMERIC as bathrooms,
    l."Location - Hood" as hood
  FROM listing l
  WHERE (l."Host User" = host_user_id OR l."Created By" = host_user_id)
    AND l."Deleted" = false;
END;
$$;


--
-- Name: get_neighborhood_by_zip(text); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.get_neighborhood_by_zip(zip_code text) RETURNS TABLE("Display" text, "Neighborhood Description" text, "Zips" jsonb)
    LANGUAGE plpgsql
    AS $$
BEGIN
  RETURN QUERY
  SELECT 
    z."Display",
    z."Neighborhood Description",
    z."Zips"
  FROM reference_table.zat_geo_hood_mediumlevel z
  WHERE z."Zips" @> to_jsonb(ARRAY[zip_code])
  LIMIT 1;
END;
$$;


--
-- Name: get_pending_parsing_jobs(integer); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.get_pending_parsing_jobs(limit_count integer DEFAULT 10) RETURNS TABLE(job_id uuid, user_id text, email text, freeform_text text, created_at timestamp with time zone)
    LANGUAGE plpgsql SECURITY DEFINER
    AS $$
BEGIN
  RETURN QUERY
  SELECT 
    q.id,
    q.user_id,
    q.email,
    q.freeform_text,
    q.created_at
  FROM ai_parsing_queue q
  WHERE q.status = 'pending'
  ORDER BY q.created_at ASC
  LIMIT limit_count;
END;
$$;


--
-- Name: FUNCTION get_pending_parsing_jobs(limit_count integer); Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON FUNCTION public.get_pending_parsing_jobs(limit_count integer) IS 'Returns pending AI parsing jobs for batch processing';


--
-- Name: get_user_bubble_id(); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.get_user_bubble_id() RETURNS text
    LANGUAGE sql STABLE SECURITY DEFINER
    AS $$
  SELECT u._id
  FROM public."user" u
  WHERE u.email = (SELECT email FROM auth.users WHERE id = auth.uid())
  LIMIT 1;
$$;


--
-- Name: FUNCTION get_user_bubble_id(); Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON FUNCTION public.get_user_bubble_id() IS 'Returns the Bubble _id for the currently authenticated user based on email match';


--
-- Name: get_user_favorites(text); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.get_user_favorites(p_user_id text) RETURNS text[]
    LANGUAGE sql STABLE SECURITY DEFINER
    AS $$
  SELECT COALESCE(
    array_agg(listing_id ORDER BY favorited_at DESC),
    ARRAY[]::text[]
  )
  FROM junctions.user_listing_favorite
  WHERE user_id = p_user_id;
$$;


--
-- Name: FUNCTION get_user_favorites(p_user_id text); Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON FUNCTION public.get_user_favorites(p_user_id text) IS 'Get user favorited listing IDs from junction table';


--
-- Name: get_user_junction_counts(text); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.get_user_junction_counts(p_user_id text) RETURNS TABLE(favorites_count bigint, proposals_count bigint)
    LANGUAGE sql STABLE SECURITY DEFINER
    AS $$
  SELECT
    (SELECT COUNT(*) FROM junctions.user_listing_favorite WHERE user_id = p_user_id) AS favorites_count,
    (SELECT COUNT(*) FROM public.proposal WHERE "Created By" = p_user_id) AS proposals_count;
$$;


--
-- Name: FUNCTION get_user_junction_counts(p_user_id text); Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON FUNCTION public.get_user_junction_counts(p_user_id text) IS 'Get user favorites and proposals counts from junction tables';


--
-- Name: get_user_preferred_hoods(text); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.get_user_preferred_hoods(p_user_id text) RETURNS text[]
    LANGUAGE sql STABLE SECURITY DEFINER
    AS $$
  SELECT COALESCE(
    array_agg(hood_id ORDER BY preference_order),
    ARRAY[]::text[]
  )
  FROM junctions.user_preferred_hood
  WHERE user_id = p_user_id;
$$;


--
-- Name: FUNCTION get_user_preferred_hoods(p_user_id text); Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON FUNCTION public.get_user_preferred_hoods(p_user_id text) IS 'Get user preferred neighborhood IDs from junction table';


--
-- Name: get_user_proposals(text); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.get_user_proposals(p_user_id text) RETURNS text[]
    LANGUAGE sql STABLE SECURITY DEFINER
    AS $$
  SELECT COALESCE(
    array_agg(proposal_id ORDER BY created_at DESC),
    ARRAY[]::text[]
  )
  FROM junctions.user_proposal
  WHERE user_id = p_user_id;
$$;


--
-- Name: FUNCTION get_user_proposals(p_user_id text); Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON FUNCTION public.get_user_proposals(p_user_id text) IS 'Get user proposal IDs from junction table';


--
-- Name: get_user_proposals_by_role(text, text); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.get_user_proposals_by_role(p_user_id text, p_role text) RETURNS text[]
    LANGUAGE sql STABLE SECURITY DEFINER
    AS $$
  SELECT COALESCE(
    array_agg(proposal_id ORDER BY created_at DESC),
    ARRAY[]::text[]
  )
  FROM junctions.user_proposal
  WHERE user_id = p_user_id
    AND role = p_role;
$$;


--
-- Name: FUNCTION get_user_proposals_by_role(p_user_id text, p_role text); Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON FUNCTION public.get_user_proposals_by_role(p_user_id text, p_role text) IS 'Get user proposal IDs by role (guest/host) from junction table';


--
-- Name: get_user_storage_items(text); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.get_user_storage_items(p_user_id text) RETURNS text[]
    LANGUAGE sql STABLE SECURITY DEFINER
    AS $$
  SELECT COALESCE(
    array_agg(storage_id ORDER BY created_at),
    ARRAY[]::text[]
  )
  FROM junctions.user_storage_item
  WHERE user_id = p_user_id;
$$;


--
-- Name: FUNCTION get_user_storage_items(p_user_id text); Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON FUNCTION public.get_user_storage_items(p_user_id text) IS 'Get user commonly stored item IDs from junction table';


--
-- Name: invoke_bubble_sync_processor(); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.invoke_bubble_sync_processor() RETURNS void
    LANGUAGE plpgsql
    AS $$
DECLARE
    response_id BIGINT;
    supabase_url TEXT;
    service_role_key TEXT;
    pending_count INTEGER;
BEGIN
    SELECT COUNT(*) INTO pending_count
    FROM sync_queue
    WHERE status = 'pending'
      AND operation IN ('SIGNUP_ATOMIC', 'INSERT', 'UPDATE');

    IF pending_count = 0 THEN
        RAISE NOTICE '[bubble_sync_processor] No pending items in queue';
        RETURN;
    END IF;

    RAISE NOTICE '[bubble_sync_processor] Found % pending items, invoking Edge Function', pending_count;

    SELECT decrypted_secret INTO supabase_url
    FROM vault.decrypted_secrets
    WHERE name = 'supabase_url';

    SELECT decrypted_secret INTO service_role_key
    FROM vault.decrypted_secrets
    WHERE name = 'service_role_key';

    IF supabase_url IS NULL OR service_role_key IS NULL THEN
        RAISE WARNING '[bubble_sync_processor] Vault secrets not configured';
        RETURN;
    END IF;

    SELECT net.http_post(
        url := supabase_url || '/functions/v1/bubble_sync',
        headers := jsonb_build_object(
            'Content-Type', 'application/json',
            'Authorization', 'Bearer ' || service_role_key
        ),
        body := jsonb_build_object(
            'action', 'process_queue_data_api',
            'payload', jsonb_build_object(
                'limit', 10,
                'batch_size', 5
            )
        ),
        timeout_milliseconds := 30000
    ) INTO response_id;

    RAISE NOTICE '[bubble_sync_processor] Edge Function invoked, request ID: %', response_id;
END;
$$;


--
-- Name: invoke_bubble_sync_retry(); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.invoke_bubble_sync_retry() RETURNS void
    LANGUAGE plpgsql
    AS $$
DECLARE
    response_id BIGINT;
    supabase_url TEXT;
    service_role_key TEXT;
    failed_count INTEGER;
BEGIN
    SELECT COUNT(*) INTO failed_count
    FROM sync_queue
    WHERE status = 'failed'
      AND retry_count < max_retries
      AND (next_retry_at IS NULL OR next_retry_at <= NOW());

    IF failed_count = 0 THEN
        RAISE NOTICE '[bubble_sync_retry] No failed items to retry';
        RETURN;
    END IF;

    RAISE NOTICE '[bubble_sync_retry] Found % failed items to retry', failed_count;

    SELECT decrypted_secret INTO supabase_url
    FROM vault.decrypted_secrets
    WHERE name = 'supabase_url';

    SELECT decrypted_secret INTO service_role_key
    FROM vault.decrypted_secrets
    WHERE name = 'service_role_key';

    IF supabase_url IS NULL OR service_role_key IS NULL THEN
        RAISE WARNING '[bubble_sync_retry] Vault secrets not configured';
        RETURN;
    END IF;

    SELECT net.http_post(
        url := supabase_url || '/functions/v1/bubble_sync',
        headers := jsonb_build_object(
            'Content-Type', 'application/json',
            'Authorization', 'Bearer ' || service_role_key
        ),
        body := jsonb_build_object(
            'action', 'retry_failed',
            'payload', jsonb_build_object()
        ),
        timeout_milliseconds := 30000
    ) INTO response_id;

    RAISE NOTICE '[bubble_sync_retry] Retry request sent, ID: %', response_id;
END;
$$;


--
-- Name: is_listing_favorited(text, text); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.is_listing_favorited(p_user_id text, p_listing_id text) RETURNS boolean
    LANGUAGE sql STABLE SECURITY DEFINER
    AS $$
  SELECT EXISTS(
    SELECT 1 FROM junctions.user_listing_favorite
    WHERE user_id = p_user_id AND listing_id = p_listing_id
  );
$$;


--
-- Name: FUNCTION is_listing_favorited(p_user_id text, p_listing_id text); Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON FUNCTION public.is_listing_favorited(p_user_id text, p_listing_id text) IS 'Check if a listing is in user favorites';


--
-- Name: move_failed_workflows_to_dlq(); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.move_failed_workflows_to_dlq() RETURNS void
    LANGUAGE plpgsql SECURITY DEFINER
    AS $$
DECLARE
    moved_count INTEGER := 0;
BEGIN
    -- Move messages that have been read 5+ times to DLQ
    WITH failed_messages AS (
        SELECT msg_id, message
        FROM pgmq.q_workflow_queue
        WHERE read_ct >= 5
    ),
    archived AS (
        SELECT pgmq.send('workflow_dlq', message)
        FROM failed_messages
    )
    SELECT COUNT(*) INTO moved_count FROM failed_messages;

    -- Delete from main queue
    DELETE FROM pgmq.q_workflow_queue WHERE read_ct >= 5;

    IF moved_count > 0 THEN
        RAISE LOG 'move_failed_workflows_to_dlq: Moved % workflows to DLQ', moved_count;
    END IF;
END;
$$;


--
-- Name: populate_thread_message_junction(); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.populate_thread_message_junction() RETURNS trigger
    LANGUAGE plpgsql SECURITY DEFINER
    AS $$
DECLARE
  v_message_type junctions.thread_message_type;
  v_thread RECORD;
BEGIN
  -- Get thread info
  SELECT "-Host User", "-Guest User"
  INTO v_thread
  FROM public.thread
  WHERE _id = NEW."Associated Thread/Conversation";

  -- Determine message type based on sender and visibility
  IF NEW."is Split Bot" = true THEN
    -- SplitBot messages
    IF NEW."is Visible to Host" = true AND NEW."is Visible to Guest" = false THEN
      v_message_type := 'slbot_to_host';
    ELSIF NEW."is Visible to Guest" = true AND NEW."is Visible to Host" = false THEN
      v_message_type := 'slbot_to_guest';
    ELSE
      v_message_type := 'all';
    END IF;
  ELSIF NEW."-Originator User" = v_thread."-Host User" THEN
    v_message_type := 'host_sent';
  ELSIF NEW."-Originator User" = v_thread."-Guest User" THEN
    v_message_type := 'guest_sent';
  ELSE
    v_message_type := 'all';
  END IF;

  -- Insert into junction table
  INSERT INTO junctions.thread_message (thread_id, message_id, message_type)
  VALUES (NEW."Associated Thread/Conversation", NEW._id, v_message_type)
  ON CONFLICT (thread_id, message_id) DO NOTHING;

  RETURN NEW;
END;
$$;


--
-- Name: populate_thread_participant_junction(); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.populate_thread_participant_junction() RETURNS trigger
    LANGUAGE plpgsql SECURITY DEFINER
    AS $$
BEGIN
  -- Add host participant
  INSERT INTO junctions.thread_participant (thread_id, user_id, role)
  VALUES (NEW._id, NEW."-Host User", 'host')
  ON CONFLICT (thread_id, user_id) DO NOTHING;

  -- Add guest participant
  INSERT INTO junctions.thread_participant (thread_id, user_id, role)
  VALUES (NEW._id, NEW."-Guest User", 'guest')
  ON CONFLICT (thread_id, user_id) DO NOTHING;

  RETURN NEW;
END;
$$;


--
-- Name: trigger_ai_parsing_batch(); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.trigger_ai_parsing_batch() RETURNS void
    LANGUAGE plpgsql SECURITY DEFINER
    AS $$
DECLARE
  pending_count integer;
BEGIN
  -- Check if there are pending jobs
  SELECT COUNT(*) INTO pending_count
  FROM ai_parsing_queue
  WHERE status = 'pending';

  -- Only trigger if there are pending jobs
  IF pending_count > 0 THEN
    RAISE NOTICE 'Found % pending parsing jobs, triggering batch processing', pending_count;
    
    -- The actual processing happens via edge function
    -- This function just logs the trigger
    -- Edge function will be called via HTTP cron or external scheduler
  END IF;
END;
$$;


--
-- Name: FUNCTION trigger_ai_parsing_batch(); Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON FUNCTION public.trigger_ai_parsing_batch() IS 'Triggered by pg_cron every 15 minutes to log pending AI parsing jobs.
The actual batch processing is done by:
1. Calling POST /functions/v1/ai-parse-profile with action: "process_batch"
2. This should be set up via Supabase Edge Function Schedules or external cron service';


--
-- Name: trigger_listing_sync_queue(); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.trigger_listing_sync_queue() RETURNS trigger
    LANGUAGE plpgsql SECURITY DEFINER
    SET search_path TO 'public'
    AS $$
BEGIN
    -- Only queue if bubble_id is NULL (not yet synced to Bubble)
    IF NEW.bubble_id IS NULL THEN
        INSERT INTO sync_queue (
            table_name,
            record_id,
            operation,
            payload,
            status,
            idempotency_key
        ) VALUES (
            'listing',
            NEW._id,
            'INSERT',
            to_jsonb(NEW)
                -- Internal/metadata fields
                - 'bubble_id'
                - 'created_at'
                - 'updated_at'
                - 'host_type'
                - 'market_strategy'
                - 'pending'
                - 'sync_status'
                - 'bubble_sync_error'
                - '_internal'
                -- User references (need bubble_id mapping)
                - 'Host / Landlord'
                - 'Created By'
                -- Complex fields
                - 'Features - Photos'
                -- Reference fields (Bubble expects object IDs)
                - 'Location - City'
                - 'Cancellation Policy'
                - 'Features - Parking type'
                - 'Features - Type of Space'
                -- Time fields (need special formatting)
                - 'NEW Date Check-in Time'
                - 'NEW Date Check-out Time'
                -- Day conversion fields
                - 'Days Available (List of Days)',
            'pending',
            'listing:' || NEW._id || ':' || extract(epoch from now())::text
        )
        ON CONFLICT ON CONSTRAINT sync_queue_idempotency_key_key
        DO UPDATE SET
            payload = EXCLUDED.payload,
            created_at = NOW();

        RAISE NOTICE '[trigger_listing_sync_queue] Queued listing % for Bubble sync', NEW._id;
    END IF;

    RETURN NEW;
END;
$$;


--
-- Name: FUNCTION trigger_listing_sync_queue(); Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON FUNCTION public.trigger_listing_sync_queue() IS 'Auto-queues new listings to sync_queue for Bubble sync. Excludes reference fields, time fields, and internal metadata.';


--
-- Name: trigger_sync_queue(); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.trigger_sync_queue() RETURNS trigger
    LANGUAGE plpgsql
    AS $$
DECLARE
    config_record RECORD;
    should_sync BOOLEAN := FALSE;
    op_type TEXT;
    record_data JSONB;
    record_id TEXT;
BEGIN
    -- Determine operation type and get record data
    IF TG_OP = 'INSERT' THEN
        op_type := 'INSERT';
        record_data := to_jsonb(NEW);
        record_id := NEW._id;
    ELSIF TG_OP = 'UPDATE' THEN
        op_type := 'UPDATE';
        record_data := to_jsonb(NEW);
        record_id := NEW._id;
    ELSIF TG_OP = 'DELETE' THEN
        op_type := 'DELETE';
        record_data := to_jsonb(OLD);
        record_id := OLD._id;
    END IF;

    -- Skip if no _id (shouldn't happen but safety check)
    IF record_id IS NULL THEN
        RETURN COALESCE(NEW, OLD);
    END IF;

    -- Check if sync is configured and enabled for this table/operation
    SELECT * INTO config_record
    FROM sync_config
    WHERE supabase_table = TG_TABLE_NAME
      AND enabled = TRUE;

    IF config_record IS NULL THEN
        -- No config for this table, skip silently
        RETURN COALESCE(NEW, OLD);
    END IF;

    -- Check operation-specific flags
    IF (op_type = 'INSERT' AND config_record.sync_on_insert) OR
       (op_type = 'UPDATE' AND config_record.sync_on_update) OR
       (op_type = 'DELETE' AND config_record.sync_on_delete) THEN
        should_sync := TRUE;
    END IF;

    IF should_sync THEN
        -- Remove excluded fields from payload
        IF config_record.excluded_fields IS NOT NULL THEN
            DECLARE
                field TEXT;
            BEGIN
                FOREACH field IN ARRAY config_record.excluded_fields
                LOOP
                    record_data := record_data - field;
                END LOOP;
            END;
        END IF;

        -- Insert into queue (or update existing pending entry for same record)
        INSERT INTO sync_queue (
            table_name,
            record_id,
            operation,
            payload,
            idempotency_key
        ) VALUES (
            TG_TABLE_NAME,
            record_id,
            op_type,
            record_data,
            TG_TABLE_NAME || ':' || record_id || ':' || extract(epoch from now())::text
        )
        ON CONFLICT ON CONSTRAINT idx_sync_queue_pending_unique
        DO UPDATE SET
            payload = EXCLUDED.payload,
            operation = EXCLUDED.operation,
            created_at = NOW(),
            idempotency_key = EXCLUDED.idempotency_key;
    END IF;

    RETURN COALESCE(NEW, OLD);
END;
$$;


--
-- Name: FUNCTION trigger_sync_queue(); Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON FUNCTION public.trigger_sync_queue() IS 'Generic trigger function that adds database changes to the sync queue.';


--
-- Name: trigger_workflow_cron(); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.trigger_workflow_cron() RETURNS void
    LANGUAGE plpgsql SECURITY DEFINER
    AS $$
DECLARE
    supabase_url TEXT;
    service_role_key TEXT;
    pending_count INTEGER;
BEGIN
    -- Check if there are pending workflows
    SELECT COUNT(*) INTO pending_count
    FROM pgmq.q_workflow_queue;

    IF pending_count = 0 THEN
        RETURN;
    END IF;

    -- Get secrets from Vault
    SELECT decrypted_secret INTO supabase_url
    FROM vault.decrypted_secrets WHERE name = 'supabase_url';

    SELECT decrypted_secret INTO service_role_key
    FROM vault.decrypted_secrets WHERE name = 'service_role_key';

    IF supabase_url IS NULL OR service_role_key IS NULL THEN
        RAISE WARNING 'Vault secrets not configured for workflow cron';
        RETURN;
    END IF;

    RAISE LOG 'workflow_cron: Found % pending workflows, triggering orchestrator', pending_count;

    PERFORM net.http_post(
        url := supabase_url || '/functions/v1/workflow-orchestrator',
        headers := jsonb_build_object(
            'Content-Type', 'application/json',
            'Authorization', 'Bearer ' || service_role_key
        ),
        body := jsonb_build_object(
            'action', 'process',
            'payload', jsonb_build_object('triggered_by', 'cron_backup')
        ),
        timeout_milliseconds := 10000
    );

EXCEPTION
    WHEN OTHERS THEN
        RAISE WARNING 'trigger_workflow_cron failed: %', SQLERRM;
END;
$$;


--
-- Name: trigger_workflow_orchestrator(); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.trigger_workflow_orchestrator() RETURNS trigger
    LANGUAGE plpgsql SECURITY DEFINER
    AS $$
DECLARE
    supabase_url TEXT;
    service_role_key TEXT;
BEGIN
    -- Get secrets from Vault
    SELECT decrypted_secret INTO supabase_url
    FROM vault.decrypted_secrets WHERE name = 'supabase_url';

    SELECT decrypted_secret INTO service_role_key
    FROM vault.decrypted_secrets WHERE name = 'service_role_key';

    -- Skip if secrets not configured
    IF supabase_url IS NULL OR service_role_key IS NULL THEN
        RAISE WARNING 'Vault secrets not configured, skipping immediate trigger';
        RETURN NEW;
    END IF;

    -- Fire orchestrator via pg_net (non-blocking)
    PERFORM net.http_post(
        url := supabase_url || '/functions/v1/workflow-orchestrator',
        headers := jsonb_build_object(
            'Content-Type', 'application/json',
            'Authorization', 'Bearer ' || service_role_key
        ),
        body := jsonb_build_object(
            'action', 'process',
            'payload', jsonb_build_object('triggered_by', 'pg_net_trigger')
        ),
        timeout_milliseconds := 5000
    );

    RETURN NEW;
EXCEPTION
    WHEN OTHERS THEN
        -- Log but don't fail - cron will pick up the workflow
        RAISE WARNING 'trigger_workflow_orchestrator failed: %', SQLERRM;
        RETURN NEW;
END;
$$;


--
-- Name: update_ai_parsing_queue_updated_at(); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.update_ai_parsing_queue_updated_at() RETURNS trigger
    LANGUAGE plpgsql
    AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$;


--
-- Name: update_notification_preferences_updated_at(); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.update_notification_preferences_updated_at() RETURNS trigger
    LANGUAGE plpgsql
    AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$;


--
-- Name: update_sync_config_timestamp(); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.update_sync_config_timestamp() RETURNS trigger
    LANGUAGE plpgsql
    AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$;


--
-- Name: update_thread_on_message(); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.update_thread_on_message() RETURNS trigger
    LANGUAGE plpgsql SECURITY DEFINER
    AS $$
BEGIN
  -- Update thread's last message info
  UPDATE public.thread
  SET
    "~Last Message" = LEFT(NEW."Message Body", 100),
    "~Date Last Message" = NEW."Created Date",
    "Modified Date" = NOW(),
    updated_at = NOW()
  WHERE _id = NEW."Associated Thread/Conversation";

  RETURN NEW;
EXCEPTION
  WHEN OTHERS THEN
    -- Log error but don't fail the insert
    RAISE WARNING 'update_thread_on_message failed: %', SQLERRM;
    RETURN NEW;
END;
$$;


--
-- Name: FUNCTION update_thread_on_message(); Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON FUNCTION public.update_thread_on_message() IS 'Automatically updates thread last message preview and timestamp when a new message is inserted';


--
-- Name: update_updated_at_column(); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.update_updated_at_column() RETURNS trigger
    LANGUAGE plpgsql
    AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$;


--
-- Name: update_user_favorites(text, jsonb); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.update_user_favorites(p_user_id text, p_favorites jsonb) RETURNS void
    LANGUAGE plpgsql SECURITY DEFINER
    AS $$
BEGIN
  UPDATE "user"
  SET "Favorited Listings" = p_favorites
  WHERE "_id" = p_user_id;
END;
$$;


--
-- Name: update_workflow_definitions_timestamp(); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.update_workflow_definitions_timestamp() RETURNS trigger
    LANGUAGE plpgsql
    AS $$
BEGIN
    NEW.updated_at = NOW();
    NEW.version = OLD.version + 1;
    RETURN NEW;
END;
$$;


SET default_tablespace = '';

SET default_table_access_method = heap;

--
-- Name: thread_message; Type: TABLE; Schema: junctions; Owner: -
--

CREATE TABLE junctions.thread_message (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    thread_id text NOT NULL,
    message_id text NOT NULL,
    message_type junctions.thread_message_type NOT NULL,
    "position" integer,
    created_at timestamp with time zone DEFAULT now()
);


--
-- Name: TABLE thread_message; Type: COMMENT; Schema: junctions; Owner: -
--

COMMENT ON TABLE junctions.thread_message IS 'Junction table normalizing thread-message relationships from legacy JSONB arrays in thread table';


--
-- Name: COLUMN thread_message.message_type; Type: COMMENT; Schema: junctions; Owner: -
--

COMMENT ON COLUMN junctions.thread_message.message_type IS 'Categorizes the relationship: all=full list, slbot_to_host/slbot_to_guest=SLBot messages, host_sent/guest_sent=user messages';


--
-- Name: COLUMN thread_message."position"; Type: COMMENT; Schema: junctions; Owner: -
--

COMMENT ON COLUMN junctions.thread_message."position" IS 'Preserves original array ordering for chronological display';


--
-- Name: thread_participant; Type: TABLE; Schema: junctions; Owner: -
--

CREATE TABLE junctions.thread_participant (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    thread_id text NOT NULL,
    user_id text NOT NULL,
    role text,
    joined_at timestamp with time zone DEFAULT now(),
    CONSTRAINT thread_participant_role_check CHECK ((role = ANY (ARRAY['host'::text, 'guest'::text, 'participant'::text])))
);


--
-- Name: TABLE thread_participant; Type: COMMENT; Schema: junctions; Owner: -
--

COMMENT ON TABLE junctions.thread_participant IS 'Junction: Thread participants from thread."Participants"';


--
-- Name: user_guest_reason; Type: TABLE; Schema: junctions; Owner: -
--

CREATE TABLE junctions.user_guest_reason (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    user_id text NOT NULL,
    reason_id text NOT NULL,
    created_at timestamp with time zone DEFAULT now()
);


--
-- Name: TABLE user_guest_reason; Type: COMMENT; Schema: junctions; Owner: -
--

COMMENT ON TABLE junctions.user_guest_reason IS 'Junction: User good guest reasons from "Reasons to Host me"';


--
-- Name: user_lease; Type: TABLE; Schema: junctions; Owner: -
--

CREATE TABLE junctions.user_lease (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    user_id text NOT NULL,
    lease_id text NOT NULL,
    role text,
    created_at timestamp with time zone DEFAULT now(),
    CONSTRAINT user_lease_role_check CHECK ((role = ANY (ARRAY['guest'::text, 'host'::text, 'participant'::text])))
);


--
-- Name: TABLE user_lease; Type: COMMENT; Schema: junctions; Owner: -
--

COMMENT ON TABLE junctions.user_lease IS 'Junction: User leases/reservations from "Leases"';


--
-- Name: user_listing_favorite; Type: TABLE; Schema: junctions; Owner: -
--

CREATE TABLE junctions.user_listing_favorite (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    user_id text NOT NULL,
    listing_id text NOT NULL,
    favorited_at timestamp with time zone DEFAULT now()
);


--
-- Name: TABLE user_listing_favorite; Type: COMMENT; Schema: junctions; Owner: -
--

COMMENT ON TABLE junctions.user_listing_favorite IS 'Junction: User favorited listings from "Favorited Listings"';


--
-- Name: user_permission; Type: TABLE; Schema: junctions; Owner: -
--

CREATE TABLE junctions.user_permission (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    grantor_user_id text NOT NULL,
    grantee_user_id text NOT NULL,
    permission_type text DEFAULT 'sensitive_info'::text,
    granted_at timestamp with time zone DEFAULT now(),
    CONSTRAINT chk_no_self_permission CHECK ((grantor_user_id <> grantee_user_id))
);


--
-- Name: TABLE user_permission; Type: COMMENT; Schema: junctions; Owner: -
--

COMMENT ON TABLE junctions.user_permission IS 'Junction: User permissions from "Users with permission to see sensitive info"';


--
-- Name: user_preferred_hood; Type: TABLE; Schema: junctions; Owner: -
--

CREATE TABLE junctions.user_preferred_hood (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    user_id text NOT NULL,
    hood_id text NOT NULL,
    preference_order integer,
    created_at timestamp with time zone DEFAULT now()
);


--
-- Name: TABLE user_preferred_hood; Type: COMMENT; Schema: junctions; Owner: -
--

COMMENT ON TABLE junctions.user_preferred_hood IS 'Junction: User preferred neighborhoods from "Preferred Hoods"';


--
-- Name: user_proposal; Type: TABLE; Schema: junctions; Owner: -
--

CREATE TABLE junctions.user_proposal (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    user_id text NOT NULL,
    proposal_id text NOT NULL,
    role text,
    created_at timestamp with time zone DEFAULT now(),
    CONSTRAINT user_proposal_role_check CHECK ((role = ANY (ARRAY['guest'::text, 'host'::text])))
);


--
-- Name: TABLE user_proposal; Type: COMMENT; Schema: junctions; Owner: -
--

COMMENT ON TABLE junctions.user_proposal IS 'Junction: User proposals from "Proposals List"';


--
-- Name: user_rental_type_search; Type: TABLE; Schema: junctions; Owner: -
--

CREATE TABLE junctions.user_rental_type_search (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    user_id text NOT NULL,
    rental_type_id bigint NOT NULL,
    searched_at timestamp with time zone DEFAULT now()
);


--
-- Name: TABLE user_rental_type_search; Type: COMMENT; Schema: junctions; Owner: -
--

COMMENT ON TABLE junctions.user_rental_type_search IS 'Junction: User recent rental type searches from "recent rental type search"';


--
-- Name: user_storage_item; Type: TABLE; Schema: junctions; Owner: -
--

CREATE TABLE junctions.user_storage_item (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    user_id text NOT NULL,
    storage_id text NOT NULL,
    created_at timestamp with time zone DEFAULT now()
);


--
-- Name: TABLE user_storage_item; Type: COMMENT; Schema: junctions; Owner: -
--

COMMENT ON TABLE junctions.user_storage_item IS 'Junction: User commonly stored items from "About - Commonly Stored Items"';


--
-- Name: listing_days_backup; Type: TABLE; Schema: migration_backup; Owner: -
--

CREATE TABLE migration_backup.listing_days_backup (
    _id text,
    "Days Available (List of Days)" jsonb,
    "Nights Available (List of Nights) " jsonb,
    "Nights Available (numbers)" jsonb,
    "Days Not Available" jsonb,
    "Nights Not Available" jsonb
);


--
-- Name: os_days_backup; Type: TABLE; Schema: migration_backup; Owner: -
--

CREATE TABLE migration_backup.os_days_backup (
    id bigint,
    name text,
    display text,
    bubble_number integer,
    bubble_number_text text,
    first_3_letters text,
    single_letter text,
    created_at timestamp with time zone
);


--
-- Name: os_nights_backup; Type: TABLE; Schema: migration_backup; Owner: -
--

CREATE TABLE migration_backup.os_nights_backup (
    id bigint,
    name text,
    display text,
    bubble_number integer,
    bubble_number_text text,
    first_3_letters text,
    single_letter text,
    created_at timestamp with time zone
);


--
-- Name: proposal_days_backup; Type: TABLE; Schema: migration_backup; Owner: -
--

CREATE TABLE migration_backup.proposal_days_backup (
    _id text,
    "Days Selected" jsonb,
    "Days Available" jsonb,
    "Nights Selected (Nights list)" jsonb,
    "Complementary Days" jsonb,
    "Complementary Nights" jsonb,
    "check in day" text,
    "check out day" text,
    "hc check in day" text,
    "hc check out day" text,
    "hc days selected" jsonb,
    "hc nights selected" jsonb
);


--
-- Name: a_workflow_dlq; Type: TABLE; Schema: pgmq; Owner: -
--

CREATE TABLE pgmq.a_workflow_dlq (
    msg_id bigint NOT NULL,
    read_ct integer DEFAULT 0 NOT NULL,
    enqueued_at timestamp with time zone DEFAULT now() NOT NULL,
    archived_at timestamp with time zone DEFAULT now() NOT NULL,
    vt timestamp with time zone NOT NULL,
    message jsonb
);


--
-- Name: a_workflow_queue; Type: TABLE; Schema: pgmq; Owner: -
--

CREATE TABLE pgmq.a_workflow_queue (
    msg_id bigint NOT NULL,
    read_ct integer DEFAULT 0 NOT NULL,
    enqueued_at timestamp with time zone DEFAULT now() NOT NULL,
    archived_at timestamp with time zone DEFAULT now() NOT NULL,
    vt timestamp with time zone NOT NULL,
    message jsonb
);


--
-- Name: q_workflow_dlq; Type: TABLE; Schema: pgmq; Owner: -
--

CREATE TABLE pgmq.q_workflow_dlq (
    msg_id bigint NOT NULL,
    read_ct integer DEFAULT 0 NOT NULL,
    enqueued_at timestamp with time zone DEFAULT now() NOT NULL,
    vt timestamp with time zone NOT NULL,
    message jsonb
);


--
-- Name: q_workflow_dlq_msg_id_seq; Type: SEQUENCE; Schema: pgmq; Owner: -
--

ALTER TABLE pgmq.q_workflow_dlq ALTER COLUMN msg_id ADD GENERATED ALWAYS AS IDENTITY (
    SEQUENCE NAME pgmq.q_workflow_dlq_msg_id_seq
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1
);


--
-- Name: q_workflow_queue; Type: TABLE; Schema: pgmq; Owner: -
--

CREATE TABLE pgmq.q_workflow_queue (
    msg_id bigint NOT NULL,
    read_ct integer DEFAULT 0 NOT NULL,
    enqueued_at timestamp with time zone DEFAULT now() NOT NULL,
    vt timestamp with time zone NOT NULL,
    message jsonb
);


--
-- Name: q_workflow_queue_msg_id_seq; Type: SEQUENCE; Schema: pgmq; Owner: -
--

ALTER TABLE pgmq.q_workflow_queue ALTER COLUMN msg_id ADD GENERATED ALWAYS AS IDENTITY (
    SEQUENCE NAME pgmq.q_workflow_queue_msg_id_seq
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1
);


--
-- Name: Listing_data_photos_backup; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public."Listing_data_photos_backup" (
    _id text,
    "Features - Photos" jsonb,
    backup_date timestamp with time zone
);


--
-- Name: _message; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public._message (
    _id text NOT NULL,
    "-Guest User" text,
    "-Host User" text,
    "-Originator User" text,
    "Associated Thread/Conversation" text,
    "Call to Action" text,
    "Communication Mode" text,
    "Created By" text,
    "Created Date" timestamp with time zone NOT NULL,
    "Date Change Request involved" text,
    "Message Body" text,
    "Modified Date" timestamp with time zone NOT NULL,
    "Not Logged In Email" text,
    "Not Logged In Name" text,
    "Review involved" text,
    "Split Bot Warning" text,
    "Subject" text,
    "Unread Users" jsonb,
    "hostReplyTime" integer,
    "is Forwarded" boolean NOT NULL,
    "is Split Bot" boolean NOT NULL,
    "is Visible to Guest" boolean,
    "is Visible to Host" boolean,
    "is deleted (is hidden)" boolean,
    "~previous Message" text,
    created_at timestamp with time zone DEFAULT now(),
    updated_at timestamp with time zone DEFAULT now(),
    pending boolean DEFAULT false,
    bubble_id text
);


--
-- Name: TABLE _message; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON TABLE public._message IS 'Bubble.io _message data - preserves original field names for sync';


--
-- Name: ai_parsing_queue; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.ai_parsing_queue (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    user_id text NOT NULL,
    email text NOT NULL,
    freeform_text text NOT NULL,
    status text DEFAULT 'pending'::text NOT NULL,
    attempts integer DEFAULT 0,
    max_attempts integer DEFAULT 3,
    last_error text,
    gpt_response text,
    extracted_data jsonb,
    matched_ids jsonb,
    favorited_listings jsonb,
    created_at timestamp with time zone DEFAULT now(),
    updated_at timestamp with time zone DEFAULT now(),
    started_at timestamp with time zone,
    completed_at timestamp with time zone,
    CONSTRAINT valid_status CHECK ((status = ANY (ARRAY['pending'::text, 'processing'::text, 'completed'::text, 'failed'::text])))
);


--
-- Name: TABLE ai_parsing_queue; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON TABLE public.ai_parsing_queue IS 'Queue for async AI parsing of user freeform signup text';


--
-- Name: audit_log; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.audit_log (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    entity_type character varying(50) NOT NULL,
    entity_id uuid NOT NULL,
    action character varying(50) NOT NULL,
    actor_id uuid,
    details jsonb,
    created_at timestamp without time zone DEFAULT now(),
    pending boolean DEFAULT false
);


--
-- Name: bookings_leases; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.bookings_leases (
    _id text NOT NULL,
    "Agreement Number" text,
    "Cancellation Policy" text,
    "Created By" text,
    "Created Date" timestamp with time zone NOT NULL,
    "Date Change Requests" jsonb,
    "First Payment Date" timestamp with time zone,
    "Form Credit Card Authorization Charges" text,
    "Guest" text,
    "Host" text,
    "Host Payout Schedule" text,
    "Lease Status" text,
    "Lease signed?" boolean NOT NULL,
    "List of Booked Dates" jsonb,
    "List of Booked Dates after Requests" jsonb,
    "List of Stays" jsonb,
    "Listing" text,
    "Modified Date" timestamp with time zone NOT NULL,
    "Paid to Date from Guest" numeric,
    "Participants" jsonb,
    "Payment Records Guest-SL" jsonb,
    "Payment Records SL-Hosts" jsonb,
    "Payments from date change requests to GUEST" jsonb,
    "Payments from date change requests to HOST" jsonb,
    "Periodic Tenancy Agreement" text,
    "Proposal" text,
    "Reputation Score (GUEST)" integer,
    "Reputation Score (HOST)" integer,
    "Reservation Period : End" text,
    "Reservation Period : Start" text,
    "Supplemental Agreement" text,
    "Thread" text,
    "Throttling - guest NOT show warning popup" boolean,
    "Throttling - guest ability to create requests?" boolean,
    "Throttling - host NOT show warning popup" boolean,
    "Throttling- host ability to create requests?" boolean,
    "Total Compensation" numeric,
    "Total Rent" numeric,
    "current week number" numeric,
    "total week count" numeric,
    "were documents generated?" boolean,
    created_at timestamp with time zone DEFAULT now(),
    updated_at timestamp with time zone DEFAULT now(),
    pending boolean DEFAULT false,
    bubble_id text
);


--
-- Name: TABLE bookings_leases; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON TABLE public.bookings_leases IS 'Bubble.io bookings_leases data - preserves original field names for sync';


--
-- Name: bookings_stays; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.bookings_stays (
    _id text NOT NULL,
    "Card Used - Last 4 Digits" text,
    "Check In (night)" text,
    "Check-out day" text,
    "Cleaning Comment" text,
    "Created By" text,
    "Created Date" timestamp with time zone NOT NULL,
    "Dates - List of dates in this period" jsonb,
    "Guest" text,
    "Host" text,
    "Items Logged (Text)" text,
    "Last Night (night)" text,
    "Lease" text,
    "Modified Date" timestamp with time zone NOT NULL,
    "Nights" jsonb,
    "Photos - Cleaning " text,
    "Review Submitted by Guest" text,
    "Review Submitted by Host" text,
    "Status - Scheduled Payment" text,
    "Stay Status" text NOT NULL,
    "Storage Photos" text,
    "Type - Scheduled Payment" text,
    "Week Number" integer,
    "first index" integer,
    "last index" integer,
    listing text,
    times integer,
    "💰Amount" numeric,
    created_at timestamp with time zone DEFAULT now(),
    updated_at timestamp with time zone DEFAULT now(),
    pending boolean DEFAULT false,
    bubble_id text
);


--
-- Name: TABLE bookings_stays; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON TABLE public.bookings_stays IS 'Bubble.io bookings_stays data - preserves original field names for sync';


--
-- Name: co_hostrequest; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.co_hostrequest (
    _id text NOT NULL,
    "Co-Host User" text,
    "Co-Host selected (OS)" text,
    "Created By" text NOT NULL,
    "Created Date" timestamp with time zone NOT NULL,
    "Host User" text NOT NULL,
    "Listing" text,
    "Modified Date" timestamp with time zone NOT NULL,
    "Rating " numeric,
    "Rating message (optional)" text,
    "Status - Co-Host Request" text NOT NULL,
    "Subject" text,
    "details submitted (optional)" text,
    "show notification status change" boolean,
    "virtual meeting link" text,
    created_at timestamp with time zone DEFAULT now(),
    updated_at timestamp with time zone DEFAULT now(),
    pending boolean DEFAULT false,
    bubble_id text,
    "Dates and times suggested" jsonb,
    "Meeting link" text,
    "Date and time selected" timestamp with time zone,
    "Request notes" text,
    "Meeting Date Time" timestamp with time zone,
    "Google Meet Link" text,
    "Admin Notes" text,
    "Slack Message TS" text
);


--
-- Name: TABLE co_hostrequest; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON TABLE public.co_hostrequest IS 'Bubble.io co_hostrequest data - preserves original field names for sync';


--
-- Name: COLUMN co_hostrequest."Dates and times suggested"; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.co_hostrequest."Dates and times suggested" IS 'Array of suggested datetime strings from the scheduling form';


--
-- Name: COLUMN co_hostrequest."Meeting link"; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.co_hostrequest."Meeting link" IS 'URL for the virtual meeting once scheduled';


--
-- Name: COLUMN co_hostrequest."Date and time selected"; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.co_hostrequest."Date and time selected" IS 'The final confirmed meeting datetime';


--
-- Name: COLUMN co_hostrequest."Request notes"; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.co_hostrequest."Request notes" IS 'Combined topics and freeform details from request form';


--
-- Name: COLUMN co_hostrequest."Meeting Date Time"; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.co_hostrequest."Meeting Date Time" IS 'Scheduled virtual meeting time';


--
-- Name: COLUMN co_hostrequest."Google Meet Link"; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.co_hostrequest."Google Meet Link" IS 'Google Meet URL for the session';


--
-- Name: COLUMN co_hostrequest."Admin Notes"; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.co_hostrequest."Admin Notes" IS 'Internal notes from admin during assignment';


--
-- Name: COLUMN co_hostrequest."Slack Message TS"; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.co_hostrequest."Slack Message TS" IS 'Slack message timestamp for updating the original message';


--
-- Name: dailycounter; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.dailycounter (
    _id text NOT NULL,
    "Created By" text NOT NULL,
    "Created Date" timestamp with time zone NOT NULL,
    "Date" timestamp with time zone NOT NULL,
    "Last Number" integer NOT NULL,
    "Modified Date" timestamp with time zone NOT NULL,
    created_at timestamp with time zone DEFAULT now(),
    updated_at timestamp with time zone DEFAULT now(),
    pending boolean DEFAULT false,
    bubble_id text
);


--
-- Name: TABLE dailycounter; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON TABLE public.dailycounter IS 'Bubble.io dailycounter data - preserves original field names for sync';


--
-- Name: datacollection_searchlogging; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.datacollection_searchlogging (
    _id text NOT NULL,
    "Cancellation Policy" text,
    "Cancellation Policy (Text)" text,
    "Check In Date" timestamp with time zone,
    "Created By" text,
    "Created Date" timestamp with time zone NOT NULL,
    "Current Date" timestamp with time zone,
    "Duration" text,
    "Duration (text)" text,
    "Guests" text,
    "Guests (text)" text,
    "Modified Date" timestamp with time zone NOT NULL,
    "Nights" jsonb,
    "Nights (Short)" text,
    "Nights (Text)" text,
    "Nights Qty (number)" integer,
    "Search Location" text,
    "Search Location (text)" text,
    "Type of Place" text,
    "Type of Place (text)" text,
    "User" text,
    "User (text)" text,
    "User is Logged in" boolean,
    "Users Location" jsonb,
    "Users Location (city)" text,
    "Users Location (county)" text,
    created_at timestamp with time zone DEFAULT now(),
    updated_at timestamp with time zone DEFAULT now(),
    pending boolean DEFAULT false,
    bubble_id text
);


--
-- Name: TABLE datacollection_searchlogging; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON TABLE public.datacollection_searchlogging IS 'Bubble.io datacollection_searchlogging data - preserves original field names for sync';


--
-- Name: datechangerequest; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.datechangerequest (
    _id text NOT NULL,
    "%compared to regular nightly price" integer,
    "Answer to Request" text,
    "Created By" text,
    "Created Date" timestamp with time zone NOT NULL,
    "Decision Outcome Score" integer,
    "LIST of NEW Dates in the stay" jsonb,
    "LIST of OLD Dates in the stay" jsonb,
    "Lease" text,
    "Message from Requested by" text,
    "Modified Date" timestamp with time zone NOT NULL,
    "On Time Score" integer,
    "Price/Rate of the night" numeric,
    "Request receiver" text,
    "Requested by" text,
    "Stay Associated 1" text,
    "Stay Associated 2" text,
    "answer date" timestamp with time zone,
    "date added" timestamp with time zone,
    "date removed" timestamp with time zone,
    "expiration date" timestamp with time zone,
    "expiration_workflowID" text,
    "lead time of the request (minutes)" integer,
    "notification_expiration_workflowID" text,
    "request status" text NOT NULL,
    "response time (minutes)" integer,
    "type of request" text NOT NULL,
    "visible to the guest?" boolean NOT NULL,
    "visible to the host?" boolean NOT NULL,
    created_at timestamp with time zone DEFAULT now(),
    updated_at timestamp with time zone DEFAULT now(),
    pending boolean DEFAULT false,
    bubble_id text
);


--
-- Name: TABLE datechangerequest; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON TABLE public.datechangerequest IS 'Bubble.io datechangerequest data - preserves original field names for sync';


--
-- Name: documentssent; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.documentssent (
    _id text NOT NULL,
    "Created By" text,
    "Created Date" timestamp with time zone NOT NULL,
    "Document on policies" text,
    "Document sent title" text NOT NULL,
    "Host email" text NOT NULL,
    "Host name" text NOT NULL,
    "Host phone number (as text)" text,
    "Host user" text,
    "Modified Date" timestamp with time zone NOT NULL,
    "Profile Selection" text,
    created_at timestamp with time zone DEFAULT now(),
    updated_at timestamp with time zone DEFAULT now(),
    pending boolean DEFAULT false,
    bubble_id text
);


--
-- Name: TABLE documentssent; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON TABLE public.documentssent IS 'Bubble.io documentssent data - preserves original field names for sync';


--
-- Name: email; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.email (
    _id text NOT NULL,
    "Created By" text,
    "Created Date" timestamp with time zone NOT NULL,
    "Modified Date" timestamp with time zone NOT NULL,
    "SendGrid JSON" text,
    created_at timestamp with time zone DEFAULT now(),
    updated_at timestamp with time zone DEFAULT now(),
    pending boolean DEFAULT false,
    bubble_id text
);


--
-- Name: TABLE email; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON TABLE public.email IS 'Bubble.io email data - preserves original field names for sync';


--
-- Name: emailtemplate_postmark_; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.emailtemplate_postmark_ (
    _id text NOT NULL,
    "Created By" text NOT NULL,
    "Created Date" timestamp with time zone NOT NULL,
    "HTML" text,
    "JSON" text NOT NULL,
    "Modified Date" timestamp with time zone NOT NULL,
    "Name" text NOT NULL,
    "Notes" text,
    "Subject" text NOT NULL,
    "Thumbnail" text,
    created_at timestamp with time zone DEFAULT now(),
    updated_at timestamp with time zone DEFAULT now(),
    pending boolean DEFAULT false,
    bubble_id text
);


--
-- Name: TABLE emailtemplate_postmark_; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON TABLE public.emailtemplate_postmark_ IS 'Bubble.io emailtemplate_postmark_ data - preserves original field names for sync';


--
-- Name: emailtemplates_category_postmark_; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.emailtemplates_category_postmark_ (
    _id text NOT NULL,
    "Created By" text NOT NULL,
    "Created Date" timestamp with time zone NOT NULL,
    "Email Templates" jsonb,
    "Modified Date" timestamp with time zone NOT NULL,
    "Name" text NOT NULL,
    created_at timestamp with time zone DEFAULT now(),
    updated_at timestamp with time zone DEFAULT now(),
    pending boolean DEFAULT false,
    bubble_id text
);


--
-- Name: TABLE emailtemplates_category_postmark_; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON TABLE public.emailtemplates_category_postmark_ IS 'Bubble.io emailtemplates_category_postmark_ data - preserves original field names for sync';


--
-- Name: emergencyreports; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.emergencyreports (
    _id text NOT NULL,
    "Agreement Number" text NOT NULL,
    "Created By" text,
    "Created Date" timestamp with time zone NOT NULL,
    "Description of emergency" text,
    "Guidance / Instructions " text,
    "Modified Date" timestamp with time zone NOT NULL,
    "Our summary of the emergency" text,
    "Photo 1 of emergency" text,
    "Photo 2 of emergency" text,
    "Reservation" text,
    "Team Member Assigned" text,
    "Type of emergency reported" text NOT NULL,
    "emails sent to guest" jsonb,
    "emails sent to host" jsonb,
    "reported by" text,
    "sms sent to guest" jsonb,
    "sms sent to host" jsonb,
    created_at timestamp with time zone DEFAULT now(),
    updated_at timestamp with time zone DEFAULT now(),
    pending boolean DEFAULT false,
    bubble_id text
);


--
-- Name: TABLE emergencyreports; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON TABLE public.emergencyreports IS 'Bubble.io emergencyreports data - preserves original field names for sync';


--
-- Name: experiencesurvey; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.experiencesurvey (
    _id text NOT NULL,
    "Additional Service" text NOT NULL,
    "Challenge" text NOT NULL,
    "Challenge Experience" text NOT NULL,
    "Change" text NOT NULL,
    "Created By" text NOT NULL,
    "Created Date" timestamp with time zone NOT NULL,
    "Experience" text NOT NULL,
    "Modified Date" timestamp with time zone NOT NULL,
    "Name" text NOT NULL,
    "Questions" text NOT NULL,
    "Recommend" integer NOT NULL,
    "Service" text NOT NULL,
    "Share" boolean NOT NULL,
    "Split Lease Staff" text NOT NULL,
    "Type" text NOT NULL,
    created_at timestamp with time zone DEFAULT now(),
    updated_at timestamp with time zone DEFAULT now(),
    pending boolean DEFAULT false,
    bubble_id text
);


--
-- Name: TABLE experiencesurvey; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON TABLE public.experiencesurvey IS 'Bubble.io experiencesurvey data - preserves original field names for sync';


--
-- Name: external_reviews; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.external_reviews (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    listing_id text NOT NULL,
    platform character varying(20) NOT NULL,
    reviewer_name character varying(255) NOT NULL,
    reviewer_photo text,
    review_date date NOT NULL,
    rating numeric(3,2) NOT NULL,
    description text NOT NULL,
    original_url text,
    created_at timestamp without time zone DEFAULT now(),
    updated_at timestamp without time zone DEFAULT now(),
    pending boolean DEFAULT false,
    CONSTRAINT external_reviews_platform_check CHECK (((platform)::text = ANY ((ARRAY['Airbnb'::character varying, 'VRBO'::character varying, 'Booking.com'::character varying])::text[]))),
    CONSTRAINT external_reviews_rating_check CHECK (((rating >= (0)::numeric) AND (rating <= (10)::numeric)))
);


--
-- Name: fieldsforleasedocuments; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.fieldsforleasedocuments (
    _id text NOT NULL,
    "Address of the Property " jsonb,
    "Agreement number" text,
    "Authorization Card Number" text NOT NULL,
    "Cancellation Policy" text,
    "Created By" text NOT NULL,
    "Created Date" timestamp with time zone NOT NULL,
    "Details of Space" text,
    "Extra Requests on Cancellation Policy" text NOT NULL,
    "Guest allowed" integer NOT NULL,
    "Guest email" text,
    "Guest name" text,
    "Guest number" text,
    "Host Payout Schedule Number" text NOT NULL,
    "Host email" text NOT NULL,
    "Host name" text,
    "Host number" text,
    "Image1" text,
    "Image2" text,
    "Image3" text,
    "Last Payment Rent" integer,
    "Last Payment Weeks" integer,
    "Listing Amenities Building" jsonb,
    "Listing Amenities InUnit" jsonb,
    "Listing Description" text,
    "Listing Name" text,
    "Listing type" text NOT NULL,
    "Location" text,
    "Modified Date" timestamp with time zone NOT NULL,
    "Nights Selected" jsonb NOT NULL,
    "Number of Payments (guest)" integer NOT NULL,
    "Number of Payments (host)" integer NOT NULL,
    "Number of nights per week" integer NOT NULL,
    "Number of weeks" integer NOT NULL,
    "Prorated?" boolean,
    "Room Capacity" integer,
    "Splitlease Credit" integer,
    "Supplemental Number" text NOT NULL,
    "Type of Space" text,
    "check in date" text,
    "check in weekly" text,
    "check out date" text,
    "guest date 1" text,
    "guest date 10" text,
    "guest date 11" text,
    "guest date 12" text,
    "guest date 13" text,
    "guest date 2" text,
    "guest date 3" text,
    "guest date 4" text,
    "guest date 5" text,
    "guest date 6" text,
    "guest date 7" text,
    "guest date 8" text,
    "guest date 9" text,
    "host date 1" text,
    "host date 10" text,
    "host date 11" text,
    "host date 12" text,
    "host date 13" text,
    "host date 2" text,
    "host date 3" text,
    "host date 4" text,
    "host date 5" text,
    "host date 6" text,
    "host date 7" text,
    "host date 8" text,
    "host date 9" text,
    "house rules" jsonb,
    "last night weekly" text NOT NULL,
    "💰Damage Deposit" text NOT NULL,
    "💰Host Compensation" text,
    "💰Maintenance fee" text,
    "💰Price 4 weeks rent" text NOT NULL,
    "💰Price per night" text NOT NULL,
    "💰Total Host Compensation" text NOT NULL,
    "💰guest rent 1" text,
    "💰guest rent 10" text,
    "💰guest rent 11" text,
    "💰guest rent 12" text,
    "💰guest rent 13" text,
    "💰guest rent 2" text,
    "💰guest rent 3" text,
    "💰guest rent 4" text,
    "💰guest rent 5" text,
    "💰guest rent 6" text,
    "💰guest rent 7" text,
    "💰guest rent 8" text,
    "💰guest rent 9" text,
    "💰guest total 1" text,
    "💰guest total 10" text,
    "💰guest total 11" text,
    "💰guest total 12" text,
    "💰guest total 13" text,
    "💰guest total 2" text,
    "💰guest total 3" text,
    "💰guest total 4" text,
    "💰guest total 5" text,
    "💰guest total 6" text,
    "💰guest total 7" text,
    "💰guest total 8" text,
    "💰guest total 9" text,
    "💰host rent 1" text,
    "💰host rent 10" text,
    "💰host rent 11" text,
    "💰host rent 12" text,
    "💰host rent 13" text,
    "💰host rent 2" text,
    "💰host rent 3" text,
    "💰host rent 4" text,
    "💰host rent 5" text,
    "💰host rent 6" text,
    "💰host rent 7" text,
    "💰host rent 8" text,
    "💰host rent 9" text,
    "💰host total 1" text,
    "💰host total 10" text,
    "💰host total 11" text,
    "💰host total 12" text,
    "💰host total 13" text,
    "💰host total 2" text,
    "💰host total 3" text,
    "💰host total 4" text,
    "💰host total 5" text,
    "💰host total 6" text,
    "💰host total 7" text,
    "💰host total 8" text,
    "💰host total 9" text,
    created_at timestamp with time zone DEFAULT now(),
    updated_at timestamp with time zone DEFAULT now(),
    pending boolean DEFAULT false,
    bubble_id text
);


--
-- Name: TABLE fieldsforleasedocuments; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON TABLE public.fieldsforleasedocuments IS 'Bubble.io fieldsforleasedocuments data - preserves original field names for sync';


--
-- Name: file; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.file (
    _id text NOT NULL,
    "Created By" text NOT NULL,
    "Created Date" timestamp with time zone NOT NULL,
    "Lease Associated" text,
    "Modified Date" timestamp with time zone NOT NULL,
    "Proposal Associated" text,
    file text,
    "file name" text NOT NULL,
    "for testing?" boolean,
    "visible to guest?" boolean NOT NULL,
    "visible to host?" boolean NOT NULL,
    created_at timestamp with time zone DEFAULT now(),
    updated_at timestamp with time zone DEFAULT now(),
    pending boolean DEFAULT false,
    bubble_id text
);


--
-- Name: TABLE file; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON TABLE public.file IS 'Bubble.io file data - preserves original field names for sync';


--
-- Name: guest_inquiry; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.guest_inquiry (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    sender_name text NOT NULL,
    sender_email text NOT NULL,
    message_body text NOT NULL,
    recipient_user_id text NOT NULL,
    listing_id text,
    status text DEFAULT 'pending'::text,
    created_at timestamp with time zone DEFAULT now(),
    updated_at timestamp with time zone DEFAULT now()
);


--
-- Name: TABLE guest_inquiry; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON TABLE public.guest_inquiry IS 'Guest inquiries from unauthenticated users contacting hosts';


--
-- Name: hostrestrictions; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.hostrestrictions (
    _id text NOT NULL,
    "Created By" text NOT NULL,
    "Created Date" timestamp with time zone NOT NULL,
    "Guidelines" text,
    "Modified Date" timestamp with time zone NOT NULL,
    "active?" boolean,
    listing text,
    created_at timestamp with time zone DEFAULT now(),
    updated_at timestamp with time zone DEFAULT now(),
    pending boolean DEFAULT false,
    bubble_id text
);


--
-- Name: TABLE hostrestrictions; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON TABLE public.hostrestrictions IS 'Bubble.io hostrestrictions data - preserves original field names for sync';


--
-- Name: housemanual; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.housemanual (
    _id text NOT NULL,
    "AI Suggestions" jsonb,
    "AI call sent?" boolean,
    "AI suggestions creation ended?" boolean,
    "AI tool used by logged out user " text,
    "ALL Narrations and Jingles" jsonb,
    "Additional Guest Responsibilities" text,
    "Additional House Rules" text,
    "Address (geo)" jsonb,
    "Amenities Tips" text,
    "Audience" text,
    "Audio Transcription parsed?" boolean,
    "Audio recorded" text,
    "Bland AI call identifier" text,
    "Call transcription parsed?" boolean,
    "Check-In Instructions" text,
    "Check-Out Instructions" text,
    "Conflict Resolution" text,
    "Created By" text,
    "Created Date" timestamp with time zone NOT NULL,
    "Departure Checklist" jsonb,
    "Dining / Food Ordering Tips" text,
    "Fire Extinguisher" text,
    "First Aid Kit" text,
    "Free Form Text parsed?" boolean,
    "Google Doc Transcription parsed?" boolean,
    "Host" text,
    "Host Name" text,
    "House Manual Fields" jsonb,
    "House Rules" jsonb,
    "House manual Name" text,
    "House manual photos for specific guidelines" jsonb,
    "Important Contact Information - Local Emergency Number" text,
    "Important Contact Information - Other" text,
    "Last section" text,
    "Laundry Options" text,
    "Leases attached to this house manual" jsonb,
    "List of Visits - URL Shorteners" jsonb,
    "Listing" text,
    "Local Attractions & Things To Do" text,
    "Modified Date" timestamp with time zone NOT NULL,
    "Move-In Instructions" text,
    "Move-Out Instructions" text,
    "Off-Limit Areas" text,
    "PARSED Text from Google Doc" text,
    "PARSED text from Listing" text,
    "PARSED text from PDF" text,
    "PARSED text from free form text" text,
    "PARSED text house manual from audio" text,
    "PARSED text house manual from call" text,
    "PDF Uploaded House Manual" text,
    "PDF Version House Manual" text,
    "PDF transcription parsed?" boolean,
    "Parking Option" text,
    "Parking Tips" text,
    "Phone number (text)" text,
    "Progress Stage" text,
    "QR Code generated" text,
    "QR Codes" jsonb,
    "RAW Text From Google Doc" text,
    "RAW Text extracted from PDF House Manual" text,
    "RAW text House Manual from audio" text,
    "RAW text from Listing" text,
    "RAW text from free form text" text,
    "RAW text house manual from call" text,
    "Rearranging Furniture" text,
    "Script of Questions for Guided Call" text,
    "Section before leaving opened?" boolean,
    "Section building and neighborhood opened?" boolean,
    "Section house guidelines opened?" boolean,
    "Section security and safety opened?" boolean,
    "Section specific guidelines opened?" boolean,
    "Section upon arrival opened?" boolean,
    "Section utilities and appliance opened?" boolean,
    "Security Features" text,
    "Specific Guidelines Use Case" text,
    "Specific Guidelines Use Case 2" text,
    "Specific Kitchen Tips" text,
    "Storage Instructions" text,
    "Streaming Services" text,
    "Surveillance Cameras" text,
    "Temperature Control" text,
    "Things Good to Know" text,
    "Tips to get to your place" text,
    "Visitors (Guests this house manual has been shared)" jsonb,
    "Waste Disposal / Recycling" text,
    "WiFi Name" text,
    "WiFi Password" text,
    "WiFi Photo" text,
    "call finished? ready to create suggestions" boolean,
    "created by logged out user?" boolean,
    "generated through Listing?" boolean,
    "generated through PDF?" boolean,
    "generated through an AI call?" boolean,
    "generated through audio?" boolean,
    "generated through free form text?" boolean,
    "generated through google doc?" boolean,
    "waiting for zap delayed?" boolean,
    created_at timestamp with time zone DEFAULT now(),
    updated_at timestamp with time zone DEFAULT now(),
    pending boolean DEFAULT false,
    bubble_id text
);


--
-- Name: TABLE housemanual; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON TABLE public.housemanual IS 'Bubble.io housemanual data - preserves original field names for sync';


--
-- Name: housemanualphotos; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.housemanualphotos (
    _id text NOT NULL,
    "Created By" text NOT NULL,
    "Created Date" timestamp with time zone NOT NULL,
    "Modified Date" timestamp with time zone NOT NULL,
    "Photo" text NOT NULL,
    "SortOrder" integer NOT NULL,
    "active?" boolean NOT NULL,
    "house manual" text NOT NULL,
    created_at timestamp with time zone DEFAULT now(),
    updated_at timestamp with time zone DEFAULT now(),
    pending boolean DEFAULT false,
    bubble_id text
);


--
-- Name: TABLE housemanualphotos; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON TABLE public.housemanualphotos IS 'Bubble.io housemanualphotos data - preserves original field names for sync';


--
-- Name: informationaltexts; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.informationaltexts (
    _id text NOT NULL,
    "Created By" text NOT NULL,
    "Created Date" timestamp with time zone NOT NULL,
    "Desktop copy" text NOT NULL,
    "Desktop+ copy" text,
    "Information Tag-Title" text NOT NULL,
    "Link" boolean,
    "Mobile copy" text,
    "Modified Date" timestamp with time zone NOT NULL,
    "iPad copy" text,
    "show more available?" boolean,
    created_at timestamp with time zone DEFAULT now(),
    updated_at timestamp with time zone DEFAULT now(),
    pending boolean DEFAULT false,
    bubble_id text
);


--
-- Name: TABLE informationaltexts; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON TABLE public.informationaltexts IS 'Bubble.io informationaltexts data - preserves original field names for sync';


--
-- Name: internalfiles; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.internalfiles (
    _id text NOT NULL,
    "Created By" text NOT NULL,
    "Created Date" timestamp with time zone NOT NULL,
    "Modified Date" timestamp with time zone NOT NULL,
    "Name" text NOT NULL,
    "PDF version" text NOT NULL,
    tag text NOT NULL,
    created_at timestamp with time zone DEFAULT now(),
    updated_at timestamp with time zone DEFAULT now(),
    pending boolean DEFAULT false,
    bubble_id text
);


--
-- Name: TABLE internalfiles; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON TABLE public.internalfiles IS 'Bubble.io internalfiles data - preserves original field names for sync';


--
-- Name: invoices; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.invoices (
    _id text NOT NULL,
    "Created By" text NOT NULL,
    "Created Date" timestamp with time zone NOT NULL,
    "Modified Date" timestamp with time zone NOT NULL,
    file text NOT NULL,
    created_at timestamp with time zone DEFAULT now(),
    updated_at timestamp with time zone DEFAULT now(),
    pending boolean DEFAULT false,
    bubble_id text
);


--
-- Name: TABLE invoices; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON TABLE public.invoices IS 'Bubble.io invoices data - preserves original field names for sync';


--
-- Name: knowledgebase; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.knowledgebase (
    _id text NOT NULL,
    "Active" boolean NOT NULL,
    "Browser Page Title" text,
    "Created By" text NOT NULL,
    "Created Date" timestamp with time zone NOT NULL,
    "Line Item" jsonb NOT NULL,
    "Menu Name" text NOT NULL,
    "Modified Date" timestamp with time zone NOT NULL,
    "Page Headline" text NOT NULL,
    "Page Headline Subtext" text,
    "Search Data" text NOT NULL,
    "Thumbnail" text,
    created_at timestamp with time zone DEFAULT now(),
    updated_at timestamp with time zone DEFAULT now(),
    pending boolean DEFAULT false,
    bubble_id text
);


--
-- Name: TABLE knowledgebase; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON TABLE public.knowledgebase IS 'Bubble.io knowledgebase data - preserves original field names for sync';


--
-- Name: knowledgebaselineitem; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.knowledgebaselineitem (
    _id text NOT NULL,
    "Button text" text,
    "Created By" text NOT NULL,
    "Created Date" timestamp with time zone NOT NULL,
    "Image" text,
    "Modified Date" timestamp with time zone NOT NULL,
    "Sort Order" integer,
    "Text" text,
    "button link" text,
    video text,
    created_at timestamp with time zone DEFAULT now(),
    updated_at timestamp with time zone DEFAULT now(),
    pending boolean DEFAULT false,
    bubble_id text
);


--
-- Name: TABLE knowledgebaselineitem; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON TABLE public.knowledgebaselineitem IS 'Bubble.io knowledgebaselineitem data - preserves original field names for sync';


--
-- Name: listing; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.listing (
    _id text NOT NULL,
    " First Available" text,
    "# of nights available" integer,
    ".Search Ranking" integer,
    "AI Suggestions List" jsonb,
    "Active" boolean,
    "Approved" boolean,
    "Cancellation Policy" text,
    "Clickers" jsonb,
    "ClicksToViewRatio" numeric,
    "Complete" boolean,
    "Created By" text,
    "Created Date" timestamp with time zone NOT NULL,
    "Dates - Blocked" jsonb,
    "Days Available (List of Days)" jsonb NOT NULL,
    "Days Not Available" jsonb,
    "Default Extension Setting" boolean,
    "Default Listing" boolean,
    "Description" text,
    "Description - Neighborhood" text,
    "DesirabilityTimesReceptivity" numeric,
    "Errors" jsonb,
    "Features - Amenities In-Building" jsonb,
    "Features - Amenities In-Unit" jsonb,
    "Features - House Rules" jsonb,
    "Features - Parking type" text,
    "Features - Photos" jsonb,
    "Features - Qty Bathrooms" numeric(3,1),
    "Features - Qty Bedrooms" integer,
    "Features - Qty Beds" integer,
    "Features - Qty Guests" integer,
    "Features - SQFT Area" integer,
    "Features - SQFT of Room" integer,
    "Features - Safety" jsonb,
    "Features - Secure Storage Option" text,
    "Features - Trial Periods Allowed" boolean NOT NULL,
    "Features - Type of Space" text,
    "Host User" text,
    "Host email" text,
    "House manual" text,
    "Kitchen Type" text,
    "Last Available" text,
    "Listing Code OP" text,
    "Listing Curation" jsonb,
    "Location - Address" jsonb,
    "Location - Borough" text,
    "Location - City" text,
    "Location - Hood" text,
    "Location - Hoods (new)" jsonb,
    "Location - State" text,
    "Location - Zip Code" text,
    "Location - slightly different address" jsonb,
    "Map HTML Mobile" text,
    "Map HTML Web" text,
    "Maximum Months" integer,
    "Maximum Nights" integer,
    "Maximum Weeks" integer NOT NULL,
    "Metrics - Click Counter" integer,
    "Minimum Months" integer,
    "Minimum Nights" integer NOT NULL,
    "Minimum Weeks" integer,
    "Modified Date" timestamp with time zone NOT NULL,
    "NEW Date Check-in Time" text NOT NULL,
    "NEW Date Check-out Time" text NOT NULL,
    "Name" text,
    "Nights Available (List of Nights) " jsonb NOT NULL,
    "Nights Available (numbers)" jsonb,
    "Nights Not Available" jsonb,
    "Not Found - Location - Address " text,
    "Operator Last Updated AUT" timestamp with time zone,
    "Preferred Gender" text NOT NULL,
    "Price number (for map)" text,
    "Reviews" jsonb,
    "Showcase" boolean,
    "Source Link" text,
    "Standarized Minimum Nightly Price (Filter)" numeric,
    "Time to Station (commute)" text,
    "Users that favorite" jsonb,
    "Viewers" jsonb,
    "Weeks offered" text NOT NULL,
    "allow alternating roommates?" boolean,
    bulk_upload_id text,
    "cancel-features-email-id" text,
    "confirmedAvailability" boolean,
    "host name" text,
    "host restrictions" text,
    "is private?" boolean,
    "isForUsability" boolean,
    "neighborhood (manual input by user)" text,
    pricing_list text,
    progress text,
    "rental type" text,
    "saw chatgpt suggestions?" boolean,
    "users with permission" jsonb,
    "video tour" text,
    "weeks out to available" integer,
    "💰Cleaning Cost / Maintenance Fee" integer,
    "💰Damage Deposit" integer NOT NULL,
    "💰Monthly Host Rate" integer,
    "💰Nightly Host Rate for 2 nights" numeric,
    "💰Nightly Host Rate for 3 nights" numeric,
    "💰Nightly Host Rate for 4 nights" numeric,
    "💰Nightly Host Rate for 5 nights" numeric,
    "💰Nightly Host Rate for 7 nights" numeric,
    "💰Price Override" integer,
    "💰Unit Markup" integer,
    "💰Weekly Host Rate" numeric,
    created_at timestamp with time zone DEFAULT now(),
    updated_at timestamp with time zone DEFAULT now(),
    "Location - Coordinates" jsonb,
    pending boolean DEFAULT false,
    host_type text,
    market_strategy text DEFAULT 'private'::text,
    bubble_id text,
    "💰Extra Charges" integer,
    "Cancellation Policy - Additional Restrictions" text,
    "Deleted" boolean DEFAULT false,
    "💰Nightly Host Rate for 1 night" numeric,
    "💰Nightly Host Rate for 6 nights" numeric
);


--
-- Name: TABLE listing; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON TABLE public.listing IS 'Bubble.io listing data - preserves original field names for sync';


--
-- Name: COLUMN listing.host_type; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.listing.host_type IS 'Host type: resident, liveout, coliving, agent';


--
-- Name: COLUMN listing.market_strategy; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.listing.market_strategy IS 'Market strategy: private (concierge) or public (marketplace)';


--
-- Name: COLUMN listing."💰Extra Charges"; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.listing."💰Extra Charges" IS 'Monthly extra charges/expenses cost entered by host during self-listing';


--
-- Name: COLUMN listing."Deleted"; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.listing."Deleted" IS 'Soft-delete flag. When true, listing is hidden from all frontend views but retained for restoration/analysis.';


--
-- Name: COLUMN listing."💰Nightly Host Rate for 1 night"; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.listing."💰Nightly Host Rate for 1 night" IS 'Base nightly rate for 1-night stays (no discount)';


--
-- Name: COLUMN listing."💰Nightly Host Rate for 6 nights"; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.listing."💰Nightly Host Rate for 6 nights" IS 'Nightly rate for 6-night stays';


--
-- Name: listing_drafts; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.listing_drafts (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    user_id uuid NOT NULL,
    form_data jsonb NOT NULL,
    current_step integer DEFAULT 1,
    created_at timestamp with time zone DEFAULT now(),
    updated_at timestamp with time zone DEFAULT now()
);


--
-- Name: TABLE listing_drafts; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON TABLE public.listing_drafts IS 'Stores draft listing data for Continue on Phone feature';


--
-- Name: listing_photo; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.listing_photo (
    _id text NOT NULL,
    "Active" boolean,
    "Caption" text,
    "Created By" text,
    "Created Date" timestamp with time zone NOT NULL,
    "GPT Description" text,
    "Listing" text,
    "Modified Date" timestamp with time zone NOT NULL,
    "Name" text,
    "Passed Image Check?" text,
    "Photo" text,
    "Photo (thumbnail)" text,
    "SortOrder" integer,
    "Type" text,
    "URL" text,
    "View Counter" integer,
    bulk_upload_listing_id text,
    "toggleMainPhoto" boolean,
    created_at timestamp with time zone DEFAULT now(),
    updated_at timestamp with time zone DEFAULT now(),
    pending boolean DEFAULT false,
    bubble_id text
);


--
-- Name: TABLE listing_photo; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON TABLE public.listing_photo IS 'Bubble.io listing_photo data - preserves original field names for sync';


--
-- Name: mailing_list_opt_in; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.mailing_list_opt_in (
    _id text NOT NULL,
    "Created By" text NOT NULL,
    "Created Date" timestamp with time zone NOT NULL,
    "Modified Date" timestamp with time zone NOT NULL,
    "Source of email" text,
    email text,
    created_at timestamp with time zone DEFAULT now(),
    updated_at timestamp with time zone DEFAULT now(),
    pending boolean DEFAULT false,
    bubble_id text
);


--
-- Name: TABLE mailing_list_opt_in; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON TABLE public.mailing_list_opt_in IS 'Bubble.io mailing_list_opt_in data - preserves original field names for sync';


--
-- Name: mainreview; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.mainreview (
    _id text NOT NULL,
    "Comment" text,
    "Created By" text,
    "Created Date" timestamp with time zone NOT NULL,
    "House Manual" text,
    "Is Published?" boolean,
    "Is Visible to Reviewee?" boolean,
    "Lease" text,
    "Modified Date" timestamp with time zone NOT NULL,
    "Overall Score" numeric,
    "Rating Details" jsonb,
    "Reviewee/Target" text,
    "Reviewer" text,
    "Stay" text,
    "Type of Review" text NOT NULL,
    "Visit" text,
    "for the guest?" boolean,
    "for the host?" boolean,
    "is Private?" boolean,
    created_at timestamp with time zone DEFAULT now(),
    updated_at timestamp with time zone DEFAULT now(),
    pending boolean DEFAULT false,
    bubble_id text
);


--
-- Name: TABLE mainreview; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON TABLE public.mainreview IS 'Bubble.io mainreview data - preserves original field names for sync';


--
-- Name: multimessage; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.multimessage (
    _id text NOT NULL,
    "Created By" text,
    "Created Date" timestamp with time zone NOT NULL,
    "Email Message ID" text,
    "Email Processed?" boolean,
    "Email Steps" jsonb,
    "Existing SMS Session?" boolean,
    "In Reply To Header" text,
    "Incoming SMS Channel" text,
    "Masked Email(Proxy)" text,
    "Message Content" text NOT NULL,
    "Message ID Header" text,
    "Message Status" text,
    "Modified Date" timestamp with time zone NOT NULL,
    "Outgoing SMS Channel" text,
    "Proxy SMS Channel" text,
    "Proxy(Email/Phone)" text,
    "Received As" text,
    "Recipient(User)" text,
    "References Header" text,
    "SMS Processed?" boolean NOT NULL,
    "SMS Session" text,
    "SMS Steps" jsonb,
    "Sender(Email/Phone)" text,
    "Sender(User)" text,
    "Session Selector Input" text,
    "Session Selector Output" text,
    "Subject" text,
    "Thread / Conversation" text,
    created_at timestamp with time zone DEFAULT now(),
    updated_at timestamp with time zone DEFAULT now(),
    pending boolean DEFAULT false,
    bubble_id text
);


--
-- Name: TABLE multimessage; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON TABLE public.multimessage IS 'Bubble.io multimessage data - preserves original field names for sync';


--
-- Name: narration; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.narration (
    _id text NOT NULL,
    "Content preference" text,
    "Created By" text NOT NULL,
    "Created Date" timestamp with time zone NOT NULL,
    "House Manual" text NOT NULL,
    "Jingle / Narration created?" boolean,
    "Melody Preferences" text,
    "Modified Date" timestamp with time zone NOT NULL,
    "Narration / Jingle Requested" boolean,
    "Narration ID" text NOT NULL,
    "Narration/Jingle Audio" text,
    "Narration/Jingle Script" text,
    "Narrator data" text,
    "Visit" text,
    "is it jingle?" boolean,
    "is it narration?" boolean,
    created_at timestamp with time zone DEFAULT now(),
    updated_at timestamp with time zone DEFAULT now(),
    pending boolean DEFAULT false,
    bubble_id text
);


--
-- Name: TABLE narration; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON TABLE public.narration IS 'Bubble.io narration data - preserves original field names for sync';


--
-- Name: negotiationsummary; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.negotiationsummary (
    _id text NOT NULL,
    "Created By" text NOT NULL,
    "Created Date" timestamp with time zone NOT NULL,
    "Modified Date" timestamp with time zone NOT NULL,
    "Proposal associated" text,
    "Status Proposal - (OS)" text,
    "Summary" text,
    "To Account" text NOT NULL,
    created_at timestamp with time zone DEFAULT now(),
    updated_at timestamp with time zone DEFAULT now(),
    pending boolean DEFAULT false,
    bubble_id text
);


--
-- Name: TABLE negotiationsummary; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON TABLE public.negotiationsummary IS 'Bubble.io negotiationsummary data - preserves original field names for sync';


--
-- Name: notification_preferences; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.notification_preferences (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    user_id text NOT NULL,
    message_forwarding_sms boolean DEFAULT false,
    message_forwarding_email boolean DEFAULT false,
    payment_reminders_sms boolean DEFAULT false,
    payment_reminders_email boolean DEFAULT false,
    promotional_sms boolean DEFAULT false,
    promotional_email boolean DEFAULT false,
    reservation_updates_sms boolean DEFAULT false,
    reservation_updates_email boolean DEFAULT false,
    lease_requests_sms boolean DEFAULT false,
    lease_requests_email boolean DEFAULT false,
    proposal_updates_sms boolean DEFAULT false,
    proposal_updates_email boolean DEFAULT false,
    checkin_checkout_sms boolean DEFAULT false,
    checkin_checkout_email boolean DEFAULT false,
    reviews_sms boolean DEFAULT false,
    reviews_email boolean DEFAULT false,
    tips_insights_sms boolean DEFAULT false,
    tips_insights_email boolean DEFAULT false,
    account_assistance_sms boolean DEFAULT false,
    account_assistance_email boolean DEFAULT false,
    virtual_meetings_sms boolean DEFAULT false,
    virtual_meetings_email boolean DEFAULT false,
    created_at timestamp with time zone DEFAULT now(),
    updated_at timestamp with time zone DEFAULT now(),
    pending boolean DEFAULT false
);


--
-- Name: TABLE notification_preferences; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON TABLE public.notification_preferences IS 'User notification preferences for SMS and Email channels across 11 categories';


--
-- Name: COLUMN notification_preferences.user_id; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.notification_preferences.user_id IS 'Reference to user._id (Bubble user ID)';


--
-- Name: COLUMN notification_preferences.message_forwarding_sms; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.notification_preferences.message_forwarding_sms IS 'Receive forwarded messages via SMS';


--
-- Name: COLUMN notification_preferences.message_forwarding_email; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.notification_preferences.message_forwarding_email IS 'Receive forwarded messages via Email';


--
-- Name: COLUMN notification_preferences.payment_reminders_sms; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.notification_preferences.payment_reminders_sms IS 'Billing and payment notifications via SMS';


--
-- Name: COLUMN notification_preferences.payment_reminders_email; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.notification_preferences.payment_reminders_email IS 'Billing and payment notifications via Email';


--
-- Name: COLUMN notification_preferences.promotional_sms; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.notification_preferences.promotional_sms IS 'Marketing and promotional content via SMS';


--
-- Name: COLUMN notification_preferences.promotional_email; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.notification_preferences.promotional_email IS 'Marketing and promotional content via Email';


--
-- Name: COLUMN notification_preferences.reservation_updates_sms; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.notification_preferences.reservation_updates_sms IS 'Booking changes via SMS';


--
-- Name: COLUMN notification_preferences.reservation_updates_email; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.notification_preferences.reservation_updates_email IS 'Booking changes via Email';


--
-- Name: COLUMN notification_preferences.lease_requests_sms; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.notification_preferences.lease_requests_sms IS 'Lease inquiries via SMS';


--
-- Name: COLUMN notification_preferences.lease_requests_email; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.notification_preferences.lease_requests_email IS 'Lease inquiries via Email';


--
-- Name: COLUMN notification_preferences.proposal_updates_sms; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.notification_preferences.proposal_updates_sms IS 'Proposal changes via SMS';


--
-- Name: COLUMN notification_preferences.proposal_updates_email; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.notification_preferences.proposal_updates_email IS 'Proposal changes via Email';


--
-- Name: COLUMN notification_preferences.checkin_checkout_sms; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.notification_preferences.checkin_checkout_sms IS 'Guest arrival/departure alerts via SMS';


--
-- Name: COLUMN notification_preferences.checkin_checkout_email; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.notification_preferences.checkin_checkout_email IS 'Guest arrival/departure alerts via Email';


--
-- Name: COLUMN notification_preferences.reviews_sms; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.notification_preferences.reviews_sms IS 'Rating and feedback notifications via SMS';


--
-- Name: COLUMN notification_preferences.reviews_email; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.notification_preferences.reviews_email IS 'Rating and feedback notifications via Email';


--
-- Name: COLUMN notification_preferences.tips_insights_sms; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.notification_preferences.tips_insights_sms IS 'Educational content and market analysis via SMS';


--
-- Name: COLUMN notification_preferences.tips_insights_email; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.notification_preferences.tips_insights_email IS 'Educational content and market analysis via Email';


--
-- Name: COLUMN notification_preferences.account_assistance_sms; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.notification_preferences.account_assistance_sms IS 'Account login and permissions help via SMS';


--
-- Name: COLUMN notification_preferences.account_assistance_email; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.notification_preferences.account_assistance_email IS 'Account login and permissions help via Email';


--
-- Name: COLUMN notification_preferences.virtual_meetings_sms; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.notification_preferences.virtual_meetings_sms IS 'Video/online meeting notifications via SMS';


--
-- Name: COLUMN notification_preferences.virtual_meetings_email; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.notification_preferences.virtual_meetings_email IS 'Video/online meeting notifications via Email';


--
-- Name: notificationsettingsos_lists_; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.notificationsettingsos_lists_ (
    _id text NOT NULL,
    "Check In/Out Reminders" public."Notification Preferences"[],
    "Created By" text NOT NULL,
    "Created Date" timestamp with time zone NOT NULL,
    "Lease Requests" public."Notification Preferences"[],
    "Login/Signup Assistance" public."Notification Preferences"[],
    "Message Forwarding" public."Notification Preferences"[],
    "Modified Date" timestamp with time zone NOT NULL,
    "Payment Reminders" public."Notification Preferences"[],
    "Promotional" public."Notification Preferences"[],
    "Proposal Updates" public."Notification Preferences"[],
    "Reservation Updates" public."Notification Preferences"[],
    "Reviews" public."Notification Preferences"[],
    "Tips/Insights" public."Notification Preferences"[],
    "User" text,
    "Virtual Meetings" public."Notification Preferences"[],
    created_at timestamp with time zone DEFAULT now(),
    updated_at timestamp with time zone DEFAULT now(),
    pending boolean DEFAULT false,
    bubble_id text
);


--
-- Name: TABLE notificationsettingsos_lists_; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON TABLE public.notificationsettingsos_lists_ IS 'Bubble.io notificationsettingsos_lists_ data - preserves original field names for sync';


--
-- Name: num; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.num (
    _id text NOT NULL,
    "Created By" text NOT NULL,
    "Created Date" timestamp with time zone NOT NULL,
    "Modified Date" timestamp with time zone NOT NULL,
    num real,
    created_at timestamp with time zone DEFAULT now(),
    updated_at timestamp with time zone DEFAULT now(),
    pending boolean DEFAULT false,
    bubble_id text
);


--
-- Name: TABLE num; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON TABLE public.num IS 'Bubble.io num data - preserves original field names for sync';


--
-- Name: occupant; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.occupant (
    _id text NOT NULL,
    "Created By" text NOT NULL,
    "Created Date" timestamp with time zone NOT NULL,
    "Modified Date" timestamp with time zone NOT NULL,
    "Name" text,
    "Relationship" text,
    created_at timestamp with time zone DEFAULT now(),
    updated_at timestamp with time zone DEFAULT now(),
    pending boolean DEFAULT false,
    bubble_id text
);


--
-- Name: TABLE occupant; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON TABLE public.occupant IS 'Bubble.io occupant data - preserves original field names for sync';


--
-- Name: paymentrecords; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.paymentrecords (
    _id text NOT NULL,
    "Actual Date of Payment" timestamp with time zone,
    "Bank Transaction Number" integer,
    "Booking - Reservation" text,
    "Created By" text NOT NULL,
    "Created Date" timestamp with time zone NOT NULL,
    "Damage Deposit" integer,
    "Maintenance Fee" integer,
    "Modified Date" timestamp with time zone NOT NULL,
    "Payment #" integer,
    "Payment Delayed?" boolean,
    "Payment Receipt" text,
    "Payment from guest?" boolean,
    "Payment to Host?" boolean,
    "Rent" integer,
    "Scheduled Date" timestamp with time zone,
    "Total Paid by Guest" numeric,
    "Total Paid to Host" integer,
    "source calculation" text,
    created_at timestamp with time zone DEFAULT now(),
    updated_at timestamp with time zone DEFAULT now(),
    pending boolean DEFAULT false,
    bubble_id text
);


--
-- Name: TABLE paymentrecords; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON TABLE public.paymentrecords IS 'Bubble.io paymentrecords data - preserves original field names for sync';


--
-- Name: paymentsfromdatechanges; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.paymentsfromdatechanges (
    _id text NOT NULL,
    "Created By" text,
    "Created Date" timestamp with time zone NOT NULL,
    "Modified Date" timestamp with time zone NOT NULL,
    "Participants" jsonb NOT NULL,
    "amount received" numeric NOT NULL,
    "date change request" text NOT NULL,
    lease text,
    payer text NOT NULL,
    receiver text,
    "scheduled date" timestamp with time zone NOT NULL,
    created_at timestamp with time zone DEFAULT now(),
    updated_at timestamp with time zone DEFAULT now(),
    pending boolean DEFAULT false,
    bubble_id text
);


--
-- Name: TABLE paymentsfromdatechanges; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON TABLE public.paymentsfromdatechanges IS 'Bubble.io paymentsfromdatechanges data - preserves original field names for sync';


--
-- Name: postmark_loginbound; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.postmark_loginbound (
    _id text NOT NULL,
    "Created By" text NOT NULL,
    "Created Date" timestamp with time zone NOT NULL,
    "Modified Date" timestamp with time zone NOT NULL,
    body text,
    subject text NOT NULL,
    "threadID" text,
    "to" text NOT NULL,
    created_at timestamp with time zone DEFAULT now(),
    updated_at timestamp with time zone DEFAULT now(),
    pending boolean DEFAULT false,
    bubble_id text
);


--
-- Name: TABLE postmark_loginbound; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON TABLE public.postmark_loginbound IS 'Bubble.io postmark_loginbound data - preserves original field names for sync';


--
-- Name: pricing_list; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.pricing_list (
    _id text NOT NULL,
    "Combined Markup" numeric,
    "Created By" text,
    "Created Date" timestamp with time zone,
    "Full Time Discount" numeric,
    "Host Compensation" jsonb,
    "Markup and Discount Multiplier" jsonb,
    "Modified Date" timestamp with time zone NOT NULL,
    "Nightly Price" jsonb,
    "Starting Nightly Price" numeric,
    "Unit Markup" numeric,
    "Unused Nights" jsonb,
    "Unused Nights Discount" jsonb,
    "Weekly Price Adjust" numeric,
    created_at timestamp with time zone DEFAULT now(),
    updated_at timestamp with time zone DEFAULT now(),
    pending boolean DEFAULT false,
    bubble_id text
);


--
-- Name: TABLE pricing_list; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON TABLE public.pricing_list IS 'Bubble.io pricing_list data - preserves original field names for sync';


--
-- Name: proposal; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.proposal (
    _id text NOT NULL,
    "4 week compensation" numeric,
    "4 week rent" numeric NOT NULL,
    "Comment" text,
    "Complementary Days" jsonb,
    "Complementary Nights" jsonb NOT NULL,
    "Created By" text,
    "Created Date" timestamp with time zone NOT NULL,
    "Days Available" jsonb,
    "Days Selected" jsonb,
    "Deleted" boolean,
    "Draft Authorization Credit Card" text,
    "Draft Host Payout Schedule" text,
    "Draft Periodic Tenancy Agreement" text,
    "Draft Supplemental Agreement" text,
    "Drafts List" jsonb,
    "End date" timestamp with time zone,
    "Guest" text,
    "Guest email" text NOT NULL,
    "Guest flexibility" text,
    "History" jsonb NOT NULL,
    "Host User" text,
    "House Rules" jsonb,
    "Is Finalized" boolean NOT NULL,
    "Listing" text,
    "Location - Address" jsonb,
    "Location - Address slightly different" jsonb,
    "Modified Date" timestamp with time zone NOT NULL,
    "Move in range end" text NOT NULL,
    "Move in range start" text NOT NULL,
    "Move-out" text,
    "Negotiation Summary" jsonb,
    "Nights Selected (Nights list)" jsonb,
    "Order Ranking" integer NOT NULL,
    "Reservation Span" text NOT NULL,
    "Reservation Span (Weeks)" integer NOT NULL,
    "Scheduled workflow expiration" text,
    "Scheduled workflow expiration reminder" text,
    "Status" text,
    "Total Compensation (proposal - host)" numeric,
    "Total Price for Reservation (guest)" numeric NOT NULL,
    "actual weeks during reservation span" numeric NOT NULL,
    "check in day" text,
    "check out day" text,
    "cleaning fee" numeric,
    "counter offer happened" boolean,
    "damage deposit" numeric,
    "duration in months" numeric,
    "flexible move in?" boolean,
    "guest documents review finalized?" boolean,
    "hc 4 week compensation" numeric,
    "hc 4 week rent" numeric,
    "hc check in day" text,
    "hc check out day" text,
    "hc cleaning fee" numeric,
    "hc damage deposit" numeric,
    "hc days selected" jsonb,
    "hc duration in months" numeric,
    "hc host compensation (per period)" numeric,
    "hc house rules" jsonb,
    "hc move in date" timestamp with time zone,
    "hc nightly price" numeric,
    "hc nights per week" numeric,
    "hc nights selected" jsonb,
    "hc reservation span" text,
    "hc reservation span (weeks)" integer,
    "hc total host compensation" numeric,
    "hc total price" numeric,
    "hc weeks schedule" text,
    "host compensation" numeric,
    "host documents review finalized?" boolean,
    "host email" text,
    "list of dates (actual dates)" jsonb,
    "move-in range (text)" text,
    "need for space" text,
    "night after checkin night" text,
    "night before checkout night" text,
    "nightly price for map (text)" text,
    "nights per week (num)" numeric NOT NULL,
    "other weeks" numeric,
    "preferred gender" text,
    "proposal nightly price" numeric,
    "proposal update message" text,
    "reason for cancellation" text,
    "reminderByHost" integer,
    "remindersByGuest (number)" integer,
    "rental app requested" boolean NOT NULL,
    "rental application" text,
    "rental type" text,
    "request virtual meeting" text,
    "reviewed by frederick" boolean,
    "reviewed by igor" boolean,
    "reviewed by robert" boolean,
    "viewed proposed proposal" boolean,
    "virtual meeting" text,
    "virtual meeting confirmed " boolean,
    "week selection" text,
    created_at timestamp with time zone DEFAULT now(),
    updated_at timestamp with time zone DEFAULT now(),
    about_yourself text,
    special_needs text,
    pending boolean DEFAULT false,
    bubble_id text,
    custom_schedule_description text
);


--
-- Name: TABLE proposal; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON TABLE public.proposal IS 'Table has INSERT grant for anon role for testing purposes. Remove before production!';


--
-- Name: COLUMN proposal.about_yourself; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.proposal.about_yourself IS 'Guest information about themselves from proposal creation flow';


--
-- Name: COLUMN proposal.special_needs; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.proposal.special_needs IS 'Any special requirements or accessibility needs from the guest';


--
-- Name: proxysmssession; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.proxysmssession (
    _id text NOT NULL,
    "Created By" text,
    "Created Date" timestamp with time zone NOT NULL,
    "Modified Date" timestamp with time zone NOT NULL,
    "Multi Message" jsonb,
    "Queued" boolean NOT NULL,
    "SMS Channel " text,
    "Session Active" boolean NOT NULL,
    "Session End" text NOT NULL,
    "Session Start" text NOT NULL,
    "Step" text,
    "Thread / Conversation" text,
    "User Pair" jsonb NOT NULL,
    "User/Channel Pair" jsonb NOT NULL,
    created_at timestamp with time zone DEFAULT now(),
    updated_at timestamp with time zone DEFAULT now(),
    pending boolean DEFAULT false,
    bubble_id text
);


--
-- Name: TABLE proxysmssession; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON TABLE public.proxysmssession IS 'Bubble.io proxysmssession data - preserves original field names for sync';


--
-- Name: qrcodes; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.qrcodes (
    _id text NOT NULL,
    "Created By" text NOT NULL,
    "Created Date" timestamp with time zone NOT NULL,
    "Guest" text,
    "Host" text,
    "House Manual" text,
    "Long URL" text,
    "Modified Date" timestamp with time zone NOT NULL,
    "QR Image" text,
    "QR codes scanned?" boolean,
    "Short URL" text,
    "Use Case" text,
    "Visit" text,
    "is this the empty QR code?" boolean NOT NULL,
    created_at timestamp with time zone DEFAULT now(),
    updated_at timestamp with time zone DEFAULT now(),
    pending boolean DEFAULT false,
    bubble_id text
);


--
-- Name: TABLE qrcodes; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON TABLE public.qrcodes IS 'Bubble.io qrcodes data - preserves original field names for sync';


--
-- Name: ratingdetail_reviews_; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.ratingdetail_reviews_ (
    _id text NOT NULL,
    "Category/Label" text NOT NULL,
    "Created By" text NOT NULL,
    "Created Date" timestamp with time zone NOT NULL,
    "Modified Date" timestamp with time zone NOT NULL,
    "Review" text NOT NULL,
    "Score" numeric,
    created_at timestamp with time zone DEFAULT now(),
    updated_at timestamp with time zone DEFAULT now(),
    pending boolean DEFAULT false,
    bubble_id text
);


--
-- Name: TABLE ratingdetail_reviews_; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON TABLE public.ratingdetail_reviews_ IS 'Bubble.io ratingdetail_reviews_ data - preserves original field names for sync';


--
-- Name: referral; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.referral (
    _id text NOT NULL,
    "Booked On Site" boolean NOT NULL,
    "CES Score - Referrant" integer,
    "CES Score - Referrer" integer,
    "Cashback Points - Referrant" integer,
    "Cashback Points - Referrer" integer,
    "Claimed - Referrant" boolean,
    "Claimed - Referrer" boolean,
    "Created By" text,
    "Created Date" timestamp with time zone NOT NULL,
    "Modified Date" timestamp with time zone NOT NULL,
    "Source" text,
    "fromUser" text,
    seen boolean NOT NULL,
    "toUserEmail" text,
    "toUserName" text,
    created_at timestamp with time zone DEFAULT now(),
    updated_at timestamp with time zone DEFAULT now(),
    pending boolean DEFAULT false,
    bubble_id text
);


--
-- Name: TABLE referral; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON TABLE public.referral IS 'Bubble.io referral data - preserves original field names for sync';


--
-- Name: remindersfromhousemanual; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.remindersfromhousemanual (
    _id text NOT NULL,
    "API scheduled code for email" text,
    "API scheduled code for sms" text NOT NULL,
    "Created By" text NOT NULL,
    "Created Date" timestamp with time zone NOT NULL,
    "Modified Date" timestamp with time zone NOT NULL,
    guest text,
    "house manual" text NOT NULL,
    "is a phone reminder?" boolean,
    "is an email reminder?" boolean,
    "message to send" text NOT NULL,
    "phone number (in case no guest attached)" text,
    "scheduled date and time" timestamp with time zone NOT NULL,
    "type of reminders" text,
    created_at timestamp with time zone DEFAULT now(),
    updated_at timestamp with time zone DEFAULT now(),
    pending boolean DEFAULT false,
    bubble_id text
);


--
-- Name: TABLE remindersfromhousemanual; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON TABLE public.remindersfromhousemanual IS 'Bubble.io remindersfromhousemanual data - preserves original field names for sync';


--
-- Name: rentalapplication; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.rentalapplication (
    _id text NOT NULL,
    "Created By" text NOT NULL,
    "Created Date" timestamp with time zone NOT NULL,
    "DOB" text,
    "Hosts (users) able to see this rental app" jsonb,
    "Modified Date" timestamp with time zone NOT NULL,
    "Monthly Income" integer,
    "State ID - Back" text,
    "State ID - Front" text,
    "alternate guarantee" text,
    "apartment number" text,
    "business legal name" text,
    "credit score" text,
    email text,
    "employer name" text,
    "employer phone number" text,
    "employment status" text,
    "government ID" text,
    "job title" text,
    "length resided" text,
    linkedin text,
    "message of rental app submitted sent to hosts?" boolean,
    name text,
    "occupants list" jsonb,
    parking boolean,
    passport text,
    "percentage % done" integer,
    "permanent address" jsonb,
    pets boolean,
    "phone number" text,
    "progress NEW (list)" jsonb,
    "proof of employment" text,
    "references" jsonb,
    renting boolean,
    signature text,
    "signature (text)" text,
    smoking boolean,
    "state business registered" text,
    submitted boolean,
    "year business was created?" integer,
    "zep-landlord reference" text,
    "zep-progress" text,
    created_at timestamp with time zone DEFAULT now(),
    updated_at timestamp with time zone DEFAULT now(),
    pending boolean DEFAULT false,
    bubble_id text
);


--
-- Name: TABLE rentalapplication; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON TABLE public.rentalapplication IS 'Bubble.io rentalapplication data - preserves original field names for sync';


--
-- Name: reviewslistingsexternal; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.reviewslistingsexternal (
    _id text NOT NULL,
    "Active" boolean,
    "Created By" text NOT NULL,
    "Created Date" timestamp with time zone NOT NULL,
    "Date of review" timestamp with time zone,
    "Description" text NOT NULL,
    "External Review Image" text,
    "Modified Date" timestamp with time zone NOT NULL,
    "Profile Picture - Reviewer" text,
    "Rating" integer NOT NULL,
    "Review Type" text,
    "Reviewed Listing" text,
    "Reviewed User" text,
    "Reviewer Name" text,
    "Source of review eg (Airbnb VRBO)" text,
    "flagOperator" boolean,
    "is for testers?" boolean,
    created_at timestamp with time zone DEFAULT now(),
    updated_at timestamp with time zone DEFAULT now(),
    pending boolean DEFAULT false,
    bubble_id text
);


--
-- Name: TABLE reviewslistingsexternal; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON TABLE public.reviewslistingsexternal IS 'Bubble.io reviewslistingsexternal data - preserves original field names for sync';


--
-- Name: savedsearch; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.savedsearch (
    _id text NOT NULL,
    "Area" text,
    "Borough Area" text,
    "City" text NOT NULL,
    "Created By" text,
    "Created Date" timestamp with time zone NOT NULL,
    "Modified Date" timestamp with time zone NOT NULL,
    "Type of Spaces" jsonb,
    "User" text,
    "destinationEmail" text NOT NULL,
    "filterAvailableDate" timestamp with time zone,
    "newListings" jsonb,
    created_at timestamp with time zone DEFAULT now(),
    updated_at timestamp with time zone DEFAULT now(),
    pending boolean DEFAULT false,
    bubble_id text
);


--
-- Name: TABLE savedsearch; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON TABLE public.savedsearch IS 'Bubble.io savedsearch data - preserves original field names for sync';


--
-- Name: state; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.state (
    _id text NOT NULL,
    "Abbreviation" text NOT NULL,
    "Created By" text NOT NULL,
    "Created Date" timestamp with time zone NOT NULL,
    "Modified Date" timestamp with time zone NOT NULL,
    "Name" text NOT NULL,
    created_at timestamp with time zone DEFAULT now(),
    updated_at timestamp with time zone DEFAULT now(),
    pending boolean DEFAULT false,
    bubble_id text
);


--
-- Name: TABLE state; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON TABLE public.state IS 'Bubble.io state data - preserves original field names for sync';


--
-- Name: sync_config; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.sync_config (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    supabase_table text NOT NULL,
    bubble_workflow text NOT NULL,
    bubble_object_type text,
    enabled boolean DEFAULT true,
    sync_on_insert boolean DEFAULT true,
    sync_on_update boolean DEFAULT true,
    sync_on_delete boolean DEFAULT false,
    field_mapping jsonb,
    excluded_fields text[],
    created_at timestamp with time zone DEFAULT now(),
    updated_at timestamp with time zone DEFAULT now()
);


--
-- Name: TABLE sync_config; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON TABLE public.sync_config IS 'Configuration for Supabase → Bubble sync. Maps tables to workflow endpoints.';


--
-- Name: sync_queue; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.sync_queue (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    table_name text NOT NULL,
    record_id text NOT NULL,
    operation text NOT NULL,
    payload jsonb,
    status text DEFAULT 'pending'::text NOT NULL,
    error_message text,
    error_details jsonb,
    retry_count integer DEFAULT 0,
    max_retries integer DEFAULT 3,
    created_at timestamp with time zone DEFAULT now(),
    processed_at timestamp with time zone,
    next_retry_at timestamp with time zone,
    bubble_response jsonb,
    idempotency_key text,
    CONSTRAINT sync_queue_operation_check CHECK ((operation = ANY (ARRAY['INSERT'::text, 'UPDATE'::text, 'DELETE'::text]))),
    CONSTRAINT sync_queue_status_check CHECK ((status = ANY (ARRAY['pending'::text, 'processing'::text, 'completed'::text, 'failed'::text, 'skipped'::text])))
);


--
-- Name: TABLE sync_queue; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON TABLE public.sync_queue IS 'Queue of pending Supabase → Bubble sync operations.';


--
-- Name: sync_queue_status; Type: VIEW; Schema: public; Owner: -
--

CREATE VIEW public.sync_queue_status AS
 SELECT status,
    table_name,
    count(*) AS count,
    min(created_at) AS oldest,
    max(created_at) AS newest
   FROM public.sync_queue
  GROUP BY status, table_name
  ORDER BY status, table_name;


--
-- Name: thread; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.thread (
    _id text NOT NULL,
    "Participants" jsonb,
    "Listing" text,
    "Created Date" timestamp with time zone,
    "Modified Date" timestamp with time zone,
    "Messages sent by SLBot to Host" jsonb,
    "Messages sent by SLBot to Guest" jsonb,
    "Thread Subject" text,
    "Created By" text,
    "Call to Action" text,
    "-Guest User" text,
    "-Host User" text,
    "Message list" jsonb,
    "~threadID" text,
    "~Last Message" text,
    "Messages Sent by Host" jsonb,
    "Messages Sent by Guest" jsonb,
    "~Date Last Message" timestamp with time zone,
    "Proposal" text,
    created_at timestamp with time zone DEFAULT CURRENT_TIMESTAMP,
    updated_at timestamp with time zone DEFAULT CURRENT_TIMESTAMP,
    "Masked Email" text,
    "from logged out user?" boolean DEFAULT false,
    "Multi Messages" jsonb,
    "SMS Session" text
);


--
-- Name: COLUMN thread."Masked Email"; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.thread."Masked Email" IS 'Masked email address for privacy-preserving thread communication';


--
-- Name: COLUMN thread."from logged out user?"; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.thread."from logged out user?" IS 'Indicates whether the thread originated from a logged out user';


--
-- Name: COLUMN thread."Multi Messages"; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.thread."Multi Messages" IS 'Multi-channel messages stored as JSON array';


--
-- Name: updatestodocuments; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.updatestodocuments (
    _id text NOT NULL,
    "Created By" text,
    "Created Date" timestamp with time zone NOT NULL,
    "Document Involved" text NOT NULL,
    "Document name" text NOT NULL,
    "Modified Date" timestamp with time zone NOT NULL,
    "Original Text Screenshot" text,
    "Page number" integer,
    "Previous Text" text,
    "Proposal Involved" text,
    "Suggested Text" text NOT NULL,
    "requested by" text,
    created_at timestamp with time zone DEFAULT now(),
    updated_at timestamp with time zone DEFAULT now(),
    pending boolean DEFAULT false,
    bubble_id text
);


--
-- Name: TABLE updatestodocuments; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON TABLE public.updatestodocuments IS 'Bubble.io updatestodocuments data - preserves original field names for sync';


--
-- Name: user; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public."user" (
    _id text NOT NULL,
    "AI Credits" numeric,
    "API reminder finish profile ID" text,
    "About - Commonly Stored Items" jsonb,
    "About - reasons to host me" text,
    "About Me / Bio" text,
    "Additional Credits Received" boolean,
    "Allow Email Change" boolean,
    "Chat - Threads" jsonb,
    "Created Date" timestamp with time zone,
    "Curated listing page" text,
    "Date of Birth" timestamp with time zone,
    "Favorited Listings" jsonb,
    "Google ID" text,
    "Hide Nights Error" boolean,
    "Hide header announcement" boolean,
    "History date and page" jsonb,
    "History dates" jsonb,
    "ID Back" text,
    "ID documents submitted? " boolean,
    "ID front" text,
    "Last Visit (return user popup)" text,
    "Lead Info Captured" boolean,
    "Leases" jsonb,
    "Message Forwarding Preference(list)" jsonb,
    "Mobile Notifications On" boolean,
    "Mobile User Preference" text,
    "Modified Date" timestamp with time zone NOT NULL,
    "Move-in range" jsonb,
    "Name - First" text,
    "Name - Full" text,
    "Name - Last" text,
    "Notification Settings OS(lisits)" text,
    "Personal Address" jsonb,
    "Phone Calls" text,
    "Phone Number (as text)" text,
    "Player ID" text,
    "Preferred Borough" text,
    "Preferred Hoods" jsonb,
    "Preferred Searched Address" jsonb,
    "Preferred weekly schedule" text,
    "Price Tier" text,
    "Profile Photo" text,
    "Profile Photo changed" text,
    "Promo - Codes Seen" jsonb,
    "Reasons to Host me" jsonb,
    "Recent Days Selected" jsonb,
    "Rental Application" text,
    "SMS Lock" boolean,
    "Saved Search" text,
    "Search Log" jsonb,
    "Selfie with ID" text,
    "Sign up - Preferred Schedule Type" text,
    "Sign up - Willing to Clean" text,
    "Split Schedule Preference" text,
    "StripeCustomerID" text,
    "Tasks Completed" jsonb,
    "Toggle - Is Admin" boolean,
    "Toggle - Is Corporate User" boolean,
    "Type - User Current" text,
    "Type - User Signup" text,
    "Usability Step" integer,
    "User Sub Type" text,
    "Users with permission to see sensitive info" jsonb,
    "Verify - Email Confirmation Code" text,
    "Verify - Linked In ID" text,
    "Verify - Phone" boolean,
    "agreed to term and conditions?" boolean,
    authentication jsonb NOT NULL,
    "credit score" integer,
    "email as text" text,
    "emails-txt-sent" jsonb,
    "flexibility (last known)" text,
    "freeFormIdealSchedule" text,
    "freeform ai signup text" text,
    "freeform ai signup text (chatgpt generation)" text,
    "has logged in through mobile app" boolean,
    "ideal schedule (company suggested)" jsonb,
    "ideal schedule night selector type" text,
    "incomplete rental app API workflow" text,
    "is email confirmed" boolean,
    "is usability tester" boolean,
    "login counter" integer,
    "manualID" text,
    "mobile app reminder API Workflow" text,
    "my emails history" jsonb,
    "need for Space" text,
    "notify of mobile app opened" text,
    "override tester?" boolean,
    "profile completeness" integer,
    "recent rental type search" jsonb,
    "recent rental type search list" jsonb,
    "reminder after 15 days sent?" boolean,
    "reservation span" text,
    "show selector popups?" boolean,
    "special needs" text,
    "transportation medium" text,
    "user verified?" boolean,
    user_signed_up boolean NOT NULL,
    usernotifyseton boolean,
    created_at timestamp with time zone DEFAULT now(),
    updated_at timestamp with time zone DEFAULT now(),
    "Notification Setting" text,
    email text,
    pending boolean DEFAULT false,
    bubble_id text,
    "Listings" jsonb,
    "Receptivity" numeric,
    "MedianHoursToReply" integer,
    "Proposals List" text[] DEFAULT '{}'::text[]
);


--
-- Name: TABLE "user"; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON TABLE public."user" IS 'Bubble.io user data - preserves original field names for sync';


--
-- Name: COLUMN "user"."Listings"; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public."user"."Listings" IS 'List of Listing _id references owned by this host user. Part of account_host normalization.';


--
-- Name: COLUMN "user"."Receptivity"; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public."user"."Receptivity" IS 'Host receptivity score (0-1 scale). Part of account_host normalization.';


--
-- Name: COLUMN "user"."MedianHoursToReply"; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public."user"."MedianHoursToReply" IS 'Median hours for host to reply to messages. Part of account_host normalization.';


--
-- Name: COLUMN "user"."Proposals List"; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public."user"."Proposals List" IS 'Array of proposal IDs referencing proposal._id. Integrity checked via check_proposals_list_integrity()';


--
-- Name: virtualmeetingschedulesandlinks; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.virtualmeetingschedulesandlinks (
    _id text NOT NULL,
    "Created By" text,
    "Created Date" timestamp with time zone NOT NULL,
    "Listing (for Co-Host feature)" text,
    "Modified Date" timestamp with time zone NOT NULL,
    "booked date" timestamp with time zone,
    "confirmedBySplitLease" boolean NOT NULL,
    "end of meeting" text,
    guest text,
    "guest email" text,
    "guest name" text,
    host text,
    "host email" text,
    "host name" text,
    "invitation sent to guest?" boolean,
    "invitation sent to host?" boolean,
    "meeting declined" boolean,
    "meeting duration" integer,
    "meeting link" text,
    proposal text,
    "requested by" text,
    "suggested dates and times" jsonb NOT NULL,
    created_at timestamp with time zone DEFAULT now(),
    updated_at timestamp with time zone DEFAULT now(),
    pending boolean DEFAULT false,
    bubble_id text
);


--
-- Name: TABLE virtualmeetingschedulesandlinks; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON TABLE public.virtualmeetingschedulesandlinks IS 'Bubble.io virtualmeetingschedulesandlinks data - preserves original field names for sync';


--
-- Name: visit; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.visit (
    _id text NOT NULL,
    "(audio) Narration for this Visit" text,
    "Additional Guest Responsibilities" text,
    "Additional House Rules" text,
    "Amenities Tips" text,
    "Arrival/Checkin Date" timestamp with time zone,
    "Check-In Instructions" text,
    "Check-Out Instructions" text,
    "Conflict Resolution" text,
    "Created By" text NOT NULL,
    "Created Date" timestamp with time zone NOT NULL,
    "Departure Checklist" jsonb,
    "Dining / Food Ordering Tips" text,
    "ENTIRE House Manual translated" text,
    "Fire Extinguisher" text,
    "First Aid Kit" text,
    "House Rules" jsonb,
    "LIST of Narration / Jingles" jsonb,
    "Language" text,
    "Laundry Options" text,
    "Local Attractions & Things To Do" text,
    "Modified Date" timestamp with time zone NOT NULL,
    "Off-Limit Areas" text,
    "PDF version" text,
    "Parking Tips" text,
    "QR code image" text,
    "Rearranging Furniture" text,
    "Reminders from House Manual " jsonb,
    "Review from Guest" text,
    "SECTION before leaving" boolean,
    "SECTION building and neighborhood" boolean,
    "SECTION house guidelines" boolean,
    "SECTION security" boolean,
    "SECTION upon arrival" boolean,
    "SECTION utilities and appliances" boolean,
    "Security Features" text,
    "Short URL" text,
    "Specific Guidelines Use Case" text,
    "Specific Guidelines Use Case 2" text,
    "Specific Kitchen Tips" text,
    "Storage Instructions" text,
    "Streaming Services" text,
    "Surveillance Cameras" text,
    "Temperature Control" text,
    "Things Good to Know" text,
    "Tips to get to your place" text,
    "Unique Narration / Jingle" text,
    "User shared with (guest)" text,
    "Visit photos for specific guidelines" jsonb,
    "Waste Disposal / Recycling" text,
    "WiFi Name" text,
    "WiFi Password" text,
    "address (geo)" jsonb,
    audience text,
    "auto reminder sent info" jsonb,
    "auto reminders sent?" boolean,
    "house manual" text,
    "is PDF loading?" boolean,
    "link saw?" boolean NOT NULL,
    "map saw?" boolean,
    "narration heard?" boolean,
    "time guest listened to jingle" text,
    "time guest logged in" text,
    "time guest sent a reminder" text,
    created_at timestamp with time zone DEFAULT now(),
    updated_at timestamp with time zone DEFAULT now(),
    pending boolean DEFAULT false,
    bubble_id text
);


--
-- Name: TABLE visit; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON TABLE public.visit IS 'Bubble.io visit data - preserves original field names for sync';


--
-- Name: waitlistsubmission; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.waitlistsubmission (
    _id text NOT NULL,
    "Created By" text NOT NULL,
    "Created Date" timestamp with time zone NOT NULL,
    "Desired City" text NOT NULL,
    "Desired State" text,
    "Email" text NOT NULL,
    "Modified Date" timestamp with time zone NOT NULL,
    created_at timestamp with time zone DEFAULT now(),
    updated_at timestamp with time zone DEFAULT now(),
    pending boolean DEFAULT false,
    bubble_id text
);


--
-- Name: TABLE waitlistsubmission; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON TABLE public.waitlistsubmission IS 'Bubble.io waitlistsubmission data - preserves original field names for sync';


--
-- Name: workflow_definitions; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.workflow_definitions (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    name text NOT NULL,
    description text,
    steps jsonb NOT NULL,
    required_fields text[] DEFAULT '{}'::text[],
    timeout_seconds integer DEFAULT 300,
    visibility_timeout integer DEFAULT 60,
    max_retries integer DEFAULT 3,
    active boolean DEFAULT true,
    created_at timestamp with time zone DEFAULT now(),
    updated_at timestamp with time zone DEFAULT now(),
    created_by text,
    version integer DEFAULT 1
);


--
-- Name: TABLE workflow_definitions; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON TABLE public.workflow_definitions IS 'Named workflow configurations with step sequences for orchestration';


--
-- Name: workflow_executions; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.workflow_executions (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    workflow_name text NOT NULL,
    workflow_version integer NOT NULL,
    status text DEFAULT 'pending'::text NOT NULL,
    current_step integer DEFAULT 0,
    total_steps integer NOT NULL,
    input_payload jsonb NOT NULL,
    context jsonb DEFAULT '{}'::jsonb,
    error_message text,
    error_step text,
    retry_count integer DEFAULT 0,
    created_at timestamp with time zone DEFAULT now(),
    started_at timestamp with time zone,
    completed_at timestamp with time zone,
    correlation_id text,
    triggered_by text,
    CONSTRAINT workflow_executions_status_check CHECK ((status = ANY (ARRAY['pending'::text, 'running'::text, 'completed'::text, 'failed'::text, 'cancelled'::text])))
);


--
-- Name: TABLE workflow_executions; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON TABLE public.workflow_executions IS 'Audit trail and status tracking for workflow executions';


--
-- Name: zat_aisuggestions; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.zat_aisuggestions (
    _id text NOT NULL,
    "Content" text,
    "Created By" text NOT NULL,
    "Created Date" timestamp with time zone NOT NULL,
    "Field suggested house manual" text,
    "Field suggested listing" text,
    "House Manual" text,
    "Listing" text,
    "Modified Date" timestamp with time zone NOT NULL,
    "Previous Content" text,
    "being processed?" boolean,
    "from PDF?" boolean,
    "from audio?" boolean,
    "from call?" boolean,
    "from free text form?" boolean,
    "from google doc?" boolean,
    "from listing?" boolean,
    "raw text sent" text,
    created_at timestamp with time zone DEFAULT now(),
    updated_at timestamp with time zone DEFAULT now(),
    pending boolean DEFAULT false
);


--
-- Name: TABLE zat_aisuggestions; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON TABLE public.zat_aisuggestions IS 'Bubble.io zat_aisuggestions data - preserves original field names for sync';


--
-- Name: zat_blocked_vm_bookingtimes; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.zat_blocked_vm_bookingtimes (
    _id text NOT NULL,
    "Created By" text NOT NULL,
    "Created Date" timestamp with time zone NOT NULL,
    "Modified Date" timestamp with time zone NOT NULL,
    "blocked times by requests" jsonb NOT NULL,
    "blocked times by split lease" jsonb NOT NULL,
    "usability dates and times" jsonb NOT NULL,
    created_at timestamp with time zone DEFAULT now(),
    updated_at timestamp with time zone DEFAULT now(),
    pending boolean DEFAULT false
);


--
-- Name: TABLE zat_blocked_vm_bookingtimes; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON TABLE public.zat_blocked_vm_bookingtimes IS 'Bubble.io zat_blocked_vm_bookingtimes data - preserves original field names for sync';


--
-- Name: zat_features_amenity; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.zat_features_amenity (
    _id text NOT NULL,
    "Created By" text,
    "Created Date" timestamp with time zone NOT NULL,
    "Icon" text NOT NULL,
    "Modified Date" timestamp with time zone NOT NULL,
    "Name" text NOT NULL,
    "Slug" text,
    "Type - Amenity Categories" text,
    "User Created" text,
    "default show on view-split-lease?" boolean,
    "pre-set?" boolean,
    created_at timestamp with time zone DEFAULT now(),
    updated_at timestamp with time zone DEFAULT now(),
    pending boolean DEFAULT false
);


--
-- Name: TABLE zat_features_amenity; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON TABLE public.zat_features_amenity IS 'Bubble.io zat_features_amenity data - preserves original field names for sync';


--
-- Name: cancellation_reasons; Type: TABLE; Schema: reference_table; Owner: -
--

CREATE TABLE reference_table.cancellation_reasons (
    id bigint NOT NULL,
    user_type text NOT NULL,
    reason text NOT NULL,
    display_order integer DEFAULT 0 NOT NULL,
    is_active boolean DEFAULT true NOT NULL,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    CONSTRAINT cancellation_reasons_user_type_check CHECK ((user_type = ANY (ARRAY['guest'::text, 'host'::text])))
);


--
-- Name: TABLE cancellation_reasons; Type: COMMENT; Schema: reference_table; Owner: -
--

COMMENT ON TABLE reference_table.cancellation_reasons IS 'Proposal cancellation/rejection reason options for dropdown selection, segmented by user type (guest or host)';


--
-- Name: cancellation_reasons_id_seq; Type: SEQUENCE; Schema: reference_table; Owner: -
--

ALTER TABLE reference_table.cancellation_reasons ALTER COLUMN id ADD GENERATED ALWAYS AS IDENTITY (
    SEQUENCE NAME reference_table.cancellation_reasons_id_seq
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1
);


--
-- Name: os_admin_users; Type: TABLE; Schema: reference_table; Owner: -
--

CREATE TABLE reference_table.os_admin_users (
    id bigint NOT NULL,
    name text NOT NULL,
    display text NOT NULL,
    user_email text,
    active_code_to_access integer,
    created_at timestamp with time zone DEFAULT now()
);


--
-- Name: os_admin_users_id_seq; Type: SEQUENCE; Schema: reference_table; Owner: -
--

ALTER TABLE reference_table.os_admin_users ALTER COLUMN id ADD GENERATED BY DEFAULT AS IDENTITY (
    SEQUENCE NAME reference_table.os_admin_users_id_seq
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1
);


--
-- Name: os_ai_fields_house_manual; Type: TABLE; Schema: reference_table; Owner: -
--

CREATE TABLE reference_table.os_ai_fields_house_manual (
    id bigint NOT NULL,
    name text NOT NULL,
    display text NOT NULL,
    display_on_screen text,
    available_to_parse boolean DEFAULT true,
    parsing_instructions text,
    created_at timestamp with time zone DEFAULT now()
);


--
-- Name: os_ai_fields_house_manual_id_seq; Type: SEQUENCE; Schema: reference_table; Owner: -
--

ALTER TABLE reference_table.os_ai_fields_house_manual ALTER COLUMN id ADD GENERATED BY DEFAULT AS IDENTITY (
    SEQUENCE NAME reference_table.os_ai_fields_house_manual_id_seq
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1
);


--
-- Name: os_ai_fields_listing; Type: TABLE; Schema: reference_table; Owner: -
--

CREATE TABLE reference_table.os_ai_fields_listing (
    id bigint NOT NULL,
    name text NOT NULL,
    display text NOT NULL,
    display_on_screen text,
    created_at timestamp with time zone DEFAULT now()
);


--
-- Name: os_ai_fields_listing_id_seq; Type: SEQUENCE; Schema: reference_table; Owner: -
--

ALTER TABLE reference_table.os_ai_fields_listing ALTER COLUMN id ADD GENERATED BY DEFAULT AS IDENTITY (
    SEQUENCE NAME reference_table.os_ai_fields_listing_id_seq
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1
);


--
-- Name: os_alert_type; Type: TABLE; Schema: reference_table; Owner: -
--

CREATE TABLE reference_table.os_alert_type (
    id bigint NOT NULL,
    name text NOT NULL,
    display text NOT NULL,
    created_at timestamp with time zone DEFAULT now()
);


--
-- Name: os_alert_type_id_seq; Type: SEQUENCE; Schema: reference_table; Owner: -
--

ALTER TABLE reference_table.os_alert_type ALTER COLUMN id ADD GENERATED BY DEFAULT AS IDENTITY (
    SEQUENCE NAME reference_table.os_alert_type_id_seq
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1
);


--
-- Name: os_amenity_categories; Type: TABLE; Schema: reference_table; Owner: -
--

CREATE TABLE reference_table.os_amenity_categories (
    id bigint NOT NULL,
    name text NOT NULL,
    display text NOT NULL,
    created_at timestamp with time zone DEFAULT now()
);


--
-- Name: os_amenity_categories_id_seq; Type: SEQUENCE; Schema: reference_table; Owner: -
--

ALTER TABLE reference_table.os_amenity_categories ALTER COLUMN id ADD GENERATED BY DEFAULT AS IDENTITY (
    SEQUENCE NAME reference_table.os_amenity_categories_id_seq
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1
);


--
-- Name: os_bathrooms; Type: TABLE; Schema: reference_table; Owner: -
--

CREATE TABLE reference_table.os_bathrooms (
    id bigint NOT NULL,
    name text NOT NULL,
    display text NOT NULL,
    numeric_value numeric,
    created_at timestamp with time zone DEFAULT now()
);


--
-- Name: os_bathrooms_id_seq; Type: SEQUENCE; Schema: reference_table; Owner: -
--

ALTER TABLE reference_table.os_bathrooms ALTER COLUMN id ADD GENERATED BY DEFAULT AS IDENTITY (
    SEQUENCE NAME reference_table.os_bathrooms_id_seq
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1
);


--
-- Name: os_bedrooms; Type: TABLE; Schema: reference_table; Owner: -
--

CREATE TABLE reference_table.os_bedrooms (
    id bigint NOT NULL,
    name text NOT NULL,
    display text NOT NULL,
    display_on_dropdowns text,
    numeric_value integer,
    created_at timestamp with time zone DEFAULT now()
);


--
-- Name: os_bedrooms_id_seq; Type: SEQUENCE; Schema: reference_table; Owner: -
--

ALTER TABLE reference_table.os_bedrooms ALTER COLUMN id ADD GENERATED BY DEFAULT AS IDENTITY (
    SEQUENCE NAME reference_table.os_bedrooms_id_seq
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1
);


--
-- Name: os_beds; Type: TABLE; Schema: reference_table; Owner: -
--

CREATE TABLE reference_table.os_beds (
    id bigint NOT NULL,
    name text NOT NULL,
    display text NOT NULL,
    numeric_value integer,
    created_at timestamp with time zone DEFAULT now()
);


--
-- Name: os_beds_id_seq; Type: SEQUENCE; Schema: reference_table; Owner: -
--

ALTER TABLE reference_table.os_beds ALTER COLUMN id ADD GENERATED BY DEFAULT AS IDENTITY (
    SEQUENCE NAME reference_table.os_beds_id_seq
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1
);


--
-- Name: os_categories_guest_user_reviews; Type: TABLE; Schema: reference_table; Owner: -
--

CREATE TABLE reference_table.os_categories_guest_user_reviews (
    id bigint NOT NULL,
    name text NOT NULL,
    display text NOT NULL,
    created_at timestamp with time zone DEFAULT now()
);


--
-- Name: os_categories_guest_user_reviews_id_seq; Type: SEQUENCE; Schema: reference_table; Owner: -
--

ALTER TABLE reference_table.os_categories_guest_user_reviews ALTER COLUMN id ADD GENERATED BY DEFAULT AS IDENTITY (
    SEQUENCE NAME reference_table.os_categories_guest_user_reviews_id_seq
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1
);


--
-- Name: os_categories_house_manual_reviews; Type: TABLE; Schema: reference_table; Owner: -
--

CREATE TABLE reference_table.os_categories_house_manual_reviews (
    id bigint NOT NULL,
    name text NOT NULL,
    display text NOT NULL,
    display_for_user text,
    created_at timestamp with time zone DEFAULT now()
);


--
-- Name: os_categories_house_manual_reviews_id_seq; Type: SEQUENCE; Schema: reference_table; Owner: -
--

ALTER TABLE reference_table.os_categories_house_manual_reviews ALTER COLUMN id ADD GENERATED BY DEFAULT AS IDENTITY (
    SEQUENCE NAME reference_table.os_categories_house_manual_reviews_id_seq
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1
);


--
-- Name: os_categories_listings_reviews; Type: TABLE; Schema: reference_table; Owner: -
--

CREATE TABLE reference_table.os_categories_listings_reviews (
    id bigint NOT NULL,
    name text NOT NULL,
    display text NOT NULL,
    created_at timestamp with time zone DEFAULT now()
);


--
-- Name: os_categories_listings_reviews_id_seq; Type: SEQUENCE; Schema: reference_table; Owner: -
--

ALTER TABLE reference_table.os_categories_listings_reviews ALTER COLUMN id ADD GENERATED BY DEFAULT AS IDENTITY (
    SEQUENCE NAME reference_table.os_categories_listings_reviews_id_seq
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1
);


--
-- Name: os_categories_stays_reviews; Type: TABLE; Schema: reference_table; Owner: -
--

CREATE TABLE reference_table.os_categories_stays_reviews (
    id bigint NOT NULL,
    name text NOT NULL,
    display text NOT NULL,
    display_for_user text,
    created_at timestamp with time zone DEFAULT now()
);


--
-- Name: os_categories_stays_reviews_id_seq; Type: SEQUENCE; Schema: reference_table; Owner: -
--

ALTER TABLE reference_table.os_categories_stays_reviews ALTER COLUMN id ADD GENERATED BY DEFAULT AS IDENTITY (
    SEQUENCE NAME reference_table.os_categories_stays_reviews_id_seq
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1
);


--
-- Name: os_chatgpt_models; Type: TABLE; Schema: reference_table; Owner: -
--

CREATE TABLE reference_table.os_chatgpt_models (
    id bigint NOT NULL,
    name text NOT NULL,
    display text NOT NULL,
    model_name text,
    max_completion_tokens integer,
    created_at timestamp with time zone DEFAULT now()
);


--
-- Name: os_chatgpt_models_id_seq; Type: SEQUENCE; Schema: reference_table; Owner: -
--

ALTER TABLE reference_table.os_chatgpt_models ALTER COLUMN id ADD GENERATED BY DEFAULT AS IDENTITY (
    SEQUENCE NAME reference_table.os_chatgpt_models_id_seq
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1
);


--
-- Name: os_check_in_out_times; Type: TABLE; Schema: reference_table; Owner: -
--

CREATE TABLE reference_table.os_check_in_out_times (
    id bigint NOT NULL,
    name text NOT NULL,
    display text NOT NULL,
    is_check_in boolean DEFAULT false,
    is_check_out boolean DEFAULT false,
    time_value time without time zone,
    created_at timestamp with time zone DEFAULT now()
);


--
-- Name: os_check_in_out_times_id_seq; Type: SEQUENCE; Schema: reference_table; Owner: -
--

ALTER TABLE reference_table.os_check_in_out_times ALTER COLUMN id ADD GENERATED BY DEFAULT AS IDENTITY (
    SEQUENCE NAME reference_table.os_check_in_out_times_id_seq
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1
);


--
-- Name: os_co_host_status; Type: TABLE; Schema: reference_table; Owner: -
--

CREATE TABLE reference_table.os_co_host_status (
    id bigint NOT NULL,
    name text NOT NULL,
    display text NOT NULL,
    usual_order integer,
    created_at timestamp with time zone DEFAULT now()
);


--
-- Name: os_co_host_status_id_seq; Type: SEQUENCE; Schema: reference_table; Owner: -
--

ALTER TABLE reference_table.os_co_host_status ALTER COLUMN id ADD GENERATED BY DEFAULT AS IDENTITY (
    SEQUENCE NAME reference_table.os_co_host_status_id_seq
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1
);


--
-- Name: os_cohost_admins; Type: TABLE; Schema: reference_table; Owner: -
--

CREATE TABLE reference_table.os_cohost_admins (
    id bigint NOT NULL,
    name text NOT NULL,
    display text NOT NULL,
    email text,
    direct_message_email text,
    picture_url text,
    qualifications text,
    created_at timestamp with time zone DEFAULT now()
);


--
-- Name: os_cohost_admins_id_seq; Type: SEQUENCE; Schema: reference_table; Owner: -
--

ALTER TABLE reference_table.os_cohost_admins ALTER COLUMN id ADD GENERATED BY DEFAULT AS IDENTITY (
    SEQUENCE NAME reference_table.os_cohost_admins_id_seq
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1
);


--
-- Name: os_color_palette; Type: TABLE; Schema: reference_table; Owner: -
--

CREATE TABLE reference_table.os_color_palette (
    id bigint NOT NULL,
    name text NOT NULL,
    display text NOT NULL,
    color_set text NOT NULL,
    hex text NOT NULL,
    created_at timestamp with time zone DEFAULT now()
);


--
-- Name: os_color_palette_id_seq; Type: SEQUENCE; Schema: reference_table; Owner: -
--

ALTER TABLE reference_table.os_color_palette ALTER COLUMN id ADD GENERATED BY DEFAULT AS IDENTITY (
    SEQUENCE NAME reference_table.os_color_palette_id_seq
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1
);


--
-- Name: os_communication_preference; Type: TABLE; Schema: reference_table; Owner: -
--

CREATE TABLE reference_table.os_communication_preference (
    id bigint NOT NULL,
    name text NOT NULL,
    display text NOT NULL,
    preference text,
    created_at timestamp with time zone DEFAULT now()
);


--
-- Name: os_communication_preference_id_seq; Type: SEQUENCE; Schema: reference_table; Owner: -
--

ALTER TABLE reference_table.os_communication_preference ALTER COLUMN id ADD GENERATED BY DEFAULT AS IDENTITY (
    SEQUENCE NAME reference_table.os_communication_preference_id_seq
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1
);


--
-- Name: os_date_change_request_status; Type: TABLE; Schema: reference_table; Owner: -
--

CREATE TABLE reference_table.os_date_change_request_status (
    id bigint NOT NULL,
    name text NOT NULL,
    display text NOT NULL,
    created_at timestamp with time zone DEFAULT now()
);


--
-- Name: os_date_change_request_status_id_seq; Type: SEQUENCE; Schema: reference_table; Owner: -
--

ALTER TABLE reference_table.os_date_change_request_status ALTER COLUMN id ADD GENERATED BY DEFAULT AS IDENTITY (
    SEQUENCE NAME reference_table.os_date_change_request_status_id_seq
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1
);


--
-- Name: os_days; Type: TABLE; Schema: reference_table; Owner: -
--

CREATE TABLE reference_table.os_days (
    id bigint NOT NULL,
    name text NOT NULL,
    display text NOT NULL,
    bubble_number_text text,
    first_3_letters text,
    single_letter text,
    created_at timestamp with time zone DEFAULT now()
);


--
-- Name: os_days_id_seq; Type: SEQUENCE; Schema: reference_table; Owner: -
--

ALTER TABLE reference_table.os_days ALTER COLUMN id ADD GENERATED BY DEFAULT AS IDENTITY (
    SEQUENCE NAME reference_table.os_days_id_seq
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1
);


--
-- Name: os_faq_type; Type: TABLE; Schema: reference_table; Owner: -
--

CREATE TABLE reference_table.os_faq_type (
    id bigint NOT NULL,
    name text NOT NULL,
    display text NOT NULL,
    faq_page_display text,
    created_at timestamp with time zone DEFAULT now()
);


--
-- Name: os_faq_type_id_seq; Type: SEQUENCE; Schema: reference_table; Owner: -
--

ALTER TABLE reference_table.os_faq_type ALTER COLUMN id ADD GENERATED BY DEFAULT AS IDENTITY (
    SEQUENCE NAME reference_table.os_faq_type_id_seq
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1
);


--
-- Name: os_gender_type; Type: TABLE; Schema: reference_table; Owner: -
--

CREATE TABLE reference_table.os_gender_type (
    id bigint NOT NULL,
    name text NOT NULL,
    display text NOT NULL,
    description text,
    created_at timestamp with time zone DEFAULT now()
);


--
-- Name: os_gender_type_id_seq; Type: SEQUENCE; Schema: reference_table; Owner: -
--

ALTER TABLE reference_table.os_gender_type ALTER COLUMN id ADD GENERATED BY DEFAULT AS IDENTITY (
    SEQUENCE NAME reference_table.os_gender_type_id_seq
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1
);


--
-- Name: os_house_manual_audiences; Type: TABLE; Schema: reference_table; Owner: -
--

CREATE TABLE reference_table.os_house_manual_audiences (
    id bigint NOT NULL,
    name text NOT NULL,
    display text NOT NULL,
    display_on_guest_house_manual_page text,
    guidelines_1_display text,
    guidelines_1_ghm_display text,
    guidelines_2_display text,
    guidelines_2_ghm_display text,
    short_text_for_url text,
    animated_picture_url text,
    created_at timestamp with time zone DEFAULT now()
);


--
-- Name: os_house_manual_audiences_id_seq; Type: SEQUENCE; Schema: reference_table; Owner: -
--

ALTER TABLE reference_table.os_house_manual_audiences ALTER COLUMN id ADD GENERATED BY DEFAULT AS IDENTITY (
    SEQUENCE NAME reference_table.os_house_manual_audiences_id_seq
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1
);


--
-- Name: os_ideal_split_preference; Type: TABLE; Schema: reference_table; Owner: -
--

CREATE TABLE reference_table.os_ideal_split_preference (
    id bigint NOT NULL,
    name text NOT NULL,
    display text NOT NULL,
    created_at timestamp with time zone DEFAULT now()
);


--
-- Name: os_ideal_split_preference_id_seq; Type: SEQUENCE; Schema: reference_table; Owner: -
--

ALTER TABLE reference_table.os_ideal_split_preference ALTER COLUMN id ADD GENERATED BY DEFAULT AS IDENTITY (
    SEQUENCE NAME reference_table.os_ideal_split_preference_id_seq
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1
);


--
-- Name: os_images; Type: TABLE; Schema: reference_table; Owner: -
--

CREATE TABLE reference_table.os_images (
    id bigint NOT NULL,
    name text NOT NULL,
    display text NOT NULL,
    image_url text,
    image_2_url text,
    image_3_url text,
    image_4_url text,
    image_5_url text,
    image_6_url text,
    logo_large_url text,
    logo_small_url text,
    created_at timestamp with time zone DEFAULT now()
);


--
-- Name: os_images_id_seq; Type: SEQUENCE; Schema: reference_table; Owner: -
--

ALTER TABLE reference_table.os_images ALTER COLUMN id ADD GENERATED BY DEFAULT AS IDENTITY (
    SEQUENCE NAME reference_table.os_images_id_seq
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1
);


--
-- Name: os_important_errors; Type: TABLE; Schema: reference_table; Owner: -
--

CREATE TABLE reference_table.os_important_errors (
    id bigint NOT NULL,
    name text NOT NULL,
    display text NOT NULL,
    created_at timestamp with time zone DEFAULT now()
);


--
-- Name: os_important_errors_id_seq; Type: SEQUENCE; Schema: reference_table; Owner: -
--

ALTER TABLE reference_table.os_important_errors ALTER COLUMN id ADD GENERATED BY DEFAULT AS IDENTITY (
    SEQUENCE NAME reference_table.os_important_errors_id_seq
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1
);


--
-- Name: os_jingles; Type: TABLE; Schema: reference_table; Owner: -
--

CREATE TABLE reference_table.os_jingles (
    id bigint NOT NULL,
    name text NOT NULL,
    display text NOT NULL,
    audio_file text,
    created_at timestamp with time zone DEFAULT now()
);


--
-- Name: os_jingles_id_seq; Type: SEQUENCE; Schema: reference_table; Owner: -
--

ALTER TABLE reference_table.os_jingles ALTER COLUMN id ADD GENERATED BY DEFAULT AS IDENTITY (
    SEQUENCE NAME reference_table.os_jingles_id_seq
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1
);


--
-- Name: os_kitchen_type; Type: TABLE; Schema: reference_table; Owner: -
--

CREATE TABLE reference_table.os_kitchen_type (
    id bigint NOT NULL,
    name text NOT NULL,
    display text NOT NULL,
    created_at timestamp with time zone DEFAULT now()
);


--
-- Name: os_kitchen_type_id_seq; Type: SEQUENCE; Schema: reference_table; Owner: -
--

ALTER TABLE reference_table.os_kitchen_type ALTER COLUMN id ADD GENERATED BY DEFAULT AS IDENTITY (
    SEQUENCE NAME reference_table.os_kitchen_type_id_seq
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1
);


--
-- Name: os_language; Type: TABLE; Schema: reference_table; Owner: -
--

CREATE TABLE reference_table.os_language (
    id bigint NOT NULL,
    name text NOT NULL,
    display text NOT NULL,
    iso_code_2 text,
    iso_code_4 text,
    flag_filename text,
    house_manual_created boolean DEFAULT false,
    created_at timestamp with time zone DEFAULT now()
);


--
-- Name: os_language_id_seq; Type: SEQUENCE; Schema: reference_table; Owner: -
--

ALTER TABLE reference_table.os_language ALTER COLUMN id ADD GENERATED BY DEFAULT AS IDENTITY (
    SEQUENCE NAME reference_table.os_language_id_seq
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1
);


--
-- Name: os_lease_status; Type: TABLE; Schema: reference_table; Owner: -
--

CREATE TABLE reference_table.os_lease_status (
    id bigint NOT NULL,
    name text NOT NULL,
    display text NOT NULL,
    usual_order integer,
    created_at timestamp with time zone DEFAULT now()
);


--
-- Name: os_lease_status_id_seq; Type: SEQUENCE; Schema: reference_table; Owner: -
--

ALTER TABLE reference_table.os_lease_status ALTER COLUMN id ADD GENERATED BY DEFAULT AS IDENTITY (
    SEQUENCE NAME reference_table.os_lease_status_id_seq
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1
);


--
-- Name: os_legal_page_type; Type: TABLE; Schema: reference_table; Owner: -
--

CREATE TABLE reference_table.os_legal_page_type (
    id bigint NOT NULL,
    name text NOT NULL,
    display text NOT NULL,
    created_at timestamp with time zone DEFAULT now()
);


--
-- Name: os_legal_page_type_id_seq; Type: SEQUENCE; Schema: reference_table; Owner: -
--

ALTER TABLE reference_table.os_legal_page_type ALTER COLUMN id ADD GENERATED BY DEFAULT AS IDENTITY (
    SEQUENCE NAME reference_table.os_legal_page_type_id_seq
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1
);


--
-- Name: os_listing_photo_type; Type: TABLE; Schema: reference_table; Owner: -
--

CREATE TABLE reference_table.os_listing_photo_type (
    id bigint NOT NULL,
    name text NOT NULL,
    display text NOT NULL,
    created_at timestamp with time zone DEFAULT now()
);


--
-- Name: os_listing_photo_type_id_seq; Type: SEQUENCE; Schema: reference_table; Owner: -
--

ALTER TABLE reference_table.os_listing_photo_type ALTER COLUMN id ADD GENERATED BY DEFAULT AS IDENTITY (
    SEQUENCE NAME reference_table.os_listing_photo_type_id_seq
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1
);


--
-- Name: os_logos; Type: TABLE; Schema: reference_table; Owner: -
--

CREATE TABLE reference_table.os_logos (
    id bigint NOT NULL,
    name text NOT NULL,
    display text NOT NULL,
    image_url text NOT NULL,
    created_at timestamp with time zone DEFAULT now()
);


--
-- Name: os_logos_id_seq; Type: SEQUENCE; Schema: reference_table; Owner: -
--

ALTER TABLE reference_table.os_logos ALTER COLUMN id ADD GENERATED BY DEFAULT AS IDENTITY (
    SEQUENCE NAME reference_table.os_logos_id_seq
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1
);


--
-- Name: os_melodies; Type: TABLE; Schema: reference_table; Owner: -
--

CREATE TABLE reference_table.os_melodies (
    id bigint NOT NULL,
    name text NOT NULL,
    display text NOT NULL,
    audio_url text,
    created_at timestamp with time zone DEFAULT now()
);


--
-- Name: os_melodies_id_seq; Type: SEQUENCE; Schema: reference_table; Owner: -
--

ALTER TABLE reference_table.os_melodies ALTER COLUMN id ADD GENERATED BY DEFAULT AS IDENTITY (
    SEQUENCE NAME reference_table.os_melodies_id_seq
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1
);


--
-- Name: os_messaging_cta; Type: TABLE; Schema: reference_table; Owner: -
--

CREATE TABLE reference_table.os_messaging_cta (
    id bigint NOT NULL,
    name text NOT NULL,
    display text NOT NULL,
    button_text text,
    message text,
    is_proposal_cta boolean DEFAULT false,
    is_lease_cta boolean DEFAULT false,
    is_review_cta boolean DEFAULT false,
    is_house_manual_cta boolean DEFAULT false,
    visible_to_guest_only boolean DEFAULT false,
    visible_to_host_only boolean DEFAULT false,
    created_at timestamp with time zone DEFAULT now()
);


--
-- Name: os_messaging_cta_id_seq; Type: SEQUENCE; Schema: reference_table; Owner: -
--

ALTER TABLE reference_table.os_messaging_cta ALTER COLUMN id ADD GENERATED BY DEFAULT AS IDENTITY (
    SEQUENCE NAME reference_table.os_messaging_cta_id_seq
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1
);


--
-- Name: os_modality; Type: TABLE; Schema: reference_table; Owner: -
--

CREATE TABLE reference_table.os_modality (
    id bigint NOT NULL,
    name text NOT NULL,
    display text NOT NULL,
    created_at timestamp with time zone DEFAULT now()
);


--
-- Name: os_modality_id_seq; Type: SEQUENCE; Schema: reference_table; Owner: -
--

ALTER TABLE reference_table.os_modality ALTER COLUMN id ADD GENERATED BY DEFAULT AS IDENTITY (
    SEQUENCE NAME reference_table.os_modality_id_seq
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1
);


--
-- Name: os_multi_message_status; Type: TABLE; Schema: reference_table; Owner: -
--

CREATE TABLE reference_table.os_multi_message_status (
    id bigint NOT NULL,
    name text NOT NULL,
    display text NOT NULL,
    created_at timestamp with time zone DEFAULT now()
);


--
-- Name: os_multi_message_status_id_seq; Type: SEQUENCE; Schema: reference_table; Owner: -
--

ALTER TABLE reference_table.os_multi_message_status ALTER COLUMN id ADD GENERATED BY DEFAULT AS IDENTITY (
    SEQUENCE NAME reference_table.os_multi_message_status_id_seq
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1
);


--
-- Name: os_name_mapping; Type: TABLE; Schema: reference_table; Owner: -
--

CREATE TABLE reference_table.os_name_mapping (
    id bigint NOT NULL,
    bubble_name text NOT NULL,
    supabase_table_name text NOT NULL,
    description text,
    created_at timestamp with time zone DEFAULT now()
);


--
-- Name: os_name_mapping_id_seq; Type: SEQUENCE; Schema: reference_table; Owner: -
--

ALTER TABLE reference_table.os_name_mapping ALTER COLUMN id ADD GENERATED BY DEFAULT AS IDENTITY (
    SEQUENCE NAME reference_table.os_name_mapping_id_seq
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1
);


--
-- Name: os_narrators; Type: TABLE; Schema: reference_table; Owner: -
--

CREATE TABLE reference_table.os_narrators (
    id bigint NOT NULL,
    name text NOT NULL,
    display text NOT NULL,
    audio_file text,
    audio_demo_file text,
    demo_text text,
    flag_image text,
    language text,
    model_id text,
    model_version text,
    narrator_picture text,
    playht_id text,
    waiting_text text,
    created_at timestamp with time zone DEFAULT now()
);


--
-- Name: os_narrators_id_seq; Type: SEQUENCE; Schema: reference_table; Owner: -
--

ALTER TABLE reference_table.os_narrators ALTER COLUMN id ADD GENERATED BY DEFAULT AS IDENTITY (
    SEQUENCE NAME reference_table.os_narrators_id_seq
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1
);


--
-- Name: os_nights; Type: TABLE; Schema: reference_table; Owner: -
--

CREATE TABLE reference_table.os_nights (
    id bigint NOT NULL,
    name text NOT NULL,
    display text NOT NULL,
    bubble_number_text text,
    first_3_letters text,
    single_letter text,
    created_at timestamp with time zone DEFAULT now()
);


--
-- Name: os_nights_id_seq; Type: SEQUENCE; Schema: reference_table; Owner: -
--

ALTER TABLE reference_table.os_nights ALTER COLUMN id ADD GENERATED BY DEFAULT AS IDENTITY (
    SEQUENCE NAME reference_table.os_nights_id_seq
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1
);


--
-- Name: os_pages; Type: TABLE; Schema: reference_table; Owner: -
--

CREATE TABLE reference_table.os_pages (
    id bigint NOT NULL,
    name text NOT NULL,
    display text NOT NULL,
    user_friendly_display text,
    has_mobile_version boolean DEFAULT false,
    user_type_page text,
    created_at timestamp with time zone DEFAULT now()
);


--
-- Name: os_pages_id_seq; Type: SEQUENCE; Schema: reference_table; Owner: -
--

ALTER TABLE reference_table.os_pages ALTER COLUMN id ADD GENERATED BY DEFAULT AS IDENTITY (
    SEQUENCE NAME reference_table.os_pages_id_seq
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1
);


--
-- Name: os_personas; Type: TABLE; Schema: reference_table; Owner: -
--

CREATE TABLE reference_table.os_personas (
    id bigint NOT NULL,
    name text NOT NULL,
    display text NOT NULL,
    created_at timestamp with time zone DEFAULT now()
);


--
-- Name: os_personas_id_seq; Type: SEQUENCE; Schema: reference_table; Owner: -
--

ALTER TABLE reference_table.os_personas ALTER COLUMN id ADD GENERATED BY DEFAULT AS IDENTITY (
    SEQUENCE NAME reference_table.os_personas_id_seq
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1
);


--
-- Name: os_photo_evidence_type; Type: TABLE; Schema: reference_table; Owner: -
--

CREATE TABLE reference_table.os_photo_evidence_type (
    id bigint NOT NULL,
    name text NOT NULL,
    display text NOT NULL,
    created_at timestamp with time zone DEFAULT now()
);


--
-- Name: os_photo_evidence_type_id_seq; Type: SEQUENCE; Schema: reference_table; Owner: -
--

ALTER TABLE reference_table.os_photo_evidence_type ALTER COLUMN id ADD GENERATED BY DEFAULT AS IDENTITY (
    SEQUENCE NAME reference_table.os_photo_evidence_type_id_seq
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1
);


--
-- Name: os_postmark_webhook; Type: TABLE; Schema: reference_table; Owner: -
--

CREATE TABLE reference_table.os_postmark_webhook (
    id bigint NOT NULL,
    name text NOT NULL,
    display text NOT NULL,
    created_at timestamp with time zone DEFAULT now()
);


--
-- Name: os_postmark_webhook_id_seq; Type: SEQUENCE; Schema: reference_table; Owner: -
--

ALTER TABLE reference_table.os_postmark_webhook ALTER COLUMN id ADD GENERATED BY DEFAULT AS IDENTITY (
    SEQUENCE NAME reference_table.os_postmark_webhook_id_seq
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1
);


--
-- Name: os_price_filter; Type: TABLE; Schema: reference_table; Owner: -
--

CREATE TABLE reference_table.os_price_filter (
    id bigint NOT NULL,
    name text NOT NULL,
    display text NOT NULL,
    price_min integer,
    price_max integer,
    created_at timestamp with time zone DEFAULT now()
);


--
-- Name: os_price_filter_id_seq; Type: SEQUENCE; Schema: reference_table; Owner: -
--

ALTER TABLE reference_table.os_price_filter ALTER COLUMN id ADD GENERATED BY DEFAULT AS IDENTITY (
    SEQUENCE NAME reference_table.os_price_filter_id_seq
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1
);


--
-- Name: os_prompts; Type: TABLE; Schema: reference_table; Owner: -
--

CREATE TABLE reference_table.os_prompts (
    id bigint NOT NULL,
    name text NOT NULL,
    display text NOT NULL,
    prompt text,
    created_at timestamp with time zone DEFAULT now()
);


--
-- Name: os_prompts_id_seq; Type: SEQUENCE; Schema: reference_table; Owner: -
--

ALTER TABLE reference_table.os_prompts ALTER COLUMN id ADD GENERATED BY DEFAULT AS IDENTITY (
    SEQUENCE NAME reference_table.os_prompts_id_seq
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1
);


--
-- Name: os_proposal_status; Type: TABLE; Schema: reference_table; Owner: -
--

CREATE TABLE reference_table.os_proposal_status (
    id bigint NOT NULL,
    name text NOT NULL,
    display text NOT NULL,
    displayed_on_screen text,
    guest_action_1 text,
    guest_action_2 text,
    host_action_1 text,
    host_action_2 text,
    sort_order integer DEFAULT 0,
    created_at timestamp with time zone DEFAULT now()
);


--
-- Name: os_proxy_sms_channels; Type: TABLE; Schema: reference_table; Owner: -
--

CREATE TABLE reference_table.os_proxy_sms_channels (
    id bigint NOT NULL,
    name text NOT NULL,
    display text NOT NULL,
    phone_number text NOT NULL,
    phone_number_with_plus1 text NOT NULL,
    created_at timestamp with time zone DEFAULT now()
);


--
-- Name: os_proxy_sms_channels_id_seq; Type: SEQUENCE; Schema: reference_table; Owner: -
--

ALTER TABLE reference_table.os_proxy_sms_channels ALTER COLUMN id ADD GENERATED BY DEFAULT AS IDENTITY (
    SEQUENCE NAME reference_table.os_proxy_sms_channels_id_seq
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1
);


--
-- Name: os_qr_code_use_cases; Type: TABLE; Schema: reference_table; Owner: -
--

CREATE TABLE reference_table.os_qr_code_use_cases (
    id bigint NOT NULL,
    name text NOT NULL,
    display text NOT NULL,
    description text,
    functions text,
    created_at timestamp with time zone DEFAULT now()
);


--
-- Name: os_qr_code_use_cases_id_seq; Type: SEQUENCE; Schema: reference_table; Owner: -
--

ALTER TABLE reference_table.os_qr_code_use_cases ALTER COLUMN id ADD GENERATED BY DEFAULT AS IDENTITY (
    SEQUENCE NAME reference_table.os_qr_code_use_cases_id_seq
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1
);


--
-- Name: os_qty_guests; Type: TABLE; Schema: reference_table; Owner: -
--

CREATE TABLE reference_table.os_qty_guests (
    id bigint NOT NULL,
    name text NOT NULL,
    display text NOT NULL,
    numeric_value integer,
    created_at timestamp with time zone DEFAULT now()
);


--
-- Name: os_qty_guests_id_seq; Type: SEQUENCE; Schema: reference_table; Owner: -
--

ALTER TABLE reference_table.os_qty_guests ALTER COLUMN id ADD GENERATED BY DEFAULT AS IDENTITY (
    SEQUENCE NAME reference_table.os_qty_guests_id_seq
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1
);


--
-- Name: os_receipt; Type: TABLE; Schema: reference_table; Owner: -
--

CREATE TABLE reference_table.os_receipt (
    id bigint NOT NULL,
    name text NOT NULL,
    display text NOT NULL,
    image_url text,
    created_at timestamp with time zone DEFAULT now()
);


--
-- Name: os_receipt_id_seq; Type: SEQUENCE; Schema: reference_table; Owner: -
--

ALTER TABLE reference_table.os_receipt ALTER COLUMN id ADD GENERATED BY DEFAULT AS IDENTITY (
    SEQUENCE NAME reference_table.os_receipt_id_seq
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1
);


--
-- Name: os_referral_contact_methods; Type: TABLE; Schema: reference_table; Owner: -
--

CREATE TABLE reference_table.os_referral_contact_methods (
    id bigint NOT NULL,
    name text NOT NULL,
    display text NOT NULL,
    logged_out_okay boolean DEFAULT false,
    created_at timestamp with time zone DEFAULT now()
);


--
-- Name: os_referral_contact_methods_id_seq; Type: SEQUENCE; Schema: reference_table; Owner: -
--

ALTER TABLE reference_table.os_referral_contact_methods ALTER COLUMN id ADD GENERATED BY DEFAULT AS IDENTITY (
    SEQUENCE NAME reference_table.os_referral_contact_methods_id_seq
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1
);


--
-- Name: os_reminder_type; Type: TABLE; Schema: reference_table; Owner: -
--

CREATE TABLE reference_table.os_reminder_type (
    id bigint NOT NULL,
    name text NOT NULL,
    display text NOT NULL,
    template text,
    backup_template text,
    created_at timestamp with time zone DEFAULT now()
);


--
-- Name: os_reminder_type_id_seq; Type: SEQUENCE; Schema: reference_table; Owner: -
--

ALTER TABLE reference_table.os_reminder_type ALTER COLUMN id ADD GENERATED BY DEFAULT AS IDENTITY (
    SEQUENCE NAME reference_table.os_reminder_type_id_seq
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1
);


--
-- Name: os_rental_type; Type: TABLE; Schema: reference_table; Owner: -
--

CREATE TABLE reference_table.os_rental_type (
    id bigint NOT NULL,
    name text NOT NULL,
    display text NOT NULL,
    display_per_period text,
    first_selection_idea text,
    radio_button_text text,
    created_at timestamp with time zone DEFAULT now()
);


--
-- Name: os_rental_type_id_seq; Type: SEQUENCE; Schema: reference_table; Owner: -
--

ALTER TABLE reference_table.os_rental_type ALTER COLUMN id ADD GENERATED BY DEFAULT AS IDENTITY (
    SEQUENCE NAME reference_table.os_rental_type_id_seq
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1
);


--
-- Name: os_review_guest_questions; Type: TABLE; Schema: reference_table; Owner: -
--

CREATE TABLE reference_table.os_review_guest_questions (
    id bigint NOT NULL,
    name text NOT NULL,
    display text NOT NULL,
    order_number integer,
    question text,
    question_subtext text,
    rating_subtext_1 text,
    rating_subtext_2 text,
    required boolean DEFAULT false,
    created_at timestamp with time zone DEFAULT now()
);


--
-- Name: os_review_guest_questions_id_seq; Type: SEQUENCE; Schema: reference_table; Owner: -
--

ALTER TABLE reference_table.os_review_guest_questions ALTER COLUMN id ADD GENERATED BY DEFAULT AS IDENTITY (
    SEQUENCE NAME reference_table.os_review_guest_questions_id_seq
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1
);


--
-- Name: os_review_host_questions; Type: TABLE; Schema: reference_table; Owner: -
--

CREATE TABLE reference_table.os_review_host_questions (
    id bigint NOT NULL,
    name text NOT NULL,
    display text NOT NULL,
    order_number integer,
    question text,
    question_subtext text,
    rating_subtext_1 text,
    rating_subtext_2 text,
    required boolean DEFAULT false,
    created_at timestamp with time zone DEFAULT now()
);


--
-- Name: os_review_host_questions_id_seq; Type: SEQUENCE; Schema: reference_table; Owner: -
--

ALTER TABLE reference_table.os_review_host_questions ALTER COLUMN id ADD GENERATED BY DEFAULT AS IDENTITY (
    SEQUENCE NAME reference_table.os_review_host_questions_id_seq
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1
);


--
-- Name: os_review_type; Type: TABLE; Schema: reference_table; Owner: -
--

CREATE TABLE reference_table.os_review_type (
    id bigint NOT NULL,
    name text NOT NULL,
    display text NOT NULL,
    is_external boolean DEFAULT false,
    created_at timestamp with time zone DEFAULT now()
);


--
-- Name: os_review_type_id_seq; Type: SEQUENCE; Schema: reference_table; Owner: -
--

ALTER TABLE reference_table.os_review_type ALTER COLUMN id ADD GENERATED BY DEFAULT AS IDENTITY (
    SEQUENCE NAME reference_table.os_review_type_id_seq
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1
);


--
-- Name: os_room_styles; Type: TABLE; Schema: reference_table; Owner: -
--

CREATE TABLE reference_table.os_room_styles (
    id bigint NOT NULL,
    name text NOT NULL,
    display text NOT NULL,
    image_sample_url text,
    created_at timestamp with time zone DEFAULT now()
);


--
-- Name: os_room_styles_id_seq; Type: SEQUENCE; Schema: reference_table; Owner: -
--

ALTER TABLE reference_table.os_room_styles ALTER COLUMN id ADD GENERATED BY DEFAULT AS IDENTITY (
    SEQUENCE NAME reference_table.os_room_styles_id_seq
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1
);


--
-- Name: os_roommates; Type: TABLE; Schema: reference_table; Owner: -
--

CREATE TABLE reference_table.os_roommates (
    id bigint NOT NULL,
    name text NOT NULL,
    display text NOT NULL,
    numeric_value integer,
    created_at timestamp with time zone DEFAULT now()
);


--
-- Name: os_roommates_id_seq; Type: SEQUENCE; Schema: reference_table; Owner: -
--

ALTER TABLE reference_table.os_roommates ALTER COLUMN id ADD GENERATED BY DEFAULT AS IDENTITY (
    SEQUENCE NAME reference_table.os_roommates_id_seq
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1
);


--
-- Name: os_schedule_selection_types; Type: TABLE; Schema: reference_table; Owner: -
--

CREATE TABLE reference_table.os_schedule_selection_types (
    id bigint NOT NULL,
    name text NOT NULL,
    display text NOT NULL,
    order_number integer,
    days jsonb,
    nights jsonb,
    created_at timestamp with time zone DEFAULT now()
);


--
-- Name: os_schedule_selection_types_id_seq; Type: SEQUENCE; Schema: reference_table; Owner: -
--

ALTER TABLE reference_table.os_schedule_selection_types ALTER COLUMN id ADD GENERATED BY DEFAULT AS IDENTITY (
    SEQUENCE NAME reference_table.os_schedule_selection_types_id_seq
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1
);


--
-- Name: os_screen_size; Type: TABLE; Schema: reference_table; Owner: -
--

CREATE TABLE reference_table.os_screen_size (
    id bigint NOT NULL,
    name text NOT NULL,
    display text NOT NULL,
    resolution_min_pxl integer,
    resolution_max_pxl integer,
    created_at timestamp with time zone DEFAULT now()
);


--
-- Name: os_screen_size_id_seq; Type: SEQUENCE; Schema: reference_table; Owner: -
--

ALTER TABLE reference_table.os_screen_size ALTER COLUMN id ADD GENERATED BY DEFAULT AS IDENTITY (
    SEQUENCE NAME reference_table.os_screen_size_id_seq
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1
);


--
-- Name: os_slack_channels; Type: TABLE; Schema: reference_table; Owner: -
--

CREATE TABLE reference_table.os_slack_channels (
    id bigint NOT NULL,
    name text NOT NULL,
    display text NOT NULL,
    email_address text,
    created_at timestamp with time zone DEFAULT now()
);


--
-- Name: os_slack_channels_id_seq; Type: SEQUENCE; Schema: reference_table; Owner: -
--

ALTER TABLE reference_table.os_slack_channels ALTER COLUMN id ADD GENERATED BY DEFAULT AS IDENTITY (
    SEQUENCE NAME reference_table.os_slack_channels_id_seq
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1
);


--
-- Name: os_slack_webhooks; Type: TABLE; Schema: reference_table; Owner: -
--

CREATE TABLE reference_table.os_slack_webhooks (
    id bigint NOT NULL,
    name text NOT NULL,
    display text NOT NULL,
    slack_channel text NOT NULL,
    webhook_url text NOT NULL,
    created_at timestamp with time zone DEFAULT now()
);


--
-- Name: os_slack_webhooks_id_seq; Type: SEQUENCE; Schema: reference_table; Owner: -
--

ALTER TABLE reference_table.os_slack_webhooks ALTER COLUMN id ADD GENERATED BY DEFAULT AS IDENTITY (
    SEQUENCE NAME reference_table.os_slack_webhooks_id_seq
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1
);


--
-- Name: os_sort_by_properties_search; Type: TABLE; Schema: reference_table; Owner: -
--

CREATE TABLE reference_table.os_sort_by_properties_search (
    id bigint NOT NULL,
    name text NOT NULL,
    display text NOT NULL,
    field_name text,
    descending boolean DEFAULT false,
    mobile_display text,
    created_at timestamp with time zone DEFAULT now()
);


--
-- Name: os_sort_by_properties_search_id_seq; Type: SEQUENCE; Schema: reference_table; Owner: -
--

ALTER TABLE reference_table.os_sort_by_properties_search ALTER COLUMN id ADD GENERATED BY DEFAULT AS IDENTITY (
    SEQUENCE NAME reference_table.os_sort_by_properties_search_id_seq
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1
);


--
-- Name: os_space_type; Type: TABLE; Schema: reference_table; Owner: -
--

CREATE TABLE reference_table.os_space_type (
    id bigint NOT NULL,
    name text NOT NULL,
    display text NOT NULL,
    description text,
    icon_url text,
    level_of_control integer,
    created_at timestamp with time zone DEFAULT now()
);


--
-- Name: os_space_type_id_seq; Type: SEQUENCE; Schema: reference_table; Owner: -
--

ALTER TABLE reference_table.os_space_type ALTER COLUMN id ADD GENERATED BY DEFAULT AS IDENTITY (
    SEQUENCE NAME reference_table.os_space_type_id_seq
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1
);


--
-- Name: os_split_lease_config; Type: TABLE; Schema: reference_table; Owner: -
--

CREATE TABLE reference_table.os_split_lease_config (
    id bigint NOT NULL,
    name text NOT NULL,
    display text NOT NULL,
    email text,
    phone_number text,
    phone_number_2 text,
    created_at timestamp with time zone DEFAULT now()
);


--
-- Name: os_split_lease_config_id_seq; Type: SEQUENCE; Schema: reference_table; Owner: -
--

ALTER TABLE reference_table.os_split_lease_config ALTER COLUMN id ADD GENERATED BY DEFAULT AS IDENTITY (
    SEQUENCE NAME reference_table.os_split_lease_config_id_seq
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1
);


--
-- Name: os_stay_periods; Type: TABLE; Schema: reference_table; Owner: -
--

CREATE TABLE reference_table.os_stay_periods (
    id bigint NOT NULL,
    name text NOT NULL,
    display text NOT NULL,
    days_in_period integer,
    weeks_in_period integer,
    months numeric,
    four_weeks_per_period numeric,
    negative_days integer,
    created_at timestamp with time zone DEFAULT now()
);


--
-- Name: os_stay_periods_id_seq; Type: SEQUENCE; Schema: reference_table; Owner: -
--

ALTER TABLE reference_table.os_stay_periods ALTER COLUMN id ADD GENERATED BY DEFAULT AS IDENTITY (
    SEQUENCE NAME reference_table.os_stay_periods_id_seq
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1
);


--
-- Name: os_stay_status; Type: TABLE; Schema: reference_table; Owner: -
--

CREATE TABLE reference_table.os_stay_status (
    id bigint NOT NULL,
    name text NOT NULL,
    display text NOT NULL,
    usual_order integer,
    created_at timestamp with time zone DEFAULT now()
);


--
-- Name: os_stay_status_id_seq; Type: SEQUENCE; Schema: reference_table; Owner: -
--

ALTER TABLE reference_table.os_stay_status ALTER COLUMN id ADD GENERATED BY DEFAULT AS IDENTITY (
    SEQUENCE NAME reference_table.os_stay_status_id_seq
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1
);


--
-- Name: os_storage_parking_type; Type: TABLE; Schema: reference_table; Owner: -
--

CREATE TABLE reference_table.os_storage_parking_type (
    id bigint NOT NULL,
    name text NOT NULL,
    display text NOT NULL,
    type text,
    summary_host text,
    summary_guest text,
    created_at timestamp with time zone DEFAULT now()
);


--
-- Name: os_storage_parking_type_id_seq; Type: SEQUENCE; Schema: reference_table; Owner: -
--

ALTER TABLE reference_table.os_storage_parking_type ALTER COLUMN id ADD GENERATED BY DEFAULT AS IDENTITY (
    SEQUENCE NAME reference_table.os_storage_parking_type_id_seq
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1
);


--
-- Name: os_task_load; Type: TABLE; Schema: reference_table; Owner: -
--

CREATE TABLE reference_table.os_task_load (
    id bigint NOT NULL,
    name text NOT NULL,
    display text NOT NULL,
    delay integer,
    created_at timestamp with time zone DEFAULT now()
);


--
-- Name: os_task_load_id_seq; Type: SEQUENCE; Schema: reference_table; Owner: -
--

ALTER TABLE reference_table.os_task_load ALTER COLUMN id ADD GENERATED BY DEFAULT AS IDENTITY (
    SEQUENCE NAME reference_table.os_task_load_id_seq
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1
);


--
-- Name: os_twilio_numbers; Type: TABLE; Schema: reference_table; Owner: -
--

CREATE TABLE reference_table.os_twilio_numbers (
    id bigint NOT NULL,
    name text NOT NULL,
    display text NOT NULL,
    description text,
    phone_number text,
    phone_number_international text,
    created_at timestamp with time zone DEFAULT now()
);


--
-- Name: os_twilio_numbers_id_seq; Type: SEQUENCE; Schema: reference_table; Owner: -
--

ALTER TABLE reference_table.os_twilio_numbers ALTER COLUMN id ADD GENERATED BY DEFAULT AS IDENTITY (
    SEQUENCE NAME reference_table.os_twilio_numbers_id_seq
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1
);


--
-- Name: os_ui_icons; Type: TABLE; Schema: reference_table; Owner: -
--

CREATE TABLE reference_table.os_ui_icons (
    id bigint NOT NULL,
    name text NOT NULL,
    display text NOT NULL,
    image_url text NOT NULL,
    created_at timestamp with time zone DEFAULT now()
);


--
-- Name: os_ui_icons_id_seq; Type: SEQUENCE; Schema: reference_table; Owner: -
--

ALTER TABLE reference_table.os_ui_icons ALTER COLUMN id ADD GENERATED BY DEFAULT AS IDENTITY (
    SEQUENCE NAME reference_table.os_ui_icons_id_seq
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1
);


--
-- Name: os_us_states; Type: TABLE; Schema: reference_table; Owner: -
--

CREATE TABLE reference_table.os_us_states (
    id bigint NOT NULL,
    name text NOT NULL,
    display text NOT NULL,
    abbreviation text NOT NULL,
    created_at timestamp with time zone DEFAULT now()
);


--
-- Name: os_us_states_id_seq; Type: SEQUENCE; Schema: reference_table; Owner: -
--

ALTER TABLE reference_table.os_us_states ALTER COLUMN id ADD GENERATED BY DEFAULT AS IDENTITY (
    SEQUENCE NAME reference_table.os_us_states_id_seq
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1
);


--
-- Name: os_user_subtype; Type: TABLE; Schema: reference_table; Owner: -
--

CREATE TABLE reference_table.os_user_subtype (
    id bigint NOT NULL,
    name text NOT NULL,
    display text NOT NULL,
    user_type text,
    created_at timestamp with time zone DEFAULT now()
);


--
-- Name: os_user_subtype_id_seq; Type: SEQUENCE; Schema: reference_table; Owner: -
--

ALTER TABLE reference_table.os_user_subtype ALTER COLUMN id ADD GENERATED BY DEFAULT AS IDENTITY (
    SEQUENCE NAME reference_table.os_user_subtype_id_seq
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1
);


--
-- Name: os_user_type; Type: TABLE; Schema: reference_table; Owner: -
--

CREATE TABLE reference_table.os_user_type (
    id bigint NOT NULL,
    name text NOT NULL,
    display text NOT NULL,
    alexa_name text,
    toggle_client_facing boolean,
    created_at timestamp with time zone DEFAULT now()
);


--
-- Name: os_user_type_id_seq; Type: SEQUENCE; Schema: reference_table; Owner: -
--

ALTER TABLE reference_table.os_user_type ALTER COLUMN id ADD GENERATED BY DEFAULT AS IDENTITY (
    SEQUENCE NAME reference_table.os_user_type_id_seq
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1
);


--
-- Name: os_video_animations; Type: TABLE; Schema: reference_table; Owner: -
--

CREATE TABLE reference_table.os_video_animations (
    id bigint NOT NULL,
    name text NOT NULL,
    display text NOT NULL,
    video_file text,
    created_at timestamp with time zone DEFAULT now()
);


--
-- Name: os_video_animations_id_seq; Type: SEQUENCE; Schema: reference_table; Owner: -
--

ALTER TABLE reference_table.os_video_animations ALTER COLUMN id ADD GENERATED BY DEFAULT AS IDENTITY (
    SEQUENCE NAME reference_table.os_video_animations_id_seq
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1
);


--
-- Name: os_virtual_meeting_times; Type: TABLE; Schema: reference_table; Owner: -
--

CREATE TABLE reference_table.os_virtual_meeting_times (
    id bigint NOT NULL,
    name text NOT NULL,
    display text NOT NULL,
    am_pm text,
    numeric_value integer,
    numeric_value_24h integer,
    created_at timestamp with time zone DEFAULT now()
);


--
-- Name: os_virtual_meeting_times_id_seq; Type: SEQUENCE; Schema: reference_table; Owner: -
--

ALTER TABLE reference_table.os_virtual_meeting_times ALTER COLUMN id ADD GENERATED BY DEFAULT AS IDENTITY (
    SEQUENCE NAME reference_table.os_virtual_meeting_times_id_seq
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1
);


--
-- Name: os_weekly_selection_options; Type: TABLE; Schema: reference_table; Owner: -
--

CREATE TABLE reference_table.os_weekly_selection_options (
    id bigint NOT NULL,
    name text NOT NULL,
    display text NOT NULL,
    display_mobile text,
    short_display text,
    period integer,
    num_weeks_during_4_calendar_weeks integer,
    shown_to_hosts boolean DEFAULT false,
    created_at timestamp with time zone DEFAULT now()
);


--
-- Name: os_weekly_selection_options_id_seq; Type: SEQUENCE; Schema: reference_table; Owner: -
--

ALTER TABLE reference_table.os_weekly_selection_options ALTER COLUMN id ADD GENERATED BY DEFAULT AS IDENTITY (
    SEQUENCE NAME reference_table.os_weekly_selection_options_id_seq
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1
);


--
-- Name: os_zep_curation_parameters; Type: TABLE; Schema: reference_table; Owner: -
--

CREATE TABLE reference_table.os_zep_curation_parameters (
    id bigint NOT NULL,
    name text NOT NULL,
    display text NOT NULL,
    index integer NOT NULL,
    weight numeric(3,1) NOT NULL,
    created_at timestamp with time zone DEFAULT now()
);


--
-- Name: os_zep_curation_parameters_id_seq; Type: SEQUENCE; Schema: reference_table; Owner: -
--

ALTER TABLE reference_table.os_zep_curation_parameters ALTER COLUMN id ADD GENERATED BY DEFAULT AS IDENTITY (
    SEQUENCE NAME reference_table.os_zep_curation_parameters_id_seq
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1
);


--
-- Name: proposal_statuses_id_seq; Type: SEQUENCE; Schema: reference_table; Owner: -
--

ALTER TABLE reference_table.os_proposal_status ALTER COLUMN id ADD GENERATED BY DEFAULT AS IDENTITY (
    SEQUENCE NAME reference_table.proposal_statuses_id_seq
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1
);


--
-- Name: zat_email_html_template_eg_sendbasicemailwf_; Type: TABLE; Schema: reference_table; Owner: -
--

CREATE TABLE reference_table.zat_email_html_template_eg_sendbasicemailwf_ (
    _id text NOT NULL,
    "Created By" text,
    "Created Date" timestamp with time zone NOT NULL,
    "Description" text,
    "Email Reference" text,
    "Email Template JSON" text NOT NULL,
    "Logo" text,
    "Modified Date" timestamp with time zone NOT NULL,
    "Name" text,
    created_at timestamp with time zone DEFAULT now(),
    updated_at timestamp with time zone DEFAULT now(),
    pending boolean DEFAULT false,
    "Placeholder" text[]
);


--
-- Name: TABLE zat_email_html_template_eg_sendbasicemailwf_; Type: COMMENT; Schema: reference_table; Owner: -
--

COMMENT ON TABLE reference_table.zat_email_html_template_eg_sendbasicemailwf_ IS 'Bubble.io zat_email_html_template_eg_sendbasicemailwf_ data - preserves original field names for sync';


--
-- Name: zat_faq; Type: TABLE; Schema: reference_table; Owner: -
--

CREATE TABLE reference_table.zat_faq (
    _id text NOT NULL,
    "Answer" text NOT NULL,
    "Category" text,
    "Created By" text NOT NULL,
    "Created Date" timestamp with time zone NOT NULL,
    "FAQ page sort order (low is up high)" integer,
    "For Mobile" boolean,
    "Keywords" text NOT NULL,
    "Mobile App Order" integer,
    "Modified Date" timestamp with time zone NOT NULL,
    "Question" text NOT NULL,
    "Slug" text,
    "showIfLoggedOut" boolean,
    "sub-category" text,
    created_at timestamp with time zone DEFAULT now(),
    updated_at timestamp with time zone DEFAULT now(),
    pending boolean DEFAULT false
);


--
-- Name: TABLE zat_faq; Type: COMMENT; Schema: reference_table; Owner: -
--

COMMENT ON TABLE reference_table.zat_faq IS 'Bubble.io zat_faq data - preserves original field names for sync';


--
-- Name: zat_features_cancellationpolicy; Type: TABLE; Schema: reference_table; Owner: -
--

CREATE TABLE reference_table.zat_features_cancellationpolicy (
    _id text NOT NULL,
    "Best Case Text" text,
    "Created By" text NOT NULL,
    "Created Date" timestamp with time zone NOT NULL,
    "Display" text NOT NULL,
    "Medium Case Text" text,
    "Modified Date" timestamp with time zone NOT NULL,
    "Sort Order" integer,
    "Summary Texts" jsonb,
    "Worst Case Text" text,
    shown boolean,
    created_at timestamp with time zone DEFAULT now(),
    updated_at timestamp with time zone DEFAULT now(),
    pending boolean DEFAULT false
);


--
-- Name: TABLE zat_features_cancellationpolicy; Type: COMMENT; Schema: reference_table; Owner: -
--

COMMENT ON TABLE reference_table.zat_features_cancellationpolicy IS 'Bubble.io zat_features_cancellationpolicy data - preserves original field names for sync';


--
-- Name: zat_features_houserule; Type: TABLE; Schema: reference_table; Owner: -
--

CREATE TABLE reference_table.zat_features_houserule (
    _id text NOT NULL,
    "Created By" text,
    "Created Date" timestamp with time zone NOT NULL,
    "Icon" text NOT NULL,
    "Modified Date" timestamp with time zone NOT NULL,
    "Name" text NOT NULL,
    "pre-set?" boolean,
    created_at timestamp with time zone DEFAULT now(),
    updated_at timestamp with time zone DEFAULT now(),
    pending boolean DEFAULT false
);


--
-- Name: TABLE zat_features_houserule; Type: COMMENT; Schema: reference_table; Owner: -
--

COMMENT ON TABLE reference_table.zat_features_houserule IS 'Bubble.io zat_features_houserule data - preserves original field names for sync';


--
-- Name: zat_features_listingtype; Type: TABLE; Schema: reference_table; Owner: -
--

CREATE TABLE reference_table.zat_features_listingtype (
    _id text NOT NULL,
    "Created By" text,
    "Created Date" timestamp with time zone NOT NULL,
    "Description" text NOT NULL,
    "Icon" text NOT NULL,
    "Label " text NOT NULL,
    "Level of control" integer,
    "Modified Date" timestamp with time zone NOT NULL,
    "Order" integer,
    created_at timestamp with time zone DEFAULT now(),
    updated_at timestamp with time zone DEFAULT now(),
    pending boolean DEFAULT false
);


--
-- Name: TABLE zat_features_listingtype; Type: COMMENT; Schema: reference_table; Owner: -
--

COMMENT ON TABLE reference_table.zat_features_listingtype IS 'Bubble.io zat_features_listingtype data - preserves original field names for sync';


--
-- Name: zat_features_parkingoptions; Type: TABLE; Schema: reference_table; Owner: -
--

CREATE TABLE reference_table.zat_features_parkingoptions (
    _id text NOT NULL,
    "Created By" text NOT NULL,
    "Created Date" timestamp with time zone NOT NULL,
    "Label" text NOT NULL,
    "Modified Date" timestamp with time zone NOT NULL,
    created_at timestamp with time zone DEFAULT now(),
    updated_at timestamp with time zone DEFAULT now(),
    pending boolean DEFAULT false
);


--
-- Name: TABLE zat_features_parkingoptions; Type: COMMENT; Schema: reference_table; Owner: -
--

COMMENT ON TABLE reference_table.zat_features_parkingoptions IS 'Bubble.io zat_features_parkingoptions data - preserves original field names for sync';


--
-- Name: zat_features_safetyfeature; Type: TABLE; Schema: reference_table; Owner: -
--

CREATE TABLE reference_table.zat_features_safetyfeature (
    _id text NOT NULL,
    "Name" text NOT NULL,
    "Icon" text,
    "pre-set?" boolean,
    "Created Date" timestamp with time zone,
    "Modified Date" timestamp with time zone,
    created_at timestamp with time zone DEFAULT now(),
    updated_at timestamp with time zone DEFAULT now()
);


--
-- Name: TABLE zat_features_safetyfeature; Type: COMMENT; Schema: reference_table; Owner: -
--

COMMENT ON TABLE reference_table.zat_features_safetyfeature IS 'Safety features reference data from Bubble.io export';


--
-- Name: zat_features_storageoptions; Type: TABLE; Schema: reference_table; Owner: -
--

CREATE TABLE reference_table.zat_features_storageoptions (
    _id text NOT NULL,
    "Created By" text NOT NULL,
    "Created Date" timestamp with time zone NOT NULL,
    "Modified Date" timestamp with time zone NOT NULL,
    "SortOrder" integer NOT NULL,
    "Summary - Guest" text NOT NULL,
    "Summary - Host" text NOT NULL,
    "Title" text NOT NULL,
    created_at timestamp with time zone DEFAULT now(),
    updated_at timestamp with time zone DEFAULT now(),
    pending boolean DEFAULT false
);


--
-- Name: TABLE zat_features_storageoptions; Type: COMMENT; Schema: reference_table; Owner: -
--

COMMENT ON TABLE reference_table.zat_features_storageoptions IS 'Bubble.io zat_features_storageoptions data - preserves original field names for sync';


--
-- Name: zat_geo_borough_toplevel; Type: TABLE; Schema: reference_table; Owner: -
--

CREATE TABLE reference_table.zat_geo_borough_toplevel (
    _id text NOT NULL,
    "Created By" text NOT NULL,
    "Created Date" timestamp with time zone NOT NULL,
    "Display Borough" text NOT NULL,
    "Geo-Hoods" jsonb NOT NULL,
    "Geo-Location" text NOT NULL,
    "Geographics Centre" jsonb NOT NULL,
    "Modified Date" timestamp with time zone NOT NULL,
    "Zip Codes" jsonb NOT NULL,
    created_at timestamp with time zone DEFAULT now(),
    updated_at timestamp with time zone DEFAULT now(),
    pending boolean DEFAULT false
);


--
-- Name: TABLE zat_geo_borough_toplevel; Type: COMMENT; Schema: reference_table; Owner: -
--

COMMENT ON TABLE reference_table.zat_geo_borough_toplevel IS 'Bubble.io zat_geo_borough_toplevel data - preserves original field names for sync';


--
-- Name: zat_geo_hood_mediumlevel; Type: TABLE; Schema: reference_table; Owner: -
--

CREATE TABLE reference_table.zat_geo_hood_mediumlevel (
    _id text NOT NULL,
    "Created By" text NOT NULL,
    "Created Date" timestamp with time zone NOT NULL,
    "Display" text NOT NULL,
    "Geo-Borough" text,
    "Geo-City" text NOT NULL,
    "Modified Date" timestamp with time zone NOT NULL,
    "Neighborhood Description" text NOT NULL,
    "Zips" jsonb NOT NULL,
    created_at timestamp with time zone DEFAULT now(),
    updated_at timestamp with time zone DEFAULT now(),
    pending boolean DEFAULT false
);


--
-- Name: TABLE zat_geo_hood_mediumlevel; Type: COMMENT; Schema: reference_table; Owner: -
--

COMMENT ON TABLE reference_table.zat_geo_hood_mediumlevel IS 'Bubble.io zat_geo_hood_mediumlevel data - preserves original field names for sync';


--
-- Name: zat_goodguestreasons; Type: TABLE; Schema: reference_table; Owner: -
--

CREATE TABLE reference_table.zat_goodguestreasons (
    _id text NOT NULL,
    "Created By" text NOT NULL,
    "Created Date" timestamp with time zone NOT NULL,
    "Modified Date" timestamp with time zone NOT NULL,
    "Slug" text,
    name text NOT NULL,
    created_at timestamp with time zone DEFAULT now(),
    updated_at timestamp with time zone DEFAULT now(),
    pending boolean DEFAULT false
);


--
-- Name: TABLE zat_goodguestreasons; Type: COMMENT; Schema: reference_table; Owner: -
--

COMMENT ON TABLE reference_table.zat_goodguestreasons IS 'Bubble.io zat_goodguestreasons data - preserves original field names for sync';


--
-- Name: zat_htmlembed; Type: TABLE; Schema: reference_table; Owner: -
--

CREATE TABLE reference_table.zat_htmlembed (
    _id text NOT NULL,
    "Created By" text,
    "Created Date" timestamp with time zone NOT NULL,
    "Modified Date" timestamp with time zone NOT NULL,
    "Team" text,
    "altFormScript" text,
    "altFormScript-B" text,
    "availableToSchedule" boolean,
    "formName" text,
    "formScript-A" text,
    "multi-form-nav-icon" text,
    "pageTitle" text,
    service text,
    "slug (use this)" text NOT NULL,
    "timeEstimate" integer,
    created_at timestamp with time zone DEFAULT now(),
    updated_at timestamp with time zone DEFAULT now(),
    pending boolean DEFAULT false
);


--
-- Name: TABLE zat_htmlembed; Type: COMMENT; Schema: reference_table; Owner: -
--

COMMENT ON TABLE reference_table.zat_htmlembed IS 'Bubble.io zat_htmlembed data - preserves original field names for sync';


--
-- Name: zat_location; Type: TABLE; Schema: reference_table; Owner: -
--

CREATE TABLE reference_table.zat_location (
    _id text NOT NULL,
    "Cover Photo" text,
    "Created By" text,
    "Created Date" timestamp with time zone NOT NULL,
    "Geographic City Address" jsonb NOT NULL,
    "Modified Date" timestamp with time zone NOT NULL,
    "Order" integer,
    "Radius" integer,
    "Short Name" text NOT NULL,
    "cityName" text NOT NULL,
    "occupancyTax" numeric,
    created_at timestamp with time zone DEFAULT now(),
    updated_at timestamp with time zone DEFAULT now(),
    pending boolean DEFAULT false
);


--
-- Name: TABLE zat_location; Type: COMMENT; Schema: reference_table; Owner: -
--

COMMENT ON TABLE reference_table.zat_location IS 'Bubble.io zat_location data - preserves original field names for sync';


--
-- Name: zat_policiesdocuments; Type: TABLE; Schema: reference_table; Owner: -
--

CREATE TABLE reference_table.zat_policiesdocuments (
    _id text NOT NULL,
    "Active" boolean NOT NULL,
    "Created By" text NOT NULL,
    "Created Date" timestamp with time zone NOT NULL,
    "Modified Date" timestamp with time zone NOT NULL,
    "Name" text NOT NULL,
    "PDF Version" text NOT NULL,
    "Slug" text,
    "Type" text,
    "visible on logged out?" boolean NOT NULL,
    created_at timestamp with time zone DEFAULT now(),
    updated_at timestamp with time zone DEFAULT now(),
    pending boolean DEFAULT false
);


--
-- Name: TABLE zat_policiesdocuments; Type: COMMENT; Schema: reference_table; Owner: -
--

COMMENT ON TABLE reference_table.zat_policiesdocuments IS 'Bubble.io zat_policiesdocuments data - preserves original field names for sync';


--
-- Name: zat_priceconfiguration; Type: TABLE; Schema: reference_table; Owner: -
--

CREATE TABLE reference_table.zat_priceconfiguration (
    _id text NOT NULL,
    "Avg days per month" integer NOT NULL,
    "Created By" text NOT NULL,
    "Created Date" timestamp with time zone NOT NULL,
    "Max Price per night" integer NOT NULL,
    "Min Price per night" integer NOT NULL,
    "Modified Date" timestamp with time zone NOT NULL,
    "Overall Site Markup" numeric NOT NULL,
    "Suggestion Additional Profit" integer NOT NULL,
    "Suggestion Bedrooms Multiplier" integer NOT NULL,
    "Suggestion Beds Multiplier" integer NOT NULL,
    "Unused Nights Discount Multiplier" numeric NOT NULL,
    "Weekly Markup" integer NOT NULL,
    "full time (7 nights) Discount" numeric NOT NULL,
    created_at timestamp with time zone DEFAULT now(),
    updated_at timestamp with time zone DEFAULT now(),
    pending boolean DEFAULT false
);


--
-- Name: TABLE zat_priceconfiguration; Type: COMMENT; Schema: reference_table; Owner: -
--

COMMENT ON TABLE reference_table.zat_priceconfiguration IS 'Bubble.io zat_priceconfiguration data - preserves original field names for sync';


--
-- Name: zat_splitleaseteam; Type: TABLE; Schema: reference_table; Owner: -
--

CREATE TABLE reference_table.zat_splitleaseteam (
    _id text NOT NULL,
    "Created By" text NOT NULL,
    "Created Date" timestamp with time zone NOT NULL,
    "Modified Date" timestamp with time zone NOT NULL,
    active boolean NOT NULL,
    alumni boolean NOT NULL,
    "click through link" text,
    email text,
    image text NOT NULL,
    name text NOT NULL,
    "order" integer NOT NULL,
    "phone number" text,
    title text NOT NULL,
    created_at timestamp with time zone DEFAULT now(),
    updated_at timestamp with time zone DEFAULT now(),
    pending boolean DEFAULT false
);


--
-- Name: TABLE zat_splitleaseteam; Type: COMMENT; Schema: reference_table; Owner: -
--

COMMENT ON TABLE reference_table.zat_splitleaseteam IS 'Bubble.io zat_splitleaseteam data - preserves original field names for sync';


--
-- Name: zat_storage; Type: TABLE; Schema: reference_table; Owner: -
--

CREATE TABLE reference_table.zat_storage (
    _id text NOT NULL,
    "Created By" text NOT NULL,
    "Created Date" timestamp with time zone NOT NULL,
    "Modified Date" timestamp with time zone NOT NULL,
    "Name" text NOT NULL,
    created_at timestamp with time zone DEFAULT now(),
    updated_at timestamp with time zone DEFAULT now(),
    pending boolean DEFAULT false
);


--
-- Name: TABLE zat_storage; Type: COMMENT; Schema: reference_table; Owner: -
--

COMMENT ON TABLE reference_table.zat_storage IS 'Bubble.io zat_storage data - preserves original field names for sync';


--
-- Name: zat_successstory; Type: TABLE; Schema: reference_table; Owner: -
--

CREATE TABLE reference_table.zat_successstory (
    _id text NOT NULL,
    "Active" boolean NOT NULL,
    "Created By" text NOT NULL,
    "Created Date" timestamp with time zone NOT NULL,
    "Full Text" text NOT NULL,
    "Modified Date" timestamp with time zone NOT NULL,
    "Name" text NOT NULL,
    "Occupation" text NOT NULL,
    "Profile Image" text NOT NULL,
    "Summary" text NOT NULL,
    "guest review" boolean NOT NULL,
    "host = yes, guest = no" boolean,
    "host review" boolean NOT NULL,
    created_at timestamp with time zone DEFAULT now(),
    updated_at timestamp with time zone DEFAULT now(),
    pending boolean DEFAULT false
);


--
-- Name: TABLE zat_successstory; Type: COMMENT; Schema: reference_table; Owner: -
--

COMMENT ON TABLE reference_table.zat_successstory IS 'Bubble.io zat_successstory data - preserves original field names for sync';


--
-- Name: schema_migrations; Type: TABLE; Schema: supabase_migrations; Owner: -
--

CREATE TABLE supabase_migrations.schema_migrations (
    version text NOT NULL,
    statements text[],
    name text,
    created_by text,
    idempotency_key text,
    rollback text[]
);


--
-- Name: seed_files; Type: TABLE; Schema: supabase_migrations; Owner: -
--

CREATE TABLE supabase_migrations.seed_files (
    path text NOT NULL,
    hash text NOT NULL
);


--
-- Name: thread_message thread_message_pkey; Type: CONSTRAINT; Schema: junctions; Owner: -
--

ALTER TABLE ONLY junctions.thread_message
    ADD CONSTRAINT thread_message_pkey PRIMARY KEY (id);


--
-- Name: thread_message thread_message_thread_message_unique; Type: CONSTRAINT; Schema: junctions; Owner: -
--

ALTER TABLE ONLY junctions.thread_message
    ADD CONSTRAINT thread_message_thread_message_unique UNIQUE (thread_id, message_id);


--
-- Name: thread_participant thread_participant_pkey; Type: CONSTRAINT; Schema: junctions; Owner: -
--

ALTER TABLE ONLY junctions.thread_participant
    ADD CONSTRAINT thread_participant_pkey PRIMARY KEY (id);


--
-- Name: thread_participant uq_thread_participant; Type: CONSTRAINT; Schema: junctions; Owner: -
--

ALTER TABLE ONLY junctions.thread_participant
    ADD CONSTRAINT uq_thread_participant UNIQUE (thread_id, user_id);


--
-- Name: user_guest_reason uq_user_guest_reason; Type: CONSTRAINT; Schema: junctions; Owner: -
--

ALTER TABLE ONLY junctions.user_guest_reason
    ADD CONSTRAINT uq_user_guest_reason UNIQUE (user_id, reason_id);


--
-- Name: user_lease uq_user_lease_role; Type: CONSTRAINT; Schema: junctions; Owner: -
--

ALTER TABLE ONLY junctions.user_lease
    ADD CONSTRAINT uq_user_lease_role UNIQUE (user_id, lease_id, role);


--
-- Name: user_listing_favorite uq_user_listing_favorite; Type: CONSTRAINT; Schema: junctions; Owner: -
--

ALTER TABLE ONLY junctions.user_listing_favorite
    ADD CONSTRAINT uq_user_listing_favorite UNIQUE (user_id, listing_id);


--
-- Name: user_permission uq_user_permission; Type: CONSTRAINT; Schema: junctions; Owner: -
--

ALTER TABLE ONLY junctions.user_permission
    ADD CONSTRAINT uq_user_permission UNIQUE (grantor_user_id, grantee_user_id, permission_type);


--
-- Name: user_preferred_hood uq_user_preferred_hood; Type: CONSTRAINT; Schema: junctions; Owner: -
--

ALTER TABLE ONLY junctions.user_preferred_hood
    ADD CONSTRAINT uq_user_preferred_hood UNIQUE (user_id, hood_id);


--
-- Name: user_proposal uq_user_proposal; Type: CONSTRAINT; Schema: junctions; Owner: -
--

ALTER TABLE ONLY junctions.user_proposal
    ADD CONSTRAINT uq_user_proposal UNIQUE (user_id, proposal_id);


--
-- Name: user_rental_type_search uq_user_rental_type_search; Type: CONSTRAINT; Schema: junctions; Owner: -
--

ALTER TABLE ONLY junctions.user_rental_type_search
    ADD CONSTRAINT uq_user_rental_type_search UNIQUE (user_id, rental_type_id);


--
-- Name: user_storage_item uq_user_storage_item; Type: CONSTRAINT; Schema: junctions; Owner: -
--

ALTER TABLE ONLY junctions.user_storage_item
    ADD CONSTRAINT uq_user_storage_item UNIQUE (user_id, storage_id);


--
-- Name: user_guest_reason user_guest_reason_pkey; Type: CONSTRAINT; Schema: junctions; Owner: -
--

ALTER TABLE ONLY junctions.user_guest_reason
    ADD CONSTRAINT user_guest_reason_pkey PRIMARY KEY (id);


--
-- Name: user_lease user_lease_pkey; Type: CONSTRAINT; Schema: junctions; Owner: -
--

ALTER TABLE ONLY junctions.user_lease
    ADD CONSTRAINT user_lease_pkey PRIMARY KEY (id);


--
-- Name: user_listing_favorite user_listing_favorite_pkey; Type: CONSTRAINT; Schema: junctions; Owner: -
--

ALTER TABLE ONLY junctions.user_listing_favorite
    ADD CONSTRAINT user_listing_favorite_pkey PRIMARY KEY (id);


--
-- Name: user_permission user_permission_pkey; Type: CONSTRAINT; Schema: junctions; Owner: -
--

ALTER TABLE ONLY junctions.user_permission
    ADD CONSTRAINT user_permission_pkey PRIMARY KEY (id);


--
-- Name: user_preferred_hood user_preferred_hood_pkey; Type: CONSTRAINT; Schema: junctions; Owner: -
--

ALTER TABLE ONLY junctions.user_preferred_hood
    ADD CONSTRAINT user_preferred_hood_pkey PRIMARY KEY (id);


--
-- Name: user_proposal user_proposal_pkey; Type: CONSTRAINT; Schema: junctions; Owner: -
--

ALTER TABLE ONLY junctions.user_proposal
    ADD CONSTRAINT user_proposal_pkey PRIMARY KEY (id);


--
-- Name: user_rental_type_search user_rental_type_search_pkey; Type: CONSTRAINT; Schema: junctions; Owner: -
--

ALTER TABLE ONLY junctions.user_rental_type_search
    ADD CONSTRAINT user_rental_type_search_pkey PRIMARY KEY (id);


--
-- Name: user_storage_item user_storage_item_pkey; Type: CONSTRAINT; Schema: junctions; Owner: -
--

ALTER TABLE ONLY junctions.user_storage_item
    ADD CONSTRAINT user_storage_item_pkey PRIMARY KEY (id);


--
-- Name: a_workflow_dlq a_workflow_dlq_pkey; Type: CONSTRAINT; Schema: pgmq; Owner: -
--

ALTER TABLE ONLY pgmq.a_workflow_dlq
    ADD CONSTRAINT a_workflow_dlq_pkey PRIMARY KEY (msg_id);


--
-- Name: a_workflow_queue a_workflow_queue_pkey; Type: CONSTRAINT; Schema: pgmq; Owner: -
--

ALTER TABLE ONLY pgmq.a_workflow_queue
    ADD CONSTRAINT a_workflow_queue_pkey PRIMARY KEY (msg_id);


--
-- Name: q_workflow_dlq q_workflow_dlq_pkey; Type: CONSTRAINT; Schema: pgmq; Owner: -
--

ALTER TABLE ONLY pgmq.q_workflow_dlq
    ADD CONSTRAINT q_workflow_dlq_pkey PRIMARY KEY (msg_id);


--
-- Name: q_workflow_queue q_workflow_queue_pkey; Type: CONSTRAINT; Schema: pgmq; Owner: -
--

ALTER TABLE ONLY pgmq.q_workflow_queue
    ADD CONSTRAINT q_workflow_queue_pkey PRIMARY KEY (msg_id);


--
-- Name: _message _message_bubble_id_key; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public._message
    ADD CONSTRAINT _message_bubble_id_key UNIQUE (bubble_id);


--
-- Name: _message _message_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public._message
    ADD CONSTRAINT _message_pkey PRIMARY KEY (_id);


--
-- Name: ai_parsing_queue ai_parsing_queue_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.ai_parsing_queue
    ADD CONSTRAINT ai_parsing_queue_pkey PRIMARY KEY (id);


--
-- Name: audit_log audit_log_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.audit_log
    ADD CONSTRAINT audit_log_pkey PRIMARY KEY (id);


--
-- Name: bookings_leases bookings_leases_bubble_id_key; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.bookings_leases
    ADD CONSTRAINT bookings_leases_bubble_id_key UNIQUE (bubble_id);


--
-- Name: bookings_leases bookings_leases_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.bookings_leases
    ADD CONSTRAINT bookings_leases_pkey PRIMARY KEY (_id);


--
-- Name: bookings_stays bookings_stays_bubble_id_key; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.bookings_stays
    ADD CONSTRAINT bookings_stays_bubble_id_key UNIQUE (bubble_id);


--
-- Name: bookings_stays bookings_stays_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.bookings_stays
    ADD CONSTRAINT bookings_stays_pkey PRIMARY KEY (_id);


--
-- Name: co_hostrequest co_hostrequest_bubble_id_key; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.co_hostrequest
    ADD CONSTRAINT co_hostrequest_bubble_id_key UNIQUE (bubble_id);


--
-- Name: co_hostrequest co_hostrequest_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.co_hostrequest
    ADD CONSTRAINT co_hostrequest_pkey PRIMARY KEY (_id);


--
-- Name: dailycounter dailycounter_bubble_id_key; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.dailycounter
    ADD CONSTRAINT dailycounter_bubble_id_key UNIQUE (bubble_id);


--
-- Name: dailycounter dailycounter_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.dailycounter
    ADD CONSTRAINT dailycounter_pkey PRIMARY KEY (_id);


--
-- Name: datacollection_searchlogging datacollection_searchlogging_bubble_id_key; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.datacollection_searchlogging
    ADD CONSTRAINT datacollection_searchlogging_bubble_id_key UNIQUE (bubble_id);


--
-- Name: datacollection_searchlogging datacollection_searchlogging_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.datacollection_searchlogging
    ADD CONSTRAINT datacollection_searchlogging_pkey PRIMARY KEY (_id);


--
-- Name: datechangerequest datechangerequest_bubble_id_key; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.datechangerequest
    ADD CONSTRAINT datechangerequest_bubble_id_key UNIQUE (bubble_id);


--
-- Name: datechangerequest datechangerequest_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.datechangerequest
    ADD CONSTRAINT datechangerequest_pkey PRIMARY KEY (_id);


--
-- Name: documentssent documentssent_bubble_id_key; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.documentssent
    ADD CONSTRAINT documentssent_bubble_id_key UNIQUE (bubble_id);


--
-- Name: documentssent documentssent_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.documentssent
    ADD CONSTRAINT documentssent_pkey PRIMARY KEY (_id);


--
-- Name: email email_bubble_id_key; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.email
    ADD CONSTRAINT email_bubble_id_key UNIQUE (bubble_id);


--
-- Name: email email_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.email
    ADD CONSTRAINT email_pkey PRIMARY KEY (_id);


--
-- Name: emailtemplate_postmark_ emailtemplate_postmark__bubble_id_key; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.emailtemplate_postmark_
    ADD CONSTRAINT emailtemplate_postmark__bubble_id_key UNIQUE (bubble_id);


--
-- Name: emailtemplate_postmark_ emailtemplate_postmark__pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.emailtemplate_postmark_
    ADD CONSTRAINT emailtemplate_postmark__pkey PRIMARY KEY (_id);


--
-- Name: emailtemplates_category_postmark_ emailtemplates_category_postmark__bubble_id_key; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.emailtemplates_category_postmark_
    ADD CONSTRAINT emailtemplates_category_postmark__bubble_id_key UNIQUE (bubble_id);


--
-- Name: emailtemplates_category_postmark_ emailtemplates_category_postmark__pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.emailtemplates_category_postmark_
    ADD CONSTRAINT emailtemplates_category_postmark__pkey PRIMARY KEY (_id);


--
-- Name: emergencyreports emergencyreports_bubble_id_key; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.emergencyreports
    ADD CONSTRAINT emergencyreports_bubble_id_key UNIQUE (bubble_id);


--
-- Name: emergencyreports emergencyreports_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.emergencyreports
    ADD CONSTRAINT emergencyreports_pkey PRIMARY KEY (_id);


--
-- Name: experiencesurvey experiencesurvey_bubble_id_key; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.experiencesurvey
    ADD CONSTRAINT experiencesurvey_bubble_id_key UNIQUE (bubble_id);


--
-- Name: experiencesurvey experiencesurvey_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.experiencesurvey
    ADD CONSTRAINT experiencesurvey_pkey PRIMARY KEY (_id);


--
-- Name: external_reviews external_reviews_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.external_reviews
    ADD CONSTRAINT external_reviews_pkey PRIMARY KEY (id);


--
-- Name: fieldsforleasedocuments fieldsforleasedocuments_bubble_id_key; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.fieldsforleasedocuments
    ADD CONSTRAINT fieldsforleasedocuments_bubble_id_key UNIQUE (bubble_id);


--
-- Name: fieldsforleasedocuments fieldsforleasedocuments_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.fieldsforleasedocuments
    ADD CONSTRAINT fieldsforleasedocuments_pkey PRIMARY KEY (_id);


--
-- Name: file file_bubble_id_key; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.file
    ADD CONSTRAINT file_bubble_id_key UNIQUE (bubble_id);


--
-- Name: file file_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.file
    ADD CONSTRAINT file_pkey PRIMARY KEY (_id);


--
-- Name: guest_inquiry guest_inquiry_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.guest_inquiry
    ADD CONSTRAINT guest_inquiry_pkey PRIMARY KEY (id);


--
-- Name: hostrestrictions hostrestrictions_bubble_id_key; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.hostrestrictions
    ADD CONSTRAINT hostrestrictions_bubble_id_key UNIQUE (bubble_id);


--
-- Name: hostrestrictions hostrestrictions_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.hostrestrictions
    ADD CONSTRAINT hostrestrictions_pkey PRIMARY KEY (_id);


--
-- Name: housemanual housemanual_bubble_id_key; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.housemanual
    ADD CONSTRAINT housemanual_bubble_id_key UNIQUE (bubble_id);


--
-- Name: housemanual housemanual_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.housemanual
    ADD CONSTRAINT housemanual_pkey PRIMARY KEY (_id);


--
-- Name: housemanualphotos housemanualphotos_bubble_id_key; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.housemanualphotos
    ADD CONSTRAINT housemanualphotos_bubble_id_key UNIQUE (bubble_id);


--
-- Name: housemanualphotos housemanualphotos_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.housemanualphotos
    ADD CONSTRAINT housemanualphotos_pkey PRIMARY KEY (_id);


--
-- Name: informationaltexts informationaltexts_bubble_id_key; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.informationaltexts
    ADD CONSTRAINT informationaltexts_bubble_id_key UNIQUE (bubble_id);


--
-- Name: informationaltexts informationaltexts_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.informationaltexts
    ADD CONSTRAINT informationaltexts_pkey PRIMARY KEY (_id);


--
-- Name: internalfiles internalfiles_bubble_id_key; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.internalfiles
    ADD CONSTRAINT internalfiles_bubble_id_key UNIQUE (bubble_id);


--
-- Name: internalfiles internalfiles_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.internalfiles
    ADD CONSTRAINT internalfiles_pkey PRIMARY KEY (_id);


--
-- Name: invoices invoices_bubble_id_key; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.invoices
    ADD CONSTRAINT invoices_bubble_id_key UNIQUE (bubble_id);


--
-- Name: invoices invoices_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.invoices
    ADD CONSTRAINT invoices_pkey PRIMARY KEY (_id);


--
-- Name: knowledgebase knowledgebase_bubble_id_key; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.knowledgebase
    ADD CONSTRAINT knowledgebase_bubble_id_key UNIQUE (bubble_id);


--
-- Name: knowledgebase knowledgebase_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.knowledgebase
    ADD CONSTRAINT knowledgebase_pkey PRIMARY KEY (_id);


--
-- Name: knowledgebaselineitem knowledgebaselineitem_bubble_id_key; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.knowledgebaselineitem
    ADD CONSTRAINT knowledgebaselineitem_bubble_id_key UNIQUE (bubble_id);


--
-- Name: knowledgebaselineitem knowledgebaselineitem_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.knowledgebaselineitem
    ADD CONSTRAINT knowledgebaselineitem_pkey PRIMARY KEY (_id);


--
-- Name: listing listing_bubble_id_key; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.listing
    ADD CONSTRAINT listing_bubble_id_key UNIQUE (bubble_id);


--
-- Name: listing_drafts listing_drafts_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.listing_drafts
    ADD CONSTRAINT listing_drafts_pkey PRIMARY KEY (id);


--
-- Name: listing_photo listing_photo_bubble_id_key; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.listing_photo
    ADD CONSTRAINT listing_photo_bubble_id_key UNIQUE (bubble_id);


--
-- Name: listing_photo listing_photo_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.listing_photo
    ADD CONSTRAINT listing_photo_pkey PRIMARY KEY (_id);


--
-- Name: listing listing_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.listing
    ADD CONSTRAINT listing_pkey PRIMARY KEY (_id);


--
-- Name: mailing_list_opt_in mailing_list_opt_in_bubble_id_key; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.mailing_list_opt_in
    ADD CONSTRAINT mailing_list_opt_in_bubble_id_key UNIQUE (bubble_id);


--
-- Name: mailing_list_opt_in mailing_list_opt_in_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.mailing_list_opt_in
    ADD CONSTRAINT mailing_list_opt_in_pkey PRIMARY KEY (_id);


--
-- Name: mainreview mainreview_bubble_id_key; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.mainreview
    ADD CONSTRAINT mainreview_bubble_id_key UNIQUE (bubble_id);


--
-- Name: mainreview mainreview_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.mainreview
    ADD CONSTRAINT mainreview_pkey PRIMARY KEY (_id);


--
-- Name: multimessage multimessage_bubble_id_key; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.multimessage
    ADD CONSTRAINT multimessage_bubble_id_key UNIQUE (bubble_id);


--
-- Name: multimessage multimessage_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.multimessage
    ADD CONSTRAINT multimessage_pkey PRIMARY KEY (_id);


--
-- Name: narration narration_bubble_id_key; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.narration
    ADD CONSTRAINT narration_bubble_id_key UNIQUE (bubble_id);


--
-- Name: narration narration_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.narration
    ADD CONSTRAINT narration_pkey PRIMARY KEY (_id);


--
-- Name: negotiationsummary negotiationsummary_bubble_id_key; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.negotiationsummary
    ADD CONSTRAINT negotiationsummary_bubble_id_key UNIQUE (bubble_id);


--
-- Name: negotiationsummary negotiationsummary_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.negotiationsummary
    ADD CONSTRAINT negotiationsummary_pkey PRIMARY KEY (_id);


--
-- Name: notification_preferences notification_preferences_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.notification_preferences
    ADD CONSTRAINT notification_preferences_pkey PRIMARY KEY (id);


--
-- Name: notificationsettingsos_lists_ notificationsettingsos_lists__bubble_id_key; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.notificationsettingsos_lists_
    ADD CONSTRAINT notificationsettingsos_lists__bubble_id_key UNIQUE (bubble_id);


--
-- Name: notificationsettingsos_lists_ notificationsettingsos_lists__pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.notificationsettingsos_lists_
    ADD CONSTRAINT notificationsettingsos_lists__pkey PRIMARY KEY (_id);


--
-- Name: num num_bubble_id_key; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.num
    ADD CONSTRAINT num_bubble_id_key UNIQUE (bubble_id);


--
-- Name: num num_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.num
    ADD CONSTRAINT num_pkey PRIMARY KEY (_id);


--
-- Name: occupant occupant_bubble_id_key; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.occupant
    ADD CONSTRAINT occupant_bubble_id_key UNIQUE (bubble_id);


--
-- Name: occupant occupant_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.occupant
    ADD CONSTRAINT occupant_pkey PRIMARY KEY (_id);


--
-- Name: paymentrecords paymentrecords_bubble_id_key; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.paymentrecords
    ADD CONSTRAINT paymentrecords_bubble_id_key UNIQUE (bubble_id);


--
-- Name: paymentrecords paymentrecords_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.paymentrecords
    ADD CONSTRAINT paymentrecords_pkey PRIMARY KEY (_id);


--
-- Name: paymentsfromdatechanges paymentsfromdatechanges_bubble_id_key; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.paymentsfromdatechanges
    ADD CONSTRAINT paymentsfromdatechanges_bubble_id_key UNIQUE (bubble_id);


--
-- Name: paymentsfromdatechanges paymentsfromdatechanges_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.paymentsfromdatechanges
    ADD CONSTRAINT paymentsfromdatechanges_pkey PRIMARY KEY (_id);


--
-- Name: postmark_loginbound postmark_loginbound_bubble_id_key; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.postmark_loginbound
    ADD CONSTRAINT postmark_loginbound_bubble_id_key UNIQUE (bubble_id);


--
-- Name: postmark_loginbound postmark_loginbound_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.postmark_loginbound
    ADD CONSTRAINT postmark_loginbound_pkey PRIMARY KEY (_id);


--
-- Name: pricing_list pricing_list_bubble_id_key; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.pricing_list
    ADD CONSTRAINT pricing_list_bubble_id_key UNIQUE (bubble_id);


--
-- Name: pricing_list pricing_list_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.pricing_list
    ADD CONSTRAINT pricing_list_pkey PRIMARY KEY (_id);


--
-- Name: proposal proposal_bubble_id_key; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.proposal
    ADD CONSTRAINT proposal_bubble_id_key UNIQUE (bubble_id);


--
-- Name: proposal proposal_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.proposal
    ADD CONSTRAINT proposal_pkey PRIMARY KEY (_id);


--
-- Name: proxysmssession proxysmssession_bubble_id_key; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.proxysmssession
    ADD CONSTRAINT proxysmssession_bubble_id_key UNIQUE (bubble_id);


--
-- Name: proxysmssession proxysmssession_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.proxysmssession
    ADD CONSTRAINT proxysmssession_pkey PRIMARY KEY (_id);


--
-- Name: qrcodes qrcodes_bubble_id_key; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.qrcodes
    ADD CONSTRAINT qrcodes_bubble_id_key UNIQUE (bubble_id);


--
-- Name: qrcodes qrcodes_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.qrcodes
    ADD CONSTRAINT qrcodes_pkey PRIMARY KEY (_id);


--
-- Name: ratingdetail_reviews_ ratingdetail_reviews__bubble_id_key; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.ratingdetail_reviews_
    ADD CONSTRAINT ratingdetail_reviews__bubble_id_key UNIQUE (bubble_id);


--
-- Name: ratingdetail_reviews_ ratingdetail_reviews__pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.ratingdetail_reviews_
    ADD CONSTRAINT ratingdetail_reviews__pkey PRIMARY KEY (_id);


--
-- Name: referral referral_bubble_id_key; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.referral
    ADD CONSTRAINT referral_bubble_id_key UNIQUE (bubble_id);


--
-- Name: referral referral_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.referral
    ADD CONSTRAINT referral_pkey PRIMARY KEY (_id);


--
-- Name: remindersfromhousemanual remindersfromhousemanual_bubble_id_key; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.remindersfromhousemanual
    ADD CONSTRAINT remindersfromhousemanual_bubble_id_key UNIQUE (bubble_id);


--
-- Name: remindersfromhousemanual remindersfromhousemanual_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.remindersfromhousemanual
    ADD CONSTRAINT remindersfromhousemanual_pkey PRIMARY KEY (_id);


--
-- Name: rentalapplication rentalapplication_bubble_id_key; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.rentalapplication
    ADD CONSTRAINT rentalapplication_bubble_id_key UNIQUE (bubble_id);


--
-- Name: rentalapplication rentalapplication_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.rentalapplication
    ADD CONSTRAINT rentalapplication_pkey PRIMARY KEY (_id);


--
-- Name: reviewslistingsexternal reviewslistingsexternal_bubble_id_key; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.reviewslistingsexternal
    ADD CONSTRAINT reviewslistingsexternal_bubble_id_key UNIQUE (bubble_id);


--
-- Name: reviewslistingsexternal reviewslistingsexternal_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.reviewslistingsexternal
    ADD CONSTRAINT reviewslistingsexternal_pkey PRIMARY KEY (_id);


--
-- Name: savedsearch savedsearch_bubble_id_key; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.savedsearch
    ADD CONSTRAINT savedsearch_bubble_id_key UNIQUE (bubble_id);


--
-- Name: savedsearch savedsearch_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.savedsearch
    ADD CONSTRAINT savedsearch_pkey PRIMARY KEY (_id);


--
-- Name: state state_bubble_id_key; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.state
    ADD CONSTRAINT state_bubble_id_key UNIQUE (bubble_id);


--
-- Name: state state_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.state
    ADD CONSTRAINT state_pkey PRIMARY KEY (_id);


--
-- Name: sync_config sync_config_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.sync_config
    ADD CONSTRAINT sync_config_pkey PRIMARY KEY (id);


--
-- Name: sync_config sync_config_supabase_table_key; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.sync_config
    ADD CONSTRAINT sync_config_supabase_table_key UNIQUE (supabase_table);


--
-- Name: sync_queue sync_queue_idempotency_key_key; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.sync_queue
    ADD CONSTRAINT sync_queue_idempotency_key_key UNIQUE (idempotency_key);


--
-- Name: sync_queue sync_queue_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.sync_queue
    ADD CONSTRAINT sync_queue_pkey PRIMARY KEY (id);


--
-- Name: thread thread_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.thread
    ADD CONSTRAINT thread_pkey PRIMARY KEY (_id);


--
-- Name: notification_preferences unique_user_preferences; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.notification_preferences
    ADD CONSTRAINT unique_user_preferences UNIQUE (user_id);


--
-- Name: updatestodocuments updatestodocuments_bubble_id_key; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.updatestodocuments
    ADD CONSTRAINT updatestodocuments_bubble_id_key UNIQUE (bubble_id);


--
-- Name: updatestodocuments updatestodocuments_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.updatestodocuments
    ADD CONSTRAINT updatestodocuments_pkey PRIMARY KEY (_id);


--
-- Name: user user_Notification Settings OS(lisits)_key; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public."user"
    ADD CONSTRAINT "user_Notification Settings OS(lisits)_key" UNIQUE ("Notification Settings OS(lisits)");


--
-- Name: user user_bubble_id_key; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public."user"
    ADD CONSTRAINT user_bubble_id_key UNIQUE (bubble_id);


--
-- Name: user user_email_key; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public."user"
    ADD CONSTRAINT user_email_key UNIQUE (email);


--
-- Name: user user_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public."user"
    ADD CONSTRAINT user_pkey PRIMARY KEY (_id);


--
-- Name: virtualmeetingschedulesandlinks virtualmeetingschedulesandlinks_bubble_id_key; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.virtualmeetingschedulesandlinks
    ADD CONSTRAINT virtualmeetingschedulesandlinks_bubble_id_key UNIQUE (bubble_id);


--
-- Name: virtualmeetingschedulesandlinks virtualmeetingschedulesandlinks_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.virtualmeetingschedulesandlinks
    ADD CONSTRAINT virtualmeetingschedulesandlinks_pkey PRIMARY KEY (_id);


--
-- Name: visit visit_bubble_id_key; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.visit
    ADD CONSTRAINT visit_bubble_id_key UNIQUE (bubble_id);


--
-- Name: visit visit_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.visit
    ADD CONSTRAINT visit_pkey PRIMARY KEY (_id);


--
-- Name: waitlistsubmission waitlistsubmission_bubble_id_key; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.waitlistsubmission
    ADD CONSTRAINT waitlistsubmission_bubble_id_key UNIQUE (bubble_id);


--
-- Name: waitlistsubmission waitlistsubmission_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.waitlistsubmission
    ADD CONSTRAINT waitlistsubmission_pkey PRIMARY KEY (_id);


--
-- Name: workflow_definitions workflow_definitions_name_key; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.workflow_definitions
    ADD CONSTRAINT workflow_definitions_name_key UNIQUE (name);


--
-- Name: workflow_definitions workflow_definitions_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.workflow_definitions
    ADD CONSTRAINT workflow_definitions_pkey PRIMARY KEY (id);


--
-- Name: workflow_executions workflow_executions_correlation_id_key; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.workflow_executions
    ADD CONSTRAINT workflow_executions_correlation_id_key UNIQUE (correlation_id);


--
-- Name: workflow_executions workflow_executions_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.workflow_executions
    ADD CONSTRAINT workflow_executions_pkey PRIMARY KEY (id);


--
-- Name: zat_aisuggestions zat_aisuggestions_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.zat_aisuggestions
    ADD CONSTRAINT zat_aisuggestions_pkey PRIMARY KEY (_id);


--
-- Name: zat_blocked_vm_bookingtimes zat_blocked_vm_bookingtimes_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.zat_blocked_vm_bookingtimes
    ADD CONSTRAINT zat_blocked_vm_bookingtimes_pkey PRIMARY KEY (_id);


--
-- Name: zat_features_amenity zat_features_amenity_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.zat_features_amenity
    ADD CONSTRAINT zat_features_amenity_pkey PRIMARY KEY (_id);


--
-- Name: cancellation_reasons cancellation_reasons_pkey; Type: CONSTRAINT; Schema: reference_table; Owner: -
--

ALTER TABLE ONLY reference_table.cancellation_reasons
    ADD CONSTRAINT cancellation_reasons_pkey PRIMARY KEY (id);


--
-- Name: cancellation_reasons cancellation_reasons_user_type_reason_key; Type: CONSTRAINT; Schema: reference_table; Owner: -
--

ALTER TABLE ONLY reference_table.cancellation_reasons
    ADD CONSTRAINT cancellation_reasons_user_type_reason_key UNIQUE (user_type, reason);


--
-- Name: os_admin_users os_admin_users_name_key; Type: CONSTRAINT; Schema: reference_table; Owner: -
--

ALTER TABLE ONLY reference_table.os_admin_users
    ADD CONSTRAINT os_admin_users_name_key UNIQUE (name);


--
-- Name: os_admin_users os_admin_users_pkey; Type: CONSTRAINT; Schema: reference_table; Owner: -
--

ALTER TABLE ONLY reference_table.os_admin_users
    ADD CONSTRAINT os_admin_users_pkey PRIMARY KEY (id);


--
-- Name: os_ai_fields_house_manual os_ai_fields_house_manual_name_key; Type: CONSTRAINT; Schema: reference_table; Owner: -
--

ALTER TABLE ONLY reference_table.os_ai_fields_house_manual
    ADD CONSTRAINT os_ai_fields_house_manual_name_key UNIQUE (name);


--
-- Name: os_ai_fields_house_manual os_ai_fields_house_manual_pkey; Type: CONSTRAINT; Schema: reference_table; Owner: -
--

ALTER TABLE ONLY reference_table.os_ai_fields_house_manual
    ADD CONSTRAINT os_ai_fields_house_manual_pkey PRIMARY KEY (id);


--
-- Name: os_ai_fields_listing os_ai_fields_listing_name_key; Type: CONSTRAINT; Schema: reference_table; Owner: -
--

ALTER TABLE ONLY reference_table.os_ai_fields_listing
    ADD CONSTRAINT os_ai_fields_listing_name_key UNIQUE (name);


--
-- Name: os_ai_fields_listing os_ai_fields_listing_pkey; Type: CONSTRAINT; Schema: reference_table; Owner: -
--

ALTER TABLE ONLY reference_table.os_ai_fields_listing
    ADD CONSTRAINT os_ai_fields_listing_pkey PRIMARY KEY (id);


--
-- Name: os_alert_type os_alert_type_name_key; Type: CONSTRAINT; Schema: reference_table; Owner: -
--

ALTER TABLE ONLY reference_table.os_alert_type
    ADD CONSTRAINT os_alert_type_name_key UNIQUE (name);


--
-- Name: os_alert_type os_alert_type_pkey; Type: CONSTRAINT; Schema: reference_table; Owner: -
--

ALTER TABLE ONLY reference_table.os_alert_type
    ADD CONSTRAINT os_alert_type_pkey PRIMARY KEY (id);


--
-- Name: os_amenity_categories os_amenity_categories_name_key; Type: CONSTRAINT; Schema: reference_table; Owner: -
--

ALTER TABLE ONLY reference_table.os_amenity_categories
    ADD CONSTRAINT os_amenity_categories_name_key UNIQUE (name);


--
-- Name: os_amenity_categories os_amenity_categories_pkey; Type: CONSTRAINT; Schema: reference_table; Owner: -
--

ALTER TABLE ONLY reference_table.os_amenity_categories
    ADD CONSTRAINT os_amenity_categories_pkey PRIMARY KEY (id);


--
-- Name: os_bathrooms os_bathrooms_name_key; Type: CONSTRAINT; Schema: reference_table; Owner: -
--

ALTER TABLE ONLY reference_table.os_bathrooms
    ADD CONSTRAINT os_bathrooms_name_key UNIQUE (name);


--
-- Name: os_bathrooms os_bathrooms_pkey; Type: CONSTRAINT; Schema: reference_table; Owner: -
--

ALTER TABLE ONLY reference_table.os_bathrooms
    ADD CONSTRAINT os_bathrooms_pkey PRIMARY KEY (id);


--
-- Name: os_bedrooms os_bedrooms_name_key; Type: CONSTRAINT; Schema: reference_table; Owner: -
--

ALTER TABLE ONLY reference_table.os_bedrooms
    ADD CONSTRAINT os_bedrooms_name_key UNIQUE (name);


--
-- Name: os_bedrooms os_bedrooms_pkey; Type: CONSTRAINT; Schema: reference_table; Owner: -
--

ALTER TABLE ONLY reference_table.os_bedrooms
    ADD CONSTRAINT os_bedrooms_pkey PRIMARY KEY (id);


--
-- Name: os_beds os_beds_name_key; Type: CONSTRAINT; Schema: reference_table; Owner: -
--

ALTER TABLE ONLY reference_table.os_beds
    ADD CONSTRAINT os_beds_name_key UNIQUE (name);


--
-- Name: os_beds os_beds_pkey; Type: CONSTRAINT; Schema: reference_table; Owner: -
--

ALTER TABLE ONLY reference_table.os_beds
    ADD CONSTRAINT os_beds_pkey PRIMARY KEY (id);


--
-- Name: os_categories_guest_user_reviews os_categories_guest_user_reviews_name_key; Type: CONSTRAINT; Schema: reference_table; Owner: -
--

ALTER TABLE ONLY reference_table.os_categories_guest_user_reviews
    ADD CONSTRAINT os_categories_guest_user_reviews_name_key UNIQUE (name);


--
-- Name: os_categories_guest_user_reviews os_categories_guest_user_reviews_pkey; Type: CONSTRAINT; Schema: reference_table; Owner: -
--

ALTER TABLE ONLY reference_table.os_categories_guest_user_reviews
    ADD CONSTRAINT os_categories_guest_user_reviews_pkey PRIMARY KEY (id);


--
-- Name: os_categories_house_manual_reviews os_categories_house_manual_reviews_name_key; Type: CONSTRAINT; Schema: reference_table; Owner: -
--

ALTER TABLE ONLY reference_table.os_categories_house_manual_reviews
    ADD CONSTRAINT os_categories_house_manual_reviews_name_key UNIQUE (name);


--
-- Name: os_categories_house_manual_reviews os_categories_house_manual_reviews_pkey; Type: CONSTRAINT; Schema: reference_table; Owner: -
--

ALTER TABLE ONLY reference_table.os_categories_house_manual_reviews
    ADD CONSTRAINT os_categories_house_manual_reviews_pkey PRIMARY KEY (id);


--
-- Name: os_categories_listings_reviews os_categories_listings_reviews_name_key; Type: CONSTRAINT; Schema: reference_table; Owner: -
--

ALTER TABLE ONLY reference_table.os_categories_listings_reviews
    ADD CONSTRAINT os_categories_listings_reviews_name_key UNIQUE (name);


--
-- Name: os_categories_listings_reviews os_categories_listings_reviews_pkey; Type: CONSTRAINT; Schema: reference_table; Owner: -
--

ALTER TABLE ONLY reference_table.os_categories_listings_reviews
    ADD CONSTRAINT os_categories_listings_reviews_pkey PRIMARY KEY (id);


--
-- Name: os_categories_stays_reviews os_categories_stays_reviews_name_key; Type: CONSTRAINT; Schema: reference_table; Owner: -
--

ALTER TABLE ONLY reference_table.os_categories_stays_reviews
    ADD CONSTRAINT os_categories_stays_reviews_name_key UNIQUE (name);


--
-- Name: os_categories_stays_reviews os_categories_stays_reviews_pkey; Type: CONSTRAINT; Schema: reference_table; Owner: -
--

ALTER TABLE ONLY reference_table.os_categories_stays_reviews
    ADD CONSTRAINT os_categories_stays_reviews_pkey PRIMARY KEY (id);


--
-- Name: os_chatgpt_models os_chatgpt_models_name_key; Type: CONSTRAINT; Schema: reference_table; Owner: -
--

ALTER TABLE ONLY reference_table.os_chatgpt_models
    ADD CONSTRAINT os_chatgpt_models_name_key UNIQUE (name);


--
-- Name: os_chatgpt_models os_chatgpt_models_pkey; Type: CONSTRAINT; Schema: reference_table; Owner: -
--

ALTER TABLE ONLY reference_table.os_chatgpt_models
    ADD CONSTRAINT os_chatgpt_models_pkey PRIMARY KEY (id);


--
-- Name: os_check_in_out_times os_check_in_out_times_name_key; Type: CONSTRAINT; Schema: reference_table; Owner: -
--

ALTER TABLE ONLY reference_table.os_check_in_out_times
    ADD CONSTRAINT os_check_in_out_times_name_key UNIQUE (name);


--
-- Name: os_check_in_out_times os_check_in_out_times_pkey; Type: CONSTRAINT; Schema: reference_table; Owner: -
--

ALTER TABLE ONLY reference_table.os_check_in_out_times
    ADD CONSTRAINT os_check_in_out_times_pkey PRIMARY KEY (id);


--
-- Name: os_co_host_status os_co_host_status_name_key; Type: CONSTRAINT; Schema: reference_table; Owner: -
--

ALTER TABLE ONLY reference_table.os_co_host_status
    ADD CONSTRAINT os_co_host_status_name_key UNIQUE (name);


--
-- Name: os_co_host_status os_co_host_status_pkey; Type: CONSTRAINT; Schema: reference_table; Owner: -
--

ALTER TABLE ONLY reference_table.os_co_host_status
    ADD CONSTRAINT os_co_host_status_pkey PRIMARY KEY (id);


--
-- Name: os_cohost_admins os_cohost_admins_name_key; Type: CONSTRAINT; Schema: reference_table; Owner: -
--

ALTER TABLE ONLY reference_table.os_cohost_admins
    ADD CONSTRAINT os_cohost_admins_name_key UNIQUE (name);


--
-- Name: os_cohost_admins os_cohost_admins_pkey; Type: CONSTRAINT; Schema: reference_table; Owner: -
--

ALTER TABLE ONLY reference_table.os_cohost_admins
    ADD CONSTRAINT os_cohost_admins_pkey PRIMARY KEY (id);


--
-- Name: os_color_palette os_color_palette_name_key; Type: CONSTRAINT; Schema: reference_table; Owner: -
--

ALTER TABLE ONLY reference_table.os_color_palette
    ADD CONSTRAINT os_color_palette_name_key UNIQUE (name);


--
-- Name: os_color_palette os_color_palette_pkey; Type: CONSTRAINT; Schema: reference_table; Owner: -
--

ALTER TABLE ONLY reference_table.os_color_palette
    ADD CONSTRAINT os_color_palette_pkey PRIMARY KEY (id);


--
-- Name: os_communication_preference os_communication_preference_display_key; Type: CONSTRAINT; Schema: reference_table; Owner: -
--

ALTER TABLE ONLY reference_table.os_communication_preference
    ADD CONSTRAINT os_communication_preference_display_key UNIQUE (display);


--
-- Name: os_communication_preference os_communication_preference_name_key; Type: CONSTRAINT; Schema: reference_table; Owner: -
--

ALTER TABLE ONLY reference_table.os_communication_preference
    ADD CONSTRAINT os_communication_preference_name_key UNIQUE (name);


--
-- Name: os_communication_preference os_communication_preference_pkey; Type: CONSTRAINT; Schema: reference_table; Owner: -
--

ALTER TABLE ONLY reference_table.os_communication_preference
    ADD CONSTRAINT os_communication_preference_pkey PRIMARY KEY (id);


--
-- Name: os_date_change_request_status os_date_change_request_status_name_key; Type: CONSTRAINT; Schema: reference_table; Owner: -
--

ALTER TABLE ONLY reference_table.os_date_change_request_status
    ADD CONSTRAINT os_date_change_request_status_name_key UNIQUE (name);


--
-- Name: os_date_change_request_status os_date_change_request_status_pkey; Type: CONSTRAINT; Schema: reference_table; Owner: -
--

ALTER TABLE ONLY reference_table.os_date_change_request_status
    ADD CONSTRAINT os_date_change_request_status_pkey PRIMARY KEY (id);


--
-- Name: os_days os_days_name_key; Type: CONSTRAINT; Schema: reference_table; Owner: -
--

ALTER TABLE ONLY reference_table.os_days
    ADD CONSTRAINT os_days_name_key UNIQUE (name);


--
-- Name: os_days os_days_pkey; Type: CONSTRAINT; Schema: reference_table; Owner: -
--

ALTER TABLE ONLY reference_table.os_days
    ADD CONSTRAINT os_days_pkey PRIMARY KEY (id);


--
-- Name: os_faq_type os_faq_type_name_key; Type: CONSTRAINT; Schema: reference_table; Owner: -
--

ALTER TABLE ONLY reference_table.os_faq_type
    ADD CONSTRAINT os_faq_type_name_key UNIQUE (name);


--
-- Name: os_faq_type os_faq_type_pkey; Type: CONSTRAINT; Schema: reference_table; Owner: -
--

ALTER TABLE ONLY reference_table.os_faq_type
    ADD CONSTRAINT os_faq_type_pkey PRIMARY KEY (id);


--
-- Name: os_gender_type os_gender_type_name_key; Type: CONSTRAINT; Schema: reference_table; Owner: -
--

ALTER TABLE ONLY reference_table.os_gender_type
    ADD CONSTRAINT os_gender_type_name_key UNIQUE (name);


--
-- Name: os_gender_type os_gender_type_pkey; Type: CONSTRAINT; Schema: reference_table; Owner: -
--

ALTER TABLE ONLY reference_table.os_gender_type
    ADD CONSTRAINT os_gender_type_pkey PRIMARY KEY (id);


--
-- Name: os_house_manual_audiences os_house_manual_audiences_name_key; Type: CONSTRAINT; Schema: reference_table; Owner: -
--

ALTER TABLE ONLY reference_table.os_house_manual_audiences
    ADD CONSTRAINT os_house_manual_audiences_name_key UNIQUE (name);


--
-- Name: os_house_manual_audiences os_house_manual_audiences_pkey; Type: CONSTRAINT; Schema: reference_table; Owner: -
--

ALTER TABLE ONLY reference_table.os_house_manual_audiences
    ADD CONSTRAINT os_house_manual_audiences_pkey PRIMARY KEY (id);


--
-- Name: os_ideal_split_preference os_ideal_split_preference_name_key; Type: CONSTRAINT; Schema: reference_table; Owner: -
--

ALTER TABLE ONLY reference_table.os_ideal_split_preference
    ADD CONSTRAINT os_ideal_split_preference_name_key UNIQUE (name);


--
-- Name: os_ideal_split_preference os_ideal_split_preference_pkey; Type: CONSTRAINT; Schema: reference_table; Owner: -
--

ALTER TABLE ONLY reference_table.os_ideal_split_preference
    ADD CONSTRAINT os_ideal_split_preference_pkey PRIMARY KEY (id);


--
-- Name: os_images os_images_name_key; Type: CONSTRAINT; Schema: reference_table; Owner: -
--

ALTER TABLE ONLY reference_table.os_images
    ADD CONSTRAINT os_images_name_key UNIQUE (name);


--
-- Name: os_images os_images_pkey; Type: CONSTRAINT; Schema: reference_table; Owner: -
--

ALTER TABLE ONLY reference_table.os_images
    ADD CONSTRAINT os_images_pkey PRIMARY KEY (id);


--
-- Name: os_important_errors os_important_errors_name_key; Type: CONSTRAINT; Schema: reference_table; Owner: -
--

ALTER TABLE ONLY reference_table.os_important_errors
    ADD CONSTRAINT os_important_errors_name_key UNIQUE (name);


--
-- Name: os_important_errors os_important_errors_pkey; Type: CONSTRAINT; Schema: reference_table; Owner: -
--

ALTER TABLE ONLY reference_table.os_important_errors
    ADD CONSTRAINT os_important_errors_pkey PRIMARY KEY (id);


--
-- Name: os_jingles os_jingles_name_key; Type: CONSTRAINT; Schema: reference_table; Owner: -
--

ALTER TABLE ONLY reference_table.os_jingles
    ADD CONSTRAINT os_jingles_name_key UNIQUE (name);


--
-- Name: os_jingles os_jingles_pkey; Type: CONSTRAINT; Schema: reference_table; Owner: -
--

ALTER TABLE ONLY reference_table.os_jingles
    ADD CONSTRAINT os_jingles_pkey PRIMARY KEY (id);


--
-- Name: os_kitchen_type os_kitchen_type_display_key; Type: CONSTRAINT; Schema: reference_table; Owner: -
--

ALTER TABLE ONLY reference_table.os_kitchen_type
    ADD CONSTRAINT os_kitchen_type_display_key UNIQUE (display);


--
-- Name: os_kitchen_type os_kitchen_type_name_key; Type: CONSTRAINT; Schema: reference_table; Owner: -
--

ALTER TABLE ONLY reference_table.os_kitchen_type
    ADD CONSTRAINT os_kitchen_type_name_key UNIQUE (name);


--
-- Name: os_kitchen_type os_kitchen_type_pkey; Type: CONSTRAINT; Schema: reference_table; Owner: -
--

ALTER TABLE ONLY reference_table.os_kitchen_type
    ADD CONSTRAINT os_kitchen_type_pkey PRIMARY KEY (id);


--
-- Name: os_language os_language_name_key; Type: CONSTRAINT; Schema: reference_table; Owner: -
--

ALTER TABLE ONLY reference_table.os_language
    ADD CONSTRAINT os_language_name_key UNIQUE (name);


--
-- Name: os_language os_language_pkey; Type: CONSTRAINT; Schema: reference_table; Owner: -
--

ALTER TABLE ONLY reference_table.os_language
    ADD CONSTRAINT os_language_pkey PRIMARY KEY (id);


--
-- Name: os_lease_status os_lease_status_name_key; Type: CONSTRAINT; Schema: reference_table; Owner: -
--

ALTER TABLE ONLY reference_table.os_lease_status
    ADD CONSTRAINT os_lease_status_name_key UNIQUE (name);


--
-- Name: os_lease_status os_lease_status_pkey; Type: CONSTRAINT; Schema: reference_table; Owner: -
--

ALTER TABLE ONLY reference_table.os_lease_status
    ADD CONSTRAINT os_lease_status_pkey PRIMARY KEY (id);


--
-- Name: os_legal_page_type os_legal_page_type_name_key; Type: CONSTRAINT; Schema: reference_table; Owner: -
--

ALTER TABLE ONLY reference_table.os_legal_page_type
    ADD CONSTRAINT os_legal_page_type_name_key UNIQUE (name);


--
-- Name: os_legal_page_type os_legal_page_type_pkey; Type: CONSTRAINT; Schema: reference_table; Owner: -
--

ALTER TABLE ONLY reference_table.os_legal_page_type
    ADD CONSTRAINT os_legal_page_type_pkey PRIMARY KEY (id);


--
-- Name: os_listing_photo_type os_listing_photo_type_name_key; Type: CONSTRAINT; Schema: reference_table; Owner: -
--

ALTER TABLE ONLY reference_table.os_listing_photo_type
    ADD CONSTRAINT os_listing_photo_type_name_key UNIQUE (name);


--
-- Name: os_listing_photo_type os_listing_photo_type_pkey; Type: CONSTRAINT; Schema: reference_table; Owner: -
--

ALTER TABLE ONLY reference_table.os_listing_photo_type
    ADD CONSTRAINT os_listing_photo_type_pkey PRIMARY KEY (id);


--
-- Name: os_logos os_logos_name_key; Type: CONSTRAINT; Schema: reference_table; Owner: -
--

ALTER TABLE ONLY reference_table.os_logos
    ADD CONSTRAINT os_logos_name_key UNIQUE (name);


--
-- Name: os_logos os_logos_pkey; Type: CONSTRAINT; Schema: reference_table; Owner: -
--

ALTER TABLE ONLY reference_table.os_logos
    ADD CONSTRAINT os_logos_pkey PRIMARY KEY (id);


--
-- Name: os_melodies os_melodies_name_key; Type: CONSTRAINT; Schema: reference_table; Owner: -
--

ALTER TABLE ONLY reference_table.os_melodies
    ADD CONSTRAINT os_melodies_name_key UNIQUE (name);


--
-- Name: os_melodies os_melodies_pkey; Type: CONSTRAINT; Schema: reference_table; Owner: -
--

ALTER TABLE ONLY reference_table.os_melodies
    ADD CONSTRAINT os_melodies_pkey PRIMARY KEY (id);


--
-- Name: os_messaging_cta os_messaging_cta_display_key; Type: CONSTRAINT; Schema: reference_table; Owner: -
--

ALTER TABLE ONLY reference_table.os_messaging_cta
    ADD CONSTRAINT os_messaging_cta_display_key UNIQUE (display);


--
-- Name: os_messaging_cta os_messaging_cta_name_key; Type: CONSTRAINT; Schema: reference_table; Owner: -
--

ALTER TABLE ONLY reference_table.os_messaging_cta
    ADD CONSTRAINT os_messaging_cta_name_key UNIQUE (name);


--
-- Name: os_messaging_cta os_messaging_cta_pkey; Type: CONSTRAINT; Schema: reference_table; Owner: -
--

ALTER TABLE ONLY reference_table.os_messaging_cta
    ADD CONSTRAINT os_messaging_cta_pkey PRIMARY KEY (id);


--
-- Name: os_modality os_modality_name_key; Type: CONSTRAINT; Schema: reference_table; Owner: -
--

ALTER TABLE ONLY reference_table.os_modality
    ADD CONSTRAINT os_modality_name_key UNIQUE (name);


--
-- Name: os_modality os_modality_pkey; Type: CONSTRAINT; Schema: reference_table; Owner: -
--

ALTER TABLE ONLY reference_table.os_modality
    ADD CONSTRAINT os_modality_pkey PRIMARY KEY (id);


--
-- Name: os_multi_message_status os_multi_message_status_name_key; Type: CONSTRAINT; Schema: reference_table; Owner: -
--

ALTER TABLE ONLY reference_table.os_multi_message_status
    ADD CONSTRAINT os_multi_message_status_name_key UNIQUE (name);


--
-- Name: os_multi_message_status os_multi_message_status_pkey; Type: CONSTRAINT; Schema: reference_table; Owner: -
--

ALTER TABLE ONLY reference_table.os_multi_message_status
    ADD CONSTRAINT os_multi_message_status_pkey PRIMARY KEY (id);


--
-- Name: os_name_mapping os_name_mapping_bubble_name_key; Type: CONSTRAINT; Schema: reference_table; Owner: -
--

ALTER TABLE ONLY reference_table.os_name_mapping
    ADD CONSTRAINT os_name_mapping_bubble_name_key UNIQUE (bubble_name);


--
-- Name: os_name_mapping os_name_mapping_pkey; Type: CONSTRAINT; Schema: reference_table; Owner: -
--

ALTER TABLE ONLY reference_table.os_name_mapping
    ADD CONSTRAINT os_name_mapping_pkey PRIMARY KEY (id);


--
-- Name: os_narrators os_narrators_name_key; Type: CONSTRAINT; Schema: reference_table; Owner: -
--

ALTER TABLE ONLY reference_table.os_narrators
    ADD CONSTRAINT os_narrators_name_key UNIQUE (name);


--
-- Name: os_narrators os_narrators_pkey; Type: CONSTRAINT; Schema: reference_table; Owner: -
--

ALTER TABLE ONLY reference_table.os_narrators
    ADD CONSTRAINT os_narrators_pkey PRIMARY KEY (id);


--
-- Name: os_nights os_nights_name_key; Type: CONSTRAINT; Schema: reference_table; Owner: -
--

ALTER TABLE ONLY reference_table.os_nights
    ADD CONSTRAINT os_nights_name_key UNIQUE (name);


--
-- Name: os_nights os_nights_pkey; Type: CONSTRAINT; Schema: reference_table; Owner: -
--

ALTER TABLE ONLY reference_table.os_nights
    ADD CONSTRAINT os_nights_pkey PRIMARY KEY (id);


--
-- Name: os_pages os_pages_name_key; Type: CONSTRAINT; Schema: reference_table; Owner: -
--

ALTER TABLE ONLY reference_table.os_pages
    ADD CONSTRAINT os_pages_name_key UNIQUE (name);


--
-- Name: os_pages os_pages_pkey; Type: CONSTRAINT; Schema: reference_table; Owner: -
--

ALTER TABLE ONLY reference_table.os_pages
    ADD CONSTRAINT os_pages_pkey PRIMARY KEY (id);


--
-- Name: os_personas os_personas_name_key; Type: CONSTRAINT; Schema: reference_table; Owner: -
--

ALTER TABLE ONLY reference_table.os_personas
    ADD CONSTRAINT os_personas_name_key UNIQUE (name);


--
-- Name: os_personas os_personas_pkey; Type: CONSTRAINT; Schema: reference_table; Owner: -
--

ALTER TABLE ONLY reference_table.os_personas
    ADD CONSTRAINT os_personas_pkey PRIMARY KEY (id);


--
-- Name: os_photo_evidence_type os_photo_evidence_type_name_key; Type: CONSTRAINT; Schema: reference_table; Owner: -
--

ALTER TABLE ONLY reference_table.os_photo_evidence_type
    ADD CONSTRAINT os_photo_evidence_type_name_key UNIQUE (name);


--
-- Name: os_photo_evidence_type os_photo_evidence_type_pkey; Type: CONSTRAINT; Schema: reference_table; Owner: -
--

ALTER TABLE ONLY reference_table.os_photo_evidence_type
    ADD CONSTRAINT os_photo_evidence_type_pkey PRIMARY KEY (id);


--
-- Name: os_postmark_webhook os_postmark_webhook_name_key; Type: CONSTRAINT; Schema: reference_table; Owner: -
--

ALTER TABLE ONLY reference_table.os_postmark_webhook
    ADD CONSTRAINT os_postmark_webhook_name_key UNIQUE (name);


--
-- Name: os_postmark_webhook os_postmark_webhook_pkey; Type: CONSTRAINT; Schema: reference_table; Owner: -
--

ALTER TABLE ONLY reference_table.os_postmark_webhook
    ADD CONSTRAINT os_postmark_webhook_pkey PRIMARY KEY (id);


--
-- Name: os_price_filter os_price_filter_display_key; Type: CONSTRAINT; Schema: reference_table; Owner: -
--

ALTER TABLE ONLY reference_table.os_price_filter
    ADD CONSTRAINT os_price_filter_display_key UNIQUE (display);


--
-- Name: os_price_filter os_price_filter_name_key; Type: CONSTRAINT; Schema: reference_table; Owner: -
--

ALTER TABLE ONLY reference_table.os_price_filter
    ADD CONSTRAINT os_price_filter_name_key UNIQUE (name);


--
-- Name: os_price_filter os_price_filter_pkey; Type: CONSTRAINT; Schema: reference_table; Owner: -
--

ALTER TABLE ONLY reference_table.os_price_filter
    ADD CONSTRAINT os_price_filter_pkey PRIMARY KEY (id);


--
-- Name: os_prompts os_prompts_name_key; Type: CONSTRAINT; Schema: reference_table; Owner: -
--

ALTER TABLE ONLY reference_table.os_prompts
    ADD CONSTRAINT os_prompts_name_key UNIQUE (name);


--
-- Name: os_prompts os_prompts_pkey; Type: CONSTRAINT; Schema: reference_table; Owner: -
--

ALTER TABLE ONLY reference_table.os_prompts
    ADD CONSTRAINT os_prompts_pkey PRIMARY KEY (id);


--
-- Name: os_proposal_status os_proposal_status_display_key; Type: CONSTRAINT; Schema: reference_table; Owner: -
--

ALTER TABLE ONLY reference_table.os_proposal_status
    ADD CONSTRAINT os_proposal_status_display_key UNIQUE (display);


--
-- Name: os_proposal_status os_proposal_status_pkey; Type: CONSTRAINT; Schema: reference_table; Owner: -
--

ALTER TABLE ONLY reference_table.os_proposal_status
    ADD CONSTRAINT os_proposal_status_pkey PRIMARY KEY (id, display);


--
-- Name: os_proxy_sms_channels os_proxy_sms_channels_name_key; Type: CONSTRAINT; Schema: reference_table; Owner: -
--

ALTER TABLE ONLY reference_table.os_proxy_sms_channels
    ADD CONSTRAINT os_proxy_sms_channels_name_key UNIQUE (name);


--
-- Name: os_proxy_sms_channels os_proxy_sms_channels_pkey; Type: CONSTRAINT; Schema: reference_table; Owner: -
--

ALTER TABLE ONLY reference_table.os_proxy_sms_channels
    ADD CONSTRAINT os_proxy_sms_channels_pkey PRIMARY KEY (id);


--
-- Name: os_qr_code_use_cases os_qr_code_use_cases_name_key; Type: CONSTRAINT; Schema: reference_table; Owner: -
--

ALTER TABLE ONLY reference_table.os_qr_code_use_cases
    ADD CONSTRAINT os_qr_code_use_cases_name_key UNIQUE (name);


--
-- Name: os_qr_code_use_cases os_qr_code_use_cases_pkey; Type: CONSTRAINT; Schema: reference_table; Owner: -
--

ALTER TABLE ONLY reference_table.os_qr_code_use_cases
    ADD CONSTRAINT os_qr_code_use_cases_pkey PRIMARY KEY (id);


--
-- Name: os_qty_guests os_qty_guests_name_key; Type: CONSTRAINT; Schema: reference_table; Owner: -
--

ALTER TABLE ONLY reference_table.os_qty_guests
    ADD CONSTRAINT os_qty_guests_name_key UNIQUE (name);


--
-- Name: os_qty_guests os_qty_guests_pkey; Type: CONSTRAINT; Schema: reference_table; Owner: -
--

ALTER TABLE ONLY reference_table.os_qty_guests
    ADD CONSTRAINT os_qty_guests_pkey PRIMARY KEY (id);


--
-- Name: os_receipt os_receipt_name_key; Type: CONSTRAINT; Schema: reference_table; Owner: -
--

ALTER TABLE ONLY reference_table.os_receipt
    ADD CONSTRAINT os_receipt_name_key UNIQUE (name);


--
-- Name: os_receipt os_receipt_pkey; Type: CONSTRAINT; Schema: reference_table; Owner: -
--

ALTER TABLE ONLY reference_table.os_receipt
    ADD CONSTRAINT os_receipt_pkey PRIMARY KEY (id);


--
-- Name: os_referral_contact_methods os_referral_contact_methods_name_key; Type: CONSTRAINT; Schema: reference_table; Owner: -
--

ALTER TABLE ONLY reference_table.os_referral_contact_methods
    ADD CONSTRAINT os_referral_contact_methods_name_key UNIQUE (name);


--
-- Name: os_referral_contact_methods os_referral_contact_methods_pkey; Type: CONSTRAINT; Schema: reference_table; Owner: -
--

ALTER TABLE ONLY reference_table.os_referral_contact_methods
    ADD CONSTRAINT os_referral_contact_methods_pkey PRIMARY KEY (id);


--
-- Name: os_reminder_type os_reminder_type_name_key; Type: CONSTRAINT; Schema: reference_table; Owner: -
--

ALTER TABLE ONLY reference_table.os_reminder_type
    ADD CONSTRAINT os_reminder_type_name_key UNIQUE (name);


--
-- Name: os_reminder_type os_reminder_type_pkey; Type: CONSTRAINT; Schema: reference_table; Owner: -
--

ALTER TABLE ONLY reference_table.os_reminder_type
    ADD CONSTRAINT os_reminder_type_pkey PRIMARY KEY (id);


--
-- Name: os_rental_type os_rental_type_display_key; Type: CONSTRAINT; Schema: reference_table; Owner: -
--

ALTER TABLE ONLY reference_table.os_rental_type
    ADD CONSTRAINT os_rental_type_display_key UNIQUE (display);


--
-- Name: os_rental_type os_rental_type_name_key; Type: CONSTRAINT; Schema: reference_table; Owner: -
--

ALTER TABLE ONLY reference_table.os_rental_type
    ADD CONSTRAINT os_rental_type_name_key UNIQUE (name);


--
-- Name: os_rental_type os_rental_type_pkey; Type: CONSTRAINT; Schema: reference_table; Owner: -
--

ALTER TABLE ONLY reference_table.os_rental_type
    ADD CONSTRAINT os_rental_type_pkey PRIMARY KEY (id);


--
-- Name: os_review_guest_questions os_review_guest_questions_name_key; Type: CONSTRAINT; Schema: reference_table; Owner: -
--

ALTER TABLE ONLY reference_table.os_review_guest_questions
    ADD CONSTRAINT os_review_guest_questions_name_key UNIQUE (name);


--
-- Name: os_review_guest_questions os_review_guest_questions_pkey; Type: CONSTRAINT; Schema: reference_table; Owner: -
--

ALTER TABLE ONLY reference_table.os_review_guest_questions
    ADD CONSTRAINT os_review_guest_questions_pkey PRIMARY KEY (id);


--
-- Name: os_review_host_questions os_review_host_questions_name_key; Type: CONSTRAINT; Schema: reference_table; Owner: -
--

ALTER TABLE ONLY reference_table.os_review_host_questions
    ADD CONSTRAINT os_review_host_questions_name_key UNIQUE (name);


--
-- Name: os_review_host_questions os_review_host_questions_pkey; Type: CONSTRAINT; Schema: reference_table; Owner: -
--

ALTER TABLE ONLY reference_table.os_review_host_questions
    ADD CONSTRAINT os_review_host_questions_pkey PRIMARY KEY (id);


--
-- Name: os_review_type os_review_type_name_key; Type: CONSTRAINT; Schema: reference_table; Owner: -
--

ALTER TABLE ONLY reference_table.os_review_type
    ADD CONSTRAINT os_review_type_name_key UNIQUE (name);


--
-- Name: os_review_type os_review_type_pkey; Type: CONSTRAINT; Schema: reference_table; Owner: -
--

ALTER TABLE ONLY reference_table.os_review_type
    ADD CONSTRAINT os_review_type_pkey PRIMARY KEY (id);


--
-- Name: os_room_styles os_room_styles_name_key; Type: CONSTRAINT; Schema: reference_table; Owner: -
--

ALTER TABLE ONLY reference_table.os_room_styles
    ADD CONSTRAINT os_room_styles_name_key UNIQUE (name);


--
-- Name: os_room_styles os_room_styles_pkey; Type: CONSTRAINT; Schema: reference_table; Owner: -
--

ALTER TABLE ONLY reference_table.os_room_styles
    ADD CONSTRAINT os_room_styles_pkey PRIMARY KEY (id);


--
-- Name: os_roommates os_roommates_name_key; Type: CONSTRAINT; Schema: reference_table; Owner: -
--

ALTER TABLE ONLY reference_table.os_roommates
    ADD CONSTRAINT os_roommates_name_key UNIQUE (name);


--
-- Name: os_roommates os_roommates_pkey; Type: CONSTRAINT; Schema: reference_table; Owner: -
--

ALTER TABLE ONLY reference_table.os_roommates
    ADD CONSTRAINT os_roommates_pkey PRIMARY KEY (id);


--
-- Name: os_schedule_selection_types os_schedule_selection_types_name_key; Type: CONSTRAINT; Schema: reference_table; Owner: -
--

ALTER TABLE ONLY reference_table.os_schedule_selection_types
    ADD CONSTRAINT os_schedule_selection_types_name_key UNIQUE (name);


--
-- Name: os_schedule_selection_types os_schedule_selection_types_pkey; Type: CONSTRAINT; Schema: reference_table; Owner: -
--

ALTER TABLE ONLY reference_table.os_schedule_selection_types
    ADD CONSTRAINT os_schedule_selection_types_pkey PRIMARY KEY (id);


--
-- Name: os_screen_size os_screen_size_name_key; Type: CONSTRAINT; Schema: reference_table; Owner: -
--

ALTER TABLE ONLY reference_table.os_screen_size
    ADD CONSTRAINT os_screen_size_name_key UNIQUE (name);


--
-- Name: os_screen_size os_screen_size_pkey; Type: CONSTRAINT; Schema: reference_table; Owner: -
--

ALTER TABLE ONLY reference_table.os_screen_size
    ADD CONSTRAINT os_screen_size_pkey PRIMARY KEY (id);


--
-- Name: os_slack_channels os_slack_channels_name_key; Type: CONSTRAINT; Schema: reference_table; Owner: -
--

ALTER TABLE ONLY reference_table.os_slack_channels
    ADD CONSTRAINT os_slack_channels_name_key UNIQUE (name);


--
-- Name: os_slack_channels os_slack_channels_pkey; Type: CONSTRAINT; Schema: reference_table; Owner: -
--

ALTER TABLE ONLY reference_table.os_slack_channels
    ADD CONSTRAINT os_slack_channels_pkey PRIMARY KEY (id);


--
-- Name: os_slack_webhooks os_slack_webhooks_name_key; Type: CONSTRAINT; Schema: reference_table; Owner: -
--

ALTER TABLE ONLY reference_table.os_slack_webhooks
    ADD CONSTRAINT os_slack_webhooks_name_key UNIQUE (name);


--
-- Name: os_slack_webhooks os_slack_webhooks_pkey; Type: CONSTRAINT; Schema: reference_table; Owner: -
--

ALTER TABLE ONLY reference_table.os_slack_webhooks
    ADD CONSTRAINT os_slack_webhooks_pkey PRIMARY KEY (id);


--
-- Name: os_sort_by_properties_search os_sort_by_properties_search_name_key; Type: CONSTRAINT; Schema: reference_table; Owner: -
--

ALTER TABLE ONLY reference_table.os_sort_by_properties_search
    ADD CONSTRAINT os_sort_by_properties_search_name_key UNIQUE (name);


--
-- Name: os_sort_by_properties_search os_sort_by_properties_search_pkey; Type: CONSTRAINT; Schema: reference_table; Owner: -
--

ALTER TABLE ONLY reference_table.os_sort_by_properties_search
    ADD CONSTRAINT os_sort_by_properties_search_pkey PRIMARY KEY (id);


--
-- Name: os_space_type os_space_type_name_key; Type: CONSTRAINT; Schema: reference_table; Owner: -
--

ALTER TABLE ONLY reference_table.os_space_type
    ADD CONSTRAINT os_space_type_name_key UNIQUE (name);


--
-- Name: os_space_type os_space_type_pkey; Type: CONSTRAINT; Schema: reference_table; Owner: -
--

ALTER TABLE ONLY reference_table.os_space_type
    ADD CONSTRAINT os_space_type_pkey PRIMARY KEY (id);


--
-- Name: os_split_lease_config os_split_lease_config_name_key; Type: CONSTRAINT; Schema: reference_table; Owner: -
--

ALTER TABLE ONLY reference_table.os_split_lease_config
    ADD CONSTRAINT os_split_lease_config_name_key UNIQUE (name);


--
-- Name: os_split_lease_config os_split_lease_config_pkey; Type: CONSTRAINT; Schema: reference_table; Owner: -
--

ALTER TABLE ONLY reference_table.os_split_lease_config
    ADD CONSTRAINT os_split_lease_config_pkey PRIMARY KEY (id);


--
-- Name: os_stay_periods os_stay_periods_name_key; Type: CONSTRAINT; Schema: reference_table; Owner: -
--

ALTER TABLE ONLY reference_table.os_stay_periods
    ADD CONSTRAINT os_stay_periods_name_key UNIQUE (name);


--
-- Name: os_stay_periods os_stay_periods_pkey; Type: CONSTRAINT; Schema: reference_table; Owner: -
--

ALTER TABLE ONLY reference_table.os_stay_periods
    ADD CONSTRAINT os_stay_periods_pkey PRIMARY KEY (id);


--
-- Name: os_stay_status os_stay_status_name_key; Type: CONSTRAINT; Schema: reference_table; Owner: -
--

ALTER TABLE ONLY reference_table.os_stay_status
    ADD CONSTRAINT os_stay_status_name_key UNIQUE (name);


--
-- Name: os_stay_status os_stay_status_pkey; Type: CONSTRAINT; Schema: reference_table; Owner: -
--

ALTER TABLE ONLY reference_table.os_stay_status
    ADD CONSTRAINT os_stay_status_pkey PRIMARY KEY (id);


--
-- Name: os_storage_parking_type os_storage_parking_type_name_key; Type: CONSTRAINT; Schema: reference_table; Owner: -
--

ALTER TABLE ONLY reference_table.os_storage_parking_type
    ADD CONSTRAINT os_storage_parking_type_name_key UNIQUE (name);


--
-- Name: os_storage_parking_type os_storage_parking_type_pkey; Type: CONSTRAINT; Schema: reference_table; Owner: -
--

ALTER TABLE ONLY reference_table.os_storage_parking_type
    ADD CONSTRAINT os_storage_parking_type_pkey PRIMARY KEY (id);


--
-- Name: os_task_load os_task_load_name_key; Type: CONSTRAINT; Schema: reference_table; Owner: -
--

ALTER TABLE ONLY reference_table.os_task_load
    ADD CONSTRAINT os_task_load_name_key UNIQUE (name);


--
-- Name: os_task_load os_task_load_pkey; Type: CONSTRAINT; Schema: reference_table; Owner: -
--

ALTER TABLE ONLY reference_table.os_task_load
    ADD CONSTRAINT os_task_load_pkey PRIMARY KEY (id);


--
-- Name: os_twilio_numbers os_twilio_numbers_name_key; Type: CONSTRAINT; Schema: reference_table; Owner: -
--

ALTER TABLE ONLY reference_table.os_twilio_numbers
    ADD CONSTRAINT os_twilio_numbers_name_key UNIQUE (name);


--
-- Name: os_twilio_numbers os_twilio_numbers_pkey; Type: CONSTRAINT; Schema: reference_table; Owner: -
--

ALTER TABLE ONLY reference_table.os_twilio_numbers
    ADD CONSTRAINT os_twilio_numbers_pkey PRIMARY KEY (id);


--
-- Name: os_ui_icons os_ui_icons_name_key; Type: CONSTRAINT; Schema: reference_table; Owner: -
--

ALTER TABLE ONLY reference_table.os_ui_icons
    ADD CONSTRAINT os_ui_icons_name_key UNIQUE (name);


--
-- Name: os_ui_icons os_ui_icons_pkey; Type: CONSTRAINT; Schema: reference_table; Owner: -
--

ALTER TABLE ONLY reference_table.os_ui_icons
    ADD CONSTRAINT os_ui_icons_pkey PRIMARY KEY (id);


--
-- Name: os_us_states os_us_states_display_key; Type: CONSTRAINT; Schema: reference_table; Owner: -
--

ALTER TABLE ONLY reference_table.os_us_states
    ADD CONSTRAINT os_us_states_display_key UNIQUE (display);


--
-- Name: os_us_states os_us_states_name_key; Type: CONSTRAINT; Schema: reference_table; Owner: -
--

ALTER TABLE ONLY reference_table.os_us_states
    ADD CONSTRAINT os_us_states_name_key UNIQUE (name);


--
-- Name: os_us_states os_us_states_pkey; Type: CONSTRAINT; Schema: reference_table; Owner: -
--

ALTER TABLE ONLY reference_table.os_us_states
    ADD CONSTRAINT os_us_states_pkey PRIMARY KEY (id);


--
-- Name: os_user_subtype os_user_subtype_name_key; Type: CONSTRAINT; Schema: reference_table; Owner: -
--

ALTER TABLE ONLY reference_table.os_user_subtype
    ADD CONSTRAINT os_user_subtype_name_key UNIQUE (name);


--
-- Name: os_user_subtype os_user_subtype_pkey; Type: CONSTRAINT; Schema: reference_table; Owner: -
--

ALTER TABLE ONLY reference_table.os_user_subtype
    ADD CONSTRAINT os_user_subtype_pkey PRIMARY KEY (id);


--
-- Name: os_user_type os_user_type_display_key; Type: CONSTRAINT; Schema: reference_table; Owner: -
--

ALTER TABLE ONLY reference_table.os_user_type
    ADD CONSTRAINT os_user_type_display_key UNIQUE (display);


--
-- Name: os_user_type os_user_type_name_key; Type: CONSTRAINT; Schema: reference_table; Owner: -
--

ALTER TABLE ONLY reference_table.os_user_type
    ADD CONSTRAINT os_user_type_name_key UNIQUE (name);


--
-- Name: os_user_type os_user_type_pkey; Type: CONSTRAINT; Schema: reference_table; Owner: -
--

ALTER TABLE ONLY reference_table.os_user_type
    ADD CONSTRAINT os_user_type_pkey PRIMARY KEY (id, display);


--
-- Name: os_video_animations os_video_animations_name_key; Type: CONSTRAINT; Schema: reference_table; Owner: -
--

ALTER TABLE ONLY reference_table.os_video_animations
    ADD CONSTRAINT os_video_animations_name_key UNIQUE (name);


--
-- Name: os_video_animations os_video_animations_pkey; Type: CONSTRAINT; Schema: reference_table; Owner: -
--

ALTER TABLE ONLY reference_table.os_video_animations
    ADD CONSTRAINT os_video_animations_pkey PRIMARY KEY (id);


--
-- Name: os_virtual_meeting_times os_virtual_meeting_times_name_key; Type: CONSTRAINT; Schema: reference_table; Owner: -
--

ALTER TABLE ONLY reference_table.os_virtual_meeting_times
    ADD CONSTRAINT os_virtual_meeting_times_name_key UNIQUE (name);


--
-- Name: os_virtual_meeting_times os_virtual_meeting_times_pkey; Type: CONSTRAINT; Schema: reference_table; Owner: -
--

ALTER TABLE ONLY reference_table.os_virtual_meeting_times
    ADD CONSTRAINT os_virtual_meeting_times_pkey PRIMARY KEY (id);


--
-- Name: os_weekly_selection_options os_weekly_selection_options_display_key; Type: CONSTRAINT; Schema: reference_table; Owner: -
--

ALTER TABLE ONLY reference_table.os_weekly_selection_options
    ADD CONSTRAINT os_weekly_selection_options_display_key UNIQUE (display);


--
-- Name: os_weekly_selection_options os_weekly_selection_options_name_key; Type: CONSTRAINT; Schema: reference_table; Owner: -
--

ALTER TABLE ONLY reference_table.os_weekly_selection_options
    ADD CONSTRAINT os_weekly_selection_options_name_key UNIQUE (name);


--
-- Name: os_weekly_selection_options os_weekly_selection_options_pkey; Type: CONSTRAINT; Schema: reference_table; Owner: -
--

ALTER TABLE ONLY reference_table.os_weekly_selection_options
    ADD CONSTRAINT os_weekly_selection_options_pkey PRIMARY KEY (id);


--
-- Name: os_zep_curation_parameters os_zep_curation_parameters_name_key; Type: CONSTRAINT; Schema: reference_table; Owner: -
--

ALTER TABLE ONLY reference_table.os_zep_curation_parameters
    ADD CONSTRAINT os_zep_curation_parameters_name_key UNIQUE (name);


--
-- Name: os_zep_curation_parameters os_zep_curation_parameters_pkey; Type: CONSTRAINT; Schema: reference_table; Owner: -
--

ALTER TABLE ONLY reference_table.os_zep_curation_parameters
    ADD CONSTRAINT os_zep_curation_parameters_pkey PRIMARY KEY (id);


--
-- Name: os_proposal_status proposal_statuses_name_key; Type: CONSTRAINT; Schema: reference_table; Owner: -
--

ALTER TABLE ONLY reference_table.os_proposal_status
    ADD CONSTRAINT proposal_statuses_name_key UNIQUE (name);


--
-- Name: zat_email_html_template_eg_sendbasicemailwf_ zat_email_html_template_eg_sendbasicemailwf__Name_key; Type: CONSTRAINT; Schema: reference_table; Owner: -
--

ALTER TABLE ONLY reference_table.zat_email_html_template_eg_sendbasicemailwf_
    ADD CONSTRAINT "zat_email_html_template_eg_sendbasicemailwf__Name_key" UNIQUE ("Name");


--
-- Name: zat_email_html_template_eg_sendbasicemailwf_ zat_email_html_template_eg_sendbasicemailwf__pkey; Type: CONSTRAINT; Schema: reference_table; Owner: -
--

ALTER TABLE ONLY reference_table.zat_email_html_template_eg_sendbasicemailwf_
    ADD CONSTRAINT zat_email_html_template_eg_sendbasicemailwf__pkey PRIMARY KEY (_id);


--
-- Name: zat_faq zat_faq_pkey; Type: CONSTRAINT; Schema: reference_table; Owner: -
--

ALTER TABLE ONLY reference_table.zat_faq
    ADD CONSTRAINT zat_faq_pkey PRIMARY KEY (_id);


--
-- Name: zat_features_cancellationpolicy zat_features_cancellationpolicy_pkey; Type: CONSTRAINT; Schema: reference_table; Owner: -
--

ALTER TABLE ONLY reference_table.zat_features_cancellationpolicy
    ADD CONSTRAINT zat_features_cancellationpolicy_pkey PRIMARY KEY (_id);


--
-- Name: zat_features_houserule zat_features_houserule_pkey; Type: CONSTRAINT; Schema: reference_table; Owner: -
--

ALTER TABLE ONLY reference_table.zat_features_houserule
    ADD CONSTRAINT zat_features_houserule_pkey PRIMARY KEY (_id);


--
-- Name: zat_features_listingtype zat_features_listingtype_pkey; Type: CONSTRAINT; Schema: reference_table; Owner: -
--

ALTER TABLE ONLY reference_table.zat_features_listingtype
    ADD CONSTRAINT zat_features_listingtype_pkey PRIMARY KEY (_id);


--
-- Name: zat_features_parkingoptions zat_features_parkingoptions_pkey; Type: CONSTRAINT; Schema: reference_table; Owner: -
--

ALTER TABLE ONLY reference_table.zat_features_parkingoptions
    ADD CONSTRAINT zat_features_parkingoptions_pkey PRIMARY KEY (_id);


--
-- Name: zat_features_safetyfeature zat_features_safetyfeature_pkey; Type: CONSTRAINT; Schema: reference_table; Owner: -
--

ALTER TABLE ONLY reference_table.zat_features_safetyfeature
    ADD CONSTRAINT zat_features_safetyfeature_pkey PRIMARY KEY (_id);


--
-- Name: zat_features_storageoptions zat_features_storageoptions_pkey; Type: CONSTRAINT; Schema: reference_table; Owner: -
--

ALTER TABLE ONLY reference_table.zat_features_storageoptions
    ADD CONSTRAINT zat_features_storageoptions_pkey PRIMARY KEY (_id);


--
-- Name: zat_geo_borough_toplevel zat_geo_borough_toplevel_pkey; Type: CONSTRAINT; Schema: reference_table; Owner: -
--

ALTER TABLE ONLY reference_table.zat_geo_borough_toplevel
    ADD CONSTRAINT zat_geo_borough_toplevel_pkey PRIMARY KEY (_id);


--
-- Name: zat_geo_hood_mediumlevel zat_geo_hood_mediumlevel_pkey; Type: CONSTRAINT; Schema: reference_table; Owner: -
--

ALTER TABLE ONLY reference_table.zat_geo_hood_mediumlevel
    ADD CONSTRAINT zat_geo_hood_mediumlevel_pkey PRIMARY KEY (_id);


--
-- Name: zat_goodguestreasons zat_goodguestreasons_pkey; Type: CONSTRAINT; Schema: reference_table; Owner: -
--

ALTER TABLE ONLY reference_table.zat_goodguestreasons
    ADD CONSTRAINT zat_goodguestreasons_pkey PRIMARY KEY (_id);


--
-- Name: zat_htmlembed zat_htmlembed_pkey; Type: CONSTRAINT; Schema: reference_table; Owner: -
--

ALTER TABLE ONLY reference_table.zat_htmlembed
    ADD CONSTRAINT zat_htmlembed_pkey PRIMARY KEY (_id);


--
-- Name: zat_location zat_location_pkey; Type: CONSTRAINT; Schema: reference_table; Owner: -
--

ALTER TABLE ONLY reference_table.zat_location
    ADD CONSTRAINT zat_location_pkey PRIMARY KEY (_id);


--
-- Name: zat_policiesdocuments zat_policiesdocuments_pkey; Type: CONSTRAINT; Schema: reference_table; Owner: -
--

ALTER TABLE ONLY reference_table.zat_policiesdocuments
    ADD CONSTRAINT zat_policiesdocuments_pkey PRIMARY KEY (_id);


--
-- Name: zat_priceconfiguration zat_priceconfiguration_pkey; Type: CONSTRAINT; Schema: reference_table; Owner: -
--

ALTER TABLE ONLY reference_table.zat_priceconfiguration
    ADD CONSTRAINT zat_priceconfiguration_pkey PRIMARY KEY (_id);


--
-- Name: zat_splitleaseteam zat_splitleaseteam_pkey; Type: CONSTRAINT; Schema: reference_table; Owner: -
--

ALTER TABLE ONLY reference_table.zat_splitleaseteam
    ADD CONSTRAINT zat_splitleaseteam_pkey PRIMARY KEY (_id);


--
-- Name: zat_storage zat_storage_pkey; Type: CONSTRAINT; Schema: reference_table; Owner: -
--

ALTER TABLE ONLY reference_table.zat_storage
    ADD CONSTRAINT zat_storage_pkey PRIMARY KEY (_id);


--
-- Name: zat_successstory zat_successstory_pkey; Type: CONSTRAINT; Schema: reference_table; Owner: -
--

ALTER TABLE ONLY reference_table.zat_successstory
    ADD CONSTRAINT zat_successstory_pkey PRIMARY KEY (_id);


--
-- Name: schema_migrations schema_migrations_idempotency_key_key; Type: CONSTRAINT; Schema: supabase_migrations; Owner: -
--

ALTER TABLE ONLY supabase_migrations.schema_migrations
    ADD CONSTRAINT schema_migrations_idempotency_key_key UNIQUE (idempotency_key);


--
-- Name: schema_migrations schema_migrations_pkey; Type: CONSTRAINT; Schema: supabase_migrations; Owner: -
--

ALTER TABLE ONLY supabase_migrations.schema_migrations
    ADD CONSTRAINT schema_migrations_pkey PRIMARY KEY (version);


--
-- Name: seed_files seed_files_pkey; Type: CONSTRAINT; Schema: supabase_migrations; Owner: -
--

ALTER TABLE ONLY supabase_migrations.seed_files
    ADD CONSTRAINT seed_files_pkey PRIMARY KEY (path);


--
-- Name: idx_thread_message_message_id; Type: INDEX; Schema: junctions; Owner: -
--

CREATE INDEX idx_thread_message_message_id ON junctions.thread_message USING btree (message_id);


--
-- Name: idx_thread_message_thread_id; Type: INDEX; Schema: junctions; Owner: -
--

CREATE INDEX idx_thread_message_thread_id ON junctions.thread_message USING btree (thread_id);


--
-- Name: idx_thread_message_thread_type; Type: INDEX; Schema: junctions; Owner: -
--

CREATE INDEX idx_thread_message_thread_type ON junctions.thread_message USING btree (thread_id, message_type);


--
-- Name: idx_thread_message_type; Type: INDEX; Schema: junctions; Owner: -
--

CREATE INDEX idx_thread_message_type ON junctions.thread_message USING btree (message_type);


--
-- Name: idx_thread_participant_thread; Type: INDEX; Schema: junctions; Owner: -
--

CREATE INDEX idx_thread_participant_thread ON junctions.thread_participant USING btree (thread_id);


--
-- Name: idx_thread_participant_user; Type: INDEX; Schema: junctions; Owner: -
--

CREATE INDEX idx_thread_participant_user ON junctions.thread_participant USING btree (user_id);


--
-- Name: idx_user_guest_reason_reason; Type: INDEX; Schema: junctions; Owner: -
--

CREATE INDEX idx_user_guest_reason_reason ON junctions.user_guest_reason USING btree (reason_id);


--
-- Name: idx_user_guest_reason_user; Type: INDEX; Schema: junctions; Owner: -
--

CREATE INDEX idx_user_guest_reason_user ON junctions.user_guest_reason USING btree (user_id);


--
-- Name: idx_user_lease_lease; Type: INDEX; Schema: junctions; Owner: -
--

CREATE INDEX idx_user_lease_lease ON junctions.user_lease USING btree (lease_id);


--
-- Name: idx_user_lease_user; Type: INDEX; Schema: junctions; Owner: -
--

CREATE INDEX idx_user_lease_user ON junctions.user_lease USING btree (user_id);


--
-- Name: idx_user_listing_favorite_listing; Type: INDEX; Schema: junctions; Owner: -
--

CREATE INDEX idx_user_listing_favorite_listing ON junctions.user_listing_favorite USING btree (listing_id);


--
-- Name: idx_user_listing_favorite_user; Type: INDEX; Schema: junctions; Owner: -
--

CREATE INDEX idx_user_listing_favorite_user ON junctions.user_listing_favorite USING btree (user_id);


--
-- Name: idx_user_permission_grantee; Type: INDEX; Schema: junctions; Owner: -
--

CREATE INDEX idx_user_permission_grantee ON junctions.user_permission USING btree (grantee_user_id);


--
-- Name: idx_user_permission_grantor; Type: INDEX; Schema: junctions; Owner: -
--

CREATE INDEX idx_user_permission_grantor ON junctions.user_permission USING btree (grantor_user_id);


--
-- Name: idx_user_preferred_hood_hood; Type: INDEX; Schema: junctions; Owner: -
--

CREATE INDEX idx_user_preferred_hood_hood ON junctions.user_preferred_hood USING btree (hood_id);


--
-- Name: idx_user_preferred_hood_user; Type: INDEX; Schema: junctions; Owner: -
--

CREATE INDEX idx_user_preferred_hood_user ON junctions.user_preferred_hood USING btree (user_id);


--
-- Name: idx_user_proposal_proposal; Type: INDEX; Schema: junctions; Owner: -
--

CREATE INDEX idx_user_proposal_proposal ON junctions.user_proposal USING btree (proposal_id);


--
-- Name: idx_user_proposal_user; Type: INDEX; Schema: junctions; Owner: -
--

CREATE INDEX idx_user_proposal_user ON junctions.user_proposal USING btree (user_id);


--
-- Name: idx_user_rental_type_search_type; Type: INDEX; Schema: junctions; Owner: -
--

CREATE INDEX idx_user_rental_type_search_type ON junctions.user_rental_type_search USING btree (rental_type_id);


--
-- Name: idx_user_rental_type_search_user; Type: INDEX; Schema: junctions; Owner: -
--

CREATE INDEX idx_user_rental_type_search_user ON junctions.user_rental_type_search USING btree (user_id);


--
-- Name: idx_user_storage_item_storage; Type: INDEX; Schema: junctions; Owner: -
--

CREATE INDEX idx_user_storage_item_storage ON junctions.user_storage_item USING btree (storage_id);


--
-- Name: idx_user_storage_item_user; Type: INDEX; Schema: junctions; Owner: -
--

CREATE INDEX idx_user_storage_item_user ON junctions.user_storage_item USING btree (user_id);


--
-- Name: archived_at_idx_workflow_dlq; Type: INDEX; Schema: pgmq; Owner: -
--

CREATE INDEX archived_at_idx_workflow_dlq ON pgmq.a_workflow_dlq USING btree (archived_at);


--
-- Name: archived_at_idx_workflow_queue; Type: INDEX; Schema: pgmq; Owner: -
--

CREATE INDEX archived_at_idx_workflow_queue ON pgmq.a_workflow_queue USING btree (archived_at);


--
-- Name: q_workflow_dlq_vt_idx; Type: INDEX; Schema: pgmq; Owner: -
--

CREATE INDEX q_workflow_dlq_vt_idx ON pgmq.q_workflow_dlq USING btree (vt);


--
-- Name: q_workflow_queue_vt_idx; Type: INDEX; Schema: pgmq; Owner: -
--

CREATE INDEX q_workflow_queue_vt_idx ON pgmq.q_workflow_queue USING btree (vt);


--
-- Name: idx__message_created_date; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx__message_created_date ON public._message USING btree ("Created Date");


--
-- Name: idx__message_modified_date; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx__message_modified_date ON public._message USING btree ("Modified Date");


--
-- Name: idx_ai_parsing_queue_created_at; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_ai_parsing_queue_created_at ON public.ai_parsing_queue USING btree (created_at);


--
-- Name: idx_ai_parsing_queue_status; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_ai_parsing_queue_status ON public.ai_parsing_queue USING btree (status);


--
-- Name: idx_ai_parsing_queue_user_id; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_ai_parsing_queue_user_id ON public.ai_parsing_queue USING btree (user_id);


--
-- Name: idx_audit_log_actor; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_audit_log_actor ON public.audit_log USING btree (actor_id);


--
-- Name: idx_audit_log_created; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_audit_log_created ON public.audit_log USING btree (created_at DESC);


--
-- Name: idx_audit_log_entity; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_audit_log_entity ON public.audit_log USING btree (entity_type, entity_id);


--
-- Name: idx_bookings_leases_created_date; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_bookings_leases_created_date ON public.bookings_leases USING btree ("Created Date");


--
-- Name: idx_bookings_leases_modified_date; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_bookings_leases_modified_date ON public.bookings_leases USING btree ("Modified Date");


--
-- Name: idx_bookings_stays_created_date; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_bookings_stays_created_date ON public.bookings_stays USING btree ("Created Date");


--
-- Name: idx_bookings_stays_modified_date; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_bookings_stays_modified_date ON public.bookings_stays USING btree ("Modified Date");


--
-- Name: idx_co_hostrequest_created_date; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_co_hostrequest_created_date ON public.co_hostrequest USING btree ("Created Date");


--
-- Name: idx_co_hostrequest_modified_date; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_co_hostrequest_modified_date ON public.co_hostrequest USING btree ("Modified Date");


--
-- Name: idx_cohost_slack_message_ts; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_cohost_slack_message_ts ON public.co_hostrequest USING btree ("Slack Message TS");


--
-- Name: idx_dailycounter_created_date; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_dailycounter_created_date ON public.dailycounter USING btree ("Created Date");


--
-- Name: idx_dailycounter_modified_date; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_dailycounter_modified_date ON public.dailycounter USING btree ("Modified Date");


--
-- Name: idx_datacollection_searchlogging_created_date; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_datacollection_searchlogging_created_date ON public.datacollection_searchlogging USING btree ("Created Date");


--
-- Name: idx_datacollection_searchlogging_modified_date; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_datacollection_searchlogging_modified_date ON public.datacollection_searchlogging USING btree ("Modified Date");


--
-- Name: idx_datechangerequest_created_date; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_datechangerequest_created_date ON public.datechangerequest USING btree ("Created Date");


--
-- Name: idx_datechangerequest_modified_date; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_datechangerequest_modified_date ON public.datechangerequest USING btree ("Modified Date");


--
-- Name: idx_documentssent_created_date; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_documentssent_created_date ON public.documentssent USING btree ("Created Date");


--
-- Name: idx_documentssent_modified_date; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_documentssent_modified_date ON public.documentssent USING btree ("Modified Date");


--
-- Name: idx_email_created_date; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_email_created_date ON public.email USING btree ("Created Date");


--
-- Name: idx_email_modified_date; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_email_modified_date ON public.email USING btree ("Modified Date");


--
-- Name: idx_emailtemplate_postmark__created_date; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_emailtemplate_postmark__created_date ON public.emailtemplate_postmark_ USING btree ("Created Date");


--
-- Name: idx_emailtemplate_postmark__modified_date; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_emailtemplate_postmark__modified_date ON public.emailtemplate_postmark_ USING btree ("Modified Date");


--
-- Name: idx_emailtemplates_category_postmark__created_date; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_emailtemplates_category_postmark__created_date ON public.emailtemplates_category_postmark_ USING btree ("Created Date");


--
-- Name: idx_emailtemplates_category_postmark__modified_date; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_emailtemplates_category_postmark__modified_date ON public.emailtemplates_category_postmark_ USING btree ("Modified Date");


--
-- Name: idx_emergencyreports_created_date; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_emergencyreports_created_date ON public.emergencyreports USING btree ("Created Date");


--
-- Name: idx_emergencyreports_modified_date; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_emergencyreports_modified_date ON public.emergencyreports USING btree ("Modified Date");


--
-- Name: idx_experiencesurvey_created_date; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_experiencesurvey_created_date ON public.experiencesurvey USING btree ("Created Date");


--
-- Name: idx_experiencesurvey_modified_date; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_experiencesurvey_modified_date ON public.experiencesurvey USING btree ("Modified Date");


--
-- Name: idx_external_reviews_date; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_external_reviews_date ON public.external_reviews USING btree (review_date DESC);


--
-- Name: idx_external_reviews_listing; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_external_reviews_listing ON public.external_reviews USING btree (listing_id);


--
-- Name: idx_external_reviews_platform; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_external_reviews_platform ON public.external_reviews USING btree (platform);


--
-- Name: idx_fieldsforleasedocuments_created_date; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_fieldsforleasedocuments_created_date ON public.fieldsforleasedocuments USING btree ("Created Date");


--
-- Name: idx_fieldsforleasedocuments_modified_date; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_fieldsforleasedocuments_modified_date ON public.fieldsforleasedocuments USING btree ("Modified Date");


--
-- Name: idx_file_created_date; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_file_created_date ON public.file USING btree ("Created Date");


--
-- Name: idx_file_modified_date; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_file_modified_date ON public.file USING btree ("Modified Date");


--
-- Name: idx_guest_inquiry_recipient; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_guest_inquiry_recipient ON public.guest_inquiry USING btree (recipient_user_id);


--
-- Name: idx_guest_inquiry_status; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_guest_inquiry_status ON public.guest_inquiry USING btree (status);


--
-- Name: idx_hostrestrictions_created_date; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_hostrestrictions_created_date ON public.hostrestrictions USING btree ("Created Date");


--
-- Name: idx_hostrestrictions_modified_date; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_hostrestrictions_modified_date ON public.hostrestrictions USING btree ("Modified Date");


--
-- Name: idx_housemanual_created_date; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_housemanual_created_date ON public.housemanual USING btree ("Created Date");


--
-- Name: idx_housemanual_modified_date; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_housemanual_modified_date ON public.housemanual USING btree ("Modified Date");


--
-- Name: idx_housemanualphotos_created_date; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_housemanualphotos_created_date ON public.housemanualphotos USING btree ("Created Date");


--
-- Name: idx_housemanualphotos_modified_date; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_housemanualphotos_modified_date ON public.housemanualphotos USING btree ("Modified Date");


--
-- Name: idx_informationaltexts_created_date; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_informationaltexts_created_date ON public.informationaltexts USING btree ("Created Date");


--
-- Name: idx_informationaltexts_modified_date; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_informationaltexts_modified_date ON public.informationaltexts USING btree ("Modified Date");


--
-- Name: idx_internalfiles_created_date; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_internalfiles_created_date ON public.internalfiles USING btree ("Created Date");


--
-- Name: idx_internalfiles_modified_date; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_internalfiles_modified_date ON public.internalfiles USING btree ("Modified Date");


--
-- Name: idx_invoices_created_date; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_invoices_created_date ON public.invoices USING btree ("Created Date");


--
-- Name: idx_invoices_modified_date; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_invoices_modified_date ON public.invoices USING btree ("Modified Date");


--
-- Name: idx_knowledgebase_created_date; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_knowledgebase_created_date ON public.knowledgebase USING btree ("Created Date");


--
-- Name: idx_knowledgebase_modified_date; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_knowledgebase_modified_date ON public.knowledgebase USING btree ("Modified Date");


--
-- Name: idx_knowledgebaselineitem_created_date; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_knowledgebaselineitem_created_date ON public.knowledgebaselineitem USING btree ("Created Date");


--
-- Name: idx_knowledgebaselineitem_modified_date; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_knowledgebaselineitem_modified_date ON public.knowledgebaselineitem USING btree ("Modified Date");


--
-- Name: idx_listing_active_usability; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_listing_active_usability ON public.listing USING btree ("Active", "isForUsability") WHERE (("Active" = true) AND ("isForUsability" = false));


--
-- Name: idx_listing_borough_filter; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_listing_borough_filter ON public.listing USING btree ("Location - Borough") WHERE (("Active" = true) AND ("isForUsability" = false));


--
-- Name: idx_listing_created_date; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_listing_created_date ON public.listing USING btree ("Created Date");


--
-- Name: idx_listing_drafts_user_id; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_listing_drafts_user_id ON public.listing_drafts USING btree (user_id);


--
-- Name: idx_listing_hood_filter; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_listing_hood_filter ON public.listing USING btree ("Location - Hood") WHERE (("Active" = true) AND ("isForUsability" = false));


--
-- Name: idx_listing_modified_date; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_listing_modified_date ON public.listing USING btree ("Modified Date");


--
-- Name: idx_listing_not_deleted; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_listing_not_deleted ON public.listing USING btree ("Deleted") WHERE ("Deleted" = false);


--
-- Name: idx_listing_photo_created_date; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_listing_photo_created_date ON public.listing_photo USING btree ("Created Date");


--
-- Name: idx_listing_photo_modified_date; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_listing_photo_modified_date ON public.listing_photo USING btree ("Modified Date");


--
-- Name: idx_listing_price_filter; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_listing_price_filter ON public.listing USING btree ("Standarized Minimum Nightly Price (Filter)") WHERE (("Active" = true) AND ("isForUsability" = false));


--
-- Name: idx_mailing_list_opt_in_created_date; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_mailing_list_opt_in_created_date ON public.mailing_list_opt_in USING btree ("Created Date");


--
-- Name: idx_mailing_list_opt_in_modified_date; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_mailing_list_opt_in_modified_date ON public.mailing_list_opt_in USING btree ("Modified Date");


--
-- Name: idx_mainreview_created_date; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_mainreview_created_date ON public.mainreview USING btree ("Created Date");


--
-- Name: idx_mainreview_modified_date; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_mainreview_modified_date ON public.mainreview USING btree ("Modified Date");


--
-- Name: idx_message_guest_user; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_message_guest_user ON public._message USING btree ("-Guest User");


--
-- Name: idx_message_host_user; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_message_host_user ON public._message USING btree ("-Host User");


--
-- Name: idx_message_originator_user; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_message_originator_user ON public._message USING btree ("-Originator User");


--
-- Name: idx_message_thread; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_message_thread ON public._message USING btree ("Associated Thread/Conversation");


--
-- Name: idx_multimessage_created_date; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_multimessage_created_date ON public.multimessage USING btree ("Created Date");


--
-- Name: idx_multimessage_modified_date; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_multimessage_modified_date ON public.multimessage USING btree ("Modified Date");


--
-- Name: idx_narration_created_date; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_narration_created_date ON public.narration USING btree ("Created Date");


--
-- Name: idx_narration_modified_date; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_narration_modified_date ON public.narration USING btree ("Modified Date");


--
-- Name: idx_negotiationsummary_created_date; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_negotiationsummary_created_date ON public.negotiationsummary USING btree ("Created Date");


--
-- Name: idx_negotiationsummary_modified_date; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_negotiationsummary_modified_date ON public.negotiationsummary USING btree ("Modified Date");


--
-- Name: idx_notification_preferences_user_id; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_notification_preferences_user_id ON public.notification_preferences USING btree (user_id);


--
-- Name: idx_notificationsettingsos_lists__created_date; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_notificationsettingsos_lists__created_date ON public.notificationsettingsos_lists_ USING btree ("Created Date");


--
-- Name: idx_notificationsettingsos_lists__modified_date; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_notificationsettingsos_lists__modified_date ON public.notificationsettingsos_lists_ USING btree ("Modified Date");


--
-- Name: idx_num_created_date; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_num_created_date ON public.num USING btree ("Created Date");


--
-- Name: idx_num_modified_date; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_num_modified_date ON public.num USING btree ("Modified Date");


--
-- Name: idx_occupant_created_date; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_occupant_created_date ON public.occupant USING btree ("Created Date");


--
-- Name: idx_occupant_modified_date; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_occupant_modified_date ON public.occupant USING btree ("Modified Date");


--
-- Name: idx_paymentrecords_created_date; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_paymentrecords_created_date ON public.paymentrecords USING btree ("Created Date");


--
-- Name: idx_paymentrecords_modified_date; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_paymentrecords_modified_date ON public.paymentrecords USING btree ("Modified Date");


--
-- Name: idx_paymentsfromdatechanges_created_date; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_paymentsfromdatechanges_created_date ON public.paymentsfromdatechanges USING btree ("Created Date");


--
-- Name: idx_paymentsfromdatechanges_modified_date; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_paymentsfromdatechanges_modified_date ON public.paymentsfromdatechanges USING btree ("Modified Date");


--
-- Name: idx_postmark_loginbound_created_date; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_postmark_loginbound_created_date ON public.postmark_loginbound USING btree ("Created Date");


--
-- Name: idx_postmark_loginbound_modified_date; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_postmark_loginbound_modified_date ON public.postmark_loginbound USING btree ("Modified Date");


--
-- Name: idx_pricing_list_created_date; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_pricing_list_created_date ON public.pricing_list USING btree ("Created Date");


--
-- Name: idx_pricing_list_modified_date; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_pricing_list_modified_date ON public.pricing_list USING btree ("Modified Date");


--
-- Name: idx_proposal_created_date; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_proposal_created_date ON public.proposal USING btree ("Created Date");


--
-- Name: idx_proposal_modified_date; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_proposal_modified_date ON public.proposal USING btree ("Modified Date");


--
-- Name: idx_proxysmssession_created_date; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_proxysmssession_created_date ON public.proxysmssession USING btree ("Created Date");


--
-- Name: idx_proxysmssession_modified_date; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_proxysmssession_modified_date ON public.proxysmssession USING btree ("Modified Date");


--
-- Name: idx_qrcodes_created_date; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_qrcodes_created_date ON public.qrcodes USING btree ("Created Date");


--
-- Name: idx_qrcodes_modified_date; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_qrcodes_modified_date ON public.qrcodes USING btree ("Modified Date");


--
-- Name: idx_ratingdetail_reviews__created_date; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_ratingdetail_reviews__created_date ON public.ratingdetail_reviews_ USING btree ("Created Date");


--
-- Name: idx_ratingdetail_reviews__modified_date; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_ratingdetail_reviews__modified_date ON public.ratingdetail_reviews_ USING btree ("Modified Date");


--
-- Name: idx_referral_created_date; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_referral_created_date ON public.referral USING btree ("Created Date");


--
-- Name: idx_referral_modified_date; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_referral_modified_date ON public.referral USING btree ("Modified Date");


--
-- Name: idx_remindersfromhousemanual_created_date; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_remindersfromhousemanual_created_date ON public.remindersfromhousemanual USING btree ("Created Date");


--
-- Name: idx_remindersfromhousemanual_modified_date; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_remindersfromhousemanual_modified_date ON public.remindersfromhousemanual USING btree ("Modified Date");


--
-- Name: idx_rentalapplication_created_date; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_rentalapplication_created_date ON public.rentalapplication USING btree ("Created Date");


--
-- Name: idx_rentalapplication_modified_date; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_rentalapplication_modified_date ON public.rentalapplication USING btree ("Modified Date");


--
-- Name: idx_reviewslistingsexternal_created_date; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_reviewslistingsexternal_created_date ON public.reviewslistingsexternal USING btree ("Created Date");


--
-- Name: idx_reviewslistingsexternal_modified_date; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_reviewslistingsexternal_modified_date ON public.reviewslistingsexternal USING btree ("Modified Date");


--
-- Name: idx_savedsearch_created_date; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_savedsearch_created_date ON public.savedsearch USING btree ("Created Date");


--
-- Name: idx_savedsearch_modified_date; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_savedsearch_modified_date ON public.savedsearch USING btree ("Modified Date");


--
-- Name: idx_state_created_date; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_state_created_date ON public.state USING btree ("Created Date");


--
-- Name: idx_state_modified_date; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_state_modified_date ON public.state USING btree ("Modified Date");


--
-- Name: idx_sync_config_enabled; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_sync_config_enabled ON public.sync_config USING btree (enabled) WHERE (enabled = true);


--
-- Name: idx_sync_config_table; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_sync_config_table ON public.sync_config USING btree (supabase_table);


--
-- Name: idx_sync_queue_pending_unique; Type: INDEX; Schema: public; Owner: -
--

CREATE UNIQUE INDEX idx_sync_queue_pending_unique ON public.sync_queue USING btree (table_name, record_id) WHERE (status = 'pending'::text);


--
-- Name: idx_sync_queue_retry; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_sync_queue_retry ON public.sync_queue USING btree (next_retry_at) WHERE ((status = 'failed'::text) AND (retry_count < 3));


--
-- Name: idx_sync_queue_status_created; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_sync_queue_status_created ON public.sync_queue USING btree (status, created_at) WHERE (status = ANY (ARRAY['pending'::text, 'failed'::text]));


--
-- Name: idx_sync_queue_table_record; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_sync_queue_table_record ON public.sync_queue USING btree (table_name, record_id);


--
-- Name: idx_thread_created_at; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_thread_created_at ON public.thread USING btree (created_at);


--
-- Name: idx_thread_updated_at; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_thread_updated_at ON public.thread USING btree (updated_at);


--
-- Name: idx_updatestodocuments_created_date; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_updatestodocuments_created_date ON public.updatestodocuments USING btree ("Created Date");


--
-- Name: idx_updatestodocuments_modified_date; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_updatestodocuments_modified_date ON public.updatestodocuments USING btree ("Modified Date");


--
-- Name: idx_user_created_date; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_user_created_date ON public."user" USING btree ("Created Date");


--
-- Name: idx_user_modified_date; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_user_modified_date ON public."user" USING btree ("Modified Date");


--
-- Name: idx_virtualmeetingschedulesandlinks_created_date; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_virtualmeetingschedulesandlinks_created_date ON public.virtualmeetingschedulesandlinks USING btree ("Created Date");


--
-- Name: idx_virtualmeetingschedulesandlinks_modified_date; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_virtualmeetingschedulesandlinks_modified_date ON public.virtualmeetingschedulesandlinks USING btree ("Modified Date");


--
-- Name: idx_visit_created_date; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_visit_created_date ON public.visit USING btree ("Created Date");


--
-- Name: idx_visit_modified_date; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_visit_modified_date ON public.visit USING btree ("Modified Date");


--
-- Name: idx_waitlistsubmission_created_date; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_waitlistsubmission_created_date ON public.waitlistsubmission USING btree ("Created Date");


--
-- Name: idx_waitlistsubmission_modified_date; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_waitlistsubmission_modified_date ON public.waitlistsubmission USING btree ("Modified Date");


--
-- Name: idx_workflow_definitions_name; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_workflow_definitions_name ON public.workflow_definitions USING btree (name) WHERE (active = true);


--
-- Name: idx_workflow_executions_correlation; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_workflow_executions_correlation ON public.workflow_executions USING btree (correlation_id) WHERE (correlation_id IS NOT NULL);


--
-- Name: idx_workflow_executions_name; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_workflow_executions_name ON public.workflow_executions USING btree (workflow_name, created_at);


--
-- Name: idx_workflow_executions_status; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_workflow_executions_status ON public.workflow_executions USING btree (status, created_at);


--
-- Name: idx_zat_aisuggestions_created_date; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_zat_aisuggestions_created_date ON public.zat_aisuggestions USING btree ("Created Date");


--
-- Name: idx_zat_aisuggestions_modified_date; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_zat_aisuggestions_modified_date ON public.zat_aisuggestions USING btree ("Modified Date");


--
-- Name: idx_zat_blocked_vm_bookingtimes_created_date; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_zat_blocked_vm_bookingtimes_created_date ON public.zat_blocked_vm_bookingtimes USING btree ("Created Date");


--
-- Name: idx_zat_blocked_vm_bookingtimes_modified_date; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_zat_blocked_vm_bookingtimes_modified_date ON public.zat_blocked_vm_bookingtimes USING btree ("Modified Date");


--
-- Name: idx_zat_features_amenity_created_date; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_zat_features_amenity_created_date ON public.zat_features_amenity USING btree ("Created Date");


--
-- Name: idx_zat_features_amenity_modified_date; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_zat_features_amenity_modified_date ON public.zat_features_amenity USING btree ("Modified Date");


--
-- Name: idx_cancellation_reasons_user_type; Type: INDEX; Schema: reference_table; Owner: -
--

CREATE INDEX idx_cancellation_reasons_user_type ON reference_table.cancellation_reasons USING btree (user_type, display_order);


--
-- Name: idx_os_proposal_status_name; Type: INDEX; Schema: reference_table; Owner: -
--

CREATE INDEX idx_os_proposal_status_name ON reference_table.os_proposal_status USING btree (name);


--
-- Name: idx_zat_email_html_template_eg_sendbasicemailwf__created_date; Type: INDEX; Schema: reference_table; Owner: -
--

CREATE INDEX idx_zat_email_html_template_eg_sendbasicemailwf__created_date ON reference_table.zat_email_html_template_eg_sendbasicemailwf_ USING btree ("Created Date");


--
-- Name: idx_zat_email_html_template_eg_sendbasicemailwf__modified_date; Type: INDEX; Schema: reference_table; Owner: -
--

CREATE INDEX idx_zat_email_html_template_eg_sendbasicemailwf__modified_date ON reference_table.zat_email_html_template_eg_sendbasicemailwf_ USING btree ("Modified Date");


--
-- Name: idx_zat_faq_created_date; Type: INDEX; Schema: reference_table; Owner: -
--

CREATE INDEX idx_zat_faq_created_date ON reference_table.zat_faq USING btree ("Created Date");


--
-- Name: idx_zat_faq_modified_date; Type: INDEX; Schema: reference_table; Owner: -
--

CREATE INDEX idx_zat_faq_modified_date ON reference_table.zat_faq USING btree ("Modified Date");


--
-- Name: idx_zat_features_cancellationpolicy_created_date; Type: INDEX; Schema: reference_table; Owner: -
--

CREATE INDEX idx_zat_features_cancellationpolicy_created_date ON reference_table.zat_features_cancellationpolicy USING btree ("Created Date");


--
-- Name: idx_zat_features_cancellationpolicy_modified_date; Type: INDEX; Schema: reference_table; Owner: -
--

CREATE INDEX idx_zat_features_cancellationpolicy_modified_date ON reference_table.zat_features_cancellationpolicy USING btree ("Modified Date");


--
-- Name: idx_zat_features_houserule_created_date; Type: INDEX; Schema: reference_table; Owner: -
--

CREATE INDEX idx_zat_features_houserule_created_date ON reference_table.zat_features_houserule USING btree ("Created Date");


--
-- Name: idx_zat_features_houserule_modified_date; Type: INDEX; Schema: reference_table; Owner: -
--

CREATE INDEX idx_zat_features_houserule_modified_date ON reference_table.zat_features_houserule USING btree ("Modified Date");


--
-- Name: idx_zat_features_listingtype_created_date; Type: INDEX; Schema: reference_table; Owner: -
--

CREATE INDEX idx_zat_features_listingtype_created_date ON reference_table.zat_features_listingtype USING btree ("Created Date");


--
-- Name: idx_zat_features_listingtype_modified_date; Type: INDEX; Schema: reference_table; Owner: -
--

CREATE INDEX idx_zat_features_listingtype_modified_date ON reference_table.zat_features_listingtype USING btree ("Modified Date");


--
-- Name: idx_zat_features_parkingoptions_created_date; Type: INDEX; Schema: reference_table; Owner: -
--

CREATE INDEX idx_zat_features_parkingoptions_created_date ON reference_table.zat_features_parkingoptions USING btree ("Created Date");


--
-- Name: idx_zat_features_parkingoptions_modified_date; Type: INDEX; Schema: reference_table; Owner: -
--

CREATE INDEX idx_zat_features_parkingoptions_modified_date ON reference_table.zat_features_parkingoptions USING btree ("Modified Date");


--
-- Name: idx_zat_features_storageoptions_created_date; Type: INDEX; Schema: reference_table; Owner: -
--

CREATE INDEX idx_zat_features_storageoptions_created_date ON reference_table.zat_features_storageoptions USING btree ("Created Date");


--
-- Name: idx_zat_features_storageoptions_modified_date; Type: INDEX; Schema: reference_table; Owner: -
--

CREATE INDEX idx_zat_features_storageoptions_modified_date ON reference_table.zat_features_storageoptions USING btree ("Modified Date");


--
-- Name: idx_zat_geo_borough_toplevel_created_date; Type: INDEX; Schema: reference_table; Owner: -
--

CREATE INDEX idx_zat_geo_borough_toplevel_created_date ON reference_table.zat_geo_borough_toplevel USING btree ("Created Date");


--
-- Name: idx_zat_geo_borough_toplevel_modified_date; Type: INDEX; Schema: reference_table; Owner: -
--

CREATE INDEX idx_zat_geo_borough_toplevel_modified_date ON reference_table.zat_geo_borough_toplevel USING btree ("Modified Date");


--
-- Name: idx_zat_geo_hood_mediumlevel_created_date; Type: INDEX; Schema: reference_table; Owner: -
--

CREATE INDEX idx_zat_geo_hood_mediumlevel_created_date ON reference_table.zat_geo_hood_mediumlevel USING btree ("Created Date");


--
-- Name: idx_zat_geo_hood_mediumlevel_modified_date; Type: INDEX; Schema: reference_table; Owner: -
--

CREATE INDEX idx_zat_geo_hood_mediumlevel_modified_date ON reference_table.zat_geo_hood_mediumlevel USING btree ("Modified Date");


--
-- Name: idx_zat_goodguestreasons_created_date; Type: INDEX; Schema: reference_table; Owner: -
--

CREATE INDEX idx_zat_goodguestreasons_created_date ON reference_table.zat_goodguestreasons USING btree ("Created Date");


--
-- Name: idx_zat_goodguestreasons_modified_date; Type: INDEX; Schema: reference_table; Owner: -
--

CREATE INDEX idx_zat_goodguestreasons_modified_date ON reference_table.zat_goodguestreasons USING btree ("Modified Date");


--
-- Name: idx_zat_htmlembed_created_date; Type: INDEX; Schema: reference_table; Owner: -
--

CREATE INDEX idx_zat_htmlembed_created_date ON reference_table.zat_htmlembed USING btree ("Created Date");


--
-- Name: idx_zat_htmlembed_modified_date; Type: INDEX; Schema: reference_table; Owner: -
--

CREATE INDEX idx_zat_htmlembed_modified_date ON reference_table.zat_htmlembed USING btree ("Modified Date");


--
-- Name: idx_zat_location_created_date; Type: INDEX; Schema: reference_table; Owner: -
--

CREATE INDEX idx_zat_location_created_date ON reference_table.zat_location USING btree ("Created Date");


--
-- Name: idx_zat_location_modified_date; Type: INDEX; Schema: reference_table; Owner: -
--

CREATE INDEX idx_zat_location_modified_date ON reference_table.zat_location USING btree ("Modified Date");


--
-- Name: idx_zat_policiesdocuments_created_date; Type: INDEX; Schema: reference_table; Owner: -
--

CREATE INDEX idx_zat_policiesdocuments_created_date ON reference_table.zat_policiesdocuments USING btree ("Created Date");


--
-- Name: idx_zat_policiesdocuments_modified_date; Type: INDEX; Schema: reference_table; Owner: -
--

CREATE INDEX idx_zat_policiesdocuments_modified_date ON reference_table.zat_policiesdocuments USING btree ("Modified Date");


--
-- Name: idx_zat_priceconfiguration_created_date; Type: INDEX; Schema: reference_table; Owner: -
--

CREATE INDEX idx_zat_priceconfiguration_created_date ON reference_table.zat_priceconfiguration USING btree ("Created Date");


--
-- Name: idx_zat_priceconfiguration_modified_date; Type: INDEX; Schema: reference_table; Owner: -
--

CREATE INDEX idx_zat_priceconfiguration_modified_date ON reference_table.zat_priceconfiguration USING btree ("Modified Date");


--
-- Name: idx_zat_splitleaseteam_created_date; Type: INDEX; Schema: reference_table; Owner: -
--

CREATE INDEX idx_zat_splitleaseteam_created_date ON reference_table.zat_splitleaseteam USING btree ("Created Date");


--
-- Name: idx_zat_splitleaseteam_modified_date; Type: INDEX; Schema: reference_table; Owner: -
--

CREATE INDEX idx_zat_splitleaseteam_modified_date ON reference_table.zat_splitleaseteam USING btree ("Modified Date");


--
-- Name: idx_zat_storage_created_date; Type: INDEX; Schema: reference_table; Owner: -
--

CREATE INDEX idx_zat_storage_created_date ON reference_table.zat_storage USING btree ("Created Date");


--
-- Name: idx_zat_storage_modified_date; Type: INDEX; Schema: reference_table; Owner: -
--

CREATE INDEX idx_zat_storage_modified_date ON reference_table.zat_storage USING btree ("Modified Date");


--
-- Name: idx_zat_successstory_created_date; Type: INDEX; Schema: reference_table; Owner: -
--

CREATE INDEX idx_zat_successstory_created_date ON reference_table.zat_successstory USING btree ("Created Date");


--
-- Name: idx_zat_successstory_modified_date; Type: INDEX; Schema: reference_table; Owner: -
--

CREATE INDEX idx_zat_successstory_modified_date ON reference_table.zat_successstory USING btree ("Modified Date");


--
-- Name: ai_parsing_queue ai_parsing_queue_updated_at; Type: TRIGGER; Schema: public; Owner: -
--

CREATE TRIGGER ai_parsing_queue_updated_at BEFORE UPDATE ON public.ai_parsing_queue FOR EACH ROW EXECUTE FUNCTION public.update_ai_parsing_queue_updated_at();


--
-- Name: listing listing_bubble_sync_trigger; Type: TRIGGER; Schema: public; Owner: -
--

CREATE TRIGGER listing_bubble_sync_trigger AFTER INSERT ON public.listing FOR EACH ROW EXECUTE FUNCTION public.trigger_listing_sync_queue();


--
-- Name: notification_preferences notification_preferences_updated_at; Type: TRIGGER; Schema: public; Owner: -
--

CREATE TRIGGER notification_preferences_updated_at BEFORE UPDATE ON public.notification_preferences FOR EACH ROW EXECUTE FUNCTION public.update_notification_preferences_updated_at();


--
-- Name: sync_config sync_config_updated; Type: TRIGGER; Schema: public; Owner: -
--

CREATE TRIGGER sync_config_updated BEFORE UPDATE ON public.sync_config FOR EACH ROW EXECUTE FUNCTION public.update_sync_config_timestamp();


--
-- Name: _message trigger_broadcast_new_message; Type: TRIGGER; Schema: public; Owner: -
--

CREATE TRIGGER trigger_broadcast_new_message AFTER INSERT ON public._message FOR EACH ROW EXECUTE FUNCTION public.broadcast_new_message();


--
-- Name: notification_preferences trigger_notification_preferences_updated_at; Type: TRIGGER; Schema: public; Owner: -
--

CREATE TRIGGER trigger_notification_preferences_updated_at BEFORE UPDATE ON public.notification_preferences FOR EACH ROW EXECUTE FUNCTION public.update_notification_preferences_updated_at();


--
-- Name: _message trigger_populate_thread_message_junction; Type: TRIGGER; Schema: public; Owner: -
--

CREATE TRIGGER trigger_populate_thread_message_junction AFTER INSERT ON public._message FOR EACH ROW EXECUTE FUNCTION public.populate_thread_message_junction();


--
-- Name: thread trigger_populate_thread_participant_junction; Type: TRIGGER; Schema: public; Owner: -
--

CREATE TRIGGER trigger_populate_thread_participant_junction AFTER INSERT ON public.thread FOR EACH ROW EXECUTE FUNCTION public.populate_thread_participant_junction();


--
-- Name: _message trigger_update_thread_on_message; Type: TRIGGER; Schema: public; Owner: -
--

CREATE TRIGGER trigger_update_thread_on_message AFTER INSERT ON public._message FOR EACH ROW EXECUTE FUNCTION public.update_thread_on_message();


--
-- Name: workflow_definitions workflow_definitions_updated; Type: TRIGGER; Schema: public; Owner: -
--

CREATE TRIGGER workflow_definitions_updated BEFORE UPDATE ON public.workflow_definitions FOR EACH ROW EXECUTE FUNCTION public.update_workflow_definitions_timestamp();


--
-- Name: workflow_executions workflow_executions_pending_trigger; Type: TRIGGER; Schema: public; Owner: -
--

CREATE TRIGGER workflow_executions_pending_trigger AFTER INSERT ON public.workflow_executions FOR EACH ROW WHEN ((new.status = 'pending'::text)) EXECUTE FUNCTION public.trigger_workflow_orchestrator();


--
-- Name: thread_message fk_thread_message_message; Type: FK CONSTRAINT; Schema: junctions; Owner: -
--

ALTER TABLE ONLY junctions.thread_message
    ADD CONSTRAINT fk_thread_message_message FOREIGN KEY (message_id) REFERENCES public._message(_id) ON DELETE CASCADE;


--
-- Name: thread_message fk_thread_message_thread; Type: FK CONSTRAINT; Schema: junctions; Owner: -
--

ALTER TABLE ONLY junctions.thread_message
    ADD CONSTRAINT fk_thread_message_thread FOREIGN KEY (thread_id) REFERENCES public.thread(_id) ON DELETE CASCADE;


--
-- Name: thread_participant fk_thread_participant_thread; Type: FK CONSTRAINT; Schema: junctions; Owner: -
--

ALTER TABLE ONLY junctions.thread_participant
    ADD CONSTRAINT fk_thread_participant_thread FOREIGN KEY (thread_id) REFERENCES public.thread(_id) ON DELETE CASCADE;


--
-- Name: thread_participant fk_thread_participant_user; Type: FK CONSTRAINT; Schema: junctions; Owner: -
--

ALTER TABLE ONLY junctions.thread_participant
    ADD CONSTRAINT fk_thread_participant_user FOREIGN KEY (user_id) REFERENCES public."user"(_id) ON DELETE CASCADE;


--
-- Name: user_guest_reason fk_user_guest_reason_reason; Type: FK CONSTRAINT; Schema: junctions; Owner: -
--

ALTER TABLE ONLY junctions.user_guest_reason
    ADD CONSTRAINT fk_user_guest_reason_reason FOREIGN KEY (reason_id) REFERENCES reference_table.zat_goodguestreasons(_id) ON DELETE CASCADE;


--
-- Name: user_guest_reason fk_user_guest_reason_user; Type: FK CONSTRAINT; Schema: junctions; Owner: -
--

ALTER TABLE ONLY junctions.user_guest_reason
    ADD CONSTRAINT fk_user_guest_reason_user FOREIGN KEY (user_id) REFERENCES public."user"(_id) ON DELETE CASCADE;


--
-- Name: user_lease fk_user_lease_lease; Type: FK CONSTRAINT; Schema: junctions; Owner: -
--

ALTER TABLE ONLY junctions.user_lease
    ADD CONSTRAINT fk_user_lease_lease FOREIGN KEY (lease_id) REFERENCES public.bookings_leases(_id) ON DELETE CASCADE;


--
-- Name: user_lease fk_user_lease_user; Type: FK CONSTRAINT; Schema: junctions; Owner: -
--

ALTER TABLE ONLY junctions.user_lease
    ADD CONSTRAINT fk_user_lease_user FOREIGN KEY (user_id) REFERENCES public."user"(_id) ON DELETE CASCADE;


--
-- Name: user_listing_favorite fk_user_listing_favorite_listing; Type: FK CONSTRAINT; Schema: junctions; Owner: -
--

ALTER TABLE ONLY junctions.user_listing_favorite
    ADD CONSTRAINT fk_user_listing_favorite_listing FOREIGN KEY (listing_id) REFERENCES public.listing(_id) ON DELETE CASCADE;


--
-- Name: user_listing_favorite fk_user_listing_favorite_user; Type: FK CONSTRAINT; Schema: junctions; Owner: -
--

ALTER TABLE ONLY junctions.user_listing_favorite
    ADD CONSTRAINT fk_user_listing_favorite_user FOREIGN KEY (user_id) REFERENCES public."user"(_id) ON DELETE CASCADE;


--
-- Name: user_permission fk_user_permission_grantee; Type: FK CONSTRAINT; Schema: junctions; Owner: -
--

ALTER TABLE ONLY junctions.user_permission
    ADD CONSTRAINT fk_user_permission_grantee FOREIGN KEY (grantee_user_id) REFERENCES public."user"(_id) ON DELETE CASCADE;


--
-- Name: user_permission fk_user_permission_grantor; Type: FK CONSTRAINT; Schema: junctions; Owner: -
--

ALTER TABLE ONLY junctions.user_permission
    ADD CONSTRAINT fk_user_permission_grantor FOREIGN KEY (grantor_user_id) REFERENCES public."user"(_id) ON DELETE CASCADE;


--
-- Name: user_preferred_hood fk_user_preferred_hood_hood; Type: FK CONSTRAINT; Schema: junctions; Owner: -
--

ALTER TABLE ONLY junctions.user_preferred_hood
    ADD CONSTRAINT fk_user_preferred_hood_hood FOREIGN KEY (hood_id) REFERENCES reference_table.zat_geo_hood_mediumlevel(_id) ON DELETE CASCADE;


--
-- Name: user_preferred_hood fk_user_preferred_hood_user; Type: FK CONSTRAINT; Schema: junctions; Owner: -
--

ALTER TABLE ONLY junctions.user_preferred_hood
    ADD CONSTRAINT fk_user_preferred_hood_user FOREIGN KEY (user_id) REFERENCES public."user"(_id) ON DELETE CASCADE;


--
-- Name: user_proposal fk_user_proposal_proposal; Type: FK CONSTRAINT; Schema: junctions; Owner: -
--

ALTER TABLE ONLY junctions.user_proposal
    ADD CONSTRAINT fk_user_proposal_proposal FOREIGN KEY (proposal_id) REFERENCES public.proposal(_id) ON DELETE CASCADE;


--
-- Name: user_proposal fk_user_proposal_user; Type: FK CONSTRAINT; Schema: junctions; Owner: -
--

ALTER TABLE ONLY junctions.user_proposal
    ADD CONSTRAINT fk_user_proposal_user FOREIGN KEY (user_id) REFERENCES public."user"(_id) ON DELETE CASCADE;


--
-- Name: user_rental_type_search fk_user_rental_type_search_type; Type: FK CONSTRAINT; Schema: junctions; Owner: -
--

ALTER TABLE ONLY junctions.user_rental_type_search
    ADD CONSTRAINT fk_user_rental_type_search_type FOREIGN KEY (rental_type_id) REFERENCES reference_table.os_rental_type(id) ON DELETE CASCADE;


--
-- Name: user_rental_type_search fk_user_rental_type_search_user; Type: FK CONSTRAINT; Schema: junctions; Owner: -
--

ALTER TABLE ONLY junctions.user_rental_type_search
    ADD CONSTRAINT fk_user_rental_type_search_user FOREIGN KEY (user_id) REFERENCES public."user"(_id) ON DELETE CASCADE;


--
-- Name: user_storage_item fk_user_storage_item_storage; Type: FK CONSTRAINT; Schema: junctions; Owner: -
--

ALTER TABLE ONLY junctions.user_storage_item
    ADD CONSTRAINT fk_user_storage_item_storage FOREIGN KEY (storage_id) REFERENCES reference_table.zat_storage(_id) ON DELETE CASCADE;


--
-- Name: user_storage_item fk_user_storage_item_user; Type: FK CONSTRAINT; Schema: junctions; Owner: -
--

ALTER TABLE ONLY junctions.user_storage_item
    ADD CONSTRAINT fk_user_storage_item_user FOREIGN KEY (user_id) REFERENCES public."user"(_id) ON DELETE CASCADE;


--
-- Name: _message _message_Call to Action_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public._message
    ADD CONSTRAINT "_message_Call to Action_fkey" FOREIGN KEY ("Call to Action") REFERENCES reference_table.os_messaging_cta(display);


--
-- Name: _message _message_Created By_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public._message
    ADD CONSTRAINT "_message_Created By_fkey" FOREIGN KEY ("Created By") REFERENCES public."user"(_id);


--
-- Name: ai_parsing_queue ai_parsing_queue_user_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.ai_parsing_queue
    ADD CONSTRAINT ai_parsing_queue_user_id_fkey FOREIGN KEY (user_id) REFERENCES public."user"(_id) ON DELETE CASCADE;


--
-- Name: external_reviews external_reviews_listing_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.external_reviews
    ADD CONSTRAINT external_reviews_listing_id_fkey FOREIGN KEY (listing_id) REFERENCES public.listing(_id) ON DELETE CASCADE;


--
-- Name: bookings_leases fk_bookings_leases_cancellation_policy; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.bookings_leases
    ADD CONSTRAINT fk_bookings_leases_cancellation_policy FOREIGN KEY ("Cancellation Policy") REFERENCES reference_table.zat_features_cancellationpolicy(_id) ON UPDATE CASCADE ON DELETE SET NULL;


--
-- Name: bookings_leases fk_bookings_leases_created_by; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.bookings_leases
    ADD CONSTRAINT fk_bookings_leases_created_by FOREIGN KEY ("Created By") REFERENCES public."user"(_id) ON UPDATE CASCADE ON DELETE SET NULL;


--
-- Name: bookings_leases fk_bookings_leases_listing; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.bookings_leases
    ADD CONSTRAINT fk_bookings_leases_listing FOREIGN KEY ("Listing") REFERENCES public.listing(_id) ON UPDATE CASCADE ON DELETE RESTRICT;


--
-- Name: bookings_leases fk_bookings_leases_proposal; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.bookings_leases
    ADD CONSTRAINT fk_bookings_leases_proposal FOREIGN KEY ("Proposal") REFERENCES public.proposal(_id) ON UPDATE CASCADE ON DELETE SET NULL;


--
-- Name: listing fk_listing_borough; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.listing
    ADD CONSTRAINT fk_listing_borough FOREIGN KEY ("Location - Borough") REFERENCES reference_table.zat_geo_borough_toplevel(_id);


--
-- Name: listing fk_listing_hood; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.listing
    ADD CONSTRAINT fk_listing_hood FOREIGN KEY ("Location - Hood") REFERENCES reference_table.zat_geo_hood_mediumlevel(_id);


--
-- Name: _message fk_message_guest_user; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public._message
    ADD CONSTRAINT fk_message_guest_user FOREIGN KEY ("-Guest User") REFERENCES public."user"(_id) ON UPDATE CASCADE ON DELETE SET NULL;


--
-- Name: _message fk_message_host_user; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public._message
    ADD CONSTRAINT fk_message_host_user FOREIGN KEY ("-Host User") REFERENCES public."user"(_id) ON UPDATE CASCADE ON DELETE SET NULL;


--
-- Name: _message fk_message_originator_user; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public._message
    ADD CONSTRAINT fk_message_originator_user FOREIGN KEY ("-Originator User") REFERENCES public."user"(_id) ON UPDATE CASCADE ON DELETE SET NULL;


--
-- Name: _message fk_message_thread; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public._message
    ADD CONSTRAINT fk_message_thread FOREIGN KEY ("Associated Thread/Conversation") REFERENCES public.thread(_id) ON UPDATE CASCADE ON DELETE CASCADE;


--
-- Name: sync_queue fk_sync_queue_sync_config; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.sync_queue
    ADD CONSTRAINT fk_sync_queue_sync_config FOREIGN KEY (table_name) REFERENCES public.sync_config(supabase_table);


--
-- Name: user fk_user_type_current; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public."user"
    ADD CONSTRAINT fk_user_type_current FOREIGN KEY ("Type - User Current") REFERENCES reference_table.os_user_type(display) ON UPDATE CASCADE ON DELETE SET NULL;


--
-- Name: user fk_user_type_signup; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public."user"
    ADD CONSTRAINT fk_user_type_signup FOREIGN KEY ("Type - User Signup") REFERENCES reference_table.os_user_type(display) ON UPDATE CASCADE ON DELETE SET NULL;


--
-- Name: listing listing_Cancellation Policy_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.listing
    ADD CONSTRAINT "listing_Cancellation Policy_fkey" FOREIGN KEY ("Cancellation Policy") REFERENCES reference_table.zat_features_cancellationpolicy(_id);


--
-- Name: listing listing_Features - Parking type_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.listing
    ADD CONSTRAINT "listing_Features - Parking type_fkey" FOREIGN KEY ("Features - Parking type") REFERENCES reference_table.zat_features_parkingoptions(_id);


--
-- Name: listing listing_Features - Secure Storage Option_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.listing
    ADD CONSTRAINT "listing_Features - Secure Storage Option_fkey" FOREIGN KEY ("Features - Secure Storage Option") REFERENCES reference_table.zat_features_storageoptions(_id);


--
-- Name: listing listing_Features - Type of Space_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.listing
    ADD CONSTRAINT "listing_Features - Type of Space_fkey" FOREIGN KEY ("Features - Type of Space") REFERENCES reference_table.zat_features_listingtype(_id);


--
-- Name: listing listing_Kitchen Type_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.listing
    ADD CONSTRAINT "listing_Kitchen Type_fkey" FOREIGN KEY ("Kitchen Type") REFERENCES reference_table.os_kitchen_type(display);


--
-- Name: listing listing_Location - City_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.listing
    ADD CONSTRAINT "listing_Location - City_fkey" FOREIGN KEY ("Location - City") REFERENCES reference_table.zat_location(_id);


--
-- Name: listing listing_Location - State_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.listing
    ADD CONSTRAINT "listing_Location - State_fkey" FOREIGN KEY ("Location - State") REFERENCES reference_table.os_us_states(display);


--
-- Name: listing_drafts listing_drafts_user_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.listing_drafts
    ADD CONSTRAINT listing_drafts_user_id_fkey FOREIGN KEY (user_id) REFERENCES auth.users(id) ON DELETE CASCADE;


--
-- Name: listing listing_rental type_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.listing
    ADD CONSTRAINT "listing_rental type_fkey" FOREIGN KEY ("rental type") REFERENCES reference_table.os_rental_type(display);


--
-- Name: notification_preferences notification_preferences_user_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.notification_preferences
    ADD CONSTRAINT notification_preferences_user_id_fkey FOREIGN KEY (user_id) REFERENCES public."user"(_id) ON DELETE CASCADE;


--
-- Name: proposal proposal_Status_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.proposal
    ADD CONSTRAINT "proposal_Status_fkey" FOREIGN KEY ("Status") REFERENCES reference_table.os_proposal_status(display);


--
-- Name: thread thread_Created By_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.thread
    ADD CONSTRAINT "thread_Created By_fkey" FOREIGN KEY ("Created By") REFERENCES public."user"(_id);


--
-- Name: thread thread_Listing_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.thread
    ADD CONSTRAINT "thread_Listing_fkey" FOREIGN KEY ("Listing") REFERENCES public.listing(_id);


--
-- Name: thread thread_Proposal_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.thread
    ADD CONSTRAINT "thread_Proposal_fkey" FOREIGN KEY ("Proposal") REFERENCES public.proposal(_id);


--
-- Name: user user_Notification Settings OS(lisits)_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public."user"
    ADD CONSTRAINT "user_Notification Settings OS(lisits)_fkey" FOREIGN KEY ("Notification Settings OS(lisits)") REFERENCES public.notificationsettingsos_lists_(_id) ON UPDATE CASCADE ON DELETE SET NULL;


--
-- Name: user user_Preferred Borough_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public."user"
    ADD CONSTRAINT "user_Preferred Borough_fkey" FOREIGN KEY ("Preferred Borough") REFERENCES reference_table.zat_geo_borough_toplevel(_id);


--
-- Name: user user_Preferred weekly schedule_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public."user"
    ADD CONSTRAINT "user_Preferred weekly schedule_fkey" FOREIGN KEY ("Preferred weekly schedule") REFERENCES reference_table.os_weekly_selection_options(display);


--
-- Name: user user_Price Tier_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public."user"
    ADD CONSTRAINT "user_Price Tier_fkey" FOREIGN KEY ("Price Tier") REFERENCES reference_table.os_price_filter(display);


--
-- Name: thread_participant Service role full access; Type: POLICY; Schema: junctions; Owner: -
--

CREATE POLICY "Service role full access" ON junctions.thread_participant TO service_role USING (true) WITH CHECK (true);


--
-- Name: user_guest_reason Service role full access; Type: POLICY; Schema: junctions; Owner: -
--

CREATE POLICY "Service role full access" ON junctions.user_guest_reason TO service_role USING (true) WITH CHECK (true);


--
-- Name: user_lease Service role full access; Type: POLICY; Schema: junctions; Owner: -
--

CREATE POLICY "Service role full access" ON junctions.user_lease TO service_role USING (true) WITH CHECK (true);


--
-- Name: user_listing_favorite Service role full access; Type: POLICY; Schema: junctions; Owner: -
--

CREATE POLICY "Service role full access" ON junctions.user_listing_favorite TO service_role USING (true) WITH CHECK (true);


--
-- Name: user_permission Service role full access; Type: POLICY; Schema: junctions; Owner: -
--

CREATE POLICY "Service role full access" ON junctions.user_permission TO service_role USING (true) WITH CHECK (true);


--
-- Name: user_preferred_hood Service role full access; Type: POLICY; Schema: junctions; Owner: -
--

CREATE POLICY "Service role full access" ON junctions.user_preferred_hood TO service_role USING (true) WITH CHECK (true);


--
-- Name: user_proposal Service role full access; Type: POLICY; Schema: junctions; Owner: -
--

CREATE POLICY "Service role full access" ON junctions.user_proposal TO service_role USING (true) WITH CHECK (true);


--
-- Name: user_rental_type_search Service role full access; Type: POLICY; Schema: junctions; Owner: -
--

CREATE POLICY "Service role full access" ON junctions.user_rental_type_search TO service_role USING (true) WITH CHECK (true);


--
-- Name: user_storage_item Service role full access; Type: POLICY; Schema: junctions; Owner: -
--

CREATE POLICY "Service role full access" ON junctions.user_storage_item TO service_role USING (true) WITH CHECK (true);


--
-- Name: user_permission Users read granted permissions; Type: POLICY; Schema: junctions; Owner: -
--

CREATE POLICY "Users read granted permissions" ON junctions.user_permission FOR SELECT TO authenticated USING (((grantor_user_id IN ( SELECT "user"._id
   FROM public."user"
  WHERE ("user".email = (auth.jwt() ->> 'email'::text)))) OR (grantee_user_id IN ( SELECT "user"._id
   FROM public."user"
  WHERE ("user".email = (auth.jwt() ->> 'email'::text))))));


--
-- Name: user_listing_favorite Users read own favorite listings; Type: POLICY; Schema: junctions; Owner: -
--

CREATE POLICY "Users read own favorite listings" ON junctions.user_listing_favorite FOR SELECT TO authenticated USING ((user_id IN ( SELECT "user"._id
   FROM public."user"
  WHERE ("user".email = (auth.jwt() ->> 'email'::text)))));


--
-- Name: user_guest_reason Users read own guest reasons; Type: POLICY; Schema: junctions; Owner: -
--

CREATE POLICY "Users read own guest reasons" ON junctions.user_guest_reason FOR SELECT TO authenticated USING ((user_id IN ( SELECT "user"._id
   FROM public."user"
  WHERE ("user".email = (auth.jwt() ->> 'email'::text)))));


--
-- Name: user_lease Users read own leases; Type: POLICY; Schema: junctions; Owner: -
--

CREATE POLICY "Users read own leases" ON junctions.user_lease FOR SELECT TO authenticated USING ((user_id IN ( SELECT "user"._id
   FROM public."user"
  WHERE ("user".email = (auth.jwt() ->> 'email'::text)))));


--
-- Name: user_preferred_hood Users read own preferred hoods; Type: POLICY; Schema: junctions; Owner: -
--

CREATE POLICY "Users read own preferred hoods" ON junctions.user_preferred_hood FOR SELECT TO authenticated USING ((user_id IN ( SELECT "user"._id
   FROM public."user"
  WHERE ("user".email = (auth.jwt() ->> 'email'::text)))));


--
-- Name: user_proposal Users read own proposals; Type: POLICY; Schema: junctions; Owner: -
--

CREATE POLICY "Users read own proposals" ON junctions.user_proposal FOR SELECT TO authenticated USING ((user_id IN ( SELECT "user"._id
   FROM public."user"
  WHERE ("user".email = (auth.jwt() ->> 'email'::text)))));


--
-- Name: user_rental_type_search Users read own rental type searches; Type: POLICY; Schema: junctions; Owner: -
--

CREATE POLICY "Users read own rental type searches" ON junctions.user_rental_type_search FOR SELECT TO authenticated USING ((user_id IN ( SELECT "user"._id
   FROM public."user"
  WHERE ("user".email = (auth.jwt() ->> 'email'::text)))));


--
-- Name: user_storage_item Users read own storage items; Type: POLICY; Schema: junctions; Owner: -
--

CREATE POLICY "Users read own storage items" ON junctions.user_storage_item FOR SELECT TO authenticated USING ((user_id IN ( SELECT "user"._id
   FROM public."user"
  WHERE ("user".email = (auth.jwt() ->> 'email'::text)))));


--
-- Name: thread_participant Users read own thread participation; Type: POLICY; Schema: junctions; Owner: -
--

CREATE POLICY "Users read own thread participation" ON junctions.thread_participant FOR SELECT TO authenticated USING ((user_id IN ( SELECT "user"._id
   FROM public."user"
  WHERE ("user".email = (auth.jwt() ->> 'email'::text)))));


--
-- Name: thread_message; Type: ROW SECURITY; Schema: junctions; Owner: -
--

ALTER TABLE junctions.thread_message ENABLE ROW LEVEL SECURITY;

--
-- Name: thread_message thread_message_insert_policy; Type: POLICY; Schema: junctions; Owner: -
--

CREATE POLICY thread_message_insert_policy ON junctions.thread_message FOR INSERT WITH CHECK ((thread_id IN ( SELECT thread._id
   FROM public.thread
  WHERE ((thread."-Host User" = public.get_user_bubble_id()) OR (thread."-Guest User" = public.get_user_bubble_id())))));


--
-- Name: thread_message thread_message_select_policy; Type: POLICY; Schema: junctions; Owner: -
--

CREATE POLICY thread_message_select_policy ON junctions.thread_message FOR SELECT USING ((thread_id IN ( SELECT thread._id
   FROM public.thread
  WHERE ((thread."-Host User" = public.get_user_bubble_id()) OR (thread."-Guest User" = public.get_user_bubble_id())))));


--
-- Name: thread_participant; Type: ROW SECURITY; Schema: junctions; Owner: -
--

ALTER TABLE junctions.thread_participant ENABLE ROW LEVEL SECURITY;

--
-- Name: thread_participant thread_participant_select_policy; Type: POLICY; Schema: junctions; Owner: -
--

CREATE POLICY thread_participant_select_policy ON junctions.thread_participant FOR SELECT USING (((user_id = public.get_user_bubble_id()) OR (thread_id IN ( SELECT thread._id
   FROM public.thread
  WHERE ((thread."-Host User" = public.get_user_bubble_id()) OR (thread."-Guest User" = public.get_user_bubble_id()))))));


--
-- Name: user_guest_reason; Type: ROW SECURITY; Schema: junctions; Owner: -
--

ALTER TABLE junctions.user_guest_reason ENABLE ROW LEVEL SECURITY;

--
-- Name: user_lease; Type: ROW SECURITY; Schema: junctions; Owner: -
--

ALTER TABLE junctions.user_lease ENABLE ROW LEVEL SECURITY;

--
-- Name: user_listing_favorite; Type: ROW SECURITY; Schema: junctions; Owner: -
--

ALTER TABLE junctions.user_listing_favorite ENABLE ROW LEVEL SECURITY;

--
-- Name: user_permission; Type: ROW SECURITY; Schema: junctions; Owner: -
--

ALTER TABLE junctions.user_permission ENABLE ROW LEVEL SECURITY;

--
-- Name: user_preferred_hood; Type: ROW SECURITY; Schema: junctions; Owner: -
--

ALTER TABLE junctions.user_preferred_hood ENABLE ROW LEVEL SECURITY;

--
-- Name: user_proposal; Type: ROW SECURITY; Schema: junctions; Owner: -
--

ALTER TABLE junctions.user_proposal ENABLE ROW LEVEL SECURITY;

--
-- Name: user_rental_type_search; Type: ROW SECURITY; Schema: junctions; Owner: -
--

ALTER TABLE junctions.user_rental_type_search ENABLE ROW LEVEL SECURITY;

--
-- Name: user_storage_item; Type: ROW SECURITY; Schema: junctions; Owner: -
--

ALTER TABLE junctions.user_storage_item ENABLE ROW LEVEL SECURITY;

--
-- Name: listing Allow anon users to update listings; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Allow anon users to update listings" ON public.listing FOR UPDATE TO anon USING (true) WITH CHECK (true);


--
-- Name: proposal Allow anonymous proposal inserts for testing; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Allow anonymous proposal inserts for testing" ON public.proposal FOR INSERT TO anon WITH CHECK (true);


--
-- Name: POLICY "Allow anonymous proposal inserts for testing" ON proposal; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON POLICY "Allow anonymous proposal inserts for testing" ON public.proposal IS 'Temporary policy for development/testing. Remove before production deployment!';


--
-- Name: proposal Allow anonymous to view proposals for testing; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Allow anonymous to view proposals for testing" ON public.proposal FOR SELECT TO anon USING (true);


--
-- Name: listing Allow authenticated users to insert listings; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Allow authenticated users to insert listings" ON public.listing FOR INSERT TO authenticated WITH CHECK (true);


--
-- Name: proposal Allow authenticated users to insert proposals; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Allow authenticated users to insert proposals" ON public.proposal FOR INSERT TO authenticated WITH CHECK (((auth.uid())::text = "Guest"));


--
-- Name: listing Allow authenticated users to update listings; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Allow authenticated users to update listings" ON public.listing FOR UPDATE TO authenticated USING (true) WITH CHECK (true);


--
-- Name: listing_photo Allow public read access to listing photos; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Allow public read access to listing photos" ON public.listing_photo FOR SELECT TO authenticated, anon USING (true);


--
-- Name: listing Allow public read access to listings; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Allow public read access to listings" ON public.listing FOR SELECT USING (true);


--
-- Name: informationaltexts Enable read access for all users; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Enable read access for all users" ON public.informationaltexts FOR SELECT USING (true);


--
-- Name: proposal Hosts can view proposals for their listings; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Hosts can view proposals for their listings" ON public.proposal FOR SELECT USING (("Host User" IN ( SELECT "user"._id
   FROM public."user"
  WHERE ("user".email = (auth.jwt() ->> 'email'::text)))));


--
-- Name: external_reviews Public read access to external reviews; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Public read access to external reviews" ON public.external_reviews FOR SELECT USING (true);


--
-- Name: ai_parsing_queue Service role has full access to ai_parsing_queue; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Service role has full access to ai_parsing_queue" ON public.ai_parsing_queue USING ((auth.role() = 'service_role'::text));


--
-- Name: listing_drafts Users can delete own drafts; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Users can delete own drafts" ON public.listing_drafts FOR DELETE USING ((auth.uid() = user_id));


--
-- Name: notification_preferences Users can delete their own notification preferences; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Users can delete their own notification preferences" ON public.notification_preferences FOR DELETE USING (((auth.uid())::text = user_id));


--
-- Name: listing_drafts Users can insert own drafts; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Users can insert own drafts" ON public.listing_drafts FOR INSERT WITH CHECK ((auth.uid() = user_id));


--
-- Name: notification_preferences Users can insert own notification preferences; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Users can insert own notification preferences" ON public.notification_preferences FOR INSERT WITH CHECK (true);


--
-- Name: notification_preferences Users can insert their own notification preferences; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Users can insert their own notification preferences" ON public.notification_preferences FOR INSERT WITH CHECK (((auth.uid())::text = user_id));


--
-- Name: notification_preferences Users can read own notification preferences; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Users can read own notification preferences" ON public.notification_preferences FOR SELECT USING (true);


--
-- Name: listing_drafts Users can update own drafts; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Users can update own drafts" ON public.listing_drafts FOR UPDATE USING ((auth.uid() = user_id));


--
-- Name: notification_preferences Users can update own notification preferences; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Users can update own notification preferences" ON public.notification_preferences FOR UPDATE USING (true) WITH CHECK (true);


--
-- Name: proposal Users can update own proposals; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Users can update own proposals" ON public.proposal FOR UPDATE USING ((("Guest" = ( SELECT "user"._id
   FROM public."user"
  WHERE ("user".email = (auth.jwt() ->> 'email'::text))
 LIMIT 1)) OR ("Host User" = ( SELECT "user"._id
   FROM public."user"
  WHERE ("user".email = (auth.jwt() ->> 'email'::text))
 LIMIT 1)))) WITH CHECK ((("Guest" = ( SELECT "user"._id
   FROM public."user"
  WHERE ("user".email = (auth.jwt() ->> 'email'::text))
 LIMIT 1)) OR ("Host User" = ( SELECT "user"._id
   FROM public."user"
  WHERE ("user".email = (auth.jwt() ->> 'email'::text))
 LIMIT 1))));


--
-- Name: notification_preferences Users can update their own notification preferences; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Users can update their own notification preferences" ON public.notification_preferences FOR UPDATE USING (((auth.uid())::text = user_id)) WITH CHECK (((auth.uid())::text = user_id));


--
-- Name: listing_drafts Users can view own drafts; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Users can view own drafts" ON public.listing_drafts FOR SELECT USING ((auth.uid() = user_id));


--
-- Name: proposal Users can view own proposals; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Users can view own proposals" ON public.proposal FOR SELECT TO authenticated USING (("Guest" = ( SELECT "user"._id
   FROM public."user"
  WHERE ("user".email = (auth.jwt() ->> 'email'::text))
 LIMIT 1)));


--
-- Name: notification_preferences Users can view their own notification preferences; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Users can view their own notification preferences" ON public.notification_preferences FOR SELECT USING (((auth.uid())::text = user_id));


--
-- Name: ai_parsing_queue Users can view their own parsing queue items; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Users can view their own parsing queue items" ON public.ai_parsing_queue FOR SELECT USING ((user_id IN ( SELECT "user"._id
   FROM public."user"
  WHERE ("user".email = (auth.jwt() ->> 'email'::text)))));


--
-- Name: _message; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public._message ENABLE ROW LEVEL SECURITY;

--
-- Name: ai_parsing_queue; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.ai_parsing_queue ENABLE ROW LEVEL SECURITY;

--
-- Name: informationaltexts allow_all_select; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY allow_all_select ON public.informationaltexts FOR SELECT USING (true);


--
-- Name: external_reviews; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.external_reviews ENABLE ROW LEVEL SECURITY;

--
-- Name: listing; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.listing ENABLE ROW LEVEL SECURITY;

--
-- Name: listing_drafts; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.listing_drafts ENABLE ROW LEVEL SECURITY;

--
-- Name: listing_photo; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.listing_photo ENABLE ROW LEVEL SECURITY;

--
-- Name: multimessage; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.multimessage ENABLE ROW LEVEL SECURITY;

--
-- Name: notification_preferences; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.notification_preferences ENABLE ROW LEVEL SECURITY;

--
-- Name: proposal; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.proposal ENABLE ROW LEVEL SECURITY;

--
-- Name: _message service_role_full_access_message; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY service_role_full_access_message ON public._message TO service_role USING (true) WITH CHECK (true);


--
-- Name: thread service_role_full_access_thread; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY service_role_full_access_thread ON public.thread TO service_role USING (true) WITH CHECK (true);


--
-- Name: sync_config; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.sync_config ENABLE ROW LEVEL SECURITY;

--
-- Name: sync_queue; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.sync_queue ENABLE ROW LEVEL SECURITY;

--
-- Name: thread; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.thread ENABLE ROW LEVEL SECURITY;

--
-- Name: _message users_create_messages; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY users_create_messages ON public._message FOR INSERT TO authenticated WITH CHECK (((EXISTS ( SELECT 1
   FROM public.thread t
  WHERE ((t._id = _message."Associated Thread/Conversation") AND ((t."-Host User" = public.get_user_bubble_id()) OR (t."-Guest User" = public.get_user_bubble_id()))))) AND ("-Originator User" = public.get_user_bubble_id())));


--
-- Name: thread users_create_threads; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY users_create_threads ON public.thread FOR INSERT TO authenticated WITH CHECK ((("-Host User" = public.get_user_bubble_id()) OR ("-Guest User" = public.get_user_bubble_id()) OR ("Created By" = public.get_user_bubble_id())));


--
-- Name: thread users_read_own_threads; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY users_read_own_threads ON public.thread FOR SELECT TO authenticated USING ((("-Host User" = public.get_user_bubble_id()) OR ("-Guest User" = public.get_user_bubble_id())));


--
-- Name: _message users_read_visible_messages; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY users_read_visible_messages ON public._message FOR SELECT TO authenticated USING ((EXISTS ( SELECT 1
   FROM public.thread t
  WHERE ((t._id = _message."Associated Thread/Conversation") AND (((t."-Host User" = public.get_user_bubble_id()) AND (_message."is Visible to Host" = true)) OR ((t."-Guest User" = public.get_user_bubble_id()) AND (_message."is Visible to Guest" = true)))))));


--
-- Name: _message users_update_messages; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY users_update_messages ON public._message FOR UPDATE TO authenticated USING ((EXISTS ( SELECT 1
   FROM public.thread t
  WHERE ((t._id = _message."Associated Thread/Conversation") AND ((t."-Host User" = public.get_user_bubble_id()) OR (t."-Guest User" = public.get_user_bubble_id())))))) WITH CHECK ((EXISTS ( SELECT 1
   FROM public.thread t
  WHERE ((t._id = _message."Associated Thread/Conversation") AND ((t."-Host User" = public.get_user_bubble_id()) OR (t."-Guest User" = public.get_user_bubble_id()))))));


--
-- Name: thread users_update_own_threads; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY users_update_own_threads ON public.thread FOR UPDATE TO authenticated USING ((("-Host User" = public.get_user_bubble_id()) OR ("-Guest User" = public.get_user_bubble_id()))) WITH CHECK ((("-Host User" = public.get_user_bubble_id()) OR ("-Guest User" = public.get_user_bubble_id())));


--
-- Name: workflow_definitions; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.workflow_definitions ENABLE ROW LEVEL SECURITY;

--
-- Name: workflow_executions; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.workflow_executions ENABLE ROW LEVEL SECURITY;

--
-- Name: zat_faq Allow anon read faq; Type: POLICY; Schema: reference_table; Owner: -
--

CREATE POLICY "Allow anon read faq" ON reference_table.zat_faq FOR SELECT TO anon USING (true);


--
-- Name: zat_policiesdocuments Allow anon read visible policies; Type: POLICY; Schema: reference_table; Owner: -
--

CREATE POLICY "Allow anon read visible policies" ON reference_table.zat_policiesdocuments FOR SELECT TO anon USING ((("Active" = true) AND ("visible on logged out?" = true)));


--
-- Name: os_cohost_admins Allow anon users to read os_cohost_admins; Type: POLICY; Schema: reference_table; Owner: -
--

CREATE POLICY "Allow anon users to read os_cohost_admins" ON reference_table.os_cohost_admins FOR SELECT USING (true);


--
-- Name: os_melodies Allow anon users to read os_melodies; Type: POLICY; Schema: reference_table; Owner: -
--

CREATE POLICY "Allow anon users to read os_melodies" ON reference_table.os_melodies FOR SELECT TO anon USING (true);


--
-- Name: zat_policiesdocuments Allow authenticated read active policies; Type: POLICY; Schema: reference_table; Owner: -
--

CREATE POLICY "Allow authenticated read active policies" ON reference_table.zat_policiesdocuments FOR SELECT TO authenticated USING (("Active" = true));


--
-- Name: zat_faq Allow authenticated read faq; Type: POLICY; Schema: reference_table; Owner: -
--

CREATE POLICY "Allow authenticated read faq" ON reference_table.zat_faq FOR SELECT TO authenticated USING (true);


--
-- Name: os_cohost_admins Allow authenticated users to read os_cohost_admins; Type: POLICY; Schema: reference_table; Owner: -
--

CREATE POLICY "Allow authenticated users to read os_cohost_admins" ON reference_table.os_cohost_admins FOR SELECT USING (true);


--
-- Name: os_melodies Allow authenticated users to read os_melodies; Type: POLICY; Schema: reference_table; Owner: -
--

CREATE POLICY "Allow authenticated users to read os_melodies" ON reference_table.os_melodies FOR SELECT TO authenticated USING (true);


--
-- Name: os_postmark_webhook Allow public read; Type: POLICY; Schema: reference_table; Owner: -
--

CREATE POLICY "Allow public read" ON reference_table.os_postmark_webhook FOR SELECT USING (true);


--
-- Name: zat_features_cancellationpolicy Allow public read; Type: POLICY; Schema: reference_table; Owner: -
--

CREATE POLICY "Allow public read" ON reference_table.zat_features_cancellationpolicy FOR SELECT TO authenticated, anon USING (true);


--
-- Name: zat_features_houserule Allow public read; Type: POLICY; Schema: reference_table; Owner: -
--

CREATE POLICY "Allow public read" ON reference_table.zat_features_houserule FOR SELECT TO authenticated, anon USING (true);


--
-- Name: zat_features_listingtype Allow public read; Type: POLICY; Schema: reference_table; Owner: -
--

CREATE POLICY "Allow public read" ON reference_table.zat_features_listingtype FOR SELECT TO authenticated, anon USING (true);


--
-- Name: zat_features_parkingoptions Allow public read; Type: POLICY; Schema: reference_table; Owner: -
--

CREATE POLICY "Allow public read" ON reference_table.zat_features_parkingoptions FOR SELECT TO authenticated, anon USING (true);


--
-- Name: zat_features_safetyfeature Allow public read; Type: POLICY; Schema: reference_table; Owner: -
--

CREATE POLICY "Allow public read" ON reference_table.zat_features_safetyfeature FOR SELECT TO authenticated, anon USING (true);


--
-- Name: zat_features_storageoptions Allow public read; Type: POLICY; Schema: reference_table; Owner: -
--

CREATE POLICY "Allow public read" ON reference_table.zat_features_storageoptions FOR SELECT TO authenticated, anon USING (true);


--
-- Name: zat_goodguestreasons Allow public read; Type: POLICY; Schema: reference_table; Owner: -
--

CREATE POLICY "Allow public read" ON reference_table.zat_goodguestreasons FOR SELECT TO authenticated, anon USING (true);


--
-- Name: zat_htmlembed Allow public read; Type: POLICY; Schema: reference_table; Owner: -
--

CREATE POLICY "Allow public read" ON reference_table.zat_htmlembed FOR SELECT TO authenticated, anon USING (true);


--
-- Name: zat_location Allow public read; Type: POLICY; Schema: reference_table; Owner: -
--

CREATE POLICY "Allow public read" ON reference_table.zat_location FOR SELECT TO authenticated, anon USING (true);


--
-- Name: zat_priceconfiguration Allow public read; Type: POLICY; Schema: reference_table; Owner: -
--

CREATE POLICY "Allow public read" ON reference_table.zat_priceconfiguration FOR SELECT TO authenticated, anon USING (true);


--
-- Name: zat_splitleaseteam Allow public read; Type: POLICY; Schema: reference_table; Owner: -
--

CREATE POLICY "Allow public read" ON reference_table.zat_splitleaseteam FOR SELECT TO authenticated, anon USING (true);


--
-- Name: zat_storage Allow public read; Type: POLICY; Schema: reference_table; Owner: -
--

CREATE POLICY "Allow public read" ON reference_table.zat_storage FOR SELECT TO authenticated, anon USING (true);


--
-- Name: zat_successstory Allow public read; Type: POLICY; Schema: reference_table; Owner: -
--

CREATE POLICY "Allow public read" ON reference_table.zat_successstory FOR SELECT TO authenticated, anon USING (true);


--
-- Name: os_jingles Allow public read access; Type: POLICY; Schema: reference_table; Owner: -
--

CREATE POLICY "Allow public read access" ON reference_table.os_jingles FOR SELECT USING (true);


--
-- Name: os_logos Allow public read access; Type: POLICY; Schema: reference_table; Owner: -
--

CREATE POLICY "Allow public read access" ON reference_table.os_logos FOR SELECT USING (true);


--
-- Name: os_proxy_sms_channels Allow public read access; Type: POLICY; Schema: reference_table; Owner: -
--

CREATE POLICY "Allow public read access" ON reference_table.os_proxy_sms_channels FOR SELECT USING (true);


--
-- Name: os_split_lease_config Allow public read access; Type: POLICY; Schema: reference_table; Owner: -
--

CREATE POLICY "Allow public read access" ON reference_table.os_split_lease_config FOR SELECT USING (true);


--
-- Name: os_twilio_numbers Allow public read access; Type: POLICY; Schema: reference_table; Owner: -
--

CREATE POLICY "Allow public read access" ON reference_table.os_twilio_numbers FOR SELECT USING (true);


--
-- Name: os_ui_icons Allow public read access; Type: POLICY; Schema: reference_table; Owner: -
--

CREATE POLICY "Allow public read access" ON reference_table.os_ui_icons FOR SELECT USING (true);


--
-- Name: os_video_animations Allow public read access; Type: POLICY; Schema: reference_table; Owner: -
--

CREATE POLICY "Allow public read access" ON reference_table.os_video_animations FOR SELECT USING (true);


--
-- Name: os_zep_curation_parameters Allow public read access; Type: POLICY; Schema: reference_table; Owner: -
--

CREATE POLICY "Allow public read access" ON reference_table.os_zep_curation_parameters FOR SELECT TO authenticated, anon USING (true);


--
-- Name: zat_geo_borough_toplevel Allow public read access to boroughs; Type: POLICY; Schema: reference_table; Owner: -
--

CREATE POLICY "Allow public read access to boroughs" ON reference_table.zat_geo_borough_toplevel FOR SELECT USING (true);


--
-- Name: zat_geo_hood_mediumlevel Allow public read access to neighborhoods; Type: POLICY; Schema: reference_table; Owner: -
--

CREATE POLICY "Allow public read access to neighborhoods" ON reference_table.zat_geo_hood_mediumlevel FOR SELECT USING (true);


--
-- Name: cancellation_reasons Allow read access for all users; Type: POLICY; Schema: reference_table; Owner: -
--

CREATE POLICY "Allow read access for all users" ON reference_table.cancellation_reasons FOR SELECT USING (true);


--
-- Name: os_slack_webhooks Public read access for authenticated and anon users; Type: POLICY; Schema: reference_table; Owner: -
--

CREATE POLICY "Public read access for authenticated and anon users" ON reference_table.os_slack_webhooks FOR SELECT TO authenticated, anon USING (true);


--
-- Name: os_admin_users Public read access for os_admin_users; Type: POLICY; Schema: reference_table; Owner: -
--

CREATE POLICY "Public read access for os_admin_users" ON reference_table.os_admin_users FOR SELECT TO authenticated, anon USING (true);


--
-- Name: os_ai_fields_house_manual Public read access for os_ai_fields_house_manual; Type: POLICY; Schema: reference_table; Owner: -
--

CREATE POLICY "Public read access for os_ai_fields_house_manual" ON reference_table.os_ai_fields_house_manual FOR SELECT TO authenticated, anon USING (true);


--
-- Name: os_ai_fields_listing Public read access for os_ai_fields_listing; Type: POLICY; Schema: reference_table; Owner: -
--

CREATE POLICY "Public read access for os_ai_fields_listing" ON reference_table.os_ai_fields_listing FOR SELECT TO authenticated, anon USING (true);


--
-- Name: os_alert_type Public read access for os_alert_type; Type: POLICY; Schema: reference_table; Owner: -
--

CREATE POLICY "Public read access for os_alert_type" ON reference_table.os_alert_type FOR SELECT TO authenticated, anon USING (true);


--
-- Name: os_amenity_categories Public read access for os_amenity_categories; Type: POLICY; Schema: reference_table; Owner: -
--

CREATE POLICY "Public read access for os_amenity_categories" ON reference_table.os_amenity_categories FOR SELECT TO authenticated, anon USING (true);


--
-- Name: os_bathrooms Public read access for os_bathrooms; Type: POLICY; Schema: reference_table; Owner: -
--

CREATE POLICY "Public read access for os_bathrooms" ON reference_table.os_bathrooms FOR SELECT TO authenticated, anon USING (true);


--
-- Name: os_bedrooms Public read access for os_bedrooms; Type: POLICY; Schema: reference_table; Owner: -
--

CREATE POLICY "Public read access for os_bedrooms" ON reference_table.os_bedrooms FOR SELECT TO authenticated, anon USING (true);


--
-- Name: os_beds Public read access for os_beds; Type: POLICY; Schema: reference_table; Owner: -
--

CREATE POLICY "Public read access for os_beds" ON reference_table.os_beds FOR SELECT TO authenticated, anon USING (true);


--
-- Name: os_categories_guest_user_reviews Public read access for os_categories_guest_user_reviews; Type: POLICY; Schema: reference_table; Owner: -
--

CREATE POLICY "Public read access for os_categories_guest_user_reviews" ON reference_table.os_categories_guest_user_reviews FOR SELECT TO authenticated, anon USING (true);


--
-- Name: os_categories_house_manual_reviews Public read access for os_categories_house_manual_reviews; Type: POLICY; Schema: reference_table; Owner: -
--

CREATE POLICY "Public read access for os_categories_house_manual_reviews" ON reference_table.os_categories_house_manual_reviews FOR SELECT TO authenticated, anon USING (true);


--
-- Name: os_categories_listings_reviews Public read access for os_categories_listings_reviews; Type: POLICY; Schema: reference_table; Owner: -
--

CREATE POLICY "Public read access for os_categories_listings_reviews" ON reference_table.os_categories_listings_reviews FOR SELECT TO authenticated, anon USING (true);


--
-- Name: os_categories_stays_reviews Public read access for os_categories_stays_reviews; Type: POLICY; Schema: reference_table; Owner: -
--

CREATE POLICY "Public read access for os_categories_stays_reviews" ON reference_table.os_categories_stays_reviews FOR SELECT TO authenticated, anon USING (true);


--
-- Name: os_chatgpt_models Public read access for os_chatgpt_models; Type: POLICY; Schema: reference_table; Owner: -
--

CREATE POLICY "Public read access for os_chatgpt_models" ON reference_table.os_chatgpt_models FOR SELECT TO authenticated, anon USING (true);


--
-- Name: os_check_in_out_times Public read access for os_check_in_out_times; Type: POLICY; Schema: reference_table; Owner: -
--

CREATE POLICY "Public read access for os_check_in_out_times" ON reference_table.os_check_in_out_times FOR SELECT TO authenticated, anon USING (true);


--
-- Name: os_co_host_status Public read access for os_co_host_status; Type: POLICY; Schema: reference_table; Owner: -
--

CREATE POLICY "Public read access for os_co_host_status" ON reference_table.os_co_host_status FOR SELECT TO authenticated, anon USING (true);


--
-- Name: os_communication_preference Public read access for os_communication_preference; Type: POLICY; Schema: reference_table; Owner: -
--

CREATE POLICY "Public read access for os_communication_preference" ON reference_table.os_communication_preference FOR SELECT TO authenticated, anon USING (true);


--
-- Name: os_date_change_request_status Public read access for os_date_change_request_status; Type: POLICY; Schema: reference_table; Owner: -
--

CREATE POLICY "Public read access for os_date_change_request_status" ON reference_table.os_date_change_request_status FOR SELECT TO authenticated, anon USING (true);


--
-- Name: os_days Public read access for os_days; Type: POLICY; Schema: reference_table; Owner: -
--

CREATE POLICY "Public read access for os_days" ON reference_table.os_days FOR SELECT TO authenticated, anon USING (true);


--
-- Name: os_faq_type Public read access for os_faq_type; Type: POLICY; Schema: reference_table; Owner: -
--

CREATE POLICY "Public read access for os_faq_type" ON reference_table.os_faq_type FOR SELECT TO authenticated, anon USING (true);


--
-- Name: os_gender_type Public read access for os_gender_type; Type: POLICY; Schema: reference_table; Owner: -
--

CREATE POLICY "Public read access for os_gender_type" ON reference_table.os_gender_type FOR SELECT TO authenticated, anon USING (true);


--
-- Name: os_house_manual_audiences Public read access for os_house_manual_audiences; Type: POLICY; Schema: reference_table; Owner: -
--

CREATE POLICY "Public read access for os_house_manual_audiences" ON reference_table.os_house_manual_audiences FOR SELECT TO authenticated, anon USING (true);


--
-- Name: os_ideal_split_preference Public read access for os_ideal_split_preference; Type: POLICY; Schema: reference_table; Owner: -
--

CREATE POLICY "Public read access for os_ideal_split_preference" ON reference_table.os_ideal_split_preference FOR SELECT TO authenticated, anon USING (true);


--
-- Name: os_important_errors Public read access for os_important_errors; Type: POLICY; Schema: reference_table; Owner: -
--

CREATE POLICY "Public read access for os_important_errors" ON reference_table.os_important_errors FOR SELECT TO authenticated, anon USING (true);


--
-- Name: os_kitchen_type Public read access for os_kitchen_type; Type: POLICY; Schema: reference_table; Owner: -
--

CREATE POLICY "Public read access for os_kitchen_type" ON reference_table.os_kitchen_type FOR SELECT TO authenticated, anon USING (true);


--
-- Name: os_language Public read access for os_language; Type: POLICY; Schema: reference_table; Owner: -
--

CREATE POLICY "Public read access for os_language" ON reference_table.os_language FOR SELECT TO authenticated, anon USING (true);


--
-- Name: os_lease_status Public read access for os_lease_status; Type: POLICY; Schema: reference_table; Owner: -
--

CREATE POLICY "Public read access for os_lease_status" ON reference_table.os_lease_status FOR SELECT TO authenticated, anon USING (true);


--
-- Name: os_legal_page_type Public read access for os_legal_page_type; Type: POLICY; Schema: reference_table; Owner: -
--

CREATE POLICY "Public read access for os_legal_page_type" ON reference_table.os_legal_page_type FOR SELECT TO authenticated, anon USING (true);


--
-- Name: os_listing_photo_type Public read access for os_listing_photo_type; Type: POLICY; Schema: reference_table; Owner: -
--

CREATE POLICY "Public read access for os_listing_photo_type" ON reference_table.os_listing_photo_type FOR SELECT TO authenticated, anon USING (true);


--
-- Name: os_messaging_cta Public read access for os_messaging_cta; Type: POLICY; Schema: reference_table; Owner: -
--

CREATE POLICY "Public read access for os_messaging_cta" ON reference_table.os_messaging_cta FOR SELECT TO authenticated, anon USING (true);


--
-- Name: os_modality Public read access for os_modality; Type: POLICY; Schema: reference_table; Owner: -
--

CREATE POLICY "Public read access for os_modality" ON reference_table.os_modality FOR SELECT TO authenticated, anon USING (true);


--
-- Name: os_multi_message_status Public read access for os_multi_message_status; Type: POLICY; Schema: reference_table; Owner: -
--

CREATE POLICY "Public read access for os_multi_message_status" ON reference_table.os_multi_message_status FOR SELECT TO authenticated, anon USING (true);


--
-- Name: os_name_mapping Public read access for os_name_mapping; Type: POLICY; Schema: reference_table; Owner: -
--

CREATE POLICY "Public read access for os_name_mapping" ON reference_table.os_name_mapping FOR SELECT TO authenticated, anon USING (true);


--
-- Name: os_nights Public read access for os_nights; Type: POLICY; Schema: reference_table; Owner: -
--

CREATE POLICY "Public read access for os_nights" ON reference_table.os_nights FOR SELECT TO authenticated, anon USING (true);


--
-- Name: os_pages Public read access for os_pages; Type: POLICY; Schema: reference_table; Owner: -
--

CREATE POLICY "Public read access for os_pages" ON reference_table.os_pages FOR SELECT TO authenticated, anon USING (true);


--
-- Name: os_personas Public read access for os_personas; Type: POLICY; Schema: reference_table; Owner: -
--

CREATE POLICY "Public read access for os_personas" ON reference_table.os_personas FOR SELECT TO authenticated, anon USING (true);


--
-- Name: os_photo_evidence_type Public read access for os_photo_evidence_type; Type: POLICY; Schema: reference_table; Owner: -
--

CREATE POLICY "Public read access for os_photo_evidence_type" ON reference_table.os_photo_evidence_type FOR SELECT TO authenticated, anon USING (true);


--
-- Name: os_price_filter Public read access for os_price_filter; Type: POLICY; Schema: reference_table; Owner: -
--

CREATE POLICY "Public read access for os_price_filter" ON reference_table.os_price_filter FOR SELECT TO authenticated, anon USING (true);


--
-- Name: os_prompts Public read access for os_prompts; Type: POLICY; Schema: reference_table; Owner: -
--

CREATE POLICY "Public read access for os_prompts" ON reference_table.os_prompts FOR SELECT TO authenticated, anon USING (true);


--
-- Name: os_proposal_status Public read access for os_proposal_status; Type: POLICY; Schema: reference_table; Owner: -
--

CREATE POLICY "Public read access for os_proposal_status" ON reference_table.os_proposal_status FOR SELECT TO authenticated, anon USING (true);


--
-- Name: os_qr_code_use_cases Public read access for os_qr_code_use_cases; Type: POLICY; Schema: reference_table; Owner: -
--

CREATE POLICY "Public read access for os_qr_code_use_cases" ON reference_table.os_qr_code_use_cases FOR SELECT TO authenticated, anon USING (true);


--
-- Name: os_qty_guests Public read access for os_qty_guests; Type: POLICY; Schema: reference_table; Owner: -
--

CREATE POLICY "Public read access for os_qty_guests" ON reference_table.os_qty_guests FOR SELECT TO authenticated, anon USING (true);


--
-- Name: os_receipt Public read access for os_receipt; Type: POLICY; Schema: reference_table; Owner: -
--

CREATE POLICY "Public read access for os_receipt" ON reference_table.os_receipt FOR SELECT TO authenticated, anon USING (true);


--
-- Name: os_referral_contact_methods Public read access for os_referral_contact_methods; Type: POLICY; Schema: reference_table; Owner: -
--

CREATE POLICY "Public read access for os_referral_contact_methods" ON reference_table.os_referral_contact_methods FOR SELECT TO authenticated, anon USING (true);


--
-- Name: os_reminder_type Public read access for os_reminder_type; Type: POLICY; Schema: reference_table; Owner: -
--

CREATE POLICY "Public read access for os_reminder_type" ON reference_table.os_reminder_type FOR SELECT TO authenticated, anon USING (true);


--
-- Name: os_rental_type Public read access for os_rental_type; Type: POLICY; Schema: reference_table; Owner: -
--

CREATE POLICY "Public read access for os_rental_type" ON reference_table.os_rental_type FOR SELECT TO authenticated, anon USING (true);


--
-- Name: os_review_guest_questions Public read access for os_review_guest_questions; Type: POLICY; Schema: reference_table; Owner: -
--

CREATE POLICY "Public read access for os_review_guest_questions" ON reference_table.os_review_guest_questions FOR SELECT TO authenticated, anon USING (true);


--
-- Name: os_review_host_questions Public read access for os_review_host_questions; Type: POLICY; Schema: reference_table; Owner: -
--

CREATE POLICY "Public read access for os_review_host_questions" ON reference_table.os_review_host_questions FOR SELECT TO authenticated, anon USING (true);


--
-- Name: os_review_type Public read access for os_review_type; Type: POLICY; Schema: reference_table; Owner: -
--

CREATE POLICY "Public read access for os_review_type" ON reference_table.os_review_type FOR SELECT TO authenticated, anon USING (true);


--
-- Name: os_room_styles Public read access for os_room_styles; Type: POLICY; Schema: reference_table; Owner: -
--

CREATE POLICY "Public read access for os_room_styles" ON reference_table.os_room_styles FOR SELECT TO authenticated, anon USING (true);


--
-- Name: os_roommates Public read access for os_roommates; Type: POLICY; Schema: reference_table; Owner: -
--

CREATE POLICY "Public read access for os_roommates" ON reference_table.os_roommates FOR SELECT TO authenticated, anon USING (true);


--
-- Name: os_schedule_selection_types Public read access for os_schedule_selection_types; Type: POLICY; Schema: reference_table; Owner: -
--

CREATE POLICY "Public read access for os_schedule_selection_types" ON reference_table.os_schedule_selection_types FOR SELECT TO authenticated, anon USING (true);


--
-- Name: os_screen_size Public read access for os_screen_size; Type: POLICY; Schema: reference_table; Owner: -
--

CREATE POLICY "Public read access for os_screen_size" ON reference_table.os_screen_size FOR SELECT TO authenticated, anon USING (true);


--
-- Name: os_slack_channels Public read access for os_slack_channels; Type: POLICY; Schema: reference_table; Owner: -
--

CREATE POLICY "Public read access for os_slack_channels" ON reference_table.os_slack_channels FOR SELECT TO authenticated, anon USING (true);


--
-- Name: os_sort_by_properties_search Public read access for os_sort_by_properties_search; Type: POLICY; Schema: reference_table; Owner: -
--

CREATE POLICY "Public read access for os_sort_by_properties_search" ON reference_table.os_sort_by_properties_search FOR SELECT TO authenticated, anon USING (true);


--
-- Name: os_space_type Public read access for os_space_type; Type: POLICY; Schema: reference_table; Owner: -
--

CREATE POLICY "Public read access for os_space_type" ON reference_table.os_space_type FOR SELECT TO authenticated, anon USING (true);


--
-- Name: os_stay_periods Public read access for os_stay_periods; Type: POLICY; Schema: reference_table; Owner: -
--

CREATE POLICY "Public read access for os_stay_periods" ON reference_table.os_stay_periods FOR SELECT TO authenticated, anon USING (true);


--
-- Name: os_stay_status Public read access for os_stay_status; Type: POLICY; Schema: reference_table; Owner: -
--

CREATE POLICY "Public read access for os_stay_status" ON reference_table.os_stay_status FOR SELECT TO authenticated, anon USING (true);


--
-- Name: os_storage_parking_type Public read access for os_storage_parking_type; Type: POLICY; Schema: reference_table; Owner: -
--

CREATE POLICY "Public read access for os_storage_parking_type" ON reference_table.os_storage_parking_type FOR SELECT TO authenticated, anon USING (true);


--
-- Name: os_task_load Public read access for os_task_load; Type: POLICY; Schema: reference_table; Owner: -
--

CREATE POLICY "Public read access for os_task_load" ON reference_table.os_task_load FOR SELECT TO authenticated, anon USING (true);


--
-- Name: os_us_states Public read access for os_us_states; Type: POLICY; Schema: reference_table; Owner: -
--

CREATE POLICY "Public read access for os_us_states" ON reference_table.os_us_states FOR SELECT TO authenticated, anon USING (true);


--
-- Name: os_user_subtype Public read access for os_user_subtype; Type: POLICY; Schema: reference_table; Owner: -
--

CREATE POLICY "Public read access for os_user_subtype" ON reference_table.os_user_subtype FOR SELECT TO authenticated, anon USING (true);


--
-- Name: os_user_type Public read access for os_user_type; Type: POLICY; Schema: reference_table; Owner: -
--

CREATE POLICY "Public read access for os_user_type" ON reference_table.os_user_type FOR SELECT TO authenticated, anon USING (true);


--
-- Name: os_virtual_meeting_times Public read access for os_virtual_meeting_times; Type: POLICY; Schema: reference_table; Owner: -
--

CREATE POLICY "Public read access for os_virtual_meeting_times" ON reference_table.os_virtual_meeting_times FOR SELECT TO authenticated, anon USING (true);


--
-- Name: os_weekly_selection_options Public read access for os_weekly_selection_options; Type: POLICY; Schema: reference_table; Owner: -
--

CREATE POLICY "Public read access for os_weekly_selection_options" ON reference_table.os_weekly_selection_options FOR SELECT TO authenticated, anon USING (true);


--
-- Name: zat_geo_borough_toplevel Public read access for zat_geo_borough_toplevel; Type: POLICY; Schema: reference_table; Owner: -
--

CREATE POLICY "Public read access for zat_geo_borough_toplevel" ON reference_table.zat_geo_borough_toplevel FOR SELECT TO authenticated, anon USING (true);


--
-- Name: zat_geo_hood_mediumlevel Public read access for zat_geo_hood_mediumlevel; Type: POLICY; Schema: reference_table; Owner: -
--

CREATE POLICY "Public read access for zat_geo_hood_mediumlevel" ON reference_table.zat_geo_hood_mediumlevel FOR SELECT TO authenticated, anon USING (true);


--
-- Name: cancellation_reasons; Type: ROW SECURITY; Schema: reference_table; Owner: -
--

ALTER TABLE reference_table.cancellation_reasons ENABLE ROW LEVEL SECURITY;

--
-- Name: os_admin_users; Type: ROW SECURITY; Schema: reference_table; Owner: -
--

ALTER TABLE reference_table.os_admin_users ENABLE ROW LEVEL SECURITY;

--
-- Name: os_ai_fields_house_manual; Type: ROW SECURITY; Schema: reference_table; Owner: -
--

ALTER TABLE reference_table.os_ai_fields_house_manual ENABLE ROW LEVEL SECURITY;

--
-- Name: os_ai_fields_listing; Type: ROW SECURITY; Schema: reference_table; Owner: -
--

ALTER TABLE reference_table.os_ai_fields_listing ENABLE ROW LEVEL SECURITY;

--
-- Name: os_alert_type; Type: ROW SECURITY; Schema: reference_table; Owner: -
--

ALTER TABLE reference_table.os_alert_type ENABLE ROW LEVEL SECURITY;

--
-- Name: os_amenity_categories; Type: ROW SECURITY; Schema: reference_table; Owner: -
--

ALTER TABLE reference_table.os_amenity_categories ENABLE ROW LEVEL SECURITY;

--
-- Name: os_bathrooms; Type: ROW SECURITY; Schema: reference_table; Owner: -
--

ALTER TABLE reference_table.os_bathrooms ENABLE ROW LEVEL SECURITY;

--
-- Name: os_bedrooms; Type: ROW SECURITY; Schema: reference_table; Owner: -
--

ALTER TABLE reference_table.os_bedrooms ENABLE ROW LEVEL SECURITY;

--
-- Name: os_beds; Type: ROW SECURITY; Schema: reference_table; Owner: -
--

ALTER TABLE reference_table.os_beds ENABLE ROW LEVEL SECURITY;

--
-- Name: os_categories_guest_user_reviews; Type: ROW SECURITY; Schema: reference_table; Owner: -
--

ALTER TABLE reference_table.os_categories_guest_user_reviews ENABLE ROW LEVEL SECURITY;

--
-- Name: os_categories_house_manual_reviews; Type: ROW SECURITY; Schema: reference_table; Owner: -
--

ALTER TABLE reference_table.os_categories_house_manual_reviews ENABLE ROW LEVEL SECURITY;

--
-- Name: os_categories_listings_reviews; Type: ROW SECURITY; Schema: reference_table; Owner: -
--

ALTER TABLE reference_table.os_categories_listings_reviews ENABLE ROW LEVEL SECURITY;

--
-- Name: os_categories_stays_reviews; Type: ROW SECURITY; Schema: reference_table; Owner: -
--

ALTER TABLE reference_table.os_categories_stays_reviews ENABLE ROW LEVEL SECURITY;

--
-- Name: os_chatgpt_models; Type: ROW SECURITY; Schema: reference_table; Owner: -
--

ALTER TABLE reference_table.os_chatgpt_models ENABLE ROW LEVEL SECURITY;

--
-- Name: os_check_in_out_times; Type: ROW SECURITY; Schema: reference_table; Owner: -
--

ALTER TABLE reference_table.os_check_in_out_times ENABLE ROW LEVEL SECURITY;

--
-- Name: os_co_host_status; Type: ROW SECURITY; Schema: reference_table; Owner: -
--

ALTER TABLE reference_table.os_co_host_status ENABLE ROW LEVEL SECURITY;

--
-- Name: os_cohost_admins; Type: ROW SECURITY; Schema: reference_table; Owner: -
--

ALTER TABLE reference_table.os_cohost_admins ENABLE ROW LEVEL SECURITY;

--
-- Name: os_color_palette; Type: ROW SECURITY; Schema: reference_table; Owner: -
--

ALTER TABLE reference_table.os_color_palette ENABLE ROW LEVEL SECURITY;

--
-- Name: os_color_palette os_color_palette_read_anon; Type: POLICY; Schema: reference_table; Owner: -
--

CREATE POLICY os_color_palette_read_anon ON reference_table.os_color_palette FOR SELECT TO anon USING (true);


--
-- Name: os_color_palette os_color_palette_read_authenticated; Type: POLICY; Schema: reference_table; Owner: -
--

CREATE POLICY os_color_palette_read_authenticated ON reference_table.os_color_palette FOR SELECT TO authenticated USING (true);


--
-- Name: os_communication_preference; Type: ROW SECURITY; Schema: reference_table; Owner: -
--

ALTER TABLE reference_table.os_communication_preference ENABLE ROW LEVEL SECURITY;

--
-- Name: os_date_change_request_status; Type: ROW SECURITY; Schema: reference_table; Owner: -
--

ALTER TABLE reference_table.os_date_change_request_status ENABLE ROW LEVEL SECURITY;

--
-- Name: os_days; Type: ROW SECURITY; Schema: reference_table; Owner: -
--

ALTER TABLE reference_table.os_days ENABLE ROW LEVEL SECURITY;

--
-- Name: os_faq_type; Type: ROW SECURITY; Schema: reference_table; Owner: -
--

ALTER TABLE reference_table.os_faq_type ENABLE ROW LEVEL SECURITY;

--
-- Name: os_gender_type; Type: ROW SECURITY; Schema: reference_table; Owner: -
--

ALTER TABLE reference_table.os_gender_type ENABLE ROW LEVEL SECURITY;

--
-- Name: os_house_manual_audiences; Type: ROW SECURITY; Schema: reference_table; Owner: -
--

ALTER TABLE reference_table.os_house_manual_audiences ENABLE ROW LEVEL SECURITY;

--
-- Name: os_ideal_split_preference; Type: ROW SECURITY; Schema: reference_table; Owner: -
--

ALTER TABLE reference_table.os_ideal_split_preference ENABLE ROW LEVEL SECURITY;

--
-- Name: os_images; Type: ROW SECURITY; Schema: reference_table; Owner: -
--

ALTER TABLE reference_table.os_images ENABLE ROW LEVEL SECURITY;

--
-- Name: os_images os_images_public_read; Type: POLICY; Schema: reference_table; Owner: -
--

CREATE POLICY os_images_public_read ON reference_table.os_images FOR SELECT USING (true);


--
-- Name: os_important_errors; Type: ROW SECURITY; Schema: reference_table; Owner: -
--

ALTER TABLE reference_table.os_important_errors ENABLE ROW LEVEL SECURITY;

--
-- Name: os_jingles; Type: ROW SECURITY; Schema: reference_table; Owner: -
--

ALTER TABLE reference_table.os_jingles ENABLE ROW LEVEL SECURITY;

--
-- Name: os_kitchen_type; Type: ROW SECURITY; Schema: reference_table; Owner: -
--

ALTER TABLE reference_table.os_kitchen_type ENABLE ROW LEVEL SECURITY;

--
-- Name: os_language; Type: ROW SECURITY; Schema: reference_table; Owner: -
--

ALTER TABLE reference_table.os_language ENABLE ROW LEVEL SECURITY;

--
-- Name: os_lease_status; Type: ROW SECURITY; Schema: reference_table; Owner: -
--

ALTER TABLE reference_table.os_lease_status ENABLE ROW LEVEL SECURITY;

--
-- Name: os_legal_page_type; Type: ROW SECURITY; Schema: reference_table; Owner: -
--

ALTER TABLE reference_table.os_legal_page_type ENABLE ROW LEVEL SECURITY;

--
-- Name: os_listing_photo_type; Type: ROW SECURITY; Schema: reference_table; Owner: -
--

ALTER TABLE reference_table.os_listing_photo_type ENABLE ROW LEVEL SECURITY;

--
-- Name: os_logos; Type: ROW SECURITY; Schema: reference_table; Owner: -
--

ALTER TABLE reference_table.os_logos ENABLE ROW LEVEL SECURITY;

--
-- Name: os_melodies; Type: ROW SECURITY; Schema: reference_table; Owner: -
--

ALTER TABLE reference_table.os_melodies ENABLE ROW LEVEL SECURITY;

--
-- Name: os_messaging_cta; Type: ROW SECURITY; Schema: reference_table; Owner: -
--

ALTER TABLE reference_table.os_messaging_cta ENABLE ROW LEVEL SECURITY;

--
-- Name: os_modality; Type: ROW SECURITY; Schema: reference_table; Owner: -
--

ALTER TABLE reference_table.os_modality ENABLE ROW LEVEL SECURITY;

--
-- Name: os_multi_message_status; Type: ROW SECURITY; Schema: reference_table; Owner: -
--

ALTER TABLE reference_table.os_multi_message_status ENABLE ROW LEVEL SECURITY;

--
-- Name: os_name_mapping; Type: ROW SECURITY; Schema: reference_table; Owner: -
--

ALTER TABLE reference_table.os_name_mapping ENABLE ROW LEVEL SECURITY;

--
-- Name: os_narrators; Type: ROW SECURITY; Schema: reference_table; Owner: -
--

ALTER TABLE reference_table.os_narrators ENABLE ROW LEVEL SECURITY;

--
-- Name: os_narrators os_narrators_read; Type: POLICY; Schema: reference_table; Owner: -
--

CREATE POLICY os_narrators_read ON reference_table.os_narrators FOR SELECT USING (true);


--
-- Name: os_nights; Type: ROW SECURITY; Schema: reference_table; Owner: -
--

ALTER TABLE reference_table.os_nights ENABLE ROW LEVEL SECURITY;

--
-- Name: os_pages; Type: ROW SECURITY; Schema: reference_table; Owner: -
--

ALTER TABLE reference_table.os_pages ENABLE ROW LEVEL SECURITY;

--
-- Name: os_personas; Type: ROW SECURITY; Schema: reference_table; Owner: -
--

ALTER TABLE reference_table.os_personas ENABLE ROW LEVEL SECURITY;

--
-- Name: os_photo_evidence_type; Type: ROW SECURITY; Schema: reference_table; Owner: -
--

ALTER TABLE reference_table.os_photo_evidence_type ENABLE ROW LEVEL SECURITY;

--
-- Name: os_postmark_webhook; Type: ROW SECURITY; Schema: reference_table; Owner: -
--

ALTER TABLE reference_table.os_postmark_webhook ENABLE ROW LEVEL SECURITY;

--
-- Name: os_price_filter; Type: ROW SECURITY; Schema: reference_table; Owner: -
--

ALTER TABLE reference_table.os_price_filter ENABLE ROW LEVEL SECURITY;

--
-- Name: os_prompts; Type: ROW SECURITY; Schema: reference_table; Owner: -
--

ALTER TABLE reference_table.os_prompts ENABLE ROW LEVEL SECURITY;

--
-- Name: os_proposal_status; Type: ROW SECURITY; Schema: reference_table; Owner: -
--

ALTER TABLE reference_table.os_proposal_status ENABLE ROW LEVEL SECURITY;

--
-- Name: os_proxy_sms_channels; Type: ROW SECURITY; Schema: reference_table; Owner: -
--

ALTER TABLE reference_table.os_proxy_sms_channels ENABLE ROW LEVEL SECURITY;

--
-- Name: os_qr_code_use_cases; Type: ROW SECURITY; Schema: reference_table; Owner: -
--

ALTER TABLE reference_table.os_qr_code_use_cases ENABLE ROW LEVEL SECURITY;

--
-- Name: os_qty_guests; Type: ROW SECURITY; Schema: reference_table; Owner: -
--

ALTER TABLE reference_table.os_qty_guests ENABLE ROW LEVEL SECURITY;

--
-- Name: os_receipt; Type: ROW SECURITY; Schema: reference_table; Owner: -
--

ALTER TABLE reference_table.os_receipt ENABLE ROW LEVEL SECURITY;

--
-- Name: os_referral_contact_methods; Type: ROW SECURITY; Schema: reference_table; Owner: -
--

ALTER TABLE reference_table.os_referral_contact_methods ENABLE ROW LEVEL SECURITY;

--
-- Name: os_reminder_type; Type: ROW SECURITY; Schema: reference_table; Owner: -
--

ALTER TABLE reference_table.os_reminder_type ENABLE ROW LEVEL SECURITY;

--
-- Name: os_rental_type; Type: ROW SECURITY; Schema: reference_table; Owner: -
--

ALTER TABLE reference_table.os_rental_type ENABLE ROW LEVEL SECURITY;

--
-- Name: os_review_guest_questions; Type: ROW SECURITY; Schema: reference_table; Owner: -
--

ALTER TABLE reference_table.os_review_guest_questions ENABLE ROW LEVEL SECURITY;

--
-- Name: os_review_host_questions; Type: ROW SECURITY; Schema: reference_table; Owner: -
--

ALTER TABLE reference_table.os_review_host_questions ENABLE ROW LEVEL SECURITY;

--
-- Name: os_review_type; Type: ROW SECURITY; Schema: reference_table; Owner: -
--

ALTER TABLE reference_table.os_review_type ENABLE ROW LEVEL SECURITY;

--
-- Name: os_room_styles; Type: ROW SECURITY; Schema: reference_table; Owner: -
--

ALTER TABLE reference_table.os_room_styles ENABLE ROW LEVEL SECURITY;

--
-- Name: os_roommates; Type: ROW SECURITY; Schema: reference_table; Owner: -
--

ALTER TABLE reference_table.os_roommates ENABLE ROW LEVEL SECURITY;

--
-- Name: os_schedule_selection_types; Type: ROW SECURITY; Schema: reference_table; Owner: -
--

ALTER TABLE reference_table.os_schedule_selection_types ENABLE ROW LEVEL SECURITY;

--
-- Name: os_screen_size; Type: ROW SECURITY; Schema: reference_table; Owner: -
--

ALTER TABLE reference_table.os_screen_size ENABLE ROW LEVEL SECURITY;

--
-- Name: os_slack_channels; Type: ROW SECURITY; Schema: reference_table; Owner: -
--

ALTER TABLE reference_table.os_slack_channels ENABLE ROW LEVEL SECURITY;

--
-- Name: os_slack_webhooks; Type: ROW SECURITY; Schema: reference_table; Owner: -
--

ALTER TABLE reference_table.os_slack_webhooks ENABLE ROW LEVEL SECURITY;

--
-- Name: os_sort_by_properties_search; Type: ROW SECURITY; Schema: reference_table; Owner: -
--

ALTER TABLE reference_table.os_sort_by_properties_search ENABLE ROW LEVEL SECURITY;

--
-- Name: os_space_type; Type: ROW SECURITY; Schema: reference_table; Owner: -
--

ALTER TABLE reference_table.os_space_type ENABLE ROW LEVEL SECURITY;

--
-- Name: os_split_lease_config; Type: ROW SECURITY; Schema: reference_table; Owner: -
--

ALTER TABLE reference_table.os_split_lease_config ENABLE ROW LEVEL SECURITY;

--
-- Name: os_stay_periods; Type: ROW SECURITY; Schema: reference_table; Owner: -
--

ALTER TABLE reference_table.os_stay_periods ENABLE ROW LEVEL SECURITY;

--
-- Name: os_stay_status; Type: ROW SECURITY; Schema: reference_table; Owner: -
--

ALTER TABLE reference_table.os_stay_status ENABLE ROW LEVEL SECURITY;

--
-- Name: os_storage_parking_type; Type: ROW SECURITY; Schema: reference_table; Owner: -
--

ALTER TABLE reference_table.os_storage_parking_type ENABLE ROW LEVEL SECURITY;

--
-- Name: os_task_load; Type: ROW SECURITY; Schema: reference_table; Owner: -
--

ALTER TABLE reference_table.os_task_load ENABLE ROW LEVEL SECURITY;

--
-- Name: os_twilio_numbers; Type: ROW SECURITY; Schema: reference_table; Owner: -
--

ALTER TABLE reference_table.os_twilio_numbers ENABLE ROW LEVEL SECURITY;

--
-- Name: os_ui_icons; Type: ROW SECURITY; Schema: reference_table; Owner: -
--

ALTER TABLE reference_table.os_ui_icons ENABLE ROW LEVEL SECURITY;

--
-- Name: os_us_states; Type: ROW SECURITY; Schema: reference_table; Owner: -
--

ALTER TABLE reference_table.os_us_states ENABLE ROW LEVEL SECURITY;

--
-- Name: os_user_subtype; Type: ROW SECURITY; Schema: reference_table; Owner: -
--

ALTER TABLE reference_table.os_user_subtype ENABLE ROW LEVEL SECURITY;

--
-- Name: os_user_type; Type: ROW SECURITY; Schema: reference_table; Owner: -
--

ALTER TABLE reference_table.os_user_type ENABLE ROW LEVEL SECURITY;

--
-- Name: os_video_animations; Type: ROW SECURITY; Schema: reference_table; Owner: -
--

ALTER TABLE reference_table.os_video_animations ENABLE ROW LEVEL SECURITY;

--
-- Name: os_virtual_meeting_times; Type: ROW SECURITY; Schema: reference_table; Owner: -
--

ALTER TABLE reference_table.os_virtual_meeting_times ENABLE ROW LEVEL SECURITY;

--
-- Name: os_weekly_selection_options; Type: ROW SECURITY; Schema: reference_table; Owner: -
--

ALTER TABLE reference_table.os_weekly_selection_options ENABLE ROW LEVEL SECURITY;

--
-- Name: os_zep_curation_parameters; Type: ROW SECURITY; Schema: reference_table; Owner: -
--

ALTER TABLE reference_table.os_zep_curation_parameters ENABLE ROW LEVEL SECURITY;

--
-- Name: zat_faq; Type: ROW SECURITY; Schema: reference_table; Owner: -
--

ALTER TABLE reference_table.zat_faq ENABLE ROW LEVEL SECURITY;

--
-- Name: zat_features_cancellationpolicy; Type: ROW SECURITY; Schema: reference_table; Owner: -
--

ALTER TABLE reference_table.zat_features_cancellationpolicy ENABLE ROW LEVEL SECURITY;

--
-- Name: zat_features_houserule; Type: ROW SECURITY; Schema: reference_table; Owner: -
--

ALTER TABLE reference_table.zat_features_houserule ENABLE ROW LEVEL SECURITY;

--
-- Name: zat_features_listingtype; Type: ROW SECURITY; Schema: reference_table; Owner: -
--

ALTER TABLE reference_table.zat_features_listingtype ENABLE ROW LEVEL SECURITY;

--
-- Name: zat_features_parkingoptions; Type: ROW SECURITY; Schema: reference_table; Owner: -
--

ALTER TABLE reference_table.zat_features_parkingoptions ENABLE ROW LEVEL SECURITY;

--
-- Name: zat_features_safetyfeature; Type: ROW SECURITY; Schema: reference_table; Owner: -
--

ALTER TABLE reference_table.zat_features_safetyfeature ENABLE ROW LEVEL SECURITY;

--
-- Name: zat_features_storageoptions; Type: ROW SECURITY; Schema: reference_table; Owner: -
--

ALTER TABLE reference_table.zat_features_storageoptions ENABLE ROW LEVEL SECURITY;

--
-- Name: zat_geo_borough_toplevel; Type: ROW SECURITY; Schema: reference_table; Owner: -
--

ALTER TABLE reference_table.zat_geo_borough_toplevel ENABLE ROW LEVEL SECURITY;

--
-- Name: zat_geo_hood_mediumlevel; Type: ROW SECURITY; Schema: reference_table; Owner: -
--

ALTER TABLE reference_table.zat_geo_hood_mediumlevel ENABLE ROW LEVEL SECURITY;

--
-- Name: zat_goodguestreasons; Type: ROW SECURITY; Schema: reference_table; Owner: -
--

ALTER TABLE reference_table.zat_goodguestreasons ENABLE ROW LEVEL SECURITY;

--
-- Name: zat_htmlembed; Type: ROW SECURITY; Schema: reference_table; Owner: -
--

ALTER TABLE reference_table.zat_htmlembed ENABLE ROW LEVEL SECURITY;

--
-- Name: zat_location; Type: ROW SECURITY; Schema: reference_table; Owner: -
--

ALTER TABLE reference_table.zat_location ENABLE ROW LEVEL SECURITY;

--
-- Name: zat_policiesdocuments; Type: ROW SECURITY; Schema: reference_table; Owner: -
--

ALTER TABLE reference_table.zat_policiesdocuments ENABLE ROW LEVEL SECURITY;

--
-- Name: zat_priceconfiguration; Type: ROW SECURITY; Schema: reference_table; Owner: -
--

ALTER TABLE reference_table.zat_priceconfiguration ENABLE ROW LEVEL SECURITY;

--
-- Name: zat_splitleaseteam; Type: ROW SECURITY; Schema: reference_table; Owner: -
--

ALTER TABLE reference_table.zat_splitleaseteam ENABLE ROW LEVEL SECURITY;

--
-- Name: zat_storage; Type: ROW SECURITY; Schema: reference_table; Owner: -
--

ALTER TABLE reference_table.zat_storage ENABLE ROW LEVEL SECURITY;

--
-- Name: zat_successstory; Type: ROW SECURITY; Schema: reference_table; Owner: -
--

ALTER TABLE reference_table.zat_successstory ENABLE ROW LEVEL SECURITY;

--
-- Name: supabase_realtime; Type: PUBLICATION; Schema: -; Owner: -
--

CREATE PUBLICATION supabase_realtime WITH (publish = 'insert, update, delete, truncate');


--
-- Name: supabase_realtime_messages_publication; Type: PUBLICATION; Schema: -; Owner: -
--

CREATE PUBLICATION supabase_realtime_messages_publication WITH (publish = 'insert, update, delete, truncate');


--
-- Name: supabase_realtime _message; Type: PUBLICATION TABLE; Schema: public; Owner: -
--

ALTER PUBLICATION supabase_realtime ADD TABLE ONLY public._message;


--
-- Name: issue_graphql_placeholder; Type: EVENT TRIGGER; Schema: -; Owner: -
--

CREATE EVENT TRIGGER issue_graphql_placeholder ON sql_drop
         WHEN TAG IN ('DROP EXTENSION')
   EXECUTE FUNCTION extensions.set_graphql_placeholder();


--
-- Name: issue_pg_cron_access; Type: EVENT TRIGGER; Schema: -; Owner: -
--

CREATE EVENT TRIGGER issue_pg_cron_access ON ddl_command_end
         WHEN TAG IN ('CREATE EXTENSION')
   EXECUTE FUNCTION extensions.grant_pg_cron_access();


--
-- Name: issue_pg_graphql_access; Type: EVENT TRIGGER; Schema: -; Owner: -
--

CREATE EVENT TRIGGER issue_pg_graphql_access ON ddl_command_end
         WHEN TAG IN ('CREATE FUNCTION')
   EXECUTE FUNCTION extensions.grant_pg_graphql_access();


--
-- Name: issue_pg_net_access; Type: EVENT TRIGGER; Schema: -; Owner: -
--

CREATE EVENT TRIGGER issue_pg_net_access ON ddl_command_end
         WHEN TAG IN ('CREATE EXTENSION')
   EXECUTE FUNCTION extensions.grant_pg_net_access();


--
-- Name: pgrst_ddl_watch; Type: EVENT TRIGGER; Schema: -; Owner: -
--

CREATE EVENT TRIGGER pgrst_ddl_watch ON ddl_command_end
   EXECUTE FUNCTION extensions.pgrst_ddl_watch();


--
-- Name: pgrst_drop_watch; Type: EVENT TRIGGER; Schema: -; Owner: -
--

CREATE EVENT TRIGGER pgrst_drop_watch ON sql_drop
   EXECUTE FUNCTION extensions.pgrst_drop_watch();


--
-- PostgreSQL database dump complete
--

\unrestrict frbiVfSiMH3H3hhSXMJLrGeR8mqfUgERcrJHPIM7gmiCnmVWi4ZXFf7DeqQdYdm

