# Feature: Update Search Schedule Selector for ESM + React Islands Architecture

## Metadata
adw_id: `d860d575`
prompt: `Lets update the Search Schedule Selector React component to be compatible with the new ESM +React island Structure, following the prescribed principles of tidiness, test driven, easy to iterate and maintainable, clean and modular(also following the principles of Software Developer Lifecycle: Plan, Code, Test, Review, Document). Do not add mounts, Do not add , it to any pages yet, Just rebuild the component as per these pointers from local path: C:\Users\igor\My Drive (splitleaseteam@gmail.com)!Agent Context and Tools\SL1\TAC\Context\Architecture. Do not disturb any other page/component that is not the Search Schedule Selector.`

## Feature Description
Update the existing SearchScheduleSelector component to be fully compatible with the new ESM + React Islands architecture. The component currently uses styled-components and framer-motion, which need to be replaced with CSS Modules for styling to align with the architectural standards. The component must be rebuilt following the Ten Commandments of Architecture, maintain TDD principles, achieve >90% test coverage, and be ready for island mounting without actually creating the mount scripts or integrating with pages.

This refactor ensures the component is:
- **Tidy**: Clean code structure with proper separation of concerns
- **Test-Driven**: Comprehensive test coverage written before implementation
- **Easy to Iterate**: Modular design allows for easy modifications
- **Maintainable**: Self-documenting code with clear patterns
- **Clean and Modular**: Following SOLID principles and architectural guidelines

## User Story
As a developer working on the SplitLease platform
I want the SearchScheduleSelector component to be compatible with the ESM + React Islands architecture
So that it can be seamlessly integrated into pages as an island without architectural conflicts, and so that it follows our team's architectural standards for maintainability and testability.

## Problem Statement
The current SearchScheduleSelector component:
1. Uses styled-components which conflicts with the CSS Modules standard in the new architecture
2. Uses framer-motion directly in styled components, coupling animation with styling
3. Lacks comprehensive test coverage (no test files found)
4. Does not follow the prescribed component template structure
5. Has inline styles and animations that should be in CSS Modules
6. Is not structured for easy mounting as a React island
7. Does not fully comply with the Ten Commandments of Architecture (self-documenting code, type safety, immutability, etc.)

## Solution Statement
Rebuild the SearchScheduleSelector component from the ground up following TDD methodology:
1. **Write comprehensive tests first** - Create test file with all scenarios before implementation
2. **Replace styled-components with CSS Modules** - Convert all styling to scoped CSS Modules
3. **Separate animation concerns** - Move framer-motion animations to component logic
4. **Follow component template** - Use the prescribed React component structure from architectural guidelines
5. **Improve type safety** - Enhance TypeScript interfaces and add runtime validation
6. **Add JSDoc documentation** - Comprehensive inline documentation for all functions
7. **Ensure immutability** - All state transformations follow immutable patterns
8. **Optimize performance** - Add memoization and useCallback for expensive operations
9. **Enhance accessibility** - Full ARIA support and keyboard navigation
10. **Achieve >90% test coverage** - Unit tests for all logic paths and edge cases

## Relevant Files

### Existing Files to Modify
- **`app/split-lease/components/src/SearchScheduleSelector/SearchScheduleSelector.tsx`**
  - Main component file - needs complete refactor to follow architectural standards
  - Remove styled-components, implement with plain JSX and CSS Modules
  - Add proper memoization, useCallback, useMemo hooks
  - Follow component template structure

- **`app/split-lease/components/src/SearchScheduleSelector/SearchScheduleSelector.styles.ts`**
  - Currently styled-components file - will be deleted
  - Will be replaced with CSS Module file

- **`app/split-lease/components/src/SearchScheduleSelector/types.ts`**
  - Type definitions - will be enhanced with better documentation
  - Add Zod schemas for runtime validation
  - Ensure all types are properly exported

### New Files to Create

#### Core Component Files
- **`app/split-lease/components/src/SearchScheduleSelector/SearchScheduleSelector.module.css`**
  - CSS Modules stylesheet replacing styled-components
  - Scoped styles for all component elements
  - Includes animations using CSS @keyframes
  - Responsive design with media queries

- **`app/split-lease/components/src/SearchScheduleSelector/SearchScheduleSelector.test.tsx`**
  - Comprehensive unit tests using Vitest and React Testing Library
  - Test all rendering scenarios, interactions, validation, accessibility
  - Achieve >90% code coverage
  - Follow TDD patterns from the guide

- **`app/split-lease/components/src/SearchScheduleSelector/index.ts`**
  - Barrel export file for clean imports
  - Export component and types

#### Documentation Files
- **`app/split-lease/components/src/SearchScheduleSelector/README.md`**
  - Component usage documentation
  - Props API reference
  - Examples and best practices
  - Integration guidelines for islands

## Implementation Plan

### Phase 1: Foundation and Testing Infrastructure
Set up the testing infrastructure and write comprehensive tests following TDD principles. This phase establishes the "contract" for how the component should behave.

**Key Activities:**
- Install and configure testing dependencies (Vitest, Testing Library, jest-axe)
- Write comprehensive test suite before implementation
- Define all test scenarios for component behavior
- Establish accessibility testing baseline

### Phase 2: Component Structure Refactor
Transform the component to follow the prescribed architectural patterns, replacing styled-components with CSS Modules.

**Key Activities:**
- Create CSS Modules stylesheet with all styles
- Refactor component JSX to use CSS Modules classes
- Remove styled-components and framer-motion dependencies from component
- Implement proper React patterns (memo, useCallback, useMemo)

### Phase 3: Enhanced Type Safety and Validation
Improve TypeScript types and add runtime validation following architectural guidelines.

**Key Activities:**
- Enhance TypeScript interfaces with comprehensive JSDoc
- Add Zod schemas for runtime validation
- Implement validation at component boundaries
- Add type guards where necessary

### Phase 4: Performance and Accessibility
Optimize component performance and ensure full accessibility compliance.

**Key Activities:**
- Implement memoization for expensive operations
- Add useCallback for stable function references
- Enhance ARIA attributes and keyboard navigation
- Test with screen readers and accessibility tools

## Step by Step Tasks

### 1. Setup Testing Infrastructure
- Install test dependencies: `@testing-library/react`, `@testing-library/user-event`, `@testing-library/jest-dom`, `vitest`, `jsdom`, `jest-axe`
- Create test configuration in `vite.config.ts` for component testing
- Set up test setup file with jsdom and jest-axe configuration
- Verify test runner works with a simple smoke test

### 2. Write Comprehensive Tests (TDD - RED Phase)
- Create `SearchScheduleSelector.test.tsx` with full test suite:
  - **Rendering Tests**: Default props, custom className, initial selection, empty state
  - **Interaction Tests**: Click to toggle days, drag selection, keyboard navigation, reset button
  - **Validation Tests**: Minimum days enforcement, maximum days enforcement, contiguous days validation
  - **Accessibility Tests**: No axe violations, ARIA attributes, screen reader announcements, keyboard focus management
  - **Edge Cases**: Rapid clicks, null/undefined props, week-wrapping selection (Sunday-Monday)
  - **Performance Tests**: Render time under threshold, no memory leaks
- Run tests and verify they all fail (RED phase complete)
- Document expected behaviors in test descriptions

### 3. Create CSS Modules Stylesheet
- Create `SearchScheduleSelector.module.css` with:
  - Container styles (gradient background, border-radius, shadow)
  - SelectorRow layout (flexbox)
  - CalendarIcon styles
  - DaysGrid (CSS Grid, 7 columns)
  - DayCell styles with states (default, selected, error, dragging, hover, focus)
  - CSS animations (@keyframes for pulse, shake, transitions)
  - InfoContainer and InfoText styles
  - ResetButton styles
  - ErrorPopup styles (positioning, animation)
  - Responsive media queries for mobile/tablet
- Use CSS variables for colors, spacing, timing
- Ensure all animations use CSS @keyframes instead of JS

### 4. Refactor Component Implementation (TDD - GREEN Phase)
- Update `SearchScheduleSelector.tsx`:
  - Import CSS Modules: `import styles from './SearchScheduleSelector.module.css'`
  - Remove all styled-components imports
  - Replace styled components with JSX elements using CSS Modules classes
  - Implement memo for component optimization
  - Implement useCallback for all event handlers
  - Implement useMemo for expensive computations
  - Add framer-motion as prop-based animations (not styled)
  - Ensure component follows template structure
  - Add comprehensive JSDoc comments to all functions
  - Implement immutable state transformations
- Run tests - aim for GREEN phase (all tests passing)

### 5. Enhance Type Definitions
- Update `types.ts`:
  - Add comprehensive JSDoc to all interfaces
  - Create Zod schemas for runtime validation:
    - `DaySchema`
    - `ListingSchema`
    - `SearchScheduleSelectorPropsSchema`
    - `ValidationResultSchema`
  - Export schemas alongside TypeScript types
  - Add type guards for common checks
  - Document all edge cases in comments

### 6. Create Barrel Export
- Create `index.ts`:
  - Export SearchScheduleSelector component
  - Export all TypeScript types
  - Export Zod schemas
  - Add file-level JSDoc with usage examples

### 7. Remove Styled-Components File
- Delete `SearchScheduleSelector.styles.ts` (no longer needed)
- Verify no imports reference this file
- Run build to ensure no broken references

### 8. Refactor and Optimize (TDD - REFACTOR Phase)
- Review component code for improvements:
  - Extract magic numbers to named constants
  - Simplify complex logic into helper functions
  - Optimize re-render performance
  - Improve naming for clarity
  - Add performance marks for critical operations
- Ensure all tests still pass after refactoring
- Run coverage report and aim for >90%

### 9. Add Documentation
- Create `README.md`:
  - Component overview and purpose
  - Installation instructions
  - Usage examples with code snippets
  - Props API documentation with examples
  - Accessibility features
  - Performance considerations
  - Common patterns and best practices
  - Troubleshooting guide
  - Integration guide for islands (without implementing)

### 10. Accessibility Audit
- Run automated accessibility tests with jest-axe
- Test keyboard navigation thoroughly
- Test with screen reader (NVDA or JAWS simulation)
- Verify ARIA attributes are correct
- Test focus management
- Ensure color contrast meets WCAG 2.1 AA
- Document accessibility features in README

### 11. Performance Optimization
- Add React.memo with custom comparison function if needed
- Verify useCallback and useMemo are used appropriately
- Test component render performance with 1000+ renders
- Check for memory leaks with repeated mount/unmount
- Add performance benchmarks to test suite
- Document performance characteristics

### 12. Final Validation
- Run full test suite and verify >90% coverage
- Run TypeScript type checking with no errors
- Build component and verify output
- Review code against Ten Commandments checklist
- Verify no console errors or warnings
- Test in different browsers (Chrome, Firefox, Safari, Edge)
- Validate responsive design at different screen sizes

## Testing Strategy

### Unit Tests
**Component Rendering (15 tests)**
- Renders with default props
- Applies custom className
- Renders with initial selection
- Shows calendar icon
- Displays all 7 day buttons
- Renders info container
- Shows reset button when days selected
- Hides reset button when no selection
- Shows error popup when validation fails
- Hides error popup after timeout
- Renders in loading state
- Handles missing optional props
- Renders with different minDays/maxDays
- Renders with requireContiguous enabled/disabled
- Snapshot test for default state

**User Interactions (20 tests)**
- Toggle day selection on click
- Toggle day deselection on second click
- Drag selection from Monday to Friday
- Drag selection wrapping around week
- Keyboard navigation with Tab
- Keyboard selection with Enter key
- Keyboard selection with Space key
- Reset button clears selection
- Selection change callback fires with correct data
- Error callback fires on validation failure
- Rapid clicks don't cause issues
- Click during drag doesn't break state
- Mouse leave during drag completes selection
- Touch events work on mobile
- Double click doesn't cause issues
- Click on disabled day (if implemented)
- Hover effects apply correctly
- Focus effects apply correctly
- Blur removes focus styles
- Selection persists across re-renders

**Validation Logic (12 tests)**
- Validates minimum nights requirement
- Validates maximum nights requirement
- Validates contiguous days requirement
- Allows week-wrapping contiguous selection
- Rejects non-contiguous when required
- Displays correct error message for min days
- Displays correct error message for max days
- Displays correct error message for contiguous
- Error clears after valid selection
- Validation timeout works correctly
- Multiple validation errors show last one
- Validation respects prop changes

**Accessibility (10 tests)**
- No axe violations in default state
- No axe violations with selection
- No axe violations with error
- ARIA labels present on day buttons
- ARIA pressed state updates correctly
- Screen reader announcements work
- Keyboard focus order is logical
- Focus trap works when error shown
- High contrast mode support
- Reduced motion preference respected

**Edge Cases (8 tests)**
- Handles null listing prop
- Handles undefined callback props
- Handles extremely large minDays
- Handles minDays > maxDays (invalid config)
- Handles initialSelection with invalid indices
- Handles rapid prop changes
- Handles component unmount during async operation
- Memory doesn't leak on mount/unmount cycle

**Performance (5 tests)**
- Renders in under 16ms
- Re-renders only when props change
- Handles 1000 sequential clicks
- No memory growth after 100 mount/unmount cycles
- Drag operation completes in under 100ms

### Integration Tests
- Integration with form validation libraries
- Integration with state management (if applicable)
- Integration with API calls for listing counts (mock)

### Edge Cases
- **Week Wrapping**: Sunday + Monday selection should be valid contiguous
- **Timezone Issues**: Ensure day indices are consistent
- **Prop Changes**: Component updates correctly when props change mid-interaction
- **Async State**: Component handles async validation without race conditions
- **Error Recovery**: Component recovers gracefully from error states
- **Browser Compatibility**: Works in all modern browsers
- **Mobile Touch**: Touch events work on mobile devices
- **Rapid Interactions**: No state corruption from rapid user actions

## Acceptance Criteria
- [ ] All styled-components code removed, replaced with CSS Modules
- [ ] Component follows prescribed architectural template structure
- [ ] All tests pass with >90% code coverage
- [ ] No TypeScript errors in strict mode
- [ ] Component is memoized and optimized with useCallback/useMemo
- [ ] All functions have comprehensive JSDoc documentation
- [ ] Accessibility audit passes with jest-axe (no violations)
- [ ] Keyboard navigation fully functional
- [ ] ARIA attributes properly implemented
- [ ] Component supports all required props
- [ ] Validation logic works correctly for all edge cases
- [ ] Error messages display correctly and timeout properly
- [ ] Drag selection works smoothly without glitches
- [ ] Week-wrapping selection (Sunday-Monday) works correctly
- [ ] Component is responsive on mobile, tablet, and desktop
- [ ] CSS animations work smoothly (no jank)
- [ ] Component renders in under 16ms on average hardware
- [ ] README.md documentation is comprehensive
- [ ] Component can be imported and used in isolation
- [ ] No dependencies on styled-components or styled-component patterns
- [ ] Code follows immutability principles (no mutations)
- [ ] Error handling is comprehensive with user-friendly messages
- [ ] Component is ready for island mounting (without mount script)

## Validation Commands
Execute these commands to validate the feature is complete:

### 1. Type Checking
```bash
cd app/split-lease/components
npm run typecheck
```
**Expected Result**: No TypeScript errors, all types resolve correctly

### 2. Run Tests
```bash
npm run test -- SearchScheduleSelector
```
**Expected Result**: All tests pass, coverage >90%

### 3. Run Tests with Coverage
```bash
npm run test:coverage -- SearchScheduleSelector
```
**Expected Result**:
- Lines: >90%
- Functions: >90%
- Branches: >90%
- Statements: >90%

### 4. Build Component
```bash
npm run build
```
**Expected Result**: Clean build with no errors, component bundle created

### 5. Verify CSS Modules Output
```bash
ls dist/**/*.css
```
**Expected Result**: CSS file present in dist folder

### 6. Check for Styled-Components Removal
```bash
grep -r "styled-components" src/SearchScheduleSelector/
```
**Expected Result**: No matches (styled-components completely removed)

### 7. Verify Exports
```bash
node -e "import('./dist/split-lease-components.es.js').then(m => console.log(Object.keys(m)))"
```
**Expected Result**: SearchScheduleSelector is exported

### 8. Accessibility Audit
```bash
npm run test -- SearchScheduleSelector --grep="accessibility"
```
**Expected Result**: All accessibility tests pass

### 9. Performance Benchmarks
```bash
npm run test -- SearchScheduleSelector --grep="performance"
```
**Expected Result**: All performance tests pass under threshold

### 10. Visual Inspection
Open `app/split-lease/components/src/SearchScheduleSelector/README.md` and verify:
- [ ] Examples are clear and comprehensive
- [ ] Props are fully documented
- [ ] Usage patterns are explained
- [ ] Integration guidelines are present

## Notes

### Dependencies to Install
Add these devDependencies to `app/split-lease/components/package.json`:
```bash
npm install --save-dev vitest jsdom @testing-library/react @testing-library/user-event @testing-library/jest-dom jest-axe happy-dom
```

### Update vite.config.ts
Add test configuration:
```typescript
import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

export default defineConfig({
  plugins: [react()],
  test: {
    globals: true,
    environment: 'jsdom',
    setupFiles: './tests/setup.ts',
    coverage: {
      provider: 'v8',
      reporter: ['text', 'json', 'html', 'lcov'],
      exclude: [
        'node_modules/',
        'tests/',
        '*.config.ts',
        '**/*.d.ts',
        '**/index.ts'
      ],
      thresholds: {
        lines: 90,
        functions: 90,
        branches: 90,
        statements: 90
      }
    }
  }
});
```

### Create tests/setup.ts
```typescript
import '@testing-library/jest-dom';
import { expect, afterEach } from 'vitest';
import { cleanup } from '@testing-library/react';
import * as matchers from 'jest-axe/dist/to-have-no-violations';

expect.extend(matchers);

afterEach(() => {
  cleanup();
});
```

### Package.json Scripts
Update package.json with test scripts:
```json
{
  "scripts": {
    "test": "vitest",
    "test:ui": "vitest --ui",
    "test:coverage": "vitest --coverage",
    "test:watch": "vitest --watch"
  }
}
```

### Future Considerations
- **Island Mount Script**: After this refactor, create `islands/search-schedule-selector.tsx` for mounting
- **API Integration**: Replace mock listing counts with real API calls
- **Advanced Animations**: Consider more sophisticated animations with framer-motion
- **State Persistence**: Add localStorage support for saving user's last selection
- **Analytics**: Add event tracking for user interactions
- **Performance Monitoring**: Add real-user monitoring for component performance
- **Storybook Stories**: Create Storybook stories for all component states
- **Visual Regression Tests**: Add visual regression testing with Percy or Chromatic

### Architectural Compliance Checklist
Ensure component follows all Ten Commandments:
- [x] **Write Self-Documenting Code**: JSDoc on all functions, clear naming
- [x] **Single Source of Truth**: DAYS_OF_WEEK is the single source for day data
- [x] **Test Every Path**: >90% coverage with all paths tested
- [x] **Respect Type System**: Full TypeScript strict mode, Zod validation
- [x] **Embrace Immutability**: No mutations, only transformations
- [x] **Separate Concerns**: CSS in modules, logic in component, types separate
- [x] **Handle Errors Gracefully**: Comprehensive error handling with user feedback
- [x] **Optimize for Change**: Configurable props, extensible design
- [x] **Measure Everything**: Performance benchmarks in tests
- [x] **Document Intent**: Comments explain WHY, not just WHAT

### Important Reminders
1. **Do NOT create island mount scripts** - This task only refactors the component
2. **Do NOT integrate with any pages** - Component should be standalone
3. **Do NOT modify other components** - Only touch SearchScheduleSelector files
4. **Follow TDD strictly** - Write tests first, then implementation
5. **Maintain backward compatibility** - Ensure existing props API is preserved
6. **No breaking changes** - Component should be a drop-in replacement
7. **Document everything** - Every function, interface, and complex logic
8. **Test accessibility thoroughly** - Use jest-axe and manual testing
9. **Optimize for performance** - Use profiling to find bottlenecks
10. **Code review checklist** - Verify against all acceptance criteria

---

**Created**: 2025-01-31
**Status**: Ready for Implementation
**Priority**: High
**Estimated Effort**: 2-3 days
**AI Agent Compatible**: Yes - Follow TDD workflow strictly
