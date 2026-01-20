---
name: vitest-rtl-setup
description: Configure Vitest with React Testing Library for fast, reliable component testing. Use this skill when setting up a new React project's test infrastructure, migrating from Jest, or optimizing test performance. Get configuration right once to avoid debugging setup issues later.
license: MIT
---

This skill guides complete Vitest + React Testing Library setup for React/TypeScript projects. Proper configuration eliminates "works on my machine" issues and enables sub-second test feedback.

## When to Use This Skill

- Setting up testing in a new React project
- Migrating from Jest to Vitest
- Debugging test configuration issues
- Optimizing test performance
- Configuring CI/CD test runs

## Quick Start

### 1. Install Dependencies

```bash
npm install -D vitest @testing-library/react @testing-library/jest-dom @testing-library/user-event jsdom @vitest/coverage-v8
```

### 2. Create Vitest Config

```typescript
// vitest.config.ts
import { defineConfig } from 'vitest/config'
import react from '@vitejs/plugin-react'
import path from 'path'

export default defineConfig({
  plugins: [react()],
  test: {
    // Environment
    environment: 'jsdom',
    
    // Global APIs (describe, it, expect without imports)
    globals: true,
    
    // Setup files run before each test file
    setupFiles: ['./src/test/setup.ts'],
    
    // Test file patterns
    include: ['src/**/*.{test,spec}.{ts,tsx}'],
    exclude: ['node_modules', 'dist', 'e2e'],
    
    // Coverage configuration
    coverage: {
      provider: 'v8',
      reporter: ['text', 'json', 'html'],
      exclude: [
        'node_modules/',
        'src/test/',
        '**/*.d.ts',
        '**/*.config.*',
        '**/index.ts', // barrel files
      ],
      thresholds: {
        global: {
          statements: 80,
          branches: 80,
          functions: 80,
          lines: 80,
        },
      },
    },
    
    // Reporter for terminal output
    reporters: ['verbose'],
    
    // Timeout for slow tests
    testTimeout: 10000,
    
    // Pool for parallel execution
    pool: 'threads',
    poolOptions: {
      threads: {
        singleThread: false,
      },
    },
  },
  resolve: {
    alias: {
      '@': path.resolve(__dirname, './src'),
      '@test': path.resolve(__dirname, './src/test'),
    },
  },
})
```

### 3. Create Setup File

```typescript
// src/test/setup.ts
import '@testing-library/jest-dom/vitest'
import { cleanup } from '@testing-library/react'
import { afterEach, vi } from 'vitest'

// Cleanup after each test
afterEach(() => {
  cleanup()
})

// Mock window.matchMedia (required for responsive components)
Object.defineProperty(window, 'matchMedia', {
  writable: true,
  value: vi.fn().mockImplementation(query => ({
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

// Mock IntersectionObserver (required for lazy loading, infinite scroll)
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

// Reset all mocks after each test
afterEach(() => {
  vi.clearAllMocks()
})
```

### 4. Add TypeScript Types

```typescript
// src/test/vitest.d.ts
/// <reference types="vitest/globals" />
/// <reference types="@testing-library/jest-dom" />
```

Update `tsconfig.json`:

```json
{
  "compilerOptions": {
    "types": ["vitest/globals", "@testing-library/jest-dom"]
  },
  "include": ["src", "src/test/vitest.d.ts"]
}
```

### 5. Add NPM Scripts

```json
{
  "scripts": {
    "test": "vitest",
    "test:run": "vitest run",
    "test:ui": "vitest --ui",
    "test:coverage": "vitest run --coverage",
    "test:watch": "vitest --watch"
  }
}
```

## Custom Render with Providers

Create a custom render function that wraps components with necessary providers:

```typescript
// src/test/test-utils.tsx
import { ReactElement, ReactNode } from 'react'
import { render, RenderOptions } from '@testing-library/react'
import { BrowserRouter } from 'react-router-dom'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { SupabaseProvider } from '@/contexts/SupabaseContext'
import { AuthProvider } from '@/contexts/AuthContext'

// Create a new QueryClient for each test to prevent state leakage
function createTestQueryClient() {
  return new QueryClient({
    defaultOptions: {
      queries: {
        retry: false, // Don't retry failed queries in tests
        gcTime: 0, // Disable garbage collection
        staleTime: 0, // Always consider data stale
      },
      mutations: {
        retry: false,
      },
    },
    logger: {
      log: console.log,
      warn: console.warn,
      error: () => {}, // Suppress error logging in tests
    },
  })
}

interface CustomRenderOptions extends Omit<RenderOptions, 'wrapper'> {
  route?: string
  queryClient?: QueryClient
}

function AllTheProviders({ children }: { children: ReactNode }) {
  const queryClient = createTestQueryClient()
  
  return (
    <QueryClientProvider client={queryClient}>
      <SupabaseProvider>
        <AuthProvider>
          <BrowserRouter>{children}</BrowserRouter>
        </AuthProvider>
      </SupabaseProvider>
    </QueryClientProvider>
  )
}

function customRender(
  ui: ReactElement,
  options: CustomRenderOptions = {}
) {
  const { route = '/', ...renderOptions } = options
  
  // Set initial route
  window.history.pushState({}, 'Test page', route)
  
  return {
    ...render(ui, { wrapper: AllTheProviders, ...renderOptions }),
  }
}

// Re-export everything from Testing Library
export * from '@testing-library/react'
export { default as userEvent } from '@testing-library/user-event'

// Override render with custom render
export { customRender as render }
```

## MSW Integration

Add Mock Service Worker for API mocking:

```typescript
// src/mocks/server.ts
import { setupServer } from 'msw/node'
import { handlers } from './handlers'

export const server = setupServer(...handlers)
```

Update setup file:

```typescript
// src/test/setup.ts (add to existing)
import { server } from '@/mocks/server'

// Start MSW server before all tests
beforeAll(() => server.listen({ onUnhandledRequest: 'error' }))

// Reset handlers after each test
afterEach(() => server.resetHandlers())

// Clean up after all tests
afterAll(() => server.close())
```

## Common Configuration Patterns

### Path Aliases

```typescript
// vitest.config.ts
resolve: {
  alias: {
    '@': path.resolve(__dirname, './src'),
    '@components': path.resolve(__dirname, './src/components'),
    '@hooks': path.resolve(__dirname, './src/hooks'),
    '@test': path.resolve(__dirname, './src/test'),
    '@mocks': path.resolve(__dirname, './src/mocks'),
  },
}
```

### Environment Variables

```typescript
// vitest.config.ts
define: {
  'import.meta.env.VITE_SUPABASE_URL': JSON.stringify('https://test.supabase.co'),
  'import.meta.env.VITE_SUPABASE_ANON_KEY': JSON.stringify('test-anon-key'),
}
```

Or use `.env.test`:

```bash
# .env.test
VITE_SUPABASE_URL=https://test.supabase.co
VITE_SUPABASE_ANON_KEY=test-anon-key
```

```typescript
// vitest.config.ts
import { loadEnv } from 'vite'

export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, process.cwd(), '')
  
  return {
    test: {
      env: {
        ...env,
      },
    },
  }
})
```

### Coverage Thresholds Per Directory

```typescript
// vitest.config.ts
coverage: {
  thresholds: {
    global: {
      statements: 80,
      branches: 80,
      functions: 80,
      lines: 80,
    },
    // Higher coverage for critical paths
    'src/components/checkout/**': {
      statements: 95,
      branches: 90,
    },
    'src/hooks/usePayment.ts': {
      statements: 95,
    },
    // Lower coverage for UI-heavy components
    'src/components/ui/**': {
      statements: 60,
    },
  },
}
```

### Workspace Configuration (Monorepo)

```typescript
// vitest.workspace.ts
import { defineWorkspace } from 'vitest/config'

export default defineWorkspace([
  'packages/web/vitest.config.ts',
  'packages/api/vitest.config.ts',
  'packages/shared/vitest.config.ts',
])
```

## Test Helpers

### Wait For Async Operations

```typescript
// src/test/helpers.ts
import { waitFor } from '@testing-library/react'

export async function waitForLoadingToFinish() {
  await waitFor(() => {
    const loaders = document.querySelectorAll('[data-testid="loading"]')
    if (loaders.length > 0) {
      throw new Error('Still loading')
    }
  })
}

export async function waitForToastToAppear(message: string | RegExp) {
  await waitFor(() => {
    const toast = document.querySelector('[role="alert"]')
    if (!toast || !toast.textContent?.match(message)) {
      throw new Error('Toast not found')
    }
  })
}
```

### Mock Hooks

```typescript
// src/test/mocks/hooks.ts
import { vi } from 'vitest'

export function mockUseAuth(overrides = {}) {
  return {
    user: null,
    session: null,
    loading: false,
    signIn: vi.fn(),
    signOut: vi.fn(),
    ...overrides,
  }
}

// Usage in tests
vi.mock('@/hooks/useAuth', () => ({
  useAuth: () => mockUseAuth({ user: { id: '123', email: 'test@test.com' } }),
}))
```

### Debug Helper

```typescript
// src/test/helpers.ts
import { screen, prettyDOM } from '@testing-library/react'

export function debugScreen() {
  console.log(prettyDOM(document.body, 20000))
}

export function debugElement(element: HTMLElement) {
  console.log(prettyDOM(element, 10000))
}

// Usage
it('should render', () => {
  render(<Component />)
  debugScreen() // See full DOM
})
```

## CI/CD Configuration

### GitHub Actions

```yaml
# .github/workflows/test.yml
name: Tests

on: [push, pull_request]

jobs:
  test:
    runs-on: ubuntu-latest
    
    steps:
      - uses: actions/checkout@v4
      
      - uses: actions/setup-node@v4
        with:
          node-version: 20
          cache: 'npm'
      
      - run: npm ci
      
      - name: Run tests
        run: npm run test:coverage
      
      - name: Upload coverage
        uses: codecov/codecov-action@v4
        with:
          files: ./coverage/coverage-final.json
          fail_ci_if_error: true
```

### Pre-commit Hook (Husky + lint-staged)

```json
// package.json
{
  "lint-staged": {
    "src/**/*.{ts,tsx}": [
      "eslint --fix",
      "vitest related --run"
    ]
  }
}
```

## Debugging Test Failures

### Show Component Output

```typescript
import { screen } from '@testing-library/react'

it('should show user name', () => {
  render(<UserCard user={mockUser} />)
  screen.debug() // Prints DOM to console
  // or
  screen.debug(screen.getByRole('article')) // Debug specific element
})
```

### Log Queries

```typescript
import { screen, logRoles } from '@testing-library/react'

it('should find button', () => {
  const { container } = render(<Form />)
  logRoles(container) // Shows all accessible roles
})
```

### Test Isolation Issues

```typescript
// vitest.config.ts
test: {
  // Run tests sequentially to find isolation issues
  sequence: {
    shuffle: false,
  },
  // Or isolate completely
  isolate: true,
}
```

## Common Issues and Fixes

### Issue: "document is not defined"

```typescript
// vitest.config.ts
test: {
  environment: 'jsdom', // Not 'node'
}
```

### Issue: CSS/Style imports fail

```typescript
// vitest.config.ts
css: {
  modules: {
    classNameStrategy: 'non-scoped',
  },
}
```

Or mock CSS:

```typescript
// src/test/setup.ts
vi.mock('*.css', () => ({}))
vi.mock('*.scss', () => ({}))
```

### Issue: Image imports fail

```typescript
// vitest.config.ts
resolve: {
  alias: {
    '\\.svg$': path.resolve(__dirname, './src/test/mocks/svg.ts'),
    '\\.(jpg|jpeg|png|gif|webp)$': path.resolve(__dirname, './src/test/mocks/file.ts'),
  },
}
```

```typescript
// src/test/mocks/file.ts
export default 'test-file-stub'

// src/test/mocks/svg.ts
export default 'SvgMock'
export const ReactComponent = 'SvgMock'
```

### Issue: act() warnings

```typescript
// Always use userEvent.setup() for interactions
import userEvent from '@testing-library/user-event'

it('should handle click', async () => {
  const user = userEvent.setup()
  render(<Button />)
  
  await user.click(screen.getByRole('button'))
  // NOT: fireEvent.click()
})
```

### Issue: Async state not updating

```typescript
import { waitFor, act } from '@testing-library/react'

it('should load data', async () => {
  render(<DataComponent />)
  
  // Wait for async operations
  await waitFor(() => {
    expect(screen.getByText('Loaded')).toBeInTheDocument()
  })
})
```

## File Organization

```
src/
├── test/
│   ├── setup.ts              # Global setup
│   ├── test-utils.tsx        # Custom render
│   ├── helpers.ts            # Test helpers
│   ├── vitest.d.ts           # Type declarations
│   └── mocks/
│       ├── handlers.ts       # MSW handlers
│       ├── server.ts         # MSW server
│       └── hooks.ts          # Mock hooks
├── components/
│   ├── Button/
│   │   ├── Button.tsx
│   │   └── Button.test.tsx   # Co-located test
├── hooks/
│   ├── useAuth.ts
│   └── useAuth.test.ts
└── vitest.config.ts
```

## Performance Tips

1. **Use `--reporter=dot`** for faster CI output
2. **Set `isolate: false`** if tests don't have side effects (2-3x faster)
3. **Use `--bail=1`** to stop on first failure
4. **Parallelize** with `pool: 'threads'` (default)
5. **Mock heavy dependencies** (dates, network, timers)
