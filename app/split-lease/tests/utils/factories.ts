/**
 * Test Data Factories
 *
 * Factory functions for generating test data with faker.js.
 * Use these to create consistent, realistic test data.
 *
 * Example:
 *   const listing = createListing({ price: 3000 })
 */

import { faker } from '@faker-js/faker';

export interface TestListing {
  id: string;
  title: string;
  description: string;
  location: {
    address: string;
    city: string;
    state: string;
    country: string;
    zipCode: string;
  };
  price: number;
  availableFrom: string;
  availableTo: string;
  bedrooms: number;
  bathrooms: number;
  amenities: string[];
  images: Array<{
    id: string;
    url: string;
    alt: string;
  }>;
  host: {
    id: string;
    name: string;
    avatar: string;
  };
}

export interface TestUser {
  id: string;
  email: string;
  name: string;
  avatar?: string;
  role: 'guest' | 'host' | 'admin';
  createdAt: string;
}

export interface TestBooking {
  id: string;
  listingId: string;
  guestId: string;
  checkIn: string;
  checkOut: string;
  totalPrice: number;
  status: 'pending' | 'confirmed' | 'cancelled' | 'completed';
  createdAt: string;
}

/**
 * Create a test listing with optional overrides
 */
export function createListing(overrides?: Partial<TestListing>): TestListing {
  return {
    id: faker.string.uuid(),
    title: faker.lorem.words(5),
    description: faker.lorem.paragraphs(2),
    location: {
      address: faker.location.streetAddress(),
      city: faker.location.city(),
      state: faker.location.state(),
      country: 'USA',
      zipCode: faker.location.zipCode(),
    },
    price: faker.number.int({ min: 1000, max: 5000 }),
    availableFrom: faker.date.future().toISOString().split('T')[0] || '',
    availableTo: faker.date.future().toISOString().split('T')[0] || '',
    bedrooms: faker.number.int({ min: 1, max: 5 }),
    bathrooms: faker.number.int({ min: 1, max: 3 }),
    amenities: faker.helpers.arrayElements([
      'wifi',
      'parking',
      'laundry',
      'gym',
      'pool',
      'ac',
      'heating',
    ]),
    images: Array.from({ length: 3 }, (_, i) => ({
      id: `img-${i}`,
      url: faker.image.urlLoremFlickr({ category: 'apartment' }),
      alt: faker.lorem.words(3),
    })),
    host: {
      id: faker.string.uuid(),
      name: faker.person.fullName(),
      avatar: faker.image.avatar(),
    },
    ...overrides,
  };
}

/**
 * Create a test user with optional overrides
 */
export function createUser(overrides?: Partial<TestUser>): TestUser {
  return {
    id: faker.string.uuid(),
    email: faker.internet.email(),
    name: faker.person.fullName(),
    avatar: faker.image.avatar(),
    role: faker.helpers.arrayElement(['guest', 'host', 'admin']),
    createdAt: faker.date.past().toISOString(),
    ...overrides,
  };
}

/**
 * Create a test booking with optional overrides
 */
export function createBooking(overrides?: Partial<TestBooking>): TestBooking {
  const checkIn = faker.date.future();
  const checkOut = new Date(checkIn);
  checkOut.setDate(checkOut.getDate() + faker.number.int({ min: 1, max: 30 }));

  return {
    id: faker.string.uuid(),
    listingId: faker.string.uuid(),
    guestId: faker.string.uuid(),
    checkIn: checkIn.toISOString().split('T')[0] || '',
    checkOut: checkOut.toISOString().split('T')[0] || '',
    totalPrice: faker.number.int({ min: 1000, max: 10000 }),
    status: faker.helpers.arrayElement([
      'pending',
      'confirmed',
      'cancelled',
      'completed',
    ]),
    createdAt: faker.date.past().toISOString(),
    ...overrides,
  };
}

/**
 * Create multiple listings
 */
export function createListings(
  count: number,
  overrides?: Partial<TestListing>
): TestListing[] {
  return Array.from({ length: count }, () => createListing(overrides));
}

/**
 * Create multiple users
 */
export function createUsers(
  count: number,
  overrides?: Partial<TestUser>
): TestUser[] {
  return Array.from({ length: count }, () => createUser(overrides));
}

/**
 * Create multiple bookings
 */
export function createBookings(
  count: number,
  overrides?: Partial<TestBooking>
): TestBooking[] {
  return Array.from({ length: count }, () => createBooking(overrides));
}
