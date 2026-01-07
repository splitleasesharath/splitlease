---
name: test-file-colocation
description: Organize test files alongside source files for discoverability and maintainability. Use this skill when setting up project structure, onboarding AI agents to a codebase, or improving test coverage workflows. Co-located tests are easier to find, update, and maintain.
license: MIT
---

This skill guides test file organization using co-location—placing test files next to the source files they test. This pattern improves discoverability, encourages testing, and makes refactoring easier.

## When to Use This Skill

- Setting up new project structure
- Reorganizing existing test files
- Onboarding developers or AI agents to codebase
- Improving test coverage workflows
- Migrating from centralized `__tests__` folders

## Co-location Pattern

```
Traditional (Centralized):          Co-located (Recommended):
├── src/                            ├── src/
│   ├── components/                 │   ├── components/
│   │   ├── Button.tsx             │   │   ├── Button/
│   │   └── Card.tsx               │   │   │   ├── Button.tsx
├── tests/                          │   │   │   ├── Button.test.tsx
│   ├── components/                 │   │   │   └── index.ts
│   │   ├── Button.test.tsx        │   │   ├── Card/
│   │   └── Card.test.tsx          │   │   │   ├── Card.tsx
                                    │   │   │   ├── Card.test.tsx
                                    │   │   │   └── index.ts
```

## Why Co-location Works

| Benefit | Explanation |
|---------|-------------|
| **Discoverability** | Tests visible when viewing source file |
| **Ownership** | Clear 1:1 relationship between source and test |
| **Refactoring** | Move folder = move source + tests together |
| **Coverage gaps** | Missing `.test.tsx` file is immediately obvious |
| **AI agents** | Agents find tests without searching separate directories |
| **Code review** | Reviewers see tests alongside implementation changes |

## Recommended File Structure

### Component with Tests

```
src/components/ListingCard/
├── ListingCard.tsx           # Component implementation
├── ListingCard.test.tsx      # Unit tests
├── ListingCard.stories.tsx   # Storybook stories (optional)
├── ListingCard.module.css    # Styles (optional)
├── types.ts                  # TypeScript types (optional)
└── index.ts                  # Public exports
```

### Hook with Tests

```
src/hooks/
├── useBooking/
│   ├── useBooking.ts         # Hook implementation
│   ├── useBooking.test.ts    # Hook tests
│   └── index.ts
├── useAuth/
│   ├── useAuth.ts
│   ├── useAuth.test.ts
│   └── index.ts
```

### Utility Functions with Tests

```
src/utils/
├── formatPrice/
│   ├── formatPrice.ts
│   ├── formatPrice.test.ts
│   └── index.ts
├── validateBooking/
│   ├── validateBooking.ts
│   ├── validateBooking.test.ts
│   └── index.ts
```

### API Routes with Tests

```
src/api/
├── listings/
│   ├── route.ts              # API handler
│   ├── route.test.ts         # API tests
│   ├── schema.ts             # Validation schema
│   └── index.ts
├── bookings/
│   ├── route.ts
│   ├── route.test.ts
│   └── index.ts
```

## Full Project Structure for Split Lease

```
src/
├── components/
│   ├── common/
│   │   ├── Button/
│   │   │   ├── Button.tsx
│   │   │   ├── Button.test.tsx
│   │   │   └── index.ts
│   │   ├── Input/
│   │   │   ├── Input.tsx
│   │   │   ├── Input.test.tsx
│   │   │   └── index.ts
│   │   └── Modal/
│   │       ├── Modal.tsx
│   │       ├── Modal.test.tsx
│   │       └── index.ts
│   │
│   ├── listings/
│   │   ├── ListingCard/
│   │   │   ├── ListingCard.tsx
│   │   │   ├── ListingCard.test.tsx
│   │   │   └── index.ts
│   │   ├── ListingGrid/
│   │   │   ├── ListingGrid.tsx
│   │   │   ├── ListingGrid.test.tsx
│   │   │   └── index.ts
│   │   └── ListingDetail/
│   │       ├── ListingDetail.tsx
│   │       ├── ListingDetail.test.tsx
│   │       └── index.ts
│   │
│   ├── booking/
│   │   ├── BookingForm/
│   │   │   ├── BookingForm.tsx
│   │   │   ├── BookingForm.test.tsx
│   │   │   └── index.ts
│   │   ├── BookingSummary/
│   │   │   ├── BookingSummary.tsx
│   │   │   ├── BookingSummary.test.tsx
│   │   │   └── index.ts
│   │   └── PaymentForm/
│   │       ├── PaymentForm.tsx
│   │       ├── PaymentForm.test.tsx
│   │       └── index.ts
│   │
│   └── layout/
│       ├── Navbar/
│       │   ├── Navbar.tsx
│       │   ├── Navbar.test.tsx
│       │   └── index.ts
│       └── Footer/
│           ├── Footer.tsx
│           ├── Footer.test.tsx
│           └── index.ts
│
├── hooks/
│   ├── useAuth/
│   │   ├── useAuth.ts
│   │   ├── useAuth.test.ts
│   │   └── index.ts
│   ├── useBooking/
│   │   ├── useBooking.ts
│   │   ├── useBooking.test.ts
│   │   └── index.ts
│   ├── useListings/
│   │   ├── useListings.ts
│   │   ├── useListings.test.ts
│   │   └── index.ts
│   └── usePayment/
│       ├── usePayment.ts
│       ├── usePayment.test.ts
│       └── index.ts
│
├── contexts/
│   ├── AuthContext/
│   │   ├── AuthContext.tsx
│   │   ├── AuthContext.test.tsx
│   │   └── index.ts
│   └── SupabaseContext/
│       ├── SupabaseContext.tsx
│       ├── SupabaseContext.test.tsx
│       └── index.ts
│
├── utils/
│   ├── formatPrice/
│   │   ├── formatPrice.ts
│   │   ├── formatPrice.test.ts
│   │   └── index.ts
│   ├── validateDates/
│   │   ├── validateDates.ts
│   │   ├── validateDates.test.ts
│   │   └── index.ts
│   └── calculateTotal/
│       ├── calculateTotal.ts
│       ├── calculateTotal.test.ts
│       └── index.ts
│
├── lib/
│   ├── supabase/
│   │   ├── client.ts
│   │   ├── client.test.ts
│   │   └── index.ts
│   └── stripe/
│       ├── client.ts
│       ├── client.test.ts
│       └── index.ts
│
├── test/                         # Shared test utilities (NOT tests themselves)
│   ├── setup.ts                  # Vitest setup
│   ├── test-utils.tsx            # Custom render
│   ├── fixtures/                 # Test data factories
│   │   ├── users.ts
│   │   ├── listings.ts
│   │   └── bookings.ts
│   └── mocks/                    # MSW handlers
│       ├── handlers.ts
│       └── server.ts
│
└── pages/                        # Page components (if using pages router)
    ├── listings/
    │   ├── [id]/
    │   │   ├── page.tsx
    │   │   └── page.test.tsx
    │   └── page.tsx
    └── booking/
        ├── page.tsx
        └── page.test.tsx

e2e/                              # E2E tests stay separate (not unit tests)
├── fixtures/
├── pages/
└── tests/
```

## Naming Conventions

| File Type | Pattern | Example |
|-----------|---------|---------|
| Component | `ComponentName.tsx` | `ListingCard.tsx` |
| Component test | `ComponentName.test.tsx` | `ListingCard.test.tsx` |
| Hook | `useHookName.ts` | `useBooking.ts` |
| Hook test | `useHookName.test.ts` | `useBooking.test.ts` |
| Utility | `utilityName.ts` | `formatPrice.ts` |
| Utility test | `utilityName.test.ts` | `formatPrice.test.ts` |
| Integration test | `feature.integration.test.ts` | `booking.integration.test.ts` |

## Vitest Configuration for Co-location

```typescript
// vitest.config.ts
import { defineConfig } from 'vitest/config'

export default defineConfig({
  test: {
    // Find tests next to source files
    include: ['src/**/*.{test,spec}.{ts,tsx}'],
    
    // Exclude E2E tests (separate folder)
    exclude: ['node_modules', 'dist', 'e2e/**'],
    
    // Coverage from source files only
    coverage: {
      include: ['src/**/*.{ts,tsx}'],
      exclude: [
        'src/**/*.test.{ts,tsx}',
        'src/**/*.spec.{ts,tsx}',
        'src/test/**',
        'src/**/*.d.ts',
        'src/**/index.ts', // barrel files
      ],
    },
  },
})
```

## Index Files (Barrel Exports)

Keep public API clean while hiding test files:

```typescript
// src/components/ListingCard/index.ts
export { ListingCard } from './ListingCard'
export type { ListingCardProps } from './ListingCard'

// Tests are NOT exported - they're implementation details
```

Usage:

```typescript
// Consumer imports cleanly
import { ListingCard } from '@/components/ListingCard'
```

## Migration Strategy

### From Centralized Tests

```bash
# Before
tests/
├── components/
│   └── Button.test.tsx
src/
├── components/
│   └── Button.tsx

# After
src/
├── components/
│   └── Button/
│       ├── Button.tsx
│       ├── Button.test.tsx
│       └── index.ts
```

Migration script:

```bash
#!/bin/bash
# migrate-tests.sh

# Move component tests next to source
for test in tests/components/*.test.tsx; do
  name=$(basename "$test" .test.tsx)
  mkdir -p "src/components/$name"
  mv "src/components/$name.tsx" "src/components/$name/$name.tsx"
  mv "$test" "src/components/$name/$name.test.tsx"
  echo "export { $name } from './$name'" > "src/components/$name/index.ts"
done
```

## Handling Shared Test Utilities

Shared test code stays centralized in `src/test/`:

```
src/test/
├── setup.ts              # Vitest global setup
├── test-utils.tsx        # Custom render function
├── fixtures/             # Data factories
│   ├── users.ts
│   ├── listings.ts
│   └── index.ts
├── mocks/               # MSW handlers
│   ├── handlers.ts
│   └── server.ts
└── helpers/             # Test helper functions
    └── async.ts
```

Import in tests:

```typescript
// src/components/ListingCard/ListingCard.test.tsx
import { render, screen } from '@/test/test-utils'
import { mockListing } from '@/test/fixtures'
import { ListingCard } from './ListingCard'

describe('ListingCard', () => {
  it('renders listing title', () => {
    render(<ListingCard listing={mockListing} />)
    expect(screen.getByRole('heading')).toHaveTextContent(mockListing.title)
  })
})
```

## Integration Tests

For tests spanning multiple modules, co-locate with the primary feature:

```
src/features/booking/
├── components/
│   ├── BookingForm/
│   │   ├── BookingForm.tsx
│   │   └── BookingForm.test.tsx      # Unit test
├── hooks/
│   ├── useBookingFlow/
│   │   ├── useBookingFlow.ts
│   │   └── useBookingFlow.test.ts    # Unit test
├── booking-flow.integration.test.ts   # Integration test for whole feature
└── index.ts
```

## E2E Tests Stay Separate

E2E tests are NOT co-located—they test the whole application:

```
e2e/
├── fixtures/
│   └── auth.ts
├── pages/
│   ├── LoginPage.ts
│   └── CheckoutPage.ts
├── tests/
│   ├── auth.spec.ts
│   ├── booking-flow.spec.ts
│   └── search.spec.ts
└── playwright.config.ts
```

## Finding Missing Tests

Script to identify untested files:

```typescript
// scripts/find-untested.ts
import { glob } from 'glob'
import { existsSync } from 'fs'

async function findUntestedFiles() {
  const sourceFiles = await glob('src/**/*.{ts,tsx}', {
    ignore: [
      'src/**/*.test.{ts,tsx}',
      'src/**/*.spec.{ts,tsx}',
      'src/**/index.ts',
      'src/**/*.d.ts',
      'src/test/**',
    ],
  })

  const untested = sourceFiles.filter(file => {
    const testFile = file.replace(/\.(ts|tsx)$/, '.test.$1')
    return !existsSync(testFile)
  })

  console.log('Files without tests:')
  untested.forEach(f => console.log(`  - ${f}`))
  console.log(`\nTotal: ${untested.length} untested files`)
}

findUntestedFiles()
```

Run: `npx tsx scripts/find-untested.ts`

## VS Code Settings

Configure VS Code to show tests alongside source:

```json
// .vscode/settings.json
{
  "explorer.fileNesting.enabled": true,
  "explorer.fileNesting.patterns": {
    "*.tsx": "${capture}.test.tsx, ${capture}.stories.tsx, ${capture}.module.css",
    "*.ts": "${capture}.test.ts, ${capture}.spec.ts"
  }
}
```

This nests test files under their source file in the explorer.

## AI Agent Benefits

Co-location helps AI agents:

1. **Find tests instantly**: `Component.tsx` → `Component.test.tsx` (same folder)
2. **Understand context**: Tests visible when reading implementation
3. **Update atomically**: Change source + test in one operation
4. **Generate tests**: Know exactly where to place new test file
5. **Verify coverage**: Missing `.test.tsx` is obvious gap

## Anti-Patterns to Avoid

| ❌ Anti-Pattern | ✅ Correct Approach |
|----------------|---------------------|
| `__tests__` folders everywhere | Test file next to source |
| `tests/` mirror of `src/` | Co-locate tests |
| `Component.spec.tsx` in different folder | `Component.test.tsx` same folder |
| Shared test utils in component folders | `src/test/` for shared utilities |
| E2E tests co-located | E2E in separate `e2e/` folder |
| Test files without matching source | Remove orphaned tests |

## Checklist for New Features

When adding a new component/hook/utility:

- [ ] Create folder with feature name
- [ ] Add implementation file (`Component.tsx`)
- [ ] Add test file (`Component.test.tsx`)
- [ ] Add index file for exports (`index.ts`)
- [ ] Add to parent barrel export if needed
- [ ] Verify tests run: `npm test Component`
