# Code Refactoring with Visual Regression Testing Plan

**Date:** 2026-01-14
**Purpose:** Implement an automated workflow for code refactoring that ensures visual parity between dev and live environments using Opus, Gemini, and Playwright.

---

## Workflow Overview

The workflow consists of three main phases:

1.  **Opus Audit:** Opus (Claude 3.5 Sonnet/Opus) audits a specified directory to identify code issues and refactoring opportunities. It traces these issues to affected pages and groups them accordingly.
2.  **Gemini Implementation:** Gemini (Gemini 1.5 Pro/Flash) implements the refactoring plan page-by-page.
3.  **Playwright Visual Check:** After each page's chunks are implemented, Playwright performs a visual comparison between the dev server (localhost) and the live production site (split.lease).
    -   **PASS:** Git commit the changes.
    -   **FAIL:** Git reset --hard to revert changes and move to the next page group.

---

## Key Components

### 1. `adw_code_audit.py` (Opus Audit)
- **Tool:** Claude 3.5 Opus with `/ralph-loop`.
- **Input:** Target directory (e.g., `app/src/logic/calculators`).
- **Logic:**
    - Scan files in the target directory.
    - Identify issues (performance, duplication, maintainability).
    - Trace affected pages for each issue.
    - Output a chunk-based plan grouped by affected page.
- **Output:** `.claude/plans/New/<timestamp>_code_audit_plan.md`

### 2. `adw_code_implement_orchestrator.py` (Main Orchestrator)
- **Logic:**
    - Parse the audit plan file.
    - Start the dev server (port 8010).
    - For each **PAGE GROUP**:
        1. Invoke Gemini to implement all chunks for that page.
        2. Run Playwright visual check comparing `localhost:8010` vs `split.lease`.
        3. If **PASS** -> `git commit`.
        4. If **FAIL** -> `git reset --hard`.
    - Notify Slack (SHARATHPLAYGROUND) with results.

### 3. `adw_modules/visual_regression.py` (Visual Verification)
- **Tool:** Gemini 1.5 Pro + Playwright MCP.
- **Logic:**
    - Navigate to Live URL.
    - Navigate to Dev URL.
    - Capture screenshots/snapshots of both.
    - Compare and return a structured JSON verdict (`PASS` | `FAIL`).

---

## Implementation Details

### Audit Prompt (Opus)
```
/ralph-loop:ralph-loop

Audit the codebase at: {target_path}

**Your Task:**
1. Scan all files in {target_path} recursively.
2. Identify issues: performance, maintainability, duplication, anti-patterns.
3. For each issue, determine affected pages (trace imports/usage).
4. Create a chunk-based plan at: .claude/plans/New/{timestamp}_code_audit_plan.md

**CRITICAL: Group chunks by affected page**

Structure:
# Code Refactoring Plan - {target_path}

## PAGE GROUP: /search (Chunks: 1, 3, 7)
### CHUNK 1: [Description]
**File:** ...
**Line:** ...
**Issue:** ...
**Refactored Code:** ...
```

### Visual Parity Prompt (Gemini + Playwright)
```
Compare the refactored version of {page_path} against live production.

**Steps:**
1. Navigate to LIVE: https://split.lease{page_path}
2. Take LIVE screenshot.
3. Navigate to DEV: http://localhost:8010{page_path}
4. Take DEV screenshot.
5. Compare visually for layout, content, and interactive elements.

**Return JSON:**
{
  "visualParity": "PASS" | "FAIL",
  "issues": [],
  "consoleErrors": []
}
```

---

## Files to Create/Modify

1.  **`adws/adw_code_audit.py`**: (NEW) Orchestrator for the audit phase.
2.  **`adws/adw_code_implement_orchestrator.py`**: (NEW) Orchestrator for the implementation and verification phase.
3.  **`adws/adw_modules/visual_regression.py`**: (NEW) Module for visual parity logic.
4.  **`adws/prompts/code_audit_opus.txt`**: (NEW) Prompt template for Opus.
5.  **`adws/prompts/visual_check_gemini.txt`**: (NEW) Prompt template for Gemini visual check.

---

## Success Criteria

- [ ] Opus correctly traces logic changes to affected UI pages.
- [ ] Gemini implements changes without breaking existing functionality.
- [ ] Playwright accurately detects visual regressions.
- [ ] Commits are only made for verified visual parity.
- [ ] Slack notifications provide clear visibility into the nightly run.
