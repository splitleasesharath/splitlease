# Feature: Basic Project Structure for SplitLease Marketplace App

## Metadata
adw_id: `6`
prompt: `In the app project directory, get started with a basic project structure for a marketplace app called splitlease. This is the rebirth of our app splitlease(previously built on bubble), in code. The context for the app structure, is provided(local paths): C:\Users\Split Lease\splitleaseteam\!Agent Context and Tools\SL1\TAC\Context\Architecture. Do not start of with any page, component. just get started with a basic file structure.`

## Feature Description
This feature establishes the foundational directory structure and configuration files for the SplitLease marketplace application. The structure follows the Islands Architecture pattern with ESM modules, React components, and static HTML pages. This is a complete rebuild of the original Bubble-based SplitLease app using modern web development practices optimized for AI-agent development, type safety, testability, and maintainability.

The structure will support a marketplace where users can rent properties for specific days of the week (weeknights, weekends, or custom schedules). The architecture separates concerns into components (React library), islands (mount points), pages (static HTML), API layer (type-safe client), and comprehensive testing infrastructure.

## User Story
As a **development team**
I want to **establish a well-organized, scalable project structure**
So that **we can build the SplitLease marketplace app with clear separation of concerns, excellent maintainability, and optimal support for AI-agent development**

## Problem Statement
The SplitLease application was previously built on Bubble (a no-code platform) and needs to be rebuilt in code using modern web development practices. Without a proper foundational structure, the codebase would become difficult to maintain, test, and scale. The structure must be optimized for AI-agent development, ensuring every file and directory has a clear purpose and follows established architectural principles.

Currently, the `app/split-lease` directory only contains partial structures:
- `components/` directory exists with some React components
- `pages/` directory exists with some HTML files
- Missing: API layer, type definitions, comprehensive testing infrastructure, proper island mount scripts, utility functions, and build/deployment scripts

## Solution Statement
Create a comprehensive directory structure that follows the Islands Architecture pattern and adheres to the Split Lease Architectural Bible. The structure will include:

1. **Component Library** (`components/`) - Reusable React components built as ESM modules with CSS modules
2. **Island Mount Points** (`islands/`) - Entry points for mounting React components into static HTML
3. **Static Pages** (`pages/`) - HTML pages with embedded island mount points and shared assets
4. **API Layer** (`api/`) - Type-safe API client with runtime validation
5. **Type Definitions** (`types/`) - Shared TypeScript interfaces and schemas
6. **Testing Infrastructure** (`tests/`) - Unit, integration, and E2E test suites
7. **Utility Functions** (`utils/`) - Shared helper functions and constants
8. **Build Scripts** (`scripts/`) - Build, deployment, and development tools
9. **Configuration Files** - TypeScript, build tools, testing frameworks, and linting

This structure will provide a solid foundation for building out features while maintaining code quality, testability, and AI-agent readability.

## Relevant Files

### Existing Files (to be verified/updated)
- `app/split-lease/components/package.json` - Component library dependencies and scripts
- `app/split-lease/components/tsconfig.json` - TypeScript configuration for components
- `app/split-lease/components/vite.config.ts` - Vite build configuration
- `app/split-lease/components/src/index.ts` - Component library exports
- `app/split-lease/pages/index.html` - Home page
- `app/split-lease/pages/search/index.html` - Search/listings page
- `app/split-lease/pages/view-split-lease/index.html` - Listing detail page

### New Files

#### Root Configuration
- `app/split-lease/.eslintrc.json` - ESLint configuration for code quality
- `app/split-lease/.prettierrc` - Prettier configuration for consistent formatting
- `app/split-lease/.gitignore` - Git ignore patterns
- `app/split-lease/README.md` - Project documentation and getting started guide
- `app/split-lease/tsconfig.json` - Root TypeScript configuration
- `app/split-lease/package.json` - Root package configuration (workspace management)

#### API Layer
- `app/split-lease/api/client.ts` - Main API client class with methods for all endpoints
- `app/split-lease/api/config.ts` - API configuration (base URL, timeout, etc.)
- `app/split-lease/api/interceptors.ts` - Request/response interceptors for auth, logging
- `app/split-lease/api/types.ts` - API request/response types
- `app/split-lease/api/index.ts` - API layer exports

#### Type Definitions
- `app/split-lease/types/models.ts` - Domain models (Listing, User, Booking, etc.) with Zod schemas
- `app/split-lease/types/api.ts` - API-specific types (responses, errors, pagination)
- `app/split-lease/types/components.ts` - Shared component prop types
- `app/split-lease/types/utils.ts` - Utility type helpers
- `app/split-lease/types/index.ts` - Type exports

#### Islands
- `app/split-lease/islands/header.tsx` - Header component island mount point
- `app/split-lease/islands/footer.tsx` - Footer component island mount point
- `app/split-lease/islands/search-selector.tsx` - Search schedule selector island
- `app/split-lease/islands/listing-image-grid.tsx` - Listing image grid island
- `app/split-lease/islands/proposal-menu.tsx` - Proposal menu island
- `app/split-lease/islands/index.ts` - Island exports

#### Utilities
- `app/split-lease/utils/date.ts` - Date formatting and manipulation utilities
- `app/split-lease/utils/currency.ts` - Currency formatting utilities
- `app/split-lease/utils/validation.ts` - Common validation functions
- `app/split-lease/utils/storage.ts` - Local/session storage helpers
- `app/split-lease/utils/analytics.ts` - Analytics tracking utilities
- `app/split-lease/utils/logger.ts` - Logging utilities
- `app/split-lease/utils/constants.ts` - Application-wide constants
- `app/split-lease/utils/index.ts` - Utility exports

#### Testing Infrastructure
- `app/split-lease/tests/setup.ts` - Test environment setup (jsdom, mocks)
- `app/split-lease/tests/helpers.ts` - Test helper functions
- `app/split-lease/tests/factories.ts` - Test data factories using Faker
- `app/split-lease/tests/mocks/handlers.ts` - MSW mock API handlers
- `app/split-lease/tests/mocks/server.ts` - MSW server setup
- `app/split-lease/tests/mocks/browser.ts` - MSW browser setup
- `app/split-lease/tests/components/.gitkeep` - Placeholder for component tests
- `app/split-lease/tests/integration/.gitkeep` - Placeholder for integration tests
- `app/split-lease/tests/e2e/home.spec.ts` - E2E test for home page
- `app/split-lease/tests/e2e/search.spec.ts` - E2E test for search page
- `app/split-lease/tests/e2e/listing.spec.ts` - E2E test for listing detail page
- `app/split-lease/tests/vitest.config.ts` - Vitest configuration
- `app/split-lease/tests/playwright.config.ts` - Playwright configuration

#### Build & Deployment
- `app/split-lease/scripts/build-pages.js` - Script to process and optimize HTML pages
- `app/split-lease/scripts/build-components.js` - Script to build component library
- `app/split-lease/scripts/deploy.js` - Deployment script
- `app/split-lease/scripts/dev.js` - Development server script
- `app/split-lease/scripts/validate.js` - Pre-commit validation script

#### Pages Shared Assets
- `app/split-lease/pages/shared/css/variables.css` - CSS custom properties (design tokens)
- `app/split-lease/pages/shared/css/reset.css` - CSS reset
- `app/split-lease/pages/shared/css/global.css` - Global styles
- `app/split-lease/pages/shared/js/utils.js` - Vanilla JS utilities for pages
- `app/split-lease/pages/shared/js/mount-islands.js` - Island mounting helper

## Implementation Plan

### Phase 1: Foundation
Set up the core directory structure, configuration files, and tooling. This includes TypeScript configuration, build tooling, linting, formatting, and basic package management. Ensure all configuration files follow best practices from the Architectural Bible.

### Phase 2: Core Implementation
Create the essential files for each layer:
- Type definitions with Zod schemas for runtime validation
- API client layer with proper error handling
- Utility functions following the principle of single responsibility
- Island mount scripts for existing components
- Testing infrastructure with proper mocks and helpers

### Phase 3: Integration
Connect all the pieces together:
- Update build scripts to handle all layers
- Configure module resolution and path aliases
- Set up development workflow scripts
- Create comprehensive documentation
- Validate the structure with sample tests

## Step by Step Tasks

### 1. Create Root Configuration Files
- Create `app/split-lease/.gitignore` with patterns for node_modules, dist, coverage, etc.
- Create `app/split-lease/.eslintrc.json` with TypeScript-aware rules
- Create `app/split-lease/.prettierrc` with consistent formatting rules
- Create `app/split-lease/tsconfig.json` as root TypeScript configuration
- Update `app/split-lease/package.json` to include workspace configuration if needed

### 2. Set Up Directory Structure
- Create `app/split-lease/api/` directory
- Create `app/split-lease/types/` directory
- Create `app/split-lease/islands/` directory
- Create `app/split-lease/utils/` directory
- Create `app/split-lease/tests/` directory structure with subdirectories
- Create `app/split-lease/scripts/` directory
- Ensure `app/split-lease/pages/shared/` has proper subdirectories

### 3. Create Type Definitions Layer
- Create `app/split-lease/types/models.ts` with core domain models using Zod schemas
- Create `app/split-lease/types/api.ts` with API response types and error types
- Create `app/split-lease/types/components.ts` with shared component prop interfaces
- Create `app/split-lease/types/utils.ts` with utility type helpers
- Create `app/split-lease/types/index.ts` to export all types

### 4. Create API Client Layer
- Create `app/split-lease/api/config.ts` with API configuration constants
- Create `app/split-lease/api/interceptors.ts` with request/response interceptors
- Create `app/split-lease/api/types.ts` with API-specific types
- Create `app/split-lease/api/client.ts` with main API client class
- Create `app/split-lease/api/index.ts` to export API functionality

### 5. Create Utility Functions
- Create `app/split-lease/utils/constants.ts` with application-wide constants
- Create `app/split-lease/utils/date.ts` with date formatting utilities
- Create `app/split-lease/utils/currency.ts` with currency formatting
- Create `app/split-lease/utils/validation.ts` with common validation functions
- Create `app/split-lease/utils/storage.ts` with storage helpers
- Create `app/split-lease/utils/analytics.ts` with analytics tracking
- Create `app/split-lease/utils/logger.ts` with logging utilities
- Create `app/split-lease/utils/index.ts` to export utilities

### 6. Create Island Mount Points
- Create `app/split-lease/islands/header.tsx` for Header component mounting
- Create `app/split-lease/islands/footer.tsx` for Footer component mounting
- Create `app/split-lease/islands/search-selector.tsx` for SearchScheduleSelector mounting
- Create `app/split-lease/islands/listing-image-grid.tsx` for ListingImageGrid mounting
- Create `app/split-lease/islands/proposal-menu.tsx` for ProposalMenu mounting
- Create `app/split-lease/islands/index.ts` to export all mount functions

### 7. Set Up Testing Infrastructure
- Create `app/split-lease/tests/setup.ts` for test environment configuration
- Create `app/split-lease/tests/helpers.ts` with custom render functions and utilities
- Create `app/split-lease/tests/factories.ts` with test data factories
- Create `app/split-lease/tests/mocks/handlers.ts` with MSW handlers
- Create `app/split-lease/tests/mocks/server.ts` for Node test environment
- Create `app/split-lease/tests/mocks/browser.ts` for browser test environment
- Create `app/split-lease/tests/vitest.config.ts` with Vitest configuration
- Create `app/split-lease/tests/playwright.config.ts` with Playwright configuration
- Create placeholder E2E test files with basic structure

### 8. Create Build and Development Scripts
- Create `app/split-lease/scripts/build-components.js` for building React components
- Create `app/split-lease/scripts/build-pages.js` for processing HTML pages
- Create `app/split-lease/scripts/dev.js` for development server
- Create `app/split-lease/scripts/deploy.js` for deployment automation
- Create `app/split-lease/scripts/validate.js` for pre-commit validation

### 9. Create Shared Page Assets
- Create `app/split-lease/pages/shared/css/variables.css` with CSS custom properties
- Create `app/split-lease/pages/shared/css/reset.css` with CSS reset
- Create `app/split-lease/pages/shared/css/global.css` with global styles
- Create `app/split-lease/pages/shared/js/utils.js` with vanilla JS utilities
- Create `app/split-lease/pages/shared/js/mount-islands.js` with island mounting logic

### 10. Create Project Documentation
- Create `app/split-lease/README.md` with project overview, setup instructions, and development workflow
- Document the directory structure and purpose of each layer
- Include quick start commands and development guidelines
- Reference the Architectural Bible for detailed standards

### 11. Update Build Configuration
- Update `app/split-lease/components/vite.config.ts` to include proper build targets for islands
- Configure path aliases in tsconfig files for clean imports
- Set up module resolution for all layers
- Configure source maps for debugging

### 12. Validate Structure
- Create a sample unit test in `tests/components/` to verify test setup
- Create a sample integration test to verify API mock setup
- Run type checking across all files to ensure no errors
- Verify all imports resolve correctly
- Document any setup requirements in README

## Testing Strategy

### Unit Tests
- Test utility functions in isolation (date, currency, validation)
- Test API client methods with mocked responses
- Test island mount functions with mocked DOM
- Verify Zod schemas validate correctly for domain models
- Test error handling in API interceptors

### Integration Tests
- Test API client integration with MSW mocked endpoints
- Test island mounting with actual component rendering
- Test data flow from API client through components
- Verify type safety across boundaries

### Edge Cases
- Empty/null data handling in utilities
- API error responses and retry logic
- Browser compatibility for island mounting
- Module resolution and import paths
- Build output validation

### E2E Tests (Placeholder Structure)
- Basic page navigation tests
- Component island hydration verification
- Critical user flows (to be expanded later)

## Acceptance Criteria

- [ ] All directories are created with proper structure matching the README specification
- [ ] Root configuration files (.eslintrc.json, .prettierrc, tsconfig.json, .gitignore) are present
- [ ] Type definitions layer is complete with Zod schemas for core models
- [ ] API client layer is implemented with config, interceptors, and client class
- [ ] Utility functions are created for common operations (date, currency, validation, etc.)
- [ ] Island mount points are created for all existing components
- [ ] Testing infrastructure is set up with Vitest and Playwright configurations
- [ ] MSW mock setup is complete for API testing
- [ ] Build scripts are created for components, pages, and deployment
- [ ] Shared page assets (CSS variables, reset, global styles) are in place
- [ ] README.md documents the structure, setup, and development workflow
- [ ] All TypeScript files compile without errors
- [ ] Path aliases and module resolution work correctly
- [ ] At least one sample test runs successfully in each test category
- [ ] No hard-coded magic numbers or strings (all moved to constants)
- [ ] All files follow naming conventions from Architectural Bible
- [ ] JSDoc comments are present on all exported functions
- [ ] Directory structure matches the Islands Architecture pattern

## Validation Commands

Execute these commands to validate the feature is complete:

### Directory Structure Validation
```bash
# Verify all required directories exist
ls -la app/split-lease/api
ls -la app/split-lease/types
ls -la app/split-lease/islands
ls -la app/split-lease/utils
ls -la app/split-lease/tests
ls -la app/split-lease/scripts
ls -la app/split-lease/pages/shared/css
ls -la app/split-lease/pages/shared/js
```

### TypeScript Compilation
```bash
# Navigate to split-lease directory
cd app/split-lease

# Run TypeScript compiler check on all files
npx tsc --noEmit

# Check components specifically
cd components && npx tsc --noEmit
```

### File Existence Validation
```bash
# Verify key files exist
test -f app/split-lease/.gitignore && echo "✓ .gitignore exists"
test -f app/split-lease/.eslintrc.json && echo "✓ .eslintrc.json exists"
test -f app/split-lease/.prettierrc && echo "✓ .prettierrc exists"
test -f app/split-lease/README.md && echo "✓ README.md exists"
test -f app/split-lease/types/models.ts && echo "✓ types/models.ts exists"
test -f app/split-lease/api/client.ts && echo "✓ api/client.ts exists"
test -f app/split-lease/utils/index.ts && echo "✓ utils/index.ts exists"
test -f app/split-lease/tests/setup.ts && echo "✓ tests/setup.ts exists"
```

### Module Resolution Check
```bash
# Test imports resolve correctly
node -e "
const path = require('path');
const fs = require('fs');
const tsconfig = JSON.parse(fs.readFileSync('app/split-lease/tsconfig.json', 'utf8'));
console.log('TypeScript config paths:', tsconfig.compilerOptions?.paths);
"
```

### Test Infrastructure Validation
```bash
# Run test setup validation
cd app/split-lease/tests
npx vitest --version || echo "Vitest needs to be installed"
npx playwright --version || echo "Playwright needs to be installed"
```

### Build Script Validation
```bash
# Verify build scripts are executable
test -f app/split-lease/scripts/build-components.js && echo "✓ build-components.js exists"
test -f app/split-lease/scripts/build-pages.js && echo "✓ build-pages.js exists"
test -f app/split-lease/scripts/dev.js && echo "✓ dev.js exists"
test -f app/split-lease/scripts/deploy.js && echo "✓ deploy.js exists"
```

### Linting and Formatting Check
```bash
cd app/split-lease

# Run ESLint on TypeScript files (if configured)
npx eslint --ext .ts,.tsx . --max-warnings 0

# Run Prettier check
npx prettier --check "**/*.{ts,tsx,css,html,json,md}"
```

### Count Files Created
```bash
# Count new files created (excluding node_modules and dist)
find app/split-lease -type f \( -name "*.ts" -o -name "*.tsx" -o -name "*.js" -o -name "*.css" -o -name "*.json" -o -name "*.md" \) -not -path "*/node_modules/*" -not -path "*/dist/*" | wc -l
```

## Notes

### Design Decisions
- **Islands Architecture**: Chosen for optimal performance and progressive enhancement. Static HTML is enhanced with interactive React components only where needed.
- **ESM Modules**: Modern ES module system provides better tree-shaking and code splitting.
- **Zod for Runtime Validation**: TypeScript provides compile-time safety, but Zod ensures runtime safety at API boundaries.
- **MSW for Mocking**: Mock Service Worker provides realistic API mocking for both tests and development.
- **CSS Modules**: Component-scoped styling prevents global namespace pollution.
- **Monorepo-style Structure**: Clear separation between components (library), islands (mount points), pages (static), and supporting infrastructure.

### Dependencies to Add
When setting up, the following dependencies should be added using the package manager:

#### Production Dependencies
```bash
cd app/split-lease
npm install zod date-fns
```

#### Development Dependencies
```bash
cd app/split-lease
npm install -D @types/node eslint prettier typescript

cd components
npm install -D vitest @testing-library/react @testing-library/jest-dom @testing-library/user-event
npm install -D msw @faker-js/faker jest-axe
npm install -D playwright @playwright/test
npm install -D eslint-config-prettier eslint-plugin-react eslint-plugin-react-hooks
```

### Future Considerations
- **Server-Side Rendering**: Consider adding SSR for better SEO and initial page load performance
- **State Management**: Evaluate need for global state management (Zustand, Jotai) as app grows
- **Internationalization**: Structure supports adding i18n layer in utils
- **Progressive Web App**: Structure can accommodate service worker and manifest
- **Design System**: Component library is structured to evolve into full design system
- **Micro-frontends**: Current structure supports future splitting into separate deployable units

### AI Agent Guidelines
When working within this structure:
1. Always add new components to `components/src/` with proper directory structure
2. Create corresponding island mount point in `islands/` for new components
3. Place shared types in `types/` directory, not within component files
4. All API calls go through the `api/` layer, never directly in components
5. Utilities go in `utils/` directory with single responsibility principle
6. Every new file needs comprehensive JSDoc documentation
7. Every component needs corresponding test file
8. Follow the naming conventions: PascalCase for components, camelCase for utilities
9. Always validate external data with Zod schemas defined in `types/models.ts`
10. Reference the Architectural Bible for detailed coding standards

### Migration from Bubble
This structure represents a complete rewrite from the Bubble no-code platform. Key considerations:
- **Data Models**: Need to map Bubble's data types to our TypeScript/Zod models
- **Workflows**: Bubble workflows become API endpoints and React event handlers
- **Plugins**: External integrations should go through the API layer
- **Responsive Design**: CSS must be written to match Bubble's responsive breakpoints
- **User Authentication**: Implement proper auth flow (was handled by Bubble)

---

**Plan Created:** January 2025
**Feature Branch:** feat-issue-6-adw-cd0255fa-splitlease-app-structure
**Status:** Ready for Implementation
