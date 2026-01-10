# ADW FP Audit Browser Implement - Automated Functional Programming Refactoring Workflow

Fully automated workflow for refactoring JavaScript code to functional programming patterns with browser validation and Slack notifications.

---

## Overview

The FP Orchestrator automates the complete refactoring workflow:

```
AUDIT → EXTRACT → FOR EACH CHUNK → IMPLEMENT → VALIDATE → COMMIT/ROLLBACK
```

Each chunk is:
1. **Implemented** by Claude Code agent
2. **Validated** via browser automation on the specific affected page
3. **Committed** to git if validation passes
4. **Rolled back** if validation fails (site breaks)

All steps send real-time updates to Slack via webhook.

---

## Quick Start

### Prerequisites

1. **Dev server running**: `bun run dev` (http://localhost:8000)
2. **SHARATHPLAYGROUND webhook**: Set in environment variables
3. **CLAUDE_CODE_PATH**: Path to Claude CLI (set in .env)

### Run Full Orchestrator

```bash
# Audit app/src/logic and process all high-severity violations
uv run adws/adw_fp_audit_browser_implement.py app/src/logic --severity high

# Or just audit a specific directory
uv run adws/adw_fp_audit_browser_implement.py app/src/islands/pages/SearchPage --severity all
```

### What Happens

1. **Phase 1: Audit**
   - Runs FP audit script on target path
   - Generates chunk-based plan in `.claude/plans/New/`
   - Sends "Audit Started" webhook

2. **Phase 2: Chunk Processing** (for each chunk):
   - **Implement**: Claude Code applies the refactoring
   - **Validate**: Browser tests specific functionality
   - **Decision**:
     - ✅ Validation passed → Git commit → Next chunk
     - ❌ Validation failed → Git rollback → Skip chunk
   - Webhook sent after each step

3. **Phase 3: Summary**
   - Final stats: completed/skipped/failed chunks
   - Sends completion webhook

---

## Architecture

### Files

| File | Purpose |
|------|---------|
| `adw_fp_audit_browser_implement.py` | Main orchestrator script |
| `adw_modules/webhook.py` | Slack notification module |
| `adw_fp_audit.py` | FP audit (generates plan) |
| `adw_fp_implement.py` | Implementation (unused by orchestrator) |
| `adw_claude_browser.py` | Browser validation |

### Data Flow

```
┌─────────────────────────────────────────────────────────────┐
│ adw_fp_audit_browser_implement.py                                      │
├─────────────────────────────────────────────────────────────┤
│                                                             │
│  1. run_audit_phase()                                       │
│     ├─→ adw_fp_audit.py (runs audit, creates plan)         │
│     └─→ webhook: "Audit Started" → "Audit Complete"        │
│                                                             │
│  2. extract_chunks_from_plan()  ← YOUR TODO                 │
│     ├─→ Read plan file                                      │
│     ├─→ Parse chunks (markdown → ChunkData objects)         │
│     └─→ Return List[ChunkData]                              │
│                                                             │
│  3. process_chunks()                                        │
│     │                                                        │
│     ├─→ FOR EACH CHUNK:                                     │
│     │                                                        │
│     │   ┌─→ implement_chunk()                               │
│     │   │   ├─→ Claude Code agent (opus)                    │
│     │   │   └─→ webhook: "Implementing Chunk N"             │
│     │   │                                                    │
│     │   ├─→ validate_with_browser()                         │
│     │   │   ├─→ infer_validation_context()                  │
│     │   │   │   ├─→ Page mapping (file path → URL)          │
│     │   │   │   └─→ Test inference (code → tests)           │
│     │   │   ├─→ adw_claude_browser.py (browser automation)  │
│     │   │   └─→ webhook: "Validating Chunk N"               │
│     │   │                                                    │
│     │   └─→ DECISION:                                       │
│     │       ├─→ PASS → commit_chunk()                       │
│     │       │           ├─→ git commit                       │
│     │       │           └─→ webhook: "Chunk N Committed"     │
│     │       │                                                │
│     │       └─→ FAIL → rollback_chunk()                     │
│     │                   ├─→ git reset --hard                 │
│     │                   └─→ webhook: "Chunk N Rolled Back"   │
│     │                                                        │
│     └─→ Final summary webhook                               │
│                                                             │
└─────────────────────────────────────────────────────────────┘
```

---

## Intelligent Validation

The orchestrator doesn't just "check if the page loads" — it infers **which page** to test and **what specific functionality** could break.

### Page Inference

**File Path → Page URL Mapping:**

| File Path | Inferred Page | URL |
|-----------|--------------|-----|
| `pages/SearchPage.jsx` | Search | `/search` |
| `pages/AccountProfilePage/...` | Account Profile | `/account-profile` |
| `shared/LoggedInAvatar.jsx` | Account Profile (menu) | `/account-profile` |
| `shared/HostScheduleSelector.jsx` | Create Listing | `/self-listing` |
| `pages/ListingDashboardPage/components/PricingEditSection.jsx` | Listing Dashboard | `/listing-dashboard` |

### Test Inference

**Code Analysis → Specific Tests:**

| Code Contains | Inferred Tests |
|--------------|----------------|
| `day`, `schedule`, `calendar` | "Click days in calendar", "Verify selection highlights", "Check gap detection" |
| `price`, `pricing`, `compensation` | "Verify prices display", "Check for $NaN", "Test calculation updates" |
| `menu`, `menuitem`, `navigation` | "Open menu dropdown", "Verify items render", "Check badge counts" |
| `validation`, `error`, `required` | "Submit empty form", "Verify errors appear", "Check error clearing" |
| `map`, `marker`, `location` | "Verify map loads", "Check markers appear", "Test zoom/pan" |

### Example Validation

**Chunk:** Replace `.push()` in `LoggedInAvatar.jsx` menu items (CHUNK 9)

**Inferred Context:**
- **Page**: `/account-profile` (Account Profile - Avatar Menu)
- **Auth Required**: Yes
- **Specific Tests**:
  1. Click the user avatar/menu to open dropdown
  2. Verify all menu items render correctly
  3. Check badge counts display properly
  4. Test menu item navigation

**Browser Prompt:**
```
Navigate to: http://localhost:8000/account-profile

You MUST test the specific functionality that could break:
   1. Click the user avatar/menu to open dropdown
   2. Verify all menu items render correctly
   3. Check badge counts display properly
   4. Test menu item navigation

Report: VALIDATION PASSED or VALIDATION FAILED with details
```

---

## Webhook Notifications

All state transitions send Slack notifications to `SHARATHPLAYGROUND`.

### Notification Types

| Status | Emoji | When Sent |
|--------|-------|-----------|
| `started` | 🚀 | Workflow phase begins |
| `in_progress` | ⚙️ | Chunk implementation/validation in progress |
| `success` | ✅ | Step completed successfully |
| `failure` | ❌ | Step failed (error occurred) |
| `rollback` | ⏪ | Chunk rolled back after validation failure |

### Example Slack Message

```
🚀 FP ORCHESTRATOR: STARTED

Step: FP Audit
Time: 2026-01-10 14:23:04

Details:
Auditing app/src/logic for high severity violations
```

```
⚙️ FP ORCHESTRATOR: IN_PROGRESS

Step: Implementing Chunk 5
Time: 2026-01-10 14:25:17

Details: Replace .push() in formatBedroomsBathroomsKitchen

Metadata:
• file: app/src/islands/pages/FavoriteListingsPage/formatters.js
• line: 64-82
```

```
✅ FP ORCHESTRATOR: SUCCESS

Step: Chunk 5 Validation
Time: 2026-01-10 14:26:33

Details: All tests passed on Favorites page
```

---

## Your TODO: Chunk Extraction

The orchestrator is **90% complete**. You need to implement **one function**:

### `extract_chunks_from_plan(plan_file: Path) -> List[ChunkData]`

**Location:** `adws/adw_fp_audit_browser_implement.py:80`

**Input:** Path to plan file (e.g., `.claude/plans/New/20260110142304_fp_refactor_plan.md`)

**Output:** List of `ChunkData` objects

**ChunkData Structure:**
```python
@dataclass
class ChunkData:
    number: int               # Chunk number (1, 2, 3...)
    title: str               # Brief description
    file_path: str           # Relative path to file
    line_number: Optional[str]  # "123" or "123-456"
    current_code: str        # Code before refactoring
    refactored_code: str     # Code after refactoring
    testing_steps: List[str] # Testing checklist items
    raw_content: str         # Full chunk markdown
```

**Plan File Structure:**

Each chunk is separated by `---` horizontal rule:

```markdown
---

## 🔴 CHUNK 5: Replace .push() in formatBedroomsBathroomsKitchen

**File:** app/src/islands/pages/FavoriteListingsPage/formatters.js
**Lines:** 64-82
**Violation:** MUTATING_METHOD - Multiple conditional .push() calls
**Severity:** 🔴 High

**Current Code:**
```javascript
const parts = [];
if (bedrooms === 1) {
  parts.push('1 bedroom');
}
// ...
```

**Refactored Code:**
```javascript
const bedroomText = bedrooms === 1
  ? '1 bedroom'
  : bedrooms > 1 ? `${bedrooms} bedrooms` : null;
// ...
```

**Why This Matters:**
Each value is computed independently...

**Testing:**
- [ ] Verify "1 bedroom" displays for single bedroom
- [ ] Verify "X bedrooms" plural for multiple
- [ ] Verify bathroom display formatting

---
```

**Parsing Strategy:**

1. Split file content on `---` to get chunk sections
2. For each section:
   - Extract number from `## 🔴 CHUNK N:`
   - Extract title from header (text after "CHUNK N:")
   - Extract file path from `**File:** ...`
   - Extract line number from `**Line:**` or `**Lines:**`
   - Extract code blocks (first ` ```javascript` = current, second = refactored)
   - Extract testing items (lines starting with `- [ ]`)

3. Return list of `ChunkData` objects

**Considerations:**

- **Skip completed chunks?** If testing items are marked `[x]`, should chunk be skipped?
- **Validation?** Should you verify all required fields exist before returning?
- **Error handling?** What if a chunk is malformed (missing file path)?

---

## Testing

Once you implement `extract_chunks_from_plan()`, test the orchestrator:

### Dry Run (Single Chunk)

To test without running full workflow, modify the plan file to contain only 1 chunk, then:

```bash
uv run adws/adw_fp_audit_browser_implement.py app/src/logic --severity high
```

Watch for:
1. ✅ Audit completes
2. ✅ Chunks extracted (should show 1 chunk)
3. ✅ Implementation runs
4. ✅ Browser validation runs with specific tests
5. ✅ Commit or rollback happens
6. ✅ Webhook notifications appear in Slack

### Full Run

Once dry run works, restore the full plan and run:

```bash
uv run adws/adw_fp_audit_browser_implement.py app/src/logic --severity high
```

This will process all 110+ chunks. Monitor Slack for progress.

---

## Troubleshooting

### Browser validation always fails
- **Check**: Is dev server running? (`bun run dev`)
- **Check**: Is localhost:8000 accessible?
- **Check**: Are test credentials configured?

### Chunks not extracted
- **Check**: Does plan file exist at expected path?
- **Check**: Does `extract_chunks_from_plan()` return valid list?
- **Debug**: Add print statements to see what's being parsed

### Webhook not sending
- **Check**: Is `SHARATHPLAYGROUND` env var set?
- **Check**: Is webhook URL valid?
- **Test**: Run `webhook.py` directly with test message

### Git commits fail
- **Check**: Are files staged correctly?
- **Check**: Is working directory clean before starting?
- **Check**: Does git user/email configured?

---

## Next Steps

1. **Implement `extract_chunks_from_plan()`** in `adw_fp_audit_browser_implement.py`
2. **Test with single chunk** (modify plan file to have 1 chunk)
3. **Verify browser validation** works with specific tests
4. **Verify webhook notifications** appear in Slack
5. **Run full orchestrator** on all chunks
6. **Monitor progress** via Slack notifications

---

## Benefits

✅ **Zero manual intervention** - Runs completely unattended
✅ **Surgical rollbacks** - Each chunk is atomic, bad chunks don't break the batch
✅ **Intelligent validation** - Tests the RIGHT page with the RIGHT tests
✅ **Real-time monitoring** - Slack updates show progress and failures
✅ **Audit trail** - Git history shows exactly which chunks were applied
✅ **Safe** - Rollback on ANY validation failure prevents broken deploys

---

**Ready to run once you implement the chunk extraction function!**
