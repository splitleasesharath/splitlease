# Type Definitions

TypeScript type definitions and Zod schemas for the SplitLease application.

## Overview

This directory contains:
- TypeScript interfaces for domain models
- Zod schemas for runtime validation
- API request/response types
- Shared utility types

## Structure

```
types/
├── models.ts    # Domain models (Listing, User, Booking, etc.)
├── api.ts       # API types (requests, responses, errors)
└── index.ts     # Barrel export
```

## Usage

### Importing Types

```typescript
// Import from the barrel export
import { SplitLease, User, Booking, APIResponse } from '@types';

// Or import specific files
import { SplitLease } from '@types/models';
import { APIError } from '@types/api';
```

### Domain Models

#### SplitLease (Listing)

```typescript
import { SplitLease, SplitLeaseSchema } from '@types';

const listing: SplitLease = {
  id: '123',
  title: 'Cozy 2BR in Downtown',
  description: 'Beautiful apartment...',
  location: {
    city: 'San Francisco',
    state: 'CA',
    country: 'USA',
  },
  price: 2500,
  priceFrequency: 'monthly',
  availableFrom: '2024-01-01T00:00:00Z',
  availableTo: '2024-12-31T23:59:59Z',
  bedrooms: 2,
  bathrooms: 1,
  amenities: ['wifi', 'parking'],
  images: [/* ... */],
  hostId: 'host-123',
  status: 'active',
  createdAt: '2024-01-01T00:00:00Z',
};

// Runtime validation
const result = SplitLeaseSchema.safeParse(listing);
if (result.success) {
  console.log('Valid listing');
} else {
  console.error(result.error);
}
```

#### User

```typescript
import { User, UserSchema } from '@types';

const user: User = {
  id: 'user-123',
  email: 'john@example.com',
  name: 'John Doe',
  role: 'guest',
  verified: true,
  createdAt: '2024-01-01T00:00:00Z',
};
```

#### Booking

```typescript
import { Booking, BookingSchema } from '@types';

const booking: Booking = {
  id: 'booking-123',
  listingId: 'listing-456',
  guestId: 'user-789',
  checkIn: '2024-06-01T15:00:00Z',
  checkOut: '2024-06-07T11:00:00Z',
  guests: 2,
  totalPrice: 3500,
  status: 'confirmed',
  createdAt: '2024-05-01T00:00:00Z',
};
```

### API Types

#### APIResponse

Generic response wrapper:

```typescript
import { APIResponse } from '@types';

function handleResponse<T>(response: APIResponse<T>) {
  if (response.success && response.data) {
    return response.data;
  } else {
    throw new Error(response.error?.message || 'Unknown error');
  }
}
```

#### PaginatedResponse

For paginated endpoints:

```typescript
import { PaginatedResponse, SplitLease } from '@types';

const response: PaginatedResponse<SplitLease> = {
  success: true,
  data: {
    results: [/* listings */],
    pagination: {
      page: 1,
      limit: 10,
      total: 100,
      totalPages: 10,
    },
  },
};
```

#### APIError

Standardized error format:

```typescript
import { APIError } from '@types';

const error: APIError = {
  code: 'NOT_FOUND',
  message: 'Listing not found',
  statusCode: 404,
  details: {
    listingId: '123',
  },
};
```

## Zod Schema Validation

All models have corresponding Zod schemas for runtime validation.

### Validating Data

```typescript
import { SplitLeaseSchema } from '@types';

// Parse and validate
try {
  const listing = SplitLeaseSchema.parse(unknownData);
  console.log('Valid:', listing);
} catch (error) {
  console.error('Invalid:', error);
}

// Safe parse (no throw)
const result = SplitLeaseSchema.safeParse(unknownData);
if (result.success) {
  console.log('Valid:', result.data);
} else {
  console.error('Invalid:', result.error.errors);
}
```

### Partial Validation

For updates where not all fields are required:

```typescript
import { SplitLeaseSchema } from '@types';

const PartialListingSchema = SplitLeaseSchema.partial();

const update = {
  price: 2800,
  status: 'active',
};

const result = PartialListingSchema.parse(update);
```

### Array Validation

```typescript
import { z } from 'zod';
import { SplitLeaseSchema } from '@types';

const ListingsArraySchema = z.array(SplitLeaseSchema);

const listings = ListingsArraySchema.parse([
  /* array of listings */
]);
```

## Type Guards

Create type guards for runtime type checking:

```typescript
import { SplitLease, Booking } from '@types';

function isSplitLease(obj: unknown): obj is SplitLease {
  return (
    typeof obj === 'object' &&
    obj !== null &&
    'title' in obj &&
    'price' in obj &&
    'location' in obj
  );
}

function isBooking(obj: unknown): obj is Booking {
  return (
    typeof obj === 'object' &&
    obj !== null &&
    'listingId' in obj &&
    'checkIn' in obj &&
    'checkOut' in obj
  );
}
```

## Utility Types

### Omit Specific Fields

```typescript
import { SplitLease } from '@types';

// Listing without timestamps
type ListingInput = Omit<SplitLease, 'id' | 'createdAt' | 'updatedAt'>;

// Listing with only specific fields
type ListingSummary = Pick<SplitLease, 'id' | 'title' | 'price' | 'location'>;
```

### Make Fields Optional

```typescript
import { SplitLease } from '@types';

// All fields optional
type PartialListing = Partial<SplitLease>;

// Specific fields required
type ListingUpdate = Partial<SplitLease> & Pick<SplitLease, 'id'>;
```

### Make Fields Required

```typescript
import { SplitLease } from '@types';

// Make optional fields required
type CompleteListing = Required<SplitLease>;
```

## Enums and Constants

### Amenities

```typescript
import { Amenity } from '@types';

const validAmenities: Amenity[] = [
  'wifi',
  'parking',
  'laundry',
  'gym',
  'pool',
  'ac',
  'heating',
  'dishwasher',
  'tv',
  'workspace',
  'kitchen',
  'petsAllowed',
  'smoking',
  'wheelchair',
  'elevator',
  'securitySystem',
];
```

### User Roles

```typescript
import { UserRole } from '@types';

const role: UserRole = 'guest'; // 'guest' | 'host' | 'admin'
```

### Booking Status

```typescript
import { BookingStatus } from '@types';

const status: BookingStatus = 'confirmed'; // 'pending' | 'confirmed' | 'cancelled' | 'completed' | 'rejected'
```

### Listing Status

```typescript
import { ListingStatus } from '@types';

const status: ListingStatus = 'active'; // 'draft' | 'active' | 'inactive' | 'archived'
```

## Extending Types

### Adding New Fields

When adding fields to models:

1. Update TypeScript interface
2. Update Zod schema
3. Update test factories
4. Update API mocks

```typescript
// Before
export const UserSchema = z.object({
  id: z.string(),
  email: z.string().email(),
  name: z.string(),
});

// After (adding phone field)
export const UserSchema = z.object({
  id: z.string(),
  email: z.string().email(),
  name: z.string(),
  phone: z.string().optional(), // ← New field
});

export type User = z.infer<typeof UserSchema>;
```

### Creating New Models

1. Define Zod schema first
2. Infer TypeScript type from schema
3. Export both schema and type
4. Add to barrel export in `index.ts`

```typescript
// types/models.ts
export const PaymentSchema = z.object({
  id: z.string(),
  bookingId: z.string(),
  amount: z.number().positive(),
  status: z.enum(['pending', 'completed', 'failed']),
  createdAt: z.string().datetime(),
});

export type Payment = z.infer<typeof PaymentSchema>;

// types/index.ts
export * from './models'; // Automatically exports Payment
```

## Best Practices

1. **Always use Zod schemas for external data**
   ```typescript
   // Validate API responses
   const result = SplitLeaseSchema.safeParse(apiResponse);
   ```

2. **Infer TypeScript types from Zod schemas**
   ```typescript
   export const MySchema = z.object({ /* ... */ });
   export type MyType = z.infer<typeof MySchema>;
   ```

3. **Use strict typing**
   ```typescript
   // ✅ Good
   function getListing(id: string): Promise<SplitLease | null>

   // ❌ Bad
   function getListing(id: any): Promise<any>
   ```

4. **Document complex types**
   ```typescript
   /**
    * Represents a split lease listing in the marketplace
    * @property {string} id - Unique identifier
    * @property {string} title - Listing title (10-200 chars)
    */
   export interface SplitLease { /* ... */ }
   ```

5. **Use readonly for immutable data**
   ```typescript
   type ReadonlyListing = Readonly<SplitLease>;
   ```
