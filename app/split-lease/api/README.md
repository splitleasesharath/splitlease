# API Client

Type-safe API client for interacting with the SplitLease backend.

## Overview

The API client provides:
- Type-safe request/response handling
- Automatic error handling and retries
- Authentication token management
- Request/response logging
- Zod schema validation

## Usage

### Basic Usage

```typescript
import { apiClient } from '@api';

// Search listings
const response = await apiClient.searchListings({
  city: 'San Francisco',
  minPrice: 1000,
  maxPrice: 3000,
}, {
  page: 1,
  limit: 10,
});

if (response.success && response.data) {
  const listings = response.data.results;
  console.log(`Found ${listings.length} listings`);
} else {
  console.error(response.error?.message);
}
```

### Authentication

```typescript
// Set auth token (after login)
apiClient.setAuthToken('your-jwt-token-here');

// Make authenticated requests
const user = await apiClient.getCurrentUser();

// Clear auth token (on logout)
apiClient.setAuthToken(null);
```

### Custom Configuration

```typescript
import { SplitLeaseAPI } from '@api';

const customClient = new SplitLeaseAPI({
  baseURL: 'https://api.splitlease.com',
  timeout: 60000,
  retryAttempts: 5,
  retryDelay: 2000,
  headers: {
    'X-Custom-Header': 'value',
  },
});
```

## Available Methods

### Listings

#### Search Listings
```typescript
const response = await apiClient.searchListings(
  {
    query: 'downtown apartment',
    city: 'San Francisco',
    minPrice: 2000,
    maxPrice: 4000,
    bedrooms: 2,
    amenities: ['wifi', 'parking'],
  },
  {
    page: 1,
    limit: 20,
    sortBy: 'price',
    sortOrder: 'asc',
  }
);
```

#### Get Listing by ID
```typescript
const response = await apiClient.getListing('listing-id-123');

if (response.success && response.data) {
  const listing = response.data;
  console.log(listing.title);
}
```

#### Create Listing (Authenticated)
```typescript
const response = await apiClient.createListing({
  title: 'Cozy 2BR in Downtown',
  description: 'Beautiful apartment...',
  location: {
    city: 'San Francisco',
    state: 'CA',
    country: 'USA',
  },
  price: 2500,
  availableFrom: '2024-01-01T00:00:00Z',
  availableTo: '2024-12-31T23:59:59Z',
  bedrooms: 2,
  bathrooms: 1,
  amenities: ['wifi', 'parking'],
  images: [
    { url: 'https://...', alt: 'Living room' },
  ],
});
```

#### Update Listing (Authenticated)
```typescript
const response = await apiClient.updateListing('listing-id-123', {
  price: 2800,
  status: 'active',
});
```

#### Delete Listing (Authenticated)
```typescript
const response = await apiClient.deleteListing('listing-id-123');
```

### Bookings

#### Create Booking (Authenticated)
```typescript
const response = await apiClient.createBooking({
  listingId: 'listing-id-123',
  checkIn: '2024-06-01T15:00:00Z',
  checkOut: '2024-06-07T11:00:00Z',
  guests: 2,
  specialRequests: 'Early check-in if possible',
});
```

#### Get Booking (Authenticated)
```typescript
const response = await apiClient.getBooking('booking-id-456');
```

#### Get User's Bookings (Authenticated)
```typescript
const response = await apiClient.getUserBookings();

if (response.success && response.data) {
  const bookings = response.data.results;
  bookings.forEach(booking => {
    console.log(`${booking.checkIn} - ${booking.checkOut}`);
  });
}
```

#### Cancel Booking (Authenticated)
```typescript
const response = await apiClient.cancelBooking(
  'booking-id-456',
  'Change of plans'
);
```

### User

#### Get Current User (Authenticated)
```typescript
const response = await apiClient.getCurrentUser();

if (response.success && response.data) {
  console.log(`Welcome, ${response.data.name}!`);
}
```

#### Update Profile (Authenticated)
```typescript
const response = await apiClient.updateUserProfile({
  name: 'John Doe',
  bio: 'Love traveling and meeting new people',
  avatar: 'https://example.com/avatar.jpg',
});
```

## Error Handling

The API client returns consistent error responses:

```typescript
const response = await apiClient.getListing('invalid-id');

if (!response.success && response.error) {
  console.error(`Error ${response.error.code}: ${response.error.message}`);

  // Handle specific error types
  switch (response.error.code) {
    case 'NOT_FOUND':
      showNotFoundMessage();
      break;
    case 'UNAUTHORIZED':
      redirectToLogin();
      break;
    case 'NETWORK_ERROR':
      showOfflineMessage();
      break;
    default:
      showGenericError();
  }
}
```

### Error Codes

- `VALIDATION_ERROR` - Invalid request data
- `NOT_FOUND` - Resource not found
- `UNAUTHORIZED` - Authentication required
- `FORBIDDEN` - Insufficient permissions
- `CONFLICT` - Resource conflict
- `RATE_LIMIT_EXCEEDED` - Too many requests
- `INTERNAL_ERROR` - Server error
- `SERVICE_UNAVAILABLE` - Service temporarily unavailable
- `NETWORK_ERROR` - Network/connection error
- `TIMEOUT` - Request timeout

## Response Types

All responses follow this structure:

```typescript
type APIResponse<T> = {
  success: boolean;
  data?: T;
  error?: {
    code: string;
    message: string;
    details?: Record<string, unknown>;
    statusCode?: number;
  };
  timestamp?: string;
};
```

Paginated responses:

```typescript
type PaginatedResponse<T> = {
  success: boolean;
  data?: {
    results: T[];
    pagination: {
      page: number;
      limit: number;
      total: number;
      totalPages: number;
    };
  };
  error?: APIError;
};
```

## TypeScript Support

All API methods are fully typed:

```typescript
// TypeScript knows the response type
const response = await apiClient.getListing('123');

if (response.success && response.data) {
  // TypeScript autocomplete works here
  console.log(response.data.title); // ✅
  console.log(response.data.invalidField); // ❌ Type error
}
```

## Testing with API Client

Mock the API client in tests:

```typescript
import { vi } from 'vitest';
import * as api from '@api';

vi.spyOn(api.apiClient, 'searchListings').mockResolvedValue({
  success: true,
  data: {
    results: [mockListing],
    pagination: { page: 1, limit: 10, total: 1, totalPages: 1 },
  },
});
```

Or use MSW to mock at the network level (preferred):

```typescript
// tests/mocks/handlers.ts already set up
// Your tests will automatically use mocked API responses
```

## Configuration

### Environment Variables

Set the API base URL via environment variable:

```bash
# .env.development
VITE_API_BASE_URL=http://localhost:3000/api

# .env.production
VITE_API_BASE_URL=https://api.splitlease.com/v1
```

### Timeouts and Retries

```typescript
const client = new SplitLeaseAPI({
  timeout: 30000,        // 30 seconds
  retryAttempts: 3,      // Retry up to 3 times
  retryDelay: 1000,      // Wait 1 second between retries
});
```

## Best Practices

1. **Always check `success` before accessing `data`**
   ```typescript
   if (response.success && response.data) {
     // Safe to use response.data
   }
   ```

2. **Handle errors gracefully**
   ```typescript
   if (!response.success) {
     // Show user-friendly error message
   }
   ```

3. **Use TypeScript types**
   ```typescript
   import { SplitLease, APIResponse } from '@types';

   async function getListing(id: string): Promise<SplitLease | null> {
     const response = await apiClient.getListing(id);
     return response.success ? response.data || null : null;
   }
   ```

4. **Manage auth tokens properly**
   ```typescript
   // Set on login
   apiClient.setAuthToken(token);

   // Clear on logout
   apiClient.setAuthToken(null);
   ```
