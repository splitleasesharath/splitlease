# Patch: Fix CSS File Path in Footer Preview

## Metadata
adw_id: `2`
review_change_request: `Issue #2: The CSS file reference in footer-preview.html (line 244) points to 'dist/style.css' but the build outputs 'dist/assets/style.css', causing a 404 error and missing styles. Resolution: Update line 244 in app/test-harness/previews/footer-preview.html from: <link rel="stylesheet" href="../../split-lease/components/dist/style.css"> to: <link rel="stylesheet" href="../../split-lease/components/dist/assets/style.css"> Severity: blocker`

## Issue Summary
**Original Spec:** Not provided
**Issue:** The CSS file reference in footer-preview.html (line 244) points to 'dist/style.css', but the build outputs 'dist/assets/style.css'. This causes a 404 error when loading the preview page, resulting in missing component styles.
**Solution:** Update the CSS link href on line 244 to point to the correct path 'dist/assets/style.css' instead of 'dist/style.css'.

## Files to Modify
- `app/test-harness/previews/footer-preview.html` (line 244)

## Implementation Steps
IMPORTANT: Execute every step in order, top to bottom.

### Step 1: Update CSS file path in footer-preview.html
- Open `app/test-harness/previews/footer-preview.html`
- Locate line 244: `<link rel="stylesheet" href="../../split-lease/components/dist/style.css">`
- Change to: `<link rel="stylesheet" href="../../split-lease/components/dist/assets/style.css">`

## Validation
Execute every command to validate the patch is complete with zero regressions.

1. **TypeScript Type Check**
   - Command: `cd app/split-lease/components && npm run typecheck`
   - Purpose: Validate TypeScript type correctness

2. **Component Build**
   - Command: `cd app/split-lease/components && npm run build`
   - Purpose: Ensure components build successfully and verify CSS output location

3. **UMD Bundle Validation**
   - Command: `cd app/test-harness && npm run test:validate`
   - Purpose: Validate UMD bundle structure

4. **Component Contract Tests**
   - Command: `cd app/test-harness && npx playwright test --grep "contract"`
   - Purpose: Verify components render correctly with proper styles

5. **Component Diagnostic Tests**
   - Command: `cd app/test-harness && npx playwright test --grep "diagnostics"`
   - Purpose: Verify no console errors or accessibility issues

## Patch Scope
**Lines of code to change:** 1
**Risk level:** low
**Testing required:** Validate that footer-preview.html loads CSS correctly and component styles render properly in browser tests
