# Patch: Fix SignupLogin Mode Rendering and Switching

## Metadata
adw_id: `9ebdffb5`
review_change_request: `Issue #3: Component rendering tests are failing (11 failures in SignupLogin.test.tsx). Failed tests include: rendering in login mode when mode prop is 'login', displaying login form fields correctly, and other interaction tests. This indicates the mode switching and conditional rendering may not be working properly. Resolution: Fix the SignupLogin component to: 1) Properly render in login mode when mode='login' prop is provided, 2) Ensure all login form fields are displayed correctly, 3) Verify mode switching works bidirectionally (signup ↔ login), 4) Test all conditional rendering paths. Severity: blocker`

## Issue Summary
**Original Spec:** specs/feature-18-9ebdffb5-signup-login-esm-react-islands.md
**Issue:** The SignupLogin component fails to render correctly when `mode="login"` prop is provided. Tests show that when the component is initialized with `mode="login"`, it still renders signup form fields instead of login form fields. Additionally, mode switching between signup and login modes is not functioning bidirectionally.

**Root Cause:** The `useAuthMode` hook only uses the `initialMode` parameter for initial state but doesn't synchronize with prop changes. When the parent component passes `mode="login"`, the hook ignores it after initial render, causing the component to remain in signup mode.

**Solution:** Update the `useAuthMode` hook to synchronize with the `initialMode` prop using `useEffect`, ensuring that when the prop changes, the internal state updates accordingly. This will fix both initial rendering in login mode and dynamic mode switching.

## Files to Modify
Use these files to implement the patch:

- `app/split-lease/components/src/SignupLogin/hooks/useAuthMode.ts` - Add useEffect to sync with prop changes

## Implementation Steps
IMPORTANT: Execute every step in order, top to bottom.

### Step 1: Add useEffect import to useAuthMode hook
- Import `useEffect` from React in `useAuthMode.ts`
- This will enable prop synchronization

### Step 2: Add useEffect to synchronize mode with initialMode prop
- Add `useEffect` hook that watches `initialMode` parameter
- When `initialMode` changes, update the internal `mode` state via `setModeState`
- This ensures the component respects the `mode` prop at all times, not just on initial mount

### Step 3: Verify all tests pass
- Run component tests: `npm test -- SignupLogin.test.tsx --run`
- Verify all 26 tests pass (currently 24 passing, 2 failing)
- Ensure no regressions in existing functionality

## Validation
Execute every command to validate the patch is complete with zero regressions.

### 1. Run TypeScript Type Check
```bash
cd app/split-lease/components
npm run typecheck
```
Expected: Zero TypeScript errors

### 2. Run SignupLogin Component Tests
```bash
cd app/split-lease/components
npm test -- SignupLogin.test.tsx --run
```
Expected: All 26 tests pass (100% pass rate)

### 3. Run All Hook Tests
```bash
cd app/split-lease/components
npm test -- hooks/ --run
```
Expected: All hook tests pass, including useAuthMode tests

### 4. Run Full Test Suite
```bash
cd app/split-lease/components
npm run test
```
Expected: All tests pass with no new failures

### 5. Build Component Library
```bash
cd app/split-lease/components
npm run build
```
Expected: Build succeeds with no errors

## Patch Scope
**Lines of code to change:** ~5 lines (1 import, 4 lines for useEffect)
**Risk level:** low
**Testing required:** Component rendering tests, hook tests, interaction tests - all existing tests should pass after the fix
