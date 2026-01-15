import { render, screen } from '@testing-library/react'
import { describe, it, expect } from 'vitest'

function TestComponent() {
  return <div>Hello Test</div>
}

describe('Vitest RTL Setup', () => {
  it('renders component correctly', () => {
    render(<TestComponent />)
    expect(screen.getByText('Hello Test')).toBeInTheDocument()
  })
})