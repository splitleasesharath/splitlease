---
name: mocking-supabase-msw
description: Mock Supabase REST API calls using Mock Service Worker (MSW) for fast, isolated React component and hook testing. Use this skill when testing components that fetch from Supabase, testing error states and loading behaviors, or running tests without a live database connection. Enables sub-second test execution with full control over API responses.
license: MIT
---

This skill guides mocking Supabase REST API calls using Mock Service Worker (MSW 2.x). MSW intercepts requests at the network level, allowing components to use real Supabase client code while receiving controlled test responses.

## When to Use This Skill

- Testing React components that fetch Supabase data
- Testing error handling and loading states
- Running fast unit tests without database connection
- Simulating edge cases (empty results, malformed data, timeouts)
- Testing offline behavior

## Prerequisites

```bash
npm install msw --save-dev
```

## Core Setup

### 1. Create Handler File

```typescript
// src/mocks/handlers.ts
import { http, HttpResponse } from 'msw'

const SUPABASE_URL = import.meta.env.VITE_SUPABASE_URL || 'https://test.supabase.co'

export const supabaseHandlers = [
  // GET /rest/v1/listings - fetch listings
  http.get(`${SUPABASE_URL}/rest/v1/listings`, ({ request }) => {
    const url = new URL(request.url)
    const category = url.searchParams.get('category')
    const select = url.searchParams.get('select')
    
    const listings = [
      { id: '1', title: 'Downtown Studio', price: 1200, category: 'apartment' },
      { id: '2', title: 'Shared House', price: 800, category: 'house' },
      { id: '3', title: 'Beach Condo', price: 1500, category: 'apartment' },
    ]
    
    const filtered = category 
      ? listings.filter(l => l.category === `eq.${category}`)
      : listings
    
    return HttpResponse.json(filtered)
  }),

  // GET /rest/v1/listings?id=eq.X - fetch single listing
  http.get(`${SUPABASE_URL}/rest/v1/listings`, ({ request }) => {
    const url = new URL(request.url)
    const idFilter = url.searchParams.get('id')
    
    if (idFilter?.startsWith('eq.')) {
      const id = idFilter.replace('eq.', '')
      return HttpResponse.json([
        { id, title: 'Test Listing', price: 1000, description: 'A great place' }
      ])
    }
    
    return HttpResponse.json([])
  }),

  // POST /rest/v1/listings - create listing
  http.post(`${SUPABASE_URL}/rest/v1/listings`, async ({ request }) => {
    const body = await request.json()
    const newListing = {
      id: crypto.randomUUID(),
      created_at: new Date().toISOString(),
      ...body,
    }
    return HttpResponse.json(newListing, { status: 201 })
  }),

  // PATCH /rest/v1/listings?id=eq.X - update listing
  http.patch(`${SUPABASE_URL}/rest/v1/listings`, async ({ request }) => {
    const url = new URL(request.url)
    const idFilter = url.searchParams.get('id')
    const body = await request.json()
    
    if (idFilter?.startsWith('eq.')) {
      const id = idFilter.replace('eq.', '')
      return HttpResponse.json([{ id, ...body, updated_at: new Date().toISOString() }])
    }
    
    return HttpResponse.json([], { status: 200 })
  }),

  // DELETE /rest/v1/listings?id=eq.X - delete listing
  http.delete(`${SUPABASE_URL}/rest/v1/listings`, ({ request }) => {
    const url = new URL(request.url)
    const idFilter = url.searchParams.get('id')
    
    if (idFilter?.startsWith('eq.')) {
      return new HttpResponse(null, { status: 204 })
    }
    
    return HttpResponse.json({ error: 'Not found' }, { status: 404 })
  }),
]

export const handlers = [...supabaseHandlers]
```

### 2. Create MSW Server

```typescript
// src/mocks/server.ts
import { setupServer } from 'msw/node'
import { handlers } from './handlers'

export const server = setupServer(...handlers)
```

### 3. Configure Vitest Setup

```typescript
// src/test/setup.ts
import '@testing-library/jest-dom/vitest'
import { cleanup } from '@testing-library/react'
import { afterAll, afterEach, beforeAll } from 'vitest'
import { server } from '../mocks/server'

// Start MSW server before all tests
beforeAll(() => server.listen({ onUnhandledRequest: 'error' }))

// Reset handlers after each test (important!)
afterEach(() => {
  server.resetHandlers()
  cleanup()
})

// Clean up after all tests
afterAll(() => server.close())
```

### 4. Update Vitest Config

```typescript
// vitest.config.ts
import { defineConfig } from 'vitest/config'
import react from '@vitejs/plugin-react'

export default defineConfig({
  plugins: [react()],
  test: {
    globals: true,
    environment: 'jsdom',
    setupFiles: './src/test/setup.ts',
  },
})
```

## Testing Patterns for Split Lease

### Pattern 1: Testing Component Data Fetching

```typescript
// src/components/ListingGrid.test.tsx
import { render, screen, waitFor } from '@testing-library/react'
import { server } from '../mocks/server'
import { http, HttpResponse } from 'msw'
import { ListingGrid } from './ListingGrid'

describe('ListingGrid', () => {
  it('renders listings from API', async () => {
    render(<ListingGrid />)
    
    // Wait for data to load
    await waitFor(() => {
      expect(screen.getByText('Downtown Studio')).toBeInTheDocument()
      expect(screen.getByText('Shared House')).toBeInTheDocument()
    })
  })

  it('filters by category', async () => {
    server.use(
      http.get('*/rest/v1/listings', ({ request }) => {
        const url = new URL(request.url)
        if (url.searchParams.get('category') === 'eq.apartment') {
          return HttpResponse.json([
            { id: '1', title: 'Downtown Studio', category: 'apartment' }
          ])
        }
        return HttpResponse.json([])
      })
    )
    
    render(<ListingGrid category="apartment" />)
    
    await waitFor(() => {
      expect(screen.getByText('Downtown Studio')).toBeInTheDocument()
      expect(screen.queryByText('Shared House')).not.toBeInTheDocument()
    })
  })
})
```

### Pattern 2: Testing Loading States

```typescript
it('shows loading skeleton while fetching', async () => {
  // Delay response to observe loading state
  server.use(
    http.get('*/rest/v1/listings', async () => {
      await new Promise(resolve => setTimeout(resolve, 100))
      return HttpResponse.json([{ id: '1', title: 'Test' }])
    })
  )
  
  render(<ListingGrid />)
  
  // Loading state should be visible immediately
  expect(screen.getByTestId('loading-skeleton')).toBeInTheDocument()
  
  // Data should appear after loading
  await waitFor(() => {
    expect(screen.queryByTestId('loading-skeleton')).not.toBeInTheDocument()
    expect(screen.getByText('Test')).toBeInTheDocument()
  })
})
```

### Pattern 3: Testing Error States

```typescript
it('displays error message on API failure', async () => {
  server.use(
    http.get('*/rest/v1/listings', () => {
      return HttpResponse.json(
        { message: 'Database connection failed' },
        { status: 500 }
      )
    })
  )
  
  render(<ListingGrid />)
  
  await waitFor(() => {
    expect(screen.getByRole('alert')).toHaveTextContent(/error loading listings/i)
  })
})

it('handles network timeout', async () => {
  server.use(
    http.get('*/rest/v1/listings', () => {
      return HttpResponse.error() // Simulates network failure
    })
  )
  
  render(<ListingGrid />)
  
  await waitFor(() => {
    expect(screen.getByText(/network error/i)).toBeInTheDocument()
  })
})
```

### Pattern 4: Testing Empty States

```typescript
it('shows empty state when no listings exist', async () => {
  server.use(
    http.get('*/rest/v1/listings', () => {
      return HttpResponse.json([])
    })
  )
  
  render(<ListingGrid />)
  
  await waitFor(() => {
    expect(screen.getByText(/no listings found/i)).toBeInTheDocument()
    expect(screen.getByRole('link', { name: /create listing/i })).toBeInTheDocument()
  })
})
```

### Pattern 5: Testing Form Submissions (POST)

```typescript
import userEvent from '@testing-library/user-event'

it('creates new listing on form submit', async () => {
  const user = userEvent.setup()
  let capturedBody: any = null
  
  server.use(
    http.post('*/rest/v1/listings', async ({ request }) => {
      capturedBody = await request.json()
      return HttpResponse.json({
        id: 'new-listing-123',
        ...capturedBody,
      }, { status: 201 })
    })
  )
  
  render(<CreateListingForm />)
  
  await user.type(screen.getByLabelText(/title/i), 'My New Room')
  await user.type(screen.getByLabelText(/price/i), '950')
  await user.selectOptions(screen.getByLabelText(/category/i), 'apartment')
  await user.click(screen.getByRole('button', { name: /create/i }))
  
  await waitFor(() => {
    expect(capturedBody).toEqual({
      title: 'My New Room',
      price: 950,
      category: 'apartment',
    })
    expect(screen.getByText(/listing created/i)).toBeInTheDocument()
  })
})
```

### Pattern 6: Testing Optimistic Updates

```typescript
it('shows optimistic update then confirms', async () => {
  const user = userEvent.setup()
  let updateReceived = false
  
  server.use(
    http.patch('*/rest/v1/listings', async ({ request }) => {
      // Simulate slow server
      await new Promise(resolve => setTimeout(resolve, 100))
      updateReceived = true
      const body = await request.json()
      return HttpResponse.json([{ id: '1', ...body }])
    })
  )
  
  render(<ListingCard listing={{ id: '1', title: 'Room', price: 100 }} />)
  
  await user.click(screen.getByRole('button', { name: /edit price/i }))
  await user.clear(screen.getByLabelText(/price/i))
  await user.type(screen.getByLabelText(/price/i), '150')
  await user.click(screen.getByRole('button', { name: /save/i }))
  
  // Optimistic update shows immediately
  expect(screen.getByText('$150')).toBeInTheDocument()
  
  // Server confirms
  await waitFor(() => {
    expect(updateReceived).toBe(true)
  })
})
```

### Pattern 7: Testing Pagination

```typescript
it('loads more listings on scroll', async () => {
  const user = userEvent.setup()
  
  server.use(
    http.get('*/rest/v1/listings', ({ request }) => {
      const url = new URL(request.url)
      const offset = parseInt(url.searchParams.get('offset') || '0')
      
      const allListings = Array.from({ length: 50 }, (_, i) => ({
        id: `listing-${i}`,
        title: `Listing ${i}`,
      }))
      
      return HttpResponse.json(allListings.slice(offset, offset + 10))
    })
  )
  
  render(<InfiniteListingGrid />)
  
  // First page loads
  await waitFor(() => {
    expect(screen.getByText('Listing 0')).toBeInTheDocument()
  })
  
  // Trigger load more
  await user.click(screen.getByRole('button', { name: /load more/i }))
  
  // Second page loads
  await waitFor(() => {
    expect(screen.getByText('Listing 10')).toBeInTheDocument()
  })
})
```

### Pattern 8: Testing Supabase Realtime Fallback

When realtime fails, components often fall back to polling:

```typescript
it('falls back to polling when realtime unavailable', async () => {
  let fetchCount = 0
  
  server.use(
    http.get('*/rest/v1/bookings', () => {
      fetchCount++
      return HttpResponse.json([
        { id: '1', status: fetchCount > 2 ? 'confirmed' : 'pending' }
      ])
    })
  )
  
  vi.useFakeTimers()
  render(<BookingStatus bookingId="1" pollingInterval={5000} />)
  
  await waitFor(() => {
    expect(screen.getByText('pending')).toBeInTheDocument()
  })
  
  // Advance time to trigger poll
  await vi.advanceTimersByTimeAsync(5000)
  await vi.advanceTimersByTimeAsync(5000)
  await vi.advanceTimersByTimeAsync(5000)
  
  await waitFor(() => {
    expect(screen.getByText('confirmed')).toBeInTheDocument()
  })
  
  vi.useRealTimers()
})
```

## Mocking Supabase Auth Endpoints

```typescript
// src/mocks/authHandlers.ts
import { http, HttpResponse } from 'msw'

const SUPABASE_URL = import.meta.env.VITE_SUPABASE_URL

export const authHandlers = [
  // Sign in with password
  http.post(`${SUPABASE_URL}/auth/v1/token`, async ({ request }) => {
    const url = new URL(request.url)
    const grantType = url.searchParams.get('grant_type')
    
    if (grantType === 'password') {
      const body = await request.json()
      
      if (body.email === 'test@example.com' && body.password === 'password123') {
        return HttpResponse.json({
          access_token: 'mock-access-token',
          refresh_token: 'mock-refresh-token',
          expires_in: 3600,
          user: {
            id: 'user-123',
            email: 'test@example.com',
            role: 'authenticated',
          },
        })
      }
      
      return HttpResponse.json(
        { error: 'invalid_grant', error_description: 'Invalid credentials' },
        { status: 400 }
      )
    }
    
    return HttpResponse.json({ error: 'unsupported_grant_type' }, { status: 400 })
  }),
  
  // Get current session
  http.get(`${SUPABASE_URL}/auth/v1/user`, ({ request }) => {
    const authHeader = request.headers.get('Authorization')
    
    if (authHeader === 'Bearer mock-access-token') {
      return HttpResponse.json({
        id: 'user-123',
        email: 'test@example.com',
        role: 'authenticated',
      })
    }
    
    return HttpResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }),
  
  // Sign out
  http.post(`${SUPABASE_URL}/auth/v1/logout`, () => {
    return new HttpResponse(null, { status: 204 })
  }),
]
```

## Mocking Supabase Storage

```typescript
// src/mocks/storageHandlers.ts
import { http, HttpResponse } from 'msw'

const SUPABASE_URL = import.meta.env.VITE_SUPABASE_URL

export const storageHandlers = [
  // Upload file
  http.post(`${SUPABASE_URL}/storage/v1/object/:bucket/:path*`, () => {
    return HttpResponse.json({
      Key: 'listings/photo-123.jpg',
      Id: 'file-id-123',
    })
  }),
  
  // Get public URL (client-side construction, but if needed)
  http.get(`${SUPABASE_URL}/storage/v1/object/public/:bucket/:path*`, () => {
    // Return a test image
    return new HttpResponse(
      new Blob(['fake-image-data'], { type: 'image/jpeg' }),
      { headers: { 'Content-Type': 'image/jpeg' } }
    )
  }),
  
  // Delete file
  http.delete(`${SUPABASE_URL}/storage/v1/object/:bucket/:path*`, () => {
    return new HttpResponse(null, { status: 204 })
  }),
]
```

## Advanced: Request Assertion Pattern

Capture and assert on requests made during tests:

```typescript
it('sends correct headers and query params', async () => {
  const requests: Request[] = []
  
  server.use(
    http.get('*/rest/v1/listings', ({ request }) => {
      requests.push(request.clone())
      return HttpResponse.json([])
    })
  )
  
  render(<ListingGrid category="apartment" limit={20} />)
  
  await waitFor(() => {
    expect(requests).toHaveLength(1)
  })
  
  const url = new URL(requests[0].url)
  expect(url.searchParams.get('category')).toBe('eq.apartment')
  expect(url.searchParams.get('limit')).toBe('20')
  expect(requests[0].headers.get('apikey')).toBeTruthy()
})
```

## File Organization

```
src/
├── mocks/
│   ├── handlers.ts           # Combined handlers export
│   ├── supabaseHandlers.ts   # REST API handlers
│   ├── authHandlers.ts       # Auth endpoint handlers
│   ├── storageHandlers.ts    # Storage endpoint handlers
│   └── server.ts             # MSW server setup
├── test/
│   └── setup.ts              # Vitest setup with MSW
└── components/
    ├── ListingGrid.tsx
    └── ListingGrid.test.tsx
```

## Anti-Patterns to Avoid

| ❌ Anti-Pattern | ✅ Correct Approach |
|----------------|---------------------|
| Mocking fetch/axios directly | Use MSW at network level |
| Forgetting `server.resetHandlers()` | Always reset in `afterEach` |
| Hardcoding full Supabase URL | Use environment variable or wildcard `*` |
| Not handling all HTTP methods | Mock GET, POST, PATCH, DELETE |
| Ignoring query parameters | Parse and respond based on filters |
| Testing only success cases | Test errors, empty states, timeouts |

## Debugging MSW Issues

1. **Requests not intercepted**: Check URL matches exactly (including trailing slashes)
2. **Handler not called**: Verify `onUnhandledRequest: 'error'` is set
3. **Wrong response**: Add `console.log` in handler to debug request details
4. **Test pollution**: Ensure `server.resetHandlers()` runs after each test

```typescript
// Debug helper
server.events.on('request:start', ({ request }) => {
  console.log('MSW intercepted:', request.method, request.url)
})
```

## Performance Tips

- MSW handlers run synchronously by default—no network latency
- For realistic timing tests, add explicit delays with `setTimeout`
- Use `server.use()` for test-specific overrides, not global handler changes
- Reset handlers between tests to prevent test pollution
