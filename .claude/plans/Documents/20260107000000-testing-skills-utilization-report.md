# Testing Skills Utilization Report - Split Lease

**Generated**: 2026-01-07
**Purpose**: Comprehensive analysis of where each testing skill can be utilized, with recurrence patterns and automation opportunities

---

## Executive Summary

This report maps all 15 testing skills to specific locations in the Split Lease codebase, identifying:
- **Where** each skill applies (specific files and components)
- **When** to use each skill (recurrence and triggers)
- **How** to implement them (concrete examples)
- **Automation opportunities** for each skill

### Quick Reference: Priority Matrix

| Priority | Skills | Focus Area |
|----------|--------|------------|
| **P0 - Foundation** | vitest-rtl-setup, test-file-colocation, mocking-supabase-msw, mocking-auth-context | Test infrastructure |
| **P1 - Core Testing** | accessible-query-patterns, testing-form-submissions, testing-async-loading-states, testing-custom-hooks | Component & logic tests |
| **P2 - Backend** | testing-supabase-auth, testing-rls-pgtap, database-seed-scripts | Edge Functions & security |
| **P3 - Advanced** | page-object-model, websocket-realtime-testing, webhook-handler-tests | E2E & real-time |
| **P4 - Future** | testing-stripe-payments | Payment features (not yet implemented) |

---

## 1. ACCESSIBLE-QUERY-PATTERNS

### Overview
Write stable, accessible test selectors using Testing Library query priorities for component tests.

### Utilization Locations

#### Frontend Components (27 testable pages)
**High Priority Components:**
- `app/src/islands/shared/CreateProposalFlowV2.jsx` - Multi-step booking form
  - Queries: `getByRole('button', { name: /next/i })`, `getByLabelText(/email/i)`
  - Sections: UserDetailsSection, MoveInSection, DaysSelectionSection, ReviewSection

- `app/src/islands/shared/SearchScheduleSelector.jsx` - Day selection widget
  - Queries: `getByRole('button', { name: DAY_NAMES[i] })`, `getByRole('checkbox')`

- `app/src/islands/shared/GoogleMap.jsx` - Interactive map with markers
  - Queries: `getByRole('img', { name: /map/i })`, `getByTestId('marker-{id}')`

- `app/src/islands/pages/SelfListingPage/` - 7-section listing creation form
  - Each section: SpaceSnapshotSection, FeaturesSection, PricingSection, etc.
  - Form controls: inputs, selects, checkboxes, radio buttons

**All Interactive Components:**
- SearchPage.jsx
- ViewSplitLeasePage.jsx
- GuestProposalsPage.jsx
- HostProposalsPage.jsx
- ListingDashboardPage/
- SignUpLoginModal.jsx
- ProposalDetailsModal.jsx
- VirtualMeetingModal.jsx

### Recurrence Pattern
- **Frequency**: Every new component creation
- **Trigger**: When building forms, modals, interactive widgets
- **Test Type**: Component unit tests, integration tests

### Concrete Example
```jsx
// app/src/islands/shared/CreateProposalFlowV2.test.jsx
test('navigates through proposal flow steps', async () => {
  const user = userEvent.setup();
  render(<CreateProposalFlowV2 listing={mockListing} />);

  // Use accessible queries
  await user.type(getByLabelText(/email/i), 'guest@example.com');
  await user.click(getByRole('button', { name: /next step/i }));

  // Day selection using accessible button names
  await user.click(getByRole('button', { name: /monday/i }));
  await user.click(getByRole('button', { name: /tuesday/i }));

  // Submit using role and accessible name
  await user.click(getByRole('button', { name: /submit proposal/i }));

  expect(getByText(/success/i)).toBeInTheDocument();
});
```

### Automation Opportunities
1. **ESLint rule**: Enforce role-based queries, ban `querySelector`
2. **Template generator**: Auto-generate test skeletons with accessible queries
3. **CI check**: Validate all tests use accessible patterns

### Implementation Steps
1. Install @testing-library/react and user-event
2. Create component test template with accessible query examples
3. Add ESLint plugin to enforce query priority
4. Document query priority hierarchy in test guidelines

---

## 2. DATABASE-SEED-SCRIPTS

### Overview
Create reproducible test data for Supabase PostgreSQL with proper FK relationships.

### Utilization Locations

#### Key Tables with Complex Relationships

**listing table** (12 FK constraints):
- FK: host_id → user(id)
- FK: borough_id → borough(id)
- FK: neighborhood_id → neighborhood(id)
- FK: safety_level → safety_level_enum
- FK: cancellation_policy_id → cancellation_policy(id)
- Required seed order: user → borough → neighborhood → listing

**proposal table**:
- FK: guest_id → user(id)
- FK: listing_id → listing(id)
- FK: virtual_meeting_id → virtual_meeting(id)
- Required seed order: user + listing → virtual_meeting → proposal

**rental_application table**:
- FK: guest_id → user(id)
- FK: proposal_id → proposal(id)

**sync_queue table** (Bubble sync):
- Requires: listing/proposal/user records for correlation_id

### Recurrence Pattern
- **Frequency**: High - Every Edge Function integration test
- **Trigger**: Testing Edge Function handlers, RLS policies, cron jobs
- **Test Type**: Integration tests, E2E tests

### Critical Seed Scenarios

**Scenario 1: Listing Creation Flow**
```sql
-- supabase/tests/seed/listing-creation-flow.sql
BEGIN;

-- Step 1: Create host user
INSERT INTO "user" (id, email, user_type, first_name, last_name)
VALUES ('host_123', 'host@test.com', 'host', 'Jane', 'Host');

INSERT INTO host_account (host_id, stripe_account_id)
VALUES ('host_123', 'acct_test_123');

-- Step 2: Create geographic hierarchy
INSERT INTO borough (id, name) VALUES ('brooklyn', 'Brooklyn');
INSERT INTO neighborhood (id, borough_id, name)
VALUES ('williamsburg', 'brooklyn', 'Williamsburg');

-- Step 3: Create reference data
INSERT INTO safety_level (id, name) VALUES ('medium', 'Medium');
INSERT INTO cancellation_policy (id, name, days_before)
VALUES ('flexible', 'Flexible', 1);

-- Step 4: Create listing
INSERT INTO listing (
  id, host_id, title, borough_id, neighborhood_id,
  safety_level, cancellation_policy_id, price_per_night
) VALUES (
  'listing_123', 'host_123', 'Test Brooklyn Apt',
  'brooklyn', 'williamsburg', 'medium', 'flexible', 150
);

COMMIT;
```

**Scenario 2: Proposal with Virtual Meeting**
```sql
-- supabase/tests/seed/proposal-with-meeting.sql
BEGIN;

-- Create host and guest
INSERT INTO "user" (id, email, user_type) VALUES
  ('host_123', 'host@test.com', 'host'),
  ('guest_456', 'guest@test.com', 'guest');

-- Create listing
INSERT INTO listing (id, host_id, title, borough_id)
VALUES ('listing_123', 'host_123', 'Test Listing', 'brooklyn');

-- Create virtual meeting
INSERT INTO virtual_meeting (
  id, host_id, guest_id, meeting_date, meeting_time
) VALUES (
  'meeting_789', 'host_123', 'guest_456',
  '2026-02-15', '14:00:00'
);

-- Create proposal
INSERT INTO proposal (
  id, guest_id, listing_id, virtual_meeting_id,
  status, move_in_date, days_selected
) VALUES (
  'proposal_999', 'guest_456', 'listing_123', 'meeting_789',
  'pending', '2026-03-01', ARRAY[0, 1, 2, 3]
);

COMMIT;
```

### Automation Opportunities
1. **Seed factory functions**: Programmatic seed generation
2. **Transaction snapshots**: Restore DB to clean state after each test
3. **Seed versioning**: Track seed scripts with migrations
4. **Fixture library**: Reusable test data objects

### Implementation Steps
```bash
# Create seed infrastructure
mkdir -p supabase/tests/seed/{users,listings,proposals}

# Seed scripts structure:
supabase/tests/seed/
├── users.seed.sql           # Create test users
├── listings.seed.sql        # Create test listings
├── proposals.seed.sql       # Create test proposals
├── geographic.seed.sql      # Boroughs, neighborhoods
└── fixtures.ts              # Deno helper to seed via SDK
```

---

## 3. MOCKING-AUTH-CONTEXT

### Overview
Mock Supabase Auth for testing protected components and auth state transitions.

### Utilization Locations

#### Protected Routes (Host-Only)
- **SelfListingPage** - `/self-listing` (requires host)
- **ListingDashboardPage** - `/listing-dashboard?id={id}` (requires ownership)
- **HostOverviewPage** - `/host-overview` (requires host)
- **HostProposalsPage** - `/host-proposals/:userId` (requires host)

#### Protected Routes (Guest-Only)
- **GuestProposalsPage** - `/guest-proposals/:userId` (requires guest)
- **RentalApplicationPage** - `/rental-application` (requires guest)

#### Public Routes (Auth-Optional)
- **ViewSplitLeasePage** - `/view-split-lease/:id` (features disabled if no auth)
- **FavoriteListingsPage** - `/favorite-listings` (requires auth)

### Recurrence Pattern
- **Frequency**: High - Every protected page/component test
- **Trigger**: Testing page-level auth logic, role-based UI
- **Test Type**: Component tests, integration tests

### Auth Functions Requiring Mocks
From `app/src/lib/auth.js`:
- `checkAuthStatus()` → `{ user, userType: 'host'|'guest', accessToken }`
- `validateTokenAndFetchUser(token)` → user data
- `getSessionId()` → token from secureStorage
- `loginUser(email, password)` → calls auth-user Edge Function
- `signupUser(email, password)` → calls auth-user Edge Function

### Concrete Example
```jsx
// test-utilities/mocking-auth-context.ts
export function mockAuthContext(overrides = {}) {
  const defaultAuth = {
    user: null,
    isAuthenticated: false,
    userType: null,
    accessToken: null
  };

  const authState = { ...defaultAuth, ...overrides };

  // Mock secureStorage
  vi.mock('lib/secureStorage', () => ({
    getSecureItem: vi.fn((key) =>
      key === 'splitlease_auth_token' ? authState.accessToken : null
    )
  }));

  // Mock checkAuthStatus
  vi.mock('lib/auth', () => ({
    checkAuthStatus: vi.fn(() => Promise.resolve(authState))
  }));

  return authState;
}

// Usage in tests
test('redirects unauthenticated user from host page', () => {
  mockAuthContext({ user: null, isAuthenticated: false });

  render(<SelfListingPage />);

  expect(window.location.href).toContain('/login');
});

test('renders form if user is authenticated host', () => {
  mockAuthContext({
    user: { id: 'host123', email: 'host@example.com' },
    userType: 'host',
    isAuthenticated: true
  });

  render(<SelfListingPage />);

  expect(screen.getByText(/create listing/i)).toBeInTheDocument();
});
```

### Automation Opportunities
1. **Auth test decorator**: `@requiresAuth('host')` for test setup
2. **Fixture factory**: `createAuthenticatedUser({ type: 'host' })`
3. **CI matrix**: Run protected route tests with multiple auth states

### Implementation Steps
1. Create `test-utilities/mocking-auth-context.ts`
2. Mock `lib/auth.js` and `lib/secureStorage.js`
3. Create fixtures for common auth states (guest, host, unauthenticated)
4. Document auth mocking patterns in test guidelines

---

## 4. MOCKING-SUPABASE-MSW

### Overview
Mock Supabase REST API calls with Mock Service Worker (MSW) for fast, isolated component tests.

### Utilization Locations

#### Components Making Supabase Queries

**SearchPage** - `app/src/islands/pages/SearchPage.jsx`:
- Queries: `listing` table (with filters)
- Queries: `listing_photo` table
- Queries: `borough`, `neighborhood` lookups

**FavoriteListingsPage**:
- Queries: User's favorite listings
- Queries: Listing details for each favorite
- Queries: Photos

**ViewSplitLeasePage**:
- Queries: Single listing by ID
- Queries: Listing photos
- Queries: Host profile
- Queries: Available days/blocked dates

**ListingDashboardPage**:
- Queries: User's listings
- Queries: Single listing details (edit mode)
- Queries: Photos
- Queries: Proposals for listing

**GuestProposalsPage**:
- Queries: Guest's proposals
- Queries: Listing details for each proposal
- Queries: Virtual meetings

### Recurrence Pattern
- **Frequency**: High - Every component with Supabase queries
- **Trigger**: Testing search filters, data fetching, loading/error states
- **Test Type**: Component tests, hook tests

### MSW Handler Structure
```typescript
// test-utilities/msw/handlers/listing.handlers.ts
import { http, HttpResponse } from 'msw';

export const listingHandlers = [
  // GET listings with filters
  http.get('/rest/v1/listing', ({ request }) => {
    const url = new URL(request.url);
    const borough = url.searchParams.get('borough');

    const mockListings = [
      {
        id: 'listing_123',
        title: 'Beautiful Brooklyn Apartment',
        borough_id: 'brooklyn',
        price_per_night: 150,
      },
      {
        id: 'listing_456',
        title: 'Manhattan Studio',
        borough_id: 'manhattan',
        price_per_night: 200,
      }
    ];

    // Filter by borough if specified
    const filtered = borough
      ? mockListings.filter(l => l.borough_id === borough)
      : mockListings;

    return HttpResponse.json(filtered);
  }),

  // GET listing photos
  http.get('/rest/v1/listing_photo', ({ request }) => {
    return HttpResponse.json([
      { id: 'photo1', listing_id: 'listing_123', url: 'https://...' }
    ]);
  }),

  // POST create proposal
  http.post('/functions/v1/proposal', async ({ request }) => {
    const body = await request.json();

    if (body.action === 'create') {
      return HttpResponse.json({
        success: true,
        data: { id: 'prop_new_123', ...body.payload }
      });
    }
  }),
];
```

### Concrete Example
```jsx
// app/src/islands/pages/__tests__/SearchPage.test.jsx
import { setupMSW } from 'test-utilities/msw';
import { listingHandlers } from 'test-utilities/msw/handlers/listing.handlers';

test('displays filtered listings', async () => {
  const { server } = setupMSW();
  server.use(...listingHandlers);

  render(<SearchPage />);

  // Select borough filter
  await userEvent.selectOption(
    screen.getByLabelText(/borough/i),
    'Brooklyn'
  );

  // Only Brooklyn listings displayed
  await waitFor(() => {
    expect(screen.getByText('Beautiful Brooklyn Apartment')).toBeInTheDocument();
    expect(screen.queryByText('Manhattan Studio')).not.toBeInTheDocument();
  });
});

test('handles Supabase errors gracefully', async () => {
  const { server } = setupMSW();
  server.use(
    http.get('/rest/v1/listing', () =>
      HttpResponse.json({ code: 'PGRST116' }, { status: 400 })
    )
  );

  render(<SearchPage />);

  await waitFor(() => {
    expect(screen.getByText(/error loading listings/i)).toBeInTheDocument();
  });
});
```

### Automation Opportunities
1. **Auto-generate handlers**: From Supabase schema → MSW handlers
2. **Response fixtures**: JSON files for common responses
3. **Network conditions**: Simulate slow connections, timeouts
4. **CI integration**: Run all component tests with MSW in CI

### Implementation Steps
```bash
# Install MSW
bun add -D msw

# Create handler structure
mkdir -p test-utilities/msw/{handlers,fixtures}

# Handler files:
test-utilities/msw/
├── setup.ts                    # MSW server configuration
├── handlers/
│   ├── listing.handlers.ts     # Listing CRUD
│   ├── proposal.handlers.ts    # Proposal CRUD
│   ├── user.handlers.ts        # User queries
│   └── auth.handlers.ts        # Auth endpoints
└── fixtures/
    ├── listings.fixture.json
    └── proposals.fixture.json
```

---

## 5. PAGE-OBJECT-MODEL

### Overview
Encapsulate page selectors and interactions in POM classes for E2E tests with Playwright.

### Utilization Locations

#### E2E Test Scenarios

**Search Flow**:
```typescript
// e2e/pages/SearchPagePOM.ts
export class SearchPagePOM {
  private page: Page;

  // Selectors
  searchInput() { return this.page.locator('input[placeholder*="Search"]'); }
  boroughFilter() { return this.page.locator('select[name="borough"]'); }
  priceRangeSlider() { return this.page.locator('[data-testid="price-slider"]'); }
  listingCards() { return this.page.locator('[data-testid="listing-card"]'); }

  // Actions
  async searchByLocation(location: string) {
    await this.searchInput().fill(location);
    await this.searchInput().press('Enter');
  }

  async filterByBorough(borough: string) {
    await this.boroughFilter().selectOption(borough);
  }

  async clickListing(index: number) {
    await this.listingCards().nth(index).click();
  }
}
```

**Proposal Flow**:
```typescript
// e2e/pages/CreateProposalFlowPOM.ts
export class CreateProposalFlowPOM {
  private modal: Locator;

  // Section locators
  userDetailsSection() { /* ... */ }
  moveInSection() { /* ... */ }
  daysSection() { /* ... */ }

  // Actions
  async fillUserDetails(email: string, name: string, phone: string) {
    await this.modal.locator('input[type="email"]').fill(email);
    await this.modal.locator('input[placeholder*="Name"]').fill(name);
    await this.modal.locator('input[placeholder*="phone"]').fill(phone);
  }

  async selectDays(dayIndices: number[]) {
    for (const dayIndex of dayIndices) {
      await this.modal.locator(`button[data-day="${dayIndex}"]`).click();
    }
  }

  async submitProposal() {
    await this.modal.locator('button:has-text("Submit")').click();
    await this.modal.waitFor({ state: 'hidden' });
  }
}
```

### Recurrence Pattern
- **Frequency**: Medium-High - Critical user flows
- **Trigger**: Building E2E test suites for Playwright
- **Test Type**: E2E tests, smoke tests

### Page Objects to Create

| Page Object | URL | User Flows |
|------------|-----|-----------|
| SearchPagePOM | `/search` | Search, filter, view listing |
| ViewListingPagePOM | `/view-split-lease/:id` | View details, open proposal flow |
| CreateProposalFlowPOM | Modal | Fill proposal, submit |
| GuestProposalsPagePOM | `/guest-proposals/:id` | View proposals, accept/reject |
| SelfListingPagePOM | `/self-listing` | Create listing (7 sections) |
| HostOverviewPagePOM | `/host-overview` | Manage listings |
| SignUpLoginModalPOM | Modal | Signup, login |

### Automation Opportunities
1. **POM generator**: Auto-create POM classes from component props
2. **Shared actions**: Base POM class with common actions (login, navigate)
3. **Visual regression**: Integrate with Percy/Chromatic using POMs
4. **CI smoke tests**: Run critical path E2E tests on every deploy

### Implementation Steps
```bash
# Create E2E structure
mkdir -p e2e/{pages,tests}

# Page objects:
e2e/pages/
├── SearchPagePOM.ts
├── ViewListingPagePOM.ts
├── CreateProposalFlowPOM.ts
├── GuestProposalsPagePOM.ts
└── SelfListingPagePOM.ts

# Tests:
e2e/tests/
├── search-flow.spec.ts
├── booking-flow.spec.ts
└── listing-creation.spec.ts
```

---

## 6. TEST-FILE-COLOCATION

### Overview
Organize test files alongside source files for discoverability and maintainability.

### Utilization Locations

#### Current Structure (Recommended)

**Frontend Components**:
```
app/src/islands/
├── pages/
│   ├── SearchPage.jsx
│   ├── SearchPage.test.jsx                    ← NEW
│   ├── ViewSplitLeasePage.jsx
│   ├── ViewSplitLeasePage.test.jsx            ← NEW
│   └── SelfListingPage/
│       ├── SelfListingPage.tsx
│       ├── SelfListingPage.test.tsx           ← NEW
│       ├── sections/
│       │   ├── SpaceSnapshotSection.tsx
│       │   └── SpaceSnapshotSection.test.tsx  ← NEW
│       └── useListingStore.ts
│           └── useListingStore.test.ts        ← NEW
└── shared/
    ├── CreateProposalFlowV2.jsx
    ├── CreateProposalFlowV2.test.jsx          ← NEW
    └── GoogleMap.jsx
        └── GoogleMap.test.jsx                 ← NEW
```

**Business Logic**:
```
app/src/logic/
├── calculators/
│   ├── pricing/
│   │   ├── calculateFourWeekRent.js
│   │   ├── calculateFourWeekRent.test.js      ← NEW
│   │   ├── calculateGuestFacingPrice.js
│   │   └── calculateGuestFacingPrice.test.js  ← NEW
│   └── scheduling/
│       ├── calculateCheckInOutDays.js
│       └── calculateCheckInOutDays.test.js    ← NEW
├── rules/
│   └── proposals/
│       ├── canAcceptProposal.js
│       └── canAcceptProposal.test.js          ← NEW
└── processors/
    └── external/
        ├── adaptDaysFromBubble.js
        └── adaptDaysFromBubble.test.js        ← NEW
```

**Edge Functions**:
```
supabase/functions/
├── proposal/
│   ├── index.ts
│   ├── index.test.ts                          ← NEW
│   ├── actions/
│   │   ├── create.ts
│   │   └── create.test.ts                     ← NEW
│   └── lib/
│       ├── calculations.ts
│       └── calculations.test.ts               ← NEW
└── auth-user/
    ├── index.ts
    ├── index.test.ts                          ← NEW
    └── handlers/
        ├── login.ts
        └── login.test.ts                      ← NEW
```

### Recurrence Pattern
- **Frequency**: Every time - All new code
- **Trigger**: Adding new component, utility, or function
- **Test Type**: All test types

### Benefits for Split Lease
1. **Rapid feedback** - Tests are immediately visible next to code
2. **Documentation** - Test names explain expected behavior
3. **Refactoring confidence** - Tests move with code during refactors
4. **Discoverability** - Developers see test expectations immediately
5. **Lower maintenance** - Fewer import paths to update

### Automation Opportunities
1. **Test scaffolding**: Auto-generate `.test.js` when creating `.js`
2. **Pre-commit hook**: Warn if source file has no test file
3. **Coverage badges**: Per-directory coverage in README
4. **CI parallelization**: Run tests grouped by directory

### Implementation Steps
```bash
# Configure vitest to find colocated tests
# app/vitest.config.ts
export default defineConfig({
  test: {
    include: ['**/*.test.{js,jsx,ts,tsx}'],
    exclude: ['node_modules', 'dist']
  }
});

# Run tests
bun test                              # All tests
bun test -- SearchPage.test.jsx       # Specific file
bun test:watch                        # Watch mode
```

---

## 7. TESTING-ASYNC-LOADING-STATES

### Overview
Test loading spinners, skeleton screens, error states, and data transitions.

### Utilization Locations

#### Components with Async Operations

**SearchPage**:
- States: Initial → Loading → Loaded/Error/Empty
- Operations: Fetch listings with filters
- UI: Skeleton loader for listing cards
- Error: ErrorOverlay with retry button

**ViewSplitLeasePage**:
- States: Loading → Loaded/Error
- Operations: Load listing details, photos, availability
- UI: Skeleton layout for listing details
- Error: Listing not found or network error

**GuestProposalsPage**:
- States: Auth Check → Loading → Loaded/Error/Empty
- Operations: Fetch proposals list
- UI: Loading spinner, proposal cards
- Error: Failed to load proposals

**ListingDashboardPage**:
- States: Loading → Edit Mode → Saving
- Operations: Fetch listing, update listing, upload photos
- UI: Tab content loading, photo upload progress
- Error: Failed to save, photo upload failed

**CreateProposalFlowV2**:
- States: Form → Submitting → Success/Error
- Operations: Submit proposal to Edge Function
- UI: Disabled submit button with spinner
- Error: Validation errors, submission failed with retry

### Recurrence Pattern
- **Frequency**: High - Every page with data fetching
- **Trigger**: Implementing any async operation
- **Test Type**: Component tests, integration tests

### Concrete Example
```jsx
// SearchPage loading state test
test('displays skeleton loader while fetching listings', async () => {
  const { server } = setupMSW();

  // Simulate slow API
  server.use(
    http.get('/rest/v1/listing', async () => {
      await new Promise(resolve => setTimeout(resolve, 1000));
      return HttpResponse.json([{ id: '1', title: 'Listing' }]);
    })
  );

  render(<SearchPage />);

  // Initially shows skeleton
  expect(screen.getByTestId('listings-skeleton')).toBeInTheDocument();

  // After loading, skeleton gone and listing appears
  await waitFor(() => {
    expect(screen.queryByTestId('listings-skeleton')).not.toBeInTheDocument();
    expect(screen.getByText('Listing')).toBeInTheDocument();
  });
});

test('displays error state with retry button', async () => {
  const { server } = setupMSW();
  server.use(
    http.get('/rest/v1/listing', () =>
      HttpResponse.json({ code: 'PGRST116' }, { status: 500 })
    )
  );

  render(<SearchPage />);

  await waitFor(() => {
    expect(screen.getByText(/error loading listings/i)).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /retry/i })).toBeInTheDocument();
  });
});
```

### Automation Opportunities
1. **Loading state generator**: Auto-add loading/error/empty states to components
2. **Network simulation**: CI tests with throttled connections
3. **Accessibility audit**: Ensure loading states are announced to screen readers
4. **Performance benchmarks**: Track loading state durations

### Implementation Steps
For each async component, test:
1. Initial loading state (skeleton/spinner visible)
2. Successful load (data visible, loader hidden)
3. Error state (error message, retry button)
4. Recovery (retry succeeds)
5. Empty state (no data found)

---

## 8. TESTING-CUSTOM-HOOKS

### Overview
Test React custom hooks in isolation using renderHook from Testing Library.

### Utilization Locations

#### Page Logic Hooks (Core Business Logic)

**app/src/islands/pages/**:
- `useSearchPageLogic.js` - Fetches listings, manages filters, syncs URL params
- `useViewSplitLeasePageLogic.js` - Loads listing, calculates pricing, manages proposal form
- `proposals/useGuestProposalsPageLogic.js` - Fetches guest's proposals, filters/sorts
- `HostOverviewPage/useHostOverviewPageLogic.js` - Fetches host's listings, handles CRUD
- `HostProposalsPage/useHostProposalsPageLogic.js` - Fetches proposals across listings
- `ListingDashboardPage/useListingDashboardPageLogic.js` - Loads listing, manages edits
- `RentalApplicationPage/useRentalApplicationPageLogic.js` - Multi-step form, document uploads

#### Utility Hooks

**app/src/islands/shared/**:
- `useBodyScrollLock()` - Manages body overflow during modals
- `useToast()` - Toast notification management

#### Pure Logic Functions (Not Hooks, But Testable)

**app/src/logic/calculators/**:
- `pricing/calculateFourWeekRent.js`
- `pricing/calculateGuestFacingPrice.js`
- `pricing/calculatePricingBreakdown.js`

**app/src/logic/rules/**:
- `proposals/canAcceptProposal.js`
- `proposals/canEditProposal.js`
- `proposals/determineProposalStage.js`

**app/src/logic/processors/**:
- `external/adaptDaysFromBubble.js`
- `external/adaptDaysToBubble.js`

### Recurrence Pattern
- **Frequency**: High - Every custom hook needs unit tests
- **Trigger**: Creating new page logic hook or utility hook
- **Test Type**: Hook tests (renderHook), unit tests (pure functions)

### Concrete Examples

**Test Page Logic Hook**:
```jsx
import { renderHook, waitFor } from '@testing-library/react';
import { setupMSW } from 'test-utilities/msw';
import { useSearchPageLogic } from 'islands/pages/useSearchPageLogic';

test('loads listings on mount', async () => {
  const { server } = setupMSW();
  server.use(
    http.get('/rest/v1/listing', () =>
      HttpResponse.json([
        { id: '1', title: 'Listing 1' },
        { id: '2', title: 'Listing 2' }
      ])
    )
  );

  const { result } = renderHook(() => useSearchPageLogic());

  // Initially loading
  expect(result.current.isLoading).toBe(true);

  // After load
  await waitFor(() => {
    expect(result.current.isLoading).toBe(false);
    expect(result.current.listings).toHaveLength(2);
  });
});

test('filters listings by borough', async () => {
  const { result } = renderHook(() => useSearchPageLogic());

  await waitFor(() => expect(result.current.listings).toHaveLength(2));

  // Apply filter
  act(() => {
    result.current.handleBoroughChange('Brooklyn');
  });

  await waitFor(() => {
    expect(result.current.filteredListings).toHaveLength(1);
  });
});
```

**Test Pure Functions**:
```jsx
import { calculateGuestFacingPrice } from 'logic/calculators/pricing/calculateGuestFacingPrice';

test('calculates correct guest-facing price', () => {
  const result = calculateGuestFacingPrice({
    basePrice: 1000,
    nightCount: 7,
    serviceFeeBps: 1000,
    taxRate: 0.0875
  });

  expect(result).toBe(1218.75);
});

test('handles edge case: 1-night stay', () => {
  const result = calculateGuestFacingPrice({
    basePrice: 150,
    nightCount: 1,
    serviceFeeBps: 1000,
    taxRate: 0.0875
  });

  expect(result).toBeCloseTo(167.19);
});
```

### Automation Opportunities
1. **Hook test generator**: Auto-generate test skeleton from hook signature
2. **Mock factory**: Generate Supabase mocks from hook dependencies
3. **CI coverage**: Enforce 80%+ coverage for logic layer
4. **Snapshot testing**: Snapshot hook return values for regression detection

### Implementation Steps
1. Create `app/src/islands/pages/__tests__/` directories
2. Test each page logic hook in isolation
3. Test pure functions in `logic/` directory
4. Mock Supabase client and auth context
5. Verify state transitions and side effects

---

## 9. TESTING-FORM-SUBMISSIONS

### Overview
Test form components including validation, submission, and error handling using userEvent.

### Utilization Locations

#### Multi-Step Forms

**CreateProposalFlowV2** - 4-step booking form:
- Section 1: UserDetailsSection (email, name, phone)
- Section 2: MoveInSection (move-in date)
- Section 3: DaysSelectionSection (select days 0-6)
- Section 4: ReviewSection (review and submit)
- Validation: Email format, required fields, date range
- Flow: Step 1 → Step 2 → Step 3 → Review → Submit

**SelfListingPage** - 7-section listing creation:
- Sections: Space Snapshot, Features, Lease Styles, Pricing, Rules, Photos, Review
- Complex form with conditional fields
- Photo upload with async validation
- Draft auto-save to localStorage
- Final submission to Edge Function

**RentalApplicationPage** - Multi-step rental application:
- Multi-step form with occupant management
- Document uploads
- Verification integrations

#### Single-Page Forms

**SignUpLoginModal**:
- Login: email, password
- Signup: email, password, password confirm, user type (Host/Guest)
- Validation: Email format, password strength, password match
- Error handling: Invalid credentials, account exists

**ResetPasswordPage**:
- Fields: new password, confirm password
- Validation: Password strength, match confirmation
- Token validation from URL

**EditListingDetails** (ListingDashboardPage):
- Inline editing: title, description, pricing
- Field-level validation
- Inline error messages

### Recurrence Pattern
- **Frequency**: High - Every form component
- **Trigger**: Building form UI, adding validation, handling submission
- **Test Type**: Component tests, integration tests

### Concrete Example
```jsx
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { setupMSW } from 'test-utilities/msw';
import CreateProposalFlowV2 from 'islands/shared/CreateProposalFlowV2';

test('completes proposal form submission', async () => {
  const user = userEvent.setup();
  const { server } = setupMSW();
  const mockOnSubmit = vi.fn();

  server.use(
    http.post('/functions/v1/proposal', () =>
      HttpResponse.json({ success: true, data: { id: 'p123' } })
    )
  );

  render(<CreateProposalFlowV2 listing={mockListing} onSubmit={mockOnSubmit} />);

  // Step 1: Fill user details
  await user.type(screen.getByLabelText(/email/i), 'guest@example.com');
  await user.type(screen.getByLabelText(/full name/i), 'Jane Doe');
  await user.type(screen.getByLabelText(/phone/i), '555-1234');
  await user.click(screen.getByRole('button', { name: /next/i }));

  // Step 2: Select move-in date
  await user.type(screen.getByLabelText(/move.?in date/i), '02/15/2026');
  await user.click(screen.getByRole('button', { name: /next/i }));

  // Step 3: Select days
  await user.click(screen.getByRole('button', { name: /monday/i }));
  await user.click(screen.getByRole('button', { name: /tuesday/i }));
  await user.click(screen.getByRole('button', { name: /next/i }));

  // Step 4: Review and submit
  await user.click(screen.getByRole('button', { name: /submit proposal/i }));

  await waitFor(() => {
    expect(mockOnSubmit).toHaveBeenCalled();
    expect(screen.getByText(/success/i)).toBeInTheDocument();
  });
});

test('validates required fields before submission', async () => {
  const user = userEvent.setup();
  render(<CreateProposalFlowV2 listing={mockListing} onSubmit={vi.fn()} />);

  // Try to submit without email
  await user.click(screen.getByRole('button', { name: /submit/i }));

  expect(screen.getByText(/email is required/i)).toBeInTheDocument();
});

test('validates email format', async () => {
  const user = userEvent.setup();
  render(<CreateProposalFlowV2 listing={mockListing} onSubmit={vi.fn()} />);

  await user.type(screen.getByLabelText(/email/i), 'not-an-email');
  await user.tab(); // Blur to trigger validation

  expect(screen.getByText(/invalid email/i)).toBeInTheDocument();
});
```

### Automation Opportunities
1. **Form test generator**: Auto-generate tests from form schema/validation rules
2. **Validation matrix**: Test all validation rules automatically
3. **Accessibility audit**: Ensure form errors are announced
4. **Cross-browser testing**: Run form tests in multiple browsers

### Implementation Steps
For each form:
1. Test field validation rules individually
2. Test form-level submission
3. Test error message display
4. Test success state transition
5. Test multi-step navigation
6. Test draft persistence (localStorage)
7. Test async operations (uploads, API calls)

---

## 10. TESTING-RLS-PGTAP

### Overview
Test Supabase Row-Level Security policies to verify multi-tenant data isolation.

### Utilization Locations

#### Tables with RLS Policies

**user table**:
- Policy: Users can only read/update their own record
- Isolation: `user.id = auth.uid()`

**listing table**:
- Policy: Hosts can CRUD their listings, guests can only read public
- Isolation: `listing.host_id = auth.uid()` for UPDATE/DELETE
- Isolation: Public SELECT for all published listings

**proposal table**:
- Policy: Guests can read/update their proposals, hosts can read proposals for their listings
- Isolation: `proposal.guest_id = auth.uid() OR listing.host_id = auth.uid()`

**rental_application table**:
- Policy: Guest can only read/update own application
- Isolation: `rental_application.guest_id = auth.uid()`

**virtual_meeting table**:
- Policy: Only host and guest can access the meeting
- Isolation: `auth.uid() IN (virtual_meeting.host_id, virtual_meeting.guest_id)`

**notification_preferences table**:
- Policy: Users can only manage their own preferences
- Isolation: `user_id = auth.uid()`

### Recurrence Pattern
- **Frequency**: Medium - After RLS policy changes
- **Trigger**: Adding/modifying tables with FK to auth.users, new features with data isolation
- **Test Type**: Database integration tests (pgTAP)

### Concrete Example
```sql
-- supabase/tests/policies/proposal_rls.sql
BEGIN;
SELECT plan(12);

-- Test 1: Guest can read own proposals
SELECT tests.authenticate_as('guest_user_123');
SELECT is(
  (SELECT COUNT(*) FROM proposal WHERE guest_id = 'guest_user_123')::int,
  1,
  'Guest can read own proposals'
);

-- Test 2: Guest cannot read other guest's proposals
SELECT tests.authenticate_as('other_guest_456');
SELECT is(
  (SELECT COUNT(*) FROM proposal WHERE guest_id = 'guest_user_123')::int,
  0,
  'Guest cannot read other guest''s proposals'
);

-- Test 3: Host can read proposals for their listings
SELECT tests.authenticate_as('host_user_789');
SELECT is(
  (SELECT COUNT(*) FROM proposal WHERE listing_id IN (
    SELECT id FROM listing WHERE host_id = 'host_user_789'
  ))::int,
  2,
  'Host can read proposals for their listings'
);

-- Test 4: Guest cannot update other guest's proposal
SELECT tests.authenticate_as('guest_user_123');
SELECT throws_ok(
  $$ UPDATE proposal SET status = 'cancelled' WHERE guest_id = 'other_guest_456' $$,
  'P0001',
  'Guest cannot update other guest''s proposal'
);

SELECT finish();
ROLLBACK;
```

### Automation Opportunities
1. **RLS test generator**: Auto-generate pgTAP tests from RLS policies
2. **CI integration**: Run pgTAP tests on every migration
3. **Security audit**: Scheduled RLS policy reviews
4. **Coverage report**: Track which tables have RLS tests

### Implementation Steps
```bash
# Create pgTAP infrastructure
mkdir -p supabase/tests/policies

# Test files:
supabase/tests/policies/
├── user_rls.sql
├── listing_rls.sql
├── proposal_rls.sql
├── rental_application_rls.sql
├── virtual_meeting_rls.sql
└── cross_tenant_isolation.sql

# Run tests
pg_prove -d splitlease_test supabase/tests/policies/*.sql
```

---

## 11. TESTING-STRIPE-PAYMENTS

### Overview
Test Stripe payment integrations including checkout flows, payment intents, subscriptions, and webhooks.

### Current Status
**Not Yet Implemented** - Stripe integration not in current codebase.

### Planned Locations (Future Implementation)

**Frontend** (when payments feature is built):
- `app/src/islands/shared/PaymentForm.jsx`
- `app/src/islands/pages/CheckoutPage.jsx`
- `app/src/islands/pages/SubscriptionManagementPage.jsx`

**Edge Functions** (when payments feature is built):
- `supabase/functions/stripe/create-checkout-session`
- `supabase/functions/stripe/create-payment-intent`
- `supabase/functions/stripe-webhook/`

### Recurrence Pattern
- **Frequency**: High (after implementation)
- **Trigger**: When adding Stripe integration
- **Test Type**: Component tests, webhook tests, integration tests

### Template Test Examples

**Test Checkout Flow**:
```jsx
test('creates payment intent and shows card form', async () => {
  const { server } = setupMSW();
  server.use(
    http.post('/functions/v1/stripe/create-payment-intent', () =>
      HttpResponse.json({
        success: true,
        data: { clientSecret: 'pi_test_secret_123' }
      })
    )
  );

  render(<CheckoutPage price={1500} orderId="order_123" />);

  expect(screen.getByText(/card number/i)).toBeInTheDocument();
});

test('handles payment failure with retry option', async () => {
  const { server } = setupMSW();
  server.use(
    http.post('/functions/v1/stripe/confirm-payment', () =>
      HttpResponse.json({ error: 'Card declined' }, { status: 400 })
    )
  );

  render(<CheckoutPage />);

  expect(screen.getByText(/card was declined/i)).toBeInTheDocument();
  expect(screen.getByRole('button', { name: /retry/i })).toBeInTheDocument();
});
```

**Test Webhook Handler**:
```typescript
Deno.test("processes payment_intent.succeeded event", async () => {
  const event = {
    type: "payment_intent.succeeded",
    data: {
      object: {
        id: "pi_123",
        amount: 1500,
        metadata: { orderId: "order_123" }
      }
    }
  };

  const result = await handleStripeWebhook(event);

  assertEquals(result.success, true);
  // Verify order was marked as paid
});
```

### Automation Opportunities
1. **Stripe test cards**: Automate testing with 4242424242424242 (success), 4000000000000002 (decline)
2. **Webhook replay**: Test webhook idempotency automatically
3. **Payment flow E2E**: Full checkout to confirmation flow

### Implementation Steps (Future)
1. Install @stripe/react-stripe-js
2. Create PaymentForm component
3. Create Edge Function for payment intent creation
4. Create webhook handler
5. Implement test suite with test cards

---

## 12. TESTING-SUPABASE-AUTH

### Overview
Test Supabase authentication flows including signup, signin, password reset, session management.

### Utilization Locations

**Frontend Auth Implementation**:
- `app/src/lib/auth.js` - All auth utility functions
  - `loginUser(email, password)`
  - `signupUser(email, password, userType)`
  - `logoutUser()`
  - `checkAuthStatus()`
  - `validateTokenAndFetchUser(token)`
  - `resetPasswordForEmail(email)`
  - `updateUserPassword(newPassword)`

- `app/src/lib/secureStorage.js` - Encrypted token storage
  - `setSecureItem(key, value)`
  - `getSecureItem(key)`
  - `removeSecureItem(key)`

- `app/src/islands/shared/SignUpLoginModal.jsx` - Auth UI component

**Backend (Edge Functions)**:
- `supabase/functions/auth-user/index.ts` - Auth router
- `supabase/functions/auth-user/handlers/login.ts`
- `supabase/functions/auth-user/handlers/signup.ts`
- `supabase/functions/auth-user/handlers/resetPassword.ts`

**Database**:
- `public.user` table - User profile data
- Supabase Auth `auth.users` table - Native auth users

### Recurrence Pattern
- **Frequency**: High - Every auth flow change
- **Trigger**: Implementing new auth features, fixing auth bugs
- **Test Type**: Frontend auth tests, Edge Function tests, integration tests

### Concrete Examples

**Test Frontend Login**:
```jsx
test('loginUser sends credentials to auth edge function', async () => {
  const { server } = setupMSW();

  server.use(
    http.post('/functions/v1/auth-user', async ({ request }) => {
      const body = await request.json();
      expect(body.action).toBe('login');
      expect(body.payload.email).toBe('user@example.com');

      return HttpResponse.json({
        success: true,
        data: {
          access_token: 'access_123',
          user_id: 'user_123',
          user_type: 'guest'
        }
      });
    })
  );

  const result = await loginUser('user@example.com', 'password123');

  expect(result.user_id).toBe('user_123');
  expect(result.access_token).toBe('access_123');
});

test('stores access token in secureStorage after login', async () => {
  const mockSetSecureItem = vi.fn();
  vi.mock('lib/secureStorage', () => ({
    setSecureItem: mockSetSecureItem
  }));

  await loginUser('user@example.com', 'password123');

  expect(mockSetSecureItem).toHaveBeenCalledWith(
    'splitlease_auth_token',
    'access_123'
  );
});
```

**Test Signup Edge Function**:
```typescript
Deno.test("signup creates auth user and public user record", async () => {
  const supabase = createMockSupabaseClient();

  const result = await handleSignup(supabase, {
    email: "newuser@example.com",
    password: "SecurePass123!",
    user_type: "guest"
  });

  assertEquals(result.success, true);
  assertEquals(result.data.user_type, "guest");
});

Deno.test("signup prevents duplicate email registration", async () => {
  const supabase = createMockSupabaseClient();

  // First signup succeeds
  await handleSignup(supabase, {
    email: "user@example.com",
    password: "SecurePass123!",
    user_type: "guest"
  });

  // Second signup fails
  const result = await handleSignup(supabase, {
    email: "user@example.com",
    password: "OtherPass123!",
    user_type: "host"
  });

  assertEquals(result.success, false);
});
```

**Test Password Reset**:
```jsx
test('resetPasswordForEmail always returns success (prevents enumeration)', async () => {
  const { server } = setupMSW();
  server.use(
    http.post('/functions/v1/auth-user', () =>
      HttpResponse.json({ success: true })
    )
  );

  // Nonexistent email
  const result1 = await resetPasswordForEmail('nonexistent@example.com');
  expect(result1.success).toBe(true);

  // Existing email
  const result2 = await resetPasswordForEmail('existing@example.com');
  expect(result2.success).toBe(true);

  // Results identical (no email enumeration)
  assertEquals(result1, result2);
});
```

### Automation Opportunities
1. **Auth test utilities**: `mockAuthenticatedUser({ type: 'host' })`
2. **Session testing**: Auto-test token expiration and refresh
3. **Security audit**: Regular tests for auth vulnerabilities
4. **CI matrix**: Test auth flows across different user types

### Implementation Steps
1. Create `test-utilities/mocking-auth-context.ts`
2. Test all auth functions in `lib/auth.js`
3. Test Edge Function handlers in `supabase/functions/auth-user/`
4. Test protected route redirects
5. Test session persistence across page reloads

---

## 13. VITEST-RTL-SETUP

### Overview
Configure Vitest with React Testing Library for fast, reliable component testing.

### Current Status
**Not Yet Configured** - Split Lease lacks test infrastructure.

### Setup Files to Create

**app/vitest.config.ts**:
```typescript
import { defineConfig } from 'vitest/config';
import react from '@vitejs/plugin-react';
import path from 'path';

export default defineConfig({
  plugins: [react()],
  test: {
    globals: true,
    environment: 'jsdom',
    setupFiles: ['./test-setup.ts'],
    coverage: {
      provider: 'v8',
      reporter: ['text', 'json', 'html'],
      exclude: ['node_modules/', 'test-utilities/', '**/*.test.{js,jsx,ts,tsx}']
    },
    include: ['**/*.test.{js,jsx,ts,tsx}'],
  },
  resolve: {
    alias: {
      logic: path.resolve(__dirname, 'src/logic'),
      lib: path.resolve(__dirname, 'src/lib'),
      islands: path.resolve(__dirname, 'src/islands'),
    }
  }
});
```

**app/test-setup.ts**:
```typescript
import { expect, afterEach, vi } from 'vitest';
import { cleanup } from '@testing-library/react';
import '@testing-library/jest-dom';

afterEach(() => {
  cleanup();
});

// Mock window.matchMedia
Object.defineProperty(window, 'matchMedia', {
  writable: true,
  value: vi.fn().mockImplementation(query => ({
    matches: false,
    media: query,
    addEventListener: vi.fn(),
    removeEventListener: vi.fn(),
  })),
});

// Mock IntersectionObserver
global.IntersectionObserver = class IntersectionObserver {
  constructor() {}
  disconnect() {}
  observe() {}
  unobserve() {}
};

// Mock localStorage
const localStorageMock = {
  getItem: vi.fn(),
  setItem: vi.fn(),
  removeItem: vi.fn(),
  clear: vi.fn(),
};
Object.defineProperty(window, 'localStorage', { value: localStorageMock });
```

**app/package.json (scripts)**:
```json
{
  "scripts": {
    "test": "vitest run",
    "test:watch": "vitest",
    "test:ui": "vitest --ui",
    "test:coverage": "vitest run --coverage"
  }
}
```

### Test Utilities Structure
```
app/test-utilities/
├── index.ts
├── setup.ts
├── mocking-auth-context.ts
├── mocking-supabase-msw.ts
├── render.tsx (custom render with providers)
├── msw/
│   ├── setup.ts
│   ├── handlers/
│   │   ├── listing.handlers.ts
│   │   ├── proposal.handlers.ts
│   │   └── auth.handlers.ts
│   └── fixtures/
│       ├── listings.fixture.json
│       └── proposals.fixture.json
└── supabase/
    └── createMockClient.ts
```

### Recurrence Pattern
- **Frequency**: Once - Initial setup
- **Trigger**: Before writing first test
- **Test Type**: Foundation for all tests

### Installation Commands
```bash
# From app/ directory
bun add -D vitest @vitest/ui @testing-library/react @testing-library/user-event @testing-library/jest-dom happy-dom msw

# Create config files
touch vitest.config.ts test-setup.ts

# Create test utilities
mkdir -p test-utilities/{msw/handlers,fixtures,supabase}

# Run tests
bun test
bun test --ui
bun test --coverage
```

### Automation Opportunities
1. **Config generator**: Auto-generate vitest.config.ts from project structure
2. **Test template**: Scaffolding tool to create test files
3. **CI integration**: Run tests in GitHub Actions
4. **Coverage enforcement**: Fail CI if coverage drops below threshold

---

## 14. WEBHOOK-HANDLER-TESTS

### Overview
Test incoming webhook handlers for Stripe, Twilio, Zapier with signature verification and idempotency.

### Current Status
**Partially Planned** - Webhook infrastructure not yet implemented.

### Planned Locations (Future)

**Stripe Webhooks**:
```typescript
supabase/functions/stripe-webhook/
├── index.ts
├── handlers/
│   ├── payment_intent.succeeded.ts
│   ├── charge.failed.ts
│   └── customer.subscription.updated.ts
└── __tests__/
    ├── signature-verification.test.ts
    ├── payment-webhook.test.ts
    └── webhook-idempotency.test.ts
```

**Twilio Webhooks**:
```typescript
supabase/functions/twilio-webhook/
├── index.ts
├── handlers/
│   ├── sms-received.ts
│   └── call-status-changed.ts
└── __tests__/
    └── twilio-webhook.test.ts
```

**Zapier Webhooks**:
```typescript
supabase/functions/zapier-webhook/
├── index.ts
└── __tests__/
    └── zapier-webhook.test.ts
```

### Recurrence Pattern
- **Frequency**: Medium - After webhook implementation
- **Trigger**: When implementing Stripe/Twilio/Zapier webhooks
- **Test Type**: Edge Function tests, integration tests

### Template Test Examples

**Test Signature Verification**:
```typescript
Deno.test("rejects webhook with invalid signature", async () => {
  const payload = JSON.stringify({ type: "payment_intent.succeeded" });
  const invalidSignature = "invalid_xyz";

  const isValid = verifyStripeSignature(payload, invalidSignature, webhookSecret);

  assertEquals(isValid, false);
});

Deno.test("accepts webhook with valid signature", async () => {
  const payload = JSON.stringify({ type: "payment_intent.succeeded" });
  const signature = generateStripeSignature(payload, webhookSecret);

  const isValid = verifyStripeSignature(payload, signature, webhookSecret);

  assertEquals(isValid, true);
});
```

**Test Idempotency**:
```typescript
Deno.test("processes webhook event only once", async () => {
  const event = {
    id: "evt_unique_123",
    type: "payment_intent.succeeded",
    data: { object: { id: "pi_123" } }
  };

  // Process first time
  const result1 = await handleStripeWebhook(supabase, event);
  assertEquals(result1.processed, true);

  // Process second time (duplicate)
  const result2 = await handleStripeWebhook(supabase, event);
  assertEquals(result2.processed, false); // Already processed
});
```

### Automation Opportunities
1. **Webhook replay testing**: Auto-replay webhooks from logs
2. **Signature validation**: Enforce signature checks in CI
3. **Idempotency audit**: Verify all webhooks are idempotent
4. **Load testing**: Test webhook handler under burst traffic

### Implementation Steps (Future)
1. Implement webhook handlers in Edge Functions
2. Add signature verification logic
3. Store webhook event IDs for idempotency
4. Test all webhook event types
5. Test error scenarios (invalid signature, duplicate events)

---

## 15. WEBSOCKET-REALTIME-TESTING

### Overview
Test WebSocket connections and real-time features using Playwright and Vitest mocks.

### Current Implementation

**Real-Time Features**:

1. **Messaging System** - `app/src/islands/pages/messages.jsx`
   - Supabase Realtime subscriptions
   - Edge Function: `supabase/functions/messages/`
   - Features: Send/receive messages, typing indicators, read receipts

2. **Virtual Meeting System** - `app/src/islands/shared/VirtualMeetingManager/`
   - Real-time meeting status updates
   - Availability sync between host/guest
   - Features: Book slots, accept/reject, live availability

3. **Listing Availability** - ListingDashboardPage
   - Real-time blocked date updates
   - Price tier changes reflected live

### Recurrence Pattern
- **Frequency**: Medium - After implementing real-time features
- **Trigger**: Testing WebSocket/Realtime features
- **Test Type**: E2E tests (Playwright), unit tests (Vitest mocks)

### Concrete Examples

**E2E Test - Real-Time Messaging**:
```typescript
// e2e/tests/messaging.spec.ts
test('receives new message in real-time', async ({ page, browser }) => {
  // Guest opens messages
  await page.goto('/messages');
  const messagesPage = new MessagesPagePOM(page);
  await messagesPage.selectConversation('host_123');

  // Host sends message in second browser
  const hostPage = await browser.newPage();
  await hostPage.goto('/messages');
  const hostMessages = new MessagesPagePOM(hostPage);
  await hostMessages.selectConversation('guest_456');
  await hostMessages.sendMessage('Are you still interested?');

  // Guest receives message in real-time
  await expect(
    page.locator('text="Are you still interested?"')
  ).toBeVisible({ timeout: 5000 });
});
```

**Unit Test - Mock Realtime**:
```jsx
// Mock Supabase Realtime
vi.mock('lib/supabase', () => ({
  supabase: {
    channel: vi.fn(() => ({
      on: vi.fn(function(event, callback) {
        setTimeout(() => {
          callback({
            new: {
              id: 'msg_123',
              body: 'Test message',
              created_at: new Date().toISOString()
            }
          });
        }, 100);
        return this;
      }),
      subscribe: vi.fn(() => 'SUBSCRIBED')
    }))
  }
}));

test('receives messages in real-time', async () => {
  const { result } = renderHook(() => useMessaging('conversation_123'));

  await waitFor(() => {
    expect(result.current.messages).toHaveLength(1);
    expect(result.current.messages[0].body).toBe('Test message');
  });
});
```

### Automation Opportunities
1. **Realtime mock generator**: Auto-generate mocks from Supabase schema
2. **Latency testing**: Measure real-time update delays
3. **Connection simulation**: Test disconnect/reconnect scenarios
4. **Multi-browser testing**: Playwright with multiple contexts

### Implementation Steps
1. Mock Supabase channels with `vi.mock()`
2. Test subscription logic in unit tests
3. Use Playwright for multi-browser E2E tests
4. Test edge cases (disconnect, slow network)

---

## Implementation Roadmap

### Phase 1: Foundation (Week 1-2)
**Goal**: Set up test infrastructure

1. ✅ **vitest-rtl-setup** - Configure Vitest + React Testing Library
   - Install dependencies: vitest, @testing-library/react, @testing-library/user-event
   - Create `app/vitest.config.ts` and `app/test-setup.ts`
   - Add test scripts to package.json
   - Verify setup with sample test

2. ✅ **test-file-colocation** - Establish test file structure
   - Create `.test.js` files alongside source files
   - Update `.gitignore` if needed
   - Document colocation pattern in README

3. ✅ **mocking-supabase-msw** - Set up MSW for API mocking
   - Install msw
   - Create handler structure in `test-utilities/msw/`
   - Create handlers for listing, proposal, user endpoints
   - Create fixtures for common responses

4. ✅ **mocking-auth-context** - Create auth mocking utilities
   - Create `test-utilities/mocking-auth-context.ts`
   - Mock `lib/auth.js` and `lib/secureStorage.js`
   - Create fixtures for common auth states

**Deliverables**:
- ✅ Working vitest configuration
- ✅ MSW setup with basic handlers
- ✅ Auth mocking utilities
- ✅ First passing test

---

### Phase 2: Core Component Tests (Week 3-5)
**Goal**: Test critical UI components

1. ✅ **accessible-query-patterns** - Test shared components
   - CreateProposalFlowV2 (multi-step form)
   - SearchScheduleSelector (day selection)
   - GoogleMap (interactive map)
   - SignUpLoginModal (auth forms)
   - Use role-based queries throughout

2. ✅ **testing-form-submissions** - Test all forms
   - SignUpLoginModal (login/signup)
   - CreateProposalFlowV2 (4-step flow)
   - SelfListingPage (7-section form)
   - Validation, submission, error handling

3. ✅ **testing-async-loading-states** - Test loading patterns
   - SearchPage (fetch listings)
   - ViewSplitLeasePage (fetch listing details)
   - GuestProposalsPage (fetch proposals)
   - Test loading, success, error, empty states

4. ✅ **testing-custom-hooks** - Test page logic hooks
   - useSearchPageLogic
   - useViewSplitLeasePageLogic
   - useGuestProposalsPageLogic
   - useHostProposalsPageLogic

**Deliverables**:
- ✅ 20+ component tests
- ✅ All forms tested
- ✅ All page logic hooks tested
- ✅ 60%+ code coverage

---

### Phase 3: Backend & Security (Week 6-8)
**Goal**: Test Edge Functions and database security

1. ✅ **testing-supabase-auth** - Test auth flows
   - Frontend: `lib/auth.js` functions
   - Edge Functions: `supabase/functions/auth-user/`
   - Test login, signup, password reset
   - Test protected route redirects

2. ✅ **testing-rls-pgtap** - Test Row-Level Security
   - Install pgTAP in Supabase
   - Create tests for user, listing, proposal RLS
   - Test cross-tenant isolation
   - Run in CI pipeline

3. ✅ **database-seed-scripts** - Create seed infrastructure
   - Create `supabase/tests/seed/` directory
   - Seed scripts: users, listings, proposals
   - Deno fixtures for programmatic seeding
   - Use in Edge Function integration tests

**Deliverables**:
- ✅ Auth flow tests (frontend + backend)
- ✅ RLS tests for all tables
- ✅ Seed script library
- ✅ Edge Function integration tests

---

### Phase 4: E2E & Advanced (Week 9-11)
**Goal**: End-to-end testing and real-time features

1. ✅ **page-object-model** - Create Playwright POMs
   - SearchPagePOM
   - ViewListingPagePOM
   - CreateProposalFlowPOM
   - GuestProposalsPagePOM
   - SelfListingPagePOM

2. ✅ **websocket-realtime-testing** - Test real-time features
   - Messaging: send/receive, typing indicators
   - Virtual meetings: availability sync
   - Listing updates: blocked dates
   - E2E tests with Playwright
   - Unit tests with mocked Supabase Realtime

3. ✅ **webhook-handler-tests** - Test webhook handlers (if implemented)
   - Stripe webhook: payment_intent.succeeded, charge.failed
   - Signature verification tests
   - Idempotency tests

**Deliverables**:
- ✅ E2E test suite with POMs
- ✅ Real-time feature tests
- ✅ Critical user flow coverage

---

### Phase 5: Payment & Future (Week 12+)
**Goal**: Future features (when implemented)

1. ⏳ **testing-stripe-payments** - Test payment flows (when Stripe integration added)
   - Checkout flow tests
   - Payment intent tests
   - Webhook handler tests
   - Use Stripe test cards

**Deliverables**:
- ⏳ Payment flow tests (when implemented)

---

## Testing Automation Opportunities

### CI/CD Integration

**GitHub Actions Workflow**:
```yaml
name: Test Suite

on: [push, pull_request]

jobs:
  test:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v3
      - uses: oven-sh/setup-bun@v1

      # Frontend tests
      - name: Install dependencies
        run: cd app && bun install

      - name: Run unit tests
        run: cd app && bun test

      - name: Run coverage
        run: cd app && bun test:coverage

      # Backend tests
      - name: Setup Deno
        uses: denoland/setup-deno@v1

      - name: Run Edge Function tests
        run: deno test supabase/functions/

      # E2E tests
      - name: Install Playwright
        run: bunx playwright install --with-deps

      - name: Run E2E tests
        run: bunx playwright test

      # Database tests
      - name: Start Supabase
        run: supabase start

      - name: Run RLS tests
        run: pg_prove -d postgres://postgres:postgres@localhost:54322/postgres supabase/tests/policies/*.sql
```

### Pre-Commit Hooks

**Husky Configuration**:
```json
{
  "husky": {
    "hooks": {
      "pre-commit": "lint-staged && bun test --run --changed"
    }
  },
  "lint-staged": {
    "*.{js,jsx,ts,tsx}": [
      "eslint --fix",
      "vitest related --run"
    ]
  }
}
```

### Test Coverage Enforcement

**Vitest Coverage Thresholds**:
```typescript
// vitest.config.ts
export default defineConfig({
  test: {
    coverage: {
      branches: 80,
      functions: 80,
      lines: 80,
      statements: 80,
      include: ['src/**/*.{js,jsx,ts,tsx}'],
      exclude: ['**/*.test.{js,jsx,ts,tsx}', 'test-utilities/']
    }
  }
});
```

### Automated Test Generation

**Template Generator Script**:
```bash
#!/bin/bash
# scripts/generate-test.sh

COMPONENT_FILE=$1
COMPONENT_NAME=$(basename "$COMPONENT_FILE" .jsx)
TEST_FILE="${COMPONENT_FILE%.jsx}.test.jsx"

cat > "$TEST_FILE" <<EOF
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, it, expect } from 'vitest';
import $COMPONENT_NAME from './$COMPONENT_NAME';

describe('$COMPONENT_NAME', () => {
  it('renders without crashing', () => {
    render(<$COMPONENT_NAME />);
  });

  // TODO: Add more tests
});
EOF

echo "Created $TEST_FILE"
```

---

## Key Metrics & Success Criteria

### Coverage Targets

| Area | Target | Priority |
|------|--------|----------|
| Business Logic (`logic/`) | 90%+ | P0 |
| Page Components (`islands/pages/`) | 80%+ | P1 |
| Shared Components (`islands/shared/`) | 80%+ | P1 |
| Edge Functions (`supabase/functions/`) | 75%+ | P1 |
| Utilities (`lib/`) | 85%+ | P1 |
| RLS Policies | 100% | P0 |

### Test Type Distribution

- **Unit Tests**: 60% (hooks, utilities, business logic)
- **Component Tests**: 25% (UI components, forms)
- **Integration Tests**: 10% (Edge Functions, database)
- **E2E Tests**: 5% (critical user flows)

### Performance Targets

- **Unit Test Suite**: < 30 seconds
- **Component Test Suite**: < 2 minutes
- **Integration Test Suite**: < 5 minutes
- **E2E Test Suite**: < 10 minutes
- **Full Suite**: < 15 minutes

---

## Testing Best Practices for Split Lease

### 1. Test Naming Conventions

```javascript
// ✅ GOOD: Descriptive test names
test('redirects unauthenticated users to login page', () => {});
test('displays error message when proposal submission fails', () => {});
test('calculates correct guest-facing price with tax', () => {});

// ❌ BAD: Vague test names
test('works correctly', () => {});
test('handles error', () => {});
test('calculation', () => {});
```

### 2. AAA Pattern (Arrange, Act, Assert)

```javascript
test('filters listings by borough', async () => {
  // Arrange
  const { server } = setupMSW();
  server.use(mockListingsHandler);
  const user = userEvent.setup();
  render(<SearchPage />);

  // Act
  await user.selectOption(screen.getByLabelText(/borough/i), 'Brooklyn');

  // Assert
  await waitFor(() => {
    const listings = screen.getAllByTestId('listing-card');
    expect(listings).toHaveLength(3);
    listings.forEach(listing => {
      expect(listing).toHaveTextContent('Brooklyn');
    });
  });
});
```

### 3. Test Data Builders

```typescript
// test-utilities/fixtures/builders.ts
export class ListingBuilder {
  private listing: Partial<Listing> = {
    id: 'listing_test_123',
    title: 'Test Listing',
    borough_id: 'brooklyn',
    price_per_night: 150,
  };

  withTitle(title: string) {
    this.listing.title = title;
    return this;
  }

  withPrice(price: number) {
    this.listing.price_per_night = price;
    return this;
  }

  build(): Listing {
    return this.listing as Listing;
  }
}

// Usage in tests:
const listing = new ListingBuilder()
  .withTitle('Luxury Brooklyn Loft')
  .withPrice(300)
  .build();
```

### 4. Custom Matchers

```typescript
// test-utilities/matchers.ts
expect.extend({
  toHaveValidEmailFormat(received: string) {
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    const pass = emailRegex.test(received);

    return {
      pass,
      message: () => pass
        ? `Expected ${received} not to be a valid email`
        : `Expected ${received} to be a valid email`
    };
  }
});

// Usage:
expect('guest@example.com').toHaveValidEmailFormat();
```

### 5. Test Debugging

```javascript
// Use screen.debug() to see current DOM
test('debugging example', () => {
  render(<SearchPage />);
  screen.debug(); // Prints entire DOM
  screen.debug(screen.getByRole('button')); // Prints specific element
});

// Use logRoles to see available roles
import { logRoles } from '@testing-library/react';

test('see available roles', () => {
  const { container } = render(<SearchPage />);
  logRoles(container);
});
```

---

## Documentation & Resources

### Internal Documentation

Create these documentation files:

1. **Testing Guide** - `.claude/plans/Documents/testing-guide.md`
   - Overview of testing strategy
   - How to run tests
   - How to write tests
   - Common patterns and anti-patterns

2. **Test Utilities README** - `app/test-utilities/README.md`
   - Available utilities
   - How to use mocks
   - How to create fixtures
   - Common test scenarios

3. **RLS Testing Guide** - `supabase/tests/README.md`
   - How to write pgTAP tests
   - How to run RLS tests
   - RLS policy patterns

### External Resources

- [React Testing Library Docs](https://testing-library.com/docs/react-testing-library/intro/)
- [Vitest Documentation](https://vitest.dev/)
- [MSW Documentation](https://mswjs.io/)
- [Playwright Best Practices](https://playwright.dev/docs/best-practices)
- [pgTAP Documentation](https://pgtap.org/)

---

## Conclusion

This comprehensive report provides:

1. **Complete skill mapping** - All 15 skills mapped to specific codebase locations
2. **Recurrence patterns** - When and how often each skill is used
3. **Concrete examples** - Copy-paste-ready test code
4. **Implementation roadmap** - Phased approach over 12+ weeks
5. **Automation opportunities** - CI/CD, pre-commit hooks, coverage enforcement
6. **Best practices** - Testing conventions specific to Split Lease

**Next Steps**:
1. Review and approve this plan
2. Begin Phase 1 (Foundation) - Set up Vitest + MSW
3. Create first test file to validate infrastructure
4. Proceed through phases sequentially
5. Iterate based on learnings

**Success Metrics**:
- 80%+ code coverage within 12 weeks
- All critical user flows covered by E2E tests
- RLS policies 100% tested
- CI/CD pipeline running full test suite in < 15 minutes

---

**Report Generated**: 2026-01-07
**Agent**: context-lookup (acb33b2)
**Status**: Ready for implementation
