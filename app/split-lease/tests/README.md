# Testing Infrastructure

This directory contains all tests and testing utilities for the SplitLease application.

## Directory Structure

```
tests/
├── components/        # Component unit tests
├── integration/       # Integration tests
├── e2e/              # End-to-end tests (Playwright)
├── mocks/            # MSW API mock handlers
├── utils/            # Test utilities and factories
└── setup.ts          # Global test setup
```

## Testing Strategy

### Unit Tests (`components/`)
Test individual components in isolation.

**Tools**: Vitest + React Testing Library

```tsx
import { render, screen } from '@testing-library/react';
import { Button } from '@components/atomic/Button';

describe('Button', () => {
  it('renders with correct text', () => {
    render(<Button>Click Me</Button>);
    expect(screen.getByText('Click Me')).toBeInTheDocument();
  });

  it('calls onClick when clicked', () => {
    const handleClick = vi.fn();
    render(<Button onClick={handleClick}>Click</Button>);
    screen.getByText('Click').click();
    expect(handleClick).toHaveBeenCalledOnce();
  });
});
```

### Integration Tests (`integration/`)
Test how multiple components work together.

```tsx
import { render, screen } from '@testing-library/react';
import { SearchPage } from '@components/templates/SearchPage';

describe('SearchPage Integration', () => {
  it('displays search results after search', async () => {
    render(<SearchPage />);

    // Type in search
    await userEvent.type(screen.getByRole('textbox'), 'San Francisco');

    // Click search button
    await userEvent.click(screen.getByRole('button', { name: /search/i }));

    // Wait for results
    expect(await screen.findByText('Cozy 2BR in Downtown')).toBeInTheDocument();
  });
});
```

### E2E Tests (`e2e/`)
Test complete user workflows in a real browser.

**Tool**: Playwright

```typescript
import { test, expect } from '@playwright/test';

test('user can search and book a listing', async ({ page }) => {
  // Navigate to home page
  await page.goto('/');

  // Search for listings
  await page.fill('[data-testid="search-input"]', 'San Francisco');
  await page.click('[data-testid="search-button"]');

  // Wait for results
  await expect(page.locator('[data-testid="listing-card"]').first()).toBeVisible();

  // Click on first listing
  await page.click('[data-testid="listing-card"]').first();

  // Fill booking form
  await page.fill('[name="checkIn"]', '2024-01-01');
  await page.fill('[name="checkOut"]', '2024-01-07');
  await page.click('button[type="submit"]');

  // Verify booking confirmation
  await expect(page.locator('text=Booking Confirmed')).toBeVisible();
});
```

## Running Tests

### Unit Tests
```bash
# Run all unit tests
npm run test

# Watch mode
npm run test:watch

# With coverage
npm run test:coverage
```

### E2E Tests
```bash
# Run all E2E tests
npm run test:e2e

# Run in UI mode
npm run test:e2e:ui

# Run specific test file
npx playwright test tests/e2e/booking-flow.spec.ts
```

## API Mocking with MSW

Mock Service Worker intercepts network requests during testing.

### Adding Mock Handlers

```tsx
// tests/mocks/handlers.ts
import { http, HttpResponse } from 'msw';

export const handlers = [
  http.get('/api/listings/:id', ({ params }) => {
    return HttpResponse.json({
      success: true,
      data: {
        id: params.id,
        title: 'Mock Listing',
        price: 2500,
      },
    });
  }),
];
```

### Using in Tests

```tsx
import { server } from '@tests/mocks/server';
import { http, HttpResponse } from 'msw';

it('handles API errors', async () => {
  // Override handler for this test
  server.use(
    http.get('/api/listings/:id', () => {
      return HttpResponse.json(
        { success: false, error: 'Not Found' },
        { status: 404 }
      );
    })
  );

  // Test error handling
  render(<ListingDetail id="123" />);
  expect(await screen.findByText('Listing not found')).toBeInTheDocument();
});
```

## Test Data Factories

Use factories to generate consistent test data.

```tsx
import { createListing, createUser } from '@tests/utils/factories';

it('displays listing details', () => {
  const listing = createListing({
    title: 'Custom Title',
    price: 3000,
  });

  render(<ListingCard listing={listing} />);
  expect(screen.getByText('Custom Title')).toBeInTheDocument();
});
```

## Accessibility Testing

Use jest-axe to test accessibility:

```tsx
import { axe, toHaveNoViolations } from 'jest-axe';

expect.extend(toHaveNoViolations);

it('is accessible', async () => {
  const { container } = render(<Button>Click Me</Button>);
  const results = await axe(container);
  expect(results).toHaveNoViolations();
});
```

## Coverage Requirements

- **Lines**: 80% minimum
- **Functions**: 80% minimum
- **Branches**: 80% minimum
- **Statements**: 80% minimum

View coverage report:
```bash
npm run test:coverage
open coverage/index.html
```

## Best Practices

### 1. Test User Behavior, Not Implementation
```tsx
// ❌ Bad - testing implementation details
expect(component.state.count).toBe(1);

// ✅ Good - testing user behavior
expect(screen.getByText('Count: 1')).toBeInTheDocument();
```

### 2. Use Testing Library Queries Properly
Prefer queries in this order:
1. `getByRole` - most accessible
2. `getByLabelText` - for forms
3. `getByPlaceholderText` - for inputs
4. `getByText` - for non-interactive content
5. `getByTestId` - last resort

### 3. Async Assertions
Always await async queries:
```tsx
// ❌ Bad
expect(screen.getByText('Loading...')).toBeInTheDocument();

// ✅ Good
expect(await screen.findByText('Loaded!')).toBeInTheDocument();
```

### 4. Clean Up
Tests automatically clean up between runs, but for manual cleanup:
```tsx
afterEach(() => {
  cleanup();
  server.resetHandlers();
});
```

### 5. Descriptive Test Names
```tsx
// ❌ Bad
it('works', () => { /* ... */ });

// ✅ Good
it('displays error message when API request fails', () => { /* ... */ });
```

## Debugging Tests

### View Test Output
```bash
npm run test -- --reporter=verbose
```

### Debug in Browser (E2E)
```bash
npx playwright test --debug
```

### Debug with VS Code
Add to `.vscode/launch.json`:
```json
{
  "type": "node",
  "request": "launch",
  "name": "Debug Tests",
  "runtimeExecutable": "npm",
  "runtimeArgs": ["run", "test", "--", "--run"],
  "console": "integratedTerminal"
}
```

## CI/CD Integration

Tests run automatically on CI:
- Unit tests on every commit
- E2E tests on pull requests
- Coverage reports uploaded to code coverage service

## Additional Resources

- [Vitest Documentation](https://vitest.dev/)
- [React Testing Library](https://testing-library.com/react)
- [Playwright Documentation](https://playwright.dev/)
- [MSW Documentation](https://mswjs.io/)
