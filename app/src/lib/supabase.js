/**
 * Supabase Client Module
 *
 * Initializes the Supabase client for frontend operations.
 * Processes OAuth callbacks on module load.
 *
 * @module lib/supabase
 * @effectful - Creates client, processes callbacks
 */

import { createClient } from '@supabase/supabase-js';

// ─────────────────────────────────────────────────────────────
// Constants
// ─────────────────────────────────────────────────────────────

const ENV_VARS = Object.freeze({
  URL: 'VITE_SUPABASE_URL',
  ANON_KEY: 'VITE_SUPABASE_ANON_KEY'
})

const LOG_PREFIX = '[Supabase Init]'

// ─────────────────────────────────────────────────────────────
// Validation
// ─────────────────────────────────────────────────────────────

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseAnonKey) {
  throw new Error(`Missing Supabase environment variables: ${ENV_VARS.URL} and ${ENV_VARS.ANON_KEY} are required`);
}

// ─────────────────────────────────────────────────────────────
// Client Initialization
// ─────────────────────────────────────────────────────────────

/**
 * Supabase client instance
 * @effectful - Creates authenticated client connection
 */
export const supabase = createClient(supabaseUrl, supabaseAnonKey);

// ─────────────────────────────────────────────────────────────
// OAuth Callback Processing
// ─────────────────────────────────────────────────────────────

/**
 * Process any pending OAuth login callback immediately
 * This runs when the supabase module is first imported (early in app lifecycle)
 * Using dynamic import to avoid circular dependency (oauthCallbackHandler imports auth.js which imports supabase.js)
 * Result is fire-and-forget - the Header's onAuthStateChange will handle UI updates
 * @effectful
 */
import('./oauthCallbackHandler.js').then(({ processOAuthLoginCallback }) => {
  processOAuthLoginCallback().then(result => {
    if (result.processed) {
      console.log(`${LOG_PREFIX} OAuth callback processed:`, result.success ? 'success' : 'failed');
    }
  }).catch(err => {
    console.error(`${LOG_PREFIX} OAuth callback error:`, err);
  });
});

// ─────────────────────────────────────────────────────────────
// Exported Constants (for testing)
// ─────────────────────────────────────────────────────────────
export { ENV_VARS, LOG_PREFIX }
