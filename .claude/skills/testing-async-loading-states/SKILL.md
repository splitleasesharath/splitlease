---
name: testing-async-loading-states
description: Test loading spinners, skeleton screens, error states, and data transitions in React components. Use this skill when testing components that fetch data, handling optimistic updates, or verifying user feedback during async operations. Ensures users see appropriate feedback at every stage.
license: MIT
---

This skill guides testing async states in React components—loading indicators, skeleton screens, success states, and error handling. Users experience these transitions constantly; untested async states cause confusing UX.

## When to Use This Skill

- Testing components that fetch data on mount
- Testing loading spinners and skeleton screens
- Testing error boundaries and error messages
- Testing optimistic updates
- Testing retry mechanisms
- Verifying accessible loading announcements

## Core Async States

```
┌─────────────────────────────────────────────────────────┐
│  IDLE → LOADING → SUCCESS/ERROR → (REVALIDATING)       │
│                                                         │
│  User sees:                                             │
│  - Idle: Empty or placeholder                           │
│  - Loading: Spinner/skeleton                            │
│  - Success: Data rendered                               │
│  - Error: Error message + retry option                  │
│  - Revalidating: Stale data + subtle indicator          │
└─────────────────────────────────────────────────────────┘
```

## Testing Patterns

### Pattern 1: Loading → Success Transition

```typescript
// src/components/ListingGrid/ListingGrid.test.tsx
import { render, screen, waitFor } from '@testing-library/react'
import { server } from '@/mocks/server'
import { http, HttpResponse } from 'msw'
import { ListingGrid } from './ListingGrid'

describe('ListingGrid', () => {
  it('shows loading skeleton then renders listings', async () => {
    // Delay response to observe loading state
    server.use(
      http.get('*/rest/v1/listings', async () => {
        await new Promise(r => setTimeout(r, 100))
        return HttpResponse.json([
          { id: '1', title: 'Downtown Studio', price: 1200 },
          { id: '2', title: 'Beach House', price: 2500 },
        ])
      })
    )

    render(<ListingGrid />)

    // 1. Assert loading state is visible immediately
    expect(screen.getByTestId('listing-skeleton')).toBeInTheDocument()
    // Or for multiple skeletons:
    expect(screen.getAllByTestId('skeleton-card')).toHaveLength(6)

    // 2. Wait for data to load
    await waitFor(() => {
      expect(screen.getByText('Downtown Studio')).toBeInTheDocument()
    })

    // 3. Assert loading state is gone
    expect(screen.queryByTestId('listing-skeleton')).not.toBeInTheDocument()

    // 4. Assert all data rendered
    expect(screen.getByText('Beach House')).toBeInTheDocument()
    expect(screen.getAllByTestId('listing-card')).toHaveLength(2)
  })
})
```

### Pattern 2: Loading → Error Transition

```typescript
it('shows error message when API fails', async () => {
  server.use(
    http.get('*/rest/v1/listings', () => {
      return HttpResponse.json(
        { message: 'Database connection failed' },
        { status: 500 }
      )
    })
  )

  render(<ListingGrid />)

  // Loading state first
  expect(screen.getByTestId('listing-skeleton')).toBeInTheDocument()

  // Wait for error state
  await waitFor(() => {
    expect(screen.getByRole('alert')).toBeInTheDocument()
  })

  // Assert error message
  expect(screen.getByRole('alert')).toHaveTextContent(/failed to load listings/i)

  // Assert retry button exists
  expect(screen.getByRole('button', { name: /try again/i })).toBeInTheDocument()

  // Assert loading skeleton is gone
  expect(screen.queryByTestId('listing-skeleton')).not.toBeInTheDocument()
})
```

### Pattern 3: Testing Retry After Error

```typescript
it('retries and succeeds after initial failure', async () => {
  const user = userEvent.setup()
  let callCount = 0

  server.use(
    http.get('*/rest/v1/listings', () => {
      callCount++
      if (callCount === 1) {
        return HttpResponse.json({ error: 'Server error' }, { status: 500 })
      }
      return HttpResponse.json([{ id: '1', title: 'Success Listing' }])
    })
  )

  render(<ListingGrid />)

  // Wait for error
  await waitFor(() => {
    expect(screen.getByRole('alert')).toBeInTheDocument()
  })

  // Click retry
  await user.click(screen.getByRole('button', { name: /try again/i }))

  // Should show loading again
  expect(screen.getByTestId('listing-skeleton')).toBeInTheDocument()

  // Wait for success
  await waitFor(() => {
    expect(screen.getByText('Success Listing')).toBeInTheDocument()
  })

  expect(callCount).toBe(2)
})
```

### Pattern 4: Empty State

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
  })

  // Assert empty state UI
  expect(screen.getByRole('img', { name: /empty/i })).toBeInTheDocument()
  expect(screen.getByRole('link', { name: /create listing/i })).toBeInTheDocument()

  // Assert no skeleton and no error
  expect(screen.queryByTestId('listing-skeleton')).not.toBeInTheDocument()
  expect(screen.queryByRole('alert')).not.toBeInTheDocument()
})
```

### Pattern 5: Stale-While-Revalidate

```typescript
it('shows stale data while revalidating', async () => {
  const user = userEvent.setup()

  // Initial data
  server.use(
    http.get('*/rest/v1/listings', () => {
      return HttpResponse.json([{ id: '1', title: 'Original Title', price: 100 }])
    })
  )

  render(<ListingGrid />)

  await waitFor(() => {
    expect(screen.getByText('Original Title')).toBeInTheDocument()
  })

  // Setup updated response
  server.use(
    http.get('*/rest/v1/listings', async () => {
      await new Promise(r => setTimeout(r, 100))
      return HttpResponse.json([{ id: '1', title: 'Updated Title', price: 150 }])
    })
  )

  // Trigger refetch
  await user.click(screen.getByRole('button', { name: /refresh/i }))

  // Stale data still visible
  expect(screen.getByText('Original Title')).toBeInTheDocument()

  // Revalidating indicator shown
  expect(screen.getByTestId('revalidating-indicator')).toBeInTheDocument()

  // Wait for fresh data
  await waitFor(() => {
    expect(screen.getByText('Updated Title')).toBeInTheDocument()
  })

  // Revalidating indicator gone
  expect(screen.queryByTestId('revalidating-indicator')).not.toBeInTheDocument()
})
```

### Pattern 6: Optimistic Updates

```typescript
it('shows optimistic update then confirms with server', async () => {
  const user = userEvent.setup()

  server.use(
    http.get('*/rest/v1/listings', () => {
      return HttpResponse.json([{ id: '1', title: 'My Listing', saved: false }])
    }),
    http.patch('*/rest/v1/listings', async () => {
      await new Promise(r => setTimeout(r, 100)) // Simulate slow server
      return HttpResponse.json([{ id: '1', saved: true }])
    })
  )

  render(<ListingCard listingId="1" />)

  await waitFor(() => {
    expect(screen.getByRole('button', { name: /save/i })).toBeInTheDocument()
  })

  // Click save
  await user.click(screen.getByRole('button', { name: /save/i }))

  // Optimistic: UI updates immediately
  expect(screen.getByRole('button', { name: /saved/i })).toBeInTheDocument()
  expect(screen.getByRole('button', { name: /saved/i })).toHaveAttribute('aria-pressed', 'true')

  // Wait for server confirmation (no visible change, but no rollback either)
  await waitFor(() => {
    // Still saved after server responds
    expect(screen.getByRole('button', { name: /saved/i })).toBeInTheDocument()
  })
})
```

### Pattern 7: Optimistic Update Rollback on Error

```typescript
it('rolls back optimistic update on server error', async () => {
  const user = userEvent.setup()

  server.use(
    http.get('*/rest/v1/listings', () => {
      return HttpResponse.json([{ id: '1', title: 'My Listing', saved: false }])
    }),
    http.patch('*/rest/v1/listings', () => {
      return HttpResponse.json({ error: 'Failed' }, { status: 500 })
    })
  )

  render(<ListingCard listingId="1" />)

  await waitFor(() => {
    expect(screen.getByRole('button', { name: /save/i })).toBeInTheDocument()
  })

  await user.click(screen.getByRole('button', { name: /save/i }))

  // Optimistic update shows saved
  expect(screen.getByRole('button', { name: /saved/i })).toBeInTheDocument()

  // After error, rolls back to unsaved
  await waitFor(() => {
    expect(screen.getByRole('button', { name: /save/i })).toBeInTheDocument()
  })

  // Error toast shown
  expect(screen.getByRole('alert')).toHaveTextContent(/failed to save/i)
})
```

### Pattern 8: Progressive Loading (Pagination)

```typescript
it('loads more listings on scroll/click', async () => {
  const user = userEvent.setup()

  server.use(
    http.get('*/rest/v1/listings', ({ request }) => {
      const url = new URL(request.url)
      const offset = parseInt(url.searchParams.get('offset') || '0')

      const allListings = Array.from({ length: 20 }, (_, i) => ({
        id: `${i + 1}`,
        title: `Listing ${i + 1}`,
      }))

      return HttpResponse.json(allListings.slice(offset, offset + 5))
    })
  )

  render(<InfiniteListingGrid />)

  // Initial load: 5 listings
  await waitFor(() => {
    expect(screen.getAllByTestId('listing-card')).toHaveLength(5)
  })

  expect(screen.getByText('Listing 1')).toBeInTheDocument()
  expect(screen.getByText('Listing 5')).toBeInTheDocument()

  // Click load more
  await user.click(screen.getByRole('button', { name: /load more/i }))

  // Loading indicator for pagination
  expect(screen.getByTestId('loading-more')).toBeInTheDocument()

  // Wait for next page
  await waitFor(() => {
    expect(screen.getAllByTestId('listing-card')).toHaveLength(10)
  })

  expect(screen.getByText('Listing 6')).toBeInTheDocument()
  expect(screen.getByText('Listing 10')).toBeInTheDocument()
})
```

### Pattern 9: Timeout Handling

```typescript
it('shows timeout error for slow requests', async () => {
  vi.useFakeTimers()

  server.use(
    http.get('*/rest/v1/listings', async () => {
      // Never resolves within timeout
      await new Promise(r => setTimeout(r, 60000))
      return HttpResponse.json([])
    })
  )

  render(<ListingGrid timeout={5000} />)

  expect(screen.getByTestId('listing-skeleton')).toBeInTheDocument()

  // Advance past timeout
  await vi.advanceTimersByTimeAsync(6000)

  await waitFor(() => {
    expect(screen.getByRole('alert')).toHaveTextContent(/request timed out/i)
  })

  vi.useRealTimers()
})
```

### Pattern 10: Accessible Loading Announcements

```typescript
it('announces loading state to screen readers', async () => {
  server.use(
    http.get('*/rest/v1/listings', async () => {
      await new Promise(r => setTimeout(r, 100))
      return HttpResponse.json([{ id: '1', title: 'Test' }])
    })
  )

  render(<ListingGrid />)

  // Loading announcement
  expect(screen.getByRole('status')).toHaveTextContent(/loading listings/i)
  // Or with aria-live
  expect(screen.getByLabelText(/loading/i)).toHaveAttribute('aria-busy', 'true')

  await waitFor(() => {
    expect(screen.getByText('Test')).toBeInTheDocument()
  })

  // Loaded announcement
  expect(screen.getByRole('status')).toHaveTextContent(/\d+ listings? loaded/i)
})
```

## Testing React Query States

```typescript
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { renderHook, waitFor } from '@testing-library/react'
import { useListings } from './useListings'

function createWrapper() {
  const queryClient = new QueryClient({
    defaultOptions: {
      queries: { retry: false },
    },
  })
  return ({ children }) => (
    <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>
  )
}

describe('useListings', () => {
  it('returns loading then data states', async () => {
    const { result } = renderHook(() => useListings(), {
      wrapper: createWrapper(),
    })

    // Initial loading state
    expect(result.current.isLoading).toBe(true)
    expect(result.current.data).toBeUndefined()

    // Wait for data
    await waitFor(() => {
      expect(result.current.isLoading).toBe(false)
    })

    expect(result.current.isSuccess).toBe(true)
    expect(result.current.data).toHaveLength(2)
  })

  it('returns error state on failure', async () => {
    server.use(
      http.get('*/listings', () => HttpResponse.json({}, { status: 500 }))
    )

    const { result } = renderHook(() => useListings(), {
      wrapper: createWrapper(),
    })

    await waitFor(() => {
      expect(result.current.isError).toBe(true)
    })

    expect(result.current.error).toBeDefined()
  })
})
```

## Common Mistakes

### Mistake 1: Not waiting for loading to finish

```typescript
// ❌ BAD: Assertion runs before data loads
it('shows listings', () => {
  render(<ListingGrid />)
  expect(screen.getByText('My Listing')).toBeInTheDocument() // Fails!
})

// ✅ GOOD: Wait for async operation
it('shows listings', async () => {
  render(<ListingGrid />)
  await waitFor(() => {
    expect(screen.getByText('My Listing')).toBeInTheDocument()
  })
})
```

### Mistake 2: Using arbitrary timeouts

```typescript
// ❌ BAD: Flaky, slow
it('shows data', async () => {
  render(<ListingGrid />)
  await new Promise(r => setTimeout(r, 1000))
  expect(screen.getByText('Data')).toBeInTheDocument()
})

// ✅ GOOD: Wait for specific condition
it('shows data', async () => {
  render(<ListingGrid />)
  await waitFor(() => {
    expect(screen.getByText('Data')).toBeInTheDocument()
  })
})
```

### Mistake 3: Not testing loading state

```typescript
// ❌ BAD: Only tests final state
it('shows listings', async () => {
  render(<ListingGrid />)
  expect(await screen.findByText('My Listing')).toBeInTheDocument()
})

// ✅ GOOD: Tests loading → success transition
it('shows loading then listings', async () => {
  render(<ListingGrid />)
  expect(screen.getByTestId('skeleton')).toBeInTheDocument()
  
  await waitFor(() => {
    expect(screen.queryByTestId('skeleton')).not.toBeInTheDocument()
  })
  
  expect(screen.getByText('My Listing')).toBeInTheDocument()
})
```

## Helper Functions

```typescript
// src/test/helpers/async.ts
import { screen, waitFor, waitForElementToBeRemoved } from '@testing-library/react'

export async function waitForLoadingToFinish() {
  await waitForElementToBeRemoved(() => 
    screen.queryByTestId('loading-skeleton')
  ).catch(() => {
    // Already removed or never existed
  })
}

export async function waitForDataToLoad(text: string | RegExp) {
  await waitFor(() => {
    expect(screen.getByText(text)).toBeInTheDocument()
  })
}

export async function expectErrorState(message: string | RegExp) {
  await waitFor(() => {
    expect(screen.getByRole('alert')).toHaveTextContent(message)
  })
}
```

## Anti-Patterns

| ❌ Anti-Pattern | ✅ Correct Approach |
|----------------|---------------------|
| `setTimeout` in tests | `waitFor()` with condition |
| Only testing success state | Test loading, error, empty states |
| Ignoring loading indicators | Assert skeleton/spinner visible |
| No accessibility testing | Test `aria-busy`, `role="status"` |
| Skipping rollback tests | Test optimistic update failures |
