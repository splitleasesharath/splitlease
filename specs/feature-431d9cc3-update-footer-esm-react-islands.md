# Feature: Update Footer Component to ESM + React Islands Architecture

## Metadata
adw_id: `431d9cc3`
prompt: `Lets update the Footer React component to be compatible with the new ESM +React island Structure, following the prescribed principles of tidiness, test driven, easy to iterate and maintainable, clean and modular(also following the principles of Software Developer Lifecycle: Plan, Code, Test, Review, Document). Do not add mounts, Do not add , it to any pages yet, Just rebuild the component as per these pointers from local path: C:\Users\igor\My Drive (splitleaseteam@gmail.com)!Agent Context and Tools\SL1\TAC\Context\Architecture. Do not disturb any other page/component that is not the Footer.`

## Feature Description
The Footer component currently exists as a React component but needs to be updated to fully comply with the ESM + React Islands architecture pattern. This includes migrating from global CSS to CSS Modules, implementing proper TypeScript types with runtime validation, creating comprehensive test coverage (>90%), adding proper JSDoc documentation, optimizing for performance and accessibility, and ensuring the component follows all architectural commandments defined in the Split Lease architectural bible.

This is a refactoring task focused on modernizing the existing Footer component without adding it to any pages or creating island mount scripts. The goal is to make the component production-ready and compliant with the new architecture before integration.

## User Story
As a developer working on the Split Lease platform
I want the Footer component to be fully compliant with our ESM + React Islands architecture
So that it can be safely integrated into pages with confidence in its quality, performance, testability, and maintainability

## Problem Statement
The current Footer component (Footer.tsx and Footer.css) has the following issues that prevent it from being fully compliant with the new architecture:

1. **Non-scoped CSS**: Uses global CSS instead of CSS Modules, risking style conflicts
2. **No runtime validation**: TypeScript interfaces lack runtime validation with Zod schemas
3. **Missing tests**: No unit tests, integration tests, or accessibility tests exist
4. **Incomplete documentation**: Missing comprehensive JSDoc comments with examples
5. **No performance optimization**: Lacks memoization, lazy loading, or performance budgets
6. **Accessibility gaps**: Missing ARIA labels, live regions for dynamic updates, and full keyboard navigation support
7. **Mixed concerns**: State management logic mixed with presentation
8. **No error boundaries**: Component lacks error handling and graceful degradation
9. **Not following TDD**: Component wasn't built test-first
10. **Missing validation**: Form inputs lack proper validation feedback

## Solution Statement
Refactor the Footer component to be a fully compliant ESM + React Islands component by:

1. **Migrating to CSS Modules** for scoped, conflict-free styling
2. **Adding Zod schemas** for runtime prop and data validation
3. **Implementing comprehensive tests** achieving >90% code coverage
4. **Writing detailed JSDoc** documentation with usage examples
5. **Optimizing performance** with React.memo, useMemo, useCallback
6. **Enhancing accessibility** to WCAG 2.1 AA compliance
7. **Separating concerns** by extracting business logic to custom hooks
8. **Adding error boundaries** and graceful error handling
9. **Following TDD principles** by writing tests first, then implementation
10. **Adding validation UI** with user-friendly error messages

## Relevant Files

### Existing Files to Modify
- **`app/split-lease/components/src/Footer/Footer.tsx`** (lines 1-273)
  - Current component implementation with inline styles and mixed concerns
  - Needs refactoring to separate logic, add memoization, improve accessibility

- **`app/split-lease/components/src/Footer/Footer.css`** (lines 1-341)
  - Global CSS file that needs conversion to CSS Modules
  - Contains all styling for footer sections, forms, and responsive layouts

- **`app/split-lease/components/src/Footer/index.ts`** (lines 1-5)
  - Export file that needs to export new types and validation schemas

### New Files to Create

#### Test Files
- **`app/split-lease/components/src/Footer/Footer.test.tsx`**
  - Comprehensive unit tests for rendering, interactions, validation, accessibility
  - Target >90% code coverage

- **`app/split-lease/components/src/Footer/Footer.a11y.test.tsx`**
  - Dedicated accessibility tests using jest-axe
  - Tests for ARIA attributes, keyboard navigation, screen reader announcements

#### Supporting Files
- **`app/split-lease/components/src/Footer/Footer.module.css`**
  - CSS Modules version of current Footer.css
  - Scoped class names preventing global conflicts

- **`app/split-lease/components/src/Footer/Footer.schema.ts`**
  - Zod schemas for runtime validation of props and form data
  - Type inference for TypeScript types

- **`app/split-lease/components/src/Footer/hooks/useFooterReferral.ts`**
  - Custom hook for referral form logic and state management
  - Separation of concerns from presentation

- **`app/split-lease/components/src/Footer/hooks/useFooterImport.ts`**
  - Custom hook for listing import form logic and state management
  - Handles validation, submission, and error states

- **`app/split-lease/components/src/Footer/Footer.types.ts`**
  - Centralized type definitions inferred from Zod schemas
  - Ensures single source of truth for types

## Implementation Plan

### Phase 1: Foundation and Architecture Setup
Set up the testing infrastructure, type system, and architectural foundation before any implementation.

**Principles**: Test-Driven Development, Type Safety, Single Source of Truth

### Phase 2: CSS Migration to CSS Modules
Convert global CSS to scoped CSS Modules for conflict-free styling.

**Principles**: Separation of Concerns, Maintainability

### Phase 3: Component Logic Refactoring
Extract business logic into custom hooks and optimize with React patterns.

**Principles**: Separation of Concerns, Immutability, Optimize for Change

### Phase 4: Accessibility Enhancement
Ensure WCAG 2.1 AA compliance with proper ARIA, keyboard navigation, and screen reader support.

**Principles**: Handle Errors Gracefully, Document Intent

### Phase 5: Performance Optimization
Implement memoization, lazy loading, and performance budgets.

**Principles**: Measure Everything, Optimize for Change

### Phase 6: Documentation and Review
Complete JSDoc documentation and perform comprehensive code review.

**Principles**: Write Self-Documenting Code, Document Intent

## Step by Step Tasks

### 1. Set Up Testing Infrastructure and Type System (TDD Foundation)
- Install required testing dependencies (vitest, @testing-library/react, jest-axe, @faker-js/faker)
- Configure Vitest with coverage thresholds (>90%)
- Set up test utilities and mock service worker (MSW) for API mocking
- Create Zod schemas in `Footer.schema.ts` for all props and form data
- Generate TypeScript types from Zod schemas in `Footer.types.ts`
- Update `tsconfig.json` to include strict mode and path aliases

### 2. Write Comprehensive Tests FIRST (Red Phase of TDD)
- Create `Footer.test.tsx` with failing tests for:
  - Default rendering with all sections
  - Custom props (columns, showReferral, showImport, showAppDownload)
  - Referral form interactions (radio selection, input, submit)
  - Import form interactions (URL input, email input, validation, submit)
  - Error states and validation messages
  - Loading states during submission
  - Edge cases (null/undefined props, rapid clicks, empty inputs)
- Create `Footer.a11y.test.tsx` with accessibility tests:
  - No axe violations
  - ARIA attributes present and correct
  - Keyboard navigation (tab order, enter/space activation)
  - Screen reader announcements for form submissions
  - Focus management
- Run tests to verify they ALL FAIL (Red phase complete)

### 3. Migrate CSS to CSS Modules
- Create `Footer.module.css` by converting global classes to module classes
- Use camelCase naming convention for class names
- Implement CSS custom properties for theme values
- Add responsive breakpoints using media queries
- Preserve all existing styles while making them scoped
- Remove original `Footer.css` after migration complete

### 4. Extract Business Logic into Custom Hooks (Green Phase - Part 1)
- Create `hooks/useFooterReferral.ts`:
  - State: referralMethod, referralContact, isSubmitting, error
  - Validation: phone number format, email format
  - Submit handler with error handling
  - Return stable callbacks using useCallback
- Create `hooks/useFooterImport.ts`:
  - State: importUrl, importEmail, isSubmitting, error
  - Validation: URL format, email format
  - Submit handler with error handling and success feedback
  - Return stable callbacks using useCallback
- Add unit tests for both hooks independently

### 5. Refactor Footer Component with Hooks and Optimization (Green Phase - Part 2)
- Update `Footer.tsx` to use custom hooks
- Import CSS Module styles (import styles from './Footer.module.css')
- Wrap component with React.memo for performance
- Use useMemo for computed values (placeholder text)
- Use useCallback for all event handlers
- Add displayName for debugging
- Apply proper TypeScript types from Footer.types.ts
- Validate props at runtime using Zod schemas
- Run tests - they should start passing

### 6. Enhance Accessibility (Green Phase - Part 3)
- Add proper ARIA labels to all interactive elements
- Add ARIA live regions for form submission feedback
- Implement proper button roles and states (aria-pressed, aria-busy)
- Add aria-invalid and aria-describedby for form validation
- Ensure proper heading hierarchy (h1-h6)
- Add focus management for modals/errors
- Add keyboard event handlers (Enter/Space for custom interactions)
- Test with screen reader (document expected behavior in comments)
- Run accessibility tests - they should pass

### 7. Add Error Handling and Validation UI
- Display validation errors inline below form fields
- Show success messages for successful submissions
- Add error boundary for catastrophic failures
- Implement graceful degradation for missing props
- Add loading spinners during async operations
- Handle network failures with user-friendly messages
- Run tests - validation tests should pass

### 8. Performance Optimization and Measurement
- Add performance marks around expensive operations
- Implement lazy loading for app download images (loading="lazy")
- Add bundle size budget check in vite config
- Measure component render time
- Add React DevTools Profiler marks
- Document performance benchmarks in tests
- Run performance tests to verify <100ms render time

### 9. Write Comprehensive JSDoc Documentation
- Add JSDoc to Footer component with:
  - Description of purpose and usage
  - @example showing basic usage
  - @example showing advanced usage with all props
  - @param descriptions for all props
  - @returns description
- Add JSDoc to all custom hooks
- Add JSDoc to all exported types and schemas
- Add inline comments explaining complex business logic
- Reference architectural principles in comments

### 10. Update Export File and Validate
- Update `Footer/index.ts` to export:
  - Footer component
  - FooterProps, FooterColumn, FooterLink types
  - FooterPropsSchema (Zod schema)
  - Custom hooks (useFooterReferral, useFooterImport) for reusability
- Verify all exports work correctly
- Run `npm run typecheck` to verify no TypeScript errors
- Run `npm run build` to verify component builds correctly

### 11. Final Testing and Quality Assurance
- Run full test suite: `npm run test`
- Verify >90% code coverage achieved
- Run accessibility audit with jest-axe
- Perform manual testing of all interactions
- Test responsive behavior at different screen sizes
- Test with keyboard only (no mouse)
- Test with screen reader (NVDA/JAWS)
- Verify no console errors or warnings

### 12. Code Review and Refactoring (Refactor Phase of TDD)
- Review code against The Ten Commandments of Architecture
- Ensure all functions are <20 lines
- Verify no magic numbers (all values are named constants)
- Check for proper error handling in all async operations
- Ensure immutability (no mutations)
- Verify single responsibility principle
- Refactor any code smells while keeping tests green
- Update documentation if refactoring changes behavior

## Testing Strategy

### Unit Tests
**Target Coverage**: >90%

**Test Categories**:
1. **Rendering Tests**
   - Default props render correctly
   - Custom props are applied
   - Conditional sections (showReferral, showImport, showAppDownload)
   - Custom columns configuration
   - Custom text (copyrightText, footerNote, termsUrl)

2. **Interaction Tests**
   - Referral method toggle (text/email)
   - Referral input change
   - Referral form submit (valid/invalid)
   - Import URL input change
   - Import email input change
   - Import form submit (valid/invalid)
   - Button states during submission
   - Link navigation

3. **Validation Tests**
   - Email format validation
   - Phone format validation
   - URL format validation
   - Required field validation
   - Error message display
   - Validation on blur vs on submit

4. **State Management Tests**
   - Loading states during async operations
   - Error states after failed submissions
   - Success states after successful submissions
   - State cleanup after submission
   - Multiple rapid submissions handled correctly

5. **Hook Tests** (Separate test files)
   - useFooterReferral hook behavior
   - useFooterImport hook behavior
   - Hook state updates
   - Hook callback stability

### Integration Tests
**Test Scenarios**:
1. Complete referral submission flow
2. Complete import submission flow
3. Multiple form interactions in sequence
4. Error recovery and retry flows
5. Navigation from footer links

### Accessibility Tests
**WCAG 2.1 AA Compliance**:
1. No axe violations
2. All interactive elements keyboard accessible
3. Proper ARIA labels and roles
4. Focus indicators visible
5. Screen reader announcements for state changes
6. Semantic HTML structure
7. Sufficient color contrast
8. Touch target sizes (44x44px minimum)

### Edge Cases
1. Null/undefined props handling
2. Empty arrays for columns
3. Missing callback functions (onReferralSubmit, onImportSubmit)
4. Extremely long text in inputs
5. Special characters in inputs
6. Network failures during submission
7. Rapid clicking/double submission
8. Browser back/forward during submission
9. Component unmount during async operation

## Acceptance Criteria

### Functional Requirements
- [ ] Footer renders with default columns and all sections visible
- [ ] Custom columns can be provided via props
- [ ] Referral section toggles between text and email modes
- [ ] Referral form validates input before submission
- [ ] Import form validates URL and email before submission
- [ ] Loading states displayed during form submissions
- [ ] Error messages displayed for validation failures
- [ ] Success feedback shown after successful submissions
- [ ] App download section conditionally renders
- [ ] All links are clickable and navigate correctly
- [ ] Footer bottom displays copyright and terms link

### Technical Requirements
- [ ] Component uses CSS Modules (Footer.module.css)
- [ ] All props validated with Zod schemas at runtime
- [ ] TypeScript types inferred from Zod schemas
- [ ] Component wrapped with React.memo
- [ ] Expensive computations memoized with useMemo
- [ ] Event handlers stabilized with useCallback
- [ ] Business logic extracted to custom hooks
- [ ] No inline styles or global CSS classes
- [ ] Component exports follow ESM standards
- [ ] Bundle size within budget (<50KB)

### Testing Requirements
- [ ] Unit test coverage >90%
- [ ] All rendering paths tested
- [ ] All user interactions tested
- [ ] All validation scenarios tested
- [ ] All error states tested
- [ ] Accessibility tests pass with zero violations
- [ ] Custom hooks tested independently
- [ ] Edge cases covered with specific tests
- [ ] Performance benchmarks included
- [ ] No flaky or skipped tests

### Accessibility Requirements (WCAG 2.1 AA)
- [ ] All form inputs have associated labels
- [ ] All buttons have descriptive aria-labels
- [ ] Form validation errors announced to screen readers
- [ ] Loading states announced to screen readers
- [ ] Proper heading hierarchy maintained
- [ ] Keyboard navigation works for all interactions
- [ ] Focus indicators visible on all focusable elements
- [ ] Color contrast ratios meet AA standards (4.5:1 for text)
- [ ] Touch targets minimum 44x44px
- [ ] No axe-core violations

### Documentation Requirements
- [ ] JSDoc on Footer component with examples
- [ ] JSDoc on all custom hooks
- [ ] JSDoc on all exported types
- [ ] Inline comments explain complex logic
- [ ] README updated with Footer usage examples
- [ ] Migration notes documented
- [ ] Performance benchmarks documented

### Code Quality Requirements
- [ ] No TypeScript errors (`npm run typecheck` passes)
- [ ] No ESLint errors
- [ ] No console.logs or debugging code
- [ ] All functions <20 lines
- [ ] No magic numbers (named constants only)
- [ ] Proper error handling in all async operations
- [ ] Immutability maintained (no mutations)
- [ ] Single responsibility principle followed
- [ ] Follows all Ten Commandments of Architecture

## Validation Commands

Execute these commands to validate the feature is complete:

**1. Type Checking**
```bash
cd app/split-lease/components
npm run typecheck
```
Expected: Zero TypeScript errors

**2. Run All Tests**
```bash
cd app/split-lease/components
npm run test
```
Expected: All tests pass, coverage >90%

**3. Run Tests with Coverage Report**
```bash
cd app/split-lease/components
npm run test -- --coverage
```
Expected:
- Lines: >90%
- Functions: >90%
- Branches: >90%
- Statements: >90%

**4. Run Specific Footer Tests**
```bash
cd app/split-lease/components
npm run test -- Footer
```
Expected: All Footer tests pass

**5. Run Accessibility Tests Only**
```bash
cd app/split-lease/components
npm run test -- Footer.a11y
```
Expected: Zero accessibility violations

**6. Build Component Library**
```bash
cd app/split-lease/components
npm run build
```
Expected: Build succeeds, bundle sizes within budget, no errors

**7. Check Bundle Size**
```bash
cd app/split-lease/components
npm run build
ls -lh dist/
```
Expected: Footer component contributes <50KB to bundle

**8. Manual Testing Checklist**
- Open `app/test-harness/previews/footer-preview.html` in browser
- Test referral form with text method
- Test referral form with email method
- Test import form with valid URL and email
- Test import form with invalid inputs
- Test all footer links are clickable
- Test responsive behavior (resize browser)
- Test keyboard navigation (tab through all elements)
- Test with screen reader (verify announcements)

## Notes

### Dependencies Required
The following dependencies need to be added to `app/split-lease/components/package.json`:

```bash
# Add to devDependencies
npm install --save-dev \
  vitest \
  @vitest/ui \
  jsdom \
  @testing-library/react \
  @testing-library/user-event \
  @testing-library/jest-dom \
  jest-axe \
  @faker-js/faker \
  msw

# Add to dependencies
npm install zod
```

### CSS Modules Configuration
The vite.config.ts already has CSS Modules configured:
```typescript
css: {
  modules: {
    localsConvention: 'camelCase',
    generateScopedName: '[name]__[local]___[hash:base64:5]',
  },
}
```

### Performance Budget
- Component render time: <100ms
- Bundle size contribution: <50KB gzipped
- Time to interactive for forms: <50ms
- No layout shifts during loading

### Browser Support
- Modern browsers with ES2020 support
- React 18 compatible
- CSS Grid and Flexbox support required

### Future Enhancements (Out of Scope for This Task)
- Island mount script creation (separate task)
- Integration into HTML pages (separate task)
- Server-side rendering support (future)
- Referral tracking analytics integration (future)
- Import form backend API integration (future)

### Breaking Changes
None - this is a refactoring task that maintains the same API surface. All existing props remain compatible.

### Migration Path
For consumers of the old Footer:
1. Import path remains the same: `import { Footer } from '@components/Footer'`
2. Props interface remains backward compatible
3. CSS Modules are internal implementation detail
4. No changes required in consuming code

### References
- Architectural Bible: `Context/Architecture/architectural-bible.md`
- Migration Guide: `Context/Architecture/migration-guide.md`
- TDD Guide: `Context/Architecture/TDD-guide.md`
- README: `app/split-lease/README.md`

---

**Last Updated**: January 2025
**Status**: Planning Complete - Ready for Implementation
**Estimated Effort**: 2-3 days
**Priority**: High
**Assigned To**: AI Agent (sdlc_implementor)
