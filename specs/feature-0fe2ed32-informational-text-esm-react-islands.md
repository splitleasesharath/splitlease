# Feature: Create and Integrate the Informational-Text Component using ESM + React Islands Structure

## Metadata
adw_id: `0fe2ed32`
prompt: `Lets update the informational-text React component to be compatible with the new ESM +React island Structure, following the prescribed principles of tidiness, test driven, easy to iterate and maintainable, clean and modular(also following the principles of Software Developer Lifecycle: Plan, Code, Test, Review, Document). Do not add mounts, Do not add it to any pages yet, Just rebuild the component as per these pointers from local path: C:\Users\igor\My Drive (splitleaseteam@gmail.com)!Agent Context and Tools\SL1\TAC\Context\Architecture. Do not disturb any other page/component that is not the informational-text.`

## Feature Description
Create a new `InformationalText` component from the ground up using the ESM + React Islands architecture pattern. This component will display informational messages, notices, tips, or contextual help text in a visually distinct and accessible manner. The component will follow all Split Lease architectural commandments, implementing CSS Modules, comprehensive testing (TDD), full TypeScript type safety with runtime validation, WCAG 2.1 AA accessibility compliance, and performance optimization. The component will be self-contained, tree-shakeable, and ready for island mounting without being added to any pages yet.

This is a pure component creation task focused on building a production-ready, architecture-compliant component that can display different types of informational content with various severity levels (info, warning, success, error), support for custom icons, dismissibility, and rich content including headings, body text, and action buttons.

## User Story
As a **frontend developer**
I want to **create a modern InformationalText component built with ESM + React Islands architecture**
So that **I can display contextual information, notifications, and help text to users in a consistent, accessible, and performant manner that follows Split Lease's architectural standards**

## Problem Statement
Split Lease currently lacks a dedicated, standardized component for displaying informational messages and contextual help. The application needs a reusable component that can:

1. **Display Various Message Types**: Support info, warning, success, and error messages with appropriate styling and icons
2. **Handle Rich Content**: Display titles, body text, and optional action buttons in a structured format
3. **Support Dismissibility**: Allow users to dismiss non-critical messages
4. **Ensure Accessibility**: Meet WCAG 2.1 AA standards with proper ARIA attributes and keyboard support
5. **Optimize Performance**: Load efficiently as an island with minimal bundle impact
6. **Follow Architecture**: Comply with all Split Lease architectural commandments from day one
7. **Enable Testability**: Be fully tested with >90% code coverage from the start
8. **Support Theming**: Work with the existing design system and support future theming

Without this component, developers would need to create ad-hoc solutions for informational messages, leading to:
- Inconsistent user experience across the application
- Accessibility gaps
- Duplicated code and styling
- Difficult maintenance
- No centralized testing

## Solution Statement
Build the `InformationalText` component from scratch following strict Test-Driven Development (TDD) and the ESM + React Islands architecture:

1. **Implement TDD from Start**: Write comprehensive tests first (unit, integration, accessibility) following Red-Green-Refactor
2. **Use CSS Modules**: Create scoped, conflict-free styling with TypeScript type generation
3. **Add Full Type Safety**: Complete TypeScript interfaces, Zod schemas for runtime validation, and JSDoc documentation
4. **Ensure Accessibility**: Full WCAG 2.1 AA compliance with jest-axe testing and keyboard support
5. **Optimize Performance**: Implement React.memo, useCallback, useMemo for optimal rendering
6. **Support Multiple Variants**: Create distinct styles for info, warning, success, and error types
7. **Enable Customization**: Allow custom icons, action buttons, and dismissibility
8. **Follow Atomic Design**: Structure as a molecule-level component with clear responsibilities
9. **Document Thoroughly**: Comprehensive JSDoc, usage examples, and accessibility guidelines
10. **Prepare for Islands**: Ensure the component is ready for island mounting (though mount script creation is out of scope)

## Relevant Files

### New Files to Create

#### Core Component Files
- **`app/split-lease/components/src/molecules/InformationalText/InformationalText.tsx`**
  - Main component implementation
  - Fully typed with TypeScript strict mode
  - Memoized for performance
  - Complete JSDoc documentation

- **`app/split-lease/components/src/molecules/InformationalText/InformationalText.module.css`**
  - CSS Modules for scoped styling
  - Styles for all variants (info, warning, success, error)
  - Responsive design
  - Accessibility-focused styling (focus indicators, color contrast)

- **`app/split-lease/components/src/molecules/InformationalText/InformationalText.types.ts`**
  - Centralized type definitions
  - Inferred from Zod schemas
  - Exported for consumer use

- **`app/split-lease/components/src/molecules/InformationalText/InformationalText.schema.ts`**
  - Zod schemas for runtime validation
  - Props validation
  - Type inference source

- **`app/split-lease/components/src/molecules/InformationalText/index.ts`**
  - Public API exports
  - Component, types, and schemas
  - Named exports for tree-shaking

#### Test Files
- **`app/split-lease/components/src/molecules/InformationalText/InformationalText.test.tsx`**
  - Comprehensive unit tests
  - Rendering tests for all variants
  - User interaction tests (dismiss, action buttons, keyboard)
  - Edge case and error handling tests
  - Target: >90% code coverage

- **`app/split-lease/components/src/molecules/InformationalText/InformationalText.a11y.test.tsx`**
  - Dedicated accessibility tests using jest-axe
  - ARIA attribute verification
  - Keyboard navigation tests
  - Screen reader announcement tests
  - Color contrast validation

#### Documentation Files
- **`app/split-lease/components/src/molecules/InformationalText/README.md`**
  - Component API reference
  - Usage examples (basic and advanced)
  - Props documentation with types
  - Accessibility guidelines
  - Best practices and patterns
  - Browser support information

#### Supporting Files (if needed)
- **`app/split-lease/components/src/molecules/InformationalText/hooks/useInformationalText.ts`**
  - Custom hook for dismiss logic (if complex state management needed)
  - Separation of concerns from presentation
  - Optional: only create if business logic warrants extraction

- **`app/split-lease/components/src/molecules/InformationalText/utils/icons.tsx`**
  - Default icon components for each variant
  - SVG icons optimized for performance
  - Accessible icon implementation

### Files to Update

- **`app/split-lease/components/src/molecules/index.ts`** (if exists)
  - Add export for InformationalText

- **`app/split-lease/components/src/index.ts`**
  - Add InformationalText to main exports
  - Ensure tree-shaking compatible exports

- **`app/split-lease/components/src/molecules/README.md`**
  - Add InformationalText to molecules documentation

## Implementation Plan

### Phase 1: Foundation and Testing Infrastructure
Set up the testing infrastructure and architectural foundation before any implementation.

**Principles**: Test-Driven Development, Type Safety, Single Source of Truth

**Goals**:
- Establish TDD workflow
- Define component API through types and schemas
- Create failing tests that define behavior

### Phase 2: Component Structure and Styling
Create the component structure with CSS Modules and visual design.

**Principles**: Separation of Concerns, Maintainability, Accessibility

**Goals**:
- Implement CSS Modules with all variants
- Create component skeleton
- Ensure responsive and accessible styling

### Phase 3: Component Logic Implementation (Green Phase)
Implement component logic to pass all tests.

**Principles**: Immutability, Optimize for Change, Handle Errors Gracefully

**Goals**:
- Pass all unit tests
- Implement dismiss functionality
- Handle all edge cases

### Phase 4: Accessibility Enhancement
Ensure WCAG 2.1 AA compliance with comprehensive accessibility testing.

**Principles**: Document Intent, Write Self-Documenting Code

**Goals**:
- Pass all accessibility tests
- Implement keyboard navigation
- Add proper ARIA attributes and roles

### Phase 5: Performance Optimization
Optimize component for production use with memoization and performance testing.

**Principles**: Measure Everything, Optimize for Change

**Goals**:
- Minimize re-renders
- Optimize bundle size
- Meet performance budgets

### Phase 6: Documentation and Review
Complete comprehensive documentation and perform code review.

**Principles**: Write Self-Documenting Code, Document Intent, Not Implementation

**Goals**:
- Complete JSDoc and README
- Review against architectural commandments
- Ensure production readiness

## Step by Step Tasks
IMPORTANT: Execute every step in order, top to bottom.

### 1. Set Up Component Directory Structure
- Create directory: `app/split-lease/components/src/molecules/InformationalText/`
- Create subdirectories: `hooks/`, `utils/` (if needed)
- Verify molecules directory exists in components/src/
- Plan file organization following atomic design principles

### 2. Create Type System and Validation Schemas (Single Source of Truth)
- Create `InformationalText.schema.ts` with Zod schemas:
  - `InformationalTextPropsSchema` for component props
  - Define `variant` enum: 'info' | 'warning' | 'success' | 'error'
  - Define `size` enum: 'small' | 'medium' | 'large'
  - Validate optional fields: title, icon, onDismiss, actions
- Create `InformationalText.types.ts`:
  - Infer `InformationalTextProps` from Zod schema
  - Define `InformationalTextAction` interface for action buttons
  - Define `InformationalTextVariant` and `InformationalTextSize` types
  - Export all types for consumer use

### 3. Write Comprehensive Tests FIRST (Red Phase of TDD)
- Create `InformationalText.test.tsx` with failing tests for:
  - **Rendering Tests**:
    - Renders with default props (variant='info', size='medium')
    - Renders with custom className
    - Renders title when provided
    - Renders children (body content)
    - Renders custom icon when provided
    - Renders default icon for each variant
    - Renders action buttons when provided
    - Renders dismiss button when onDismiss provided
    - Does not render dismiss button when onDismiss not provided
  - **Variant Tests**:
    - Renders 'info' variant with correct styles
    - Renders 'warning' variant with correct styles
    - Renders 'success' variant with correct styles
    - Renders 'error' variant with correct styles
  - **Size Tests**:
    - Renders 'small' size correctly
    - Renders 'medium' size correctly
    - Renders 'large' size correctly
  - **Interaction Tests**:
    - Calls onDismiss when dismiss button clicked
    - Calls action callback when action button clicked
    - Supports keyboard navigation (Tab, Enter, Space)
    - Focus management works correctly
  - **Edge Cases**:
    - Handles null/undefined children gracefully
    - Handles empty string children
    - Handles missing title gracefully
    - Handles invalid variant gracefully (uses default)
    - Handles rapid dismiss clicks without breaking
    - Handles multiple action buttons
    - Handles long content without breaking layout
- Create `InformationalText.a11y.test.tsx` with accessibility tests:
  - No axe violations for all variants
  - Proper ARIA role (`role="alert"` for error/warning, `role="status"` for info/success)
  - ARIA live region attributes correct
  - Dismiss button has proper aria-label
  - Action buttons have proper aria-labels
  - Icon has proper aria-hidden or alt text
  - Keyboard navigation works (Tab through all interactive elements)
  - Focus indicators visible
  - Color contrast meets WCAG AA standards (4.5:1 for normal text, 3:1 for large text)
- Run tests to verify they ALL FAIL (Red phase complete)
- Document expected test count and coverage baseline

### 4. Create Default Icons Utility
- Create `utils/icons.tsx`:
  - Define SVG icon components for each variant:
    - `InfoIcon`: Circle with 'i' symbol
    - `WarningIcon`: Triangle with exclamation mark
    - `SuccessIcon`: Circle with checkmark
    - `ErrorIcon`: Circle with 'x' symbol
  - Ensure icons are accessible (aria-hidden="true" since we have text)
  - Optimize SVG code for performance
  - Export as named exports
- Add unit tests for icon rendering

### 5. Create CSS Modules Styling (Green Phase - Part 1)
- Create `InformationalText.module.css`:
  - **Base Styles**:
    - `.container`: Main wrapper with flexbox layout
    - `.iconWrapper`: Icon container with proper spacing
    - `.content`: Content area with text styles
    - `.title`: Title heading styles
    - `.body`: Body text styles
    - `.actions`: Action buttons container
    - `.dismissButton`: Dismiss button with hover/focus states
  - **Variant Styles**:
    - `.info`: Blue color scheme
    - `.warning`: Yellow/orange color scheme
    - `.success`: Green color scheme
    - `.error`: Red color scheme
    - Use CSS custom properties for colors
  - **Size Styles**:
    - `.small`: Compact padding and font sizes
    - `.medium`: Standard padding and font sizes
    - `.large`: Generous padding and larger fonts
  - **Responsive Styles**:
    - Mobile-first approach
    - Stack content on small screens if needed
    - Adjust padding/spacing for mobile
  - **Accessibility Styles**:
    - High contrast focus indicators
    - Sufficient color contrast for all variants
    - Touch targets minimum 44x44px
    - Hover states for interactive elements
- Use CSS custom properties for theme values
- Ensure all classes are scoped with camelCase naming

### 6. Implement InformationalText Component (Green Phase - Part 2)
- Create `InformationalText.tsx`:
  - Import React, types, styles, icons
  - Define `InformationalTextProps` interface with JSDoc
  - Implement component with React.memo:
    - Destructure props with default values
    - Validate props with Zod schema (runtime validation)
    - Use useMemo for computed className combinations
    - Use useCallback for dismiss and action handlers
    - Determine icon to display (custom or default based on variant)
    - Render component structure:
      - Container div with variant and size classes
      - Icon wrapper with icon component
      - Content div with title (if provided) and children
      - Actions div with action buttons (if provided)
      - Dismiss button (if onDismiss provided)
    - Add proper ARIA attributes based on variant
    - Add displayName for debugging
  - Ensure all interactive elements are keyboard accessible
  - Handle all edge cases from tests
- Run tests - rendering tests should start passing

### 7. Enhance Accessibility (Green Phase - Part 3)
- Add proper ARIA roles:
  - `role="alert"` for error and warning variants (assertive)
  - `role="status"` for info and success variants (polite)
  - `aria-live="polite"` for info/success
  - `aria-live="assertive"` for error/warning
- Add aria-label to dismiss button: "Dismiss notification"
- Add aria-label to icons if they convey meaning
- Ensure keyboard navigation:
  - Tab order is logical (icon → action buttons → dismiss)
  - Enter and Space activate buttons
  - Escape key dismisses (if dismissible)
- Add focus management:
  - Focus visible indicators
  - Focus returns to trigger after dismiss (if applicable)
- Test with keyboard only (no mouse)
- Run accessibility tests - they should pass

### 8. Add Dismiss and Action Functionality (Green Phase - Part 4)
- Implement dismiss handler:
  - useCallback for stability
  - Call onDismiss prop when clicked
  - Handle keyboard events (Enter, Space)
  - Optional: Add fade-out animation before dismissing
- Implement action button handlers:
  - useCallback for each action handler
  - Call action callback when clicked
  - Handle keyboard events
  - Support multiple action buttons
- Add loading/disabled states for action buttons (optional future enhancement)
- Run interaction tests - they should pass

### 9. Handle Edge Cases and Error States (Green Phase - Part 5)
- Add null checks and default values:
  - Default variant to 'info' if invalid
  - Default size to 'medium' if invalid
  - Handle missing children gracefully (render empty state or null)
  - Handle missing title gracefully
- Add prop validation with meaningful error messages
- Test with extreme content:
  - Very long text strings
  - HTML content in children
  - Special characters
  - Empty strings
- Implement graceful degradation:
  - Component works without onDismiss
  - Component works without actions
  - Component works without icon
- Run edge case tests - they should pass

### 10. Performance Optimization
- Verify React.memo prevents unnecessary re-renders
- Ensure all callbacks are stable with useCallback:
  - Dismiss handler
  - Action handlers
  - Any other event handlers
- Memoize expensive computations with useMemo:
  - ClassName combinations
  - Icon selection logic
- Add performance budget tests:
  - Render time < 16ms (60 FPS)
  - Re-render time < 10ms
- Profile with React DevTools
- Optimize any bottlenecks found
- Verify bundle size contribution < 20KB

### 11. Write Comprehensive JSDoc Documentation
- Add JSDoc to InformationalText component:
  - Description of purpose and use cases
  - @example showing basic usage (info message)
  - @example showing dismissible warning
  - @example showing error with actions
  - @example showing success with custom icon
  - @param descriptions for all props (variant, size, title, children, icon, onDismiss, actions, className, etc.)
  - @returns description
  - @remarks for best practices and accessibility notes
- Add JSDoc to all exported types and interfaces
- Add JSDoc to icon components
- Add inline comments explaining:
  - ARIA role logic
  - Variant-to-icon mapping
  - Complex conditional rendering
  - Performance optimizations

### 12. Create Component README
- Create `README.md` with:
  - **Overview**: What the component does and when to use it
  - **Installation**: Import statement and setup
  - **Basic Usage**: Simple examples for each variant
  - **API Reference**:
    - Props table with name, type, default, description
    - Variant options with visual examples
    - Size options
  - **Advanced Usage**:
    - Custom icons
    - Action buttons
    - Dismissible messages
    - Combining multiple props
  - **Accessibility**:
    - ARIA roles and attributes used
    - Keyboard support
    - Screen reader behavior
    - Color contrast information
  - **Styling**:
    - CSS Modules usage
    - Custom className support
    - Theme customization (future)
  - **Best Practices**:
    - When to use each variant
    - Error message guidelines
    - Action button recommendations
  - **Performance**:
    - Bundle size
    - Render performance
    - Optimization tips
  - **Browser Support**:
    - Modern browsers (ES2020+)
    - React 18+
  - **Testing**:
    - How to test components using InformationalText
    - Mock examples
  - **Migration Notes**: N/A (new component)
  - **Changelog**: Initial version

### 13. Update Export Files
- Update `InformationalText/index.ts`:
  - Export InformationalText component (named export)
  - Export InformationalTextProps type
  - Export InformationalTextAction type
  - Export InformationalTextVariant type
  - Export InformationalTextSize type
  - Export InformationalTextPropsSchema (Zod schema)
- Update `molecules/index.ts` (if exists):
  - Add `export * from './InformationalText'`
- Update `components/src/index.ts`:
  - Add `export * from './molecules/InformationalText'`
- Verify tree-shaking works with named exports
- Test imports from consuming code

### 14. Update Molecules Documentation
- Update `molecules/README.md`:
  - Add InformationalText to list of molecule components
  - Brief description and link to component README
  - Add to component index/table of contents

### 15. Final Testing and Quality Assurance
- Run full test suite: `npm run test`
  - Verify all tests pass
  - Verify >90% code coverage achieved
  - No flaky or skipped tests
- Run accessibility audit: `npm run test -- InformationalText.a11y`
  - Zero axe violations
  - All ARIA attributes correct
- Run type checking: `npm run typecheck`
  - No TypeScript errors
  - Strict mode compliance
- Run build: `npm run build`
  - Build succeeds without warnings
  - Verify component is included in bundle
  - Check bundle size contribution
- Manual testing checklist:
  - Test all variants (info, warning, success, error)
  - Test all sizes (small, medium, large)
  - Test with and without title
  - Test with and without custom icon
  - Test dismiss functionality
  - Test action buttons
  - Test keyboard navigation (Tab, Enter, Space, Escape)
  - Test with screen reader (verify announcements)
  - Test responsive behavior (mobile, tablet, desktop)
  - Test with very long content
  - Test with no content (edge case)

### 16. Code Review and Refactoring (Refactor Phase of TDD)
- Review code against The Ten Commandments of Architecture:
  1. Self-documenting code ✓
  2. Single source of truth ✓
  3. Test every path ✓
  4. Respect the type system ✓
  5. Embrace immutability ✓
  6. Separate concerns ✓
  7. Handle errors gracefully ✓
  8. Optimize for change ✓
  9. Measure everything ✓
  10. Document intent, not implementation ✓
- Verify all functions are <20 lines
- Check for magic numbers (all values should be named constants)
- Ensure proper error handling
- Verify immutability (no mutations)
- Check single responsibility principle
- Refactor any code smells while keeping tests green
- Update documentation if refactoring changes behavior
- Run tests after each refactoring to ensure they stay green

### 17. Performance Benchmarking
- Create performance tests:
  - Measure initial render time
  - Measure re-render time with prop changes
  - Test with 10, 50, 100 instances on page
  - Memory leak test (mount/unmount cycles)
- Document performance benchmarks in tests
- Verify performance budgets met:
  - Initial render < 16ms
  - Re-render < 10ms
  - Bundle size < 20KB
  - No memory leaks

### 18. Validation and Sign-off
- Run all validation commands (see Validation Commands section)
- Create a test preview page (optional, for visual verification):
  - Create `app/test-harness/previews/informational-text-preview.html`
  - Show all variants and sizes
  - Demonstrate dismiss functionality
  - Demonstrate action buttons
  - Test responsive behavior
- Document completion:
  - All acceptance criteria met
  - All tests passing
  - Documentation complete
  - Code reviewed and approved
  - Ready for island mounting (future task)

## Testing Strategy

### Unit Tests
**Target Coverage**: >90%

**Test Categories**:
1. **Rendering Tests** (15-20 tests)
   - Default props render correctly
   - Custom props are applied
   - All variants render correctly (info, warning, success, error)
   - All sizes render correctly (small, medium, large)
   - Title renders when provided
   - Children render correctly
   - Custom icon renders when provided
   - Default icons render for each variant
   - Action buttons render when provided
   - Dismiss button renders when onDismiss provided
   - Dismiss button does not render without onDismiss
   - Custom className is applied
   - Multiple action buttons render
   - Complex nested children render
   - Empty state handling

2. **Interaction Tests** (10-15 tests)
   - onDismiss called when dismiss button clicked
   - Action callback called when action button clicked
   - Multiple action buttons work independently
   - Keyboard Enter activates dismiss button
   - Keyboard Space activates dismiss button
   - Keyboard Enter activates action buttons
   - Keyboard Space activates action buttons
   - Keyboard Escape dismisses (if implemented)
   - Tab order is correct
   - Focus management after dismiss
   - Rapid dismiss clicks handled gracefully
   - Click events don't bubble incorrectly

3. **Variant Behavior Tests** (8-12 tests)
   - Info variant uses correct icon
   - Warning variant uses correct icon
   - Success variant uses correct icon
   - Error variant uses correct icon
   - Info variant has correct ARIA role
   - Warning variant has correct ARIA role
   - Success variant has correct ARIA role
   - Error variant has correct ARIA role
   - Variant styles applied correctly
   - Invalid variant defaults to info

4. **Edge Cases Tests** (10-15 tests)
   - Null children handled gracefully
   - Undefined children handled gracefully
   - Empty string children handled
   - Missing title handled gracefully
   - Invalid variant value handled
   - Invalid size value handled
   - Very long content doesn't break layout
   - Special characters in content handled
   - HTML content in children handled safely
   - Missing onDismiss handled
   - Missing actions handled
   - Missing icon handled
   - Component unmounts cleanly
   - Multiple instances don't interfere

5. **Type Validation Tests** (5-8 tests)
   - Zod schema validates valid props
   - Zod schema rejects invalid props
   - TypeScript types match Zod schema
   - Props with optional fields validated correctly
   - Actions array validates correctly

### Integration Tests
**Test Scenarios**:
1. Complete dismiss flow (render → click dismiss → component removed)
2. Complete action flow (render → click action → callback fired)
3. Multiple components on same page don't interfere
4. Component with all props works together correctly
5. Variant changes update correctly
6. Size changes update correctly

### Accessibility Tests
**WCAG 2.1 AA Compliance**:
1. **Automated Tests (jest-axe)**:
   - No violations for info variant
   - No violations for warning variant
   - No violations for success variant
   - No violations for error variant
   - No violations for all sizes
   - No violations with action buttons
   - No violations with dismiss button

2. **Manual Accessibility Tests** (documented in test file):
   - ARIA role correct for each variant (`role="alert"` for error/warning, `role="status"` for info/success)
   - ARIA live region attributes correct
   - Dismiss button has proper aria-label
   - Action buttons have proper aria-labels or text
   - Icon has aria-hidden="true" (since text is present)
   - Tab order is logical
   - Keyboard navigation works (Tab, Enter, Space)
   - Focus indicators visible (>= 2px, high contrast)
   - Color contrast ratios meet AA standards:
     - Normal text: 4.5:1 minimum
     - Large text (>= 18pt or 14pt bold): 3:1 minimum
     - UI components and focus indicators: 3:1 minimum
   - Touch targets >= 44x44px
   - Screen reader announcements verified

3. **Keyboard Navigation Tests**:
   - Tab moves to action buttons
   - Tab moves to dismiss button
   - Enter activates buttons
   - Space activates buttons
   - Escape dismisses (if implemented)
   - Focus trap not created
   - Focus visible at all times

### Performance Tests
1. **Render Performance**:
   - Initial render < 16ms (60 FPS)
   - Re-render on prop change < 10ms
   - 100 instances render < 1000ms
   - No unnecessary re-renders (React.memo working)

2. **Memory Tests**:
   - No memory leaks on mount/unmount
   - Event listeners cleaned up properly
   - No retained references after unmount

3. **Bundle Size**:
   - Component contribution < 20KB gzipped
   - Tree-shaking works correctly
   - No unused code in bundle

## Acceptance Criteria

### Functional Requirements
- [ ] Component renders with default props (variant='info', size='medium')
- [ ] Component supports all variants: info, warning, success, error
- [ ] Component supports all sizes: small, medium, large
- [ ] Component displays title when provided
- [ ] Component displays children content
- [ ] Component displays default icon for each variant
- [ ] Component displays custom icon when provided
- [ ] Component renders action buttons when provided
- [ ] Component renders dismiss button when onDismiss provided
- [ ] Component does not render dismiss button without onDismiss
- [ ] Dismiss button calls onDismiss callback when clicked
- [ ] Action buttons call their callbacks when clicked
- [ ] Component applies custom className
- [ ] Component supports multiple action buttons
- [ ] Component handles long content without breaking layout

### Technical Requirements
- [ ] Component uses CSS Modules (InformationalText.module.css)
- [ ] All props validated with Zod schemas at runtime
- [ ] TypeScript types inferred from Zod schemas
- [ ] Component wrapped with React.memo
- [ ] Event handlers stabilized with useCallback
- [ ] Computed values memoized with useMemo
- [ ] No inline styles or global CSS classes
- [ ] Component exports follow ESM standards (named exports)
- [ ] Tree-shaking compatible
- [ ] No TypeScript errors in strict mode
- [ ] Bundle size contribution < 20KB gzipped

### Testing Requirements
- [ ] Unit test coverage >90%
- [ ] All rendering paths tested
- [ ] All user interactions tested
- [ ] All variants tested
- [ ] All sizes tested
- [ ] All edge cases tested
- [ ] Accessibility tests pass with zero violations
- [ ] Performance benchmarks included
- [ ] No flaky or skipped tests
- [ ] Tests run in < 5 seconds

### Accessibility Requirements (WCAG 2.1 AA)
- [ ] Correct ARIA role for each variant (alert or status)
- [ ] ARIA live region attributes correct
- [ ] Dismiss button has descriptive aria-label
- [ ] Action buttons have descriptive labels
- [ ] Icon has aria-hidden (since text is present)
- [ ] Keyboard navigation works (Tab, Enter, Space)
- [ ] Focus indicators visible (>= 2px, high contrast)
- [ ] Color contrast ratios meet AA standards (4.5:1 for normal text, 3:1 for large text)
- [ ] Touch targets minimum 44x44px
- [ ] No axe-core violations
- [ ] Screen reader compatible

### Documentation Requirements
- [ ] JSDoc on InformationalText component with examples
- [ ] JSDoc on all exported types
- [ ] README.md with API reference
- [ ] Usage examples (basic and advanced)
- [ ] Accessibility guidelines documented
- [ ] Best practices documented
- [ ] Props documented with types and descriptions
- [ ] Browser support documented

### Code Quality Requirements
- [ ] No TypeScript errors (`npm run typecheck` passes)
- [ ] No ESLint errors or warnings
- [ ] No console.logs or debugging code
- [ ] All functions <20 lines
- [ ] No magic numbers (named constants only)
- [ ] Proper error handling
- [ ] Immutability maintained (no mutations)
- [ ] Single responsibility principle followed
- [ ] Follows all Ten Commandments of Architecture

### Performance Requirements
- [ ] Initial render < 16ms (60 FPS)
- [ ] Re-render < 10ms
- [ ] No memory leaks
- [ ] Bundle size < 20KB gzipped
- [ ] No unnecessary re-renders (React.memo working)
- [ ] Event listeners cleaned up properly

## Validation Commands

Execute these commands to validate the feature is complete:

### 1. Type Checking
```bash
cd app/split-lease/components
npm run typecheck
```
**Expected**: Zero TypeScript errors

### 2. Run All Tests
```bash
cd app/split-lease/components
npm run test
```
**Expected**: All tests pass, coverage >90%

### 3. Run Tests with Coverage Report
```bash
cd app/split-lease/components
npm run test -- --coverage
```
**Expected**:
- Lines: >90%
- Functions: >90%
- Branches: >90%
- Statements: >90%

### 4. Run Specific InformationalText Tests
```bash
cd app/split-lease/components
npm run test -- InformationalText
```
**Expected**: All InformationalText tests pass

### 5. Run Accessibility Tests Only
```bash
cd app/split-lease/components
npm run test -- InformationalText.a11y
```
**Expected**: Zero accessibility violations

### 6. Build Component Library
```bash
cd app/split-lease/components
npm run build
```
**Expected**: Build succeeds, bundle sizes within budget, no errors or warnings

### 7. Check Bundle Size
```bash
cd app/split-lease/components
npm run build
ls -lh dist/
```
**Expected**: InformationalText component contributes <20KB to bundle

### 8. Run Linter
```bash
cd app/split-lease/components
npm run lint
```
**Expected**: No ESLint errors or warnings

### 9. Manual Testing Checklist
Create a preview file for manual testing:
```html
<!-- app/test-harness/previews/informational-text-preview.html -->
<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>InformationalText Component Preview</title>
    <link rel="stylesheet" href="../../split-lease/components/dist/style.css">
</head>
<body>
    <h1>InformationalText Component Preview</h1>

    <!-- Test all variants and configurations -->

    <script crossorigin src="https://unpkg.com/react@18/umd/react.production.min.js"></script>
    <script crossorigin src="https://unpkg.com/react-dom@18/umd/react-dom.production.min.js"></script>
    <script src="../../split-lease/components/dist/split-lease-components.umd.cjs"></script>

    <script>
        // Manual test mounting code
    </script>
</body>
</html>
```

**Manual Tests**:
- [ ] Info variant displays with blue styling
- [ ] Warning variant displays with yellow/orange styling
- [ ] Success variant displays with green styling
- [ ] Error variant displays with red styling
- [ ] Small size is compact
- [ ] Medium size is standard
- [ ] Large size is generous
- [ ] Title displays when provided
- [ ] Content displays correctly
- [ ] Custom icon displays
- [ ] Default icons display for each variant
- [ ] Action buttons are clickable
- [ ] Dismiss button is clickable
- [ ] Dismiss removes component
- [ ] Keyboard Tab moves through interactive elements
- [ ] Keyboard Enter/Space activates buttons
- [ ] Focus indicators are visible
- [ ] Layout is responsive on mobile
- [ ] Long content doesn't break layout
- [ ] No console errors

## Notes

### Dependencies Required
The following dependencies should already be available or need to be added to `app/split-lease/components/package.json`:

**Already Available** (from Header/Footer work):
- vitest
- @testing-library/react
- @testing-library/user-event
- @testing-library/jest-dom
- jsdom
- jest-axe
- zod

**To Verify**:
```bash
cd app/split-lease/components
npm list vitest @testing-library/react jest-axe zod
```

If missing, install:
```bash
npm install --save-dev vitest @testing-library/react @testing-library/user-event @testing-library/jest-dom jsdom jest-axe
npm install zod
```

### CSS Modules Configuration
The vite.config.ts should already have CSS Modules configured:
```typescript
css: {
  modules: {
    localsConvention: 'camelCase',
    generateScopedName: '[name]__[local]___[hash:base64:5]',
  },
}
```

### Component Design Decisions

1. **Variant System**: Four variants (info, warning, success, error) cover most use cases without overcomplication
2. **Size System**: Three sizes (small, medium, large) provide flexibility without overwhelming users
3. **Icon Strategy**: Default icons for each variant, but allow custom icons for flexibility
4. **Dismissibility**: Optional dismiss functionality keeps the API simple
5. **Action Buttons**: Support multiple actions for complex scenarios (e.g., "Undo" + "Details")
6. **ARIA Roles**: Use appropriate roles based on severity (alert vs status) for proper screen reader behavior
7. **No Animation**: Keep initial implementation simple; add animations in future enhancement if needed
8. **No Positioning**: Component is just the message box; positioning is handled by parent container

### Performance Budget
- Component render time: <16ms (60 FPS)
- Re-render time: <10ms
- Bundle size contribution: <20KB gzipped
- Memory usage: No leaks on mount/unmount cycles
- No layout shifts during render

### Browser Support
- Modern browsers with ES2020 support
- React 18 compatible
- CSS Grid and Flexbox support required
- No IE11 support (as per project standards)

### Accessibility Considerations
- Use semantic HTML (no divs for buttons)
- Ensure sufficient color contrast for all variants
- Provide text alternatives for icons
- Support keyboard navigation fully
- Use appropriate ARIA roles and attributes
- Ensure focus management is correct
- Support screen readers with live regions
- Meet WCAG 2.1 AA standards

### Future Enhancements (Out of Scope for This Task)
- Island mount script creation (`islands/informational-text.tsx`) - separate task
- Integration into HTML pages - separate task
- Animation support (fade in/out, slide in/out)
- Auto-dismiss timer option
- Toast/notification queue system
- Dark mode support
- Advanced theming system
- Icon library integration (e.g., react-icons, lucide-react)
- Progress indicator for actions
- Expandable/collapsible content
- Rich formatting support (markdown, HTML)
- Positioning utilities (top, bottom, inline, floating)

### Breaking Changes
None - this is a new component with no prior versions.

### Related Components
- Similar in purpose to: Toast, Alert, Banner, Notice components in other systems
- Can be composed with other components: Modal, Sidebar, Card
- Complements: ErrorBoundary, LoadingSpinner

### References
- Architectural Bible: `Context/Architecture/architectural-bible.md`
- Migration Guide: `Context/Architecture/migration-guide.md`
- TDD Guide: `Context/Architecture/TDD-guide.md`
- Header Component Spec: `specs/feature-0bed8d36-update-header-esm-islands.md`
- Footer Component Spec: `specs/feature-431d9cc3-update-footer-esm-react-islands.md`
- README: `app/split-lease/README.md`
- Molecules README: `app/split-lease/components/src/molecules/README.md`

---

**Last Updated**: 2025-01-31
**Status**: Planning Complete - Ready for Implementation
**Estimated Effort**: 2-3 days
**Priority**: Medium
**Assigned To**: AI Agent (sdlc_implementor)
**Dependencies**: None (new component)
**Blocks**: None
