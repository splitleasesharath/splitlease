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

// Expose environment variables to global window object
window.ENV = {
  // Google Maps
  GOOGLE_MAPS_API_KEY: import.meta.env.VITE_GOOGLE_MAPS_API_KEY,

  // Supabase
  SUPABASE_URL: import.meta.env.VITE_SUPABASE_URL,
  SUPABASE_ANON_KEY: import.meta.env.VITE_SUPABASE_ANON_KEY,

  // Environment detection
  ENVIRONMENT: (function() {
    if (window.location.hostname === 'localhost' ||
        window.location.hostname === '127.0.0.1' ||
        window.location.hostname === '') {
      return 'development';
    }

    if (window.location.hostname.includes('staging') ||
        window.location.hostname.includes('test') ||
        window.location.hostname.includes('preview')) {
      return 'staging';
    }

    return 'production';
  })()
};

// Log configuration loaded (useful for debugging)
console.log('✅ Environment configuration loaded');
console.log('  Environment:', window.ENV.ENVIRONMENT);
console.log('  Google Maps API Key:', window.ENV.GOOGLE_MAPS_API_KEY ?
  window.ENV.GOOGLE_MAPS_API_KEY.substring(0, 20) + '...' : 'NOT SET');
console.log('  Supabase URL:', window.ENV.SUPABASE_URL || 'NOT SET');

// Dispatch event to notify that config is ready
window.dispatchEvent(new Event('env-config-loaded'));
