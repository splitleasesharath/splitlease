# P0-02: Test File Colocation

**Priority**: P0 - Foundation  
**Estimated Time**: 1-2 hours  
**Prerequisites**: P0-01 (vitest setup)  
**Status**: NOT STARTED

## Implementation Tracker

### Phase 1: Establish Colocation Pattern
- [ ] IMPLEMENTED: Create first colocated test (`CreateProposalFlowV2.test.jsx`)
- [ ] IMPLEMENTED: Verify test runs with `bun test CreateProposalFlowV2.test.jsx`
- [ ] IMPLEMENTED: Document colocation pattern in README
- [ ] IMPLEMENTED: Update .gitignore if needed (ensure `*.test.{js,jsx,ts,tsx}` NOT ignored)

### Phase 2: Apply to Logic Layer
- [ ] IMPLEMENTED: Create test for `calculateFourWeekRent.test.js` in `logic/calculators/pricing/`
- [ ] IMPLEMENTED: Create test for `canAcceptProposal.test.js` in `logic/rules/proposals/`
- [ ] IMPLEMENTED: Create test for `adaptDaysFromBubble.test.js` in `logic/processors/external/`
- [ ] IMPLEMENTED: Verify all logic tests pass

### Phase 3: Document Pattern
- [ ] IMPLEMENTED: Add test colocation guidelines to project documentation
- [ ] IMPLEMENTED: Create example test template
- [ ] IMPLEMENTED: Update vitest config to include colocated tests

**IMPLEMENTATION STATUS**: ⬜ NOT IMPLEMENTED

---

## Overview

Organize test files alongside source files for discoverability and maintainability.

**Split Lease Structure**:
```
app/src/
├── islands/
│   ├── pages/
│   │   ├── SearchPage.jsx
│   │   └── SearchPage.test.jsx          ← NEW
│   └── shared/
│       ├── CreateProposalFlowV2.jsx
│       └── CreateProposalFlowV2.test.jsx ← NEW
├── logic/
│   ├── calculators/
│   │   └── pricing/
│       │   ├── calculateFourWeekRent.js
│       │   └── calculateFourWeekRent.test.js ← NEW
│   └── rules/
│       └── proposals/
│           ├── canAcceptProposal.js
│           └── canAcceptProposal.test.js    ← NEW
└── lib/
    ├── auth.js
    └── auth.test.js                      ← NEW
```

---

## Step 1: Create First Colocated Component Test

Create `app/src/islands/shared/CreateProposalFlowV2.test.jsx`:

```jsx
import { describe, it, expect, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import CreateProposalFlowV2 from './CreateProposalFlowV2';

describe('CreateProposalFlowV2', () => {
  const mockListing = {
    id: 'listing_123',
    title: 'Test Listing',
    price_per_night: 150,
  };

  it('renders proposal flow modal', () => {
    render(
      <CreateProposalFlowV2
        listing={mockListing}
        onSubmit={vi.fn()}
        onClose={vi.fn()}
      />
    );

    // Verify modal renders
    expect(screen.getByRole('dialog')).toBeInTheDocument();
  });

  it('displays listing title', () => {
    render(
      <CreateProposalFlowV2
        listing={mockListing}
        onSubmit={vi.fn()}
        onClose={vi.fn()}
      />
    );

    expect(screen.getByText(/Test Listing/i)).toBeInTheDocument();
  });
});
```

**Verification**: Run `bun test CreateProposalFlowV2.test.jsx` - should pass 2 tests.

---

## Step 2: Create Logic Layer Tests

### Test Calculator

Create `app/src/logic/calculators/pricing/calculateFourWeekRent.test.js`:

```javascript
import { describe, it, expect } from 'vitest';
import { calculateFourWeekRent } from './calculateFourWeekRent';

describe('calculateFourWeekRent', () => {
  it('calculates rent for 4-week period', () => {
    const result = calculateFourWeekRent({
      pricePerNight: 150,
      daysPerWeek: 4,
    });

    // 4 days/week × 4 weeks × $150 = $2,400
    expect(result).toBe(2400);
  });

  it('handles edge case: 1 day per week', () => {
    const result = calculateFourWeekRent({
      pricePerNight: 200,
      daysPerWeek: 1,
    });

    expect(result).toBe(800); // 1 × 4 × 200
  });
});
```

### Test Rule

Create `app/src/logic/rules/proposals/canAcceptProposal.test.js`:

```javascript
import { describe, it, expect } from 'vitest';
import { canAcceptProposal } from './canAcceptProposal';

describe('canAcceptProposal', () => {
  it('allows accepting pending proposal', () => {
    const proposal = { status: 'pending', listing_id: 'l1' };
    const user = { id: 'host1', userType: 'host' };

    expect(canAcceptProposal(proposal, user)).toBe(true);
  });

  it('prevents accepting already accepted proposal', () => {
    const proposal = { status: 'accepted' };
    const user = { id: 'host1', userType: 'host' };

    expect(canAcceptProposal(proposal, user)).toBe(false);
  });
});
```

### Test Processor

Create `app/src/logic/processors/external/adaptDaysFromBubble.test.js`:

```javascript
import { describe, it, expect } from 'vitest';
import { adaptDaysFromBubble } from './adaptDaysFromBubble';

describe('adaptDaysFromBubble', () => {
  it('converts Bubble 1-indexed days to JS 0-indexed', () => {
    // Bubble: 1=Sun, 2=Mon, 3=Tue
    // JS: 0=Sun, 1=Mon, 2=Tue
    const result = adaptDaysFromBubble([1, 3, 5, 7]);

    expect(result).toEqual([0, 2, 4, 6]); // Sun, Tue, Thu, Sat
  });

  it('handles empty array', () => {
    expect(adaptDaysFromBubble([])).toEqual([]);
  });
});
```

**Verification**: Run `bun test` - all logic tests should pass.

---

## Step 3: Update vitest.config.ts

Ensure vitest finds colocated tests (already configured in P0-01):

```typescript
export default defineConfig({
  test: {
    include: ['**/*.test.{js,jsx,ts,tsx}'], // Finds colocated tests
    exclude: ['node_modules', 'dist'],
  },
});
```

---

## Step 4: Document Colocation Pattern

Create `app/test-utilities/README.md`:

```markdown
# Test Colocation Pattern

## Structure

Tests live alongside source files:

\`\`\`
src/
├── Component.jsx
└── Component.test.jsx  ← Test for Component.jsx
\`\`\`

## Benefits

1. **Discoverability**: Tests are immediately visible next to code
2. **Maintainability**: Refactoring moves tests with code
3. **Documentation**: Test names explain expected behavior
4. **Context**: Easy to understand test intent

## Naming Conventions

- Component: `ComponentName.jsx` → `ComponentName.test.jsx`
- Hook: `useHookName.js` → `useHookName.test.js`
- Utility: `utilityName.js` → `utilityName.test.js`
- Logic: `functionName.js` → `functionName.test.js`

## Running Tests

\`\`\`bash
bun test                       # All tests
bun test ComponentName.test.jsx # Specific test
bun test:watch                 # Watch mode
\`\`\`
```

---

## Completion Checklist

- [ ] CreateProposalFlowV2.test.jsx created and passes
- [ ] calculateFourWeekRent.test.js created and passes
- [ ] canAcceptProposal.test.js created and passes
- [ ] adaptDaysFromBubble.test.js created and passes
- [ ] README.md documents colocation pattern
- [ ] All tests pass with `bun test`

**MARK AS**: ✅ IMPLEMENTED when all checkboxes complete.

---

## Next Steps

1. Move to P0-03: mocking-supabase-msw
2. Apply colocation pattern to all new tests
3. Gradually add tests to existing files

---

## Split Lease Files Ready for Colocation

**Components** (27 pages):
- SearchPage.jsx → SearchPage.test.jsx
- ViewSplitLeasePage.jsx → ViewSplitLeasePage.test.jsx
- GuestProposalsPage.jsx → GuestProposalsPage.test.jsx
- ... (24 more pages)

**Logic Layer**:
- logic/calculators/pricing/* (8 files)
- logic/rules/proposals/* (5 files)
- logic/processors/external/* (4 files)
- logic/workflows/* (3 files)

**Utilities**:
- lib/auth.js
- lib/priceCalculations.js
- lib/availabilityValidation.js
