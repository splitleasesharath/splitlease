---
name: database-seed-scripts
description: Create reproducible test data with proper relationships for Supabase/PostgreSQL. Use this skill when setting up test fixtures, building integration test infrastructure, or ensuring consistent test state. Enables fast, reliable tests with realistic interconnected data.
license: MIT
---

This skill guides creation of database seed scripts for testing. Good seed data is the foundation of reliable integration and E2E tests—without it, tests are slow, flaky, and unrealistic.

## When to Use This Skill

- Setting up integration test infrastructure
- Creating E2E test fixtures
- Building local development seed data
- Ensuring consistent test state across CI runs
- Testing complex data relationships (listings → bookings → messages)

## Core Principles

```
┌─────────────────────────────────────────────────────────┐
│ 1. REPRODUCIBLE: Same seed = same state every time     │
│ 2. ISOLATED: Each test can have independent data       │
│ 3. REALISTIC: Data mirrors production patterns         │
│ 4. FAST: Seed quickly, clean up quickly                │
│ 5. RELATIONAL: Proper foreign keys and constraints     │
└─────────────────────────────────────────────────────────┘
```

## Seed Architecture for Split Lease

```
tests/
├── fixtures/
│   ├── users.ts          # User factory + seed data
│   ├── listings.ts       # Listing factory + seed data
│   ├── bookings.ts       # Booking factory + seed data
│   ├── messages.ts       # Message factory + seed data
│   └── index.ts          # Combined seed runner
├── helpers/
│   ├── db.ts             # Database connection helpers
│   ├── seed.ts           # Seed orchestration
│   └── cleanup.ts        # Cleanup utilities
└── setup.ts              # Global test setup
```

## Factory Pattern for Test Data

### User Factory

```typescript
// tests/fixtures/users.ts
import { faker } from '@faker-js/faker'
import { SupabaseClient } from '@supabase/supabase-js'

export interface TestUser {
  id: string
  email: string
  password: string
  role: 'buyer' | 'seller' | 'admin'
  metadata: Record<string, any>
}

export function createUserData(overrides: Partial<TestUser> = {}): Omit<TestUser, 'id'> {
  const firstName = faker.person.firstName()
  const lastName = faker.person.lastName()
  
  return {
    email: overrides.email ?? `test-${faker.string.uuid()}@splitlease-test.com`,
    password: overrides.password ?? 'TestPassword123!',
    role: overrides.role ?? 'buyer',
    metadata: {
      full_name: `${firstName} ${lastName}`,
      avatar_url: faker.image.avatar(),
      phone: faker.phone.number(),
      ...overrides.metadata,
    },
  }
}

export async function seedUser(
  adminClient: SupabaseClient,
  data: Partial<TestUser> = {}
): Promise<TestUser> {
  const userData = createUserData(data)
  
  const { data: user, error } = await adminClient.auth.admin.createUser({
    email: userData.email,
    password: userData.password,
    email_confirm: true,
    user_metadata: {
      ...userData.metadata,
      role: userData.role,
    },
  })
  
  if (error) throw new Error(`Failed to create user: ${error.message}`)
  
  return {
    id: user.user.id,
    ...userData,
  }
}

export async function seedUsers(
  adminClient: SupabaseClient,
  count: number,
  defaults: Partial<TestUser> = {}
): Promise<TestUser[]> {
  const users: TestUser[] = []
  
  for (let i = 0; i < count; i++) {
    users.push(await seedUser(adminClient, defaults))
  }
  
  return users
}

// Pre-defined test users for consistent references
export const TEST_USERS = {
  buyer: createUserData({ 
    email: 'buyer@splitlease-test.com', 
    role: 'buyer',
    metadata: { full_name: 'Test Buyer' }
  }),
  seller: createUserData({ 
    email: 'seller@splitlease-test.com', 
    role: 'seller',
    metadata: { full_name: 'Test Seller', verified: true }
  }),
  admin: createUserData({ 
    email: 'admin@splitlease-test.com', 
    role: 'admin',
    metadata: { full_name: 'Test Admin' }
  }),
}
```

### Listing Factory

```typescript
// tests/fixtures/listings.ts
import { faker } from '@faker-js/faker'
import { SupabaseClient } from '@supabase/supabase-js'

export interface TestListing {
  id: string
  title: string
  description: string
  price: number
  category: 'apartment' | 'house' | 'room' | 'studio'
  seller_id: string
  location: {
    address: string
    city: string
    state: string
    zip: string
    lat: number
    lng: number
  }
  amenities: string[]
  images: string[]
  status: 'draft' | 'active' | 'paused' | 'archived'
  created_at: string
}

export function createListingData(
  sellerId: string,
  overrides: Partial<TestListing> = {}
): Omit<TestListing, 'id' | 'created_at'> {
  const categories = ['apartment', 'house', 'room', 'studio'] as const
  const amenities = ['wifi', 'parking', 'laundry', 'kitchen', 'ac', 'heating', 'pool', 'gym']
  
  return {
    title: overrides.title ?? `${faker.location.city()} ${faker.helpers.arrayElement(['Studio', 'Room', 'Apartment'])}`,
    description: overrides.description ?? faker.lorem.paragraphs(2),
    price: overrides.price ?? faker.number.int({ min: 500, max: 3000 }),
    category: overrides.category ?? faker.helpers.arrayElement(categories),
    seller_id: sellerId,
    location: overrides.location ?? {
      address: faker.location.streetAddress(),
      city: faker.location.city(),
      state: faker.location.state({ abbreviated: true }),
      zip: faker.location.zipCode(),
      lat: parseFloat(faker.location.latitude()),
      lng: parseFloat(faker.location.longitude()),
    },
    amenities: overrides.amenities ?? faker.helpers.arrayElements(amenities, { min: 2, max: 5 }),
    images: overrides.images ?? Array.from({ length: 4 }, () => faker.image.urlLoremFlickr({ category: 'house' })),
    status: overrides.status ?? 'active',
  }
}

export async function seedListing(
  client: SupabaseClient,
  sellerId: string,
  overrides: Partial<TestListing> = {}
): Promise<TestListing> {
  const listingData = createListingData(sellerId, overrides)
  
  const { data, error } = await client
    .from('listings')
    .insert(listingData)
    .select()
    .single()
  
  if (error) throw new Error(`Failed to create listing: ${error.message}`)
  
  return data as TestListing
}

export async function seedListings(
  client: SupabaseClient,
  sellerId: string,
  count: number,
  defaults: Partial<TestListing> = {}
): Promise<TestListing[]> {
  const listings: TestListing[] = []
  
  for (let i = 0; i < count; i++) {
    listings.push(await seedListing(client, sellerId, defaults))
  }
  
  return listings
}
```

### Booking Factory

```typescript
// tests/fixtures/bookings.ts
import { faker } from '@faker-js/faker'
import { SupabaseClient } from '@supabase/supabase-js'
import { addDays, format } from 'date-fns'

export interface TestBooking {
  id: string
  listing_id: string
  buyer_id: string
  seller_id: string
  check_in: string
  check_out: string
  guests: number
  total_price: number
  status: 'pending' | 'confirmed' | 'cancelled' | 'completed'
  payment_intent_id: string | null
  created_at: string
}

export function createBookingData(
  listingId: string,
  buyerId: string,
  sellerId: string,
  overrides: Partial<TestBooking> = {}
): Omit<TestBooking, 'id' | 'created_at'> {
  const checkIn = overrides.check_in 
    ? new Date(overrides.check_in)
    : faker.date.future({ years: 1 })
  const nights = faker.number.int({ min: 1, max: 14 })
  const checkOut = addDays(checkIn, nights)
  const pricePerNight = faker.number.int({ min: 50, max: 300 })
  
  return {
    listing_id: listingId,
    buyer_id: buyerId,
    seller_id: sellerId,
    check_in: overrides.check_in ?? format(checkIn, 'yyyy-MM-dd'),
    check_out: overrides.check_out ?? format(checkOut, 'yyyy-MM-dd'),
    guests: overrides.guests ?? faker.number.int({ min: 1, max: 4 }),
    total_price: overrides.total_price ?? pricePerNight * nights,
    status: overrides.status ?? 'pending',
    payment_intent_id: overrides.payment_intent_id ?? null,
  }
}

export async function seedBooking(
  client: SupabaseClient,
  listingId: string,
  buyerId: string,
  sellerId: string,
  overrides: Partial<TestBooking> = {}
): Promise<TestBooking> {
  const bookingData = createBookingData(listingId, buyerId, sellerId, overrides)
  
  const { data, error } = await client
    .from('bookings')
    .insert(bookingData)
    .select()
    .single()
  
  if (error) throw new Error(`Failed to create booking: ${error.message}`)
  
  return data as TestBooking
}
```

### Message Factory

```typescript
// tests/fixtures/messages.ts
import { faker } from '@faker-js/faker'
import { SupabaseClient } from '@supabase/supabase-js'

export interface TestMessage {
  id: string
  conversation_id: string
  sender_id: string
  recipient_id: string
  content: string
  read: boolean
  created_at: string
}

export interface TestConversation {
  id: string
  listing_id: string
  buyer_id: string
  seller_id: string
  messages: TestMessage[]
}

export function createMessageData(
  conversationId: string,
  senderId: string,
  recipientId: string,
  overrides: Partial<TestMessage> = {}
): Omit<TestMessage, 'id' | 'created_at'> {
  return {
    conversation_id: conversationId,
    sender_id: senderId,
    recipient_id: recipientId,
    content: overrides.content ?? faker.lorem.sentence(),
    read: overrides.read ?? false,
  }
}

export async function seedConversation(
  client: SupabaseClient,
  listingId: string,
  buyerId: string,
  sellerId: string,
  messageCount = 5
): Promise<TestConversation> {
  // Create conversation
  const { data: conversation, error: convError } = await client
    .from('conversations')
    .insert({ listing_id: listingId, buyer_id: buyerId, seller_id: sellerId })
    .select()
    .single()
  
  if (convError) throw new Error(`Failed to create conversation: ${convError.message}`)
  
  // Create messages alternating between buyer and seller
  const messages: TestMessage[] = []
  for (let i = 0; i < messageCount; i++) {
    const isBuyerSending = i % 2 === 0
    const senderId = isBuyerSending ? buyerId : sellerId
    const recipientId = isBuyerSending ? sellerId : buyerId
    
    const { data: message, error: msgError } = await client
      .from('messages')
      .insert(createMessageData(conversation.id, senderId, recipientId))
      .select()
      .single()
    
    if (msgError) throw new Error(`Failed to create message: ${msgError.message}`)
    messages.push(message as TestMessage)
  }
  
  return {
    ...conversation,
    messages,
  }
}
```

## Seed Orchestration

### Complete Marketplace Seed

```typescript
// tests/fixtures/index.ts
import { SupabaseClient } from '@supabase/supabase-js'
import { seedUser, seedUsers, TEST_USERS } from './users'
import { seedListing, seedListings } from './listings'
import { seedBooking } from './bookings'
import { seedConversation } from './messages'

export interface SeededData {
  users: {
    buyer: Awaited<ReturnType<typeof seedUser>>
    seller: Awaited<ReturnType<typeof seedUser>>
    admin: Awaited<ReturnType<typeof seedUser>>
    additionalBuyers: Awaited<ReturnType<typeof seedUser>>[]
  }
  listings: Awaited<ReturnType<typeof seedListing>>[]
  bookings: Awaited<ReturnType<typeof seedBooking>>[]
  conversations: Awaited<ReturnType<typeof seedConversation>>[]
}

export async function seedMarketplace(
  adminClient: SupabaseClient,
  options: {
    listingsPerSeller?: number
    additionalBuyers?: number
    bookingsPerListing?: number
  } = {}
): Promise<SeededData> {
  const {
    listingsPerSeller = 3,
    additionalBuyers = 2,
    bookingsPerListing = 1,
  } = options

  // 1. Create core users
  const buyer = await seedUser(adminClient, TEST_USERS.buyer)
  const seller = await seedUser(adminClient, TEST_USERS.seller)
  const admin = await seedUser(adminClient, TEST_USERS.admin)
  const additionalBuyersList = await seedUsers(adminClient, additionalBuyers, { role: 'buyer' })

  // 2. Create listings for seller
  const listings = await seedListings(adminClient, seller.id, listingsPerSeller)

  // 3. Create bookings from buyer
  const bookings: Awaited<ReturnType<typeof seedBooking>>[] = []
  for (const listing of listings.slice(0, bookingsPerListing)) {
    const booking = await seedBooking(adminClient, listing.id, buyer.id, seller.id)
    bookings.push(booking)
  }

  // 4. Create conversations
  const conversations: Awaited<ReturnType<typeof seedConversation>>[] = []
  for (const listing of listings.slice(0, 2)) {
    const conversation = await seedConversation(adminClient, listing.id, buyer.id, seller.id, 5)
    conversations.push(conversation)
  }

  return {
    users: {
      buyer,
      seller,
      admin,
      additionalBuyers: additionalBuyersList,
    },
    listings,
    bookings,
    conversations,
  }
}

// Lightweight seed for unit/integration tests
export async function seedMinimal(
  adminClient: SupabaseClient
): Promise<{ buyer: Awaited<ReturnType<typeof seedUser>>; seller: Awaited<ReturnType<typeof seedUser>>; listing: Awaited<ReturnType<typeof seedListing>> }> {
  const buyer = await seedUser(adminClient, { role: 'buyer' })
  const seller = await seedUser(adminClient, { role: 'seller' })
  const listing = await seedListing(adminClient, seller.id)
  
  return { buyer, seller, listing }
}
```

## Cleanup Utilities

```typescript
// tests/helpers/cleanup.ts
import { SupabaseClient } from '@supabase/supabase-js'

export async function cleanupUser(adminClient: SupabaseClient, userId: string) {
  // Delete in order respecting foreign keys
  await adminClient.from('messages').delete().or(`sender_id.eq.${userId},recipient_id.eq.${userId}`)
  await adminClient.from('conversations').delete().or(`buyer_id.eq.${userId},seller_id.eq.${userId}`)
  await adminClient.from('bookings').delete().or(`buyer_id.eq.${userId},seller_id.eq.${userId}`)
  await adminClient.from('listings').delete().eq('seller_id', userId)
  await adminClient.auth.admin.deleteUser(userId)
}

export async function cleanupUsers(adminClient: SupabaseClient, userIds: string[]) {
  for (const userId of userIds) {
    await cleanupUser(adminClient, userId)
  }
}

export async function cleanupTestData(adminClient: SupabaseClient, data: SeededData) {
  const allUserIds = [
    data.users.buyer.id,
    data.users.seller.id,
    data.users.admin.id,
    ...data.users.additionalBuyers.map(u => u.id),
  ]
  
  await cleanupUsers(adminClient, allUserIds)
}

// Clean all test data (nuclear option for CI)
export async function cleanupAllTestData(adminClient: SupabaseClient) {
  // Delete test users by email pattern
  const { data: users } = await adminClient.auth.admin.listUsers()
  const testUsers = users.users.filter(u => u.email?.includes('@splitlease-test.com'))
  
  for (const user of testUsers) {
    await cleanupUser(adminClient, user.id)
  }
}
```

## Test Setup Integration

### Vitest Global Setup

```typescript
// tests/setup.ts
import { createClient } from '@supabase/supabase-js'
import { beforeAll, afterAll, beforeEach } from 'vitest'
import { seedMinimal, SeededData } from './fixtures'
import { cleanupTestData } from './helpers/cleanup'

const SUPABASE_URL = process.env.SUPABASE_URL!
const SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY!

export const adminClient = createClient(SUPABASE_URL, SERVICE_ROLE_KEY, {
  auth: { autoRefreshToken: false, persistSession: false }
})

let testData: SeededData | null = null

beforeAll(async () => {
  // Seed once for all tests in file
  testData = await seedMinimal(adminClient)
})

afterAll(async () => {
  // Cleanup after all tests
  if (testData) {
    await cleanupTestData(adminClient, testData)
  }
})

export function getTestData() {
  if (!testData) throw new Error('Test data not initialized')
  return testData
}
```

### Per-Test Isolation Pattern

```typescript
// tests/bookings.test.ts
import { describe, it, beforeEach, afterEach, expect } from 'vitest'
import { adminClient } from './setup'
import { seedUser, seedListing, seedBooking } from './fixtures'
import { cleanupUser } from './helpers/cleanup'

describe('Booking Operations', () => {
  let buyer: Awaited<ReturnType<typeof seedUser>>
  let seller: Awaited<ReturnType<typeof seedUser>>
  let listing: Awaited<ReturnType<typeof seedListing>>

  beforeEach(async () => {
    // Fresh data for each test
    buyer = await seedUser(adminClient, { role: 'buyer' })
    seller = await seedUser(adminClient, { role: 'seller' })
    listing = await seedListing(adminClient, seller.id)
  })

  afterEach(async () => {
    // Cleanup after each test
    await cleanupUser(adminClient, buyer.id)
    await cleanupUser(adminClient, seller.id)
  })

  it('creates booking with correct total', async () => {
    const booking = await seedBooking(adminClient, listing.id, buyer.id, seller.id, {
      check_in: '2025-03-01',
      check_out: '2025-03-08', // 7 nights
      total_price: 700, // $100/night
    })
    
    expect(booking.total_price).toBe(700)
    expect(booking.status).toBe('pending')
  })
})
```

## SQL Seed Scripts (Alternative)

For initial schema setup or large datasets:

```sql
-- supabase/seed.sql
-- Run with: supabase db reset (applies migrations + seed)

-- Create test users (must use auth.users for Supabase)
INSERT INTO auth.users (id, email, encrypted_password, email_confirmed_at, raw_user_meta_data)
VALUES 
  ('11111111-1111-1111-1111-111111111111', 'buyer@test.com', crypt('password123', gen_salt('bf')), now(), '{"full_name": "Test Buyer", "role": "buyer"}'),
  ('22222222-2222-2222-2222-222222222222', 'seller@test.com', crypt('password123', gen_salt('bf')), now(), '{"full_name": "Test Seller", "role": "seller", "verified": true}'),
  ('33333333-3333-3333-3333-333333333333', 'admin@test.com', crypt('password123', gen_salt('bf')), now(), '{"full_name": "Test Admin", "role": "admin"}');

-- Create listings
INSERT INTO public.listings (id, title, description, price, category, seller_id, status, location, amenities)
VALUES
  ('aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa', 'Downtown Studio', 'Cozy studio in city center', 1200, 'studio', '22222222-2222-2222-2222-222222222222', 'active', '{"city": "San Francisco", "state": "CA"}', ARRAY['wifi', 'kitchen']),
  ('bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbbb', 'Sunny Room', 'Bright room with great views', 800, 'room', '22222222-2222-2222-2222-222222222222', 'active', '{"city": "San Francisco", "state": "CA"}', ARRAY['wifi', 'laundry']),
  ('cccccccc-cccc-cccc-cccc-cccccccccccc', 'Beach House', 'Steps from the beach', 2500, 'house', '22222222-2222-2222-2222-222222222222', 'active', '{"city": "Santa Cruz", "state": "CA"}', ARRAY['wifi', 'parking', 'pool']);

-- Create bookings
INSERT INTO public.bookings (listing_id, buyer_id, seller_id, check_in, check_out, guests, total_price, status)
VALUES
  ('aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa', '11111111-1111-1111-1111-111111111111', '22222222-2222-2222-2222-222222222222', '2025-03-01', '2025-03-07', 1, 7200, 'confirmed');
```

## Anti-Patterns to Avoid

| ❌ Anti-Pattern | ✅ Correct Approach |
|----------------|---------------------|
| Hardcoded UUIDs in multiple places | Use constants or generate per-test |
| Seeding in each test file | Centralized fixtures + setup |
| No cleanup after tests | Always cleanup in `afterEach`/`afterAll` |
| Dependent test order | Each test creates its own data |
| Seeding via UI | Seed via API/database directly |
| Giant monolithic seed | Composable factory functions |
| Real emails in tests | Use `@splitlease-test.com` pattern |

## Best Practices

1. **Use faker for realistic data**: Avoid `test1`, `test2` patterns
2. **Respect foreign keys**: Seed in dependency order (users → listings → bookings)
3. **Isolate by email pattern**: All test emails use `@splitlease-test.com`
4. **Composable factories**: Small functions that build on each other
5. **Type everything**: Full TypeScript types for test data
6. **Document test accounts**: Known credentials for E2E tests
7. **Clean as you go**: Don't rely on database resets between tests
