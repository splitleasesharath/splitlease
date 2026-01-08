/**
 * CORS configuration for Supabase Edge Functions
 * Split Lease - Bubble API Migration
 *
 * Provides immutable CORS headers for Edge Function responses.
 *
 * @module _shared/cors
 */

// ─────────────────────────────────────────────────────────────
// Constants
// ─────────────────────────────────────────────────────────────

const ALLOWED_ORIGINS = '*'
const ALLOWED_HEADERS = 'authorization, x-client-info, apikey, content-type'
const ALLOWED_METHODS = 'POST, GET, OPTIONS, PUT, DELETE'

// ─────────────────────────────────────────────────────────────
// Exports
// ─────────────────────────────────────────────────────────────

/**
 * Standard CORS headers for Edge Function responses
 * @immutable
 */
export const corsHeaders = Object.freeze({
  'Access-Control-Allow-Origin': ALLOWED_ORIGINS,
  'Access-Control-Allow-Headers': ALLOWED_HEADERS,
  'Access-Control-Allow-Methods': ALLOWED_METHODS,
})

// ─────────────────────────────────────────────────────────────
// Exported Test Constants
// ─────────────────────────────────────────────────────────────

/**
 * Exported for testing purposes
 * @test
 */
export const __test__ = Object.freeze({
  ALLOWED_ORIGINS,
  ALLOWED_HEADERS,
  ALLOWED_METHODS,
})
