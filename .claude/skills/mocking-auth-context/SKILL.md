---
name: mocking-auth-context
description: Create mock authentication providers for React component testing. Use this skill when testing protected components, testing role-based UI, testing auth state transitions, or isolating components from real authentication. Enables fast unit tests for components requiring logged-in state.
license: MIT
---

This skill guides creating mock authentication contexts for React component testing. Most marketplace components require authentication state—testing them without mocks means slow, flaky tests dependent on real auth infrastructure.

## When to Use This Skill

- Testing components that require logged-in state
- Testing role-based UI (seller vs buyer vs admin)
- Testing auth state transitions (login → logout)
- Testing components that access user data
- Isolating components from Supabase auth

## Core Pattern: Mock Auth Provider

### Basic Mock Provider

```typescript
// src/test/MockAuthProvider.tsx
import { createContext, useContext, useState, ReactNode } from 'react'

interface User {
  id: string
  email: string
  role?: 'buyer' | 'seller' | 'admin'
  user_metadata?: Record<string, any>
}

interface Session {
  access_token: string
  refresh_token: string
  expires_at: number
  user: User
}

interface AuthContextValue {
  user: User | null
  session: Session | null
  loading: boolean
  signIn: (email: string, password: string) => Promise<void>
  signOut: () => Promise<void>
  signUp: (email: string, password: string) => Promise<void>
}

const AuthContext = createContext<AuthContextValue | null>(null)

export function useAuth() {
  const context = useContext(AuthContext)
  if (!context) throw new Error('useAuth must be used within AuthProvider')
  return context
}

interface MockAuthProviderProps {
  children: ReactNode
  user?: User | null
  session?: Session | null
  loading?: boolean
  onSignIn?: (email: string, password: string) => Promise<void>
  onSignOut?: () => Promise<void>
  onSignUp?: (email: string, password: string) => Promise<void>
}

export function MockAuthProvider({
  children,
  user = null,
  session = null,
  loading = false,
  onSignIn,
  onSignOut,
  onSignUp,
}: MockAuthProviderProps) {
  const [currentUser, setCurrentUser] = useState<User | null>(user)
  const [currentSession, setCurrentSession] = useState<Session | null>(session)
  const [isLoading, setIsLoading] = useState(loading)

  const signIn = async (email: string, password: string) => {
    if (onSignIn) {
      await onSignIn(email, password)
    } else {
      // Default mock behavior
      setCurrentUser({ id: 'mock-user-id', email })
      setCurrentSession({
        access_token: 'mock-token',
        refresh_token: 'mock-refresh',
        expires_at: Date.now() + 3600000,
        user: { id: 'mock-user-id', email },
      })
    }
  }

  const signOut = async () => {
    if (onSignOut) {
      await onSignOut()
    } else {
      setCurrentUser(null)
      setCurrentSession(null)
    }
  }

  const signUp = async (email: string, password: string) => {
    if (onSignUp) {
      await onSignUp(email, password)
    }
  }

  return (
    <AuthContext.Provider
      value={{
        user: currentUser,
        session: currentSession,
        loading: isLoading,
        signIn,
        signOut,
        signUp,
      }}
    >
      {children}
    </AuthContext.Provider>
  )
}
```

### Test Fixtures: Pre-configured Users

```typescript
// src/test/fixtures/users.ts
export const mockUsers = {
  buyer: {
    id: 'buyer-123',
    email: 'buyer@test.com',
    role: 'buyer' as const,
    user_metadata: {
      full_name: 'Test Buyer',
      avatar_url: 'https://example.com/avatar.jpg',
    },
  },
  
  seller: {
    id: 'seller-456',
    email: 'seller@test.com',
    role: 'seller' as const,
    user_metadata: {
      full_name: 'Test Seller',
      business_name: 'Test Rentals LLC',
      verified: true,
    },
  },
  
  admin: {
    id: 'admin-789',
    email: 'admin@test.com',
    role: 'admin' as const,
    user_metadata: {
      full_name: 'Test Admin',
      permissions: ['manage_users', 'manage_listings', 'view_analytics'],
    },
  },
  
  unverifiedSeller: {
    id: 'unverified-seller',
    email: 'pending@test.com',
    role: 'seller' as const,
    user_metadata: {
      verified: false,
    },
  },
}

export const mockSessions = {
  buyer: {
    access_token: 'buyer-access-token',
    refresh_token: 'buyer-refresh-token',
    expires_at: Date.now() + 3600000,
    user: mockUsers.buyer,
  },
  seller: {
    access_token: 'seller-access-token',
    refresh_token: 'seller-refresh-token',
    expires_at: Date.now() + 3600000,
    user: mockUsers.seller,
  },
  admin: {
    access_token: 'admin-access-token',
    refresh_token: 'admin-refresh-token',
    expires_at: Date.now() + 3600000,
    user: mockUsers.admin,
  },
}
```

### Custom Render Helper

```typescript
// src/test/test-utils.tsx
import { render, RenderOptions } from '@testing-library/react'
import { ReactElement, ReactNode } from 'react'
import { BrowserRouter } from 'react-router-dom'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { MockAuthProvider } from './MockAuthProvider'
import { mockUsers, mockSessions } from './fixtures/users'

interface CustomRenderOptions extends Omit<RenderOptions, 'wrapper'> {
  user?: typeof mockUsers.buyer | null
  session?: typeof mockSessions.buyer | null
  loading?: boolean
  route?: string
}

function createTestQueryClient() {
  return new QueryClient({
    defaultOptions: {
      queries: { retry: false },
      mutations: { retry: false },
    },
  })
}

export function renderWithAuth(
  ui: ReactElement,
  {
    user = mockUsers.buyer,
    session = mockSessions.buyer,
    loading = false,
    route = '/',
    ...renderOptions
  }: CustomRenderOptions = {}
) {
  window.history.pushState({}, 'Test page', route)
  
  const queryClient = createTestQueryClient()

  function Wrapper({ children }: { children: ReactNode }) {
    return (
      <QueryClientProvider client={queryClient}>
        <MockAuthProvider user={user} session={session} loading={loading}>
          <BrowserRouter>{children}</BrowserRouter>
        </MockAuthProvider>
      </QueryClientProvider>
    )
  }

  return {
    ...render(ui, { wrapper: Wrapper, ...renderOptions }),
    queryClient,
  }
}

// Convenience functions
export function renderAsBuyer(ui: ReactElement, options?: Omit<CustomRenderOptions, 'user' | 'session'>) {
  return renderWithAuth(ui, { user: mockUsers.buyer, session: mockSessions.buyer, ...options })
}

export function renderAsSeller(ui: ReactElement, options?: Omit<CustomRenderOptions, 'user' | 'session'>) {
  return renderWithAuth(ui, { user: mockUsers.seller, session: mockSessions.seller, ...options })
}

export function renderAsAdmin(ui: ReactElement, options?: Omit<CustomRenderOptions, 'user' | 'session'>) {
  return renderWithAuth(ui, { user: mockUsers.admin, session: mockSessions.admin, ...options })
}

export function renderAsGuest(ui: ReactElement, options?: Omit<CustomRenderOptions, 'user' | 'session'>) {
  return renderWithAuth(ui, { user: null, session: null, ...options })
}

export function renderWithLoading(ui: ReactElement, options?: Omit<CustomRenderOptions, 'loading'>) {
  return renderWithAuth(ui, { loading: true, ...options })
}

// Re-export everything
export * from '@testing-library/react'
export { mockUsers, mockSessions }
```

## Testing Patterns

### Pattern 1: Testing Protected Component Access

```typescript
// src/components/__tests__/Dashboard.test.tsx
import { screen } from '@testing-library/react'
import { renderWithAuth, renderAsGuest, mockUsers } from '@/test/test-utils'
import { Dashboard } from '../Dashboard'

describe('Dashboard', () => {
  it('renders dashboard for authenticated user', () => {
    renderWithAuth(<Dashboard />)
    
    expect(screen.getByRole('heading', { name: /dashboard/i })).toBeInTheDocument()
    expect(screen.getByText(/welcome back/i)).toBeInTheDocument()
  })

  it('shows user email in header', () => {
    renderWithAuth(<Dashboard />, { user: mockUsers.buyer })
    
    expect(screen.getByText('buyer@test.com')).toBeInTheDocument()
  })

  it('redirects guest to login', () => {
    renderAsGuest(<Dashboard />)
    
    // Assuming Dashboard redirects or shows login prompt
    expect(screen.queryByRole('heading', { name: /dashboard/i })).not.toBeInTheDocument()
    expect(screen.getByText(/please sign in/i)).toBeInTheDocument()
  })

  it('shows loading state while auth initializes', () => {
    renderWithAuth(<Dashboard />, { loading: true })
    
    expect(screen.getByTestId('loading-spinner')).toBeInTheDocument()
  })
})
```

### Pattern 2: Testing Role-Based UI

```typescript
// src/components/__tests__/Navbar.test.tsx
import { screen } from '@testing-library/react'
import { renderAsBuyer, renderAsSeller, renderAsAdmin, renderAsGuest } from '@/test/test-utils'
import { Navbar } from '../Navbar'

describe('Navbar', () => {
  describe('as buyer', () => {
    it('shows buyer navigation items', () => {
      renderAsBuyer(<Navbar />)
      
      expect(screen.getByRole('link', { name: /browse listings/i })).toBeInTheDocument()
      expect(screen.getByRole('link', { name: /my bookings/i })).toBeInTheDocument()
      expect(screen.queryByRole('link', { name: /my listings/i })).not.toBeInTheDocument()
    })
  })

  describe('as seller', () => {
    it('shows seller navigation items', () => {
      renderAsSeller(<Navbar />)
      
      expect(screen.getByRole('link', { name: /my listings/i })).toBeInTheDocument()
      expect(screen.getByRole('link', { name: /create listing/i })).toBeInTheDocument()
      expect(screen.getByRole('link', { name: /earnings/i })).toBeInTheDocument()
    })
  })

  describe('as admin', () => {
    it('shows admin navigation items', () => {
      renderAsAdmin(<Navbar />)
      
      expect(screen.getByRole('link', { name: /admin panel/i })).toBeInTheDocument()
      expect(screen.getByRole('link', { name: /manage users/i })).toBeInTheDocument()
      expect(screen.getByRole('link', { name: /analytics/i })).toBeInTheDocument()
    })
  })

  describe('as guest', () => {
    it('shows login and signup buttons', () => {
      renderAsGuest(<Navbar />)
      
      expect(screen.getByRole('link', { name: /sign in/i })).toBeInTheDocument()
      expect(screen.getByRole('link', { name: /sign up/i })).toBeInTheDocument()
      expect(screen.queryByRole('link', { name: /my bookings/i })).not.toBeInTheDocument()
    })
  })
})
```

### Pattern 3: Testing Auth State Transitions

```typescript
// src/components/__tests__/LoginButton.test.tsx
import { screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { renderWithAuth, mockUsers } from '@/test/test-utils'
import { LoginButton } from '../LoginButton'

describe('LoginButton', () => {
  it('calls signIn on click', async () => {
    const user = userEvent.setup()
    const onSignIn = vi.fn()
    
    renderWithAuth(<LoginButton />, {
      user: null,
      onSignIn,
    })
    
    await user.click(screen.getByRole('button', { name: /sign in/i }))
    
    // Opens login modal, user fills form...
    await user.type(screen.getByLabelText(/email/i), 'test@example.com')
    await user.type(screen.getByLabelText(/password/i), 'password123')
    await user.click(screen.getByRole('button', { name: /submit/i }))
    
    expect(onSignIn).toHaveBeenCalledWith('test@example.com', 'password123')
  })

  it('shows user menu when logged in', () => {
    renderWithAuth(<LoginButton />, { user: mockUsers.buyer })
    
    expect(screen.getByRole('button', { name: /account menu/i })).toBeInTheDocument()
    expect(screen.queryByRole('button', { name: /sign in/i })).not.toBeInTheDocument()
  })

  it('calls signOut when clicking logout', async () => {
    const user = userEvent.setup()
    const onSignOut = vi.fn()
    
    renderWithAuth(<LoginButton />, {
      user: mockUsers.buyer,
      onSignOut,
    })
    
    await user.click(screen.getByRole('button', { name: /account menu/i }))
    await user.click(screen.getByRole('menuitem', { name: /sign out/i }))
    
    expect(onSignOut).toHaveBeenCalled()
  })
})
```

### Pattern 4: Testing Components with User Data

```typescript
// src/components/__tests__/ProfileCard.test.tsx
import { screen } from '@testing-library/react'
import { renderWithAuth, mockUsers } from '@/test/test-utils'
import { ProfileCard } from '../ProfileCard'

describe('ProfileCard', () => {
  it('displays user name from metadata', () => {
    renderWithAuth(<ProfileCard />, { user: mockUsers.seller })
    
    expect(screen.getByText('Test Seller')).toBeInTheDocument()
  })

  it('displays verified badge for verified sellers', () => {
    renderWithAuth(<ProfileCard />, {
      user: {
        ...mockUsers.seller,
        user_metadata: { ...mockUsers.seller.user_metadata, verified: true },
      },
    })
    
    expect(screen.getByTestId('verified-badge')).toBeInTheDocument()
  })

  it('hides verified badge for unverified sellers', () => {
    renderWithAuth(<ProfileCard />, {
      user: mockUsers.unverifiedSeller,
    })
    
    expect(screen.queryByTestId('verified-badge')).not.toBeInTheDocument()
  })

  it('displays avatar from user metadata', () => {
    renderWithAuth(<ProfileCard />, { user: mockUsers.buyer })
    
    const avatar = screen.getByRole('img', { name: /avatar/i })
    expect(avatar).toHaveAttribute('src', 'https://example.com/avatar.jpg')
  })

  it('displays fallback avatar when none set', () => {
    renderWithAuth(<ProfileCard />, {
      user: { ...mockUsers.buyer, user_metadata: {} },
    })
    
    const avatar = screen.getByRole('img', { name: /avatar/i })
    expect(avatar).toHaveAttribute('src', '/default-avatar.png')
  })
})
```

### Pattern 5: Testing Permission Checks

```typescript
// src/components/__tests__/EditListingButton.test.tsx
import { screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { renderWithAuth, mockUsers } from '@/test/test-utils'
import { EditListingButton } from '../EditListingButton'

const mockListing = {
  id: 'listing-123',
  title: 'Test Listing',
  seller_id: 'seller-456', // Matches mockUsers.seller.id
}

describe('EditListingButton', () => {
  it('shows edit button for listing owner', () => {
    renderWithAuth(<EditListingButton listing={mockListing} />, {
      user: mockUsers.seller,
    })
    
    expect(screen.getByRole('button', { name: /edit/i })).toBeInTheDocument()
  })

  it('hides edit button for non-owner', () => {
    renderWithAuth(<EditListingButton listing={mockListing} />, {
      user: mockUsers.buyer, // Different user
    })
    
    expect(screen.queryByRole('button', { name: /edit/i })).not.toBeInTheDocument()
  })

  it('shows edit button for admin regardless of ownership', () => {
    renderWithAuth(<EditListingButton listing={mockListing} />, {
      user: mockUsers.admin,
    })
    
    expect(screen.getByRole('button', { name: /edit/i })).toBeInTheDocument()
  })

  it('hides edit button for guests', () => {
    renderWithAuth(<EditListingButton listing={mockListing} />, {
      user: null,
    })
    
    expect(screen.queryByRole('button', { name: /edit/i })).not.toBeInTheDocument()
  })
})
```

### Pattern 6: Testing Session Expiry Handling

```typescript
// src/components/__tests__/SessionExpiryHandler.test.tsx
import { screen, waitFor } from '@testing-library/react'
import { renderWithAuth, mockUsers, mockSessions } from '@/test/test-utils'
import { SessionExpiryHandler } from '../SessionExpiryHandler'

describe('SessionExpiryHandler', () => {
  beforeEach(() => {
    vi.useFakeTimers()
  })

  afterEach(() => {
    vi.useRealTimers()
  })

  it('shows warning before session expires', async () => {
    const expiringSession = {
      ...mockSessions.buyer,
      expires_at: Date.now() + 5 * 60 * 1000, // 5 minutes
    }
    
    renderWithAuth(<SessionExpiryHandler warningThreshold={10} />, {
      session: expiringSession,
    })
    
    // Advance time to within warning threshold
    vi.advanceTimersByTime(4 * 60 * 1000) // 4 minutes
    
    await waitFor(() => {
      expect(screen.getByText(/session expires in/i)).toBeInTheDocument()
    })
  })

  it('auto-refreshes session when available', async () => {
    const refreshSession = vi.fn()
    
    renderWithAuth(<SessionExpiryHandler autoRefresh />, {
      session: {
        ...mockSessions.buyer,
        expires_at: Date.now() + 2 * 60 * 1000,
      },
      onRefreshSession: refreshSession,
    })
    
    vi.advanceTimersByTime(60 * 1000)
    
    expect(refreshSession).toHaveBeenCalled()
  })
})
```

## Mocking Supabase Client Specifically

For components using Supabase client directly:

```typescript
// src/test/mockSupabaseClient.ts
import { vi } from 'vitest'

export function createMockSupabaseClient(overrides = {}) {
  return {
    auth: {
      getSession: vi.fn().mockResolvedValue({
        data: { session: null },
        error: null,
      }),
      getUser: vi.fn().mockResolvedValue({
        data: { user: null },
        error: null,
      }),
      signInWithPassword: vi.fn().mockResolvedValue({
        data: { user: null, session: null },
        error: null,
      }),
      signOut: vi.fn().mockResolvedValue({ error: null }),
      onAuthStateChange: vi.fn().mockReturnValue({
        data: { subscription: { unsubscribe: vi.fn() } },
      }),
      ...overrides.auth,
    },
    from: vi.fn().mockReturnValue({
      select: vi.fn().mockReturnThis(),
      insert: vi.fn().mockReturnThis(),
      update: vi.fn().mockReturnThis(),
      delete: vi.fn().mockReturnThis(),
      eq: vi.fn().mockReturnThis(),
      single: vi.fn().mockResolvedValue({ data: null, error: null }),
    }),
    ...overrides,
  }
}

// Usage in tests
vi.mock('@/lib/supabase', () => ({
  supabase: createMockSupabaseClient({
    auth: {
      getSession: vi.fn().mockResolvedValue({
        data: { session: mockSessions.buyer },
        error: null,
      }),
    },
  }),
}))
```

## File Organization

```
src/
├── test/
│   ├── MockAuthProvider.tsx      # Core mock provider
│   ├── test-utils.tsx            # Render helpers
│   ├── mockSupabaseClient.ts     # Supabase client mock
│   └── fixtures/
│       ├── users.ts              # Mock user data
│       └── sessions.ts           # Mock session data
├── contexts/
│   ├── AuthContext.tsx           # Real auth context
│   └── __tests__/
│       └── AuthContext.test.tsx
└── components/
    ├── Navbar.tsx
    ├── Dashboard.tsx
    └── __tests__/
        ├── Navbar.test.tsx
        └── Dashboard.test.tsx
```

## Anti-Patterns to Avoid

| ❌ Anti-Pattern | ✅ Correct Approach |
|----------------|---------------------|
| Mocking `useContext` directly | Create proper mock provider component |
| Duplicating mock setup in each test | Use shared test-utils and fixtures |
| Testing implementation details | Test user-visible behavior |
| Hardcoding user data in tests | Use centralized fixtures |
| Forgetting loading states | Always test loading/error states |
| Not testing auth transitions | Test login → authenticated → logout |

## Best Practices

1. **Centralize mock data**: Single source of truth for test users
2. **Create role-specific render helpers**: `renderAsBuyer()`, `renderAsSeller()`
3. **Test all auth states**: loading, authenticated, guest, error
4. **Test permission boundaries**: What each role can/cannot access
5. **Mock at the right level**: Provider level, not hook level
6. **Keep mocks simple**: Only mock what's needed for the test
