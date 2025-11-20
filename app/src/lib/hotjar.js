/**
 * Initialize Hotjar Tracking
 * Uses window.ENV.HOTJAR_SITE_ID exposed by config.js
 * Loads asynchronously after environment configuration is ready
 */

function loadHotjar() {
  const siteId = window.ENV?.HOTJAR_SITE_ID;

  if (!siteId) {
    console.warn('⚠️ Hotjar Site ID not found in window.ENV. Skipping tracking.');
    return;
  }

  console.log('🔥 Initializing Hotjar...');

  (function(h,o,t,j,a,r){
      h.hj=h.hj||function(){(h.hj.q=h.hj.q||[]).push(arguments)};
      h._hjSettings={hjid:siteId,hjsv:6};
      a=o.getElementsByTagName('head')[0];
      r=o.createElement('script');r.async=1;
      r.src=t+h._hjSettings.hjid+j+h._hjSettings.hjsv;
      a.appendChild(r);
  })(window,document,'https://static.hotjar.com/c/hotjar-','.js?sv=');
}

// Wait for config.js to load before running
if (window.ENV) {
  loadHotjar();
} else {
  window.addEventListener('env-config-loaded', loadHotjar, { once: true });
}
