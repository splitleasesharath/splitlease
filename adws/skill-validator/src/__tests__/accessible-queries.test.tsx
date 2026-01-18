import { render, screen } from '@testing-library/react'
import { describe, it, expect } from 'vitest'

function AccessibleForm() {
  return (
    <form>
      <label htmlFor="email">Email address</label>
      <input id="email" type="email" role="textbox" />
      <button type="submit">Submit</button>
      <img src="/logo.png" alt="Company Logo" />
    </form>
  )
}

describe('Accessible Query Patterns', () => {
  // Priority 1: Queries accessible to everyone
  it('uses getByRole for interactive elements', () => {
    render(<AccessibleForm />)
    expect(screen.getByRole('textbox')).toBeInTheDocument()
    expect(screen.getByRole('button', { name: /submit/i })).toBeInTheDocument()
  })

  it('uses getByLabelText for form fields', () => {
    render(<AccessibleForm />)
    expect(screen.getByLabelText(/email/i)).toBeInTheDocument()
  })

  it('uses getByAltText for images', () => {
    render(<AccessibleForm />)
    expect(screen.getByAltText(/company logo/i)).toBeInTheDocument()
  })

  // Avoid: getByTestId should be last resort
  // it('avoids getByTestId when possible', () => { ... })
})