# Patch: Fix ERR_REQUIRE_ESM Error by Switching to happy-dom

## Metadata
adw_id: `1`
review_change_request: `Issue #1: Test suite cannot execute due to 'ERR_REQUIRE_ESM' error when requiring parse5 from jsdom. The error message indicates: 'require() of ES Module...not supported. Instead change the require...to a dynamic import()'. This prevents validation of the >90% test coverage requirement specified in the acceptance criteria. Resolution: Update vite.config.ts to use 'happy-dom' instead of 'jsdom' as the test environment, OR configure the project to handle ESM modules properly by updating the test configuration. The spec mentions happy-dom is already installed as a devDependency, so changing test.environment from 'jsdom' to 'happy-dom' in vite.config.ts should resolve this issue. Severity: blocker`

## Issue Summary
**Original Spec:** N/A
**Issue:** The test suite fails to execute with ERR_REQUIRE_ESM error because jsdom's dependency (parse5) is an ES module that cannot be loaded via require(). This blocks validation of the >90% test coverage requirement.
**Solution:** Switch the test environment from 'jsdom' to 'happy-dom' in vite.config.ts. The happy-dom package is already installed as a devDependency and is fully ESM-compatible.

## Files to Modify
Use these files to implement the patch:

- `app/split-lease/components/vite.config.ts` - Line 72: Change `environment: 'jsdom'` to `environment: 'happy-dom'`

## Implementation Steps
IMPORTANT: Execute every step in order, top to bottom.

### Step 1: Update vite.config.ts test environment
- Open `app/split-lease/components/vite.config.ts`
- Locate line 72 in the test configuration block
- Change `environment: 'jsdom'` to `environment: 'happy-dom'`
- Save the file

## Validation
Execute every command to validate the patch is complete with zero regressions.

1. **Run component tests to verify happy-dom works correctly:**
   ```bash
   cd app/split-lease/components && npm run test
   ```

2. **Verify test coverage can be generated:**
   ```bash
   cd app/split-lease/components && npm run test:coverage
   ```

3. **Run TypeScript type check to ensure no regressions:**
   ```bash
   cd app/split-lease/components && npm run typecheck
   ```

## Patch Scope
**Lines of code to change:** 1
**Risk level:** low
**Testing required:** Run vitest to confirm happy-dom environment executes tests without ERR_REQUIRE_ESM errors and maintains >90% coverage thresholds
