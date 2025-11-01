# Feature: Create SignupLogin Component using ESM + React Islands Structure

## Metadata
adw_id: `9ebdffb5`
prompt: `Lets update the signup-login React component to be compatible with the new ESM +React island Structure, following the prescribed principles of tidiness, test driven, easy to iterate and maintainable, clean and modular(also following the principles of Software Developer Lifecycle: Plan, Code, Test, Review, Document). Do not add mounts, Do not add it to any pages yet, Just rebuild the component as per these pointers from local path: C:\Users\igor\My Drive (splitleaseteam@gmail.com)!Agent Context and Tools\SL1\TAC\Context\Architecture. Do not disturb any other page/component that is not the signup-login.`

## Feature Description
Create a new SignupLogin component from scratch following the ESM + React Islands architecture pattern, implementing a dual-mode authentication interface that seamlessly toggles between signup and login forms. This component will be built using Test-Driven Development (TDD), CSS Modules for styling, comprehensive TypeScript type safety with Zod runtime validation, and full WCAG 2.1 AA accessibility compliance. The component will follow all Split Lease architectural commandments, including separation of concerns, immutability, comprehensive error handling, and performance optimization through React memoization patterns.

## User Story
As a **user visiting the Split Lease platform**
I want to **see a modern, accessible signup and login interface**
So that **I can easily create an account or sign in to access the platform with a seamless, user-friendly experience that works on all devices and assistive technologies**

## Problem Statement
Split Lease currently lacks a dedicated signup/login component built with the new ESM + React Islands architecture. The platform needs:

1. **No Existing Component**: There is currently no signup-login component in the codebase
2. **Authentication UI Needed**: Users need a way to authenticate (both signup and login)
3. **Form Validation**: Robust client-side validation for email, password, and other fields
4. **Security Best Practices**: Password strength requirements, secure input handling, HTTPS enforcement
5. **Accessibility**: WCAG 2.1 AA compliant forms with proper ARIA labels and keyboard navigation
6. **Responsive Design**: Mobile-first design that works on all screen sizes
7. **Error Handling**: User-friendly error messages for validation, network, and server errors
8. **State Management**: Clean separation of form state, validation state, and submission state
9. **Performance**: Fast initial render, optimized re-renders, lazy loading where appropriate
10. **Testing**: Comprehensive test coverage (>90%) including unit, integration, and accessibility tests

## Solution Statement
Build a production-ready SignupLogin component following the architectural patterns established for Header and Footer components:

1. **Component Structure**: Create in `app/split-lease/components/src/SignupLogin/` following atomic design principles
2. **CSS Modules**: Use scoped styling with `SignupLogin.module.css` for conflict-free styles
3. **TypeScript + Zod**: Full type safety with runtime validation using Zod schemas
4. **TDD Approach**: Write comprehensive tests first (Red-Green-Refactor cycle)
5. **Custom Hooks**: Extract business logic into `useSignupForm.ts` and `useLoginForm.ts`
6. **Performance**: Implement React.memo, useCallback, useMemo for optimal rendering
7. **Accessibility**: Full WCAG 2.1 AA compliance with jest-axe testing
8. **Error Handling**: Comprehensive error states with user-friendly messages
9. **Documentation**: Complete JSDoc, usage examples, and README
10. **No Integration**: Component built standalone without page mounting (per requirements)

## Relevant Files

### New Files to Create

#### Core Component Files
- **`app/split-lease/components/src/SignupLogin/SignupLogin.tsx`**
  - Main component implementation
  - Toggle between signup and login modes
  - Form rendering, validation display, submission handling
  - Memoized with React.memo for performance

- **`app/split-lease/components/src/SignupLogin/SignupLogin.module.css`**
  - CSS Modules for scoped styling
  - Responsive design (mobile-first)
  - Form field styling, button states, error messages
  - Accessibility enhancements (focus indicators, contrast)

- **`app/split-lease/components/src/SignupLogin/SignupLogin.types.ts`**
  - TypeScript interfaces inferred from Zod schemas
  - SignupLoginProps, SignupFormData, LoginFormData
  - ValidationError, SubmissionState, AuthMode types

- **`app/split-lease/components/src/SignupLogin/SignupLogin.schema.ts`**
  - Zod schemas for runtime validation
  - Email validation (format, domain checks)
  - Password validation (strength, requirements)
  - Name validation, terms acceptance
  - Form data validation

- **`app/split-lease/components/src/SignupLogin/index.ts`**
  - Barrel export for component and types
  - Export hooks for consumer reuse
  - Export validation schemas

#### Custom Hooks
- **`app/split-lease/components/src/SignupLogin/hooks/useSignupForm.ts`**
  - Signup form state management
  - Field validation logic
  - Password strength calculation
  - Form submission handler
  - Error state management
  - Success callback handling

- **`app/split-lease/components/src/SignupLogin/hooks/useLoginForm.ts`**
  - Login form state management
  - Email/password validation
  - Remember me functionality
  - Form submission handler
  - Error state management
  - Success callback handling

- **`app/split-lease/components/src/SignupLogin/hooks/useAuthMode.ts`**
  - Toggle between signup/login modes
  - State persistence (optional)
  - Mode change callbacks
  - Deep linking support (URL hash)

#### Test Files
- **`app/split-lease/components/src/SignupLogin/SignupLogin.test.tsx`**
  - Comprehensive unit tests
  - Rendering tests (signup mode, login mode)
  - Interaction tests (input changes, form submission)
  - Validation tests (all validation rules)
  - State management tests
  - Error handling tests
  - Edge case tests
  - Target: >90% code coverage

- **`app/split-lease/components/src/SignupLogin/SignupLogin.a11y.test.tsx`**
  - Accessibility tests with jest-axe
  - ARIA attribute validation
  - Keyboard navigation tests
  - Focus management tests
  - Screen reader announcement tests
  - Color contrast validation
  - Form label association tests

- **`app/split-lease/components/src/SignupLogin/hooks/useSignupForm.test.ts`**
  - Hook behavior tests
  - Validation logic tests
  - State update tests
  - Callback stability tests

- **`app/split-lease/components/src/SignupLogin/hooks/useLoginForm.test.ts`**
  - Hook behavior tests
  - Validation logic tests
  - State update tests
  - Remember me functionality tests

#### Documentation
- **`app/split-lease/components/src/SignupLogin/README.md`**
  - Component overview and purpose
  - Props API documentation
  - Usage examples (basic, advanced)
  - Validation rules documentation
  - Accessibility features
  - Browser support
  - Troubleshooting guide

#### Utilities (Optional)
- **`app/split-lease/components/src/SignupLogin/utils/passwordStrength.ts`**
  - Password strength calculation algorithm
  - Strength level categorization (weak, medium, strong)
  - Requirements validation (length, characters, etc.)

- **`app/split-lease/components/src/SignupLogin/utils/validation.ts`**
  - Email validation helpers
  - Password validation helpers
  - Name validation helpers
  - Reusable validation utilities

### Files to Modify

- **`app/split-lease/components/src/index.ts`**
  - Add SignupLogin component export
  - Add type exports for SignupLoginProps, SignupFormData, LoginFormData
  - Add schema exports for consumer validation

## Implementation Plan

### Phase 1: Foundation & Setup (TDD Infrastructure)
Set up testing infrastructure, type system, and validation schemas before any implementation.

**Goals:**
- Enable test-driven development workflow
- Establish type safety with Zod + TypeScript
- Create validation foundation
- Define component API surface

**Deliverables:**
- Test environment configured and working
- Zod schemas created and tested
- TypeScript types inferred from schemas
- Component API designed

### Phase 2: Test Creation (Red Phase of TDD)
Write comprehensive failing tests that define the expected behavior of the SignupLogin component.

**Goals:**
- Define component behavior through tests
- Establish acceptance criteria in code
- Create safety net for refactoring
- Document expected interactions

**Deliverables:**
- Complete test suite (all failing initially)
- Accessibility test framework
- Hook tests
- Edge case tests

### Phase 3: Custom Hooks Implementation (Green Phase - Part 1)
Build custom hooks that encapsulate form logic, validation, and state management.

**Goals:**
- Separate business logic from presentation
- Make tests pass for hooks
- Create reusable form logic
- Establish stable callbacks

**Deliverables:**
- useSignupForm hook (tested and working)
- useLoginForm hook (tested and working)
- useAuthMode hook (tested and working)
- All hook tests passing

### Phase 4: Component Implementation (Green Phase - Part 2)
Build the SignupLogin component using the hooks and passing all component tests.

**Goals:**
- Make all component tests pass
- Implement UI/UX design
- Apply CSS Modules styling
- Ensure accessibility

**Deliverables:**
- SignupLogin.tsx implementation
- SignupLogin.module.css styles
- All rendering tests passing
- All interaction tests passing

### Phase 5: Accessibility & Validation (Green Phase - Part 3)
Ensure WCAG 2.1 AA compliance and implement comprehensive validation UI.

**Goals:**
- Pass all accessibility tests
- User-friendly validation feedback
- Keyboard navigation support
- Screen reader compatibility

**Deliverables:**
- All jest-axe tests passing
- Inline validation errors
- Focus management
- ARIA live regions for announcements

### Phase 6: Optimization & Documentation (Refactor Phase)
Optimize performance, complete documentation, and ensure production readiness.

**Goals:**
- Optimize component performance
- Complete comprehensive documentation
- Ensure production quality
- Code review against commandments

**Deliverables:**
- Performance-optimized component
- Complete JSDoc documentation
- README with examples
- Code review checklist completed

## Step by Step Tasks
IMPORTANT: Execute every step in order, top to bottom.

### 1. Setup Testing Infrastructure
- Verify testing dependencies are installed (vitest, @testing-library/react, jest-axe already in package.json)
- Create test utilities in `src/SignupLogin/test-utils.ts` for common test setup
- Create mock handlers for form submission (MSW if needed)
- Verify test environment works with a simple smoke test

### 2. Create Zod Validation Schemas (TDD - Foundation)
- Create `SignupLogin.schema.ts`
- Define `SignupFormDataSchema` with fields: firstName, lastName, email, password, confirmPassword, termsAccepted
- Define `LoginFormDataSchema` with fields: email, password, rememberMe
- Define `SignupLoginPropsSchema` for component props validation
- Add email validation: format, common typos (gmial.com → gmail.com)
- Add password validation: min 8 chars, uppercase, lowercase, number, special char
- Add name validation: min 2 chars, letters and hyphens only
- Write tests for all schemas

### 3. Create TypeScript Types from Schemas
- Create `SignupLogin.types.ts`
- Infer `SignupFormData` from `SignupFormDataSchema`
- Infer `LoginFormData` from `LoginFormDataSchema`
- Infer `SignupLoginProps` from `SignupLoginPropsSchema`
- Define `AuthMode` type: 'signup' | 'login'
- Define `ValidationError` type for error messages
- Define `SubmissionState` type: 'idle' | 'submitting' | 'success' | 'error'
- Define `PasswordStrength` type: 'weak' | 'medium' | 'strong'

### 4. Write Hook Tests FIRST (TDD - Red)
- Create `hooks/useSignupForm.test.ts`
  - Test: "initializes with default values"
  - Test: "updates field values correctly"
  - Test: "validates email format"
  - Test: "validates password strength"
  - Test: "validates password match"
  - Test: "validates terms acceptance"
  - Test: "shows validation errors on blur"
  - Test: "handles form submission"
  - Test: "clears form after successful submission"
  - Test: "handles submission errors"
- Create `hooks/useLoginForm.test.ts`
  - Test: "initializes with default values"
  - Test: "updates email and password"
  - Test: "validates email format"
  - Test: "validates required fields"
  - Test: "toggles remember me"
  - Test: "handles form submission"
  - Test: "handles submission errors"
- Create `hooks/useAuthMode.test.ts`
  - Test: "initializes with default mode"
  - Test: "toggles between signup and login"
  - Test: "calls callback on mode change"
  - Test: "supports deep linking via URL hash"
- Run tests - verify all fail

### 5. Write Component Rendering Tests (TDD - Red)
- Create `SignupLogin.test.tsx`
- Write test: "renders in signup mode by default"
- Write test: "renders in login mode when mode='login'"
- Write test: "displays signup form fields (firstName, lastName, email, password, confirmPassword, terms)"
- Write test: "displays login form fields (email, password, rememberMe)"
- Write test: "shows mode toggle link"
- Write test: "displays password strength indicator in signup mode"
- Write test: "shows submit button with correct text"
- Write test: "renders custom className"
- Run tests - verify all fail

### 6. Write Component Interaction Tests (TDD - Red)
- Write test: "toggles to login mode when 'Sign in' link clicked"
- Write test: "toggles to signup mode when 'Sign up' link clicked"
- Write test: "updates email field on input"
- Write test: "updates password field on input"
- Write test: "updates all signup fields on input"
- Write test: "shows validation error on invalid email"
- Write test: "shows password strength as user types"
- Write test: "shows error when passwords don't match"
- Write test: "shows error when terms not accepted"
- Write test: "disables submit button during submission"
- Write test: "calls onSignupSuccess on successful signup"
- Write test: "calls onLoginSuccess on successful login"
- Write test: "displays submission error messages"
- Write test: "clears errors on field change"
- Run tests - verify all fail

### 7. Write Accessibility Tests (TDD - Red)
- Create `SignupLogin.a11y.test.tsx`
- Write test: "has no axe violations in signup mode"
- Write test: "has no axe violations in login mode"
- Write test: "all form fields have associated labels"
- Write test: "all buttons have accessible names"
- Write test: "error messages are associated with fields (aria-describedby)"
- Write test: "invalid fields have aria-invalid=true"
- Write test: "password visibility toggle has aria-label"
- Write test: "form has proper role and aria-labelledby"
- Write test: "mode toggle has semantic markup"
- Write test: "keyboard navigation works (tab order)"
- Write test: "Enter key submits form"
- Write test: "focus management after mode toggle"
- Run tests - verify all fail

### 8. Write Edge Case Tests (TDD - Red)
- Write test: "handles null/undefined onSignupSuccess gracefully"
- Write test: "handles null/undefined onLoginSuccess gracefully"
- Write test: "handles rapid mode switching"
- Write test: "handles rapid form submissions (debouncing)"
- Write test: "prevents memory leaks on unmount during submission"
- Write test: "handles extremely long email/password"
- Write test: "handles special characters in inputs"
- Write test: "handles copy-paste of whitespace"
- Write test: "handles autocomplete behavior"
- Run tests - verify all fail

### 9. Implement useSignupForm Hook (TDD - Green)
- Create `hooks/useSignupForm.ts`
- Initialize state: formData, errors, isSubmitting, submissionError
- Implement handleFieldChange with Zod validation
- Implement validateField for individual field validation
- Implement validateForm for full form validation
- Implement calculatePasswordStrength utility
- Implement handleSubmit with async submission
- Use useCallback for all handlers (stability)
- Implement proper cleanup on unmount
- Run tests - make hook tests pass

### 10. Implement useLoginForm Hook (TDD - Green)
- Create `hooks/useLoginForm.ts`
- Initialize state: formData, errors, isSubmitting, submissionError
- Implement handleFieldChange with validation
- Implement validateForm for form validation
- Implement handleSubmit with async submission
- Implement rememberMe toggle handler
- Use useCallback for all handlers
- Implement proper cleanup on unmount
- Run tests - make hook tests pass

### 11. Implement useAuthMode Hook (TDD - Green)
- Create `hooks/useAuthMode.ts`
- Initialize state: mode ('signup' or 'login')
- Implement toggleMode function
- Implement setMode function for direct control
- Add URL hash support (optional, for deep linking)
- Call onModeChange callback when mode changes
- Use useCallback for stability
- Run tests - make hook tests pass

### 12. Create CSS Modules Stylesheet
- Create `SignupLogin.module.css`
- Define container styles (responsive, centered, max-width)
- Define form styles (spacing, layout)
- Define input field styles (border, focus states, error states)
- Define button styles (primary CTA, loading state, disabled state)
- Define error message styles (color, icon, spacing)
- Define password strength indicator styles (weak/medium/strong colors)
- Define mode toggle link styles (underline, hover)
- Implement responsive breakpoints (mobile-first)
- Add focus indicators for accessibility
- Ensure color contrast meets WCAG AA (4.5:1 for text)
- Add smooth transitions for state changes

### 13. Implement SignupLogin Component (TDD - Green)
- Create `SignupLogin.tsx`
- Add comprehensive JSDoc comments
- Define SignupLoginProps interface
- Import and use custom hooks (useSignupForm, useLoginForm, useAuthMode)
- Wrap component with React.memo
- Implement conditional rendering based on mode
- Render signup form fields with labels
- Render login form fields with labels
- Implement password visibility toggle
- Display validation errors inline
- Display password strength indicator
- Implement mode toggle UI
- Add ARIA attributes (labels, describedby, invalid)
- Use CSS Modules for styling
- Run tests - make rendering tests pass

### 14. Implement Form Interactions (TDD - Green)
- Wire up input onChange handlers to hooks
- Wire up form onSubmit handler to hooks
- Implement mode toggle functionality
- Implement password visibility toggle
- Display validation errors on blur
- Display submission errors
- Implement loading state (disable form, show spinner)
- Clear errors on field change
- Call success callbacks on successful submission
- Run tests - make interaction tests pass

### 15. Implement Accessibility Features (TDD - Green)
- Add ARIA labels to all inputs
- Add aria-describedby for error messages
- Add aria-invalid for invalid fields
- Add aria-live region for submission feedback
- Implement proper focus management
- Add keyboard event handlers (Enter to submit)
- Ensure logical tab order
- Add focus indicator styles
- Test with keyboard only
- Run tests - make accessibility tests pass

### 16. Implement Edge Case Handling (TDD - Green)
- Add null checks for all callbacks
- Implement debouncing for rapid submissions
- Trim whitespace from inputs
- Handle cleanup on unmount
- Prevent submission if form is invalid
- Handle network errors gracefully
- Implement timeout for submissions
- Run tests - make edge case tests pass

### 17. Optimize Component Performance
- Verify React.memo prevents unnecessary re-renders
- Ensure all callbacks are stable (useCallback)
- Ensure expensive computations are memoized (useMemo)
- Add performance budget test (<100ms render)
- Profile with React DevTools
- Optimize any bottlenecks found
- Ensure bundle size within budget

### 18. Create Component Documentation
- Create `README.md` in SignupLogin folder
- Document component purpose and features
- Document all props with types and descriptions
- Provide basic usage example
- Provide advanced usage example (with callbacks)
- Document validation rules
- Document accessibility features
- Document password strength requirements
- Add troubleshooting section
- Add browser support notes

### 19. Update Component Exports
- Update `SignupLogin/index.ts`:
  - Export SignupLogin component
  - Export SignupLoginProps type
  - Export SignupFormData, LoginFormData types
  - Export validation schemas
  - Export custom hooks (for reusability)
- Update `src/index.ts`:
  - Add SignupLogin to barrel export
  - Add type exports
- Verify all exports work correctly

### 20. Final Testing and Quality Assurance
- Run full test suite: `npm run test`
- Verify >90% code coverage
- Run `npm run test:coverage` and review report
- Run accessibility tests: `npm run test -- SignupLogin.a11y`
- Run type checking: `npm run typecheck`
- Build component library: `npm run build`
- Check bundle size impact
- Manual testing checklist:
  - Test signup form with valid data
  - Test signup form with invalid data
  - Test login form with valid data
  - Test login form with invalid data
  - Test mode switching
  - Test password strength indicator
  - Test password visibility toggle
  - Test keyboard navigation
  - Test responsive behavior
  - Test with screen reader (if possible)

### 21. Code Review Against Architectural Commandments
- Review against The Ten Commandments of Architecture
- Commandment 1: Self-documenting code (JSDoc, clear naming)
- Commandment 2: Single source of truth (Zod schemas → types)
- Commandment 3: Test every path (>90% coverage)
- Commandment 4: Respect type system (no `any`, full types)
- Commandment 5: Embrace immutability (no mutations)
- Commandment 6: Separate concerns (hooks separate from UI)
- Commandment 7: Handle errors gracefully (try-catch, user messages)
- Commandment 8: Optimize for change (configurable, extensible)
- Commandment 9: Measure everything (performance tests)
- Commandment 10: Document intent (comments explain why)
- Refactor any violations while keeping tests green

## Testing Strategy

### Unit Tests
**Target Coverage: >90%**

**Test Categories:**
1. **Schema Validation Tests**
   - Email format validation
   - Password strength validation
   - Name validation
   - Terms acceptance validation
   - Password match validation

2. **Hook Tests**
   - useSignupForm state management
   - useLoginForm state management
   - useAuthMode mode switching
   - Validation logic
   - Callback execution
   - Error handling

3. **Component Rendering Tests**
   - Signup mode renders correctly
   - Login mode renders correctly
   - Conditional field rendering
   - Error message display
   - Loading state display
   - Password strength indicator

4. **Interaction Tests**
   - Form field updates
   - Form submission
   - Mode switching
   - Password visibility toggle
   - Validation on blur
   - Validation on submit

5. **State Management Tests**
   - Form state updates
   - Error state management
   - Submission state management
   - State cleanup

### Integration Tests
**Test Scenarios:**
1. Complete signup flow (fill form → validate → submit → success)
2. Complete login flow (fill form → validate → submit → success)
3. Signup with validation errors (show errors → fix → submit)
4. Login with invalid credentials (show error → retry)
5. Mode switching mid-form (preserve/clear data as appropriate)
6. Password strength progression (weak → medium → strong)

### Accessibility Tests
**WCAG 2.1 AA Compliance:**
1. No axe violations in both modes
2. All form fields have associated labels
3. Error messages associated with fields (aria-describedby)
4. Invalid fields marked with aria-invalid
5. Form has proper semantic structure
6. Keyboard navigation fully functional
7. Focus indicators visible
8. Color contrast ratios meet standards (4.5:1)
9. Screen reader announcements for state changes
10. Touch targets minimum 44x44px

### Edge Cases
1. Null/undefined callback props
2. Empty initial values
3. Extremely long inputs
4. Special characters in inputs
5. Rapid mode switching
6. Double form submission
7. Network failures
8. Component unmount during submission
9. Autocomplete interactions
10. Copy-paste with whitespace

## Acceptance Criteria

### Functional Requirements
- [ ] Component renders in signup mode by default
- [ ] Component can be initialized in login mode via props
- [ ] Signup form displays: firstName, lastName, email, password, confirmPassword, terms checkbox
- [ ] Login form displays: email, password, rememberMe checkbox
- [ ] Mode can be toggled via UI link
- [ ] Email validation enforces correct format
- [ ] Password validation enforces: min 8 chars, uppercase, lowercase, number, special char
- [ ] Password strength indicator shows weak/medium/strong
- [ ] Passwords must match in signup mode
- [ ] Terms must be accepted in signup mode
- [ ] Submit button disabled during submission
- [ ] Loading indicator shown during submission
- [ ] Success callback fired on successful submission
- [ ] Error messages displayed for validation failures
- [ ] Error messages displayed for submission failures
- [ ] Form clears after successful signup
- [ ] Password visibility can be toggled

### Technical Requirements
- [ ] Component uses CSS Modules (SignupLogin.module.css)
- [ ] All types defined with Zod schemas
- [ ] TypeScript types inferred from schemas
- [ ] Component wrapped with React.memo
- [ ] All callbacks use useCallback
- [ ] Expensive computations use useMemo
- [ ] Business logic in custom hooks (useSignupForm, useLoginForm, useAuthMode)
- [ ] No inline styles or global CSS
- [ ] ESM exports in index.ts
- [ ] Bundle size contribution <75KB

### Testing Requirements
- [ ] Unit test coverage >90%
- [ ] All rendering paths tested
- [ ] All user interactions tested
- [ ] All validation rules tested
- [ ] All error states tested
- [ ] Accessibility tests pass with zero violations
- [ ] Hook tests cover all hook logic
- [ ] Edge cases have specific tests
- [ ] Performance tests ensure <100ms render
- [ ] No flaky or skipped tests

### Accessibility Requirements (WCAG 2.1 AA)
- [ ] All inputs have associated `<label>` elements
- [ ] All buttons have accessible names
- [ ] Error messages use aria-describedby
- [ ] Invalid fields have aria-invalid="true"
- [ ] Form has role="form" and aria-labelledby
- [ ] Password toggle has aria-label
- [ ] Live regions for submission feedback
- [ ] Keyboard navigation works (Tab, Enter, Space)
- [ ] Focus indicators visible on all focusable elements
- [ ] Color contrast ≥4.5:1 for all text
- [ ] No axe-core violations
- [ ] Touch targets ≥44x44px

### Documentation Requirements
- [ ] JSDoc on SignupLogin component with examples
- [ ] JSDoc on all custom hooks
- [ ] JSDoc on all exported types and schemas
- [ ] Inline comments explain complex logic
- [ ] README.md with:
  - Component overview
  - Props API documentation
  - Usage examples (basic and advanced)
  - Validation rules
  - Accessibility features
  - Browser support
  - Troubleshooting guide

### Code Quality Requirements
- [ ] No TypeScript errors (`npm run typecheck` passes)
- [ ] No console.logs or debugging code
- [ ] All functions <20 lines
- [ ] No magic numbers (named constants only)
- [ ] Proper error handling in all async operations
- [ ] Immutability maintained (no mutations)
- [ ] Single responsibility principle followed
- [ ] Follows all Ten Commandments of Architecture
- [ ] DRY principle followed (no code duplication)
- [ ] Meaningful variable and function names

## Validation Commands

Execute these commands to validate the feature is complete:

### 1. Install Dependencies (if needed)
```bash
cd app/split-lease/components
npm install
```
Expected: All dependencies installed successfully

### 2. Run Type Checking
```bash
cd app/split-lease/components
npm run typecheck
```
Expected: Zero TypeScript errors

### 3. Run All Tests
```bash
cd app/split-lease/components
npm run test
```
Expected: All tests pass, no failures

### 4. Run Tests with Coverage
```bash
cd app/split-lease/components
npm run test:coverage
```
Expected:
- Line coverage: >90%
- Branch coverage: >90%
- Function coverage: >90%
- Statement coverage: >90%
- Coverage report generated in `coverage/` directory

### 5. Run Specific SignupLogin Tests
```bash
cd app/split-lease/components
npm run test -- SignupLogin
```
Expected: All SignupLogin tests pass

### 6. Run Accessibility Tests Only
```bash
cd app/split-lease/components
npm run test -- SignupLogin.a11y
```
Expected: Zero accessibility violations

### 7. Run Hook Tests
```bash
cd app/split-lease/components
npm run test -- hooks/
```
Expected: All hook tests pass

### 8. Build Component Library
```bash
cd app/split-lease/components
npm run build
```
Expected:
- Build succeeds
- No build errors or warnings
- dist/ directory contains:
  - split-lease-components.es.js
  - split-lease-components.umd.js
  - index.d.ts with SignupLogin types

### 9. Check Bundle Size Impact
```bash
cd app/split-lease/components
npm run build
ls -lh dist/split-lease-components.es.js
```
Expected: SignupLogin component contributes <75KB to bundle

### 10. Manual Testing Checklist
Create a test HTML file or use test harness:
```html
<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <title>SignupLogin Test</title>
    <link rel="stylesheet" href="/dist/split-lease-components.css">
</head>
<body>
    <div id="auth-root"></div>

    <script crossorigin src="https://unpkg.com/react@18/umd/react.production.min.js"></script>
    <script crossorigin src="https://unpkg.com/react-dom@18/umd/react-dom.production.min.js"></script>
    <script src="/dist/split-lease-components.umd.js"></script>

    <script>
        const { SignupLogin } = window.SplitLeaseComponents;

        ReactDOM.createRoot(document.getElementById('auth-root')).render(
            React.createElement(SignupLogin, {
                onSignupSuccess: (data) => console.log('Signup success:', data),
                onLoginSuccess: (data) => console.log('Login success:', data),
                mode: 'signup'
            })
        );
    </script>
</body>
</html>
```

**Manual Test Scenarios:**
- [ ] Open in browser, component renders without errors
- [ ] Signup form displays all fields correctly
- [ ] Toggle to login mode, login form displays correctly
- [ ] Enter invalid email, error message shows
- [ ] Enter weak password, strength indicator shows "weak"
- [ ] Enter medium password, strength indicator shows "medium"
- [ ] Enter strong password, strength indicator shows "strong"
- [ ] Enter non-matching passwords, error shows
- [ ] Submit without accepting terms, error shows
- [ ] Submit with valid data, loading state shows
- [ ] Success callback fires on successful submission
- [ ] Error message shows on submission failure
- [ ] Toggle password visibility, password reveals/hides
- [ ] Test keyboard navigation (Tab through all fields)
- [ ] Test Enter key to submit form
- [ ] Resize browser, component is responsive
- [ ] Test on mobile viewport, usable on small screens

## Notes

### Password Strength Requirements
The component will enforce the following password requirements:
- **Minimum length**: 8 characters
- **Uppercase letter**: At least one (A-Z)
- **Lowercase letter**: At least one (a-z)
- **Number**: At least one (0-9)
- **Special character**: At least one (!@#$%^&*()_+-=[]{}|;:,.<>?)

**Strength Levels:**
- **Weak**: Meets minimum requirements only
- **Medium**: 10+ characters with variety
- **Strong**: 12+ characters with high variety and no common patterns

### Email Validation
The component will validate emails with:
- Standard format validation (RFC 5322)
- Common typo detection (gmial.com → gmail.com suggestion)
- Disposable email detection (optional, for future)
- MX record validation (optional, for future server-side)

### Security Considerations
1. **No plaintext storage**: Passwords never stored in state longer than necessary
2. **HTTPS enforcement**: Component should be served over HTTPS only
3. **CSRF protection**: Form submissions should include CSRF tokens (future server integration)
4. **Rate limiting**: Suggest rate limiting on server side (future)
5. **Password visibility**: Toggle should announce state change to screen readers

### Form Behavior
1. **Validation timing**:
   - On blur: Show validation errors after user leaves field
   - On submit: Validate all fields before submission
   - On change: Clear existing errors as user types
2. **Submission**:
   - Disable form during submission
   - Show loading indicator
   - Prevent double submission
   - Handle network timeouts (10 second timeout)
3. **Success**:
   - Call success callback with form data
   - Clear form in signup mode
   - Show success message (optional via callback)
4. **Error**:
   - Display user-friendly error messages
   - Maintain form data for retry
   - Focus on first error field

### Responsive Design
- **Mobile (<640px)**: Stack fields vertically, full-width inputs, larger touch targets
- **Tablet (640px-1024px)**: Two-column layout for name fields
- **Desktop (>1024px)**: Centered form with max-width, optimal line length

### Browser Support
- **Modern browsers**: Chrome, Firefox, Safari, Edge (last 2 versions)
- **Mobile browsers**: iOS Safari, Chrome Android
- **ES2020 features**: The component uses modern JavaScript
- **CSS Grid/Flexbox**: Required for layout

### Future Enhancements (Out of Scope)
- OAuth/Social login integration (Google, Facebook, etc.)
- Two-factor authentication (2FA)
- Password reset flow
- Email verification flow
- Remember me persistence (localStorage)
- Biometric authentication (WebAuthn)
- Captcha integration
- Progressive disclosure for password requirements

### Dependencies
All required dependencies already in package.json:
- `react` and `react-dom` (peer dependencies)
- `styled-components` (for potential future enhancements)
- `framer-motion` (for animations, optional)
- `vitest`, `@testing-library/react`, `jest-axe` (testing)

Additional dependency to consider:
- `zod` - Add to dependencies for runtime validation (if not already present)

### Performance Budget
- **Component render time**: <100ms (first render)
- **Re-render time**: <16ms (60 FPS)
- **Bundle size contribution**: <75KB gzipped
- **Time to interactive**: <50ms for form interactions
- **No layout shifts**: CLS = 0

### Accessibility Standards
Component will be tested against:
- WCAG 2.1 Level AA
- Section 508 compliance
- ARIA Authoring Practices Guide (APG) for forms

### Testing Tools
- **Vitest**: Test runner
- **React Testing Library**: Component testing
- **jest-axe**: Accessibility testing
- **user-event**: User interaction simulation
- **@testing-library/jest-dom**: Custom matchers

### Documentation Standards
- **JSDoc**: All public functions and components
- **TypeScript**: Full type annotations
- **Inline comments**: Explain complex logic and business rules
- **README**: Complete usage guide
- **Examples**: Runnable code examples

### Success Metrics
- ✅ Zero test failures
- ✅ >90% code coverage
- ✅ Zero TypeScript errors
- ✅ Zero accessibility violations
- ✅ Bundle size within budget
- ✅ All acceptance criteria met
- ✅ Code review approved
- ✅ Documentation complete

---

**Created:** 2025-01-31
**Status:** Ready for Implementation
**Estimated Effort:** 3-4 days
**Priority:** High
**Assigned To:** AI Agent (sdlc_implementor)
**Dependencies:** None (standalone component)
**Related Issues:** Issue #18
**Branch:** feature-issue-18-adw-9ebdffb5-update-signup-login-esm-react
