import { renderHook, act } from '@testing-library/react'
import { useState, useCallback } from 'react'
import { describe, it, expect } from 'vitest'

function useCounter(initial = 0) {
  const [count, setCount] = useState(initial)
  const increment = useCallback(() => setCount(c => c + 1), [])
  const decrement = useCallback(() => setCount(c => c - 1), [])
  return { count, increment, decrement }
}

describe('Custom Hooks Testing', () => {
  it('starts with initial value', () => {
    const { result } = renderHook(() => useCounter(5))
    expect(result.current.count).toBe(5)
  })

  it('increments count', () => {
    const { result } = renderHook(() => useCounter())
    act(() => result.current.increment())
    expect(result.current.count).toBe(1)
  })

  it('decrements count', () => {
    const { result } = renderHook(() => useCounter(5))
    act(() => result.current.decrement())
    expect(result.current.count).toBe(4)
  })
})