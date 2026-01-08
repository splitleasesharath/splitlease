/**
 * Initialize Hotjar Tracking
 * Uses window.ENV.HOTJAR_SITE_ID exposed by config.js
 * Loads asynchronously after environment configuration is ready
 */

// ─────────────────────────────────────────────────────────────
// Constants
// ─────────────────────────────────────────────────────────────

const HOTJAR_CONFIG = Object.freeze({
  SCRIPT_VERSION: 6,
  BASE_URL: 'https://static.hotjar.com/c/hotjar-',
  SCRIPT_SUFFIX: '.js?sv='
})

const EVENT_CONFIG_LOADED = 'env-config-loaded'

const LOG_PREFIX = '[hotjar]'

// ─────────────────────────────────────────────────────────────
// Validation Predicates (Pure Functions)
// ─────────────────────────────────────────────────────────────

/**
 * Check if Hotjar site ID is available
 * @pure
 */
const hasSiteId = () =>
  Boolean(window.ENV?.HOTJAR_SITE_ID)

/**
 * Check if environment config is loaded
 * @pure
 */
const isEnvLoaded = () =>
  Boolean(window.ENV)

// ─────────────────────────────────────────────────────────────
// Effectful Functions
// ─────────────────────────────────────────────────────────────

/**
 * Load Hotjar tracking script
 * @effectful - modifies DOM, creates global state
 */
function loadHotjar() {
  const siteId = window.ENV?.HOTJAR_SITE_ID;

  if (!siteId) {
    console.warn(`${LOG_PREFIX} ⚠️ Hotjar Site ID not found in window.ENV. Skipping tracking.`);
    return;
  }

  console.log(`${LOG_PREFIX} 🔥 Initializing Hotjar...`);

  (function(h,o,t,j,a,r){
      h.hj=h.hj||function(){(h.hj.q=h.hj.q||[]).push(arguments)};
      h._hjSettings={hjid:siteId,hjsv:HOTJAR_CONFIG.SCRIPT_VERSION};
      a=o.getElementsByTagName('head')[0];
      r=o.createElement('script');r.async=1;
      r.src=t+h._hjSettings.hjid+j+h._hjSettings.hjsv;
      a.appendChild(r);
  })(window,document,HOTJAR_CONFIG.BASE_URL,HOTJAR_CONFIG.SCRIPT_SUFFIX);
}

// ─────────────────────────────────────────────────────────────
// Initialization (Effectful)
// ─────────────────────────────────────────────────────────────

// Wait for config.js to load before running
if (isEnvLoaded()) {
  loadHotjar();
} else {
  window.addEventListener(EVENT_CONFIG_LOADED, loadHotjar, { once: true });
}
