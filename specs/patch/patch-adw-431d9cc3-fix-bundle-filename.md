# Patch: Fix Bundle Filename Reference in Footer Preview

## Metadata
adw_id: `431d9cc3`
review_change_request: `Issue #1: The footer-preview.html file references the wrong bundle filename. Line 257 loads 'split-lease-components.umd.cjs' but the build outputs 'split-lease-components.umd.js'. This causes a 404 error and prevents the component from loading entirely in the browser preview. Resolution: Update line 257 in app/test-harness/previews/footer-preview.html from: <script src="../../split-lease/components/dist/split-lease-components.umd.cjs"></script> to: <script src="../../split-lease/components/dist/split-lease-components.umd.js"></script> Severity: blocker`

## Issue Summary
**Original Spec:** N/A
**Issue:** The footer-preview.html file on line 257 references 'split-lease-components.umd.cjs' but the build process outputs 'split-lease-components.umd.js', causing a 404 error that prevents the component from loading in the browser preview.
**Solution:** Update the script tag on line 257 to reference the correct bundle filename 'split-lease-components.umd.js'.

## Files to Modify
- `app/test-harness/previews/footer-preview.html`

## Implementation Steps
IMPORTANT: Execute every step in order, top to bottom.

### Step 1: Update bundle filename reference
- Open `app/test-harness/previews/footer-preview.html`
- Locate line 257 containing the script tag
- Change `split-lease-components.umd.cjs` to `split-lease-components.umd.js`

## Validation
Execute every command to validate the patch is complete with zero regressions.

1. **TypeScript Type Check**
   - Command: `cd app/split-lease/components && npm run typecheck`
   - Purpose: Ensure no TypeScript errors

2. **Component Build**
   - Command: `cd app/split-lease/components && npm run build`
   - Purpose: Verify the build produces the correct bundle file

3. **UMD Bundle Validation**
   - Command: `cd app/test-harness && npm run test:validate`
   - Purpose: Validate the UMD bundle structure and exports

4. **Component Contract Tests**
   - Command: `cd app/test-harness && npx playwright test --grep "contract"`
   - Purpose: Ensure components render correctly in the browser

5. **Component Diagnostic Tests**
   - Command: `cd app/test-harness && npx playwright test --grep "diagnostics"`
   - Purpose: Verify no console errors or accessibility violations

## Patch Scope
**Lines of code to change:** 1
**Risk level:** low
**Testing required:** Full test suite execution to ensure the component loads correctly and all functionality works as expected
