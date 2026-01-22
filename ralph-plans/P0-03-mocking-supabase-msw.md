# P0-03: Mock Supabase API with MSW

**Priority**: P0 - Foundation
**Estimated Time**: 3-4 hours
**Prerequisites**: P0-01 (vitest setup), P0-02 (test colocation)
**Status**: NOT STARTED

## Implementation Tracker

### Phase 1: MSW Infrastructure Setup
- [ ] IMPLEMENTED: Install MSW dependencies (`bun add -D msw`)
- [ ] IMPLEMENTED: Create `app/test-utilities/msw/setup.ts`
- [ ] IMPLEMENTED: Create `app/test-utilities/msw/server.ts`
- [ ] IMPLEMENTED: Update `app/test-setup.ts` to start MSW server
- [ ] IMPLEMENTED: Verify MSW intercepts requests with simple test

### Phase 2: Edge Function Handlers
- [ ] IMPLEMENTED: Create `handlers/listing.handlers.ts` (GET listings, POST listing, PATCH listing)
- [ ] IMPLEMENTED: Create `handlers/proposal.handlers.ts` (GET proposals, POST proposal)
- [ ] IMPLEMENTED: Create `handlers/auth.handlers.ts` (login, signup, check-status)
- [ ] IMPLEMENTED: Create `handlers/messages.handlers.ts` (GET threads, POST message)
- [ ] IMPLEMENTED: Create `handlers/index.ts` (combined handlers export)

### Phase 3: Test Fixtures
- [ ] IMPLEMENTED: Create `fixtures/listings.fixture.ts` (NYC listings with days, pricing)
- [ ] IMPLEMENTED: Create `fixtures/proposals.fixture.ts` (pending, accepted, rejected)
- [ ] IMPLEMENTED: Create `fixtures/users.fixture.ts` (host, guest, unauthenticated)
- [ ] IMPLEMENTED: Create `fixtures/messages.fixture.ts` (threads with messages)

### Phase 4: Sample Tests
- [ ] IMPLEMENTED: Test SearchPage with MSW (load listings, filter, pagination)
- [ ] IMPLEMENTED: Test error scenarios (500, 400, 404)
- [ ] IMPLEMENTED: Test loading states during API calls
- [ ] IMPLEMENTED: All tests pass with `bun test`

**IMPLEMENTATION STATUS**: [ ] NOT IMPLEMENTED

---

## Overview

MSW (Mock Service Worker) intercepts HTTP requests at the network level, allowing us to test components that call Supabase Edge Functions without actually hitting the API.

**Why MSW for Split Lease**:
- Edge Functions use `{ action, payload }` pattern - MSW can mock this cleanly
- 25 Edge Functions need consistent mocking strategy
- Enables testing loading states, error handling, and edge cases
- Works in both Node (vitest) and browser (Playwright)

---

## Step 1: Install MSW

```bash
cd app
bun add -D msw
```

**Verification**: Check `app/package.json` contains `msw` in devDependencies.

---

## Step 2: Create MSW Setup Infrastructure

### Create `app/test-utilities/msw/setup.ts`

```typescript
import { setupServer } from 'msw/node';
import { handlers } from './handlers';

// Create the mock server with all handlers
export const server = setupServer(...handlers);

// Setup lifecycle hooks
export function setupMSW() {
  beforeAll(() => {
    server.listen({ onUnhandledRequest: 'warn' });
  });

  afterEach(() => {
    server.resetHandlers();
  });

  afterAll(() => {
    server.close();
  });
}
```

### Create `app/test-utilities/msw/server.ts`

```typescript
import { setupServer } from 'msw/node';
import { handlers } from './handlers';

export const server = setupServer(...handlers);
```

---

## Step 3: Update test-setup.ts

Update `app/test-setup.ts` to include MSW:

```typescript
import { expect, afterEach, beforeAll, afterAll, vi } from 'vitest';
import { cleanup } from '@testing-library/react';
import '@testing-library/jest-dom/vitest';
import { server } from './test-utilities/msw/server';

// Start MSW server before all tests
beforeAll(() => {
  server.listen({ onUnhandledRequest: 'warn' });
});

// Reset handlers after each test
afterEach(() => {
  cleanup();
  vi.clearAllMocks();
  server.resetHandlers();
});

// Close server after all tests
afterAll(() => {
  server.close();
});

// ... rest of existing mocks (matchMedia, IntersectionObserver, etc.)
```

---

## Step 4: Create Edge Function Handlers

### Create `app/test-utilities/msw/handlers/listing.handlers.ts`

```typescript
import { http, HttpResponse } from 'msw';
import { mockListings, mockListingDetail } from '../fixtures/listings.fixture';

const EDGE_FUNCTION_URL = 'http://localhost:54321/functions/v1';

export const listingHandlers = [
  // GET listings (search)
  http.post(`${EDGE_FUNCTION_URL}/listing`, async ({ request }) => {
    const body = await request.json() as { action: string; payload?: any };

    if (body.action === 'search') {
      // Simulate filtering based on payload
      const { days, priceTier, page = 1 } = body.payload || {};
      let filtered = [...mockListings];

      if (days && days.length > 0) {
        filtered = filtered.filter(listing =>
          days.some((day: number) => listing.available_days?.includes(day))
        );
      }

      if (priceTier) {
        filtered = filtered.filter(listing => {
          const price = listing.price_per_night;
          if (priceTier === 'budget') return price < 100;
          if (priceTier === 'mid') return price >= 100 && price < 200;
          if (priceTier === 'premium') return price >= 200;
          return true;
        });
      }

      // Paginate
      const pageSize = 10;
      const start = (page - 1) * pageSize;
      const paginatedResults = filtered.slice(start, start + pageSize);

      return HttpResponse.json({
        data: paginatedResults,
        count: filtered.length,
        page,
        hasMore: start + pageSize < filtered.length,
      });
    }

    if (body.action === 'get') {
      const { id } = body.payload;
      const listing = mockListings.find(l => l.id === id);

      if (!listing) {
        return HttpResponse.json(
          { error: 'Listing not found' },
          { status: 404 }
        );
      }

      return HttpResponse.json({ data: mockListingDetail(listing) });
    }

    if (body.action === 'create') {
      // Return created listing with generated ID
      return HttpResponse.json({
        data: {
          id: `listing_${Date.now()}`,
          ...body.payload,
          created_at: new Date().toISOString(),
        },
      });
    }

    if (body.action === 'update') {
      const { id, ...updates } = body.payload;
      return HttpResponse.json({
        data: { id, ...updates, updated_at: new Date().toISOString() },
      });
    }

    return HttpResponse.json({ error: 'Unknown action' }, { status: 400 });
  }),
];
```

### Create `app/test-utilities/msw/handlers/proposal.handlers.ts`

```typescript
import { http, HttpResponse } from 'msw';
import { mockProposals, createMockProposal } from '../fixtures/proposals.fixture';

const EDGE_FUNCTION_URL = 'http://localhost:54321/functions/v1';

export const proposalHandlers = [
  http.post(`${EDGE_FUNCTION_URL}/proposal`, async ({ request }) => {
    const body = await request.json() as { action: string; payload?: any };

    if (body.action === 'list') {
      const { userId, role } = body.payload || {};
      let filtered = [...mockProposals];

      if (role === 'guest') {
        filtered = filtered.filter(p => p.guest_id === userId);
      } else if (role === 'host') {
        filtered = filtered.filter(p => p.host_id === userId);
      }

      return HttpResponse.json({ data: filtered });
    }

    if (body.action === 'get') {
      const proposal = mockProposals.find(p => p.id === body.payload.id);

      if (!proposal) {
        return HttpResponse.json({ error: 'Proposal not found' }, { status: 404 });
      }

      return HttpResponse.json({ data: proposal });
    }

    if (body.action === 'create') {
      const newProposal = createMockProposal(body.payload);
      return HttpResponse.json({ data: newProposal });
    }

    if (body.action === 'accept') {
      const proposal = mockProposals.find(p => p.id === body.payload.id);
      if (!proposal) {
        return HttpResponse.json({ error: 'Proposal not found' }, { status: 404 });
      }

      return HttpResponse.json({
        data: { ...proposal, status: 'accepted', accepted_at: new Date().toISOString() },
      });
    }

    if (body.action === 'cancel') {
      const proposal = mockProposals.find(p => p.id === body.payload.id);
      if (!proposal) {
        return HttpResponse.json({ error: 'Proposal not found' }, { status: 404 });
      }

      return HttpResponse.json({
        data: { ...proposal, status: 'cancelled', cancelled_at: new Date().toISOString() },
      });
    }

    return HttpResponse.json({ error: 'Unknown action' }, { status: 400 });
  }),
];
```

### Create `app/test-utilities/msw/handlers/auth.handlers.ts`

```typescript
import { http, HttpResponse } from 'msw';
import { mockUsers, mockHostUser, mockGuestUser } from '../fixtures/users.fixture';

const EDGE_FUNCTION_URL = 'http://localhost:54321/functions/v1';

export const authHandlers = [
  http.post(`${EDGE_FUNCTION_URL}/auth-user`, async ({ request }) => {
    const body = await request.json() as { action: string; payload?: any };

    if (body.action === 'login') {
      const { email, password } = body.payload;

      // Simulate login validation
      if (email === 'host@example.com' && password === 'password123') {
        return HttpResponse.json({
          data: {
            user: mockHostUser,
            session: {
              access_token: 'mock_access_token_host',
              refresh_token: 'mock_refresh_token',
              expires_at: Date.now() + 3600000,
            },
          },
        });
      }

      if (email === 'guest@example.com' && password === 'password123') {
        return HttpResponse.json({
          data: {
            user: mockGuestUser,
            session: {
              access_token: 'mock_access_token_guest',
              refresh_token: 'mock_refresh_token',
              expires_at: Date.now() + 3600000,
            },
          },
        });
      }

      return HttpResponse.json(
        { error: 'Invalid credentials' },
        { status: 401 }
      );
    }

    if (body.action === 'signup') {
      const { email, password, userType, firstName, lastName } = body.payload;

      // Simulate email already exists
      if (email === 'existing@example.com') {
        return HttpResponse.json(
          { error: 'Email already registered' },
          { status: 409 }
        );
      }

      return HttpResponse.json({
        data: {
          user: {
            id: `user_${Date.now()}`,
            email,
            user_type: userType,
            first_name: firstName,
            last_name: lastName,
            created_at: new Date().toISOString(),
          },
          session: {
            access_token: 'mock_access_token_new',
            refresh_token: 'mock_refresh_token',
            expires_at: Date.now() + 3600000,
          },
        },
      });
    }

    if (body.action === 'check-status') {
      const authHeader = request.headers.get('Authorization');

      if (!authHeader || !authHeader.startsWith('Bearer ')) {
        return HttpResponse.json({ data: { authenticated: false } });
      }

      const token = authHeader.replace('Bearer ', '');

      if (token === 'mock_access_token_host') {
        return HttpResponse.json({
          data: { authenticated: true, user: mockHostUser },
        });
      }

      if (token === 'mock_access_token_guest') {
        return HttpResponse.json({
          data: { authenticated: true, user: mockGuestUser },
        });
      }

      return HttpResponse.json({ data: { authenticated: false } });
    }

    return HttpResponse.json({ error: 'Unknown action' }, { status: 400 });
  }),
];
```

### Create `app/test-utilities/msw/handlers/messages.handlers.ts`

```typescript
import { http, HttpResponse } from 'msw';
import { mockThreads, mockMessages } from '../fixtures/messages.fixture';

const EDGE_FUNCTION_URL = 'http://localhost:54321/functions/v1';

export const messagesHandlers = [
  http.post(`${EDGE_FUNCTION_URL}/messages`, async ({ request }) => {
    const body = await request.json() as { action: string; payload?: any };

    if (body.action === 'list-threads') {
      const { userId } = body.payload;
      const userThreads = mockThreads.filter(
        t => t.host_id === userId || t.guest_id === userId
      );

      return HttpResponse.json({ data: userThreads });
    }

    if (body.action === 'get-messages') {
      const { threadId } = body.payload;
      const threadMessages = mockMessages.filter(m => m.thread_id === threadId);

      return HttpResponse.json({ data: threadMessages });
    }

    if (body.action === 'send') {
      const { threadId, senderId, content } = body.payload;

      return HttpResponse.json({
        data: {
          id: `msg_${Date.now()}`,
          thread_id: threadId,
          sender_id: senderId,
          content,
          created_at: new Date().toISOString(),
          read: false,
        },
      });
    }

    return HttpResponse.json({ error: 'Unknown action' }, { status: 400 });
  }),
];
```

### Create `app/test-utilities/msw/handlers/index.ts`

```typescript
import { listingHandlers } from './listing.handlers';
import { proposalHandlers } from './proposal.handlers';
import { authHandlers } from './auth.handlers';
import { messagesHandlers } from './messages.handlers';

export const handlers = [
  ...listingHandlers,
  ...proposalHandlers,
  ...authHandlers,
  ...messagesHandlers,
];
```

---

## Step 5: Create Test Fixtures

### Create `app/test-utilities/msw/fixtures/listings.fixture.ts`

```typescript
// Split Lease NYC listings with 0-indexed days (0=Sunday)
export const mockListings = [
  {
    id: 'listing_001',
    title: 'Modern Studio in Manhattan',
    description: 'Cozy studio perfect for weekday stays',
    price_per_night: 150,
    available_days: [1, 2, 3, 4], // Mon-Thu
    address: '123 W 42nd St, New York, NY',
    neighborhood: 'Midtown',
    latitude: 40.7549,
    longitude: -73.9840,
    bedrooms: 0,
    bathrooms: 1,
    max_guests: 2,
    host_id: 'user_host_001',
    images: ['https://example.com/img1.jpg', 'https://example.com/img2.jpg'],
    amenities: ['WiFi', 'Kitchen', 'AC'],
    blocked_dates: [],
    created_at: '2024-01-15T10:00:00Z',
    status: 'active',
  },
  {
    id: 'listing_002',
    title: 'Brooklyn Brownstone Room',
    description: 'Charming room in historic brownstone',
    price_per_night: 120,
    available_days: [0, 5, 6], // Fri-Sun
    address: '456 Park Slope Ave, Brooklyn, NY',
    neighborhood: 'Park Slope',
    latitude: 40.6681,
    longitude: -73.9822,
    bedrooms: 1,
    bathrooms: 1,
    max_guests: 2,
    host_id: 'user_host_002',
    images: ['https://example.com/img3.jpg'],
    amenities: ['WiFi', 'Garden', 'Laundry'],
    blocked_dates: [],
    created_at: '2024-01-10T10:00:00Z',
    status: 'active',
  },
  {
    id: 'listing_003',
    title: 'Upper East Side Luxury',
    description: 'High-end apartment with Central Park views',
    price_per_night: 350,
    available_days: [1, 2, 3, 4, 5], // Mon-Fri
    address: '789 5th Ave, New York, NY',
    neighborhood: 'Upper East Side',
    latitude: 40.7736,
    longitude: -73.9654,
    bedrooms: 2,
    bathrooms: 2,
    max_guests: 4,
    host_id: 'user_host_001',
    images: ['https://example.com/img4.jpg', 'https://example.com/img5.jpg'],
    amenities: ['WiFi', 'Doorman', 'Gym', 'Terrace'],
    blocked_dates: ['2024-02-14', '2024-02-15'],
    created_at: '2024-01-05T10:00:00Z',
    status: 'active',
  },
];

// Expanded listing detail (includes host info, reviews)
export function mockListingDetail(listing: typeof mockListings[0]) {
  return {
    ...listing,
    host: {
      id: listing.host_id,
      first_name: listing.host_id === 'user_host_001' ? 'Sarah' : 'Mike',
      profile_photo: 'https://example.com/avatar.jpg',
      response_rate: 0.95,
      response_time: '< 1 hour',
      joined_date: '2023-06-01',
    },
    reviews: [
      {
        id: 'review_001',
        rating: 5,
        comment: 'Great place, highly recommend!',
        guest_name: 'John D.',
        created_at: '2024-01-20T10:00:00Z',
      },
    ],
    average_rating: 4.8,
    review_count: 12,
  };
}

// Factory for creating custom listings in tests
export function createMockListing(overrides: Partial<typeof mockListings[0]> = {}) {
  return {
    id: `listing_${Date.now()}`,
    title: 'Test Listing',
    description: 'A test listing',
    price_per_night: 100,
    available_days: [1, 2, 3, 4, 5],
    address: '123 Test St, New York, NY',
    neighborhood: 'Test Neighborhood',
    latitude: 40.7128,
    longitude: -74.0060,
    bedrooms: 1,
    bathrooms: 1,
    max_guests: 2,
    host_id: 'user_host_test',
    images: [],
    amenities: [],
    blocked_dates: [],
    created_at: new Date().toISOString(),
    status: 'active',
    ...overrides,
  };
}
```

### Create `app/test-utilities/msw/fixtures/proposals.fixture.ts`

```typescript
// Proposal statuses: pending, accepted, rejected, cancelled, expired
export const mockProposals = [
  {
    id: 'proposal_001',
    listing_id: 'listing_001',
    guest_id: 'user_guest_001',
    host_id: 'user_host_001',
    status: 'pending',
    selected_days: [1, 2, 3], // Mon, Tue, Wed
    move_in_date: '2024-03-01',
    duration_weeks: 4,
    price_per_night: 150,
    total_price: 1800, // 3 days * 4 weeks * $150
    guest_message: 'Looking forward to staying!',
    created_at: '2024-02-15T10:00:00Z',
    updated_at: '2024-02-15T10:00:00Z',
    listing: {
      id: 'listing_001',
      title: 'Modern Studio in Manhattan',
      images: ['https://example.com/img1.jpg'],
    },
    guest: {
      id: 'user_guest_001',
      first_name: 'Alex',
      profile_photo: 'https://example.com/guest.jpg',
    },
  },
  {
    id: 'proposal_002',
    listing_id: 'listing_002',
    guest_id: 'user_guest_001',
    host_id: 'user_host_002',
    status: 'accepted',
    selected_days: [5, 6, 0], // Fri, Sat, Sun
    move_in_date: '2024-02-23',
    duration_weeks: 8,
    price_per_night: 120,
    total_price: 2880,
    guest_message: 'Perfect for my weekend routine',
    created_at: '2024-02-10T10:00:00Z',
    updated_at: '2024-02-12T10:00:00Z',
    accepted_at: '2024-02-12T10:00:00Z',
    listing: {
      id: 'listing_002',
      title: 'Brooklyn Brownstone Room',
      images: ['https://example.com/img3.jpg'],
    },
    guest: {
      id: 'user_guest_001',
      first_name: 'Alex',
      profile_photo: 'https://example.com/guest.jpg',
    },
  },
  {
    id: 'proposal_003',
    listing_id: 'listing_003',
    guest_id: 'user_guest_002',
    host_id: 'user_host_001',
    status: 'rejected',
    selected_days: [1, 2, 3, 4, 5],
    move_in_date: '2024-02-20',
    duration_weeks: 12,
    price_per_night: 350,
    total_price: 21000,
    guest_message: 'Business travel',
    created_at: '2024-02-08T10:00:00Z',
    updated_at: '2024-02-09T10:00:00Z',
    rejected_at: '2024-02-09T10:00:00Z',
    rejection_reason: 'Dates not available',
    listing: {
      id: 'listing_003',
      title: 'Upper East Side Luxury',
      images: ['https://example.com/img4.jpg'],
    },
    guest: {
      id: 'user_guest_002',
      first_name: 'Jordan',
      profile_photo: 'https://example.com/guest2.jpg',
    },
  },
];

// Factory for creating proposals in tests
export function createMockProposal(overrides: Partial<typeof mockProposals[0]> = {}) {
  return {
    id: `proposal_${Date.now()}`,
    listing_id: 'listing_001',
    guest_id: 'user_guest_test',
    host_id: 'user_host_001',
    status: 'pending',
    selected_days: [1, 2, 3],
    move_in_date: '2024-04-01',
    duration_weeks: 4,
    price_per_night: 150,
    total_price: 1800,
    guest_message: 'Test proposal',
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
    ...overrides,
  };
}
```

### Create `app/test-utilities/msw/fixtures/users.fixture.ts`

```typescript
export const mockHostUser = {
  id: 'user_host_001',
  email: 'host@example.com',
  user_type: 'host',
  first_name: 'Sarah',
  last_name: 'Host',
  profile_photo: 'https://example.com/host.jpg',
  phone: '+1234567890',
  created_at: '2023-06-01T10:00:00Z',
  listings_count: 2,
};

export const mockGuestUser = {
  id: 'user_guest_001',
  email: 'guest@example.com',
  user_type: 'guest',
  first_name: 'Alex',
  last_name: 'Guest',
  profile_photo: 'https://example.com/guest.jpg',
  phone: '+0987654321',
  created_at: '2023-09-15T10:00:00Z',
  proposals_count: 3,
};

export const mockUnauthenticatedUser = null;

export const mockUsers = [mockHostUser, mockGuestUser];

// Factory for creating users in tests
export function createMockUser(overrides: Partial<typeof mockHostUser> = {}) {
  return {
    id: `user_${Date.now()}`,
    email: 'test@example.com',
    user_type: 'guest',
    first_name: 'Test',
    last_name: 'User',
    profile_photo: null,
    phone: null,
    created_at: new Date().toISOString(),
    ...overrides,
  };
}
```

### Create `app/test-utilities/msw/fixtures/messages.fixture.ts`

```typescript
export const mockThreads = [
  {
    id: 'thread_001',
    proposal_id: 'proposal_001',
    host_id: 'user_host_001',
    guest_id: 'user_guest_001',
    last_message: 'Thanks for your interest!',
    last_message_at: '2024-02-16T10:00:00Z',
    unread_count: 1,
    created_at: '2024-02-15T10:00:00Z',
    listing: {
      id: 'listing_001',
      title: 'Modern Studio in Manhattan',
    },
  },
  {
    id: 'thread_002',
    proposal_id: 'proposal_002',
    host_id: 'user_host_002',
    guest_id: 'user_guest_001',
    last_message: 'See you on Friday!',
    last_message_at: '2024-02-20T10:00:00Z',
    unread_count: 0,
    created_at: '2024-02-10T10:00:00Z',
    listing: {
      id: 'listing_002',
      title: 'Brooklyn Brownstone Room',
    },
  },
];

export const mockMessages = [
  {
    id: 'msg_001',
    thread_id: 'thread_001',
    sender_id: 'user_guest_001',
    content: 'Hi! I am interested in your listing.',
    created_at: '2024-02-15T10:00:00Z',
    read: true,
  },
  {
    id: 'msg_002',
    thread_id: 'thread_001',
    sender_id: 'user_host_001',
    content: 'Thanks for your interest! Let me know if you have questions.',
    created_at: '2024-02-16T10:00:00Z',
    read: false,
  },
  {
    id: 'msg_003',
    thread_id: 'thread_002',
    sender_id: 'user_host_002',
    content: 'Your proposal has been accepted!',
    created_at: '2024-02-12T10:00:00Z',
    read: true,
  },
  {
    id: 'msg_004',
    thread_id: 'thread_002',
    sender_id: 'user_guest_001',
    content: 'See you on Friday!',
    created_at: '2024-02-20T10:00:00Z',
    read: true,
  },
];

// Factory for creating messages in tests
export function createMockMessage(overrides: Partial<typeof mockMessages[0]> = {}) {
  return {
    id: `msg_${Date.now()}`,
    thread_id: 'thread_001',
    sender_id: 'user_guest_001',
    content: 'Test message',
    created_at: new Date().toISOString(),
    read: false,
    ...overrides,
  };
}
```

---

## Step 6: Create Sample Test with MSW

### Create `app/src/islands/pages/SearchPage.test.jsx`

```jsx
import { describe, it, expect, vi } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { http, HttpResponse } from 'msw';
import { server } from 'test-utilities/msw/server';
import SearchPage from './SearchPage';

describe('SearchPage', () => {
  describe('Loading States', () => {
    it('shows loading skeleton while fetching listings', () => {
      render(<SearchPage />);

      expect(screen.getByTestId('listings-skeleton')).toBeInTheDocument();
    });

    it('renders listings after API response', async () => {
      render(<SearchPage />);

      await waitFor(() => {
        expect(screen.getByText('Modern Studio in Manhattan')).toBeInTheDocument();
      });

      expect(screen.getByText('Brooklyn Brownstone Room')).toBeInTheDocument();
      expect(screen.getByText('Upper East Side Luxury')).toBeInTheDocument();
    });
  });

  describe('Filtering', () => {
    it('filters listings by day selection', async () => {
      const user = userEvent.setup();
      render(<SearchPage />);

      // Wait for initial load
      await waitFor(() => {
        expect(screen.getByText('Modern Studio in Manhattan')).toBeInTheDocument();
      });

      // Click Monday (index 1) filter
      const mondayButton = screen.getByRole('button', { name: /monday/i });
      await user.click(mondayButton);

      // Should show listings available on Monday
      await waitFor(() => {
        expect(screen.getByText('Modern Studio in Manhattan')).toBeInTheDocument();
        expect(screen.queryByText('Brooklyn Brownstone Room')).not.toBeInTheDocument();
      });
    });

    it('filters by price tier', async () => {
      const user = userEvent.setup();
      render(<SearchPage />);

      await waitFor(() => {
        expect(screen.getByText('Modern Studio in Manhattan')).toBeInTheDocument();
      });

      // Select premium price tier
      const premiumFilter = screen.getByRole('button', { name: /premium/i });
      await user.click(premiumFilter);

      await waitFor(() => {
        expect(screen.getByText('Upper East Side Luxury')).toBeInTheDocument();
        expect(screen.queryByText('Modern Studio in Manhattan')).not.toBeInTheDocument();
      });
    });
  });

  describe('Error Handling', () => {
    it('shows error message when API fails', async () => {
      // Override handler for this test
      server.use(
        http.post('http://localhost:54321/functions/v1/listing', () => {
          return HttpResponse.json(
            { error: 'Internal server error' },
            { status: 500 }
          );
        })
      );

      render(<SearchPage />);

      await waitFor(() => {
        expect(screen.getByText(/error loading listings/i)).toBeInTheDocument();
      });
    });

    it('shows retry button on error', async () => {
      server.use(
        http.post('http://localhost:54321/functions/v1/listing', () => {
          return HttpResponse.json({ error: 'Server error' }, { status: 500 });
        })
      );

      render(<SearchPage />);

      await waitFor(() => {
        expect(screen.getByRole('button', { name: /retry/i })).toBeInTheDocument();
      });
    });
  });

  describe('Empty State', () => {
    it('shows empty state when no listings match filters', async () => {
      server.use(
        http.post('http://localhost:54321/functions/v1/listing', () => {
          return HttpResponse.json({ data: [], count: 0, hasMore: false });
        })
      );

      render(<SearchPage />);

      await waitFor(() => {
        expect(screen.getByText(/no listings found/i)).toBeInTheDocument();
      });
    });
  });

  describe('Pagination', () => {
    it('loads more listings when scrolling', async () => {
      // This would test infinite scroll if implemented
      // For now, test "Load More" button if present
      render(<SearchPage />);

      await waitFor(() => {
        expect(screen.getByText('Modern Studio in Manhattan')).toBeInTheDocument();
      });

      // If pagination exists
      const loadMoreButton = screen.queryByRole('button', { name: /load more/i });
      if (loadMoreButton) {
        await userEvent.click(loadMoreButton);
        // Verify more listings load
      }
    });
  });
});
```

---

## Step 7: Run Tests

```bash
cd app
bun test SearchPage.test.jsx  # Should pass all tests
bun test                       # All tests including MSW
```

---

## Completion Checklist

- [ ] MSW installed (`bun add -D msw`)
- [ ] `test-utilities/msw/setup.ts` created
- [ ] `test-utilities/msw/server.ts` created
- [ ] `test-setup.ts` updated with MSW lifecycle
- [ ] `handlers/listing.handlers.ts` created
- [ ] `handlers/proposal.handlers.ts` created
- [ ] `handlers/auth.handlers.ts` created
- [ ] `handlers/messages.handlers.ts` created
- [ ] `handlers/index.ts` created
- [ ] `fixtures/listings.fixture.ts` created
- [ ] `fixtures/proposals.fixture.ts` created
- [ ] `fixtures/users.fixture.ts` created
- [ ] `fixtures/messages.fixture.ts` created
- [ ] `SearchPage.test.jsx` passes all tests
- [ ] Error scenarios tested (500, 404, 400)
- [ ] Loading states tested
- [ ] All tests pass with `bun test`

**MARK AS**: ✅ IMPLEMENTED when all checkboxes complete.

---

## Next Steps

1. Move to P0-04: mocking-auth-context
2. Use MSW handlers in all component tests
3. Add handlers for remaining Edge Functions as needed

---

## Split Lease Context

**Why This Pattern Matters**:
- All 25 Edge Functions use `{ action, payload }` pattern
- MSW handlers can mock this consistently
- Fixtures use 0-indexed days (0=Sunday) matching Split Lease convention
- Test data reflects NYC neighborhoods and realistic pricing

**Edge Functions Covered**:
- `listing/` - Search, get, create, update
- `proposal/` - List, get, create, accept, cancel
- `auth-user/` - Login, signup, check-status
- `messages/` - List threads, get messages, send

**Files Enabled After This Plan**:
- All pages that fetch from Supabase Edge Functions
- SearchPage.jsx, ViewSplitLeasePage.jsx, GuestProposalsPage.jsx
- Any component calling `callEdgeFunction()`
