/**
 * Configuration Bridge for Inline Scripts
 *
 * Exposes Vite environment variables to window.ENV so they can be accessed
 * by inline <script> tags in HTML files where import.meta.env is not available.
 *
 * CRITICAL: import.meta.env only works in ES modules, not in inline scripts.
 * This file creates a bridge by setting window.ENV that inline scripts can use.
 *
 * DEPLOYMENT (Cloudflare Pages):
 *   Set these environment variables in your Cloudflare Pages dashboard:
 *   - VITE_GOOGLE_MAPS_API_KEY
 *   - VITE_SUPABASE_URL
 *   - VITE_SUPABASE_ANON_KEY
 *
 *   Vite will replace import.meta.env references at build time with actual values.
 *
 * Usage in HTML:
 *   <script type="module" src="/src/lib/config.js"></script>
 *   <script>
 *     // Can now access environment variables
 *     const apiKey = window.ENV?.GOOGLE_MAPS_API_KEY;
 *   </script>
 */

// ─────────────────────────────────────────────────────────────
// Constants
// ─────────────────────────────────────────────────────────────

const ENVIRONMENTS = Object.freeze({
  DEVELOPMENT: 'development',
  STAGING: 'staging',
  PRODUCTION: 'production'
})

const DEV_HOSTNAMES = Object.freeze(['localhost', '127.0.0.1', ''])

const STAGING_INDICATORS = Object.freeze(['staging', 'test', 'preview'])

const EVENT_CONFIG_LOADED = 'env-config-loaded'

const API_KEY_PREVIEW_LENGTH = 20

const LOG_PREFIX = '[config]'

// ─────────────────────────────────────────────────────────────
// Validation Predicates (Pure Functions)
// ─────────────────────────────────────────────────────────────

/**
 * Check if hostname indicates development environment
 * @pure
 */
const isDevelopmentHost = (hostname) =>
  DEV_HOSTNAMES.includes(hostname)

/**
 * Check if hostname indicates staging environment
 * @pure
 */
const isStagingHost = (hostname) =>
  STAGING_INDICATORS.some(indicator => hostname.includes(indicator))

// ─────────────────────────────────────────────────────────────
// Pure Helper Functions
// ─────────────────────────────────────────────────────────────

/**
 * Determine environment from hostname
 * @pure
 */
const detectEnvironment = (hostname) => {
  if (isDevelopmentHost(hostname)) {
    return ENVIRONMENTS.DEVELOPMENT
  }

  if (isStagingHost(hostname)) {
    return ENVIRONMENTS.STAGING
  }

  return ENVIRONMENTS.PRODUCTION
}

/**
 * Create preview of API key for logging
 * @pure
 */
const createApiKeyPreview = (key) =>
  key ? `${key.substring(0, API_KEY_PREVIEW_LENGTH)}...` : 'NOT SET'

// ─────────────────────────────────────────────────────────────
// Environment Configuration (Effectful)
// ─────────────────────────────────────────────────────────────

// Expose environment variables to global window object
window.ENV = Object.freeze({
  // Google Maps
  GOOGLE_MAPS_API_KEY: import.meta.env.VITE_GOOGLE_MAPS_API_KEY,

  // Supabase
  SUPABASE_URL: import.meta.env.VITE_SUPABASE_URL,
  SUPABASE_ANON_KEY: import.meta.env.VITE_SUPABASE_ANON_KEY,

  // Hotjar
  HOTJAR_SITE_ID: import.meta.env.VITE_HOTJAR_SITE_ID,

  // Environment detection
  ENVIRONMENT: detectEnvironment(window.location.hostname)
});

// Log configuration loaded (useful for debugging)
console.log(`${LOG_PREFIX} ✅ Environment configuration loaded`);
console.log(`${LOG_PREFIX}   Environment:`, window.ENV.ENVIRONMENT);
console.log(`${LOG_PREFIX}   Google Maps API Key:`, createApiKeyPreview(window.ENV.GOOGLE_MAPS_API_KEY));
console.log(`${LOG_PREFIX}   Supabase URL:`, window.ENV.SUPABASE_URL || 'NOT SET');

// Dispatch event to notify that config is ready
window.dispatchEvent(new Event(EVENT_CONFIG_LOADED));
