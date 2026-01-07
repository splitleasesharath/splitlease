---
name: testing-custom-hooks
description: Test React custom hooks in isolation using renderHook from Testing Library. Use this skill when testing useBooking, useListings, useAuth, or any custom hook logic. Isolates hook behavior from component rendering for focused, fast tests.
license: MIT
---

This skill guides testing React custom hooks using `renderHook()` from Testing Library. Hooks contain critical business logic—testing them in isolation catches bugs faster than full component tests.

## When to Use This Skill

- Testing data fetching hooks (useListings, useBooking)
- Testing form state hooks (useBookingForm)
- Testing auth hooks (useAuth, useSession)
- Testing utility hooks (useDebounce, useLocalStorage)
- Testing any hook with complex state logic

## Core Pattern

```typescript
import { renderHook, act, waitFor } from '@testing-library/react'
import { useMyHook } from './useMyHook'

describe('useMyHook', () => {
  it('returns initial state', () => {
    const { result } = renderHook(() => useMyHook())
    
    expect(result.current.value).toBe(initialValue)
  })

  it('updates state on action', () => {
    const { result } = renderHook(() => useMyHook())
    
    act(() => {
      result.current.setValue('new value')
    })
    
    expect(result.current.value).toBe('new value')
  })
})
```

## Testing Patterns for Split Lease

### Pattern 1: Simple State Hook

```typescript
// src/hooks/useCounter/useCounter.ts
import { useState, useCallback } from 'react'

export function useCounter(initialValue = 0) {
  const [count, setCount] = useState(initialValue)

  const increment = useCallback(() => setCount(c => c + 1), [])
  const decrement = useCallback(() => setCount(c => c - 1), [])
  const reset = useCallback(() => setCount(initialValue), [initialValue])

  return { count, increment, decrement, reset }
}

// src/hooks/useCounter/useCounter.test.ts
import { renderHook, act } from '@testing-library/react'
import { useCounter } from './useCounter'

describe('useCounter', () => {
  it('starts with initial value', () => {
    const { result } = renderHook(() => useCounter(10))
    expect(result.current.count).toBe(10)
  })

  it('defaults to 0', () => {
    const { result } = renderHook(() => useCounter())
    expect(result.current.count).toBe(0)
  })

  it('increments count', () => {
    const { result } = renderHook(() => useCounter(0))
    
    act(() => {
      result.current.increment()
    })
    
    expect(result.current.count).toBe(1)
  })

  it('decrements count', () => {
    const { result } = renderHook(() => useCounter(5))
    
    act(() => {
      result.current.decrement()
    })
    
    expect(result.current.count).toBe(4)
  })

  it('resets to initial value', () => {
    const { result } = renderHook(() => useCounter(10))
    
    act(() => {
      result.current.increment()
      result.current.increment()
    })
    
    expect(result.current.count).toBe(12)
    
    act(() => {
      result.current.reset()
    })
    
    expect(result.current.count).toBe(10)
  })
})
```

### Pattern 2: Async Data Fetching Hook

```typescript
// src/hooks/useListings/useListings.ts
import { useState, useEffect } from 'react'
import { supabase } from '@/lib/supabase'

interface Listing {
  id: string
  title: string
  price: number
}

interface UseListingsOptions {
  category?: string
  limit?: number
}

export function useListings(options: UseListingsOptions = {}) {
  const [listings, setListings] = useState<Listing[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<Error | null>(null)

  useEffect(() => {
    async function fetchListings() {
      setLoading(true)
      setError(null)

      try {
        let query = supabase.from('listings').select('*')

        if (options.category) {
          query = query.eq('category', options.category)
        }
        if (options.limit) {
          query = query.limit(options.limit)
        }

        const { data, error } = await query

        if (error) throw error
        setListings(data || [])
      } catch (e) {
        setError(e as Error)
      } finally {
        setLoading(false)
      }
    }

    fetchListings()
  }, [options.category, options.limit])

  return { listings, loading, error, refetch: () => {} }
}

// src/hooks/useListings/useListings.test.ts
import { renderHook, waitFor } from '@testing-library/react'
import { server } from '@/mocks/server'
import { http, HttpResponse } from 'msw'
import { useListings } from './useListings'

describe('useListings', () => {
  it('returns loading state initially', () => {
    const { result } = renderHook(() => useListings())
    
    expect(result.current.loading).toBe(true)
    expect(result.current.listings).toEqual([])
    expect(result.current.error).toBeNull()
  })

  it('fetches and returns listings', async () => {
    server.use(
      http.get('*/rest/v1/listings', () => {
        return HttpResponse.json([
          { id: '1', title: 'Studio', price: 1000 },
          { id: '2', title: 'Room', price: 800 },
        ])
      })
    )

    const { result } = renderHook(() => useListings())

    await waitFor(() => {
      expect(result.current.loading).toBe(false)
    })

    expect(result.current.listings).toHaveLength(2)
    expect(result.current.listings[0].title).toBe('Studio')
    expect(result.current.error).toBeNull()
  })

  it('handles fetch error', async () => {
    server.use(
      http.get('*/rest/v1/listings', () => {
        return HttpResponse.json({ error: 'Server error' }, { status: 500 })
      })
    )

    const { result } = renderHook(() => useListings())

    await waitFor(() => {
      expect(result.current.loading).toBe(false)
    })

    expect(result.current.error).toBeDefined()
    expect(result.current.listings).toEqual([])
  })

  it('filters by category', async () => {
    server.use(
      http.get('*/rest/v1/listings', ({ request }) => {
        const url = new URL(request.url)
        const category = url.searchParams.get('category')
        
        if (category === 'eq.apartment') {
          return HttpResponse.json([{ id: '1', title: 'Apartment', price: 1500 }])
        }
        return HttpResponse.json([])
      })
    )

    const { result } = renderHook(() => useListings({ category: 'apartment' }))

    await waitFor(() => {
      expect(result.current.loading).toBe(false)
    })

    expect(result.current.listings).toHaveLength(1)
    expect(result.current.listings[0].title).toBe('Apartment')
  })

  it('refetches when options change', async () => {
    let fetchCount = 0

    server.use(
      http.get('*/rest/v1/listings', () => {
        fetchCount++
        return HttpResponse.json([{ id: '1', title: `Fetch ${fetchCount}` }])
      })
    )

    const { result, rerender } = renderHook(
      ({ category }) => useListings({ category }),
      { initialProps: { category: 'apartment' } }
    )

    await waitFor(() => {
      expect(result.current.loading).toBe(false)
    })

    expect(fetchCount).toBe(1)

    // Change category
    rerender({ category: 'house' })

    await waitFor(() => {
      expect(fetchCount).toBe(2)
    })
  })
})
```

### Pattern 3: Form State Hook

```typescript
// src/hooks/useBookingForm/useBookingForm.ts
import { useState, useCallback, useMemo } from 'react'
import { differenceInDays, isAfter, isBefore, startOfDay } from 'date-fns'

interface BookingFormState {
  checkIn: Date | null
  checkOut: Date | null
  guests: number
}

interface BookingFormErrors {
  checkIn?: string
  checkOut?: string
  guests?: string
}

export function useBookingForm(pricePerNight: number, maxGuests: number) {
  const [state, setState] = useState<BookingFormState>({
    checkIn: null,
    checkOut: null,
    guests: 1,
  })

  const setCheckIn = useCallback((date: Date | null) => {
    setState(s => ({ ...s, checkIn: date }))
  }, [])

  const setCheckOut = useCallback((date: Date | null) => {
    setState(s => ({ ...s, checkOut: date }))
  }, [])

  const setGuests = useCallback((guests: number) => {
    setState(s => ({ ...s, guests }))
  }, [])

  const errors = useMemo((): BookingFormErrors => {
    const errs: BookingFormErrors = {}
    const today = startOfDay(new Date())

    if (state.checkIn && isBefore(state.checkIn, today)) {
      errs.checkIn = 'Check-in cannot be in the past'
    }

    if (state.checkOut && state.checkIn && !isAfter(state.checkOut, state.checkIn)) {
      errs.checkOut = 'Check-out must be after check-in'
    }

    if (state.guests < 1) {
      errs.guests = 'At least 1 guest required'
    }

    if (state.guests > maxGuests) {
      errs.guests = `Maximum ${maxGuests} guests allowed`
    }

    return errs
  }, [state, maxGuests])

  const isValid = useMemo(() => {
    return (
      state.checkIn !== null &&
      state.checkOut !== null &&
      state.guests >= 1 &&
      Object.keys(errors).length === 0
    )
  }, [state, errors])

  const nights = useMemo(() => {
    if (!state.checkIn || !state.checkOut) return 0
    return differenceInDays(state.checkOut, state.checkIn)
  }, [state.checkIn, state.checkOut])

  const totalPrice = useMemo(() => {
    return nights * pricePerNight
  }, [nights, pricePerNight])

  const reset = useCallback(() => {
    setState({ checkIn: null, checkOut: null, guests: 1 })
  }, [])

  return {
    ...state,
    setCheckIn,
    setCheckOut,
    setGuests,
    errors,
    isValid,
    nights,
    totalPrice,
    reset,
  }
}

// src/hooks/useBookingForm/useBookingForm.test.ts
import { renderHook, act } from '@testing-library/react'
import { useBookingForm } from './useBookingForm'

describe('useBookingForm', () => {
  const PRICE_PER_NIGHT = 100
  const MAX_GUESTS = 4

  it('initializes with default state', () => {
    const { result } = renderHook(() => useBookingForm(PRICE_PER_NIGHT, MAX_GUESTS))

    expect(result.current.checkIn).toBeNull()
    expect(result.current.checkOut).toBeNull()
    expect(result.current.guests).toBe(1)
    expect(result.current.isValid).toBe(false)
  })

  it('updates check-in date', () => {
    const { result } = renderHook(() => useBookingForm(PRICE_PER_NIGHT, MAX_GUESTS))
    const checkInDate = new Date('2025-03-01')

    act(() => {
      result.current.setCheckIn(checkInDate)
    })

    expect(result.current.checkIn).toEqual(checkInDate)
  })

  it('calculates nights correctly', () => {
    const { result } = renderHook(() => useBookingForm(PRICE_PER_NIGHT, MAX_GUESTS))

    act(() => {
      result.current.setCheckIn(new Date('2025-03-01'))
      result.current.setCheckOut(new Date('2025-03-08'))
    })

    expect(result.current.nights).toBe(7)
  })

  it('calculates total price correctly', () => {
    const { result } = renderHook(() => useBookingForm(PRICE_PER_NIGHT, MAX_GUESTS))

    act(() => {
      result.current.setCheckIn(new Date('2025-03-01'))
      result.current.setCheckOut(new Date('2025-03-04'))
    })

    expect(result.current.nights).toBe(3)
    expect(result.current.totalPrice).toBe(300) // 3 nights * $100
  })

  it('validates check-out after check-in', () => {
    const { result } = renderHook(() => useBookingForm(PRICE_PER_NIGHT, MAX_GUESTS))

    act(() => {
      result.current.setCheckIn(new Date('2025-03-05'))
      result.current.setCheckOut(new Date('2025-03-01')) // Before check-in
    })

    expect(result.current.errors.checkOut).toBe('Check-out must be after check-in')
    expect(result.current.isValid).toBe(false)
  })

  it('validates past check-in date', () => {
    const { result } = renderHook(() => useBookingForm(PRICE_PER_NIGHT, MAX_GUESTS))

    act(() => {
      result.current.setCheckIn(new Date('2020-01-01')) // Past date
    })

    expect(result.current.errors.checkIn).toBe('Check-in cannot be in the past')
  })

  it('validates guest count', () => {
    const { result } = renderHook(() => useBookingForm(PRICE_PER_NIGHT, MAX_GUESTS))

    act(() => {
      result.current.setGuests(0)
    })

    expect(result.current.errors.guests).toBe('At least 1 guest required')

    act(() => {
      result.current.setGuests(10)
    })

    expect(result.current.errors.guests).toBe('Maximum 4 guests allowed')
  })

  it('is valid with correct inputs', () => {
    const { result } = renderHook(() => useBookingForm(PRICE_PER_NIGHT, MAX_GUESTS))

    act(() => {
      result.current.setCheckIn(new Date('2025-06-01'))
      result.current.setCheckOut(new Date('2025-06-05'))
      result.current.setGuests(2)
    })

    expect(result.current.errors).toEqual({})
    expect(result.current.isValid).toBe(true)
  })

  it('resets form state', () => {
    const { result } = renderHook(() => useBookingForm(PRICE_PER_NIGHT, MAX_GUESTS))

    act(() => {
      result.current.setCheckIn(new Date('2025-06-01'))
      result.current.setCheckOut(new Date('2025-06-05'))
      result.current.setGuests(3)
    })

    expect(result.current.guests).toBe(3)

    act(() => {
      result.current.reset()
    })

    expect(result.current.checkIn).toBeNull()
    expect(result.current.checkOut).toBeNull()
    expect(result.current.guests).toBe(1)
  })
})
```

### Pattern 4: Hook with Context Dependencies

```typescript
// src/hooks/useCurrentUser/useCurrentUser.test.ts
import { renderHook, waitFor } from '@testing-library/react'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { AuthProvider } from '@/contexts/AuthContext'
import { useCurrentUser } from './useCurrentUser'

// Create wrapper with all required providers
function createWrapper() {
  const queryClient = new QueryClient({
    defaultOptions: { queries: { retry: false } },
  })

  return function Wrapper({ children }: { children: React.ReactNode }) {
    return (
      <QueryClientProvider client={queryClient}>
        <AuthProvider>
          {children}
        </AuthProvider>
      </QueryClientProvider>
    )
  }
}

describe('useCurrentUser', () => {
  it('returns null when not authenticated', async () => {
    const { result } = renderHook(() => useCurrentUser(), {
      wrapper: createWrapper(),
    })

    await waitFor(() => {
      expect(result.current.isLoading).toBe(false)
    })

    expect(result.current.user).toBeNull()
  })

  it('returns user when authenticated', async () => {
    // Mock authenticated state
    server.use(
      http.get('*/auth/v1/user', () => {
        return HttpResponse.json({
          id: 'user-123',
          email: 'test@example.com',
        })
      })
    )

    const { result } = renderHook(() => useCurrentUser(), {
      wrapper: createWrapper(),
    })

    await waitFor(() => {
      expect(result.current.isLoading).toBe(false)
    })

    expect(result.current.user).toEqual({
      id: 'user-123',
      email: 'test@example.com',
    })
  })
})
```

### Pattern 5: Hook with Side Effects (localStorage)

```typescript
// src/hooks/useLocalStorage/useLocalStorage.ts
import { useState, useEffect, useCallback } from 'react'

export function useLocalStorage<T>(key: string, initialValue: T) {
  const [storedValue, setStoredValue] = useState<T>(() => {
    try {
      const item = window.localStorage.getItem(key)
      return item ? JSON.parse(item) : initialValue
    } catch {
      return initialValue
    }
  })

  const setValue = useCallback((value: T | ((val: T) => T)) => {
    setStoredValue(prev => {
      const valueToStore = value instanceof Function ? value(prev) : value
      window.localStorage.setItem(key, JSON.stringify(valueToStore))
      return valueToStore
    })
  }, [key])

  const removeValue = useCallback(() => {
    window.localStorage.removeItem(key)
    setStoredValue(initialValue)
  }, [key, initialValue])

  return [storedValue, setValue, removeValue] as const
}

// src/hooks/useLocalStorage/useLocalStorage.test.ts
import { renderHook, act } from '@testing-library/react'
import { useLocalStorage } from './useLocalStorage'

describe('useLocalStorage', () => {
  beforeEach(() => {
    localStorage.clear()
  })

  it('returns initial value when localStorage is empty', () => {
    const { result } = renderHook(() => useLocalStorage('test-key', 'default'))

    expect(result.current[0]).toBe('default')
  })

  it('returns stored value from localStorage', () => {
    localStorage.setItem('test-key', JSON.stringify('stored value'))

    const { result } = renderHook(() => useLocalStorage('test-key', 'default'))

    expect(result.current[0]).toBe('stored value')
  })

  it('updates localStorage when value changes', () => {
    const { result } = renderHook(() => useLocalStorage('test-key', 'initial'))

    act(() => {
      result.current[1]('new value')
    })

    expect(result.current[0]).toBe('new value')
    expect(localStorage.getItem('test-key')).toBe('"new value"')
  })

  it('supports function updates', () => {
    const { result } = renderHook(() => useLocalStorage('count', 0))

    act(() => {
      result.current[1](prev => prev + 1)
    })

    expect(result.current[0]).toBe(1)

    act(() => {
      result.current[1](prev => prev + 1)
    })

    expect(result.current[0]).toBe(2)
  })

  it('removes value from localStorage', () => {
    localStorage.setItem('test-key', '"stored"')

    const { result } = renderHook(() => useLocalStorage('test-key', 'default'))

    expect(result.current[0]).toBe('stored')

    act(() => {
      result.current[2]() // removeValue
    })

    expect(result.current[0]).toBe('default')
    expect(localStorage.getItem('test-key')).toBeNull()
  })

  it('handles complex objects', () => {
    const { result } = renderHook(() =>
      useLocalStorage('user', { name: '', preferences: {} })
    )

    act(() => {
      result.current[1]({ name: 'John', preferences: { theme: 'dark' } })
    })

    expect(result.current[0]).toEqual({
      name: 'John',
      preferences: { theme: 'dark' },
    })
  })
})
```

### Pattern 6: Debounced Hook

```typescript
// src/hooks/useDebounce/useDebounce.ts
import { useState, useEffect } from 'react'

export function useDebounce<T>(value: T, delay: number): T {
  const [debouncedValue, setDebouncedValue] = useState<T>(value)

  useEffect(() => {
    const timer = setTimeout(() => {
      setDebouncedValue(value)
    }, delay)

    return () => {
      clearTimeout(timer)
    }
  }, [value, delay])

  return debouncedValue
}

// src/hooks/useDebounce/useDebounce.test.ts
import { renderHook, act } from '@testing-library/react'
import { useDebounce } from './useDebounce'

describe('useDebounce', () => {
  beforeEach(() => {
    vi.useFakeTimers()
  })

  afterEach(() => {
    vi.useRealTimers()
  })

  it('returns initial value immediately', () => {
    const { result } = renderHook(() => useDebounce('initial', 500))

    expect(result.current).toBe('initial')
  })

  it('debounces value changes', () => {
    const { result, rerender } = renderHook(
      ({ value }) => useDebounce(value, 500),
      { initialProps: { value: 'initial' } }
    )

    // Change value
    rerender({ value: 'updated' })

    // Still old value before delay
    expect(result.current).toBe('initial')

    // Advance time
    act(() => {
      vi.advanceTimersByTime(500)
    })

    // Now updated
    expect(result.current).toBe('updated')
  })

  it('cancels pending update on new value', () => {
    const { result, rerender } = renderHook(
      ({ value }) => useDebounce(value, 500),
      { initialProps: { value: 'first' } }
    )

    rerender({ value: 'second' })

    act(() => {
      vi.advanceTimersByTime(300) // Partial delay
    })

    rerender({ value: 'third' })

    act(() => {
      vi.advanceTimersByTime(300) // Another partial delay
    })

    // Still 'first' because timer keeps resetting
    expect(result.current).toBe('first')

    act(() => {
      vi.advanceTimersByTime(200) // Complete delay for 'third'
    })

    // Jumped to 'third', skipped 'second'
    expect(result.current).toBe('third')
  })
})
```

## Testing Hooks with rerender

Test prop/dependency changes:

```typescript
it('refetches when userId changes', async () => {
  const { result, rerender } = renderHook(
    ({ userId }) => useUserProfile(userId),
    { initialProps: { userId: 'user-1' } }
  )

  await waitFor(() => {
    expect(result.current.data?.id).toBe('user-1')
  })

  // Change userId
  rerender({ userId: 'user-2' })

  await waitFor(() => {
    expect(result.current.data?.id).toBe('user-2')
  })
})
```

## Common Mistakes

### Mistake 1: Forgetting act()

```typescript
// ❌ BAD: State update outside act()
it('updates count', () => {
  const { result } = renderHook(() => useCounter())
  result.current.increment() // Warning!
  expect(result.current.count).toBe(1)
})

// ✅ GOOD: Wrap in act()
it('updates count', () => {
  const { result } = renderHook(() => useCounter())
  act(() => {
    result.current.increment()
  })
  expect(result.current.count).toBe(1)
})
```

### Mistake 2: Missing wrapper for context

```typescript
// ❌ BAD: Hook needs context but wrapper missing
it('returns user', () => {
  const { result } = renderHook(() => useAuth()) // Error!
})

// ✅ GOOD: Provide wrapper
it('returns user', () => {
  const { result } = renderHook(() => useAuth(), {
    wrapper: AuthProvider,
  })
})
```

### Mistake 3: Not waiting for async

```typescript
// ❌ BAD: Assertion before async completes
it('fetches data', () => {
  const { result } = renderHook(() => useData())
  expect(result.current.data).toHaveLength(2) // Fails!
})

// ✅ GOOD: Wait for loading to complete
it('fetches data', async () => {
  const { result } = renderHook(() => useData())
  await waitFor(() => {
    expect(result.current.isLoading).toBe(false)
  })
  expect(result.current.data).toHaveLength(2)
})
```

## Anti-Patterns

| ❌ Anti-Pattern | ✅ Correct Approach |
|----------------|---------------------|
| Testing hooks inside components | Use `renderHook()` for isolation |
| No `act()` for state updates | Wrap updates in `act()` |
| Missing context wrapper | Create wrapper with providers |
| Sync assertions for async hooks | Use `waitFor()` |
| Testing implementation details | Test return values and behavior |
