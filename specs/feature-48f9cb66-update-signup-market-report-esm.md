# Feature: Create and Integrate the ai-signup-market-report Component Using ESM + React Islands Structure

## Metadata
adw_id: `48f9cb66`
prompt: `Lets update the ai-signup-market-report React component to be compatible with the new ESM +React island Structure, following the prescribed principles of tidiness, test driven, easy to iterate and maintainable, clean and modular(also following the principles of Software Developer Lifecycle: Plan, Code, Test, Review, Document). Do not add mounts, Do not add it to any pages yet, Just rebuild the component as per these pointers from local path: C:\Users\igor\My Drive (splitleaseteam@gmail.com)!Agent Context and Tools\SL1\TAC\Context\Architecture. Do not disturb any other page/component that is not the ai-signup-market-report.`

## Feature Description
Create a new SignupMarketReport React component from the ground up following the ESM + React Islands architecture pattern. This component will provide users with personalized market insights and reports after they sign up, encouraging engagement and demonstrating the value of the Split Lease platform. The component will be built following all architectural commandments: type-safe, fully tested (>90% coverage), accessible (WCAG 2.1 AA compliant), performant, and thoroughly documented with comprehensive JSDoc comments.

This is a greenfield implementation - we are creating a brand new component that doesn't currently exist in the codebase. The component will follow the same patterns established by the Header and Footer components, using CSS Modules, Zod validation, comprehensive testing with Vitest, and full TypeScript type safety.

## User Story
As a **new user who just signed up**
I want to **receive personalized market insights and rental trend reports**
So that **I can make informed decisions about listing or renting properties on Split Lease**

## Problem Statement
Split Lease currently lacks a component to engage new users immediately after signup with valuable market insights. New users need:

1. **Immediate Value**: Show market trends and insights relevant to their location/interests
2. **Personalization**: Display data specific to their signup context (host vs. guest, location preferences)
3. **Professional Presentation**: Clean, modern UI that builds trust and credibility
4. **Actionable Insights**: Clear next steps and CTAs based on the market data
5. **Accessibility**: Component must work for all users including screen reader users
6. **Performance**: Fast loading with minimal JavaScript bundle size
7. **Maintainability**: Easy for future developers (and AI agents) to understand and modify

## Solution Statement
Build a new SignupMarketReport component that:

1. **Uses ESM + React Islands Architecture**: Self-contained, tree-shakeable, and optimized for islands pattern
2. **Follows TDD Principles**: Write comprehensive tests first, then implement to pass them
3. **Implements Full Type Safety**: TypeScript + Zod schemas for runtime validation
4. **Uses CSS Modules**: Scoped styling to prevent conflicts
5. **Ensures Accessibility**: WCAG 2.1 AA compliance with proper ARIA attributes and keyboard navigation
6. **Optimizes Performance**: React.memo, useCallback, useMemo, and lazy loading
7. **Provides Complete Documentation**: JSDoc on all exports, usage examples, and migration guides
8. **Separates Concerns**: Custom hooks for business logic, pure presentation components
9. **Handles Errors Gracefully**: Comprehensive error handling with user-friendly messages
10. **Measures Everything**: Performance marks, analytics tracking, and error monitoring

## Relevant Files

### New Files to Create

#### Component Files
- **`app/split-lease/components/src/SignupMarketReport/SignupMarketReport.tsx`**
  - Main component implementation with full TypeScript types
  - Uses React.memo for performance optimization
  - Implements all accessibility features
  - Displays market statistics, trends, and personalized insights

- **`app/split-lease/components/src/SignupMarketReport/SignupMarketReport.module.css`**
  - CSS Modules for scoped styling
  - Responsive design (mobile-first)
  - CSS custom properties for theming
  - Animations and transitions

- **`app/split-lease/components/src/SignupMarketReport/SignupMarketReport.types.ts`**
  - TypeScript interfaces inferred from Zod schemas
  - All component props and data types
  - Single source of truth for types

- **`app/split-lease/components/src/SignupMarketReport/SignupMarketReport.schema.ts`**
  - Zod schemas for runtime validation
  - Props validation
  - Market data validation
  - User data validation

- **`app/split-lease/components/src/SignupMarketReport/index.ts`**
  - Public API exports
  - Component, types, and schemas
  - Custom hooks for reusability

#### Custom Hooks
- **`app/split-lease/components/src/SignupMarketReport/hooks/useMarketData.ts`**
  - Fetches and manages market report data
  - Handles loading, error, and success states
  - Caching and data transformation logic
  - Returns stable callbacks and memoized values

- **`app/split-lease/components/src/SignupMarketReport/hooks/useReportDownload.ts`**
  - Manages PDF/CSV report download functionality
  - Handles download state (idle, pending, success, error)
  - Analytics tracking for downloads
  - Returns download handler and status

#### Sub-Components (Atomic Design)
- **`app/split-lease/components/src/SignupMarketReport/components/MarketStatCard.tsx`**
  - Displays individual market statistics (price trends, occupancy rates, etc.)
  - Reusable card component with icon, value, label, and trend indicator
  - Fully accessible with ARIA labels

- **`app/split-lease/components/src/SignupMarketReport/components/TrendChart.tsx`**
  - Visual chart component for market trends
  - Responsive SVG-based charts
  - Accessible with data tables and ARIA descriptions

- **`app/split-lease/components/src/SignupMarketReport/components/InsightsList.tsx`**
  - List of personalized insights and recommendations
  - Supports different insight types (tip, warning, success)
  - Keyboard navigable

- **`app/split-lease/components/src/SignupMarketReport/components/ReportActions.tsx`**
  - CTA buttons (Download Report, View Listings, List Property)
  - Accessible button group
  - Loading states for async actions

#### Test Files
- **`app/split-lease/components/src/SignupMarketReport/SignupMarketReport.test.tsx`**
  - Comprehensive unit tests (>90% coverage)
  - Rendering tests for all states (loading, error, success, empty)
  - User interaction tests (clicks, keyboard navigation)
  - Props validation tests
  - Edge case testing

- **`app/split-lease/components/src/SignupMarketReport/SignupMarketReport.a11y.test.tsx`**
  - Accessibility tests with jest-axe
  - Keyboard navigation tests
  - Screen reader announcement tests
  - Focus management tests
  - ARIA attribute validation

- **`app/split-lease/components/src/SignupMarketReport/hooks/useMarketData.test.ts`**
  - Custom hook unit tests
  - Mock API responses
  - Loading state management
  - Error handling scenarios
  - Cache behavior

- **`app/split-lease/components/src/SignupMarketReport/hooks/useReportDownload.test.ts`**
  - Download functionality tests
  - Success and error scenarios
  - Analytics tracking validation
  - File download simulation

#### Documentation
- **`app/split-lease/components/src/SignupMarketReport/README.md`**
  - Component overview and purpose
  - API reference for props
  - Usage examples (basic and advanced)
  - Accessibility features documentation
  - Performance considerations
  - Troubleshooting guide

### Existing Files to Modify
- **`app/split-lease/components/src/index.ts`**
  - Add SignupMarketReport to exports
  - Export types and schemas

- **`app/split-lease/components/package.json`**
  - Already has all required dependencies (vitest, zod, testing-library, jest-axe)
  - No changes needed

- **`app/split-lease/components/vite.config.ts`**
  - Already configured for tests and CSS Modules
  - No changes needed

## Implementation Plan

### Phase 1: Foundation and Test Infrastructure Setup
Set up the component folder structure, schemas, types, and test infrastructure before writing any implementation code.

**Principles**: Test-Driven Development, Type Safety, Single Source of Truth

**Goals**:
- Establish type system with Zod schemas
- Create test files with comprehensive test cases (all failing)
- Set up component structure and exports

**Deliverables**:
- Zod schemas for all data types
- TypeScript interfaces derived from schemas
- Empty component files with proper exports
- Complete test suite (all tests failing - Red phase)

### Phase 2: Sub-Component Development (TDD Green Phase)
Build the atomic sub-components first, making their tests pass before moving to the main component.

**Principles**: Separation of Concerns, Optimize for Change, Write Self-Documenting Code

**Goals**:
- Implement MarketStatCard, TrendChart, InsightsList, ReportActions
- Each sub-component passes its own tests
- Each sub-component fully accessible and documented

**Deliverables**:
- 4 working sub-components with tests passing
- CSS Modules for each sub-component
- Complete JSDoc documentation

### Phase 3: Custom Hooks Implementation (TDD Green Phase)
Create custom hooks to handle business logic and API interactions.

**Principles**: Separation of Concerns, Handle Errors Gracefully, Measure Everything

**Goals**:
- Implement useMarketData hook with API integration
  - Implement useReportDownload hook with file generation
- All hook tests passing
- Proper error handling and loading states

**Deliverables**:
- 2 custom hooks with full test coverage
- Mock API layer for testing
- Error handling for all edge cases

### Phase 4: Main Component Assembly (TDD Green Phase)
Assemble the main SignupMarketReport component using sub-components and hooks.

**Principles**: Respect the Type System, Embrace Immutability, Handle Errors Gracefully

**Goals**:
- Combine sub-components and hooks into main component
- Pass all rendering and interaction tests
- Implement responsive design with CSS Modules

**Deliverables**:
- Working SignupMarketReport component
- All unit tests passing
- Responsive CSS implementation

### Phase 5: Accessibility Enhancement
Ensure WCAG 2.1 AA compliance and optimal keyboard navigation.

**Principles**: Document Intent, Handle Errors Gracefully

**Goals**:
- Pass all jest-axe tests (zero violations)
- Complete keyboard navigation support
- Proper ARIA attributes and live regions

**Deliverables**:
- WCAG 2.1 AA compliant component
- All accessibility tests passing
- Screen reader compatible

### Phase 6: Performance Optimization
Optimize rendering performance and bundle size.

**Principles**: Optimize for Change, Measure Everything

**Goals**:
- Implement React.memo, useCallback, useMemo
- Lazy load chart components
- Achieve render time < 100ms
- Bundle contribution < 30KB gzipped

**Deliverables**:
- Performance-optimized component
- Performance benchmarks documented
- Bundle size within budget

### Phase 7: Documentation and Code Review (TDD Refactor Phase)
Complete all documentation and perform comprehensive code review.

**Principles**: Document Intent Not Implementation, Write Self-Documenting Code

**Goals**:
- Comprehensive JSDoc on all exports
- README with usage examples
- Code review against all 10 commandments

**Deliverables**:
- Complete README.md
- All JSDoc comments
- Code passes review checklist

## Step by Step Tasks
IMPORTANT: Execute every step in order, top to bottom.

### 1. Create Component Folder Structure
- Create `src/SignupMarketReport` directory
- Create subdirectories: `components/`, `hooks/`
- Create placeholder files for all components and hooks
- Create index.ts with empty exports

### 2. Define Zod Schemas and Types (TDD Foundation)
- Create `SignupMarketReport.schema.ts` with Zod schemas:
  - `MarketDataSchema` - Market statistics and trends
  - `UserContextSchema` - User signup context (role, location, preferences)
  - `SignupMarketReportPropsSchema` - Component props
  - `InsightSchema` - Personalized insights
  - `MarketStatSchema` - Individual statistics
- Create `SignupMarketReport.types.ts`:
  - Infer all TypeScript types from Zod schemas using `z.infer<>`
  - Export all interfaces for external use
- Ensure strict TypeScript compliance (no `any` types)

### 3. Create CSS Modules Foundation
- Create `SignupMarketReport.module.css`:
  - Container and layout styles (flexbox/grid)
  - Responsive breakpoints (mobile-first: 320px, 768px, 1024px)
  - CSS custom properties for theming (colors, spacing, fonts)
  - Loading skeleton styles
  - Error state styles
  - Animations (fade-in, slide-up) using CSS transitions
- Create CSS modules for each sub-component:
  - `MarketStatCard.module.css`
  - `TrendChart.module.css`
  - `InsightsList.module.css`
  - `ReportActions.module.css`

### 4. Write Comprehensive Tests FIRST (Red Phase - Main Component)
- Create `SignupMarketReport.test.tsx` with failing tests:
  - **Rendering Tests**:
    - Renders loading state with skeleton UI
    - Renders error state with error message and retry button
    - Renders empty state when no market data available
    - Renders success state with all sub-components
    - Applies custom className prop correctly
  - **Props Tests**:
    - Validates required props at runtime with Zod
    - Handles optional props with sensible defaults
    - Passes user context to hooks correctly
  - **Interaction Tests**:
    - Retry button refetches data on click
    - Download button triggers download handler
    - CTA buttons navigate correctly
    - Keyboard navigation works (Tab, Enter, Space)
  - **State Management Tests**:
    - Loading state displayed while fetching data
    - Error state displayed on fetch failure
    - Success state displayed with valid data
    - Transitions between states correctly
  - **Edge Cases**:
    - Handles null/undefined props gracefully
    - Handles malformed API responses
    - Handles network timeouts
    - Component unmounts during async operations cleanly
- Run tests to verify all fail (Red phase complete)

### 5. Write Sub-Component Tests (Red Phase)
- Create `components/MarketStatCard.test.tsx`:
  - Renders stat value, label, and icon correctly
  - Shows trend indicator (up/down arrow) with correct color
  - Handles missing trend data gracefully
  - Accessible with proper ARIA labels
  - Keyboard focusable when interactive
- Create `components/TrendChart.test.tsx`:
  - Renders chart with correct data points
  - Responsive to container size changes
  - Accessible with aria-label and data table fallback
  - Handles empty data sets gracefully
  - Loading state displayed during data fetch
- Create `components/InsightsList.test.tsx`:
  - Renders all insights from array
  - Shows correct icon for insight type (tip, warning, success)
  - Handles empty insights array
  - Accessible list structure with proper ARIA
  - Keyboard navigable
- Create `components/ReportActions.test.tsx`:
  - Renders all CTA buttons
  - Click handlers fire correctly
  - Loading state on buttons during async actions
  - Disabled state prevents multiple clicks
  - Accessible button group with proper labels
- Run all sub-component tests (should fail)

### 6. Write Custom Hook Tests (Red Phase)
- Create `hooks/useMarketData.test.ts`:
  - Returns loading state initially
  - Fetches market data on mount
  - Returns success state with data
  - Returns error state on failure
  - Provides refetch function that works
  - Caches data to prevent redundant fetches
  - Handles race conditions (rapid refetches)
  - Cleans up on unmount
- Create `hooks/useReportDownload.test.ts`:
  - Initial state is idle
  - Download function triggers PDF generation
  - Success state after successful download
  - Error state after failed download
  - Analytics event fired on download
  - Provides download progress (if applicable)
  - Handles concurrent download attempts
- Run all hook tests (should fail)

### 7. Write Accessibility Tests (Red Phase)
- Create `SignupMarketReport.a11y.test.tsx`:
  - No axe violations in any component state
  - All interactive elements have accessible names
  - Proper heading hierarchy (h1-h6)
  - Form fields (if any) have associated labels
  - Color contrast ratios meet AA standards (4.5:1 for text)
  - Focus indicators visible on all focusable elements
  - Keyboard navigation reaches all interactive elements
  - Screen reader announcements for loading/error/success states
  - ARIA live regions update correctly
  - Skip links available if needed
- Run accessibility tests (should fail)

### 8. Implement Sub-Components (Green Phase - Part 1)
- Implement `components/MarketStatCard.tsx`:
  - Accept props: value, label, icon, trend, className
  - Use CSS Modules for styling
  - Implement trend indicator logic
  - Add ARIA labels and roles
  - Wrap with React.memo
  - Add comprehensive JSDoc
- Implement `components/TrendChart.tsx`:
  - Accept props: data, width, height, className
  - Render responsive SVG chart
  - Include data table for accessibility
  - Add aria-label and aria-describedby
  - Implement loading skeleton
  - Wrap with React.memo
  - Add comprehensive JSDoc
- Implement `components/InsightsList.tsx`:
  - Accept props: insights, className
  - Map insights to list items
  - Render icon based on type
  - Use semantic HTML (ul/li)
  - Add ARIA attributes
  - Wrap with React.memo
  - Add comprehensive JSDoc
- Implement `components/ReportActions.tsx`:
  - Accept props: onDownload, onViewListings, onListProperty, loading
  - Render button group
  - Handle loading states
  - Implement keyboard navigation
  - Use semantic button elements
  - Add ARIA labels
  - Wrap with React.memo
  - Add comprehensive JSDoc
- Run sub-component tests - should start passing

### 9. Implement Custom Hooks (Green Phase - Part 2)
- Implement `hooks/useMarketData.ts`:
  - Use useState for data, loading, error
  - Use useEffect to fetch on mount
  - Use useCallback for refetch function
  - Implement error handling with try/catch
  - Add data caching logic (localStorage or memory)
  - Validate API response with Zod schema
  - Return memoized values with useMemo
  - Add cleanup in useEffect return
  - Add comprehensive JSDoc
- Implement `hooks/useReportDownload.ts`:
  - Use useState for download status
  - Use useCallback for download handler
  - Generate PDF/CSV from market data
  - Track analytics event
  - Handle download errors gracefully
  - Return status and handler
  - Add comprehensive JSDoc
- Run hook tests - should pass

### 10. Implement Main Component (Green Phase - Part 3)
- Implement `SignupMarketReport.tsx`:
  - Define SignupMarketReportProps interface with JSDoc
  - Validate props with Zod schema at component entry
  - Use useMarketData hook with user context
  - Use useReportDownload hook
  - Implement conditional rendering:
    - Loading state → Skeleton UI
    - Error state → Error message + Retry button
    - Empty state → Empty message + CTA
    - Success state → Sub-components with data
  - Combine className prop with base styles
  - Implement error boundary logic
  - Use React.memo for performance
  - Add displayName for debugging
  - Export as named export (not default)
  - Add comprehensive JSDoc with examples
- Run main component tests - should pass

### 11. Enhance Accessibility (Green Phase - Part 4)
- Add ARIA attributes to all interactive elements:
  - `aria-label` on buttons without text
  - `aria-describedby` for error messages
  - `role="status"` for loading indicators
  - `role="alert"` for error messages
  - `aria-live="polite"` for data updates
  - `aria-busy="true"` during loading
- Implement keyboard navigation:
  - All buttons keyboard accessible (Tab, Enter, Space)
  - Proper focus management
  - Skip links if needed
  - Focus trapping in modals (if any)
- Add focus indicators in CSS:
  - Visible outline on focus
  - High contrast focus styles
- Test with keyboard only (no mouse)
- Run accessibility tests - should pass (zero violations)

### 12. Optimize Performance
- Wrap component with React.memo:
  - Add custom comparison function if needed
  - Prevent unnecessary re-renders
- Stabilize callbacks with useCallback:
  - Retry handler
  - Download handler
  - CTA handlers
  - All event handlers
- Memoize expensive computations with useMemo:
  - Derived data transformations
  - Chart data calculations
  - Filtered/sorted lists
- Implement lazy loading:
  - Lazy load TrendChart if heavy
  - Code split chart library
- Add performance marks:
  - Mark component mount
  - Mark data fetch completion
  - Measure render time
- Test render performance (should be < 100ms)

### 13. Update Component Exports
- Update `SignupMarketReport/index.ts`:
  - Export SignupMarketReport component
  - Export SignupMarketReportProps interface
  - Export all schemas (MarketDataSchema, etc.)
  - Export custom hooks for reusability
  - Export sub-components if needed publicly
  - Add JSDoc to explain public API
- Update `components/src/index.ts`:
  - Add SignupMarketReport exports
  - Ensure alphabetical ordering
  - Verify tree-shaking compatibility

### 14. Create Component Documentation
- Create `SignupMarketReport/README.md`:
  - **Overview**: Purpose and use cases
  - **Installation**: How to import
  - **Props API**: Complete reference with types
  - **Examples**:
    - Basic usage
    - With custom user context
    - With custom styling
    - Handling errors
    - With analytics integration
  - **Accessibility**: WCAG compliance features
  - **Performance**: Bundle size, render time
  - **Browser Support**: Tested browsers
  - **Troubleshooting**: Common issues and solutions
  - **Contributing**: How to modify/extend

### 15. Final Testing and Validation
- Run full test suite: `npm run test`
  - Verify all tests pass
  - Check coverage is >90%
  - No flaky tests
- Run coverage report: `npm run test:coverage`
  - Lines: >90%
  - Functions: >90%
  - Branches: >90%
  - Statements: >90%
- Run type checking: `npm run typecheck`
  - Zero TypeScript errors
  - Strict mode compliance
- Run accessibility tests specifically
  - Zero axe violations
  - Manual keyboard testing
  - Manual screen reader testing (if available)

### 16. Build and Bundle Size Validation
- Run build: `npm run build`
  - Build succeeds without errors
  - No build warnings
- Check bundle size:
  - SignupMarketReport contribution < 30KB gzipped
  - Verify code splitting works
  - Check source maps generated
- Test in production build:
  - Component works in minified bundle
  - No runtime errors
  - Performance maintained

### 17. Final Code Review Against Commandments
- Review against all 10 Architectural Commandments:
  1. Self-documenting code ✓
  2. Single source of truth ✓
  3. Test every path ✓
  4. Respect type system ✓
  5. Embrace immutability ✓
  6. Separate concerns ✓
  7. Handle errors gracefully ✓
  8. Optimize for change ✓
  9. Measure everything ✓
  10. Document intent ✓
- Verify no console.logs or debugging code
- Check for magic numbers (all should be named constants)
- Ensure proper error handling throughout
- Validate Single Responsibility Principle
- Check DRY principle compliance
- Ensure functions are <20 lines each

## Testing Strategy

### Unit Tests
**Target Coverage**: >90%

**Test Categories**:
1. **Component Rendering**
   - Default state renders correctly
   - Loading state shows skeleton UI
   - Error state shows error message and retry button
   - Empty state shows appropriate message
   - Success state shows all sub-components
   - Custom className applied correctly
   - Props are passed to sub-components

2. **User Interactions**
   - Retry button refetches data
   - Download button triggers download
   - CTA buttons fire correct handlers
   - Keyboard interactions work (Tab, Enter, Space)
   - Focus management correct

3. **State Management**
   - Loading → Success transition
   - Loading → Error transition
   - Error → Loading (retry) transition
   - State updates trigger re-renders appropriately
   - Async state handled correctly

4. **Data Validation**
   - Props validated with Zod schemas
   - API responses validated
   - Invalid data handled gracefully
   - Type coercion works correctly

5. **Hook Behavior**
   - useMarketData fetches and caches correctly
   - useReportDownload handles download lifecycle
   - Hook cleanup prevents memory leaks
   - Race conditions handled

### Integration Tests
**Test Scenarios**:
1. Complete user flow: mount → load → display → interact
2. Error recovery: error → retry → success
3. Download flow: click download → generate → success
4. Multiple instances on same page (if applicable)
5. Responsive behavior at different breakpoints

### Accessibility Tests
**WCAG 2.1 AA Compliance**:
1. No axe violations in any state
2. Keyboard navigation reaches all interactive elements
3. Screen reader announces state changes
4. Color contrast meets 4.5:1 ratio
5. Focus indicators visible
6. Semantic HTML structure
7. ARIA attributes correct and complete
8. Heading hierarchy logical
9. Alternative text for images/charts

### Performance Tests
1. Initial render < 100ms
2. Re-render after data fetch < 50ms
3. No memory leaks on mount/unmount cycles
4. Bundle contribution < 30KB gzipped
5. Lazy loading works correctly
6. No layout shifts (CLS = 0)

### Edge Cases
1. Null/undefined props
2. Empty market data
3. Malformed API responses
4. Network timeouts
5. Rapid state changes
6. Component unmount during fetch
7. Multiple concurrent downloads
8. Very large data sets
9. Missing user context
10. Browser API unavailability

## Acceptance Criteria

### Functional Requirements
- [ ] Component renders loading state with skeleton UI
- [ ] Component fetches market data on mount
- [ ] Component displays market statistics correctly
- [ ] Component shows trend charts with data
- [ ] Component lists personalized insights
- [ ] Component provides download functionality
- [ ] Component shows error state on failure with retry option
- [ ] Component handles empty data gracefully
- [ ] All CTA buttons navigate/function correctly
- [ ] User context passed to API correctly

### Technical Requirements
- [ ] Component uses CSS Modules (SignupMarketReport.module.css)
- [ ] All props validated with Zod schemas at runtime
- [ ] TypeScript types inferred from Zod schemas
- [ ] Component wrapped with React.memo
- [ ] Expensive computations memoized with useMemo
- [ ] Event handlers stabilized with useCallback
- [ ] Business logic extracted to custom hooks (useMarketData, useReportDownload)
- [ ] No inline styles or global CSS classes
- [ ] ESM exports (named exports only, no default)
- [ ] Bundle size contribution < 30KB gzipped
- [ ] Source maps generated for debugging

### Testing Requirements
- [ ] Unit test coverage >90%
- [ ] All rendering states tested (loading, error, empty, success)
- [ ] All user interactions tested
- [ ] All edge cases tested
- [ ] Custom hooks tested independently
- [ ] Accessibility tests pass with zero violations
- [ ] Performance benchmarks documented
- [ ] No flaky or skipped tests
- [ ] Tests run in <10 seconds

### Accessibility Requirements (WCAG 2.1 AA)
- [ ] All interactive elements keyboard accessible
- [ ] All buttons have descriptive aria-labels
- [ ] Loading/error states announced to screen readers
- [ ] Proper heading hierarchy (h1-h6)
- [ ] Color contrast ratios meet AA standards (4.5:1)
- [ ] Focus indicators visible on all focusable elements
- [ ] Charts have accessible fallbacks (data tables)
- [ ] No axe-core violations
- [ ] Semantic HTML used throughout
- [ ] ARIA live regions for dynamic content

### Documentation Requirements
- [ ] JSDoc on SignupMarketReport component with examples
- [ ] JSDoc on all custom hooks
- [ ] JSDoc on all sub-components
- [ ] JSDoc on all exported types and schemas
- [ ] README.md with complete API reference
- [ ] Usage examples (basic and advanced)
- [ ] Accessibility features documented
- [ ] Performance benchmarks documented
- [ ] Troubleshooting guide included

### Code Quality Requirements
- [ ] No TypeScript errors (`npm run typecheck` passes)
- [ ] No console.logs or debugging code
- [ ] All functions <20 lines
- [ ] No magic numbers (named constants only)
- [ ] Proper error handling in all async operations
- [ ] Immutability maintained (no mutations)
- [ ] Single responsibility principle followed
- [ ] Follows all Ten Commandments of Architecture

### Performance Requirements
- [ ] Component renders in <100ms
- [ ] Bundle contribution <30KB gzipped
- [ ] No memory leaks on mount/unmount
- [ ] Lazy loading implemented for heavy components
- [ ] Performance marks added for critical operations
- [ ] Re-renders minimized with React.memo
- [ ] No layout shifts (CLS = 0)

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
**Expected**: All tests pass, no failures

### 3. Run Tests with Coverage Report
```bash
cd app/split-lease/components
npm run test:coverage
```
**Expected**:
- Lines: >90%
- Functions: >90%
- Branches: >90%
- Statements: >90%

### 4. Run Specific SignupMarketReport Tests
```bash
cd app/split-lease/components
npm run test -- SignupMarketReport
```
**Expected**: All SignupMarketReport tests pass

### 5. Run Accessibility Tests Only
```bash
cd app/split-lease/components
npm run test -- SignupMarketReport.a11y
```
**Expected**: Zero accessibility violations

### 6. Build Component Library
```bash
cd app/split-lease/components
npm run build
```
**Expected**: Build succeeds, no errors or warnings

### 7. Check Bundle Size
```bash
cd app/split-lease/components
npm run build
ls -lh dist/
```
**Expected**: SignupMarketReport contributes <30KB to bundle

### 8. Verify Exports
```bash
cd app/split-lease/components
npm run build
node -e "import('./dist/split-lease-components.es.js').then(m => console.log(Object.keys(m)))"
```
**Expected**: SignupMarketReport exported correctly

## Notes

### Dependencies Required
All dependencies already installed in `app/split-lease/components/package.json`:
- `react` and `react-dom` (peer dependencies)
- `zod` (runtime validation)
- `styled-components` (for chart components if needed)
- `framer-motion` (for animations if needed)
- `vitest`, `@testing-library/react`, `@testing-library/user-event` (testing)
- `jest-axe` (accessibility testing)
- `jsdom` (DOM environment for tests)

No additional dependencies needed.

### Component Design Decisions

1. **CSS Modules over Styled-Components**:
   - Better performance (no runtime CSS-in-JS)
   - Smaller bundle size
   - Consistent with Header/Footer patterns
   - Better integration with Vite

2. **Custom Hooks for Business Logic**:
   - `useMarketData`: Separates data fetching from presentation
   - `useReportDownload`: Separates download logic from UI
   - Easier to test independently
   - Reusable in other components

3. **Atomic Design for Sub-Components**:
   - `MarketStatCard`: Atom - single stat display
   - `TrendChart`: Molecule - chart with multiple elements
   - `InsightsList`: Molecule - list of insights
   - `ReportActions`: Molecule - button group
   - Main component: Organism - assembles all molecules

4. **Zod for Runtime Validation**:
   - Validate props from data attributes (island mounting)
   - Validate API responses
   - Single source of truth for types (TypeScript inferred from Zod)
   - Better error messages for users

5. **Test-First Approach (TDD)**:
   - Write all tests before implementation
   - Ensures comprehensive coverage from start
   - Drives component design
   - Prevents untested code paths

### Market Data Structure (Example)

The component expects market data in this format:

```typescript
interface MarketData {
  location: string;
  stats: {
    averagePrice: number;
    priceChange: number; // percentage
    occupancyRate: number;
    occupancyChange: number; // percentage
    totalListings: number;
    listingsChange: number; // percentage
  };
  trends: {
    month: string;
    averagePrice: number;
    occupancyRate: number;
  }[];
  insights: {
    type: 'tip' | 'warning' | 'success';
    title: string;
    description: string;
  }[];
  generatedAt: string; // ISO date
}
```

### User Context Structure (Example)

```typescript
interface UserContext {
  userId: string;
  role: 'host' | 'guest' | 'both';
  location?: {
    city: string;
    state: string;
    country: string;
  };
  signupDate: string; // ISO date
  preferences?: {
    propertyTypes?: string[];
    priceRange?: { min: number; max: number };
  };
}
```

### Performance Budget
- **Component bundle**: <30KB gzipped
- **Initial render**: <100ms
- **Data fetch**: <500ms (depends on API)
- **Re-render after data**: <50ms
- **Download generation**: <2s

### Browser Support
- Modern browsers with ES2020 support
- React 18 compatible
- CSS Grid and Flexbox required
- No IE11 support needed

### Future Enhancements (Out of Scope)
Items for future iterations:
- Island mount script (separate task after component is ready)
- Integration into signup flow pages (separate task)
- Real-time data updates with WebSocket
- Interactive chart filtering
- Email report delivery
- Comparison with other markets
- Historical data archive
- A/B testing different layouts

### Security Considerations
- Sanitize all user input before display
- Validate all data from API with Zod
- No sensitive data in component state
- Use HTTPS for API calls
- Content Security Policy compliance

### Analytics Tracking
Track these events (to be integrated):
- Component mounted
- Market data loaded successfully
- Market data failed to load
- Report downloaded
- CTA button clicked (which one)
- Error occurred (what type)

### Accessibility Testing Tools
- **jest-axe**: Automated accessibility testing
- **Keyboard only**: Manual testing without mouse
- **Screen reader**: NVDA/JAWS testing (if available)
- **Color contrast**: Check with browser DevTools

### References
- Architectural Bible: `Context/Architecture/architectural-bible.md`
- Migration Guide: `Context/Architecture/migration-guide.md`
- TDD Guide: `Context/Architecture/TDD-guide.md`
- Header Component: `app/split-lease/components/src/Header/Header.tsx`
- Footer Spec: `specs/feature-431d9cc3-update-footer-esm-react-islands.md`
- README: `app/split-lease/README.md`

---

**Created**: January 2025
**Status**: Planning Complete - Ready for Implementation
**Estimated Effort**: 3-4 days
**Priority**: High
**Assigned To**: AI Agent (sdlc_implementor)
