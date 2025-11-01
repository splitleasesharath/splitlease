# Patch: Fix Failing Tests to Achieve 90% Test Coverage

## Metadata
adw_id: `9ebdffb5`
review_change_request: `Issue #4: Test coverage is likely below the required 90% threshold specified in the acceptance criteria. With 32 failing tests out of ~87 total, the actual working code coverage will be significantly lower than required. Resolution: After fixing all failing tests, run 'npm run test:coverage' to verify that line, branch, function, and statement coverage all exceed 90%. Add additional tests if needed to meet coverage requirements. Severity: blocker`

## Issue Summary
**Original Spec:** specs/feature-18-9ebdffb5-signup-login-esm-react-islands.md
**Issue:** 26 out of 200 tests are currently failing in the SignupLogin component test suite. Test failures include validation message mismatches, password strength calculation discrepancies, and accessibility test failures. With these test failures, actual code coverage will be significantly below the required 90% threshold for line, branch, function, and statement coverage.
**Solution:** Fix all 26 failing tests by correcting validation logic, password strength calculations, error messages, and accessibility attributes to align test expectations with implementation. Then verify coverage meets the 90% threshold across all metrics.

## Files to Modify
Use these files to implement the patch:

- `app/split-lease/components/src/SignupLogin/hooks/useSignupForm.ts` - Fix validation error messages and password strength logic
- `app/split-lease/components/src/SignupLogin/hooks/useLoginForm.ts` - Fix validation error messages
- `app/split-lease/components/src/SignupLogin/hooks/useAuthMode.ts` - Fix mode switching behavior
- `app/split-lease/components/src/SignupLogin/SignupLogin.test.tsx` - Update test expectations if needed
- `app/split-lease/components/src/SignupLogin/SignupLogin.a11y.test.tsx` - Fix accessibility test failures
- `app/split-lease/components/src/SignupLogin/hooks/useSignupForm.test.ts` - Align test expectations with implementation
- `app/split-lease/components/src/SignupLogin/hooks/useLoginForm.test.ts` - Align test expectations with implementation

## Implementation Steps
IMPORTANT: Execute every step in order, top to bottom.

### Step 1: Analyze all failing tests to understand root causes
- Run `cd app/split-lease/components && npm run test 2>&1 | tee test-output.txt` to capture full test output
- Categorize failures by type:
  - Validation message mismatches (expected vs actual error messages)
  - Password strength calculation discrepancies (weak/medium/strong)
  - Accessibility violations (ARIA attributes, roles, labels)
  - Component rendering issues (mode switching, field display)
- Create a detailed list of all 26 failing tests with expected vs actual values

### Step 2: Fix validation error messages in hooks
- Review `useSignupForm.ts` validation logic and update error messages to match test expectations:
  - Password validation: Ensure message includes "special character" requirement
  - Password confirmation: Change "Please confirm your password" to "Passwords do not match" when they don't match
  - Email validation: Ensure consistent error messages
  - Name validation: Ensure consistent error messages
  - Terms acceptance: Ensure consistent error messages
- Review `useLoginForm.ts` validation logic and update error messages similarly
- Ensure all error messages are user-friendly and match test expectations

### Step 3: Fix password strength calculation logic
- Review password strength algorithm in `useSignupForm.ts`
- Adjust strength calculation to correctly categorize:
  - Weak: Meets minimum requirements only (8 chars, 1 uppercase, 1 lowercase, 1 number, 1 special)
  - Medium: 10+ characters with variety
  - Strong: 12+ characters with high variety
- Ensure test case "Password1!" is correctly categorized as "weak" (not "medium")
- Update calculation to match test expectations exactly

### Step 4: Fix accessibility test failures
- Review `SignupLogin.a11y.test.tsx` failures
- Update `SignupLogin.tsx` component to include missing ARIA attributes:
  - Add `aria-invalid` to invalid form fields
  - Add `aria-describedby` linking error messages to fields
  - Ensure all form fields have proper labels
  - Add `role="form"` and `aria-labelledby` to form element
  - Add `aria-label` to password visibility toggle
  - Ensure live regions exist for submission feedback
- Verify all axe-core violations are resolved

### Step 5: Fix component mode switching and rendering tests
- Review `useAuthMode.ts` to ensure mode switching works correctly
- Verify `SignupLogin.tsx` renders correct fields based on mode
- Fix any issues with:
  - Initial mode rendering
  - Mode toggle functionality
  - Field conditional display
  - Mode toggle UI elements
- Ensure all rendering tests pass

### Step 6: Run full test suite and verify all tests pass
- Execute `cd app/split-lease/components && npm run test`
- Verify zero test failures (200/200 tests passing)
- Fix any remaining test failures
- Ensure no test timeouts or flaky tests

### Step 7: Verify test coverage meets 90% threshold
- Execute `cd app/split-lease/components && npm run test:coverage`
- Verify coverage metrics:
  - Line coverage: ≥90%
  - Branch coverage: ≥90%
  - Function coverage: ≥90%
  - Statement coverage: ≥90%
- If coverage is below threshold, add additional tests to cover untested code paths
- Focus on edge cases and error handling paths that may be uncovered

### Step 8: Add additional tests if needed to reach 90% coverage
- Identify uncovered lines/branches from coverage report
- Write targeted tests for uncovered code paths:
  - Error handling in async operations
  - Edge cases in validation logic
  - Boundary conditions in password strength
  - Cleanup logic on component unmount
- Re-run coverage to verify 90% threshold is met

## Validation
Execute every command to validate the patch is complete with zero regressions.

### 1. Type Check
```bash
cd app/split-lease/components && npm run typecheck
```
Expected: Zero TypeScript errors

### 2. Run All Tests
```bash
cd app/split-lease/components && npm run test
```
Expected: All 200 tests pass (0 failures)

### 3. Run SignupLogin Tests Only
```bash
cd app/split-lease/components && npm run test -- SignupLogin
```
Expected: All SignupLogin tests pass

### 4. Run Hook Tests
```bash
cd app/split-lease/components && npm run test -- hooks/
```
Expected: All hook tests pass

### 5. Run Accessibility Tests
```bash
cd app/split-lease/components && npm run test -- SignupLogin.a11y
```
Expected: Zero accessibility violations

### 6. Run Coverage Report
```bash
cd app/split-lease/components && npm run test:coverage
```
Expected:
- Line coverage: ≥90%
- Branch coverage: ≥90%
- Function coverage: ≥90%
- Statement coverage: ≥90%

### 7. Build Component Library
```bash
cd app/split-lease/components && npm run build
```
Expected: Build succeeds with no errors or warnings

### 8. Run Full Test Validation Suite
```bash
cd app/split-lease/components && npm run typecheck && npm run build && npm run test
```
Expected: All commands succeed with zero errors

## Patch Scope
**Lines of code to change:** ~50-100 lines (primarily error messages, validation logic, and ARIA attributes)
**Risk level:** Low (test fixes only, no breaking changes to public API)
**Testing required:** All existing tests must pass, coverage must exceed 90% across all metrics
