# Hotjar Implementation Guide

**Document ID**: 20251211100000
**Created**: 2025-12-11
**Last Updated**: 2025-12-11
**Status**: Current

---

## Overview

Hotjar is a behavior analytics tool used on Split Lease to track user sessions, heatmaps, and recordings. This document describes the current implementation approach and how to maintain it.

---

## Configuration

| Property | Value |
|----------|-------|
| **Site ID** | `6581463` |
| **Script Version** | `hjsv: 6` |
| **Dashboard** | https://insights.hotjar.com/sites/6581463 |

---

## Implementation Approach

### Current: Inline Script (Recommended)

All HTML pages include the official Hotjar tracking code **inline** in the `<head>` section:

```html
<!-- Hotjar Tracking Code for split.lease -->
<script>
  (function(h,o,t,j,a,r){
      h.hj=h.hj||function(){(h.hj.q=h.hj.q||[]).push(arguments)};
      h._hjSettings={hjid:6581463,hjsv:6};
      a=o.getElementsByTagName('head')[0];
      r=o.createElement('script');r.async=1;
      r.src=t+h._hjSettings.hjid+j+h._hjSettings.hjsv;
      a.appendChild(r);
  })(window,document,'https://static.hotjar.com/c/hotjar-','.js?sv=');
</script>
```

### Why Inline?

1. **Immediate Execution**: Script runs as HTML is parsed, not deferred
2. **Verification Passes**: Hotjar's verification tool can detect the code
3. **No Dependencies**: Doesn't rely on module loading or events
4. **Battle-Tested**: Official Hotjar recommended approach

---

## Historical Context

### Previous Approach (Deprecated - Pre Dec 2025)

The original implementation used ES modules:

```html
<!-- OLD - DO NOT USE -->
<script type="module" src="/src/lib/config.js"></script>
<script type="module" src="/src/lib/hotjar.js"></script>
```

**Why This Failed:**

| Issue | Impact |
|-------|--------|
| `type="module"` is deferred | Script executed after DOM ready, not during parse |
| Event-based loading | Additional delay waiting for `env-config-loaded` event |
| Verification failure | Hotjar's scan found no tracking code inline |
| Timing issues | Recordings stopped working intermittently |

### Files Retained (Not Used for Hotjar)

The following files still exist but are no longer used for Hotjar:

- `app/src/lib/hotjar.js` - Module-based Hotjar loader (deprecated)
- `app/src/lib/config.js` - Still used for Google Maps API key (NOT for Hotjar)

---

## Pages with Hotjar

All production HTML pages in `app/public/` include inline Hotjar tracking:

| Page | File |
|------|------|
| Homepage | `index.html` |
| Search | `search.html` |
| View Listing | `view-split-lease.html` |
| Preview Listing | `preview-split-lease.html` |
| Guest Proposals | `guest-proposals.html` |
| Host Proposals | `host-proposals.html` |
| Self Listing | `self-listing.html` |
| Self Listing V2 | `self-listing-v2.html` |
| Listing Dashboard | `listing-dashboard.html` |
| Host Overview | `host-overview.html` |
| Account Profile | `account-profile.html` |
| Favorite Listings | `favorite-listings.html` |
| Rental Application | `rental-application.html` |
| FAQ | `faq.html` |
| Policies | `policies.html` |
| List With Us | `list-with-us.html` |
| Why Split Lease | `why-split-lease.html` |
| Careers | `careers.html` |
| About Us | `about-us.html` |
| Help Center | `help-center.html` |
| Help Center Category | `help-center-category.html` |
| Guest Success | `guest-success.html` |
| Host Success | `host-success.html` |
| Reset Password | `reset-password.html` |
| 404 | `404.html` |
| Search Test | `search-test.html` |
| Internal Test | `_internal-test.html` |

### Pages WITHOUT Hotjar (Intentional)

| Page | Reason |
|------|--------|
| `index-dev.html` | Development only |
| `listing-card-demo.html` | Static demo |
| `listing-card-f.html` | Static demo |
| `logged-in-avatar-demo.html` | Static demo |

---

## Adding Hotjar to New Pages

When creating a new HTML page:

1. Add the inline script to the `<head>` section
2. Place it after CSS `<link>` tags
3. Place it before any other `<script>` tags

```html
<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Page Title - Split Lease</title>
  <link rel="stylesheet" href="/src/styles/main.css">

  <!-- Hotjar Tracking Code for split.lease -->
  <script>
    (function(h,o,t,j,a,r){
        h.hj=h.hj||function(){(h.hj.q=h.hj.q||[]).push(arguments)};
        h._hjSettings={hjid:6581463,hjsv:6};
        a=o.getElementsByTagName('head')[0];
        r=o.createElement('script');r.async=1;
        r.src=t+h._hjSettings.hjid+j+h._hjSettings.hjsv;
        a.appendChild(r);
    })(window,document,'https://static.hotjar.com/c/hotjar-','.js?sv=');
  </script>
</head>
<body>
  <!-- Page content -->
</body>
</html>
```

---

## Changing the Site ID

If the Hotjar Site ID needs to change:

1. Use find-and-replace across all `app/public/*.html` files
2. Search: `hjid:6581463`
3. Replace: `hjid:NEW_SITE_ID`

**Files to update**: ~27 HTML files

---

## Troubleshooting

### "Tracking code not found" Error

1. Verify the inline script exists in the HTML `<head>`
2. Ensure it's NOT loaded as `type="module"`
3. Check that `hjid` matches your Hotjar Site ID
4. Clear Cloudflare cache and redeploy

### Recordings Not Appearing

1. Check Hotjar dashboard for any quota limits
2. Verify the site is receiving traffic
3. Check browser console for JavaScript errors
4. Ensure ad blockers aren't blocking `static.hotjar.com`

### Verification Steps

1. Open your site in an incognito window
2. Open DevTools Network tab
3. Look for requests to `static.hotjar.com`
4. Check DevTools Console for Hotjar initialization messages

---

## Environment Variables (Legacy - Not Used)

The following environment variable exists but is **no longer used** for Hotjar:

| Variable | Location | Status |
|----------|----------|--------|
| `VITE_HOTJAR_SITE_ID` | `app/.env` | Not used (legacy) |
| `VITE_HOTJAR_SITE_ID` | Cloudflare Pages | Not used (legacy) |

These can be removed from configuration but pose no harm if left in place.

---

## Related Files

| File | Purpose |
|------|---------|
| `app/src/lib/hotjar.js` | Legacy module loader (not used) |
| `app/src/lib/config.js` | Environment config (used for Google Maps, NOT Hotjar) |
| `app/public/*.html` | All HTML files with inline Hotjar script |

---

## References

- [Hotjar Tracking Code Documentation](https://help.hotjar.com/hc/en-us/articles/115011639927-What-is-the-Hotjar-Tracking-Code)
- [Hotjar Installation Guide](https://help.hotjar.com/hc/en-us/articles/36819972345105-How-to-Install-Your-Hotjar-Tracking-Code)
- [Troubleshooting Installation](https://help.hotjar.com/hc/en-us/articles/36820019419537-Troubleshooting-FAQs-for-Tracking-Code-Installation)

---

## Version History

| Date | Version | Changes |
|------|---------|---------|
| 2025-12-11 | 2.0 | Migrated from ES module approach to inline scripts |
| 2025-11-20 | 1.0 | Initial implementation with event-driven loading (deprecated) |

---

**VERSION**: 2.0
**LAST_UPDATED**: 2025-12-11
**MAINTAINER**: Claude Code
