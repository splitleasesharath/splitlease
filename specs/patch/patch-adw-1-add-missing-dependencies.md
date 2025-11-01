# Patch: Add Missing Runtime Dependencies to Footer Preview

## Metadata
adw_id: `1`
review_change_request: `Issue #1: The Footer component cannot load in the test harness because the UMD bundle fails to initialize. The error 'Cannot read properties of undefined (reading 'div')' indicates that styled-components is not available at runtime. While the Footer component itself has been migrated to CSS Modules, other components in the bundle (SearchScheduleSelector, Header) still use styled-components, causing the entire bundle to fail initialization. The preview HTML (app/test-harness/previews/footer-preview.html) is missing the required script tags for styled-components and framer-motion dependencies. Resolution: Add the missing dependency script tags to footer-preview.html before the component bundle script: <script src='https://unpkg.com/styled-components@6/dist/styled-components.min.js'></script> and <script src='https://unpkg.com/framer-motion@11/dist/framer-motion.umd.js'></script>. Alternatively, update all components in the bundle to use CSS Modules instead of styled-components to remove this peer dependency requirement. Severity: blocker`

## Issue Summary
**Original Spec:** specs/feature-431d9cc3-update-footer-esm-react-islands.md
**Issue:** The Footer component preview fails to load because the UMD bundle requires styled-components and framer-motion at runtime, but these dependencies are not included in the HTML file. Other components in the bundle (SearchScheduleSelector, Header) still use styled-components, causing the error "Cannot read properties of undefined (reading 'div')".
**Solution:** Add the missing script tags for styled-components and framer-motion to footer-preview.html before the component bundle is loaded, ensuring all peer dependencies are available when the bundle initializes.

## Files to Modify
- `app/test-harness/previews/footer-preview.html` (lines 246-257)

## Implementation Steps
IMPORTANT: Execute every step in order, top to bottom.

### Step 1: Add styled-components and framer-motion script tags
- Open `app/test-harness/previews/footer-preview.html`
- Locate the script section where React is loaded (around line 247-248)
- Add styled-components UMD script after React/ReactDOM: `<script src="https://unpkg.com/styled-components@6/dist/styled-components.min.js"></script>`
- Add framer-motion UMD script: `<script src="https://unpkg.com/framer-motion@11/dist/framer-motion.umd.js"></script>`
- Ensure these scripts are loaded BEFORE the component bundle (line 257)
- Maintain the existing script order: React -> ReactDOM -> styled-components -> framer-motion -> Node globals shim -> Component bundle

### Step 2: Verify script loading order
- Confirm the final script order in footer-preview.html:
  1. React UMD (line 247)
  2. ReactDOM UMD (line 248)
  3. styled-components UMD (new)
  4. framer-motion UMD (new)
  5. Node globals shim (lines 251-254)
  6. Component bundle (line 257)
- This ensures all peer dependencies are available when the bundle initializes

## Validation
Execute every command to validate the patch is complete with zero regressions.

1. **Visual verification**: Open `app/test-harness/previews/footer-preview.html` in a browser and verify the Footer component loads without console errors
2. **Console check**: Open browser DevTools console and verify no errors about "Cannot read properties of undefined (reading 'div')"
3. **Component functionality**: Verify the Footer renders correctly with all sections visible
4. **Run footer diagnostic tests**: `cd app/test-harness && npx playwright test --grep "footer-diagnostics"`
5. **Run footer contract tests**: `cd app/test-harness && npx playwright test --grep "footer.*contract"`

## Patch Scope
**Lines of code to change:** 2-3 lines (adding 2 script tags)
**Risk level:** low
**Testing required:** Browser preview verification and Playwright tests for Footer component initialization and rendering
