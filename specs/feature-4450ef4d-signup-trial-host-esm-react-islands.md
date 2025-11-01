# Feature: Create and Integrate the signup-trial-host-RE Component using ESM + React Islands Structure

## Metadata
adw_id: `4450ef4d`
prompt: `Lets update the [signup-trial-host-RE](https://github.com/splitleasesharath/signup-trial-host-RE) React component to be compatible with the new ESM +React island Structure, following the prescribed principles of tidiness, test driven, easy to iterate and maintainable, clean and modular(also following the principles of Software Developer Lifecycle: Plan, Code, Test, Review, Document). Do not add mounts, Do not add it to any pages yet, Just rebuild the component as per these pointers from local path: C:\Users\igor\My Drive (splitleaseteam@gmail.com)!Agent Context and Tools\SL1\TAC\Context\Architecture. Do not disturb any other page/component that is not the [signup-trial-host-RE](https://github.com/splitleasesharath/signup-trial-host-RE).`

## Feature Description
Create a new SignupTrialHost component for the Split Lease platform following the ESM + React Islands architecture. This component will allow property hosts to sign up for a trial account, capturing essential information such as name, email, property details, and trial preferences. The component will be built from scratch using modern React patterns, CSS Modules, comprehensive testing (TDD approach), full TypeScript type safety, accessibility-first design (WCAG 2.1 AA compliance), and following all principles outlined in the Split Lease Architectural Bible.

This is a greenfield component that will serve as a critical onboarding touchpoint for converting prospective hosts into trial users of the Split Lease platform.

## User Story
As a **property owner interested in Split Lease**
I want to **easily sign up for a trial host account with a streamlined form**
So that **I can start listing my property and testing the platform's periodic rental features without friction**

## Problem Statement
Currently, the signup-trial-host-RE component exists as a legacy React component in a separate repository that doesn't conform to the new ESM + React Islands architecture used by the Split Lease platform. This creates several problems:

1. **Architecture Misalignment**: The existing component doesn't follow ESM module standards, making it incompatible with the islands architecture
2. **No Type Safety**: Missing comprehensive TypeScript types and runtime validation
3. **Lack of Testing**: No test coverage, making the component brittle and difficult to maintain
4. **Styling Issues**: Uses global CSS that can conflict with other components
5. **Accessibility Gaps**: Missing ARIA attributes, keyboard navigation, and screen reader support
6. **No Error Handling**: Lacks proper validation feedback and error states
7. **Not Modular**: Business logic mixed with presentation, making it hard to iterate
8. **Missing Documentation**: No JSDoc or usage examples
9. **Performance Concerns**: Not optimized for React 18 with memoization and lazy loading
10. **Integration Challenges**: Cannot be easily mounted as an island in HTML pages

## Solution Statement
Build the SignupTrialHost component from the ground up following the ESM + React Islands architecture and TDD principles:

1. **ESM-First Architecture**: Build as a pure ESM module with named exports and tree-shaking support
2. **CSS Modules**: Use scoped styling to prevent conflicts and improve maintainability
3. **Comprehensive Testing**: Write tests first (TDD) to achieve >90% coverage
4. **Type Safety**: Full TypeScript with Zod runtime validation for all inputs
5. **Accessibility**: WCAG 2.1 AA compliant with proper ARIA, keyboard navigation, and screen reader support
6. **Form Validation**: Real-time validation with user-friendly error messages
7. **Separation of Concerns**: Extract form logic into custom hooks
8. **Performance**: Optimize with React.memo, useCallback, useMemo
9. **Error Handling**: Graceful degradation and comprehensive error states
10. **Documentation**: Complete JSDoc with usage examples and migration guides

## Relevant Files

### New Files to Create

#### Core Component Files
- **`app/split-lease/components/src/SignupTrialHost/SignupTrialHost.tsx`**
  - Main component implementation with form UI
  - Multi-step form with progress indicator
  - Client-side validation and error display
  - Loading states during submission
  - Success/error feedback UI

- **`app/split-lease/components/src/SignupTrialHost/SignupTrialHost.module.css`**
  - Scoped CSS Modules for styling
  - Responsive form layout (mobile-first)
  - Form field styling with validation states
  - Progress indicator styles
  - Success/error message styles

- **`app/split-lease/components/src/SignupTrialHost/SignupTrialHost.types.ts`**
  - TypeScript interfaces for all props and data structures
  - Type inference from Zod schemas
  - Enums for form steps and validation states

- **`app/split-lease/components/src/SignupTrialHost/SignupTrialHost.schema.ts`**
  - Zod schemas for runtime validation
  - Form field validation rules (email format, phone format, required fields)
  - Multi-step form data validation
  - Error message definitions

- **`app/split-lease/components/src/SignupTrialHost/index.ts`**
  - Public API exports (component, types, schemas, hooks)
  - Named exports for tree-shaking

#### Custom Hooks
- **`app/split-lease/components/src/SignupTrialHost/hooks/useSignupForm.ts`**
  - Form state management (field values, errors, touched fields)
  - Validation logic with Zod schema integration
  - Submit handler with async API call
  - Form reset and cleanup
  - Multi-step navigation (next, previous, go to step)

- **`app/split-lease/components/src/SignupTrialHost/hooks/useFormValidation.ts`**
  - Real-time validation on blur and change
  - Field-level and form-level validation
  - Error message generation
  - Validation state tracking

#### Test Files
- **`app/split-lease/components/src/SignupTrialHost/SignupTrialHost.test.tsx`**
  - Unit tests for all component states
  - User interaction tests (input, navigation, submission)
  - Validation tests (valid/invalid inputs)
  - Multi-step navigation tests
  - Error and success state tests
  - Target: >90% code coverage

- **`app/split-lease/components/src/SignupTrialHost/SignupTrialHost.a11y.test.tsx`**
  - Accessibility tests with jest-axe
  - Keyboard navigation tests
  - Screen reader announcement tests
  - Focus management tests
  - ARIA attribute verification

- **`app/split-lease/components/src/SignupTrialHost/hooks/useSignupForm.test.ts`**
  - Hook unit tests (state updates, validation, submission)
  - Edge case tests (rapid submissions, invalid data)
  - Cleanup and memory leak tests

- **`app/split-lease/components/src/SignupTrialHost/hooks/useFormValidation.test.ts`**
  - Validation logic tests
  - Error message tests
  - Schema integration tests

#### Documentation
- **`app/split-lease/components/src/SignupTrialHost/README.md`**
  - Component overview and purpose
  - API reference (props, types, hooks)
  - Usage examples (basic, advanced, with callbacks)
  - Accessibility features documentation
  - Form field specifications
  - Validation rules reference
  - Integration guide
  - Troubleshooting section

#### Supporting Files
- **`app/split-lease/components/src/SignupTrialHost/constants.ts`**
  - Form field configuration (names, labels, placeholders)
  - Validation error messages
  - Form step definitions
  - API endpoint URLs
  - Default values and limits

- **`app/split-lease/components/src/SignupTrialHost/utils.ts`**
  - Helper functions (format phone, validate email, sanitize input)
  - Data transformation utilities
  - Error handling utilities

### Files to Modify

- **`app/split-lease/components/src/index.ts`**
  - Add SignupTrialHost to barrel exports
  - Export types and schemas

- **`app/split-lease/components/package.json`**
  - Ensure test dependencies are present (already added for Footer/Header)
  - No new dependencies required (zod, vitest, testing-library already added)

## Implementation Plan

### Phase 1: Foundation & Architecture Setup
Set up the component structure, type system, and testing infrastructure following TDD principles.

**Goals:**
- Define data models and validation schemas
- Configure testing environment
- Establish component structure
- Create architectural foundation

**Deliverables:**
- Zod schemas for form validation
- TypeScript types and interfaces
- Test setup and configuration
- Component skeleton

### Phase 2: Test Creation (Red Phase - TDD)
Write comprehensive failing tests that define the expected behavior of the signup form.

**Goals:**
- Define component behavior through tests
- Establish validation requirements
- Create safety net for implementation
- Document edge cases

**Deliverables:**
- Complete test suite (all failing)
- Accessibility test framework
- Hook tests
- Integration test scenarios

### Phase 3: Form Logic Implementation (Green Phase)
Build custom hooks for form state management and validation logic.

**Goals:**
- Implement form state management
- Add validation logic
- Handle multi-step navigation
- Create submission handler

**Deliverables:**
- useSignupForm hook (passing tests)
- useFormValidation hook (passing tests)
- Form logic fully tested
- API integration ready

### Phase 4: UI Implementation (Green Phase)
Build the component UI that uses the custom hooks and passes all tests.

**Goals:**
- Create form UI with all fields
- Implement multi-step navigation
- Add validation feedback
- Style with CSS Modules

**Deliverables:**
- SignupTrialHost component (passing rendering tests)
- CSS Modules styling
- Responsive layout
- All tests passing

### Phase 5: Accessibility Enhancement
Ensure WCAG 2.1 AA compliance and excellent keyboard/screen reader support.

**Goals:**
- Add proper ARIA attributes
- Implement keyboard navigation
- Add screen reader announcements
- Ensure focus management

**Deliverables:**
- Accessibility tests passing
- Zero axe violations
- Keyboard-only navigation working
- Screen reader compatible

### Phase 6: Optimization & Documentation (Refactor Phase)
Optimize performance and complete comprehensive documentation.

**Goals:**
- Optimize rendering performance
- Complete JSDoc documentation
- Write usage guides
- Finalize component API

**Deliverables:**
- Performance-optimized component
- Complete documentation
- Usage examples
- Production-ready code

## Step by Step Tasks
IMPORTANT: Execute every step in order, top to bottom.

### 1. Create Type System and Validation Schemas
- Create `SignupTrialHost/constants.ts` with form field definitions
- Create `SignupTrialHost/SignupTrialHost.schema.ts` with Zod schemas for:
  - Personal info (name, email, phone)
  - Property info (address, type, size)
  - Trial preferences (start date, duration)
  - Complete form data
- Create `SignupTrialHost/SignupTrialHost.types.ts` with TypeScript types:
  - SignupTrialHostProps interface
  - FormData interface (inferred from Zod)
  - FormStep enum
  - ValidationError interface
  - SubmissionState interface
- Create `SignupTrialHost/utils.ts` with utility functions:
  - formatPhoneNumber
  - validateEmail
  - sanitizeInput
  - formatAddress

### 2. Write Hook Tests (TDD - Red)
- Create `hooks/useSignupForm.test.ts`
- Write tests for useSignupForm hook:
  - "should initialize with empty form state"
  - "should update field values on change"
  - "should track touched fields"
  - "should navigate between form steps"
  - "should validate on submit"
  - "should handle successful submission"
  - "should handle failed submission"
  - "should reset form after successful submission"
  - "should prevent double submission"
- Create `hooks/useFormValidation.test.ts`
- Write tests for useFormValidation hook:
  - "should validate email format"
  - "should validate phone format"
  - "should validate required fields"
  - "should validate on blur"
  - "should clear errors on valid input"
  - "should return field-specific error messages"
- Run tests - verify all fail (hooks don't exist yet)

### 3. Write Component Rendering Tests (TDD - Red)
- Create `SignupTrialHost.test.tsx`
- Write rendering tests:
  - "should render step 1 (personal info) by default"
  - "should render all form fields for step 1"
  - "should render step 2 (property info) when navigated"
  - "should render step 3 (trial preferences) when navigated"
  - "should render progress indicator with current step"
  - "should display custom className if provided"
  - "should render submit button on final step"
  - "should render back button except on step 1"
- Run tests - verify all fail

### 4. Write Interaction Tests (TDD - Red)
- Write interaction tests in `SignupTrialHost.test.tsx`:
  - "should update input value on change"
  - "should show validation error on blur if invalid"
  - "should navigate to next step on Next button click"
  - "should navigate to previous step on Back button click"
  - "should call onSubmit with form data on submit"
  - "should show loading state during submission"
  - "should show success message on successful submission"
  - "should show error message on failed submission"
  - "should disable form during submission"
  - "should prevent navigation with invalid data"
  - "should allow navigation with valid data"
- Run tests - verify all fail

### 5. Write Validation Tests (TDD - Red)
- Write validation tests in `SignupTrialHost.test.tsx`:
  - "should validate required fields"
  - "should validate email format"
  - "should validate phone format"
  - "should validate property address"
  - "should show multiple errors for multiple invalid fields"
  - "should clear errors when field becomes valid"
  - "should not submit if validation fails"
  - "should submit if all fields valid"
- Run tests - verify all fail

### 6. Write Accessibility Tests (TDD - Red)
- Create `SignupTrialHost.a11y.test.tsx`
- Write accessibility tests:
  - "should have no axe violations"
  - "should have proper ARIA labels on all inputs"
  - "should have proper ARIA attributes on error messages"
  - "should announce validation errors to screen readers"
  - "should announce form submission status to screen readers"
  - "should have logical tab order"
  - "should support keyboard navigation (Tab, Enter, Escape)"
  - "should maintain focus on error fields"
  - "should have sufficient color contrast"
- Run tests - verify all fail

### 7. Implement useFormValidation Hook (TDD - Green)
- Create `hooks/useFormValidation.ts`
- Implement validation logic:
  - validateField function using Zod schemas
  - validateForm function for complete validation
  - Error message generation
  - State management for errors
  - Export useFormValidation hook
- Run useFormValidation tests - make them pass
- Verify >90% coverage for the hook

### 8. Implement useSignupForm Hook (TDD - Green)
- Create `hooks/useSignupForm.ts`
- Implement form state management:
  - Initialize state with empty values
  - handleChange for field updates
  - handleBlur for validation triggers
  - handleNext for step navigation (with validation)
  - handleBack for backward navigation
  - handleSubmit for form submission
  - Form reset logic
  - Integration with useFormValidation
  - Use useCallback for all handlers
  - Use useMemo for computed values
- Run useSignupForm tests - make them pass
- Verify >90% coverage for the hook

### 9. Create CSS Modules Styling
- Create `SignupTrialHost.module.css`
- Implement responsive form layout:
  - Container with max-width
  - Form grid layout (mobile-first)
  - Input field styles with validation states
  - Button styles (primary, secondary)
  - Progress indicator styles
  - Error message styles
  - Success message styles
  - Loading spinner styles
  - Focus styles for accessibility
  - Responsive breakpoints (tablet, desktop)
- Use CSS custom properties for theming
- Ensure WCAG AA color contrast

### 10. Implement SignupTrialHost Component UI (TDD - Green)
- Create `SignupTrialHost.tsx`
- Add comprehensive JSDoc
- Implement component structure:
  - Import hooks and styles
  - Define SignupTrialHostProps interface
  - Wrap with React.memo
  - Use useSignupForm hook
  - Render progress indicator
  - Render form fields based on current step
  - Render navigation buttons
  - Render validation errors
  - Render loading state
  - Render success/error messages
- Implement Step 1 fields (Personal Info):
  - Name input (required)
  - Email input (required, validated)
  - Phone input (required, formatted)
- Implement Step 2 fields (Property Info):
  - Property address (required)
  - Property type select (required)
  - Number of bedrooms (required, number)
  - Number of bathrooms (required, number)
- Implement Step 3 fields (Trial Preferences):
  - Preferred start date (required, date picker)
  - Trial duration select (required)
  - How did you hear about us (optional, select)
  - Terms agreement checkbox (required)
- Run rendering tests - make them pass

### 11. Make Interaction Tests Pass
- Add event handlers to all inputs
- Implement step navigation logic
- Add form submission handler
- Implement loading state UI
- Implement success/error feedback
- Add form disable during submission
- Run interaction tests - verify they pass

### 12. Make Validation Tests Pass
- Connect validation to form fields
- Display error messages below fields
- Prevent step navigation with invalid data
- Prevent form submission with invalid data
- Clear errors on valid input
- Run validation tests - verify they pass

### 13. Make Accessibility Tests Pass (TDD - Green)
- Add ARIA labels to all inputs
- Add ARIA live region for announcements
- Add aria-invalid and aria-describedby for errors
- Implement proper heading hierarchy
- Add proper button roles
- Ensure logical tab order
- Add keyboard event handlers
- Implement focus management
- Run accessibility tests - verify zero violations

### 14. Add Error Handling and Edge Cases
- Handle missing onSubmit callback gracefully
- Add error boundary for catastrophic failures
- Handle null/undefined props with defaults
- Prevent memory leaks on unmount
- Handle rapid clicking without breaking
- Add debouncing for API calls
- Handle network failures gracefully
- Add retry logic for failed submissions
- Run edge case tests - verify they pass

### 15. Optimize Component Performance
- Verify React.memo prevents unnecessary re-renders
- Ensure all callbacks are stable (useCallback)
- Ensure computed values are memoized (useMemo)
- Add performance budget tests
- Profile with React DevTools
- Optimize any bottlenecks
- Ensure render time < 50ms

### 16. Complete JSDoc Documentation
- Add comprehensive JSDoc to SignupTrialHost component:
  - Description of purpose
  - @example showing basic usage
  - @example showing advanced usage
  - @param descriptions
  - @returns description
- Add JSDoc to all custom hooks
- Add JSDoc to all exported types
- Add inline comments explaining complex logic
- Reference architectural commandments

### 17. Create Component README
- Create `SignupTrialHost/README.md`
- Document component purpose and features
- Document all props with types
- Add usage examples:
  - Basic usage
  - With custom onSubmit handler
  - With custom styling
  - As an island mount
- Document form fields and validation rules
- Document accessibility features
- Add troubleshooting section
- Include integration guide

### 18. Update Component Exports
- Update `SignupTrialHost/index.ts` to export:
  - SignupTrialHost component
  - SignupTrialHostProps type
  - FormData type
  - FormStep enum
  - Zod schemas
  - Custom hooks (for advanced usage)
- Update `components/src/index.ts` to export SignupTrialHost:
  - Add to barrel exports
  - Export component and types
- Test imports work correctly

### 19. Integration Testing
- Create integration test for complete form flow:
  - Fill all fields across all steps
  - Navigate forward and backward
  - Submit form
  - Verify onSubmit called with correct data
- Test form with mock API responses:
  - Successful submission
  - Failed submission (network error)
  - Failed submission (validation error from server)
- Test multiple instances on same page
- Verify no state conflicts

### 20. Performance Testing
- Measure component bundle size (< 50KB target)
- Measure initial render time (< 50ms target)
- Measure form submission time
- Profile memory usage
- Test on slow 3G connection
- Verify no layout shifts (CLS = 0)
- Run Lighthouse audit

### 21. Final Code Review and Validation
- Review against all Ten Commandments
- Verify all tests pass with >90% coverage
- Check TypeScript strict mode compliance
- Verify no console.logs or debugging code
- Ensure proper error handling
- Validate JSDoc completeness
- Check code formatting and linting
- Run all validation commands
- Verify acceptance criteria met

## Testing Strategy

### Unit Tests
**Target Coverage: >90%**

1. **Component Rendering**
   - All three steps render correctly
   - Progress indicator shows correct step
   - Form fields render with correct attributes
   - Buttons render conditionally (back, next, submit)
   - Loading states render correctly
   - Success/error messages render

2. **Form Interactions**
   - Input changes update state
   - Blur triggers validation
   - Next button navigates forward (with validation)
   - Back button navigates backward
   - Submit button triggers submission
   - Form disables during submission
   - Success callback fires with correct data

3. **Validation**
   - Required field validation
   - Email format validation
   - Phone format validation
   - Date validation
   - Terms acceptance validation
   - Multi-field validation
   - Error message display
   - Error clearing on valid input

4. **Custom Hooks**
   - useSignupForm state management
   - useFormValidation logic
   - Callback stability
   - Memory leak prevention

### Integration Tests
**End-to-End Form Flows:**

1. **Happy Path**
   - Complete all steps with valid data
   - Submit successfully
   - Verify callback with correct data structure

2. **Validation Flow**
   - Attempt next with invalid data
   - See validation errors
   - Fix errors
   - Successfully proceed

3. **Error Recovery**
   - Submit with network error
   - See error message
   - Retry submission
   - Succeed

4. **Multi-Step Navigation**
   - Navigate forward through all steps
   - Navigate backward
   - Data persists across steps
   - Validation state persists

### Accessibility Tests
**WCAG 2.1 AA Compliance:**

1. **Automated (jest-axe)**
   - Zero violations in all states
   - Proper ARIA attributes
   - Semantic HTML structure
   - Color contrast compliance

2. **Keyboard Navigation**
   - Tab order is logical
   - Enter submits forms
   - Escape cancels (if applicable)
   - All interactive elements reachable
   - Focus visible at all times

3. **Screen Reader Support**
   - Form labels announced correctly
   - Validation errors announced
   - Loading states announced
   - Success/error messages announced
   - Step navigation announced

### Edge Cases
1. **Missing Props**
   - No onSubmit callback
   - Undefined optional props
   - Null values handled

2. **User Behavior**
   - Rapid clicking
   - Multiple submissions
   - Browser back/forward during submission
   - Component unmount during submission

3. **Network Issues**
   - Slow connections
   - Network failures
   - Timeout scenarios

## Acceptance Criteria

### Functional Requirements
- [ ] Three-step form renders correctly
- [ ] Personal info step captures name, email, phone
- [ ] Property info step captures address, type, bedrooms, bathrooms
- [ ] Trial preferences step captures start date, duration, referral source
- [ ] Progress indicator shows current step (1/3, 2/3, 3/3)
- [ ] Next button navigates forward with validation
- [ ] Back button navigates backward without validation
- [ ] Submit button only on final step
- [ ] Real-time validation on blur
- [ ] Error messages display below invalid fields
- [ ] Form disables during submission
- [ ] Loading spinner shows during submission
- [ ] Success message on successful submission
- [ ] Error message on failed submission
- [ ] Form resets after successful submission
- [ ] onSubmit callback receives complete form data

### Technical Requirements
- [ ] Component uses CSS Modules (SignupTrialHost.module.css)
- [ ] Full TypeScript type safety (no 'any')
- [ ] Zod schemas for runtime validation
- [ ] React.memo prevents unnecessary re-renders
- [ ] All callbacks stable (useCallback)
- [ ] Computed values memoized (useMemo)
- [ ] Business logic in custom hooks
- [ ] ESM module format with named exports
- [ ] Bundle size < 50KB gzipped
- [ ] Proper cleanup in useEffect hooks

### Testing Requirements
- [ ] Unit test coverage >90%
- [ ] All rendering scenarios tested
- [ ] All user interactions tested
- [ ] All validation rules tested
- [ ] All form steps tested
- [ ] Custom hooks tested independently
- [ ] Accessibility tests pass (zero violations)
- [ ] Edge cases covered
- [ ] Performance tests included
- [ ] Integration tests for complete flows

### Accessibility Requirements (WCAG 2.1 AA)
- [ ] All form fields have labels
- [ ] Error messages associated with fields (aria-describedby)
- [ ] Invalid fields marked (aria-invalid)
- [ ] Live region for status announcements
- [ ] Proper heading hierarchy
- [ ] Keyboard navigation fully functional
- [ ] Focus indicators visible
- [ ] Color contrast meets AA standards
- [ ] Touch targets ≥ 44x44px
- [ ] Zero axe violations

### Documentation Requirements
- [ ] JSDoc on component with examples
- [ ] JSDoc on all hooks
- [ ] JSDoc on all types
- [ ] README.md with API reference
- [ ] Usage examples provided
- [ ] Form field specifications documented
- [ ] Validation rules documented
- [ ] Integration guide included

### Performance Requirements
- [ ] Component bundle < 50KB gzipped
- [ ] Initial render < 50ms
- [ ] Form submission < 100ms (excluding network)
- [ ] No memory leaks
- [ ] No layout shifts (CLS = 0)
- [ ] Lighthouse performance score >90

### Code Quality Requirements
- [ ] Follows all Ten Commandments
- [ ] No console.logs or debugging code
- [ ] No magic numbers (all named constants)
- [ ] Single Responsibility Principle
- [ ] DRY principle followed
- [ ] Proper error handling
- [ ] Comments explain "why" not "what"

## Validation Commands

Execute these commands to validate the feature is complete:

### 1. Install Dependencies
```bash
cd app/split-lease/components
npm install
```
**Expected:** Dependencies install without errors

### 2. Run Type Checking
```bash
npm run typecheck
```
**Expected:** Zero TypeScript errors

### 3. Run All Tests
```bash
npm run test
```
**Expected:** All tests pass, no failures

### 4. Run Tests with Coverage
```bash
npm run test:coverage
```
**Expected:**
- Line coverage >90%
- Branch coverage >90%
- Function coverage >90%
- Statement coverage >90%

### 5. Run SignupTrialHost Tests Only
```bash
npm run test -- SignupTrialHost
```
**Expected:** All SignupTrialHost tests pass

### 6. Run Accessibility Tests
```bash
npm run test -- SignupTrialHost.a11y
```
**Expected:** Zero accessibility violations

### 7. Run Build
```bash
npm run build
```
**Expected:**
- Build succeeds
- No build warnings
- Bundle sizes within limits

### 8. Check Bundle Size
```bash
npm run build
ls -lh dist/
```
**Expected:** SignupTrialHost contribution < 50KB gzipped

### 9. Manual Testing with Preview
Create test HTML file for manual verification:
```html
<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <title>SignupTrialHost Test</title>
    <link rel="stylesheet" href="/dist/split-lease-components.css">
</head>
<body>
    <div id="signup-form"></div>

    <script type="module">
        import { SignupTrialHost } from '/dist/components.js';
        import { createRoot } from 'react-dom/client';
        import React from 'react';

        const root = createRoot(document.getElementById('signup-form'));
        root.render(
            React.createElement(SignupTrialHost, {
                onSubmit: (data) => {
                    console.log('Form submitted:', data);
                    alert('Form submitted successfully!');
                }
            })
        );
    </script>
</body>
</html>
```

**Manual Test Checklist:**
- [ ] Form renders all three steps
- [ ] Can navigate forward with valid data
- [ ] Cannot navigate forward with invalid data
- [ ] Can navigate backward at any time
- [ ] Validation errors display on blur
- [ ] All inputs accept and display values
- [ ] Submit button only on step 3
- [ ] Loading state shows during submission
- [ ] Success message after submission
- [ ] Form responsive on mobile
- [ ] Keyboard navigation works
- [ ] No console errors

### 10. Performance Validation
```bash
npm run test:performance
```
**Expected:**
- Initial render < 50ms
- No memory leaks
- Minimal re-renders

## Notes

### Form Field Specifications

#### Step 1: Personal Information
- **Full Name** (text, required, min 2 characters)
- **Email Address** (email, required, validated format)
- **Phone Number** (tel, required, formatted as (XXX) XXX-XXXX)

#### Step 2: Property Information
- **Property Address** (text, required, min 10 characters)
- **Property Type** (select, required)
  - Options: Single Family Home, Condo, Townhouse, Apartment, Other
- **Number of Bedrooms** (number, required, min 1, max 20)
- **Number of Bathrooms** (number, required, min 1, max 20, step 0.5)

#### Step 3: Trial Preferences
- **Preferred Start Date** (date, required, must be future date)
- **Trial Duration** (select, required)
  - Options: 7 days, 14 days, 30 days
- **How did you hear about us?** (select, optional)
  - Options: Google Search, Social Media, Friend Referral, Blog/Article, Other
- **I agree to the Terms and Conditions** (checkbox, required)

### Validation Rules
- **Email**: Must match RFC 5322 email format
- **Phone**: Must be 10 digits, formatted as (XXX) XXX-XXXX
- **Name**: 2-50 characters, letters and spaces only
- **Address**: 10-200 characters
- **Bedrooms/Bathrooms**: Positive numbers, bedrooms whole numbers, bathrooms allow 0.5 increments
- **Start Date**: Must be at least tomorrow (no past dates)
- **Terms**: Must be checked to submit

### API Integration
The component expects an `onSubmit` callback prop:

```typescript
interface SignupTrialHostProps {
  onSubmit?: (data: FormData) => Promise<void>;
  onSuccess?: () => void;
  onError?: (error: Error) => void;
  className?: string;
  initialStep?: FormStep;
}
```

The FormData structure sent to onSubmit:
```typescript
interface FormData {
  personalInfo: {
    fullName: string;
    email: string;
    phone: string;
  };
  propertyInfo: {
    address: string;
    propertyType: PropertyType;
    bedrooms: number;
    bathrooms: number;
  };
  trialPreferences: {
    startDate: string; // ISO 8601 date string
    duration: number; // days
    referralSource?: string;
    termsAccepted: boolean;
  };
}
```

### Design Considerations
1. **Mobile-First**: Form is optimized for mobile devices with large touch targets
2. **Progressive Disclosure**: Multi-step approach reduces cognitive load
3. **Inline Validation**: Real-time feedback improves user experience
4. **Clear Progress**: Progress indicator shows completion status
5. **Error Recovery**: Clear error messages guide users to fix issues
6. **Success Feedback**: Positive reinforcement after successful submission

### Dependencies
No new dependencies required. The component uses:
- `react` and `react-dom` (already installed)
- `zod` (already installed for Footer/Header)
- Test dependencies (already installed)

### Future Enhancements (Out of Scope)
- Island mount script creation (separate task after component complete)
- Integration into HTML pages (separate task)
- Backend API implementation (separate project)
- Email verification step
- Property photo upload
- Google Places autocomplete for address
- Analytics tracking integration
- A/B testing variants
- Social signup options (Google, Facebook)

### Risk Mitigation
1. **Data Privacy**: Never log or expose sensitive user data
2. **Validation Security**: Client-side validation for UX, server-side for security
3. **Performance**: Bundle size monitored, lazy loading if needed
4. **Accessibility**: Continuous testing with screen readers
5. **Browser Support**: Test in all major browsers (Chrome, Firefox, Safari, Edge)

### Success Metrics
- Zero test failures
- >90% code coverage
- Zero accessibility violations
- Bundle size < 50KB
- Render time < 50ms
- TypeScript strict mode compliance
- All acceptance criteria met
- Manual testing checklist complete

---

**Created:** January 2025
**Status:** Ready for Implementation
**Estimated Effort:** 3-4 days
**Priority:** High
**Assigned To:** AI Agent (sdlc_implementor)
