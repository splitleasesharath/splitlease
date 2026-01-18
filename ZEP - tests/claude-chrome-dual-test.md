# Claude for Chrome: Automated Dual-Tab Testing

## Overview

This script tells Claude for Chrome to:
1. Open **two tabs** (live + localhost)
2. Perform **identical actions** on both
3. **Compare results** automatically
4. **Report differences**

---

## Setup Instructions

### Step 1: Start Your Dev Server

```bash
bun run dev
```

Verify: http://localhost:8000 is running

---

### Step 2: Extract Affected Pages

```bash
node scripts/extract-affected-pages.js .claude/plans/New/20260111132021_fp_refactor_plan.md 8
```

This gives you:
- Live URL: https://split.lease/help-center
- Local URL: http://localhost:8000/help-center

---

### Step 3: Run Claude for Chrome Test

Copy this prompt and send it to Claude for Chrome:

```
I need you to test that two versions of a webpage are functionally identical.

**Test Configuration:**
- Live site: https://split.lease/help-center
- Local dev: http://localhost:8000/help-center

**Test Steps:**
1. Open BOTH URLs in separate tabs (multi-tab workflow)
2. Wait for both pages to fully load (networkidle)
3. Take snapshots of both tabs
4. Compare:
   - DOM structure (ignore dynamic IDs/timestamps)
   - Console logs (check for errors/warnings)
   - Visual appearance (screenshot diff)
5. Perform these interactions on BOTH tabs in parallel:
   - Search for "proposal" in the search box
   - Wait for results to appear
   - Click on the first article
   - Scroll to bottom
6. After each interaction, compare:
   - Network requests made (same endpoints, same payloads?)
   - DOM changes (same content rendered?)
   - Console output (any new errors?)
7. Generate a comparison report showing:
   - ✅ PASS: Items that are identical
   - ⚠️ DIFF: Items that differ (with details)
   - ❌ FAIL: Critical differences (errors, missing content)

**Expected Result:**
Both tabs should be IDENTICAL because the code hasn't been refactored yet (baseline test).

Please run this test and report your findings.
```

---

## What Claude for Chrome Will Do

### Phase 1: Initial Comparison (Page Load)
```javascript
// Claude for Chrome executes internally:
const liveTab = await browser.tabs.create({ url: 'https://split.lease/help-center' });
const localTab = await browser.tabs.create({ url: 'http://localhost:8000/help-center' });

await Promise.all([
  liveTab.waitForLoadState('networkidle'),
  localTab.waitForLoadState('networkidle')
]);

// Capture snapshots
const liveSnapshot = await liveTab.snapshot();
const localSnapshot = await localTab.snapshot();

// Compare
const domDiff = compareDOMs(liveSnapshot.dom, localSnapshot.dom);
const consoleDiff = compareConsoleLogs(liveSnapshot.console, localSnapshot.console);
const visualDiff = compareScreenshots(liveSnapshot.screenshot, localSnapshot.screenshot);
```

### Phase 2: Interaction Testing
```javascript
// Perform same interaction on both tabs in parallel
await Promise.all([
  liveTab.fill('input[type="search"]', 'proposal'),
  localTab.fill('input[type="search"]', 'proposal')
]);

await Promise.all([
  liveTab.waitForSelector('.search-results'),
  localTab.waitForSelector('.search-results')
]);

// Compare results
const liveResults = await liveTab.snapshot();
const localResults = await localTab.snapshot();

const resultsDiff = compareSnapshots(liveResults, localResults);
```

### Phase 3: Report Generation
```
📊 DUAL-TAB COMPARISON REPORT
═══════════════════════════════════════════════════════════════

✅ IDENTICAL (PASS)
─────────────────────────────────────────────────────────────
✓ Page title: "Help Center - Split Lease"
✓ Main content structure: 5 sections, 23 articles
✓ Search functionality: Works on both
✓ Console logs: No errors on either tab
✓ Network requests: 12 requests, all identical
✓ Visual layout: Pixel-perfect match (99.98% similarity)

⚠️ MINOR DIFFERENCES (ACCEPTABLE)
─────────────────────────────────────────────────────────────
• Timestamp in footer: Different by 2 seconds (expected)
• Session ID in cookies: Different (expected)

❌ CRITICAL DIFFERENCES (FAIL)
─────────────────────────────────────────────────────────────
None detected

══════════════════════════════════════════════════════════════
VERDICT: ✅ PASS - Sites are functionally identical
```

---

## Script for Multiple Pages

Once you've refactored a bundle of chunks, test ALL affected pages:

```
I need you to test multiple pages for functional equivalence between live and local dev.

**Pages to test:**
1. /help-center
2. /search
3. /view-split-lease

**For each page:**
- Live: https://split.lease/<page>
- Local: http://localhost:8000/<page>

**Test process:**
For each page:
1. Open both versions in separate tabs
2. Wait for full load
3. Compare DOM, console, visual
4. Perform key interactions (if applicable)
5. Compare after interactions

**Report format:**
For each page, show:
- ✅ PASS or ❌ FAIL
- List of differences (if any)
- Severity: CRITICAL, MINOR, or ACCEPTABLE

Generate a summary table at the end showing pass/fail for all pages.
```

---

## Interaction Test Library

For different page types, use different interactions:

### Search Page (`/search`)
```
Interactions:
1. Select date range
2. Select number of bedrooms
3. Toggle amenity filters
4. Click search button
5. Sort results by price
```

### Listing Page (`/view-split-lease`)
```
Interactions:
1. Click through photo gallery
2. Open map modal
3. Select availability days
4. Click "Create Proposal" button
5. Check proposal form appears
```

### Help Center (`/help-center`)
```
Interactions:
1. Search for "proposal"
2. Click first article
3. Click related article link
4. Navigate to different category
5. Search for "payment"
```

### Account Pages (Authenticated)
```
Pre-interaction:
1. Log in on BOTH tabs with test account
2. Verify session established on both

Interactions:
1. Navigate to account settings
2. Edit a field
3. Save changes
4. Refresh page
5. Verify changes persisted
```

---

## Scheduled Testing (Optional)

You can schedule Claude for Chrome to run tests automatically:

```
I want to set up a scheduled test that runs every time I save code changes.

**Schedule:**
- Watch for file changes in app/src/
- When changes detected, wait 5 seconds (for dev server reload)
- Run dual-tab test on affected pages
- Report results

**Affected pages:**
- /help-center (always test this as baseline)
- <additional pages based on what was changed>

Please set this up as a recurring task.
```

---

## Advanced: Automated Workflow

```
Create a complete test workflow:

**Step 1: Pre-Refactor Baseline**
- Test all 29 pages (live vs live)
- Should be 100% identical
- Save baseline snapshots

**Step 2: During Refactor**
- Test only affected pages (live vs local)
- Compare against baseline
- Flag any differences

**Step 3: Post-Refactor Verification**
- Test all affected pages
- All should still match baseline
- Generate pass/fail report

Run this workflow for CHUNK 8 affecting /help-center
```

---

## Tips for Best Results

### 1. Ignore Dynamic Content
```
When comparing, ignore these dynamic elements:
- Timestamps (any text matching /\d{4}-\d{2}-\d{2}/)
- Session IDs (any UUID format)
- CSRF tokens
- Random IDs in HTML attributes (data-id, etc.)
- Analytics tracking pixels
```

### 2. Focus on User-Visible Changes
```
Prioritize these checks:
- Text content matches
- Images load correctly
- Buttons work the same
- Forms submit successfully
- Navigation works identically
```

### 3. Network Request Comparison
```
For API calls, compare:
- Endpoint URLs (should be identical)
- Request method (GET, POST, etc.)
- Request body (excluding dynamic values)
- Response status (200, 404, etc.)
- Response structure (not exact values)
```

### 4. Console Log Filtering
```
Ignore these console messages:
- Google Analytics / Hotjar tracking
- "Download the React DevTools..."
- Performance metrics
- Cache warnings

Flag these as errors:
- JavaScript errors (red in console)
- Failed network requests (4xx, 5xx)
- Unhandled promise rejections
```

---

## Example: Complete Test Run

Send this to Claude for Chrome:

```
Test CHUNK 8 refactor:

**Setup:**
- Local dev: http://localhost:8000
- Live site: https://split.lease
- Affected page: /help-center

**Pre-refactor baseline:**
1. Test live vs local (both should be identical)
2. Expected: 100% match

**Post-refactor test (after I make the code changes):**
1. I'll tell you when I've saved the refactored code
2. Wait 5 seconds for dev server reload
3. Test live vs local again
4. Expected: Still 100% match (behavior unchanged)

**Report:**
Show me:
- Before refactor: Baseline status
- After refactor: Comparison results
- Any differences detected

Start with the baseline test. I'll tell you when to run the post-refactor test.
```

---

## Troubleshooting

### Issue: "localhost:8000 not accessible"
**Solution**: Make sure `bun run dev` is running in your terminal

### Issue: "Too many differences detected"
**Solution**: You may have uncommitted changes. Run baseline test (live vs live) first

### Issue: "Authentication required"
**Solution**: For auth-protected pages, log in on BOTH tabs before testing:
```
Please log in using these credentials on BOTH tabs:
- Email: test@example.com
- Password: [provide password]

Then proceed with the comparison test.
```

### Issue: "Dynamic content causing false positives"
**Solution**: Tell Claude to ignore specific elements:
```
When comparing, ignore these elements:
- .footer-timestamp
- [data-session-id]
- .analytics-tracker
```

---

## Next Steps

1. ✅ **Test the setup**: Run a baseline test (live vs local before refactoring)
2. ✅ **Refactor CHUNK 8**: Make the code changes
3. ✅ **Run post-refactor test**: Verify still identical
4. ✅ **Move to next chunk**: Repeat the process

**Ready?** Copy the prompt from Step 3 above and send it to Claude for Chrome!
