# Help Center Redirect Debug Report

**Test Date:** 2025-11-26
**Deployment URL:** https://14aec9d6.splitlease.pages.dev
**Main Domain:** https://split.lease
**Tester:** MCP Tool Specialist (Playwright Automation)

---

## Executive Summary

All 5 tests **FAILED** due to a **redirect loop** (`ERR_TOO_MANY_REDIRECTS`) affecting both the help-center page and help-center.html page on both the deployment URL and the main domain.

### Critical Issue

The `/help-center` and `/help-center.html` routes are caught in an infinite redirect loop, making the help center completely inaccessible to users.

---

## Test Results

### Test 1: Direct Navigation to /help-center

**Status:** FAILED
**URL Tested:** https://14aec9d6.splitlease.pages.dev/help-center
**Error:** `net::ERR_TOO_MANY_REDIRECTS`

**Details:**
- Browser attempted to navigate to `/help-center`
- Encountered infinite redirect loop
- Page never loaded
- No screenshot available (page never rendered)

**Error Message:**
```
page.goto: net::ERR_TOO_MANY_REDIRECTS at https://14aec9d6.splitlease.pages.dev/help-center
```

---

### Test 2: Direct Navigation to /help-center.html

**Status:** FAILED
**URL Tested:** https://14aec9d6.splitlease.pages.dev/help-center.html
**Error:** `net::ERR_TOO_MANY_REDIRECTS`

**Details:**
- Browser attempted to navigate to `/help-center.html`
- Encountered infinite redirect loop
- Page never loaded
- No screenshot available (page never rendered)

**Error Message:**
```
page.goto: net::ERR_TOO_MANY_REDIRECTS at https://14aec9d6.splitlease.pages.dev/help-center.html
```

---

### Test 3: Click Support Centre from Homepage

**Status:** FAILED
**URL Tested:** https://14aec9d6.splitlease.pages.dev (homepage)
**Action:** Clicked on "Support Centre" card

**Details:**
- Homepage loaded successfully
- Found "Support Centre" link on homepage
- Successfully clicked the link
- Browser navigated to chrome error page: `chrome-error://chromewebdata/`
- This confirms the link exists but leads to a broken redirect

**Final URL:** `chrome-error://chromewebdata/`
**Screenshot:** `C:\Users\Split Lease\My Drive\!Agent Context and Tools\SL21\Split Lease\.playwright-mcp\help-center-tests\test-3-homepage-support-centre-click.png`

**Screenshot Analysis:**
- Blank white page (browser error page)
- No content rendered
- Confirms redirect loop occurred after clicking

---

### Test 4: Click Support Centre from Search Page Menu

**Status:** FAILED
**URL Tested:** https://14aec9d6.splitlease.pages.dev/search.html
**Action:** Opened hamburger menu and clicked "Support Centre"

**Details:**
- Search page loaded successfully
- Found and clicked menu button using selector: `button[aria-label*="menu"]`
- Menu opened successfully
- Found and clicked "Support Centre" link in menu
- Browser navigated to chrome error page: `chrome-error://chromewebdata/`

**Final URL:** `chrome-error://chromewebdata/`
**Screenshot:** `C:\Users\Split Lease\My Drive\!Agent Context and Tools\SL21\Split Lease\.playwright-mcp\help-center-tests\test-4-search-menu-support-centre-click.png`

**Screenshot Analysis:**
- Blank white page (browser error page)
- No content rendered
- Confirms redirect loop occurred after clicking

---

### Test 5: Main Domain /help-center

**Status:** FAILED
**URL Tested:** https://split.lease/help-center
**Error:** `net::ERR_TOO_MANY_REDIRECTS`

**Details:**
- Attempted to navigate to main domain help-center
- Encountered same infinite redirect loop
- This confirms the issue exists in production, not just the preview deployment

**Error Message:**
```
page.goto: net::ERR_TOO_MANY_REDIRECTS at https://split.lease/help-center
```

---

## Root Cause Analysis

### 1. Configuration Files Examined

**File:** `C:\Users\Split Lease\My Drive\!Agent Context and Tools\SL21\Split Lease\app\public\_redirects`

**Relevant Lines:**
```
# Handle Help Center pages
# Direct .html access - serve the file directly
/help-center.html  /help-center.html  200
# Clean URL rewrites
/help-center  /help-center.html  200
/help-center/  /help-center.html  200
/help-center/*  /help-center-category.html  200
```

### 2. File Existence Verification

Files exist in both locations:
- `app/public/help-center.html` (1,129 bytes)
- `app/dist/help-center.html` (1,687 bytes)

The dist file is the built version with proper asset references:
```html
<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <title>Split Lease Help Center</title>
  <script type="module" crossorigin src="/assets/help-center-BpnoLS94.js"></script>
  <!-- ... other assets ... -->
</head>
<body>
  <div id="help-center-page"></div>
</body>
</html>
```

### 3. Potential Causes

#### Cause A: Self-Referencing Redirect (Most Likely)
Line 33 in `_redirects`:
```
/help-center.html  /help-center.html  200
```

This line creates a rewrite rule that rewrites `/help-center.html` to itself. While this should theoretically be harmless (it's a rewrite with status 200, not a redirect), Cloudflare Pages may be interpreting this as a redirect loop.

**Why this is problematic:**
- Cloudflare might be re-evaluating the _redirects file after each rewrite
- This creates an infinite loop: request → rewrite → re-evaluate → rewrite → ...
- The 200 status should prevent this, but Cloudflare's behavior may differ

#### Cause B: Cloudflare Function Conflict (Less Likely)
While no Cloudflare Function exists for `/help-center`, there might be:
- Dashboard-level redirects configured in Cloudflare Pages UI
- Worker scripts running on the domain
- DNS-level redirects

#### Cause C: File Path Resolution Issue (Unlikely)
The files exist in dist, but Cloudflare might not be serving them correctly:
- Asset paths in HTML are correct (e.g., `/assets/help-center-BpnoLS94.js`)
- No indication of file serving issues

---

## Recommended Fixes

### Fix 1: Remove Self-Referencing Rewrite Rule (Recommended)

**Change in `app/public/_redirects`:**

**Before:**
```
# Handle Help Center pages
# Direct .html access - serve the file directly
/help-center.html  /help-center.html  200
# Clean URL rewrites
/help-center  /help-center.html  200
/help-center/  /help-center.html  200
/help-center/*  /help-center-category.html  200
```

**After:**
```
# Handle Help Center pages
# Clean URL rewrites - .html files are served automatically by Cloudflare Pages
/help-center  /help-center.html  200
/help-center/  /help-center.html  200
/help-center/*  /help-center-category.html  200
```

**Rationale:**
- Cloudflare Pages automatically serves `.html` files
- The self-referencing rule (`/help-center.html  /help-center.html  200`) is unnecessary
- Removing it eliminates the potential redirect loop
- The clean URL rewrites (`/help-center` → `/help-center.html`) will still work

---

### Fix 2: Use Alternative Redirect Syntax (Alternative)

If Fix 1 doesn't work, try using explicit rewrite syntax:

```
# Handle Help Center pages
/help-center  /help-center.html  200!
/help-center/  /help-center.html  200!
/help-center/*  /help-center-category.html  200!
```

The `!` forces the rule to be the last match, preventing further evaluation.

---

### Fix 3: Check Cloudflare Dashboard Configuration (Verification)

1. Log into Cloudflare Pages Dashboard
2. Navigate to the Split Lease project
3. Check **Settings → Functions → Routes**
4. Verify no conflicting routes exist for `/help-center`
5. Check **Settings → Page Rules** (if using Cloudflare DNS)
6. Verify no redirect rules are configured at the DNS level

---

## Impact Assessment

### User Impact
- Help Center completely inaccessible
- Users clicking "Support Centre" from homepage or search page see blank error page
- No fallback or error message displayed
- Negative user experience

### Affected Routes
- https://split.lease/help-center
- https://split.lease/help-center.html
- https://14aec9d6.splitlease.pages.dev/help-center
- https://14aec9d6.splitlease.pages.dev/help-center.html

### Navigation Points Affected
1. Homepage "Support Centre" card
2. Search page hamburger menu "Support Centre" link
3. Direct URL access (both clean URL and .html extension)

---

## Testing Recommendations

After implementing Fix 1:

1. **Rebuild and redeploy**
   ```bash
   npm run build
   # Deploy to Cloudflare Pages
   ```

2. **Test all access methods:**
   - Direct navigation to `/help-center`
   - Direct navigation to `/help-center.html`
   - Click from homepage Support Centre card
   - Click from search page menu
   - Test on both preview deployment and production domain

3. **Verify no other pages affected:**
   - Check other pages with similar redirect patterns
   - Test `/faq`, `/policies`, `/why-split-lease`

4. **Monitor Cloudflare logs:**
   - Check for any redirect-related errors
   - Verify 200 status codes for help-center requests

---

## Additional Files for Reference

### Test Artifacts
- **Test Script:** `C:\Users\Split Lease\My Drive\!Agent Context and Tools\SL21\Split Lease\test-help-center.js`
- **JSON Report:** `C:\Users\Split Lease\My Drive\!Agent Context and Tools\SL21\Split Lease\.playwright-mcp\help-center-tests\test-report.json`
- **Screenshots:** `C:\Users\Split Lease\My Drive\!Agent Context and Tools\SL21\Split Lease\.playwright-mcp\help-center-tests\`

### Configuration Files
- **Redirects:** `C:\Users\Split Lease\My Drive\!Agent Context and Tools\SL21\Split Lease\app\public\_redirects`
- **Build Config:** `C:\Users\Split Lease\My Drive\!Agent Context and Tools\SL21\Split Lease\.pages.toml`

---

## Conclusion

The help center is completely broken due to a redirect loop caused by the `_redirects` configuration. The most likely fix is to remove the self-referencing rewrite rule for `/help-center.html`. This should be a simple one-line change that can be deployed immediately to restore functionality.

**Priority:** HIGH (user-facing feature completely broken)
**Effort:** LOW (one-line configuration change)
**Risk:** LOW (removing unnecessary redirect rule)

---

## Next Steps

1. Implement Fix 1 (remove self-referencing rewrite)
2. Rebuild application (`npm run build`)
3. Deploy to Cloudflare Pages
4. Re-run Playwright tests to verify fix
5. Test manually on both domains
6. Monitor for any side effects
