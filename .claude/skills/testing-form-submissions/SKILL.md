---
name: testing-form-submissions
description: Test React form components including validation, submission, and error handling using userEvent. Use this skill when testing booking forms, listing creation, login/signup, or any form with validation. userEvent simulates real user behavior better than fireEvent.
license: MIT
---

This skill guides testing React form components using `userEvent` from Testing Library. Forms are core to Split Lease—booking, listing creation, messaging all depend on forms working correctly.

## When to Use This Skill

- Testing booking forms (date selection, guest count)
- Testing listing creation forms
- Testing login/signup forms
- Testing search/filter forms
- Testing any form with validation
- Testing form submission and error handling

## Why userEvent Over fireEvent

```typescript
// ❌ fireEvent - synthetic events, misses real behavior
fireEvent.change(input, { target: { value: 'text' } })
fireEvent.click(button)

// ✅ userEvent - simulates actual user interaction
await user.type(input, 'text')  // Types character by character
await user.click(button)        // Includes focus, mousedown, mouseup
```

`userEvent`:
- Types character by character (catches onChange issues)
- Triggers focus/blur events
- Simulates keyboard navigation
- Respects disabled states
- More closely matches real user behavior

## Core Pattern

```typescript
import { render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'

describe('MyForm', () => {
  it('submits form data', async () => {
    const user = userEvent.setup()
    const onSubmit = vi.fn()

    render(<MyForm onSubmit={onSubmit} />)

    await user.type(screen.getByLabelText(/name/i), 'John Doe')
    await user.click(screen.getByRole('button', { name: /submit/i }))

    expect(onSubmit).toHaveBeenCalledWith({ name: 'John Doe' })
  })
})
```

## Testing Patterns for Split Lease

### Pattern 1: Login Form

```typescript
// src/components/LoginForm/LoginForm.test.tsx
import { render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { LoginForm } from './LoginForm'

describe('LoginForm', () => {
  it('submits with valid credentials', async () => {
    const user = userEvent.setup()
    const onSubmit = vi.fn()

    render(<LoginForm onSubmit={onSubmit} />)

    await user.type(screen.getByLabelText(/email/i), 'user@example.com')
    await user.type(screen.getByLabelText(/password/i), 'password123')
    await user.click(screen.getByRole('button', { name: /sign in/i }))

    expect(onSubmit).toHaveBeenCalledWith({
      email: 'user@example.com',
      password: 'password123',
    })
  })

  it('shows validation error for invalid email', async () => {
    const user = userEvent.setup()

    render(<LoginForm onSubmit={vi.fn()} />)

    await user.type(screen.getByLabelText(/email/i), 'invalid-email')
    await user.click(screen.getByRole('button', { name: /sign in/i }))

    expect(screen.getByText(/valid email/i)).toBeInTheDocument()
  })

  it('shows validation error for empty password', async () => {
    const user = userEvent.setup()

    render(<LoginForm onSubmit={vi.fn()} />)

    await user.type(screen.getByLabelText(/email/i), 'user@example.com')
    // Don't type password
    await user.click(screen.getByRole('button', { name: /sign in/i }))

    expect(screen.getByText(/password is required/i)).toBeInTheDocument()
  })

  it('disables submit button while submitting', async () => {
    const user = userEvent.setup()
    const onSubmit = vi.fn(() => new Promise(r => setTimeout(r, 100)))

    render(<LoginForm onSubmit={onSubmit} />)

    await user.type(screen.getByLabelText(/email/i), 'user@example.com')
    await user.type(screen.getByLabelText(/password/i), 'password123')
    await user.click(screen.getByRole('button', { name: /sign in/i }))

    expect(screen.getByRole('button', { name: /signing in/i })).toBeDisabled()

    await waitFor(() => {
      expect(screen.getByRole('button', { name: /sign in/i })).toBeEnabled()
    })
  })

  it('displays server error message', async () => {
    const user = userEvent.setup()
    const onSubmit = vi.fn().mockRejectedValue(new Error('Invalid credentials'))

    render(<LoginForm onSubmit={onSubmit} />)

    await user.type(screen.getByLabelText(/email/i), 'user@example.com')
    await user.type(screen.getByLabelText(/password/i), 'wrongpassword')
    await user.click(screen.getByRole('button', { name: /sign in/i }))

    await waitFor(() => {
      expect(screen.getByRole('alert')).toHaveTextContent(/invalid credentials/i)
    })
  })

  it('clears error when user starts typing', async () => {
    const user = userEvent.setup()
    const onSubmit = vi.fn().mockRejectedValue(new Error('Invalid credentials'))

    render(<LoginForm onSubmit={onSubmit} />)

    await user.type(screen.getByLabelText(/email/i), 'user@example.com')
    await user.type(screen.getByLabelText(/password/i), 'wrong')
    await user.click(screen.getByRole('button', { name: /sign in/i }))

    await waitFor(() => {
      expect(screen.getByRole('alert')).toBeInTheDocument()
    })

    await user.type(screen.getByLabelText(/password/i), 'a')

    expect(screen.queryByRole('alert')).not.toBeInTheDocument()
  })
})
```

### Pattern 2: Booking Form with Date Selection

```typescript
// src/components/BookingForm/BookingForm.test.tsx
import { render, screen, waitFor, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { BookingForm } from './BookingForm'

const mockListing = {
  id: 'listing-123',
  title: 'Downtown Studio',
  pricePerNight: 100,
  maxGuests: 4,
}

describe('BookingForm', () => {
  it('submits booking with selected dates and guests', async () => {
    const user = userEvent.setup()
    const onSubmit = vi.fn()

    render(<BookingForm listing={mockListing} onSubmit={onSubmit} />)

    // Open date picker and select dates
    await user.click(screen.getByLabelText(/check-in/i))
    await user.click(screen.getByRole('button', { name: /15/i })) // 15th of month

    await user.click(screen.getByLabelText(/check-out/i))
    await user.click(screen.getByRole('button', { name: /20/i })) // 20th of month

    // Select guest count
    await user.selectOptions(screen.getByLabelText(/guests/i), '2')

    // Submit
    await user.click(screen.getByRole('button', { name: /book now/i }))

    expect(onSubmit).toHaveBeenCalledWith(
      expect.objectContaining({
        listingId: 'listing-123',
        guests: 2,
        nights: 5,
        totalPrice: 500, // 5 nights * $100
      })
    )
  })

  it('calculates and displays total price', async () => {
    const user = userEvent.setup()

    render(<BookingForm listing={mockListing} onSubmit={vi.fn()} />)

    await user.click(screen.getByLabelText(/check-in/i))
    await user.click(screen.getByRole('button', { name: /10/i }))

    await user.click(screen.getByLabelText(/check-out/i))
    await user.click(screen.getByRole('button', { name: /13/i })) // 3 nights

    expect(screen.getByTestId('total-price')).toHaveTextContent('$300')
    expect(screen.getByTestId('nights-count')).toHaveTextContent('3 nights')
  })

  it('validates check-out after check-in', async () => {
    const user = userEvent.setup()

    render(<BookingForm listing={mockListing} onSubmit={vi.fn()} />)

    await user.click(screen.getByLabelText(/check-in/i))
    await user.click(screen.getByRole('button', { name: /20/i }))

    await user.click(screen.getByLabelText(/check-out/i))
    await user.click(screen.getByRole('button', { name: /15/i })) // Before check-in

    expect(screen.getByText(/check-out must be after check-in/i)).toBeInTheDocument()
  })

  it('enforces maximum guest count', async () => {
    const user = userEvent.setup()

    render(<BookingForm listing={mockListing} onSubmit={vi.fn()} />)

    const guestSelect = screen.getByLabelText(/guests/i)
    const options = within(guestSelect).getAllByRole('option')

    // Should only have options 1-4 (maxGuests)
    expect(options).toHaveLength(4)
    expect(options[3]).toHaveValue('4')
  })

  it('disables past dates in calendar', async () => {
    const user = userEvent.setup()

    render(<BookingForm listing={mockListing} onSubmit={vi.fn()} />)

    await user.click(screen.getByLabelText(/check-in/i))

    // Past dates should be disabled
    const pastDate = screen.getByRole('button', { name: /1/i })
    // Assuming current date is after the 1st
    expect(pastDate).toBeDisabled()
  })

  it('shows booking summary before submission', async () => {
    const user = userEvent.setup()

    render(<BookingForm listing={mockListing} onSubmit={vi.fn()} />)

    await user.click(screen.getByLabelText(/check-in/i))
    await user.click(screen.getByRole('button', { name: /10/i }))

    await user.click(screen.getByLabelText(/check-out/i))
    await user.click(screen.getByRole('button', { name: /12/i }))

    await user.selectOptions(screen.getByLabelText(/guests/i), '2')

    // Summary should show
    const summary = screen.getByTestId('booking-summary')
    expect(summary).toHaveTextContent('Downtown Studio')
    expect(summary).toHaveTextContent('2 nights')
    expect(summary).toHaveTextContent('2 guests')
    expect(summary).toHaveTextContent('$200')
  })
})
```

### Pattern 3: Listing Creation Form (Complex Multi-step)

```typescript
// src/components/CreateListingForm/CreateListingForm.test.tsx
import { render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { CreateListingForm } from './CreateListingForm'

describe('CreateListingForm', () => {
  it('completes multi-step form submission', async () => {
    const user = userEvent.setup()
    const onSubmit = vi.fn()

    render(<CreateListingForm onSubmit={onSubmit} />)

    // Step 1: Basic Info
    expect(screen.getByText(/step 1/i)).toBeInTheDocument()

    await user.type(screen.getByLabelText(/title/i), 'Cozy Downtown Room')
    await user.type(screen.getByLabelText(/description/i), 'A beautiful room...')
    await user.selectOptions(screen.getByLabelText(/category/i), 'room')

    await user.click(screen.getByRole('button', { name: /next/i }))

    // Step 2: Pricing
    expect(screen.getByText(/step 2/i)).toBeInTheDocument()

    await user.type(screen.getByLabelText(/price per night/i), '75')
    await user.type(screen.getByLabelText(/minimum nights/i), '2')

    await user.click(screen.getByRole('button', { name: /next/i }))

    // Step 3: Amenities
    expect(screen.getByText(/step 3/i)).toBeInTheDocument()

    await user.click(screen.getByLabelText(/wifi/i))
    await user.click(screen.getByLabelText(/kitchen/i))
    await user.click(screen.getByLabelText(/parking/i))

    await user.click(screen.getByRole('button', { name: /next/i }))

    // Step 4: Review & Submit
    expect(screen.getByText(/review your listing/i)).toBeInTheDocument()
    expect(screen.getByText('Cozy Downtown Room')).toBeInTheDocument()
    expect(screen.getByText('$75/night')).toBeInTheDocument()

    await user.click(screen.getByRole('button', { name: /publish listing/i }))

    expect(onSubmit).toHaveBeenCalledWith({
      title: 'Cozy Downtown Room',
      description: 'A beautiful room...',
      category: 'room',
      pricePerNight: 75,
      minimumNights: 2,
      amenities: ['wifi', 'kitchen', 'parking'],
    })
  })

  it('allows going back to previous steps', async () => {
    const user = userEvent.setup()

    render(<CreateListingForm onSubmit={vi.fn()} />)

    await user.type(screen.getByLabelText(/title/i), 'Test Title')
    await user.click(screen.getByRole('button', { name: /next/i }))

    expect(screen.getByText(/step 2/i)).toBeInTheDocument()

    await user.click(screen.getByRole('button', { name: /back/i }))

    expect(screen.getByText(/step 1/i)).toBeInTheDocument()
    expect(screen.getByLabelText(/title/i)).toHaveValue('Test Title')
  })

  it('validates required fields before proceeding', async () => {
    const user = userEvent.setup()

    render(<CreateListingForm onSubmit={vi.fn()} />)

    // Try to proceed without filling required fields
    await user.click(screen.getByRole('button', { name: /next/i }))

    expect(screen.getByText(/title is required/i)).toBeInTheDocument()
    expect(screen.getByText(/step 1/i)).toBeInTheDocument() // Still on step 1
  })
})
```

### Pattern 4: Search Form with Filters

```typescript
// src/components/SearchForm/SearchForm.test.tsx
import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { SearchForm } from './SearchForm'

describe('SearchForm', () => {
  it('submits search with all filters', async () => {
    const user = userEvent.setup()
    const onSearch = vi.fn()

    render(<SearchForm onSearch={onSearch} />)

    // Text search
    await user.type(screen.getByRole('searchbox'), 'downtown')

    // Category filter
    await user.click(screen.getByLabelText(/apartment/i))

    // Price range
    await user.type(screen.getByLabelText(/min price/i), '500')
    await user.type(screen.getByLabelText(/max price/i), '1500')

    // Amenities
    await user.click(screen.getByLabelText(/wifi/i))
    await user.click(screen.getByLabelText(/parking/i))

    await user.click(screen.getByRole('button', { name: /search/i }))

    expect(onSearch).toHaveBeenCalledWith({
      query: 'downtown',
      category: 'apartment',
      priceMin: 500,
      priceMax: 1500,
      amenities: ['wifi', 'parking'],
    })
  })

  it('clears all filters', async () => {
    const user = userEvent.setup()
    const onSearch = vi.fn()

    render(<SearchForm onSearch={onSearch} />)

    await user.type(screen.getByRole('searchbox'), 'test')
    await user.click(screen.getByLabelText(/wifi/i))

    expect(screen.getByRole('searchbox')).toHaveValue('test')
    expect(screen.getByLabelText(/wifi/i)).toBeChecked()

    await user.click(screen.getByRole('button', { name: /clear filters/i }))

    expect(screen.getByRole('searchbox')).toHaveValue('')
    expect(screen.getByLabelText(/wifi/i)).not.toBeChecked()
  })

  it('debounces search input', async () => {
    vi.useFakeTimers()
    const user = userEvent.setup({ advanceTimers: vi.advanceTimersByTime })
    const onSearch = vi.fn()

    render(<SearchForm onSearch={onSearch} debounceMs={300} />)

    await user.type(screen.getByRole('searchbox'), 'test')

    expect(onSearch).not.toHaveBeenCalled()

    await vi.advanceTimersByTimeAsync(300)

    expect(onSearch).toHaveBeenCalledTimes(1)

    vi.useRealTimers()
  })
})
```

### Pattern 5: File Upload Form

```typescript
// src/components/ImageUploadForm/ImageUploadForm.test.tsx
import { render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { ImageUploadForm } from './ImageUploadForm'

describe('ImageUploadForm', () => {
  it('uploads selected images', async () => {
    const user = userEvent.setup()
    const onUpload = vi.fn()

    render(<ImageUploadForm onUpload={onUpload} />)

    const file = new File(['image content'], 'photo.jpg', { type: 'image/jpeg' })
    const input = screen.getByLabelText(/upload photos/i)

    await user.upload(input, file)

    expect(screen.getByText('photo.jpg')).toBeInTheDocument()

    await user.click(screen.getByRole('button', { name: /upload/i }))

    expect(onUpload).toHaveBeenCalledWith([file])
  })

  it('supports multiple file selection', async () => {
    const user = userEvent.setup()
    const onUpload = vi.fn()

    render(<ImageUploadForm onUpload={onUpload} multiple />)

    const files = [
      new File(['img1'], 'photo1.jpg', { type: 'image/jpeg' }),
      new File(['img2'], 'photo2.jpg', { type: 'image/jpeg' }),
      new File(['img3'], 'photo3.jpg', { type: 'image/jpeg' }),
    ]

    await user.upload(screen.getByLabelText(/upload photos/i), files)

    expect(screen.getByText('photo1.jpg')).toBeInTheDocument()
    expect(screen.getByText('photo2.jpg')).toBeInTheDocument()
    expect(screen.getByText('photo3.jpg')).toBeInTheDocument()
  })

  it('validates file type', async () => {
    const user = userEvent.setup()

    render(<ImageUploadForm onUpload={vi.fn()} accept="image/*" />)

    const invalidFile = new File(['doc'], 'document.pdf', { type: 'application/pdf' })

    await user.upload(screen.getByLabelText(/upload photos/i), invalidFile)

    expect(screen.getByText(/only images allowed/i)).toBeInTheDocument()
  })

  it('validates file size', async () => {
    const user = userEvent.setup()

    render(<ImageUploadForm onUpload={vi.fn()} maxSizeMB={1} />)

    // Create a file > 1MB
    const largeContent = new Array(2 * 1024 * 1024).fill('a').join('')
    const largeFile = new File([largeContent], 'large.jpg', { type: 'image/jpeg' })

    await user.upload(screen.getByLabelText(/upload photos/i), largeFile)

    expect(screen.getByText(/file too large/i)).toBeInTheDocument()
  })

  it('allows removing selected files', async () => {
    const user = userEvent.setup()

    render(<ImageUploadForm onUpload={vi.fn()} />)

    const file = new File(['img'], 'photo.jpg', { type: 'image/jpeg' })

    await user.upload(screen.getByLabelText(/upload photos/i), file)

    expect(screen.getByText('photo.jpg')).toBeInTheDocument()

    await user.click(screen.getByRole('button', { name: /remove photo.jpg/i }))

    expect(screen.queryByText('photo.jpg')).not.toBeInTheDocument()
  })

  it('shows upload progress', async () => {
    const user = userEvent.setup()
    const onUpload = vi.fn(() => new Promise(r => setTimeout(r, 100)))

    render(<ImageUploadForm onUpload={onUpload} />)

    const file = new File(['img'], 'photo.jpg', { type: 'image/jpeg' })

    await user.upload(screen.getByLabelText(/upload photos/i), file)
    await user.click(screen.getByRole('button', { name: /upload/i }))

    expect(screen.getByRole('progressbar')).toBeInTheDocument()

    await waitFor(() => {
      expect(screen.queryByRole('progressbar')).not.toBeInTheDocument()
    })
  })
})
```

## Testing Form Libraries

### React Hook Form

```typescript
import { render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'

const schema = z.object({
  email: z.string().email(),
  password: z.string().min(8),
})

function TestForm({ onSubmit }: { onSubmit: (data: any) => void }) {
  const { register, handleSubmit, formState: { errors } } = useForm({
    resolver: zodResolver(schema),
  })

  return (
    <form onSubmit={handleSubmit(onSubmit)}>
      <input {...register('email')} aria-label="Email" />
      {errors.email && <span role="alert">{errors.email.message}</span>}
      
      <input {...register('password')} type="password" aria-label="Password" />
      {errors.password && <span role="alert">{errors.password.message}</span>}
      
      <button type="submit">Submit</button>
    </form>
  )
}

describe('React Hook Form', () => {
  it('validates with Zod schema', async () => {
    const user = userEvent.setup()
    const onSubmit = vi.fn()

    render(<TestForm onSubmit={onSubmit} />)

    await user.type(screen.getByLabelText(/email/i), 'invalid')
    await user.click(screen.getByRole('button'))

    expect(screen.getByRole('alert')).toHaveTextContent(/invalid/i)
    expect(onSubmit).not.toHaveBeenCalled()
  })
})
```

## Keyboard Navigation Testing

```typescript
it('supports keyboard form submission', async () => {
  const user = userEvent.setup()
  const onSubmit = vi.fn()

  render(<LoginForm onSubmit={onSubmit} />)

  await user.type(screen.getByLabelText(/email/i), 'user@example.com')
  await user.tab() // Move to password
  await user.type(screen.getByLabelText(/password/i), 'password123')
  await user.keyboard('{Enter}') // Submit with Enter

  expect(onSubmit).toHaveBeenCalled()
})

it('tabs through form fields in order', async () => {
  const user = userEvent.setup()

  render(<ContactForm />)

  await user.tab()
  expect(screen.getByLabelText(/name/i)).toHaveFocus()

  await user.tab()
  expect(screen.getByLabelText(/email/i)).toHaveFocus()

  await user.tab()
  expect(screen.getByLabelText(/message/i)).toHaveFocus()

  await user.tab()
  expect(screen.getByRole('button', { name: /send/i })).toHaveFocus()
})
```

## Anti-Patterns

| ❌ Anti-Pattern | ✅ Correct Approach |
|----------------|---------------------|
| `fireEvent.change()` | `await user.type()` |
| `fireEvent.click()` | `await user.click()` |
| Not awaiting userEvent | Always `await user.action()` |
| Forgetting `userEvent.setup()` | Call `setup()` at test start |
| Testing implementation details | Test form behavior and output |
| Skipping validation tests | Test all validation rules |
| Not testing error states | Test server errors and clearing |
