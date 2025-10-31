# Feature: Update Header Component to ESM + React Islands Architecture

## Metadata
adw_id: `0bed8d36`
prompt: `Lets update the Header React component to be compatible with the new ESM +React island Structure, following the prescribed principles of tidiness, test driven, easy to iterate and maintainable, clean and modular(also following the principles of Software Developer Lifecycle: Plan, Code, Test, Review, Document). Do not add mounts, Do not add, it to any pages yet, Just rebuild the component as per these pointers from local path: C:\Users\igor\My Drive (splitleaseteam@gmail.com)!Agent Context and Tools\SL1\TAC\Context\Architecture. Do not disturb any other page/component that is not the Header.`

## Feature Description
Transform the existing Header component from its current UMD-style implementation to a modern ESM + React Islands compatible architecture. This refactoring will align the Header component with the Split Lease architectural standards, implementing CSS Modules, comprehensive testing, full TypeScript type safety, and accessibility-first design. The component will be rebuilt to be self-contained, tree-shakeable, and optimized for the islands architecture pattern while maintaining all existing functionality.

## User Story
As a **frontend developer**
I want to **use a modernized Header component built with ESM + React Islands architecture**
So that **I can have a performant, type-safe, testable, and maintainable navigation component that follows Split Lease's architectural commandments and can be easily mounted as an island in HTML pages**

## Problem Statement
The current Header component (Header.tsx) exists in a legacy state that doesn't fully align with the new ESM + React Islands architecture:

1. **Styling Issues**: Uses plain CSS (Header.css) instead of scoped CSS Modules, leading to potential style conflicts and lack of type safety for style imports
2. **No Testing**: Zero test coverage - no unit tests, integration tests, or accessibility tests
3. **Missing Type Documentation**: Lacks comprehensive JSDoc comments and usage examples
4. **Non-Modular Structure**: Component structure doesn't follow the atomic design principles (atoms/molecules/organisms)
5. **Accessibility Gaps**: While some ARIA attributes exist, there's no systematic accessibility testing
6. **No Island Mount Script**: Missing the dedicated island mount script needed for the islands architecture
7. **Incomplete Index Exports**: The index.ts only exports the component, not a complete public API
8. **Performance Concerns**: No memoization, callback stability, or performance optimization
9. **Build Configuration**: The vite.config.ts doesn't include test configuration or proper ESM island build targets

## Solution Statement
Rebuild the Header component from the ground up following the ESM + React Islands architecture and TDD principles:

1. **Convert to CSS Modules**: Migrate Header.css to Header.module.css with scoped styling and TypeScript type generation
2. **Implement TDD**: Write comprehensive tests first (unit, integration, accessibility) following the Red-Green-Refactor cycle
3. **Add Full Type Safety**: Complete TypeScript interfaces, JSDoc documentation, and runtime validation where needed
4. **Optimize Performance**: Implement React.memo, useCallback, useMemo for optimal rendering
5. **Ensure Accessibility**: Full WCAG 2.1 AA compliance with jest-axe testing
6. **Create Island Mount Script**: Build dedicated island mount script (islands/header.tsx) with auto-mount capability
7. **Update Build Configuration**: Add Vitest configuration, test scripts, and proper ESM build targets
8. **Follow Atomic Design**: Properly structure component with clear separation of concerns
9. **Document Everything**: Comprehensive JSDoc, usage examples, and inline documentation

## Relevant Files

### Existing Files to Modify
- **app/split-lease/components/src/Header/Header.tsx** - Main component implementation
  - Currently: React functional component with basic TypeScript
  - Will become: Fully typed, memoized, optimized ESM component

- **app/split-lease/components/src/Header/Header.css** - Current styling
  - Currently: Global CSS file
  - Will be replaced by: CSS Modules with scoped styles

- **app/split-lease/components/src/Header/index.ts** - Component exports
  - Currently: Basic default export
  - Will become: Complete public API with named exports and type exports

- **app/split-lease/components/package.json** - Package configuration
  - Currently: Missing test dependencies and scripts
  - Will add: Vitest, Testing Library, jest-axe, and test scripts

- **app/split-lease/components/vite.config.ts** - Build configuration
  - Currently: Production build only
  - Will add: Test configuration, coverage thresholds, and island build targets

### New Files to Create

#### Test Files
- **app/split-lease/components/src/Header/Header.test.tsx** - Comprehensive unit tests
  - Rendering tests for all component states
  - User interaction tests (click, keyboard navigation, hover)
  - Accessibility tests with jest-axe
  - Edge case and error handling tests
  - Target: >90% code coverage

- **app/split-lease/components/tests/setup.ts** - Test environment setup
  - Configure Testing Library
  - Setup jest-axe
  - Mock window.matchMedia
  - Global test utilities

#### Island Mount Script
- **app/split-lease/islands/header.tsx** - Island entry point
  - Export mountHeader function
  - Parse data attributes from DOM
  - Auto-mount on DOMContentLoaded
  - Handle manual mounting with runtime props
  - Error handling for missing mount points

#### Styling
- **app/split-lease/components/src/Header/Header.module.css** - CSS Modules styling
  - Convert all classes to scoped modules
  - Maintain existing visual design
  - Add CSS custom properties for theming
  - Ensure responsive behavior preserved

#### Documentation
- **app/split-lease/components/src/Header/README.md** - Component documentation
  - API reference
  - Usage examples
  - Props documentation
  - Accessibility guidelines
  - Migration guide from old version

## Implementation Plan

### Phase 1: Foundation & Setup
Set up the testing infrastructure and build configuration to support TDD workflow and ESM islands architecture.

**Goals:**
- Enable test-driven development
- Configure build tools for ESM + Islands
- Establish quality gates

**Deliverables:**
- Test environment configured
- Build configuration updated
- Development dependencies installed

### Phase 2: Test Creation (Red Phase)
Write comprehensive failing tests that define the expected behavior of the Header component.

**Goals:**
- Define component behavior through tests
- Establish acceptance criteria
- Create safety net for refactoring

**Deliverables:**
- Complete test suite (all failing)
- Test coverage infrastructure
- Accessibility test framework

### Phase 3: Component Migration (Green Phase)
Rebuild the Header component to pass all tests while maintaining existing functionality.

**Goals:**
- Pass all tests
- Maintain feature parity
- Improve code quality

**Deliverables:**
- Migrated Header.tsx (ESM-compatible)
- CSS Modules implementation
- All tests passing

### Phase 4: Island Integration
Create the island mount script and ensure the component works in the islands architecture.

**Goals:**
- Enable island mounting
- Support both auto and manual mounting
- Handle edge cases

**Deliverables:**
- islands/header.tsx mount script
- Data attribute parsing
- Mount/unmount lifecycle handling

### Phase 5: Optimization & Documentation (Refactor Phase)
Optimize performance, complete documentation, and ensure production readiness.

**Goals:**
- Optimize performance
- Complete documentation
- Ensure production quality

**Deliverables:**
- Performance-optimized component
- Complete documentation
- Production-ready build

## Step by Step Tasks
IMPORTANT: Execute every step in order, top to bottom.

### 1. Setup Testing Infrastructure
- Install testing dependencies: `vitest`, `@testing-library/react`, `@testing-library/user-event`, `@testing-library/jest-dom`, `jsdom`, `jest-axe`
- Create `tests/setup.ts` with Testing Library configuration
- Update `vite.config.ts` with Vitest configuration including coverage thresholds (80% minimum)
- Add test scripts to `package.json`: `test`, `test:watch`, `test:coverage`, `test:ui`
- Verify test environment works with a simple smoke test

### 2. Write Rendering Tests (TDD - Red)
- Create `src/Header/Header.test.tsx`
- Write test: "should render with default props"
- Write test: "should render with custom className"
- Write test: "should render logo with correct src and alt text"
- Write test: "should render navigation links"
- Write test: "should display correct text for desktop vs mobile"
- Run tests - verify all fail (component doesn't exist yet)

### 3. Write Interaction Tests (TDD - Red)
- Write test: "should toggle mobile menu on hamburger click"
- Write test: "should open dropdown on hover"
- Write test: "should close dropdown on mouse leave"
- Write test: "should handle dropdown keyboard navigation (Arrow keys, Enter, Escape)"
- Write test: "should navigate to auth page on Sign In/Sign Up click"
- Write test: "should handle smooth scroll for anchor links"
- Write test: "should close dropdowns on outside click"
- Run tests - verify all fail

### 4. Write Accessibility Tests (TDD - Red)
- Write test: "should have no accessibility violations (jest-axe)"
- Write test: "should have proper ARIA labels on interactive elements"
- Write test: "should support keyboard-only navigation"
- Write test: "should have proper focus management"
- Write test: "should announce dropdown state changes to screen readers"
- Write test: "should have sufficient color contrast"
- Run tests - verify all fail

### 5. Write Edge Case Tests (TDD - Red)
- Write test: "should handle null/undefined logoSrc gracefully"
- Write test: "should handle missing props with sensible defaults"
- Write test: "should prevent memory leaks on unmount"
- Write test: "should handle rapid clicks without breaking"
- Write test: "should work when window.scrollTo is not available"
- Run tests - verify all fail

### 6. Create CSS Modules File
- Create `src/Header/Header.module.css`
- Convert all classes from Header.css to CSS Modules syntax
- Add TypeScript type generation for CSS Modules
- Use CSS custom properties for theming values
- Ensure all responsive breakpoints are preserved
- Remove unused styles

### 7. Rebuild Header Component (TDD - Green)
- Create new `src/Header/Header.tsx` with full TypeScript interfaces
- Add comprehensive JSDoc comments to HeaderProps interface
- Implement component with React.memo for performance
- Use useCallback for all event handlers
- Use useMemo for expensive computations
- Implement all dropdown logic with proper keyboard support
- Add mobile menu toggle functionality
- Implement smooth scroll with header offset
- Import and use CSS Modules styles
- Run tests - make rendering tests pass

### 8. Make Interaction Tests Pass
- Implement dropdown click handlers with proper state management
- Add hover event listeners with cleanup
- Implement keyboard navigation (ArrowUp, ArrowDown, Enter, Escape)
- Add outside click detection with proper event delegation
- Implement auth navigation handlers
- Add smooth scroll functionality
- Run tests - verify interaction tests pass

### 9. Make Accessibility Tests Pass
- Add proper ARIA attributes (aria-expanded, aria-haspopup, role, aria-label)
- Implement focus management for dropdowns
- Add live region for screen reader announcements
- Ensure all interactive elements are keyboard accessible
- Add proper semantic HTML (nav, header, button)
- Run jest-axe tests - fix any violations
- Run tests - verify accessibility tests pass

### 10. Make Edge Case Tests Pass
- Add null checks and default values for all props
- Implement proper cleanup in useEffect hooks
- Add debouncing for rapid interactions
- Add feature detection for scrollTo API
- Ensure no memory leaks with proper event cleanup
- Run tests - verify all edge case tests pass

### 11. Optimize Component Performance
- Verify React.memo is preventing unnecessary re-renders
- Ensure all callbacks are stable with useCallback
- Check that expensive computations are memoized
- Add performance budget tests (< 16ms render time)
- Profile component with React DevTools
- Optimize any bottlenecks found

### 12. Update Component Exports
- Update `src/Header/index.ts` with named exports
- Export HeaderProps interface for consumers
- Add JSDoc to explain public API
- Ensure tree-shaking compatibility
- Test imports work correctly

### 13. Create Island Mount Script
- Create `islands/header.tsx` file
- Implement `mountHeader(elementId, props?)` function
- Add data attribute parsing logic (data-* → camelCase props)
- Implement auto-mount on DOMContentLoaded
- Add manual mount option (data-manual-mount attribute)
- Add error handling for missing mount points
- Add cleanup/unmount capability
- Return root instance for programmatic control

### 14. Update Build Configuration for Islands
- Update `vite.config.ts` to build island entry points
- Configure separate bundle for islands/header.tsx
- Ensure ESM format for tree-shaking
- Add source maps for debugging
- Configure proper externals (React, ReactDOM)
- Test build output is correct

### 15. Create Component Documentation
- Create `src/Header/README.md`
- Document all props with types and descriptions
- Add usage examples (basic, with props, in island)
- Document accessibility features
- Add troubleshooting section
- Include migration guide from old version
- Document browser support

### 16. Final Integration Testing
- Create integration test that mounts Header as island
- Test data attribute parsing works correctly
- Test auto-mount functionality
- Test manual mount with runtime props
- Verify cleanup on unmount
- Test multiple instances on same page

### 17. Performance Testing
- Run Lighthouse audit on sample page with Header
- Verify bundle size is within budget (< 50KB for Header component)
- Check Time to Interactive impact
- Verify no layout shifts (CLS)
- Test on slow 3G connection
- Profile memory usage

### 18. Final Code Review
- Review against Architectural Bible commandments
- Verify all tests pass with >90% coverage
- Check TypeScript strict mode compliance
- Verify no console.logs or debugging code
- Ensure proper error handling throughout
- Validate JSDoc completeness
- Check code formatting and linting

## Testing Strategy

### Unit Tests
**Target Coverage: >90%**

1. **Component Rendering**
   - Default state renders correctly
   - Props are applied correctly
   - Conditional rendering (desktop vs mobile text)
   - Custom className merging
   - Logo rendering with correct attributes

2. **User Interactions**
   - Click handlers fire correctly
   - Keyboard events are handled
   - Hover states work properly
   - Focus management is correct
   - State updates trigger re-renders appropriately

3. **Business Logic**
   - Dropdown toggle logic
   - Menu state management
   - Smooth scroll calculations
   - Data attribute parsing (for island)
   - Event cleanup on unmount

### Integration Tests
**Tests that verify component interactions:**

1. **Dropdown Interaction Flow**
   - Click trigger → menu opens
   - Click outside → menu closes
   - Keyboard navigation works end-to-end
   - Multiple dropdowns work independently

2. **Responsive Behavior**
   - Desktop menu displays correctly
   - Mobile menu displays correctly
   - Hamburger toggle works
   - Breakpoint transitions are smooth

3. **Island Mounting**
   - Component mounts from HTML
   - Data attributes are parsed
   - Props override data attributes
   - Multiple instances don't conflict

### Accessibility Tests
**WCAG 2.1 AA Compliance:**

1. **Automated Testing (jest-axe)**
   - No ARIA violations
   - Proper semantic structure
   - Color contrast requirements
   - Required attributes present

2. **Keyboard Navigation**
   - Tab order is logical
   - Arrow keys navigate dropdowns
   - Escape closes menus
   - Enter activates items
   - Focus visible at all times

3. **Screen Reader Support**
   - ARIA labels are descriptive
   - State changes are announced
   - Landmarks are properly identified
   - Interactive elements have names

### Edge Cases
1. **Missing/Invalid Props**
   - Null values handled gracefully
   - Undefined values use defaults
   - Invalid types don't break component

2. **Browser Compatibility**
   - Works without scrollTo API
   - Works without IntersectionObserver
   - Handles missing DOM APIs

3. **Performance Edge Cases**
   - Rapid clicking doesn't break state
   - Multiple quick hovers don't cause issues
   - Component unmounts cleanly
   - No memory leaks

## Acceptance Criteria

### Functional Requirements
- [ ] Header renders all navigation items correctly
- [ ] Dropdowns open/close on click and hover
- [ ] Mobile menu toggles properly
- [ ] Keyboard navigation works (Tab, Arrow keys, Enter, Escape)
- [ ] Smooth scroll works for anchor links with header offset
- [ ] Sign In/Sign Up navigation functions correctly
- [ ] Logo links to home page
- [ ] All existing visual designs preserved

### Technical Requirements
- [ ] Component uses CSS Modules (Header.module.css)
- [ ] Full TypeScript type safety (no 'any' types)
- [ ] React.memo prevents unnecessary re-renders
- [ ] All callbacks are stable (useCallback)
- [ ] All expensive computations are memoized (useMemo)
- [ ] Proper cleanup in all useEffect hooks
- [ ] ESM module format with named exports
- [ ] Island mount script (islands/header.tsx) created
- [ ] Data attribute parsing works correctly
- [ ] Auto-mount and manual mount both functional

### Testing Requirements
- [ ] Unit test coverage >90%
- [ ] All rendering paths tested
- [ ] All user interactions tested
- [ ] Edge cases covered
- [ ] Accessibility tests pass (jest-axe)
- [ ] No flaky tests
- [ ] Tests run in under 5 seconds

### Documentation Requirements
- [ ] JSDoc on all exported functions/components
- [ ] Props interface fully documented
- [ ] Usage examples provided
- [ ] README.md created with API reference
- [ ] Migration guide included
- [ ] Accessibility features documented

### Performance Requirements
- [ ] Component bundle < 50KB (gzipped)
- [ ] Initial render < 16ms (60 FPS)
- [ ] No memory leaks on mount/unmount cycles
- [ ] Lighthouse performance score >90
- [ ] No layout shifts (CLS = 0)

### Build Requirements
- [ ] `npm run build` succeeds
- [ ] `npm run test` passes all tests
- [ ] `npm run test:coverage` meets thresholds
- [ ] `npm run typecheck` has no errors
- [ ] Source maps generated for debugging
- [ ] Tree-shaking works correctly

### Accessibility Requirements
- [ ] WCAG 2.1 AA compliant
- [ ] No automated accessibility violations (jest-axe)
- [ ] Keyboard-only navigation fully functional
- [ ] Screen reader compatible
- [ ] Focus indicators visible
- [ ] Color contrast ratios meet standards
- [ ] Semantic HTML used throughout

### Code Quality Requirements
- [ ] Follows all 10 Architectural Commandments
- [ ] No console.logs or debugging code
- [ ] No magic numbers (all values named)
- [ ] Single Responsibility Principle followed
- [ ] DRY principle followed
- [ ] Error handling comprehensive
- [ ] Comments explain "why" not "what"

## Validation Commands
Execute these commands to validate the feature is complete:

### 1. Install Dependencies
```bash
cd app/split-lease/components
npm install
```

### 2. Run Type Checking
```bash
npm run typecheck
```
**Expected:** No TypeScript errors, all types valid

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
- Branch coverage >80%
- Function coverage >90%
- Statement coverage >90%

### 5. Run Build
```bash
npm run build
```
**Expected:**
- Build succeeds
- dist/ directory contains:
  - split-lease-components.es.js (ESM bundle)
  - split-lease-components.umd.js (UMD bundle)
  - index.d.ts (TypeScript definitions)
  - islands/header.js (Island mount script)
- No build warnings
- Bundle sizes within limits

### 6. Verify Bundle Size
```bash
ls -lh dist/split-lease-components.es.js
```
**Expected:** Header component contribution < 50KB gzipped

### 7. Run Accessibility Tests
```bash
npm run test -- Header.test.tsx --coverage
```
**Expected:**
- All jest-axe tests pass
- No accessibility violations
- Coverage >90%

### 8. Visual Verification
```bash
npm run dev
```
Then open browser to component preview
**Expected:**
- Header renders correctly
- All interactions work
- Responsive behavior intact
- No console errors

### 9. Island Mount Test
Create a test HTML file:
```html
<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <title>Header Island Test</title>
    <link rel="stylesheet" href="/dist/split-lease-components.css">
</head>
<body>
    <div id="site-header"
         data-logo-src="/logo.png"
         data-explore-href="/search"></div>

    <script type="module">
        import { mountHeader } from '/dist/islands/header.js';
        // Auto-mount should work
    </script>
</body>
</html>
```
**Expected:**
- Header mounts automatically
- Data attributes parsed correctly
- All functionality works
- No console errors

### 10. Performance Validation
```bash
npm run test:performance
```
**Expected:**
- Initial render < 16ms
- No memory leaks detected
- Re-renders are minimal

## Notes

### Technical Decisions

1. **CSS Modules over Styled-Components**: While the project uses styled-components for other components, CSS Modules are chosen for Header to demonstrate the architectural flexibility and because:
   - Better performance (no runtime CSS-in-JS)
   - Smaller bundle size
   - More familiar syntax
   - Better integration with Vite

2. **No Breaking Changes**: All existing functionality must be preserved. The refactoring is internal only - external API remains compatible.

3. **Test-First Approach**: Strictly following TDD (Red-Green-Refactor) to ensure:
   - Tests drive design
   - Complete coverage from start
   - No untested code paths
   - Refactoring safety

4. **Island Architecture Priority**: The component must work perfectly in the islands architecture:
   - Self-contained (no external dependencies beyond React)
   - Easy to mount from vanilla HTML
   - Data attribute configuration
   - Multiple instances support

### Dependencies to Add
Add to `package.json` devDependencies:
```json
{
  "devDependencies": {
    "vitest": "^1.0.4",
    "@testing-library/react": "^14.1.2",
    "@testing-library/user-event": "^14.5.1",
    "@testing-library/jest-dom": "^6.1.5",
    "jsdom": "^23.0.1",
    "jest-axe": "^8.0.0",
    "@vitest/ui": "^1.0.4"
  }
}
```

### Build Configuration Notes
The vite.config.ts must be updated to:
1. Add test configuration with Vitest
2. Configure coverage thresholds
3. Add island entry points to build.lib.entry
4. Ensure CSS Modules type generation

### Future Enhancements
Items for future iterations (not in this scope):
- Storybook stories for visual testing
- Animation enhancements with framer-motion
- Dark mode support
- Customizable theme system
- Performance monitoring integration
- A/B testing framework integration

### Risk Mitigation
1. **Backward Compatibility**: Maintain exact same props interface
2. **Visual Regression**: Manual visual testing required
3. **Browser Support**: Test in IE11 if required, otherwise modern browsers only
4. **Performance**: Continuously monitor bundle size and render performance

### Success Metrics
- Zero test failures
- >90% code coverage
- Bundle size < 50KB
- No accessibility violations
- TypeScript strict mode compliance
- All acceptance criteria met

---

**Created:** 2025-01-31
**Status:** Ready for Implementation
**Estimated Effort:** 2-3 days
**Priority:** High
**Assigned To:** AI Agent (sdlc_implementor)
