# Patch: Fix Footer Accessibility Violations (Issue #3)

## Metadata
adw_id: `3`
review_change_request: `Issue #3: 9 out of 26 accessibility tests are failing (65% pass rate instead of >90% target). Failures include: duplicate contentinfo landmarks (role="contentinfo" on footer element when role is already implicit), landmark uniqueness violations, touch target size not meeting 44x44px minimum, and missing semantic colors for success states. Resolution: 1) Remove redundant role="contentinfo" from footer element (line ~105 in Footer.tsx). 2) Add aria-label to differentiate landmark if multiple exist. 3) Update CSS to ensure all buttons and inputs meet 44x44px minimum touch target. 4) Add proper color contrast for success states with semantic colors. Severity: blocker`

## Issue Summary
**Original Spec:** specs/feature-431d9cc3-update-footer-esm-react-islands.md
**Issue:** 9 out of 26 accessibility tests failing (65% pass rate vs >90% target). Critical violations include duplicate contentinfo landmarks, touch targets below 44x44px minimum, and insufficient color contrast for success states.
**Solution:** Remove redundant ARIA roles from semantic HTML, ensure all interactive elements meet WCAG 2.1 AA touch target minimum (44x44px), add unique aria-labels to differentiate landmarks, and improve color contrast for success states with semantic colors.

## Files to Modify
- `app/split-lease/components/src/Footer/Footer.tsx` - Remove redundant role="contentinfo" from line 126 and line 416, add unique aria-labels to differentiate landmarks
- `app/split-lease/components/src/Footer/Footer.module.css` - Ensure all buttons and inputs meet 44x44px minimum, improve success message color contrast

## Implementation Steps
IMPORTANT: Execute every step in order, top to bottom.

### Step 1: Remove duplicate contentinfo role from footer element
- Open `app/split-lease/components/src/Footer/Footer.tsx`
- Line 126: Remove `role="contentinfo"` attribute from `<footer>` element (implicit role is already contentinfo)
- Line 416: Remove `role="contentinfo"` attribute from `<div className={styles.footerBottom}>` element
- Add unique `aria-label="Main footer navigation"` to main footer element (line 126) to differentiate it
- Add unique `aria-label="Copyright and legal information"` to footer bottom element (line 416) to differentiate it

### Step 2: Verify and enforce 44x44px minimum touch targets in CSS
- Open `app/split-lease/components/src/Footer/Footer.module.css`
- Verify CSS variable `--footer-min-touch-target: 44px` exists (line 18) - already present
- Verify all buttons have `min-height: var(--footer-min-touch-target)` - already present (lines 168, 316, 337)
- Verify all inputs have `min-height: var(--footer-min-touch-target)` - already present (line 117)
- Verify all links have `min-height: var(--footer-min-touch-target)` - already present (lines 58, 234)
- Verify radio buttons meet minimum size - increase from 20x20px to 24x24px (lines 99-100)
- Update `.referralOptions label` min-height to ensure entire label meets touch target (line 94)

### Step 3: Improve success message color contrast
- Open `app/split-lease/components/src/Footer/Footer.module.css`
- Line 149: Update `.successMessage` color from `#86efac` (light green) to `#22c55e` (darker semantic green) for better contrast against dark background
- Verify error message contrast is sufficient - current `#fca5a5` is acceptable but could be improved
- Line 141: Update `.errorMessage` color from `#fca5a5` to `#f87171` (darker semantic red) for better contrast

### Step 4: Add proper width to ensure buttons meet touch target width
- Open `app/split-lease/components/src/Footer/Footer.module.css`
- Verify `.shareBtn` and `.importBtn` have `width: 100%` (line 158) - already present, ensuring minimum 44px width
- Verify `.appStoreBtn` has minimum width - add `min-width: 44px` to line 316
- Verify `.alexaBtn` has minimum width - add `min-width: 44px` to line 337

## Validation
Execute every command to validate the patch is complete with zero regressions.

1. **TypeScript Type Check**
   ```bash
   cd app/split-lease/components && npm run typecheck
   ```
   Expected: Zero TypeScript errors

2. **Component Build**
   ```bash
   cd app/split-lease/components && npm run build
   ```
   Expected: Build succeeds without errors

3. **Component Diagnostic Tests**
   ```bash
   cd app/test-harness && npx playwright test --grep "diagnostics"
   ```
   Expected: All diagnostic tests pass, including accessibility checks

4. **Specific Accessibility Test**
   ```bash
   cd app/test-harness && npx playwright test --grep "accessibility violations"
   ```
   Expected: Zero accessibility violations detected

5. **Visual Regression Check**
   ```bash
   cd app/test-harness && npx playwright test footer-diagnostics.spec.js
   ```
   Expected: All tests pass with >90% pass rate (target: 26/26 tests)

## Patch Scope
**Lines of code to change:** ~10 lines (2 in Footer.tsx for role removal + aria-labels, 6 in Footer.module.css for color contrast and touch targets)
**Risk level:** Low - changes are focused on ARIA attributes and CSS styling, no functional logic changes
**Testing required:** Run accessibility diagnostic tests to verify all 26 tests pass (>90% target)
