---
name: testing-supabase-auth
description: Test Supabase authentication flows including signup, signin, password reset, session management, and OAuth. Use this skill when implementing authentication features, testing protected routes, verifying auth state persistence, or ensuring security of user account flows. Covers both integration tests against real Supabase and isolated unit tests with mocks.
license: MIT
---

This skill guides comprehensive testing of Supabase authentication flows. Authentication is critical infrastructure—broken auth means users can't access the marketplace or, worse, can access other users' data.

## When to Use This Skill

- Implementing new auth features (signup, signin, password reset)
- Testing protected route access control
- Verifying session persistence and refresh
- Testing OAuth provider integration
- Debugging auth-related bugs
- Security audits of authentication

## Testing Approaches

| Approach | Speed | Fidelity | Use Case |
|----------|-------|----------|----------|
| **MSW Mocks** | Fast (ms) | Low | Unit tests, component isolation |
| **Supabase Local** | Medium (s) | High | Integration tests, CI/CD |
| **Supabase Staging** | Slow (s) | Highest | E2E tests, OAuth flows |

## Integration Testing with Real Supabase

### Setup: Test User Management

```typescript
// src/test/auth-helpers.ts
import { createClient } from '@supabase/supabase-js'

const SUPABASE_URL = process.env.SUPABASE_URL!
const SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY!

// Admin client bypasses RLS - use only in tests
export const adminClient = createClient(SUPABASE_URL, SERVICE_ROLE_KEY, {
  auth: { autoRefreshToken: false, persistSession: false }
})

// Create test user (bypasses email confirmation)
export async function createTestUser(overrides = {}) {
  const email = `test-${crypto.randomUUID()}@splitlease-test.com`
  const password = 'TestPassword123!'
  
  const { data, error } = await adminClient.auth.admin.createUser({
    email,
    password,
    email_confirm: true, // Skip email verification
    ...overrides,
  })
  
  if (error) throw error
  
  return {
    user: data.user,
    email,
    password,
    cleanup: async () => {
      await adminClient.auth.admin.deleteUser(data.user.id)
    }
  }
}

// Create authenticated client for test user
export async function createAuthenticatedClient(email: string, password: string) {
  const client = createClient(SUPABASE_URL, process.env.SUPABASE_ANON_KEY!)
  
  const { data, error } = await client.auth.signInWithPassword({ email, password })
  
  if (error) throw error
  
  return { client, session: data.session, user: data.user }
}
```

### Pattern 1: Testing Sign Up Flow

```typescript
// src/features/auth/__tests__/signup.integration.test.ts
import { createClient } from '@supabase/supabase-js'
import { adminClient } from '@/test/auth-helpers'

describe('Sign Up Flow', () => {
  const testEmails: string[] = []
  
  afterAll(async () => {
    // Clean up test users
    for (const email of testEmails) {
      const { data } = await adminClient.auth.admin.listUsers()
      const user = data.users.find(u => u.email === email)
      if (user) await adminClient.auth.admin.deleteUser(user.id)
    }
  })

  it('creates new user account', async () => {
    const email = `signup-test-${Date.now()}@splitlease-test.com`
    testEmails.push(email)
    
    const client = createClient(
      process.env.SUPABASE_URL!,
      process.env.SUPABASE_ANON_KEY!
    )
    
    const { data, error } = await client.auth.signUp({
      email,
      password: 'SecurePassword123!',
      options: {
        data: { full_name: 'Test User' }
      }
    })
    
    expect(error).toBeNull()
    expect(data.user).toBeDefined()
    expect(data.user?.email).toBe(email)
    expect(data.user?.user_metadata.full_name).toBe('Test User')
  })

  it('rejects weak passwords', async () => {
    const client = createClient(
      process.env.SUPABASE_URL!,
      process.env.SUPABASE_ANON_KEY!
    )
    
    const { error } = await client.auth.signUp({
      email: 'test@example.com',
      password: '123', // Too weak
    })
    
    expect(error).toBeDefined()
    expect(error?.message).toMatch(/password/i)
  })

  it('rejects duplicate email', async () => {
    const { email, cleanup } = await createTestUser()
    
    try {
      const client = createClient(
        process.env.SUPABASE_URL!,
        process.env.SUPABASE_ANON_KEY!
      )
      
      const { error } = await client.auth.signUp({
        email, // Already exists
        password: 'AnotherPassword123!',
      })
      
      // Supabase returns success but doesn't create duplicate
      // Check by trying to sign in with new password
      const { error: signInError } = await client.auth.signInWithPassword({
        email,
        password: 'AnotherPassword123!',
      })
      
      expect(signInError).toBeDefined()
    } finally {
      await cleanup()
    }
  })
})
```

### Pattern 2: Testing Sign In Flow

```typescript
describe('Sign In Flow', () => {
  let testUser: Awaited<ReturnType<typeof createTestUser>>
  
  beforeAll(async () => {
    testUser = await createTestUser()
  })
  
  afterAll(async () => {
    await testUser.cleanup()
  })

  it('signs in with valid credentials', async () => {
    const client = createClient(
      process.env.SUPABASE_URL!,
      process.env.SUPABASE_ANON_KEY!
    )
    
    const { data, error } = await client.auth.signInWithPassword({
      email: testUser.email,
      password: testUser.password,
    })
    
    expect(error).toBeNull()
    expect(data.session).toBeDefined()
    expect(data.session?.access_token).toBeDefined()
    expect(data.session?.refresh_token).toBeDefined()
    expect(data.user?.id).toBe(testUser.user.id)
  })

  it('rejects invalid password', async () => {
    const client = createClient(
      process.env.SUPABASE_URL!,
      process.env.SUPABASE_ANON_KEY!
    )
    
    const { data, error } = await client.auth.signInWithPassword({
      email: testUser.email,
      password: 'WrongPassword123!',
    })
    
    expect(error).toBeDefined()
    expect(error?.message).toMatch(/invalid/i)
    expect(data.session).toBeNull()
  })

  it('rejects non-existent user', async () => {
    const client = createClient(
      process.env.SUPABASE_URL!,
      process.env.SUPABASE_ANON_KEY!
    )
    
    const { error } = await client.auth.signInWithPassword({
      email: 'nonexistent@example.com',
      password: 'Password123!',
    })
    
    expect(error).toBeDefined()
  })
})
```

### Pattern 3: Testing Session Management

```typescript
describe('Session Management', () => {
  let testUser: Awaited<ReturnType<typeof createTestUser>>
  
  beforeAll(async () => {
    testUser = await createTestUser()
  })
  
  afterAll(async () => {
    await testUser.cleanup()
  })

  it('retrieves current session', async () => {
    const { client } = await createAuthenticatedClient(
      testUser.email,
      testUser.password
    )
    
    const { data, error } = await client.auth.getSession()
    
    expect(error).toBeNull()
    expect(data.session).toBeDefined()
    expect(data.session?.user.email).toBe(testUser.email)
  })

  it('refreshes expired session', async () => {
    const { client, session } = await createAuthenticatedClient(
      testUser.email,
      testUser.password
    )
    
    // Force refresh
    const { data, error } = await client.auth.refreshSession({
      refresh_token: session!.refresh_token,
    })
    
    expect(error).toBeNull()
    expect(data.session?.access_token).toBeDefined()
    expect(data.session?.access_token).not.toBe(session?.access_token)
  })

  it('signs out and invalidates session', async () => {
    const { client } = await createAuthenticatedClient(
      testUser.email,
      testUser.password
    )
    
    await client.auth.signOut()
    
    const { data } = await client.auth.getSession()
    expect(data.session).toBeNull()
  })
})
```

### Pattern 4: Testing Password Reset

```typescript
describe('Password Reset Flow', () => {
  it('sends password reset email', async () => {
    const { email, cleanup } = await createTestUser()
    
    try {
      const client = createClient(
        process.env.SUPABASE_URL!,
        process.env.SUPABASE_ANON_KEY!
      )
      
      const { error } = await client.auth.resetPasswordForEmail(email, {
        redirectTo: 'http://localhost:3000/reset-password',
      })
      
      expect(error).toBeNull()
      // Note: Can't verify email delivery in tests
      // Use Supabase's Inbucket for local testing
    } finally {
      await cleanup()
    }
  })

  it('updates password with valid token', async () => {
    const { email, password, cleanup } = await createTestUser()
    
    try {
      // Sign in to get session
      const client = createClient(
        process.env.SUPABASE_URL!,
        process.env.SUPABASE_ANON_KEY!
      )
      
      await client.auth.signInWithPassword({ email, password })
      
      // Update password (requires active session)
      const newPassword = 'NewSecurePassword456!'
      const { error } = await client.auth.updateUser({
        password: newPassword,
      })
      
      expect(error).toBeNull()
      
      // Verify new password works
      await client.auth.signOut()
      const { error: signInError } = await client.auth.signInWithPassword({
        email,
        password: newPassword,
      })
      
      expect(signInError).toBeNull()
    } finally {
      await cleanup()
    }
  })
})
```

### Pattern 5: Testing User Metadata Updates

```typescript
describe('User Profile Updates', () => {
  it('updates user metadata', async () => {
    const { email, password, cleanup } = await createTestUser({
      user_metadata: { full_name: 'Original Name' }
    })
    
    try {
      const { client } = await createAuthenticatedClient(email, password)
      
      const { data, error } = await client.auth.updateUser({
        data: {
          full_name: 'Updated Name',
          phone: '+1234567890',
        }
      })
      
      expect(error).toBeNull()
      expect(data.user?.user_metadata.full_name).toBe('Updated Name')
      expect(data.user?.user_metadata.phone).toBe('+1234567890')
    } finally {
      await cleanup()
    }
  })

  it('updates email with verification', async () => {
    const { email, password, cleanup } = await createTestUser()
    
    try {
      const { client } = await createAuthenticatedClient(email, password)
      
      const newEmail = `updated-${Date.now()}@splitlease-test.com`
      const { error } = await client.auth.updateUser({
        email: newEmail,
      })
      
      // Email change requires verification
      expect(error).toBeNull()
      // Note: User must click verification link to complete
    } finally {
      await cleanup()
    }
  })
})
```

### Pattern 6: Testing Protected Data Access

```typescript
describe('Authenticated Data Access', () => {
  let seller: Awaited<ReturnType<typeof createTestUser>>
  let buyer: Awaited<ReturnType<typeof createTestUser>>
  let listingId: string
  
  beforeAll(async () => {
    seller = await createTestUser()
    buyer = await createTestUser()
    
    // Create listing as seller
    const { client: sellerClient } = await createAuthenticatedClient(
      seller.email,
      seller.password
    )
    
    const { data } = await sellerClient
      .from('listings')
      .insert({ title: 'Test Listing', price: 100 })
      .select()
      .single()
    
    listingId = data!.id
  })
  
  afterAll(async () => {
    await seller.cleanup()
    await buyer.cleanup()
  })

  it('seller can update their own listing', async () => {
    const { client } = await createAuthenticatedClient(seller.email, seller.password)
    
    const { error } = await client
      .from('listings')
      .update({ price: 150 })
      .eq('id', listingId)
    
    expect(error).toBeNull()
  })

  it('buyer cannot update seller listing', async () => {
    const { client } = await createAuthenticatedClient(buyer.email, buyer.password)
    
    const { data, error } = await client
      .from('listings')
      .update({ price: 9999 })
      .eq('id', listingId)
      .select()
    
    // RLS prevents update - returns empty array
    expect(data).toHaveLength(0)
  })

  it('unauthenticated user cannot access protected data', async () => {
    const anonClient = createClient(
      process.env.SUPABASE_URL!,
      process.env.SUPABASE_ANON_KEY!
    )
    
    const { data, error } = await anonClient
      .from('bookings') // Protected table
      .select()
    
    // Depends on RLS policy - might error or return empty
    expect(data).toHaveLength(0)
  })
})
```

## Unit Testing with Mocks

### Testing Auth Context Provider

```typescript
// src/contexts/__tests__/AuthContext.test.tsx
import { render, screen, waitFor, act } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { AuthProvider, useAuth } from '../AuthContext'
import { server } from '@/mocks/server'
import { http, HttpResponse } from 'msw'

// Test component that uses auth
function TestComponent() {
  const { user, signIn, signOut, loading } = useAuth()
  
  if (loading) return <div>Loading...</div>
  
  return (
    <div>
      {user ? (
        <>
          <span>Logged in as {user.email}</span>
          <button onClick={signOut}>Sign Out</button>
        </>
      ) : (
        <button onClick={() => signIn('test@example.com', 'password')}>
          Sign In
        </button>
      )}
    </div>
  )
}

describe('AuthContext', () => {
  it('provides user after sign in', async () => {
    const user = userEvent.setup()
    
    server.use(
      http.post('*/auth/v1/token*', () => {
        return HttpResponse.json({
          access_token: 'mock-token',
          user: { id: '123', email: 'test@example.com' },
        })
      })
    )
    
    render(
      <AuthProvider>
        <TestComponent />
      </AuthProvider>
    )
    
    await user.click(screen.getByRole('button', { name: /sign in/i }))
    
    await waitFor(() => {
      expect(screen.getByText(/logged in as test@example.com/i)).toBeInTheDocument()
    })
  })

  it('clears user after sign out', async () => {
    const user = userEvent.setup()
    
    // Start with authenticated state
    server.use(
      http.get('*/auth/v1/user', () => {
        return HttpResponse.json({ id: '123', email: 'test@example.com' })
      }),
      http.post('*/auth/v1/logout', () => {
        return new HttpResponse(null, { status: 204 })
      })
    )
    
    render(
      <AuthProvider initialUser={{ id: '123', email: 'test@example.com' }}>
        <TestComponent />
      </AuthProvider>
    )
    
    expect(screen.getByText(/logged in/i)).toBeInTheDocument()
    
    await user.click(screen.getByRole('button', { name: /sign out/i }))
    
    await waitFor(() => {
      expect(screen.getByRole('button', { name: /sign in/i })).toBeInTheDocument()
    })
  })

  it('handles auth errors gracefully', async () => {
    const user = userEvent.setup()
    
    server.use(
      http.post('*/auth/v1/token*', () => {
        return HttpResponse.json(
          { error: 'Invalid credentials' },
          { status: 400 }
        )
      })
    )
    
    render(
      <AuthProvider>
        <TestComponent />
      </AuthProvider>
    )
    
    await user.click(screen.getByRole('button', { name: /sign in/i }))
    
    // Should remain signed out
    await waitFor(() => {
      expect(screen.getByRole('button', { name: /sign in/i })).toBeInTheDocument()
    })
  })
})
```

### Testing Protected Route Component

```typescript
// src/components/__tests__/ProtectedRoute.test.tsx
import { render, screen } from '@testing-library/react'
import { MemoryRouter, Routes, Route } from 'react-router-dom'
import { ProtectedRoute } from '../ProtectedRoute'
import { AuthProvider } from '@/contexts/AuthContext'

function renderWithRouter(ui: React.ReactElement, initialRoute = '/') {
  return render(
    <MemoryRouter initialEntries={[initialRoute]}>
      <AuthProvider>
        {ui}
      </AuthProvider>
    </MemoryRouter>
  )
}

describe('ProtectedRoute', () => {
  it('redirects unauthenticated users to login', () => {
    renderWithRouter(
      <Routes>
        <Route path="/login" element={<div>Login Page</div>} />
        <Route 
          path="/dashboard" 
          element={
            <ProtectedRoute>
              <div>Dashboard</div>
            </ProtectedRoute>
          } 
        />
      </Routes>,
      '/dashboard'
    )
    
    expect(screen.getByText('Login Page')).toBeInTheDocument()
  })

  it('renders protected content for authenticated users', () => {
    renderWithRouter(
      <Routes>
        <Route 
          path="/dashboard" 
          element={
            <ProtectedRoute>
              <div>Dashboard Content</div>
            </ProtectedRoute>
          } 
        />
      </Routes>,
      '/dashboard',
      { user: { id: '123', email: 'test@example.com' } }
    )
    
    expect(screen.getByText('Dashboard Content')).toBeInTheDocument()
  })

  it('shows loading state while checking auth', () => {
    renderWithRouter(
      <Routes>
        <Route 
          path="/dashboard" 
          element={
            <ProtectedRoute>
              <div>Dashboard</div>
            </ProtectedRoute>
          } 
        />
      </Routes>,
      '/dashboard',
      { loading: true }
    )
    
    expect(screen.getByTestId('loading-spinner')).toBeInTheDocument()
  })
})
```

### Testing Login Form Component

```typescript
// src/components/__tests__/LoginForm.test.tsx
import { render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { LoginForm } from '../LoginForm'
import { server } from '@/mocks/server'
import { http, HttpResponse } from 'msw'

describe('LoginForm', () => {
  it('submits credentials and calls onSuccess', async () => {
    const user = userEvent.setup()
    const onSuccess = vi.fn()
    
    server.use(
      http.post('*/auth/v1/token*', () => {
        return HttpResponse.json({
          access_token: 'token',
          user: { id: '123', email: 'test@example.com' },
        })
      })
    )
    
    render(<LoginForm onSuccess={onSuccess} />)
    
    await user.type(screen.getByLabelText(/email/i), 'test@example.com')
    await user.type(screen.getByLabelText(/password/i), 'password123')
    await user.click(screen.getByRole('button', { name: /sign in/i }))
    
    await waitFor(() => {
      expect(onSuccess).toHaveBeenCalled()
    })
  })

  it('displays validation errors for empty fields', async () => {
    const user = userEvent.setup()
    
    render(<LoginForm onSuccess={vi.fn()} />)
    
    await user.click(screen.getByRole('button', { name: /sign in/i }))
    
    expect(screen.getByText(/email is required/i)).toBeInTheDocument()
    expect(screen.getByText(/password is required/i)).toBeInTheDocument()
  })

  it('displays API error message on failure', async () => {
    const user = userEvent.setup()
    
    server.use(
      http.post('*/auth/v1/token*', () => {
        return HttpResponse.json(
          { error: 'invalid_grant', error_description: 'Invalid login credentials' },
          { status: 400 }
        )
      })
    )
    
    render(<LoginForm onSuccess={vi.fn()} />)
    
    await user.type(screen.getByLabelText(/email/i), 'wrong@example.com')
    await user.type(screen.getByLabelText(/password/i), 'wrongpassword')
    await user.click(screen.getByRole('button', { name: /sign in/i }))
    
    await waitFor(() => {
      expect(screen.getByRole('alert')).toHaveTextContent(/invalid login credentials/i)
    })
  })

  it('disables submit button while loading', async () => {
    const user = userEvent.setup()
    
    server.use(
      http.post('*/auth/v1/token*', async () => {
        await new Promise(r => setTimeout(r, 100))
        return HttpResponse.json({ access_token: 'token', user: {} })
      })
    )
    
    render(<LoginForm onSuccess={vi.fn()} />)
    
    await user.type(screen.getByLabelText(/email/i), 'test@example.com')
    await user.type(screen.getByLabelText(/password/i), 'password123')
    await user.click(screen.getByRole('button', { name: /sign in/i }))
    
    expect(screen.getByRole('button', { name: /signing in/i })).toBeDisabled()
  })
})
```

## File Organization

```
src/
├── test/
│   ├── setup.ts                    # Vitest + MSW setup
│   └── auth-helpers.ts             # Test user creation helpers
├── mocks/
│   ├── handlers.ts
│   └── authHandlers.ts
├── contexts/
│   ├── AuthContext.tsx
│   └── __tests__/
│       └── AuthContext.test.tsx
├── components/
│   ├── LoginForm.tsx
│   ├── ProtectedRoute.tsx
│   └── __tests__/
│       ├── LoginForm.test.tsx
│       └── ProtectedRoute.test.tsx
└── features/
    └── auth/
        └── __tests__/
            ├── signup.integration.test.ts
            ├── signin.integration.test.ts
            └── session.integration.test.ts
```

## CI/CD Configuration

```yaml
# .github/workflows/auth-tests.yml
name: Auth Tests

on: [push, pull_request]

jobs:
  unit-tests:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - uses: actions/setup-node@v4
        with: { node-version: 20 }
      - run: npm ci
      - run: npm run test:unit -- --coverage
  
  integration-tests:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - uses: supabase/setup-cli@v1
      - run: supabase start
      - run: npm ci
      - run: npm run test:integration
        env:
          SUPABASE_URL: http://localhost:54321
          SUPABASE_ANON_KEY: ${{ secrets.LOCAL_ANON_KEY }}
          SUPABASE_SERVICE_ROLE_KEY: ${{ secrets.LOCAL_SERVICE_KEY }}
```

## Anti-Patterns to Avoid

| ❌ Anti-Pattern | ✅ Correct Approach |
|----------------|---------------------|
| Using real user emails in tests | Generate unique test emails with UUID |
| Not cleaning up test users | Always delete test users in `afterAll` |
| Testing against production | Use local Supabase or staging environment |
| Hardcoding test credentials | Use environment variables |
| Skipping error case tests | Test invalid credentials, network errors |
| Testing only happy path | Test session expiry, concurrent sessions |
