# Vitest + React Testing Library Setup Plan

**Created**: 2026-01-20
**Status**: New
**Classification**: BUILD
**Scope**: Testing infrastructure for Split Lease frontend application

---

## Executive Summary

This plan establishes a comprehensive testing infrastructure for the Split Lease React application using **Vitest** and **React Testing Library**. The plan is structured around the existing **Four-Layer Logic Architecture** and **Islands Architecture**, prioritizing testability of pure business logic first.

---

## Current State Analysis

### What Exists
- **No testing infrastructure** - no vitest.config.ts, no test files, no testing dependencies
- **27 page components** in `src/islands/pages/`
- **~65 business logic modules** in `src/logic/` following the Four-Layer Architecture
- **~31 library utilities** in `src/lib/`
- **Vite 5.0** as the build tool (Vitest integrates seamlessly)

### Architecture Considerations
| Pattern | Testing Implication |
|---------|---------------------|
| Islands Architecture | Each page is an independent React root - can test in isolation |
| Hollow Components | UI and logic are separated - can unit test hooks independently |
| Four-Layer Logic | Pure functions in calculators/rules/processors - **perfect for unit tests** |
| Supabase Integration | Requires mocking `@supabase/supabase-js` |
| Google Maps | Requires mocking `@react-google-maps/api` |

---

## Phase 1: Core Infrastructure Setup

### 1.1 Install Dependencies

```bash
# From app/ directory
bun add -D vitest @vitest/coverage-v8 @testing-library/react @testing-library/jest-dom @testing-library/user-event jsdom happy-dom msw
```

**Dependency Rationale:**
| Package | Purpose |
|---------|---------|
| `vitest` | Test runner (Vite-native, fast HMR) |
| `@vitest/coverage-v8` | Code coverage via V8 engine |
| `@testing-library/react` | React component testing utilities |
| `@testing-library/jest-dom` | Custom DOM matchers (toBeInTheDocument, etc.) |
| `@testing-library/user-event` | Simulate user interactions |
| `jsdom` | DOM environment for Node.js |
| `happy-dom` | Faster alternative to jsdom (optional) |
| `msw` | Mock Service Worker for API mocking |

### 1.2 Create Vitest Configuration

**File: `app/vitest.config.ts`**

```typescript
import { defineConfig, mergeConfig } from 'vitest/config'
import viteConfig from './vite.config.js'
import path from 'path'

export default mergeConfig(
  viteConfig,
  defineConfig({
    test: {
      // Environment
      environment: 'jsdom',

      // Global APIs (describe, it, expect without imports)
      globals: true,

      // Setup files run before each test file
      setupFiles: ['./src/test/setup.ts'],

      // Test file patterns
      include: [
        'src/**/*.{test,spec}.{ts,tsx,js,jsx}',
      ],
      exclude: [
        'node_modules',
        'dist',
        'public',
      ],

      // Coverage configuration
      coverage: {
        provider: 'v8',
        reporter: ['text', 'json', 'html', 'lcov'],
        reportsDirectory: './coverage',
        exclude: [
          'node_modules/',
          'src/test/',
          '**/*.d.ts',
          '**/*.config.*',
          'src/*.jsx', // Entry point files (main.jsx, search.jsx, etc.)
          'src/routes.config.js',
        ],
        // Start with reasonable thresholds, increase over time
        thresholds: {
          // High coverage for pure logic (calculators, rules)
          'src/logic/calculators/**': {
            statements: 90,
            branches: 85,
            functions: 90,
            lines: 90,
          },
          'src/logic/rules/**': {
            statements: 90,
            branches: 85,
            functions: 90,
            lines: 90,
          },
          // Moderate coverage for processors and workflows
          'src/logic/processors/**': {
            statements: 80,
            branches: 75,
            functions: 80,
            lines: 80,
          },
          'src/logic/workflows/**': {
            statements: 70,
            branches: 65,
            functions: 70,
            lines: 70,
          },
          // Lower coverage for UI components initially
          'src/islands/**': {
            statements: 50,
            branches: 40,
            functions: 50,
            lines: 50,
          },
        },
      },

      // Reporter for terminal output
      reporters: ['verbose'],

      // Timeout for async tests
      testTimeout: 10000,
      hookTimeout: 10000,

      // Pool configuration
      pool: 'threads',
      poolOptions: {
        threads: {
          singleThread: false,
        },
      },

      // Ensure tests are isolated
      isolate: true,

      // Clear mocks between tests
      clearMocks: true,
      restoreMocks: true,
    },
    resolve: {
      alias: {
        '@': path.resolve(__dirname, './src'),
        '@test': path.resolve(__dirname, './src/test'),
        '@logic': path.resolve(__dirname, './src/logic'),
        '@lib': path.resolve(__dirname, './src/lib'),
        '@islands': path.resolve(__dirname, './src/islands'),
      },
    },
  })
)
```

### 1.3 Create Test Setup File

**File: `app/src/test/setup.ts`**

```typescript
import '@testing-library/jest-dom/vitest'
import { cleanup } from '@testing-library/react'
import { afterEach, beforeAll, afterAll, vi } from 'vitest'

// =============================================================================
// CLEANUP
// =============================================================================

// Cleanup DOM after each test
afterEach(() => {
  cleanup()
})

// Reset all mocks after each test
afterEach(() => {
  vi.clearAllMocks()
})

// =============================================================================
// BROWSER API MOCKS
// =============================================================================

// Mock window.matchMedia (required for responsive components)
Object.defineProperty(window, 'matchMedia', {
  writable: true,
  value: vi.fn().mockImplementation((query: string) => ({
    matches: false,
    media: query,
    onchange: null,
    addListener: vi.fn(),
    removeListener: vi.fn(),
    addEventListener: vi.fn(),
    removeEventListener: vi.fn(),
    dispatchEvent: vi.fn(),
  })),
})

// Mock IntersectionObserver (required for lazy loading, animations)
class MockIntersectionObserver {
  observe = vi.fn()
  disconnect = vi.fn()
  unobserve = vi.fn()
}
Object.defineProperty(window, 'IntersectionObserver', {
  writable: true,
  value: MockIntersectionObserver,
})

// Mock ResizeObserver (required for responsive components)
class MockResizeObserver {
  observe = vi.fn()
  disconnect = vi.fn()
  unobserve = vi.fn()
}
Object.defineProperty(window, 'ResizeObserver', {
  writable: true,
  value: MockResizeObserver,
})

// Mock scrollTo (prevents "not implemented" errors)
Object.defineProperty(window, 'scrollTo', {
  writable: true,
  value: vi.fn(),
})

// Mock window.location for Islands Architecture (pages read from pathname)
const mockLocation = {
  pathname: '/',
  search: '',
  hash: '',
  href: 'http://localhost:8000/',
  origin: 'http://localhost:8000',
  host: 'localhost:8000',
  hostname: 'localhost',
  port: '8000',
  protocol: 'http:',
  assign: vi.fn(),
  reload: vi.fn(),
  replace: vi.fn(),
}

Object.defineProperty(window, 'location', {
  writable: true,
  value: mockLocation,
})

// =============================================================================
// ENVIRONMENT VARIABLES
// =============================================================================

// Mock Vite environment variables
vi.stubEnv('VITE_SUPABASE_URL', 'https://test-project.supabase.co')
vi.stubEnv('VITE_SUPABASE_ANON_KEY', 'test-anon-key-for-testing')
vi.stubEnv('VITE_GOOGLE_MAPS_API_KEY', 'test-google-maps-key')

// =============================================================================
// CONSOLE FILTERING (Optional: suppress expected warnings)
// =============================================================================

const originalConsoleError = console.error
const originalConsoleWarn = console.warn

beforeAll(() => {
  // Suppress React 18 act() warnings that aren't actionable
  console.error = (...args: unknown[]) => {
    const message = args[0]?.toString() || ''
    if (
      message.includes('Warning: ReactDOM.render is no longer supported') ||
      message.includes('Warning: An update to') && message.includes('was not wrapped in act')
    ) {
      return
    }
    originalConsoleError.apply(console, args)
  }
})

afterAll(() => {
  console.error = originalConsoleError
  console.warn = originalConsoleWarn
})
```

### 1.4 Create TypeScript Declarations

**File: `app/src/test/vitest.d.ts`**

```typescript
/// <reference types="vitest/globals" />
/// <reference types="@testing-library/jest-dom" />

// Extend Vitest's expect with jest-dom matchers
import type { TestingLibraryMatchers } from '@testing-library/jest-dom/matchers'

declare module 'vitest' {
  interface Assertion<T = unknown> extends TestingLibraryMatchers<T, void> {}
  interface AsymmetricMatchersContaining extends TestingLibraryMatchers<unknown, void> {}
}
```

### 1.5 Update TypeScript Configuration

**Update: `app/tsconfig.json`**

Add to `compilerOptions.types`:
```json
{
  "compilerOptions": {
    "types": ["vitest/globals", "@testing-library/jest-dom"]
  },
  "include": ["src", "src/test/vitest.d.ts"]
}
```

### 1.6 Add NPM Scripts

**Update: `app/package.json`**

Add these scripts:
```json
{
  "scripts": {
    "test": "vitest",
    "test:run": "vitest run",
    "test:ui": "vitest --ui",
    "test:coverage": "vitest run --coverage",
    "test:watch": "vitest --watch",
    "test:related": "vitest related --run"
  }
}
```

---

## Phase 2: Mock Infrastructure

### 2.1 Supabase Mock

**File: `app/src/test/mocks/supabase.ts`**

```typescript
import { vi } from 'vitest'

// Mock Supabase client
export const mockSupabaseClient = {
  auth: {
    getSession: vi.fn().mockResolvedValue({ data: { session: null }, error: null }),
    getUser: vi.fn().mockResolvedValue({ data: { user: null }, error: null }),
    signInWithPassword: vi.fn(),
    signInWithOAuth: vi.fn(),
    signOut: vi.fn(),
    onAuthStateChange: vi.fn().mockReturnValue({
      data: { subscription: { unsubscribe: vi.fn() } },
    }),
  },
  from: vi.fn().mockReturnValue({
    select: vi.fn().mockReturnThis(),
    insert: vi.fn().mockReturnThis(),
    update: vi.fn().mockReturnThis(),
    delete: vi.fn().mockReturnThis(),
    eq: vi.fn().mockReturnThis(),
    neq: vi.fn().mockReturnThis(),
    in: vi.fn().mockReturnThis(),
    order: vi.fn().mockReturnThis(),
    limit: vi.fn().mockReturnThis(),
    single: vi.fn().mockResolvedValue({ data: null, error: null }),
    maybeSingle: vi.fn().mockResolvedValue({ data: null, error: null }),
  }),
  functions: {
    invoke: vi.fn().mockResolvedValue({ data: null, error: null }),
  },
  rpc: vi.fn().mockResolvedValue({ data: null, error: null }),
  channel: vi.fn().mockReturnValue({
    on: vi.fn().mockReturnThis(),
    subscribe: vi.fn(),
    unsubscribe: vi.fn(),
  }),
}

// Factory to create fresh mock for each test
export function createMockSupabaseClient() {
  return structuredClone(mockSupabaseClient)
}

// Mock the module
vi.mock('@/lib/supabase', () => ({
  supabase: mockSupabaseClient,
  getSupabaseClient: () => mockSupabaseClient,
}))

export default mockSupabaseClient
```

### 2.2 Google Maps Mock

**File: `app/src/test/mocks/googleMaps.ts`**

```typescript
import { vi } from 'vitest'

// Mock Google Maps components
export const MockGoogleMap = vi.fn(({ children }) => (
  <div data-testid="google-map">{children}</div>
))

export const MockMarker = vi.fn(() => <div data-testid="google-map-marker" />)

export const MockInfoWindow = vi.fn(({ children }) => (
  <div data-testid="google-map-info-window">{children}</div>
))

export const mockUseLoadScript = vi.fn().mockReturnValue({
  isLoaded: true,
  loadError: null,
})

export const mockUseJsApiLoader = vi.fn().mockReturnValue({
  isLoaded: true,
  loadError: null,
})

// Mock the module
vi.mock('@react-google-maps/api', () => ({
  GoogleMap: MockGoogleMap,
  Marker: MockMarker,
  InfoWindow: MockInfoWindow,
  useLoadScript: mockUseLoadScript,
  useJsApiLoader: mockUseJsApiLoader,
  LoadScript: vi.fn(({ children }) => <>{children}</>),
}))
```

### 2.3 Framer Motion Mock

**File: `app/src/test/mocks/framerMotion.ts`**

```typescript
import { vi } from 'vitest'
import React from 'react'

// Mock framer-motion to avoid animation issues in tests
vi.mock('framer-motion', () => ({
  motion: {
    div: React.forwardRef(({ children, ...props }: any, ref: any) => (
      <div ref={ref} {...props}>{children}</div>
    )),
    span: React.forwardRef(({ children, ...props }: any, ref: any) => (
      <span ref={ref} {...props}>{children}</span>
    )),
    button: React.forwardRef(({ children, ...props }: any, ref: any) => (
      <button ref={ref} {...props}>{children}</button>
    )),
    ul: React.forwardRef(({ children, ...props }: any, ref: any) => (
      <ul ref={ref} {...props}>{children}</ul>
    )),
    li: React.forwardRef(({ children, ...props }: any, ref: any) => (
      <li ref={ref} {...props}>{children}</li>
    )),
    section: React.forwardRef(({ children, ...props }: any, ref: any) => (
      <section ref={ref} {...props}>{children}</section>
    )),
    article: React.forwardRef(({ children, ...props }: any, ref: any) => (
      <article ref={ref} {...props}>{children}</article>
    )),
    img: React.forwardRef((props: any, ref: any) => (
      <img ref={ref} {...props} />
    )),
  },
  AnimatePresence: ({ children }: any) => <>{children}</>,
  useAnimation: () => ({
    start: vi.fn(),
    stop: vi.fn(),
    set: vi.fn(),
  }),
  useMotionValue: (initial: number) => ({
    get: () => initial,
    set: vi.fn(),
    onChange: vi.fn(),
  }),
  useTransform: () => ({
    get: () => 0,
    set: vi.fn(),
  }),
  useInView: () => true,
  useReducedMotion: () => false,
}))
```

### 2.4 Auth Mock

**File: `app/src/test/mocks/auth.ts`**

```typescript
import { vi } from 'vitest'

export interface MockUser {
  id: string
  email: string
  user_metadata?: Record<string, unknown>
}

export interface MockSession {
  user: MockUser
  access_token: string
  refresh_token: string
  expires_at: number
}

// Create mock user factory
export function createMockUser(overrides: Partial<MockUser> = {}): MockUser {
  return {
    id: 'test-user-id-123',
    email: 'test@example.com',
    user_metadata: {},
    ...overrides,
  }
}

// Create mock session factory
export function createMockSession(user?: MockUser): MockSession {
  return {
    user: user || createMockUser(),
    access_token: 'test-access-token',
    refresh_token: 'test-refresh-token',
    expires_at: Date.now() + 3600000, // 1 hour from now
  }
}

// Mock useAuth hook return value factory
export function mockUseAuth(overrides = {}) {
  return {
    user: null,
    session: null,
    loading: false,
    isAuthenticated: false,
    signIn: vi.fn(),
    signOut: vi.fn(),
    signUp: vi.fn(),
    ...overrides,
  }
}

// Mock authenticated state
export function mockAuthenticatedUser(user?: Partial<MockUser>) {
  const mockUser = createMockUser(user)
  const mockSession = createMockSession(mockUser)

  return mockUseAuth({
    user: mockUser,
    session: mockSession,
    loading: false,
    isAuthenticated: true,
  })
}
```

---

## Phase 3: Custom Test Utilities

### 3.1 Custom Render Function

**File: `app/src/test/test-utils.tsx`**

```typescript
import React, { ReactElement, ReactNode } from 'react'
import { render, RenderOptions } from '@testing-library/react'
import userEvent from '@testing-library/user-event'

// Import providers if you add context providers to the app
// For now, Split Lease uses minimal context - mainly Supabase via lib/supabase.js

interface CustomRenderOptions extends Omit<RenderOptions, 'wrapper'> {
  route?: string
  initialPathname?: string
}

// Wrapper for tests - add providers as needed
function AllTheProviders({ children }: { children: ReactNode }) {
  return <>{children}</>
}

/**
 * Custom render function with provider wrapping and route setup
 */
function customRender(
  ui: ReactElement,
  options: CustomRenderOptions = {}
) {
  const { route = '/', initialPathname, ...renderOptions } = options

  // Set initial route for Islands Architecture pages that read from pathname
  if (initialPathname) {
    window.history.pushState({}, 'Test page', initialPathname)
    Object.defineProperty(window, 'location', {
      writable: true,
      value: {
        ...window.location,
        pathname: initialPathname,
        href: `http://localhost:8000${initialPathname}`,
      },
    })
  }

  return {
    user: userEvent.setup(),
    ...render(ui, { wrapper: AllTheProviders, ...renderOptions }),
  }
}

// Re-export everything from Testing Library
export * from '@testing-library/react'
export { default as userEvent } from '@testing-library/user-event'

// Override render with custom render
export { customRender as render }
```

### 3.2 Test Helpers

**File: `app/src/test/helpers.ts`**

```typescript
import { waitFor, screen, prettyDOM } from '@testing-library/react'
import { vi } from 'vitest'

/**
 * Wait for loading indicators to disappear
 */
export async function waitForLoadingToFinish() {
  await waitFor(() => {
    const loaders = document.querySelectorAll('[data-testid="loading"], [aria-busy="true"]')
    if (loaders.length > 0) {
      throw new Error('Still loading')
    }
  }, { timeout: 5000 })
}

/**
 * Wait for toast notification to appear
 */
export async function waitForToast(message: string | RegExp) {
  await waitFor(() => {
    const toast = document.querySelector('[role="alert"]')
    if (!toast || !toast.textContent?.match(message)) {
      throw new Error(`Toast with message "${message}" not found`)
    }
  })
}

/**
 * Debug helper - print DOM to console
 */
export function debugScreen(maxLength = 20000) {
  console.log(prettyDOM(document.body, maxLength))
}

/**
 * Debug specific element
 */
export function debugElement(element: HTMLElement, maxLength = 10000) {
  console.log(prettyDOM(element, maxLength))
}

/**
 * Create a mock date for consistent testing
 * Always returns the same date to avoid flaky tests
 */
export function mockDate(date: string | Date) {
  const mockDate = new Date(date)
  vi.setSystemTime(mockDate)
  return mockDate
}

/**
 * Reset date mock
 */
export function resetDateMock() {
  vi.useRealTimers()
}

/**
 * Mock localStorage
 */
export function createMockLocalStorage() {
  let store: Record<string, string> = {}

  return {
    getItem: vi.fn((key: string) => store[key] || null),
    setItem: vi.fn((key: string, value: string) => {
      store[key] = value
    }),
    removeItem: vi.fn((key: string) => {
      delete store[key]
    }),
    clear: vi.fn(() => {
      store = {}
    }),
    get length() {
      return Object.keys(store).length
    },
    key: vi.fn((index: number) => Object.keys(store)[index] || null),
  }
}
```

---

## Phase 4: Testing Strategy by Layer

### 4.1 Layer 1: Calculators (Highest Priority)

Pure mathematical functions - easiest to test, highest value.

**Location**: `src/logic/calculators/`

**Example Test**: `src/logic/calculators/pricing/calculateFourWeekRent.test.js`

```javascript
import { describe, it, expect } from 'vitest'
import { calculateFourWeekRent } from './calculateFourWeekRent'

describe('calculateFourWeekRent', () => {
  it('should calculate monthly rent from nightly rate', () => {
    // 4 weeks = 28 nights
    const nightlyRate = 100
    const expected = 2800 // 100 * 28

    expect(calculateFourWeekRent(nightlyRate)).toBe(expected)
  })

  it('should handle decimal nightly rates', () => {
    const nightlyRate = 99.99
    const expected = 2799.72 // 99.99 * 28

    expect(calculateFourWeekRent(nightlyRate)).toBeCloseTo(expected)
  })

  it('should return 0 for 0 nightly rate', () => {
    expect(calculateFourWeekRent(0)).toBe(0)
  })

  it('should handle negative values gracefully', () => {
    // Document expected behavior for edge cases
    expect(calculateFourWeekRent(-100)).toBe(-2800)
  })
})
```

**Files to Test (Calculators)**:
- `calculateFourWeekRent.js`
- `calculatePricingBreakdown.js`
- `calculateReservationTotal.js`
- `calculateCheckInOutDays.js`
- `calculateNightsFromDays.js`
- `getNightlyRateByFrequency.js`
- `calculateReviewScore.js`
- `calculateFormCompletion.js`
- `calculateNextSendTime.js`
- `calculateGuestFacingPrice.js`
- `calculateNextAvailableCheckIn.js`
- `getNextOccurrenceOfDay.js`
- `shiftMoveInDateIfPast.js`
- `isContiguousSelection.js`

### 4.2 Layer 2: Rules (High Priority)

Boolean predicates - critical for business logic correctness.

**Location**: `src/logic/rules/`

**Example Test**: `src/logic/rules/proposals/canCancelProposal.test.js`

```javascript
import { describe, it, expect } from 'vitest'
import { canCancelProposal } from './canCancelProposal'

describe('canCancelProposal', () => {
  it('should return true for pending proposals', () => {
    const proposal = { status: 'pending' }
    expect(canCancelProposal(proposal)).toBe(true)
  })

  it('should return false for accepted proposals', () => {
    const proposal = { status: 'accepted' }
    expect(canCancelProposal(proposal)).toBe(false)
  })

  it('should return false for already cancelled proposals', () => {
    const proposal = { status: 'cancelled' }
    expect(canCancelProposal(proposal)).toBe(false)
  })

  it('should handle null/undefined input', () => {
    expect(canCancelProposal(null)).toBe(false)
    expect(canCancelProposal(undefined)).toBe(false)
  })
})
```

**Files to Test (Rules)**:
- `isSessionValid.js`
- `isValidDayCountForPricing.js`
- `isDateBlocked.js`
- `isDateInRange.js`
- `hasProfilePhoto.js`
- `isGuest.js`
- `isHost.js`
- `shouldShowFullName.js`
- `isProtectedPage.js`
- `canCancelProposal.js`
- `canEditProposal.js`
- `canAcceptProposal.js`
- `determineProposalStage.js`
- `virtualMeetingRules.js`
- `hasListingPhotos.js`
- `isScheduleContiguous.js`
- `reminderScheduling.js`
- `reminderValidation.js`
- `reviewValidation.js`
- `proposalButtonRules.js`
- `proposalRules.js`
- `isValidPriceTier.js`
- `isValidSortOption.js`
- `isValidWeekPattern.js`

### 4.3 Layer 3: Processors (Medium Priority)

Data transformation functions - may require mocking external data.

**Location**: `src/logic/processors/`

**Example Test**: `src/logic/processors/user/processUserDisplayName.test.js`

```javascript
import { describe, it, expect } from 'vitest'
import { processUserDisplayName } from './processUserDisplayName'

describe('processUserDisplayName', () => {
  it('should return full name when available', () => {
    const user = { first_name: 'John', last_name: 'Doe' }
    expect(processUserDisplayName(user)).toBe('John Doe')
  })

  it('should return first name only when last name missing', () => {
    const user = { first_name: 'John', last_name: null }
    expect(processUserDisplayName(user)).toBe('John')
  })

  it('should return email prefix when name missing', () => {
    const user = { email: 'john.doe@example.com' }
    expect(processUserDisplayName(user)).toBe('john.doe')
  })

  it('should return "Guest" as fallback', () => {
    const user = {}
    expect(processUserDisplayName(user)).toBe('Guest')
  })
})
```

**Files to Test (Processors)**:
- `formatHostName.js`
- `extractListingCoordinates.js`
- `processProfilePhotoUrl.js`
- `processUserDisplayName.js`
- `processUserInitials.js`
- `parseJsonArrayField.js`
- `reminderAdapter.js`
- `reminderFormatter.js`
- `processProposalData.js` (both locations)
- `reviewAdapter.js`
- `processUserData.js`

### 4.4 Layer 4: Workflows (Medium-Low Priority)

Orchestration functions - require more mocking, test integration points.

**Location**: `src/logic/workflows/`

**Files to Test (Workflows)**:
- `checkAuthStatusWorkflow.js`
- `validateTokenWorkflow.js`
- `virtualMeetingWorkflow.js`
- `acceptProposalWorkflow.js`
- `navigationWorkflow.js`
- `counterofferWorkflow.js`
- `cancelProposalWorkflow.js` (both locations)
- `reminderWorkflow.js`
- `loadProposalDetailsWorkflow.js`
- `validateMoveInDateWorkflow.js`
- `validateScheduleWorkflow.js`

### 4.5 Library Utilities (As Needed)

**Location**: `src/lib/`

**Priority Files**:
- `dayUtils.js` - Critical for scheduling (day indexing)
- `priceCalculations.js` - Financial calculations
- `availabilityValidation.js` - Booking validation
- `urlParams.js` - URL parameter handling
- `safeJson.js` - JSON parsing utilities

---

## Phase 5: Component Testing (Future)

### Page Components

Page components follow the **Hollow Component** pattern - test the logic hooks separately.

**Testing Approach**:
1. Test `useXxxPageLogic` hooks in isolation
2. Test UI rendering with mocked hook returns
3. Integration tests for critical user flows

**Example Hook Test Structure**:
```javascript
// src/islands/pages/__tests__/useViewSplitLeasePageLogic.test.js
import { describe, it, expect, vi } from 'vitest'
import { renderHook, waitFor } from '@testing-library/react'
import { useViewSplitLeasePageLogic } from '../hooks/useViewSplitLeasePageLogic'

// Mock dependencies
vi.mock('@/lib/supabase')
vi.mock('@/lib/listingDataFetcher')

describe('useViewSplitLeasePageLogic', () => {
  it('should load listing data on mount', async () => {
    const { result } = renderHook(() => useViewSplitLeasePageLogic('listing-123'))

    expect(result.current.loading).toBe(true)

    await waitFor(() => {
      expect(result.current.loading).toBe(false)
    })

    expect(result.current.listing).toBeDefined()
  })
})
```

---

## File Organization

```
app/src/
├── test/
│   ├── setup.ts                    # Global test setup
│   ├── test-utils.tsx              # Custom render, re-exports
│   ├── helpers.ts                  # Test helper functions
│   ├── vitest.d.ts                 # TypeScript declarations
│   └── mocks/
│       ├── supabase.ts             # Supabase client mock
│       ├── googleMaps.ts           # Google Maps mock
│       ├── framerMotion.ts         # Framer Motion mock
│       └── auth.ts                 # Auth utilities mock
├── logic/
│   ├── calculators/
│   │   ├── pricing/
│   │   │   ├── calculateFourWeekRent.js
│   │   │   └── calculateFourWeekRent.test.js   # Co-located test
│   │   └── scheduling/
│   │       └── ...
│   ├── rules/
│   │   └── ...
│   ├── processors/
│   │   └── ...
│   └── workflows/
│       └── ...
├── lib/
│   ├── dayUtils.js
│   └── dayUtils.test.js            # Co-located test
└── islands/
    └── pages/
        └── __tests__/              # Page component tests
└── vitest.config.ts                # At app root
```

---

## Implementation Roadmap

### Week 1: Foundation
- [ ] Install dependencies
- [ ] Create vitest.config.ts
- [ ] Create test setup files
- [ ] Create mock infrastructure
- [ ] Add NPM scripts
- [ ] Write first 5 calculator tests

### Week 2: Calculator Tests
- [ ] Complete all calculator tests (~14 files)
- [ ] Achieve 90% coverage on calculators

### Week 3: Rules Tests
- [ ] Write tests for all rule files (~24 files)
- [ ] Achieve 90% coverage on rules

### Week 4: Processors & Workflows
- [ ] Write processor tests (~12 files)
- [ ] Write workflow tests (~11 files)
- [ ] Achieve 80% coverage on processors
- [ ] Achieve 70% coverage on workflows

### Week 5+: Component Tests
- [ ] Set up MSW for API mocking
- [ ] Write hook tests for critical pages
- [ ] Write integration tests for key user flows

---

## Success Criteria

| Metric | Target |
|--------|--------|
| Calculators coverage | ≥90% |
| Rules coverage | ≥90% |
| Processors coverage | ≥80% |
| Workflows coverage | ≥70% |
| Test execution time | <30 seconds |
| Zero flaky tests | 100% deterministic |

---

## Referenced Files

### Configuration
- `app/package.json` - Add testing dependencies and scripts
- `app/vite.config.js` - Base config for Vitest to merge
- `app/tsconfig.json` - Add test type declarations

### Source Files to Test (Priority Order)
1. `app/src/logic/calculators/**/*.js` - All 14 calculator files
2. `app/src/logic/rules/**/*.js` - All 24 rule files
3. `app/src/logic/processors/**/*.js` - All 12 processor files
4. `app/src/logic/workflows/**/*.js` - All 11 workflow files
5. `app/src/lib/dayUtils.js` - Critical utility

### New Files to Create
- `app/vitest.config.ts`
- `app/src/test/setup.ts`
- `app/src/test/test-utils.tsx`
- `app/src/test/helpers.ts`
- `app/src/test/vitest.d.ts`
- `app/src/test/mocks/supabase.ts`
- `app/src/test/mocks/googleMaps.ts`
- `app/src/test/mocks/framerMotion.ts`
- `app/src/test/mocks/auth.ts`
