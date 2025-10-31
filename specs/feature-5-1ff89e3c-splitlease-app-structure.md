# Feature: SplitLease App Basic Project Structure

## Metadata
adw_id: `5`
prompt: `adw_plan_test_build_review

In the app project directory, get started with a basic project structure for a marketplace app called splitlease. This is the rebirth of our app splitlease(previously built on bubble), in code. The context for the app structure, is provided(local paths): C:\Users\Split Lease\splitleaseteam\!Agent Context and Tools\SL1\TAC\Context\Architecture.

Do not start of with any page, component. just get started with a basic file structure.`

## Feature Description
This feature establishes the foundational project structure for the SplitLease marketplace application, transitioning from a no-code Bubble.io implementation to a modern, AI-native codebase built with TypeScript, React, and Islands Architecture. The structure prioritizes testability, type safety, maintainability, and AI-agent development workflows.

The basic file structure will include:
- Directory organization following the Islands Architecture pattern
- TypeScript configuration for strict type safety
- Testing infrastructure with Vitest and Playwright
- Build system configuration with Vite
- Shared utilities and type definitions
- API client foundation
- Script automation for common tasks
- Documentation structure

This is NOT a feature implementation but rather the scaffolding that will enable rapid, AI-assisted development of the SplitLease marketplace.

## User Story
As a **developer and AI agent**
I want to **have a well-organized, type-safe project structure with clear separation of concerns**
So that **I can rapidly build features, write comprehensive tests, and maintain code quality while following architectural best practices**

## Problem Statement
The current SplitLease application exists on Bubble.io, a no-code platform that limits customization, scalability, and AI-agent integration. To rebuild the application in code, we need a solid foundation that:

1. Supports modern development practices (TypeScript, ESM, React)
2. Enables AI agents to understand and modify code effectively
3. Enforces architectural commandments (testing, type safety, documentation)
4. Provides clear separation between components, islands, pages, and business logic
5. Allows for incremental feature development without structural refactoring

Without this foundation, feature development would be chaotic, inconsistent, and difficult for AI agents to navigate.

## Solution Statement
Create a comprehensive directory structure following the Islands Architecture pattern as outlined in the architectural documentation. The structure will include:

1. **Component Library** (`app/split-lease/components/src/`) - Organized by atomic design principles with complete scaffolding for future components
2. **Islands** (`app/split-lease/islands/`) - React island mount scripts directory (empty initially)
3. **Pages** (`app/split-lease/pages/`) - Static HTML pages structure (existing, will be organized)
4. **Testing** (`app/split-lease/tests/`) - Comprehensive test structure (unit, integration, E2E, mocks)
5. **API Layer** (`app/split-lease/api/`) - Type-safe API client foundation
6. **Type Definitions** (`app/split-lease/types/`) - Shared TypeScript interfaces and schemas
7. **Scripts** (`app/split-lease/scripts/`) - Build and automation scripts
8. **Shared Assets** (`app/split-lease/pages/shared/`) - Common CSS, images, utilities

Each directory will include README files explaining its purpose and usage patterns, making it easy for both humans and AI agents to navigate the codebase.

## Relevant Files

### Existing Files
- `app/split-lease/components/package.json` - NPM configuration (needs updating)
- `app/split-lease/components/tsconfig.json` - TypeScript configuration (needs updating)
- `app/split-lease/components/vite.config.ts` - Vite build configuration (needs updating)
- `app/split-lease/pages/` - Existing HTML pages structure
- `README.md` - Project overview and documentation
- `Context/Architecture/architectural-bible.md` - Architectural guidelines
- `Context/Architecture/migration-guide.md` - Migration patterns

### New Files

#### h3 New Files

**Configuration Files:**
- `app/split-lease/.gitignore` - Git ignore patterns for the app
- `app/split-lease/package.json` - Root package.json for the entire app
- `app/split-lease/tsconfig.json` - Root TypeScript configuration
- `app/split-lease/vitest.config.ts` - Vitest testing configuration
- `app/split-lease/playwright.config.ts` - Playwright E2E configuration

**Directory Structure Documentation:**
- `app/split-lease/components/src/README.md` - Component library documentation
- `app/split-lease/islands/README.md` - Islands architecture explanation
- `app/split-lease/tests/README.md` - Testing standards and examples
- `app/split-lease/api/README.md` - API client usage guide
- `app/split-lease/types/README.md` - Type definitions guide
- `app/split-lease/scripts/README.md` - Build script documentation

**Foundational Code Files:**
- `app/split-lease/types/models.ts` - Core data model TypeScript interfaces
- `app/split-lease/types/api.ts` - API request/response types
- `app/split-lease/types/index.ts` - Type definitions export barrel
- `app/split-lease/api/client.ts` - Base API client class
- `app/split-lease/api/index.ts` - API exports
- `app/split-lease/tests/setup.ts` - Vitest test setup file
- `app/split-lease/tests/mocks/handlers.ts` - MSW mock handlers
- `app/split-lease/tests/mocks/server.ts` - MSW server setup
- `app/split-lease/tests/utils/factories.ts` - Test data factories
- `app/split-lease/scripts/build.js` - Build orchestration script
- `app/split-lease/scripts/deploy.js` - Deployment script stub

**Component Structure Scaffolding:**
- `app/split-lease/components/src/atomic/README.md` - Atomic components guide
- `app/split-lease/components/src/molecules/README.md` - Molecular components guide
- `app/split-lease/components/src/organisms/README.md` - Organism components guide
- `app/split-lease/components/src/templates/README.md` - Template components guide
- `app/split-lease/components/src/index.ts` - Component library exports

## Implementation Plan

### Phase 1: Foundation - Directory Structure
Create the core directory structure following the Islands Architecture pattern. Establish clear separation of concerns and make the structure self-documenting.

### Phase 2: Configuration Files
Set up TypeScript, Vite, Vitest, and Playwright configurations that enforce architectural commandments (strict types, comprehensive testing, bundle size limits).

### Phase 3: Type System Foundation
Create the foundational type definitions for the SplitLease domain model (Listings, Users, Bookings, etc.) with runtime validation using Zod.

### Phase 4: API Client Architecture
Implement the base API client with type-safe request/response handling, error management, and retry logic.

### Phase 5: Testing Infrastructure
Set up the complete testing ecosystem including Vitest configuration, MSW for API mocking, test data factories, and Playwright for E2E tests.

### Phase 6: Documentation
Create comprehensive README files for each major directory explaining purpose, patterns, and examples.

## Step by Step Tasks

### 1. Create Core Directory Structure
- Create `app/split-lease/islands/` directory for React island mount scripts
- Create `app/split-lease/tests/` directory structure:
  - `app/split-lease/tests/components/` for component unit tests
  - `app/split-lease/tests/integration/` for integration tests
  - `app/split-lease/tests/e2e/` for Playwright E2E tests
  - `app/split-lease/tests/mocks/` for MSW handlers
  - `app/split-lease/tests/utils/` for test utilities
- Create `app/split-lease/api/` directory for API client
- Create `app/split-lease/types/` directory for TypeScript definitions
- Create `app/split-lease/scripts/` directory for build automation
- Create `app/split-lease/components/src/atomic/` for atomic components
- Create `app/split-lease/components/src/molecules/` for molecular components
- Create `app/split-lease/components/src/organisms/` for organism components
- Create `app/split-lease/components/src/templates/` for template components

### 2. Set Up Root Configuration Files
- Create `app/split-lease/package.json` with workspace configuration and all dependencies
- Create `app/split-lease/.gitignore` with appropriate ignore patterns
- Update `app/split-lease/components/package.json` to align with root package.json
- Create `app/split-lease/tsconfig.json` as root TypeScript configuration
- Update `app/split-lease/components/tsconfig.json` to extend root config

### 3. Configure Testing Infrastructure
- Create `app/split-lease/vitest.config.ts` with coverage thresholds and test environment
- Create `app/split-lease/playwright.config.ts` for E2E testing
- Create `app/split-lease/tests/setup.ts` for Vitest global setup
- Create `app/split-lease/tests/mocks/handlers.ts` with example MSW handlers
- Create `app/split-lease/tests/mocks/server.ts` for MSW server configuration
- Create `app/split-lease/tests/utils/factories.ts` with test data factory examples

### 4. Establish Type System Foundation
- Create `app/split-lease/types/models.ts` with core domain models:
  - `SplitLease` interface and Zod schema
  - `User` interface and Zod schema
  - `Booking` interface and Zod schema
  - `Location`, `Amenity`, `Image` supporting types
- Create `app/split-lease/types/api.ts` with API types:
  - `APIResponse<T>` generic response type
  - `APIError` error type
  - `PaginatedResponse<T>` type
  - `SearchParams` interface
- Create `app/split-lease/types/index.ts` as barrel export

### 5. Build API Client Foundation
- Create `app/split-lease/api/client.ts` with base `SplitLeaseAPI` class:
  - Constructor with baseURL configuration
  - Private fetch wrapper with error handling
  - Type-safe request/response methods
  - Example `searchListings` method stub
- Create `app/split-lease/api/index.ts` exporting the API client singleton

### 6. Update Vite Configuration
- Update `app/split-lease/components/vite.config.ts` to:
  - Configure ESM output with proper externals
  - Set up CSS Modules
  - Configure path aliases (`@components`, `@types`, etc.)
  - Add bundle size budgets
  - Configure island entry points

### 7. Create Documentation Structure
- Create `app/split-lease/components/src/README.md` explaining component library structure
- Create `app/split-lease/islands/README.md` explaining islands architecture
- Create `app/split-lease/tests/README.md` with testing guidelines and examples
- Create `app/split-lease/api/README.md` with API client usage patterns
- Create `app/split-lease/types/README.md` explaining type system organization
- Create `app/split-lease/scripts/README.md` documenting build scripts
- Create `app/split-lease/components/src/atomic/README.md` for atomic design pattern
- Create `app/split-lease/components/src/molecules/README.md`
- Create `app/split-lease/components/src/organisms/README.md`
- Create `app/split-lease/components/src/templates/README.md`

### 8. Create Build Scripts
- Create `app/split-lease/scripts/build.js` for orchestrating the build process
- Create `app/split-lease/scripts/deploy.js` as deployment script stub
- Add npm scripts to `app/split-lease/package.json`:
  - `dev` - Start Vite dev server
  - `build` - Full production build
  - `test` - Run Vitest unit tests
  - `test:watch` - Run tests in watch mode
  - `test:coverage` - Generate coverage report
  - `test:e2e` - Run Playwright E2E tests
  - `type-check` - Run TypeScript compiler check
  - `lint` - Run ESLint
  - `format` - Run Prettier

### 9. Create Component Structure Scaffolding
- Create `app/split-lease/components/src/index.ts` with example exports structure
- Create placeholder README files in each atomic design directory
- Document component creation patterns
- Add JSDoc examples for future components

### 10. Validate Structure
- Run TypeScript compilation to ensure all configs are valid
- Verify all directories are created correctly
- Ensure all package.json dependencies are compatible
- Test that build scripts execute without errors
- Confirm git ignores are working properly

## Testing Strategy

### Unit Tests
Since this is a structural feature, unit tests will focus on:
- **Configuration Validation**: Tests that TypeScript, Vite, and test configs are valid
- **Type System Tests**: Tests that Zod schemas properly validate example data
- **API Client Tests**: Tests for the base API client error handling and request formatting
- **Factory Tests**: Tests that test data factories generate valid objects

### Edge Cases
- **Missing Directories**: Ensure build scripts handle missing directories gracefully
- **Invalid Configuration**: Test that invalid tsconfig or vite config produces helpful errors
- **Import Path Resolution**: Test that path aliases resolve correctly
- **Type Validation Failures**: Test that Zod schemas reject invalid data appropriately

## Acceptance Criteria
1. **Directory Structure Complete**: All directories listed in the implementation plan exist
2. **Configuration Valid**: `npm run type-check` passes without errors
3. **Build System Functional**: `npm run build` completes successfully
4. **Tests Runnable**: `npm run test` and `npm run test:e2e` execute (even if no tests exist yet)
5. **Documentation Present**: Every major directory has a README explaining its purpose
6. **Type System Operational**: Can import and use types from `app/split-lease/types/`
7. **API Client Importable**: Can import and instantiate API client
8. **Git Ignore Working**: node_modules, dist, coverage directories are ignored
9. **Path Aliases Functional**: Can import using `@components`, `@types`, etc.
10. **No TypeScript Errors**: Entire project compiles with zero errors

## Validation Commands
Execute these commands to validate the feature is complete:

### 1. Verify Directory Structure
```bash
# List all created directories
find app/split-lease -type d -not -path "*/node_modules/*" -not -path "*/.git/*"
```

### 2. Validate TypeScript Configuration
```bash
# Navigate to app directory
cd app/split-lease

# Check TypeScript compilation
npm run type-check
```

### 3. Verify Build System
```bash
# Navigate to app directory
cd app/split-lease

# Run full build
npm run build
```

### 4. Test Infrastructure Validation
```bash
# Navigate to app directory
cd app/split-lease

# Run unit tests (should execute setup even with no tests)
npm run test -- --run

# Verify E2E config is valid
npx playwright test --list
```

### 5. Verify Package Installation
```bash
# Navigate to app directory
cd app/split-lease

# Install all dependencies
npm install

# Verify no vulnerabilities
npm audit --audit-level=moderate
```

### 6. Validate Import Paths
```bash
# Navigate to app directory
cd app/split-lease

# Test that TypeScript can resolve path aliases
npx tsc --noEmit --showConfig
```

### 7. Check Git Ignore
```bash
# Verify ignored files aren't tracked
git status --ignored
```

### 8. Verify Documentation
```bash
# Count README files (should have at least 10)
find app/split-lease -name "README.md" -not -path "*/node_modules/*" | wc -l
```

## Notes

### Dependencies Required
The root `package.json` will include:

**Core Dependencies:**
- `react@^18.0.0` - UI library
- `react-dom@^18.0.0` - React DOM renderer
- `zod@^3.22.0` - Runtime type validation

**Dev Dependencies:**
- `typescript@^5.0.0` - Type system
- `vite@^5.0.0` - Build tool
- `@vitejs/plugin-react@^4.0.0` - React plugin for Vite
- `vitest@^1.0.0` - Unit test framework
- `@vitest/ui@^1.0.0` - Test UI
- `@testing-library/react@^14.0.0` - React testing utilities
- `@testing-library/jest-dom@^6.0.0` - DOM matchers
- `@testing-library/user-event@^14.0.0` - User interaction simulation
- `@playwright/test@^1.40.0` - E2E testing
- `msw@^2.0.0` - API mocking
- `@faker-js/faker@^8.0.0` - Test data generation
- `jest-axe@^8.0.0` - Accessibility testing
- `eslint@^8.0.0` - Linting
- `prettier@^3.0.0` - Code formatting

### Future Considerations
- **Monorepo Structure**: May convert to Turborepo or Nx in the future
- **Server Components**: Consider adding React Server Components when stable
- **State Management**: Will add Zustand or similar when needed for complex state
- **Authentication**: Auth0 or similar integration in future features
- **Payment Processing**: Stripe integration planned
- **Image Optimization**: Sharp or similar for image processing

### AI Agent Context
This structure is optimized for AI agent development:
- Every directory has a README explaining its purpose
- TypeScript provides strong type hints for AI understanding
- Test factories make it easy to generate test data
- Clear separation of concerns guides AI decision-making
- Architectural commandments documented inline

### Migration from Bubble
This structure prepares for gradual migration:
- Types match Bubble data models
- API client can integrate with Bubble backend initially
- Islands architecture allows incremental React adoption
- Pages can be migrated one at a time
