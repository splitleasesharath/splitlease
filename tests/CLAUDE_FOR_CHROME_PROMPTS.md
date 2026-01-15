# Claude for Chrome: Copy-Paste Prompts

Quick prompts you can copy directly into Claude for Chrome.

---

## PROMPT 1: Baseline Test (Before Refactoring)

**Use this FIRST** to verify your setup works and both environments are identical.

```
Test that live and localhost are identical (baseline verification):

Live:  https://split.lease/help-center
Local: http://localhost:8000/help-center

Steps:
1. Open both URLs in separate tabs
2. Wait for full page load (networkidle)
3. Compare:
   • DOM structure (ignore timestamps/session IDs)
   • Console logs (check for errors)
   • Visual appearance (screenshot)
4. Test search: Type "proposal" in search box on both
5. Compare search results

Expected: 100% identical (no refactor yet)

Report format:
✅ PASS: What matches
⚠️ DIFF: What differs (with details)
❌ FAIL: Critical issues

Begin test now.
```

---

## PROMPT 2: Post-Refactor Test (After Code Changes)

**Use this AFTER** you've refactored the code and saved it.

```
Test refactored code (localhost) against live site:

Live:  https://split.lease/help-center
Local: http://localhost:8000/help-center

Note: I've refactored the search function in helpCenterData.js
Changed: .push() → .flatMap() (pure refactor, no behavior change)

Steps:
1. Open both URLs in separate tabs
2. Wait for full page load
3. Compare DOM, console, visual
4. Test search: "proposal" on both
5. Test search: "payment" on both
6. Test search: "listing" on both
7. Click first result on both
8. Verify article content matches

Expected: Still 100% identical (refactor shouldn't change behavior)

Report any differences with severity level.
```

---

## PROMPT 3: Multi-Page Test (After Chunk Bundle)

**Use this** when you've refactored multiple chunks affecting multiple pages.

```
Test multiple pages affected by refactor chunks 8-12:

Pages to test:
1. /help-center
2. /search
3. /view-split-lease

For each page:
• Live:  https://split.lease/<page>
• Local: http://localhost:8000/<page>

Process per page:
1. Open both in separate tabs
2. Wait for load
3. Compare DOM, console, visual
4. Perform key interactions:
   - /help-center: Search "proposal"
   - /search: Select filters, search
   - /view-split-lease: Open gallery, select dates

Report format:
Table showing:
| Page | Status | Issues |
|------|--------|--------|
| /help-center | ✅ PASS | None |
| /search | ⚠️ MINOR | Timestamp diff |
| /view-split-lease | ❌ FAIL | Error in console |

Begin testing.
```

---

## PROMPT 4: Deep Interaction Test

**Use this** for pages with complex interactions.

```
Deep interaction test for /view-split-lease page:

Live:  https://split.lease/view-split-lease/12345
Local: http://localhost:8000/view-split-lease/12345

Test sequence (perform on BOTH tabs in parallel):
1. Wait for page load
2. Click through photo gallery (5 photos)
3. Open map modal
4. Close map modal
5. Select these availability days: Mon, Tue, Wed
6. Click "Create Proposal" button
7. Verify proposal modal opens
8. Fill proposal form:
   - Move-in date: Next Monday
   - Message: "Test message"
9. DON'T submit (just verify form works)

Compare after each step:
• Network requests (same APIs called?)
• DOM state (same elements present?)
• Console (no errors?)

Report differences with step number where they occurred.
```

---

## PROMPT 5: Authentication Flow Test

**Use this** for testing authenticated pages.

```
Test authenticated pages:

Setup (do this FIRST):
1. Open live site: https://split.lease/login
2. Open local: http://localhost:8000/login
3. Log in on BOTH tabs:
   • Email: [your test email]
   • Password: [your test password]
4. Verify login successful on both

Then test these pages:
• /account-profile
• /guest-proposals
• /host-proposals

For each page:
1. Navigate on both tabs
2. Compare content
3. Test interactions (edit profile, view proposal details)
4. Verify changes persist

Report any auth-related differences.
```

---

## PROMPT 6: Network Traffic Analysis

**Use this** to focus on API calls (useful for Edge Function changes).

```
Network traffic comparison:

Live:  https://split.lease/search
Local: http://localhost:8000/search

Focus: API calls only

Steps:
1. Open both URLs
2. Open DevTools Network tab on both
3. Click "Search" button on both
4. Compare API requests:
   • Request URLs (should be identical)
   • Request methods (GET/POST)
   • Request payloads (excluding timestamps)
   • Response status codes
   • Response structures (not exact data)

Create table:
| Endpoint | Live Status | Local Status | Match? |
|----------|-------------|--------------|--------|
| /api/search | 200 | 200 | ✅ |
| /api/listings | 200 | 500 | ❌ |

Flag any 4xx or 5xx errors on local that don't exist on live.
```

---

## PROMPT 7: Console Log Comparison

**Use this** when you suspect JavaScript errors.

```
Console log deep dive:

Live:  https://split.lease/help-center
Local: http://localhost:8000/help-center

Focus: Console output only

Steps:
1. Open both URLs
2. Open DevTools Console
3. Perform these actions on both:
   • Page load
   • Search "proposal"
   • Click first result
   • Navigate back
   • Search "payment"

Capture all console messages.

Report format:
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
LIVE CONSOLE (split.lease):
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
[INFO] Page loaded
[INFO] Search triggered: proposal
...

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
LOCAL CONSOLE (localhost:8000):
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
[INFO] Page loaded
[ERROR] TypeError: Cannot read property 'map' of undefined
...

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
DIFFERENCES:
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
❌ Local has error that live doesn't have
```

---

## PROMPT 8: Visual Regression Test

**Use this** for pixel-perfect visual comparison.

```
Visual regression test:

Live:  https://split.lease/help-center
Local: http://localhost:8000/help-center

Steps:
1. Open both URLs
2. Wait for complete render (images, fonts loaded)
3. Take full-page screenshots of both
4. Perform pixel-by-pixel comparison
5. Generate diff image showing:
   • Green: Areas that match
   • Red: Areas that differ
   • Percentage similarity (aim for >99.5%)

Ignore acceptable differences:
• Footer timestamps
• Session-specific data
• A/B test variations

Report:
• Overall similarity %
• Coordinates of differences
• Severity of visual changes
```

---

## PROMPT 9: Scheduled Regression Test

**Use this** to set up continuous monitoring.

```
Set up continuous testing:

Monitor: localhost:8000 (dev server)
Baseline: split.lease (live site)
Pages: /help-center, /search, /view-split-lease

Workflow:
1. Watch for my signal: "Test now"
2. When I say "Test now":
   a. Wait 2 seconds (for dev server reload)
   b. Test all 3 pages
   c. Report summary: ✅ All pass | ⚠️ Some issues | ❌ Failures
3. Wait for next "Test now" signal

For failures, show:
• Which page failed
• What differed
• Suggested fix

Ready? Confirm you're monitoring.
```

---

## PROMPT 10: Emergency Debug

**Use this** when tests fail and you need detailed diagnosis.

```
URGENT: Debug test failure

Context:
• Refactored: helpCenterData.js (search function)
• Changed: .push() → .flatMap()
• Issue: Search results differ between live and local

Debug request:
1. Load both pages
2. Open DevTools
3. Test search: "proposal"
4. Capture:
   • Exact search results on live (count, titles, order)
   • Exact search results on local (count, titles, order)
   • Network requests
   • Console errors
   • JavaScript execution flow

Analyze:
• Why are results different?
• Is the refactor logic incorrect?
• Is there a data structure mismatch?

Provide:
• Root cause
• Exact fix needed in code
• Code snippet showing correction
```

---

## Quick Reference: Common Commands

| Task | Prompt Number | When to Use |
|------|---------------|-------------|
| First-time setup verification | PROMPT 1 | Before any refactoring |
| After refactoring one chunk | PROMPT 2 | After each code change |
| After refactoring multiple chunks | PROMPT 3 | After bundle complete |
| Testing complex user flows | PROMPT 4 | For interactive pages |
| Testing auth-protected pages | PROMPT 5 | After auth-related changes |
| Debugging API issues | PROMPT 6 | For Edge Function changes |
| Debugging JavaScript errors | PROMPT 7 | When console shows errors |
| Checking visual changes | PROMPT 8 | For UI/CSS refactors |
| Continuous monitoring | PROMPT 9 | During long refactor sessions |
| Emergency debugging | PROMPT 10 | When tests fail unexpectedly |

---

## Tips for Claude for Chrome

### 1. Be Specific About Timing
```
✅ GOOD: "Wait for networkidle state"
✅ GOOD: "Wait 5 seconds for dev server reload"
❌ BAD: "Wait a bit"
```

### 2. Define Acceptable Differences
```
✅ GOOD: "Ignore timestamps matching /\d{4}-\d{2}-\d{2}/"
❌ BAD: "Ignore dynamic stuff"
```

### 3. Request Structured Output
```
✅ GOOD: "Create a table showing pass/fail for each page"
❌ BAD: "Tell me if they're the same"
```

### 4. Break Down Complex Tests
```
✅ GOOD: "Test search, then navigation, then form separately"
❌ BAD: "Test everything at once"
```

### 5. Specify Failure Criteria
```
✅ GOOD: "Fail if: console errors, 4xx/5xx responses, or missing content"
❌ BAD: "Let me know if something's wrong"
```

---

## Ready to Test?

1. ✅ Start dev server: `bun run dev`
2. ✅ Copy **PROMPT 1** (Baseline Test)
3. ✅ Paste into Claude for Chrome
4. ✅ Watch it test both tabs automatically!

After baseline passes, refactor CHUNK 8 and run **PROMPT 2**.
