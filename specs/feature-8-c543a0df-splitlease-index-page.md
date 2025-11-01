# Feature: Create SplitLease Index (Home) Page

## Metadata
adw_id: `8`
prompt: `Create Index(home) page for splitlease in the current project. Create using the context from local path: C:\Users\igor\My Drive (splitleaseteam@gmail.com)\!Agent Context and Tools\SL1\TAC\Context\Architecture, and recreating the index page from repo: https://github.com/splitleasesharath/index_lite.git as a part of this new app, following the prescribed principles of tidiness, test driven, easy to iterate and maintainable, clean and modular(also following the principles of Software Developer Lifecycle: Plan, Code, Test, Review, Document). If needed, use playwright only in the mcp form, to gain more context from the site https://split.lease. This app(with more pages and react components to follow) will be hosted on Cloudflare.`

## Feature Description

Implement a production-ready, AI-native index (home) page for the SplitLease application that follows an Islands Architecture pattern. This page serves as the primary landing experience showcasing split lease rentals (periodic tenancy), where users can rent properties for specific days of the week (weeknights, weekends, or custom schedules).

The implementation will migrate from the existing Bubble.io no-code version to a fully-coded, type-safe, test-driven React application using ESM modules, with reusable component islands that hydrate on static HTML. The page must be optimized for Cloudflare hosting with performance budgets enforced (TTI < 3s, FCP < 1.5s, bundle size < 250KB per entry point).

**Key Business Value:**
- Convert landing page visitors to engaged users through compelling value propositions
- Enable schedule-based property search with interactive day selector
- Showcase popular listings to drive exploration and bookings
- Provide multiple support touchpoints to reduce friction
- Establish trust through benefits section and testimonials

## User Story

**As a** potential renter looking for flexible housing options
**I want to** visit the SplitLease home page and immediately understand the value proposition, select my preferred schedule, and explore available properties
**So that** I can quickly determine if SplitLease meets my needs and begin my rental search journey

## Problem Statement

The current SplitLease homepage is built in Bubble.io no-code platform, which presents several limitations:
1. **Performance bottlenecks**: Bubble's runtime adds overhead, resulting in slower load times
2. **Limited customization**: Constrained by Bubble's plugin ecosystem and styling system
3. **Testing challenges**: No comprehensive test coverage or TDD workflow
4. **Maintainability issues**: Complex nested element hierarchy difficult to debug and modify
5. **AI agent limitations**: No-code structure is opaque to AI-assisted development
6. **Vendor lock-in**: Tied to Bubble's platform and pricing model
7. **Cloudflare optimization**: Cannot fully leverage Cloudflare Pages/Workers capabilities

These limitations hinder rapid iteration, comprehensive testing, and optimal user experience.

## Solution Statement

Build a fully-coded, type-safe homepage using React Islands Architecture that:

1. **Maintains feature parity** with Bubble.io version while improving performance by 60%+
2. **Implements comprehensive testing** (80%+ coverage) with unit, integration, and E2E tests
3. **Uses ESM module architecture** for optimal tree-shaking and code splitting
4. **Follows TDD principles** with tests written before implementation
5. **Provides full AI-agent compatibility** through self-documenting code and clear structure
6. **Optimizes for Cloudflare hosting** with static generation and edge caching
7. **Maintains strict type safety** with TypeScript strict mode and Zod runtime validation

The solution leverages the existing component library structure (atomic design pattern with molecules, organisms, templates) and extends it with homepage-specific components while following the Ten Commandments of Architecture.

## Relevant Files

### Configuration Files
- `app/split-lease/package.json` - Dependencies and scripts
- `app/split-lease/tsconfig.json` - TypeScript configuration
- `app/split-lease/vite.config.ts` - Build and test configuration
- `app/split-lease/playwright.config.ts` - E2E test configuration
- `app/split-lease/vitest.config.ts` - Unit test configuration

### Component Library (Existing)
- `app/split-lease/components/src/` - Component source directory
  - `atomic/` - Atomic components (buttons, inputs, icons)
  - `molecules/` - Composite components (cards, forms)
  - `organisms/` - Complex components (headers, footers, selectors)
  - `templates/` - Page templates and layouts
  - `index.ts` - Component exports

### Testing Infrastructure (Existing)
- `app/split-lease/tests/` - Test suites
  - `components/` - Component unit tests
  - `integration/` - Integration tests
  - `e2e/` - End-to-end tests

### Type Definitions (Existing)
- `app/split-lease/types/` - TypeScript type definitions
  - `models.ts` - Data models
  - `api.ts` - API types

### Architecture Documentation (Reference)
- `Context/Architecture/architectural-bible.md` - Architecture commandments
- `Context/Architecture/TDD-guide.md` - Testing standards
- `Context/Architecture/migration-guide.md` - Migration patterns
- `Context/TDD/HOMEPAGE_TDD_TEST_SUITE_V2_ENRICHED.md` - Comprehensive test scenarios

### New Files

#### Component Files (To Create)
- `app/split-lease/components/src/organisms/HeroSection/`
  - `HeroSection.tsx` - Hero section with schedule selector
  - `HeroSection.module.css` - Scoped styles
  - `HeroSection.test.tsx` - Unit tests (90%+ coverage)
  - `index.ts` - Component exports

- `app/split-lease/components/src/organisms/BenefitsSection/`
  - `BenefitsSection.tsx` - Value propositions grid
  - `BenefitsSection.module.css` - Scoped styles
  - `BenefitsSection.test.tsx` - Unit tests
  - `index.ts` - Component exports

- `app/split-lease/components/src/organisms/ScheduleTypeCards/`
  - `ScheduleTypeCards.tsx` - Weekend/Weeknight/Monthly cards
  - `ScheduleTypeCards.module.css` - Scoped styles
  - `ScheduleTypeCards.test.tsx` - Unit tests
  - `index.ts` - Component exports

- `app/split-lease/components/src/organisms/FlexibilitySection/`
  - `FlexibilitySection.tsx` - Lifestyle features showcase
  - `FlexibilitySection.module.css` - Scoped styles
  - `FlexibilitySection.test.tsx` - Unit tests
  - `index.ts` - Component exports

- `app/split-lease/components/src/organisms/PopularListings/`
  - `PopularListings.tsx` - Listings carousel
  - `PopularListings.module.css` - Scoped styles
  - `PopularListings.test.tsx` - Unit tests
  - `index.ts` - Component exports

- `app/split-lease/components/src/organisms/SupportSection/`
  - `SupportSection.tsx` - Support options grid
  - `SupportSection.module.css` - Scoped styles
  - `SupportSection.test.tsx` - Unit tests
  - `index.ts` - Component exports

- `app/split-lease/components/src/organisms/SearchScheduleSelector/`
  - `SearchScheduleSelector.tsx` - Interactive day selector (if not exists)
  - `SearchScheduleSelector.module.css` - Scoped styles
  - `SearchScheduleSelector.test.tsx` - Comprehensive tests
  - `index.ts` - Component exports

- `app/split-lease/components/src/molecules/ListingCard/`
  - `ListingCard.tsx` - Individual listing card component (if not exists)
  - `ListingCard.module.css` - Scoped styles
  - `ListingCard.test.tsx` - Unit tests
  - `index.ts` - Component exports

#### Island Mount Scripts (To Create)
- `app/split-lease/islands/hero.tsx` - Hero section mount point
- `app/split-lease/islands/schedule-selector.tsx` - Schedule selector mount point
- `app/split-lease/islands/popular-listings.tsx` - Listings carousel mount point

#### Page Files (To Create)
- `app/split-lease/pages/` (create if not exists)
  - `index.html` - Static HTML homepage with island mount points
  - `css/home.css` - Page-specific styles
  - `shared/css/variables.css` - CSS custom properties (if not exists)
  - `shared/css/reset.css` - CSS reset (if not exists)
  - `shared/css/global.css` - Global styles (if not exists)

#### Test Files (To Create)
- `app/split-lease/tests/e2e/home.spec.ts` - E2E tests for homepage critical paths
- `app/split-lease/tests/integration/homepage-workflow.test.tsx` - Integration tests

#### API & Data Files (To Create)
- `app/split-lease/api/listings.ts` - Listings API client (if not exists)
- `app/split-lease/api/schedule.ts` - Schedule state management API
- `app/split-lease/types/homepage.ts` - Homepage-specific types

#### Build Scripts (To Create)
- `app/split-lease/scripts/build-homepage.js` - Homepage build script
- `app/split-lease/scripts/optimize-assets.js` - Asset optimization for Cloudflare

## Implementation Plan

### Phase 1: Foundation & Setup (TDD Red Phase)
**Goal:** Establish testing infrastructure and write failing tests that define expected behavior

**Activities:**
1. Set up test data factories and fixtures for homepage components
2. Write comprehensive E2E test suite based on HOMEPAGE_TDD_TEST_SUITE_V2_ENRICHED.md
3. Create failing unit tests for each component following Red-Green-Refactor cycle
4. Establish MSW (Mock Service Worker) handlers for API mocking
5. Configure accessibility testing with jest-axe
6. Set up performance budgets in Playwright configuration

**Success Criteria:**
- All tests exist and fail appropriately (Red phase complete)
- Test coverage tools configured and reporting
- CI/CD pipeline configured to run tests
- Performance budgets defined and enforced

### Phase 2: Core Component Implementation (TDD Green Phase)
**Goal:** Implement components to make tests pass, following TDD discipline

**Activities:**
1. Implement reusable atomic components (buttons, icons, inputs)
2. Build molecule components (benefit cards, support options)
3. Create organism components (hero section, schedule selector, listings carousel)
4. Implement islands mount scripts with auto-hydration
5. Add CSS modules for scoped styling
6. Ensure each implementation makes corresponding tests pass

**Success Criteria:**
- All unit tests passing (Green phase)
- Components render correctly in isolation
- No TypeScript errors (strict mode enabled)
- CSS modules properly scoped
- Components follow Ten Commandments of Architecture

### Phase 3: Integration & Page Assembly
**Goal:** Compose components into full homepage experience

**Activities:**
1. Create static HTML page structure with semantic markup
2. Define island mount points with data attributes
3. Implement state management for schedule selector (URL parameters)
4. Add dynamic data bindings for listings carousel
5. Integrate with API layer for data fetching
6. Implement conditional rendering based on authentication state
7. Add error boundaries and loading states

**Success Criteria:**
- Integration tests passing
- Page loads and functions correctly
- State management working (URL parameters persist)
- API integration functional with proper error handling
- Responsive design working across breakpoints

### Phase 4: Testing & Optimization (TDD Refactor Phase)
**Goal:** Refactor code for quality while maintaining passing tests

**Activities:**
1. Run full E2E test suite and fix any failures
2. Optimize bundle sizes (code splitting, tree shaking)
3. Implement image optimization (lazy loading, responsive images)
4. Add performance monitoring and metrics
5. Refactor components for improved readability and maintainability
6. Add comprehensive inline documentation (JSDoc)
7. Accessibility audit and fixes (WCAG 2.1 AA compliance)

**Success Criteria:**
- All 72 test scenarios from TDD suite passing
- Performance budgets met (TTI < 3s, FCP < 1.5s)
- Bundle size under 250KB per entry point
- Lighthouse score > 90 across all categories
- Zero accessibility violations (jest-axe)
- 80%+ code coverage

### Phase 5: Cloudflare Deployment Preparation
**Goal:** Optimize for Cloudflare Pages/Workers hosting

**Activities:**
1. Configure build scripts for static site generation
2. Implement edge caching strategies
3. Add Cloudflare-specific optimizations (automatic minification, Brotli compression)
4. Set up environment-specific configurations
5. Create deployment scripts and CI/CD pipelines
6. Configure custom domains and SSL
7. Implement analytics and monitoring

**Success Criteria:**
- Build generates optimized static files
- Assets properly cached at edge
- Deployment pipeline automated
- SSL configured correctly
- Analytics tracking functional

## Step by Step Tasks

### 1. Test Infrastructure Setup
- Create test data factories in `app/split-lease/tests/factories/homepage.ts`
  - Factory for listing data with realistic values
  - Factory for user data (authenticated/unauthenticated states)
  - Factory for schedule selections (weeknight, weekend, custom)
- Set up MSW handlers in `app/split-lease/tests/mocks/handlers.ts`
  - Mock listings API endpoint (`/api/v1/listings/search`)
  - Mock schedule state endpoint
  - Mock user authentication endpoint
- Configure jest-axe in `app/split-lease/tests/setup.ts`
  - Add toHaveNoViolations matcher
  - Configure accessibility testing helpers
- Write E2E test suite in `app/split-lease/tests/e2e/home.spec.ts`
  - Implement all P0 critical path tests (8 scenarios)
  - Implement reusable component tests (18 scenarios)
  - Implement dynamic data binding tests (8 scenarios)
  - Implement state management tests (12 scenarios)
  - Implement plugin integration tests (8 scenarios)
  - Implement responsive design tests (8 scenarios)
  - Implement conditional rendering tests (10 scenarios)
  - **Expected: All 72 tests failing (Red phase)**

### 2. Atomic Component Implementation (TDD)
- **Write failing tests first** for each component
- Implement Button component (if not exists)
  - Create `app/split-lease/components/src/atomic/Button/Button.test.tsx`
  - Implement `app/split-lease/components/src/atomic/Button/Button.tsx`
  - Add styles in `Button.module.css`
  - Verify tests pass
- Implement Icon component (if not exists)
  - Create test file with failing tests
  - Implement component
  - Add SVG icon assets
  - Verify tests pass
- Implement Input component for email/text fields (if not exists)
  - Create test file with validation tests
  - Implement component with Zod validation
  - Add styles
  - Verify tests pass

### 3. Molecule Component Implementation (TDD)
- **Write failing tests first** for each component
- Implement BenefitCard component
  - Create `app/split-lease/components/src/molecules/BenefitCard/BenefitCard.test.tsx`
  - Write tests for icon display, text rendering, responsive behavior
  - Implement `BenefitCard.tsx` to make tests pass
  - Add scoped styles in `BenefitCard.module.css`
- Implement SupportOption component
  - Create test file with interaction tests
  - Implement component with click handlers
  - Add hover states and accessibility attributes
  - Verify tests pass
- Implement ScheduleDayButton component
  - Create test file with selection state tests
  - Implement button with toggle functionality
  - Add conditional styling for selected state
  - Verify tests pass

### 4. ListingCard Component (TDD)
- Write failing tests in `app/split-lease/components/src/molecules/ListingCard/ListingCard.test.tsx`
  - Test image rendering with lazy loading
  - Test bedroom count conditional formatting (Studio vs "[X] bed")
  - Test location display
  - Test click navigation
  - Test responsive image loading
- Implement ListingCard component
  - Create TypeScript interface for listing data
  - Implement conditional bedroom text logic
  - Add image optimization (lazy loading, srcset)
  - Add click handler for navigation
  - Style with CSS modules
- Verify all tests pass (Green phase)
- Refactor for clarity and maintainability

### 5. SearchScheduleSelector Organism (TDD)
- Write comprehensive failing tests in `SearchScheduleSelector.test.tsx`
  - Test 7 day buttons render
  - Test day selection updates URL parameters
  - Test check-in/check-out display updates dynamically
  - Test selection persists across page reload
  - Test edge cases: no days selected, all days selected
  - Test keyboard navigation
  - Test accessibility (ARIA attributes)
- Implement SearchScheduleSelector component
  - Create repeating day buttons (S, M, T, W, T, F, S)
  - Implement selection state management with URL parameters
  - Add check-in/check-out dynamic display logic
  - Add keyboard event handlers
  - Style with CSS modules (selected state, hover states)
- Verify all tests pass
- Refactor for optimal performance (useMemo, useCallback)

### 6. HeroSection Organism (TDD)
- Write failing tests in `HeroSection.test.tsx`
  - Test heading and subtext render
  - Test SearchScheduleSelector integration
  - Test CTA button click navigation
  - Test background images load
  - Test responsive layout
- Implement HeroSection component
  - Create layout with background images
  - Integrate SearchScheduleSelector component
  - Add heading and descriptive text
  - Implement CTA button with navigation
  - Style with CSS modules (responsive grid)
- Verify all tests pass
- Add performance optimizations (image preloading)

### 7. BenefitsSection Organism (TDD)
- Write failing tests in `BenefitsSection.test.tsx`
  - Test 4 benefit cards render
  - Test icon and text display for each card
  - Test responsive grid layout
  - Test scroll-into-view behavior
- Implement BenefitsSection component
  - Create grid layout for 4 benefit cards
  - Define benefit data (icons, text)
  - Integrate BenefitCard molecule
  - Add heading and subheading
  - Style with CSS modules (responsive grid: 1 col mobile, 2 col tablet, 4 col desktop)
- Verify all tests pass

### 8. ScheduleTypeCards Organism (TDD)
- Write failing tests in `ScheduleTypeCards.test.tsx`
  - Test 3 cards render (Weekend, Weeknight, Weeks of Month)
  - Test animation assets load (Lottie alternative)
  - Test button click filters search results
  - Test responsive layout
- Implement ScheduleTypeCards component
  - Create 3 schedule type cards with animations
  - Replace Lottie with CSS animations or lightweight alternative
  - Add CTA buttons with navigation + URL parameters
  - Style with CSS modules (card grid, animations)
- Verify all tests pass
- Optimize animations for performance

### 9. FlexibilitySection Organism (TDD)
- Write failing tests in `FlexibilitySection.test.tsx`
  - Test 3 feature items render
  - Test images and text display
  - Test CTA button navigation
  - Test responsive layout
- Implement FlexibilitySection component
  - Create feature grid with images
  - Add descriptive text for each feature
  - Integrate CTA button
  - Style with CSS modules (alternating image/text layout)
- Verify all tests pass

### 10. PopularListings Organism (TDD)
- Write failing tests in `PopularListings.test.tsx`
  - Test listings carousel renders
  - Test ListingCard integration with dynamic data
  - Test carousel navigation (prev/next buttons)
  - Test "Show more" button navigation
  - Test empty state handling
  - Test loading state
- Implement PopularListings component
  - Create carousel container with navigation controls
  - Integrate ListingCard component in repeating pattern
  - Implement carousel navigation logic (lightweight, no heavy library)
  - Add loading and empty states
  - Fetch listings data from API
  - Style with CSS modules (carousel grid, navigation buttons)
- Verify all tests pass
- Optimize for performance (lazy loading, intersection observer)

### 11. SupportSection Organism (TDD)
- Write failing tests in `SupportSection.test.tsx`
  - Test 4 support options render
  - Test icons and text display
  - Test click handlers (schedule call, FAQs, chat, email)
  - Test responsive grid
- Implement SupportSection component
  - Create grid layout for 4 support options
  - Define support option data
  - Integrate SupportOption molecule
  - Add click handlers for each option
  - Style with CSS modules (responsive grid)
- Verify all tests pass

### 12. Island Mount Scripts
- Create `app/split-lease/islands/hero.tsx`
  - Implement mountHero function with auto-hydration
  - Parse data attributes from mount point
  - Handle SSR/CSR compatibility
  - Add error handling for missing mount point
- Create `app/split-lease/islands/schedule-selector.tsx`
  - Implement mountScheduleSelector function
  - Add URL parameter state synchronization
  - Handle manual mount override
- Create `app/split-lease/islands/popular-listings.tsx`
  - Implement mountPopularListings function
  - Add data fetching on mount
  - Handle loading and error states

### 13. Static HTML Page Assembly
- Create `app/split-lease/pages/index.html`
  - Add semantic HTML structure (header, main, sections, footer)
  - Define island mount points with unique IDs
  - Add data attributes for component props
  - Include meta tags (title, description, OG tags)
  - Add preload links for critical resources
  - Include ESM module script imports
  - Add fallback content for non-JS users
- Create `app/split-lease/pages/css/home.css`
  - Page-specific layout styles
  - Section spacing and rhythm
  - Responsive breakpoints
- Create shared CSS files (if not exist)
  - `shared/css/variables.css` - CSS custom properties (colors, spacing, typography)
  - `shared/css/reset.css` - CSS reset/normalize
  - `shared/css/global.css` - Global typography and base styles

### 14. State Management Implementation
- Create `app/split-lease/api/schedule.ts`
  - Implement URL parameter state management
  - Functions: getSelectedDays, setSelectedDays, clearSelection
  - Add state persistence logic
  - Add validation for day indices (0-6)
- Update SearchScheduleSelector to use state management
  - Integrate schedule state API
  - Add URL parameter updates on selection
  - Add state restoration on mount
  - Add tests for state persistence

### 15. API Integration
- Create `app/split-lease/api/listings.ts` (if not exists)
  - Implement searchListings function
  - Add runtime validation with Zod
  - Add error handling and retry logic
  - Add caching strategy
  - Type-safe response handling
- Update PopularListings to fetch real data
  - Integrate listings API
  - Add loading spinner
  - Add error boundary
  - Add retry mechanism
  - Update tests to use MSW mocks

### 16. Integration Testing
- Create `app/split-lease/tests/integration/homepage-workflow.test.tsx`
  - Test full user journey: land on page → select schedule → view listings → navigate
  - Test schedule selector + listings integration
  - Test state persistence across interactions
  - Test authentication state conditional rendering
  - Test error recovery flows
- Run integration test suite
- Fix any failures
- Verify all integration tests pass

### 17. E2E Testing Execution
- Run full E2E test suite (`npm run test:e2e`)
  - Execute all 72 test scenarios from TDD suite
  - Generate Playwright HTML report
  - Identify and fix failures
  - Re-run until all tests pass
- Add visual regression testing (optional)
  - Take screenshots of key states
  - Compare against baseline
  - Flag visual changes for review

### 18. Accessibility Audit
- Run jest-axe on all components
  - Fix any accessibility violations
  - Ensure WCAG 2.1 AA compliance
  - Add ARIA labels where needed
  - Test keyboard navigation
  - Test screen reader compatibility
- Run Lighthouse accessibility audit
  - Achieve score > 90
  - Fix any flagged issues
- Manual accessibility testing
  - Test with keyboard only
  - Test with screen reader (NVDA/JAWS)
  - Verify color contrast ratios

### 19. Performance Optimization
- Run Lighthouse performance audit
  - Measure TTI, FCP, LCP, CLS
  - Identify bottlenecks
  - Optimize as needed
- Implement code splitting
  - Split islands into separate bundles
  - Lazy load non-critical components
  - Implement dynamic imports
- Optimize images
  - Add responsive images (srcset)
  - Implement lazy loading
  - Use modern formats (WebP with fallbacks)
  - Add blur-up placeholders
- Optimize CSS
  - Remove unused styles
  - Implement critical CSS inlining
  - Defer non-critical CSS
- Optimize JavaScript
  - Minimize bundle size
  - Tree shake unused code
  - Minify and compress
- Verify performance budgets met
  - TTI < 3s
  - FCP < 1.5s
  - Bundle size < 250KB per entry point

### 20. Documentation
- Add inline documentation (JSDoc) to all components
  - Document component purpose
  - Document props with types and descriptions
  - Add usage examples
  - Document edge cases and gotchas
- Update component README files
  - Add component overview
  - Add props API documentation
  - Add usage examples
  - Add testing instructions
- Create homepage-specific documentation
  - Document islands architecture
  - Document state management patterns
  - Document API integration
  - Add deployment instructions

### 21. Build Configuration for Cloudflare
- Create `app/split-lease/scripts/build-homepage.js`
  - Generate static HTML with inlined critical CSS
  - Build ESM component bundles
  - Build island mount scripts
  - Copy assets to dist folder
  - Generate asset manifest
  - Add source maps for debugging
- Create `app/split-lease/scripts/optimize-assets.js`
  - Compress images
  - Generate responsive image variants
  - Minify CSS and JS
  - Generate Brotli compressed versions
- Update `package.json` scripts
  - Add `build:homepage` script
  - Add `optimize:assets` script
  - Add `deploy:cloudflare` script
- Configure Vite for Cloudflare
  - Set build target for modern browsers
  - Enable module preload
  - Configure chunk splitting strategy
  - Enable Brotli compression

### 22. Cloudflare Pages Configuration
- Create `wrangler.toml` (if not exists)
  - Configure routes
  - Set build command
  - Set output directory
  - Configure environment variables
  - Add custom headers (caching, security)
- Create `_headers` file for Cloudflare Pages
  - Set cache headers for static assets
  - Add security headers (CSP, HSTS)
  - Configure CORS if needed
- Create `_redirects` file
  - Add redirects for legacy URLs
  - Add redirects for SEO (www → non-www)
- Test build locally
  - Run `npm run build:homepage`
  - Serve dist folder with local server
  - Verify all assets load correctly
  - Verify islands hydrate correctly

### 23. CI/CD Pipeline Setup
- Create `.github/workflows/homepage-ci.yml`
  - Run on push to feature branch
  - Install dependencies
  - Run type checking
  - Run unit tests with coverage
  - Run integration tests
  - Run E2E tests
  - Generate test reports
  - Upload artifacts
- Create `.github/workflows/homepage-deploy.yml`
  - Run on merge to main branch
  - Run full test suite
  - Build production bundle
  - Optimize assets
  - Deploy to Cloudflare Pages
  - Run smoke tests on deployed site
  - Notify on success/failure

### 24. Final QA & Launch Preparation
- Run full test suite one final time
  - All 72 E2E scenarios passing
  - All unit tests passing (80%+ coverage)
  - All integration tests passing
  - No accessibility violations
  - Performance budgets met
- Conduct manual QA testing
  - Test on multiple browsers (Chrome, Firefox, Safari, Edge)
  - Test on multiple devices (desktop, tablet, mobile)
  - Test all user flows
  - Test error states
  - Test loading states
- Staging deployment
  - Deploy to staging environment
  - Run smoke tests
  - Conduct stakeholder review
  - Gather feedback and iterate
- Production deployment
  - Deploy to production (Cloudflare Pages)
  - Monitor error rates
  - Monitor performance metrics
  - Monitor user analytics
  - Verify SSL and custom domain
- Post-launch monitoring
  - Set up error tracking (Sentry or similar)
  - Set up performance monitoring (Web Vitals)
  - Set up analytics (GA4 or similar)
  - Create monitoring dashboard
  - Set up alerts for critical issues

## Testing Strategy

### Unit Tests
**Framework:** Vitest with React Testing Library
**Coverage Target:** 90%+ for components, 100% for utilities
**Location:** `app/split-lease/components/src/**/*.test.tsx`

**Test Categories:**
1. **Rendering Tests**
   - Components render without errors
   - Props are correctly applied
   - Conditional rendering based on props
   - Default props work correctly

2. **Interaction Tests**
   - User interactions trigger correct handlers
   - State updates trigger re-renders
   - Form validation works correctly
   - Navigation functions correctly

3. **Accessibility Tests**
   - No jest-axe violations
   - Keyboard navigation works
   - ARIA attributes present and correct
   - Focus management working

4. **Edge Case Tests**
   - Null/undefined props handled gracefully
   - Empty data arrays handled
   - Error states render correctly
   - Loading states render correctly

**Example Test Structure:**
```typescript
describe('ListingCard', () => {
  describe('Rendering', () => {
    it('should render with default props', () => { /* ... */ });
    it('should apply custom className', () => { /* ... */ });
  });

  describe('Conditional Formatting', () => {
    it('should display "Studio" when bedrooms = 0', () => { /* ... */ });
    it('should display "[X] bed" when bedrooms > 0', () => { /* ... */ });
  });

  describe('Accessibility', () => {
    it('should have no axe violations', async () => { /* ... */ });
  });
});
```

### Integration Tests
**Framework:** Vitest with React Testing Library + MSW
**Coverage Target:** All component interactions
**Location:** `app/split-lease/tests/integration/`

**Test Scenarios:**
1. **Schedule Selector + Listings Integration**
   - Selecting days updates listings
   - URL parameters sync correctly
   - State persists across interactions

2. **Authentication State Integration**
   - Header displays differently when logged in/out
   - User-specific data displays correctly
   - Protected interactions require auth

3. **Form Submission Workflows**
   - Referral form submits correctly
   - Import listing form validates and submits
   - Success/error messages display

### E2E Tests
**Framework:** Playwright (via MCP)
**Coverage Target:** All 72 scenarios from TDD suite
**Location:** `app/split-lease/tests/e2e/home.spec.ts`

**Test Categories:**
1. **P0 - Critical Path (8 tests)** - Core page structure and functionality
2. **Reusable Components (18 tests)** - Comprehensive component testing
3. **Dynamic Data Bindings (8 tests)** - Data rendering and updates
4. **State Management (12 tests)** - URL parameters, workflows, persistence
5. **Plugin Integration (8 tests)** - Third-party integrations (if any)
6. **Responsive Design (8 tests)** - Mobile, tablet, desktop layouts
7. **Conditional Rendering (10 tests)** - Auth state, data conditions

**Performance Tests:**
- Lighthouse CI integration
- Bundle size monitoring
- TTI/FCP measurements
- Custom metrics tracking

### Edge Cases

**Data Edge Cases:**
- Empty listings array
- Listings with missing images
- Listings with 0 bedrooms (Studio)
- Listings with null/undefined fields
- API errors and timeout scenarios
- Network offline scenarios

**User Interaction Edge Cases:**
- No days selected in schedule selector
- All days selected in schedule selector
- Rapid clicking on day buttons
- Browser back/forward navigation
- Page refresh during interaction
- Concurrent state updates

**Responsive Edge Cases:**
- Very small screens (< 320px)
- Very large screens (> 2560px)
- Touch vs mouse interactions
- Portrait vs landscape orientations
- High DPI/Retina displays
- Slow network conditions

**Accessibility Edge Cases:**
- Keyboard-only navigation
- Screen reader usage
- High contrast mode
- Reduced motion preference
- Focus trap scenarios
- ARIA live region updates

## Acceptance Criteria

### Functional Requirements
- [ ] Homepage loads successfully at root URL
- [ ] All sections render in correct order (Hero, Benefits, Schedule Types, Flexibility, Listings, Support, Footer)
- [ ] Schedule selector displays 7 day buttons (S, M, T, W, T, F, S)
- [ ] Selecting days updates URL parameters
- [ ] Check-in/check-out text updates dynamically based on selection
- [ ] Schedule selection persists across page reload
- [ ] Popular listings carousel displays at least 4 listings
- [ ] Carousel navigation buttons work (prev/next)
- [ ] Listing cards display: image, location, bedroom count, price
- [ ] Bedroom count displays "Studio" for 0 bedrooms, "[X] bed" for > 0
- [ ] All CTA buttons navigate to correct destinations
- [ ] Support options are clickable and functional
- [ ] Referral form accepts email/phone input
- [ ] Import listing form validates URL and email inputs

### Performance Requirements
- [ ] Time to Interactive (TTI) < 3 seconds
- [ ] First Contentful Paint (FCP) < 1.5 seconds
- [ ] Largest Contentful Paint (LCP) < 2.5 seconds
- [ ] Cumulative Layout Shift (CLS) < 0.1
- [ ] Total bundle size < 250KB per entry point
- [ ] Images optimized and lazy loaded
- [ ] Critical CSS inlined in HTML
- [ ] Lighthouse performance score > 90

### Quality Requirements
- [ ] All 72 E2E test scenarios passing
- [ ] Unit test coverage > 90% for components
- [ ] Unit test coverage = 100% for utilities
- [ ] Integration tests passing
- [ ] Zero TypeScript errors (strict mode)
- [ ] Zero ESLint warnings
- [ ] Zero accessibility violations (jest-axe + Lighthouse)
- [ ] WCAG 2.1 AA compliant
- [ ] Lighthouse accessibility score > 90

### Browser Compatibility
- [ ] Works on Chrome (latest 2 versions)
- [ ] Works on Firefox (latest 2 versions)
- [ ] Works on Safari (latest 2 versions)
- [ ] Works on Edge (latest 2 versions)
- [ ] Mobile responsive (320px - 2560px)
- [ ] Touch interactions work on mobile
- [ ] Keyboard navigation works

### Documentation Requirements
- [ ] All components have JSDoc comments
- [ ] Props documented with types and descriptions
- [ ] Usage examples provided
- [ ] README updated with homepage information
- [ ] Architecture decisions documented
- [ ] Deployment instructions documented

### Deployment Requirements
- [ ] Builds successfully for production
- [ ] Deploys to Cloudflare Pages without errors
- [ ] SSL configured and working
- [ ] Custom domain configured (if applicable)
- [ ] Caching headers configured correctly
- [ ] Security headers configured (CSP, HSTS)
- [ ] Analytics tracking implemented
- [ ] Error monitoring configured

## Validation Commands

Execute these commands to validate the feature is complete:

### Type Checking
```bash
cd app/split-lease/components
npm run type-check
```
**Expected:** No TypeScript errors

### Linting
```bash
cd app/split-lease/components
npm run lint
```
**Expected:** No ESLint warnings or errors

### Unit Tests
```bash
cd app/split-lease/components
npm run test
```
**Expected:** All tests passing, coverage > 90%

### Unit Tests with Coverage
```bash
cd app/split-lease/components
npm run test:coverage
```
**Expected:** Coverage report showing:
- Lines: > 90%
- Functions: > 90%
- Branches: > 90%
- Statements: > 90%

### Integration Tests
```bash
cd app/split-lease
npm run test:integration
```
**Expected:** All integration tests passing

### E2E Tests
```bash
cd app/split-lease
npm run test:e2e
```
**Expected:** All 72 test scenarios passing

### E2E Tests with Report
```bash
cd app/split-lease
npm run test:e2e -- --reporter=html
npx playwright show-report
```
**Expected:** HTML report showing all tests passing, open in browser

### Build for Production
```bash
cd app/split-lease
npm run build:homepage
```
**Expected:** Build completes successfully, dist/ folder contains optimized files

### Asset Optimization
```bash
cd app/split-lease
npm run optimize:assets
```
**Expected:** Assets optimized and compressed

### Lighthouse CI
```bash
cd app/split-lease
npm run lighthouse
```
**Expected:**
- Performance: > 90
- Accessibility: > 90
- Best Practices: > 90
- SEO: > 90

### Bundle Size Check
```bash
cd app/split-lease
npm run build:homepage && npm run analyze-bundle
```
**Expected:** Bundle size report showing < 250KB per entry point

### Serve Build Locally
```bash
cd app/split-lease
npm run build:homepage && npm run preview
```
**Expected:** Local server starts, homepage accessible at http://localhost:4173

### Manual Browser Testing
**Chrome:**
```bash
# Open in Chrome
start chrome http://localhost:4173
```

**Firefox:**
```bash
# Open in Firefox
start firefox http://localhost:4173
```

**Safari:**
```bash
# Open in Safari (macOS)
open -a Safari http://localhost:4173
```

**Expected:** Page loads and functions correctly in all browsers

### Accessibility Testing
```bash
cd app/split-lease
npm run test:a11y
```
**Expected:** Zero accessibility violations

### Deploy to Cloudflare (Staging)
```bash
cd app/split-lease
npm run deploy:staging
```
**Expected:** Deployment succeeds, staging URL accessible

### Deploy to Cloudflare (Production)
```bash
cd app/split-lease
npm run deploy:production
```
**Expected:** Deployment succeeds, production URL accessible with SSL

### Post-Deployment Smoke Tests
```bash
cd app/split-lease
npm run test:smoke -- --base-url=https://split.lease
```
**Expected:** All smoke tests passing on live site

## Notes

### Technology Stack Decisions

**Core Technologies:**
- **React 18** - Component library with hooks and concurrent features
- **TypeScript** - Type safety and developer experience
- **Vite** - Fast build tool with ESM support and HMR
- **CSS Modules** - Scoped styling to prevent conflicts
- **Zod** - Runtime type validation for API boundaries

**Testing Stack:**
- **Vitest** - Fast unit testing with Vite integration
- **React Testing Library** - Component testing utilities
- **Playwright (MCP)** - E2E testing via Model Context Protocol
- **MSW (Mock Service Worker)** - API mocking for tests
- **jest-axe** - Accessibility testing

**Deployment:**
- **Cloudflare Pages** - Static site hosting with edge CDN
- **Cloudflare Workers** (future) - Serverless functions for API

### Dependencies to Add

```bash
cd app/split-lease/components

# Core dependencies (if not already present)
npm install react@^18 react-dom@^18
npm install zustand  # Lightweight state management
npm install clsx     # Conditional className utility

# Development dependencies
npm install -D @types/react @types/react-dom
npm install -D @testing-library/react @testing-library/user-event
npm install -D @testing-library/jest-dom
npm install -D vitest @vitest/ui
npm install -D jest-axe
npm install -D msw
npm install -D @faker-js/faker  # Test data generation
npm install -D lighthouse-ci    # Performance testing
```

### Image Assets Required

**Hero Section:**
- `hero-left.jpg` - Left background image (1200x800px, WebP + fallback)
- `hero-right.jpg` - Right background image (1200x800px, WebP + fallback)

**Benefits Section Icons:**
- `icon-computer-click.svg` - "100s of Split Leases" icon
- `icon-city-skyline.svg` - "Financially optimal" icon
- `icon-storage-safety.svg` - "Safely store items" icon
- `icon-calendar-return.svg` - "Same room, same bed" icon

**Schedule Type Animations:**
- Replace Lottie with CSS animations or static images
- `animation-weekend.svg` or CSS keyframes
- `animation-weeks-of-month.svg` or CSS keyframes
- `animation-weeknight.svg` or CSS keyframes

**Flexibility Section:**
- `flexibility-1.jpg` - Furnished spaces image
- `flexibility-2.jpg` - Storage/workspace image
- `flexibility-3.jpg` - Neighborhood variety image

**Support Section Icons:**
- `icon-schedule-call.svg`
- `icon-faqs.svg`
- `icon-live-chat.svg`
- `icon-email.svg`

**Logo:**
- `logo.svg` - Split Lease logo (header)
- `logo-light.svg` - Light version for dark backgrounds

### Future Enhancements (Out of Scope for This Feature)

- User authentication system integration
- Real-time availability updates via WebSockets
- Advanced filtering (price range, amenities, location)
- Interactive map integration for listings
- User reviews and ratings display
- Booking flow implementation
- Payment processing integration
- Host dashboard for managing listings
- Admin dashboard for platform management
- Multilingual support (i18n)
- Dark mode theme
- Progressive Web App (PWA) capabilities

### Migration from Bubble.io Considerations

**Data Model Mapping:**
- Bubble's "Listing" type → TypeScript Listing interface + Zod schema
- Bubble's "User" type → TypeScript User interface + Zod schema
- Bubble's custom states → URL parameters + React state
- Bubble's workflows → React event handlers + API calls

**Plugin Replacements:**
- Bubble LottieFiles plugin → CSS animations or lottie-web npm package
- Bubble List Shifter PRO → Custom carousel with CSS scroll-snap
- Bubble JS2Bubble → Native React state management
- Bubble Imgix integration → Next.js Image or Cloudflare Images (future)

**State Management Migration:**
- Bubble URL parameters → React Router or Next.js router with shallow routing
- Bubble custom states → Zustand or React Context
- Bubble group focus → Conditional rendering with React state

**Known Issues to Address:**
1. **Lottie conflicts** - Use single lottie-web instance, not multiple plugin instances
2. **Tailwind CDN** - Build Tailwind into production bundle instead of CDN
3. **Form validation** - Implement client-side validation with Zod before API calls
4. **ResizeObserver errors** - Debounce resize handlers to prevent loop warnings

### Architectural Patterns to Follow

**Ten Commandments of Architecture (from architectural-bible.md):**
1. Write self-documenting code (JSDoc on everything)
2. Maintain single source of truth (derive, don't duplicate)
3. Test every path (80%+ coverage, TDD)
4. Respect the type system (no `any`, runtime validation)
5. Embrace immutability (const, no mutations)
6. Separate concerns (one responsibility per module)
7. Handle errors gracefully (user-friendly messages, logging)
8. Optimize for change (configuration over hard-coding)
9. Measure everything (performance, errors, analytics)
10. Document intent, not implementation (explain WHY)

**Islands Architecture Pattern:**
- Static HTML base with semantic markup
- React components mounted as "islands" at specific points
- Islands hydrate independently for optimal performance
- Non-critical islands can lazy load
- Data attributes pass props from HTML to islands
- Auto-hydration on DOMContentLoaded
- Manual mount override for advanced use cases

**Atomic Design Pattern:**
- **Atoms** - Basic building blocks (Button, Input, Icon)
- **Molecules** - Simple combinations (ListingCard, BenefitCard)
- **Organisms** - Complex components (HeroSection, PopularListings)
- **Templates** - Page layouts (HomePage template)
- **Pages** - Specific instances (index.html with data)

**TDD Red-Green-Refactor Cycle:**
1. **Red** - Write failing test that describes desired behavior
2. **Green** - Write minimal code to make test pass
3. **Refactor** - Improve code quality while keeping tests green
4. Repeat for each new requirement

### Performance Optimization Strategies

**Code Splitting:**
- Split each island into separate bundle
- Dynamic imports for non-critical features
- Preload critical resources in HTML `<head>`
- Module preload for island scripts

**Image Optimization:**
- WebP format with JPEG/PNG fallbacks
- Responsive images (srcset, sizes)
- Lazy loading below the fold
- Blur-up placeholders for perceived performance
- Critical images preloaded in HTML

**CSS Optimization:**
- Critical CSS inlined in HTML `<head>`
- Non-critical CSS deferred with media="print" trick
- CSS Modules for automatic scoping and tree-shaking
- CSS custom properties for theming

**JavaScript Optimization:**
- ESM modules for optimal tree-shaking
- Minification and compression (Terser, Brotli)
- Code splitting by route/island
- Minimal runtime overhead (avoid large frameworks)

**Caching Strategy:**
- Static assets cached at Cloudflare edge (1 year)
- HTML cached with short TTL (5 minutes) for content updates
- API responses cached at edge when appropriate
- Service worker for offline support (future enhancement)

### Monitoring and Analytics

**Error Tracking:**
- Sentry integration for client-side errors
- Error boundaries to catch React errors
- Structured logging with context
- Alert on critical errors (5xx, high error rate)

**Performance Monitoring:**
- Web Vitals tracking (LCP, FID, CLS, TTFB)
- Custom metrics (TTI, component render time)
- Real User Monitoring (RUM) for production
- Synthetic monitoring for uptime

**Analytics:**
- Google Analytics 4 or similar
- Track key user actions (schedule selection, CTA clicks)
- Conversion funnel analysis
- A/B testing framework (future)

### Security Considerations

**Content Security Policy (CSP):**
- Strict CSP headers via `_headers` file
- Whitelist trusted domains for scripts/styles
- No inline scripts (use ESM modules)
- Nonce or hash for any required inline content

**HTTPS Enforcement:**
- Cloudflare automatic HTTPS
- HSTS header with long max-age
- Secure cookies (SameSite, Secure flags)

**Input Validation:**
- Client-side validation with Zod schemas
- Server-side validation (backend responsibility)
- XSS prevention (React auto-escaping, DOMPurify for HTML)
- CSRF protection for form submissions

**Dependency Security:**
- Regular `npm audit` checks
- Dependabot for automated updates
- Lock file committed to git
- Review dependencies before adding

---

## Development Workflow Summary

### Day 1-2: Test Setup (Red Phase)
- Set up test infrastructure
- Write all 72 E2E tests (failing)
- Write unit tests for components (failing)
- Configure CI/CD pipeline

### Day 3-5: Component Implementation (Green Phase)
- Implement atomic components
- Implement molecule components
- Implement organism components
- Make all tests pass

### Day 6-7: Integration & Assembly
- Create static HTML page
- Implement island mount scripts
- Integrate API layer
- Wire up state management
- Pass integration tests

### Day 8-9: Testing & Optimization (Refactor Phase)
- Run full E2E suite and fix failures
- Optimize performance (code splitting, lazy loading)
- Accessibility audit and fixes
- Refactor for code quality

### Day 10: Deployment
- Configure Cloudflare Pages
- Set up CI/CD pipeline
- Deploy to staging
- QA testing
- Deploy to production
- Post-launch monitoring

---

**Total Estimated Effort:** 10 days (2 weeks sprint)

**Team Size:** 1 AI agent + 1 human reviewer

**Risk Level:** Low (following established patterns, comprehensive testing)

**Success Probability:** High (TDD approach, clear acceptance criteria, proven architecture)
