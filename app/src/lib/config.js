/**
 * Configuration Bridge for Inline Scripts
 *
 * Exposes Vite environment variables to window.ENV so they can be accessed
 * by inline <script> tags in HTML files where import.meta.env is not available.
 */

// Expose environment variables to global window object
window.ENV = {
  // Google Maps
  GOOGLE_MAPS_API_KEY: import.meta.env.VITE_GOOGLE_MAPS_API_KEY,

  // Supabase
  SUPABASE_URL: import.meta.env.VITE_SUPABASE_URL,
  SUPABASE_ANON_KEY: import.meta.env.VITE_SUPABASE_ANON_KEY,

  // Hotjar
  HOTJAR_SITE_ID: import.meta.env.VITE_HOTJAR_SITE_ID,

  // Environment identifier (from VITE_ENVIRONMENT or auto-detected)
  ENVIRONMENT: import.meta.env.VITE_ENVIRONMENT || (function() {
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
  })(),

  // Supabase project identifier (extracted from URL for debugging)
  SUPABASE_PROJECT_ID: import.meta.env.VITE_SUPABASE_URL?.split('//')[1]?.split('.')[0] || 'unknown'
};

// Log configuration loaded (useful for debugging)
console.log('Environment configuration loaded');
console.log('  Environment:', window.ENV.ENVIRONMENT);
console.log('  Supabase Project:', window.ENV.SUPABASE_PROJECT_ID);
console.log('  Supabase URL:', window.ENV.SUPABASE_URL || 'NOT SET');
console.log('  Google Maps API Key:', window.ENV.GOOGLE_MAPS_API_KEY ?
  window.ENV.GOOGLE_MAPS_API_KEY.substring(0, 20) + '...' : 'NOT SET');

// Dispatch event to notify that config is ready
window.dispatchEvent(new Event('env-config-loaded'));
