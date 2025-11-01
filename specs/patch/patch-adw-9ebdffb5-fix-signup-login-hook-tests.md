# Patch: Fix SignupLogin Hook Validation and State Management

## Metadata
adw_id: `9ebdffb5`
review_change_request: `Issue #1: Multiple hook tests are failing (8 failures in useLoginForm.test.ts, 9 failures in useSignupForm.test.ts). Failed tests include: validation of required fields, isSubmitting state management, validation error display on submit, submission error handling, callback stability, and whitespace trimming. These failures indicate the validation logic and form submission flow are not working as specified. Resolution: Fix the hook implementations (useLoginForm.ts and useSignupForm.ts) to properly: 1) Validate required fields and show appropriate error messages, 2) Set isSubmitting state correctly during form submission, 3) Display validation errors when submitting with invalid data, 4) Handle submission errors properly, 5) Ensure stable callback references with useCallback, 6) Trim whitespace from email input. Severity: blocker`

## Issue Summary
**Original Spec:** specs/feature-18-9ebdffb5-signup-login-esm-react-islands.md
**Issue:** Multiple hook tests failing in useLoginForm.test.ts (8 failures) and useSignupForm.test.ts (9 failures) related to validation logic, form submission flow, isSubmitting state management, callback stability, and whitespace trimming
**Solution:** Fix the hook implementations to properly validate required fields, manage isSubmitting state during async submissions, display validation errors on submit, ensure stable callback references using useCallback, and trim whitespace from email inputs

## Files to Modify
Use these files to implement the patch:

- `app/split-lease/components/src/SignupLogin/hooks/useLoginForm.ts`
- `app/split-lease/components/src/SignupLogin/hooks/useSignupForm.ts`

## Implementation Steps
IMPORTANT: Execute every step in order, top to bottom.

### Step 1: Fix useLoginForm validation and state management
- Update validateForm to properly validate all required fields using the LoginFormDataSchema
- Ensure validateForm shows appropriate error messages for each field (email, password)
- Fix validateField to return "Email is required" for empty email and "Password is required" for empty password
- Ensure isSubmitting is set to true at the start of handleSubmit and false in the finally block
- Verify all callbacks (handleFieldChange, handleFieldBlur, handleSubmit) use useCallback with correct dependencies
- Confirm handleFieldChange trims whitespace from email field

### Step 2: Fix useSignupForm validation and state management
- Update validateForm to properly validate all required fields using the SignupFormDataSchema
- Ensure validateForm validates password matching and terms acceptance
- Fix validateField for all fields (firstName, lastName, email, password, confirmPassword, termsAccepted)
- Ensure isSubmitting is set to true at the start of handleSubmit and false in the finally block
- Verify all callbacks (handleFieldChange, handleFieldBlur, handleSubmit, clearForm) use useCallback with correct dependencies
- Confirm handleFieldChange trims whitespace from name fields and email

### Step 3: Fix submission error handling
- Ensure both hooks properly catch errors during form submission
- Set submissionError state with error message when submission fails
- Verify error messages are set correctly: "Login failed" for login, "Signup failed" for signup
- Ensure isSubmitting is set to false even when errors occur (finally block)
- Verify isMountedRef is checked before setting state after async operations

### Step 4: Ensure callback stability
- Review all useCallback dependencies to ensure they are correct and minimal
- Verify handleFieldChange has empty dependency array (uses updater functions)
- Verify handleFieldBlur depends only on validateField
- Verify handleSubmit depends on formData, validateForm, onSuccess, and clearForm (signup only)
- Verify validateField depends on formData
- Test that callback references remain stable across re-renders

## Validation
Execute every command to validate the patch is complete with zero regressions.

1. Run hook tests to verify all tests pass:
   ```bash
   cd app/split-lease/components && npm run test -- useLoginForm.test.ts
   ```
   Expected: All 8 useLoginForm tests pass

2. Run signup hook tests:
   ```bash
   cd app/split-lease/components && npm run test -- useSignupForm.test.ts
   ```
   Expected: All 9 useSignupForm tests pass

3. Run full test suite to ensure no regressions:
   ```bash
   cd app/split-lease/components && npm run test
   ```
   Expected: All tests pass with no failures

4. Run type checking:
   ```bash
   cd app/split-lease/components && npm run typecheck
   ```
   Expected: Zero TypeScript errors

5. Build component library to ensure build succeeds:
   ```bash
   cd app/split-lease/components && npm run build
   ```
   Expected: Build completes successfully with no errors

## Patch Scope
**Lines of code to change:** ~40-60 lines across 2 files
**Risk level:** low
**Testing required:** Hook unit tests for validation, state management, callback stability, and error handling. Full component test suite to ensure no regressions.
