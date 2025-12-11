# Hotjar Tracking Implementation

**GENERATED**: 2025-12-11
**SCOPE**: Analytics tracking via Hotjar
**OPTIMIZATION**: LLM Reference + Implementation Guide

---

## QUICK_STATS

| Metric | Value |
|--------|-------|
| **Tracking Service** | Hotjar |
| **Script Version** | v6 (hjsv: 6) |
| **Configuration Method** | Environment Variable |
| **Initialization Pattern** | Event-Driven |
| **Pages Covered** | 27 HTML pages |
| **Core Files** | 2 (config.js, hotjar.js) |

---

## ARCHITECTURE OVERVIEW

```
┌─────────────────────────────────────────────────────────────────────────┐
│                         PAGE LOAD SEQUENCE                               │
├─────────────────────────────────────────────────────────────────────────┤
│                                                                          │
│  1. HTML <head> loads                                                    │
│            │                                                             │
│            ▼                                                             │
│  2. config.js loads (ES module)                                         │
│            │                                                             │
│            ├──► Sets window.ENV.HOTJAR_SITE_ID                          │
│            │    (from import.meta.env.VITE_HOTJAR_SITE_ID)              │
│            │                                                             │
│            └──► Dispatches 'env-config-loaded' event                    │
│                        │                                                 │
│                        ▼                                                 │
│  3. hotjar.js listens for event                                         │
│            │                                                             │
│            ├──► Reads window.ENV.HOTJAR_SITE_ID                         │
│            │                                                             │
│            └──► Injects Hotjar tracking script                          │
│                        │                                                 │
│                        ▼                                                 │
│  4. Hotjar CDN script loads asynchronously                              │
│            │                                                             │
│            └──► https://static.hotjar.com/c/hotjar-{SITE_ID}.js?sv=6    │
│                                                                          │
└─────────────────────────────────────────────────────────────────────────┘
```

---

## FILE STRUCTURE

```
app/
├── src/
│   └── lib/
│       ├── config.js      # Environment bridge - exposes VITE_HOTJAR_SITE_ID
│       └── hotjar.js      # Hotjar initialization script
├── public/
│   ├── index.html         # Includes both config.js and hotjar.js
│   ├── search.html        # Includes both config.js and hotjar.js
│   ├── view-split-lease.html
│   └── [24 more HTML files...]
└── .env                   # Contains VITE_HOTJAR_SITE_ID (not in git)
```

---

## CORE FILES

### app/src/lib/config.js

**Purpose**: Configuration bridge that exposes Vite environment variables to `window.ENV` for non-module scripts.

**Key Code**:
```javascript
// Expose environment variables to global window object
window.ENV = {
  // ... other config

  // Hotjar
  HOTJAR_SITE_ID: import.meta.env.VITE_HOTJAR_SITE_ID,

  // ... other config
};

// Dispatch event to notify that config is ready
window.dispatchEvent(new Event('env-config-loaded'));
```

**Why Needed**:
- `import.meta.env` only works in ES modules
- Hotjar script needs config at runtime, not build time
- Creates a bridge pattern for inline scripts and deferred loading

---

### app/src/lib/hotjar.js

**Purpose**: Initialize Hotjar tracking after environment configuration is loaded.

**Full Implementation**:
```javascript
/**
 * Initialize Hotjar Tracking
 * Uses window.ENV.HOTJAR_SITE_ID exposed by config.js
 * Loads asynchronously after environment configuration is ready
 */

function loadHotjar() {
  const siteId = window.ENV?.HOTJAR_SITE_ID;

  if (!siteId) {
    console.warn('Hotjar Site ID not found in window.ENV. Skipping tracking.');
    return;
  }

  console.log('Initializing Hotjar...');

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
```

**Key Features**:
| Feature | Description |
|---------|-------------|
| **Graceful Degradation** | Skips tracking if Site ID missing |
| **Event-Driven Loading** | Waits for `env-config-loaded` event |
| **Idempotent Event Listener** | Uses `{ once: true }` to prevent duplicate calls |
| **Async Script Injection** | Non-blocking script loading |
| **Standard Hotjar Snippet** | Official minified initialization code |

---

## HTML INTEGRATION PATTERN

Every HTML page in `app/public/` includes Hotjar via two script tags in `<head>`:

```html
<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <!-- ... other meta tags ... -->

  <!-- Load environment config FIRST - required for Hotjar -->
  <script type="module" src="/src/lib/config.js"></script>
  <script type="module" src="/src/lib/hotjar.js"></script>
</head>
<body>
  <!-- ... page content ... -->
</body>
</html>
```

**Critical**: Order matters. `config.js` MUST load before `hotjar.js`.

---

## PAGES WITH HOTJAR TRACKING

All 27 production pages include Hotjar tracking:

### Public Pages
| Page | HTML File | Description |
|------|-----------|-------------|
| Homepage | `index.html` | Main landing page |
| Search | `search.html` | Listing search |
| View Listing | `view-split-lease.html` | Listing detail |
| About Us | `about-us.html` | Company info |
| Careers | `careers.html` | Job listings |
| FAQ | `faq.html` | Frequently asked questions |
| Policies | `policies.html` | Terms, privacy |
| List With Us | `list-with-us.html` | Host CTA |
| Why Split Lease | `why-split-lease.html` | Value proposition |
| Help Center | `help-center.html` | Support portal |
| Help Category | `help-center-category.html` | Support category |
| 404 | `404.html` | Not found page |

### Protected/Auth Pages
| Page | HTML File | Description |
|------|-----------|-------------|
| Guest Proposals | `guest-proposals.html` | Guest booking dashboard |
| Host Proposals | `host-proposals.html` | Host proposal management |
| Account Profile | `account-profile.html` | User profile |
| Self Listing | `self-listing.html` | Create listing wizard |
| Self Listing V2 | `self-listing-v2.html` | New listing wizard |
| Listing Dashboard | `listing-dashboard.html` | Host listing management |
| Host Overview | `host-overview.html` | Host summary |
| Preview Listing | `preview-split-lease.html` | Listing preview |
| Favorite Listings | `favorite-listings.html` | Saved listings |
| Rental Application | `rental-application.html` | Apply for rental |
| Reset Password | `reset-password.html` | Password recovery |

### Success Pages
| Page | HTML File | Description |
|------|-----------|-------------|
| Guest Success | `guest-success.html` | Guest signup success |
| Host Success | `host-success.html` | Host signup success |

### Development/Test Pages
| Page | HTML File | Description |
|------|-----------|-------------|
| Search Test | `search-test.html` | Search testing |
| Internal Test | `_internal-test.html` | Internal testing |

---

## ENVIRONMENT CONFIGURATION

### Development (.env)

```bash
# Hotjar Site ID for tracking
VITE_HOTJAR_SITE_ID=your-hotjar-site-id
```

### Production (Cloudflare Pages)

Set in Cloudflare Pages Dashboard:
1. Go to **Settings** > **Environment variables**
2. Add variable: `VITE_HOTJAR_SITE_ID`
3. Value: Your Hotjar Site ID (numeric)

**Note**: The `VITE_` prefix is required for Vite to expose the variable via `import.meta.env`.

---

## HOTJAR SCRIPT BREAKDOWN

The Hotjar initialization uses the official minified snippet:

```javascript
(function(h,o,t,j,a,r){
    // h = window, o = document, t = CDN base, j = .js?sv= suffix

    // Create global hj function for API calls
    h.hj=h.hj||function(){(h.hj.q=h.hj.q||[]).push(arguments)};

    // Store settings
    h._hjSettings={hjid:siteId,hjsv:6};  // hjid = Site ID, hjsv = script version

    // Get <head> element
    a=o.getElementsByTagName('head')[0];

    // Create <script> element
    r=o.createElement('script');
    r.async=1;  // Load asynchronously

    // Build CDN URL: https://static.hotjar.com/c/hotjar-{SITE_ID}.js?sv=6
    r.src=t+h._hjSettings.hjid+j+h._hjSettings.hjsv;

    // Append to <head>
    a.appendChild(r);
})(window,document,'https://static.hotjar.com/c/hotjar-','.js?sv=');
```

---

## HOTJAR API USAGE

After Hotjar loads, you can use the global `hj()` function:

```javascript
// Trigger events
hj('trigger', 'some-event');

// Identify users (for user attributes)
hj('identify', userId, {
  email: user.email,
  name: user.name
});

// Tag recordings
hj('tagRecording', ['tag1', 'tag2']);

// Suppress specific recordings
hj('stateChange', '/new-path');
```

**Note**: The codebase currently uses basic Hotjar tracking without custom events or user identification.

---

## CONSOLE LOGGING

### Successful Load
```
✅ Environment configuration loaded
  Environment: production
  Google Maps API Key: AIzaSyB...
  Supabase URL: https://...
🔥 Initializing Hotjar...
```

### Missing Site ID
```
✅ Environment configuration loaded
⚠️ Hotjar Site ID not found in window.ENV. Skipping tracking.
```

---

## TROUBLESHOOTING

### Hotjar Not Loading

| Symptom | Cause | Solution |
|---------|-------|----------|
| "Site ID not found" warning | Missing `VITE_HOTJAR_SITE_ID` in .env | Add environment variable |
| No console output | `config.js` failed to load | Check network tab for 404 |
| Hotjar loads but no recordings | Site ID incorrect | Verify Site ID in Hotjar dashboard |
| Event listener never fires | Script load order wrong | Ensure config.js before hotjar.js |

### Verification Steps

1. **Check Environment Variable**:
   ```javascript
   console.log(window.ENV?.HOTJAR_SITE_ID);
   ```

2. **Check Hotjar Global**:
   ```javascript
   console.log(typeof hj === 'function');
   console.log(window._hjSettings);
   ```

3. **Check Network Tab**:
   - Look for `hotjar-{id}.js` request
   - Should return 200 status

4. **Use Hotjar Chrome Extension**:
   - Install "Hotjar Tracking Debugger"
   - Verifies tracking is active

---

## SECURITY CONSIDERATIONS

| Consideration | Implementation |
|---------------|----------------|
| **Site ID Exposure** | Site ID is public (appears in tracking script URL) - this is expected |
| **GDPR Compliance** | Hotjar handles consent via their platform settings |
| **Data Privacy** | Configure masking in Hotjar dashboard for sensitive fields |
| **CSP Headers** | Must allow `static.hotjar.com` in script-src |

---

## RELATED FILES

| File | Path | Purpose |
|------|------|---------|
| config.js | `app/src/lib/config.js` | Environment bridge |
| hotjar.js | `app/src/lib/hotjar.js` | Hotjar initialization |
| .env.example | `app/.env.example` | Environment template |
| _headers | `app/public/_headers` | Cloudflare security headers |

---

## MAINTENANCE CHECKLIST

When adding new pages:

- [ ] Add `<script type="module" src="/src/lib/config.js"></script>` to `<head>`
- [ ] Add `<script type="module" src="/src/lib/hotjar.js"></script>` after config.js
- [ ] Verify tracking works in development
- [ ] Test in production after deployment

When updating Hotjar:

- [ ] Check for new Hotjar script version (hjsv)
- [ ] Update `hotjar.js` if snippet changes
- [ ] Test across all page types

---

## VERSION HISTORY

| Date | Version | Changes |
|------|---------|---------|
| 2025-12-11 | 1.0 | Initial implementation with event-driven loading |

---

**VERSION**: 1.0
**LAST_UPDATED**: 2025-12-11
**MAINTAINER**: Claude Code
